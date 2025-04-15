import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { db, storage } from '../libs/firebaseClient';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { useSession } from 'next-auth/react';
import summarizeQuote from '../libs/summarizeQuote';
import { speak } from '../libs/speech';
import { v4 as uuidv4 } from 'uuid';

const MAX_MESSAGES_STORAGE = 50; // Limit stored messages to prevent localStorage overflow
const MAX_IMAGES_STORAGE = 5;    // Limit stored image references

export default function ChatbotChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [imageURLs, setImageURLs] = useState([]);
  const [autoCapture, setAutoCapture] = useState(false);
  const [lastQuestionTime, setLastQuestionTime] = useState(0);
  const [quoteSaved, setQuoteSaved] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [error, setError] = useState(null);

  const router = useRouter();
  const quoteIdFromURL = router.query.quoteId;
  const contractorId = useRef(router.query.ref || null);

  // Use localStorage for session ID to maintain consistency across page refreshes
  const sessionId = useRef(() => {
    if (typeof window === 'undefined') return uuidv4();
    
    const existingId = localStorage.getItem('current_session_id');
    if (existingId) return existingId;
    
    const newId = uuidv4();
    localStorage.setItem('current_session_id', newId);
    return newId;
  });
  
  const quoteRef = useRef(null);
  const lastAskedRef = useRef('');
  const chatRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const isMounted = useRef(true);
  const { data: session } = useSession();

  // Speech recognition hook with browser support check
  const { listening, isSupported: speechSupported, error: speechError } = useSpeechRecognition({
    enabled: live,
    onResult: (text) => {
      if (text) {
        sendMessage(text);
        setIsWaitingForResponse(false);
      }
    },
  });

  // Initialize messages from existing quote or localStorage
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (quoteIdFromURL) {
          const docRef = doc(db, 'quotes', quoteIdFromURL);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            quoteRef.current = docRef;
            setImageURLs(docSnap.data().images || []);
            
            // Subscribe to messages collection
            const unsub = onSnapshot(
              collection(db, 'quotes', quoteIdFromURL, 'messages'),
              (snapshot) => {
                // Sort messages by timestamp
                const chatMessages = snapshot.docs
                  .map((doc) => doc.data())
                  .sort((a, b) => {
                    const timeA = a.timestamp?.seconds || 0;
                    const timeB = b.timestamp?.seconds || 0;
                    return timeA - timeB;
                  });
                
                if (isMounted.current) {
                  setMessages(chatMessages);
                }
              },
              (error) => {
                console.error('Error loading messages:', error);
                setError('Failed to load chat history');
              }
            );
            
            return () => unsub();
          } else {
            setError(`Quote ID ${quoteIdFromURL} not found`);
          }
        } else {
          // Try to load from localStorage
          try {
            const stored = localStorage.getItem(`chat_${sessionId.current}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              setMessages(parsed.messages || []);
              setImageURLs(parsed.imageURLs || []);
            } else {
              // Start with welcome message
              setMessages([
                {
                  role: 'assistant',
                  content: `Hi, I'm here to help understand your project! Describe the issue, snap a photo, or go live.`,
                  suggestions: ['Plumbing', 'AC', 'Broken Appliance'],
                },
              ]);
            }
          } catch (storageError) {
            console.error('LocalStorage error:', storageError);
            // Reset to welcome message on storage error
            setMessages([
              {
                role: 'assistant',
                content: `Hi, I'm here to help understand your project! Describe the issue, snap a photo, or go live.`,
                suggestions: ['Plumbing', 'AC', 'Broken Appliance'],
              },
            ]);
          }
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load initial data');
      }
    };
    
    loadInitialData();
  }, [quoteIdFromURL]);

  // Scroll to bottom of chat on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Save to localStorage if not using Firestore
  useEffect(() => {
    if (!quoteRef.current && typeof window !== 'undefined') {
      try {
        // Only store limited number of messages and images to prevent storage issues
        localStorage.setItem(
          `chat_${sessionId.current}`,
          JSON.stringify({ 
            messages: messages.slice(-MAX_MESSAGES_STORAGE), 
            imageURLs: imageURLs.slice(-MAX_IMAGES_STORAGE) 
          })
        );
      } catch (err) {
        console.error('LocalStorage save error:', err);
        // If quota exceeded, try removing older items
        if (err.name === 'QuotaExceededError') {
          try {
            localStorage.removeItem(`chat_${sessionId.current}`);
            localStorage.setItem(
              `chat_${sessionId.current}`,
              JSON.stringify({ 
                messages: messages.slice(-20), // Store even fewer messages
                imageURLs: imageURLs.slice(-2)  // Store fewer images
              })
            );
          } catch (retryErr) {
            console.error('Retry storage failed:', retryErr);
          }
        }
      }
    }
  }, [messages, imageURLs]);

  // Connect video stream to video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Set up auto-capture interval for live video
  useEffect(() => {
    let interval;
    if (autoCapture && live && stream) {
      interval = setInterval(() => {
        if (!isWaitingForResponse && Date.now() - lastQuestionTime > 10000) {
          captureAndAnalyze();
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoCapture, live, isWaitingForResponse, lastQuestionTime, stream]);

  // Component cleanup
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      
      // Stop all media streams
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Send a text message
  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/chatbot_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.current,
          messages: [...messages, userMsg],
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          image: imageURLs[imageURLs.length - 1] || '',
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${res.status}`);
      }
      
      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.reply };
      
      if (isMounted.current) {
        setMessages(prev => [...prev, assistantMsg]);
      }
      
      // Save message to Firestore if we have a quote reference
      if (quoteRef.current) {
        await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
          ...userMsg,
          timestamp: serverTimestamp()
        });
        await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
          ...assistantMsg,
          timestamp: serverTimestamp()
        });
      } else if (session?.user?.email) {
        await saveFinalQuote();
      }
      
      if (live) speak(data.reply);
    } catch (err) {
      console.error('Chatbot error:', err);
      if (isMounted.current) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again.` 
          }
        ]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Capture and analyze image from live video
  const captureAndAnalyze = async () => {
    if (!videoRef.current || isWaitingForResponse || !stream) return;
    
    // Check if stream is active
    if (!stream.active) {
      console.error('Video stream is not active');
      return;
    }

    try {
      setIsWaitingForResponse(true);
      
      // Create canvas and capture image
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataURL = canvas.toDataURL('image/png');

      // Upload to Firebase
      const imageRef = ref(storage, `screenshots/${Date.now()}.png`);
      await uploadString(imageRef, dataURL, 'data_url');
      const url = await getDownloadURL(imageRef);
      
      if (isMounted.current) {
        setImageURLs(prev => [...prev, url]);
      } else {
        return; // Component unmounted during async operation
      }

      // Analyze image
      const res = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataURL }),
        // Add timeout signal
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`Image analysis failed: ${res.status}`);
      }

      const data = await res.json();
      const reply = data.summary || 'No image data found.';

      // Avoid repeating the same message
      if (reply !== lastAskedRef.current && isMounted.current) {
        const captureMsg = { role: 'user', content: '[📸 Snapshot taken]', image: url };
        const assistantMsg = { role: 'assistant', content: reply, image: url };
        
        setMessages(prev => [...prev, captureMsg, assistantMsg]);
        
        // Save to Firestore if we have a quote reference
        if (quoteRef.current) {
          await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
            ...captureMsg,
            timestamp: serverTimestamp()
          });
          await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
            ...assistantMsg,
            timestamp: serverTimestamp()
          });
        }
        
        if (live) speak(reply);
        lastAskedRef.current = reply;
      }

      if (isMounted.current) {
        setLastQuestionTime(Date.now());
      }
    } catch (err) {
      console.error('Live analysis failed:', err);
      if (isMounted.current) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: 'Sorry, I had trouble analyzing that image. Can you describe what you see instead?' 
          }
        ]);
      }
    } finally {
      if (isMounted.current) {
        setIsWaitingForResponse(false);
      }
    }
  };

  // Handle uploaded photo
  const takeScreenshot = async (dataURL) => {
    try {
      setLoading(true);
      
      // Upload to Firebase
      const imageRef = ref(storage, `screenshots/${Date.now()}.png`);
      await uploadString(imageRef, dataURL, 'data_url');
      const url = await getDownloadURL(imageRef);
      
      if (isMounted.current) {
        setImageURLs(prev => [...prev, url]);
      } else {
        return; // Component unmounted
      }

      const userMsg = { role: 'user', content: '[📸 Snapshot taken]', image: url };
      
      if (isMounted.current) {
        setMessages(prev => [...prev, userMsg]);
      }

      // Save to Firestore if we have a quote reference
      if (quoteRef.current) {
        await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
          ...userMsg,
          timestamp: serverTimestamp()
        });
      }

      // Analyze image
      const res = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataURL }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`Image analysis failed: ${res.status}`);
      }

      const data = await res.json();
      const reply = data.summary || 'No image data found.';
      const assistantMsg = { role: 'assistant', content: reply };
      
      if (isMounted.current) {
        setMessages(prev => [...prev, assistantMsg]);
      }
      
      // Save assistant message to Firestore if we have a quote reference
      if (quoteRef.current) {
        await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
          ...assistantMsg,
          timestamp: serverTimestamp()
        });
      }
      
      speak(reply);
    } catch (err) {
      console.error('Image analysis failed:', err);
      if (isMounted.current) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: 'Sorry, I had trouble analyzing that image. Can you describe what you see instead?' 
          }
        ]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Handle file upload from input
  const handleImportPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image too large. Please use an image under 5MB.');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        await takeScreenshot(event.target.result);
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  // Start live video chat
  const startLiveChat = async () => {
    setLive(true);
    setAutoCapture(true);
    speak('OK, lets take a look!');
    
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      
      if (isMounted.current) {
        setStream(mediaStream);
      } else {
        // Clean up if component unmounted during async call
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      if (isMounted.current) {
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: "I couldn't access your camera. Please check your camera permissions and try again." 
          }
        ]);
        setLive(false);
        setAutoCapture(false);
      }
    }
  };

  // Stop live video chat
  const stopLiveChat = useCallback(() => {
    setAutoCapture(false);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setLive(false);
  }, [stream]);

  // Save quote to Firestore
  const saveFinalQuote = async () => {
    if (!session?.user?.email) {
      setError('You need to be logged in to save quotes');
      return;
    }
    
    try {
      const summary = await summarizeQuote(messages);
      
      if (quoteRef.current) {
        // Update existing quote
        await setDoc(quoteRef.current, {
          sessionId: sessionId.current,
          timestamp: serverTimestamp(),
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          images: imageURLs,
          issue: summary,
          contractorId: contractorId.current,
        }, { merge: true });
      } else {
        // Create new quote
        const docRef = await addDoc(collection(db, 'quotes'), {
          sessionId: sessionId.current,
          timestamp: serverTimestamp(),
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          images: imageURLs,
          issue: summary,
          contractorId: contractorId.current,
        });
        quoteRef.current = docRef;
        
        // Add all existing messages to the messages subcollection
        for (const msg of messages) {
          await addDoc(collection(db, 'quotes', docRef.id, 'messages'), {
            ...msg,
            timestamp: serverTimestamp()
          });
        }
      }
      
      setQuoteSaved(true);
    } catch (error) {
      console.error('Failed to save quote:', error);
      setError('Failed to save your quote. Please try again.');
    }
  };

  // Switch camera between front and back (mobile only)
  const switchCamera = useCallback(() => {
    if (stream) {
      // Stop current stream
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      
      // Toggle facing mode
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
      
      // Restart with new facing mode
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode === 'environment' ? 'user' : 'environment' },
        audio: true,
      }).then(newStream => {
        if (isMounted.current) {
          setStream(newStream);
        } else {
          newStream.getTracks().forEach(track => track.stop());
        }
      }).catch(err => {
        console.error('Failed to switch camera:', err);
      });
    }
  }, [stream, facingMode]);

  // Render error state
  if (error) {
    return (
      <div className="flex justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 px-4 py-8">
        <div className="w-full max-w-[600px] bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 px-4">
      <div className="flex flex-col w-full max-w-[600px] pt-6 pb-4 bg-white rounded-lg shadow-md">
        {!session?.user?.email && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 mb-2 rounded">
            You're not logged in — your chat is temporary and won't be saved to your dashboard.
          </div>
        )}

        <div className="flex flex-col gap-4 flex-1 mb-4 overflow-y-auto px-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`px-4 py-3 rounded-lg text-sm whitespace-pre-wrap max-w-[85%] animate-fade ${
                msg.role === 'assistant'
                  ? 'bg-gray-100 text-gray-800 self-start shadow'
                  : 'bg-blue-100 text-blue-900 self-end'
              }`}
            >
              {msg.content}
              {msg.image && (
                <img
                  src={msg.image}
                  alt="Snapshot"
                  className="mt-2 rounded-md max-w-[80%] border border-gray-300"
                />
              )}
              {msg.suggestions && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(s)}
                      className="px-3 py-1 bg-white border border-blue-500 text-blue-500 text-xs rounded-full hover:bg-blue-500 hover:text-white transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={chatRef} />
        </div>

        {live && stream && (
          <div className="bg-black p-2 rounded-xl shadow-md text-white">
            <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-md" />
            <p className="text-xs text-center mt-2">🎥 You're live — capturing video/audio</p>
            <div className="flex justify-between mt-2 gap-2">
              <button
                onClick={() => captureAndAnalyze()}
                className="flex-1 py-1 bg-white text-black rounded-md text-sm"
                disabled={isWaitingForResponse}
              >
                {isWaitingForResponse ? '⏳ Processing...' : '📸 Snap'}
              </button>
              <button
                onClick={switchCamera}
                className="py-1 px-2 bg-gray-700 text-white rounded-md text-sm"
              >
                🔄 Switch
              </button>
              <button
                onClick={stopLiveChat}
                className="flex-1 py-1 bg-red-500 text-white rounded-md text-sm"
              >
                ✖️ Stop
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 items-center bg-white rounded-full p-2 shadow-md border border-gray-200">
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage(input)}
            className="flex-1 outline-none px-4 text-sm"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-full transition disabled:bg-blue-300"
          >
            {loading ? '⏳ Sending...' : 'Send'}
          </button>
        </div>

        {!live && (
          <div className="mt-3 flex justify-center px-4 gap-2">
            {!speechSupported && (
              <div className="text-xs text-amber-600 mb-2">
                Voice features may not be available in your browser.
              </div>
            )}
            <button
              onClick={startLiveChat}
              className="text-sm bg-black text-white rounded-full px-3 py-1 shadow hover:bg-gray-800"
            >
              🎥 Start Live Chat
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm bg-black text-white rounded-full px-3 py-1 shadow hover:bg-gray-800"
            >
              📷 Add Photo
            </button>
            {session?.user?.email && !quoteRef.current && (
              <button
                onClick={saveFinalQuote}
                className="text-sm bg-green-600 text-white rounded-full px-3 py-1 shadow hover:bg-green-700"
                disabled={quoteSaved}
              >
                {quoteSaved ? '✓ Saved' : '💾 Save Quote'}
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              hidden
              ref={fileInputRef}
              onChange={handleImportPhoto}
            />
          </div>
        )}
      </div>
    </div>
  );
}
