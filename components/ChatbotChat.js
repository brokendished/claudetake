import { useState, useEffect, useRef } from 'react';
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
import { v4 as uuidv4 } from 'uuid';

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

  const router = useRouter();
  const quoteIdFromURL = router.query.quoteId;
  const contractorId = useRef(router.query.ref || null);

  const sessionId = useRef(uuidv4());
  const quoteRef = useRef(null);
  const lastAskedRef = useRef('');
  const chatRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const { data: session } = useSession();

  const { listening } = useSpeechRecognition({
    enabled: live,
    onResult: (text) => {
      if (text) {
        sendMessage(text);
        setIsWaitingForResponse(false);
      }
    },
  });

  useEffect(() => {
    const loadInitialData = async () => {
      if (quoteIdFromURL) {
        const docRef = doc(db, 'quotes', quoteIdFromURL);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          quoteRef.current = docRef;
          setImageURLs(docSnap.data().images || []);
          const unsub = onSnapshot(
            collection(db, 'quotes', quoteIdFromURL, 'messages'),
            (snapshot) => {
              const chatMessages = snapshot.docs.map((doc) => doc.data());
              setMessages(chatMessages);
            }
          );
          return () => unsub();
        }
      } else {
        const stored = localStorage.getItem(`chat_${sessionId.current}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setMessages(parsed.messages || []);
          setImageURLs(parsed.imageURLs || []);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: `Hi, I'm here to help understand your project! Describe the issue, snap a photo, or go live.`,
              suggestions: ['Plumbing', 'AC', 'Broken Appliance'],
            },
          ]);
        }
      }
    };
    loadInitialData();
  }, [quoteIdFromURL]);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!quoteRef.current) {
      localStorage.setItem(
        `chat_${sessionId.current}`,
        JSON.stringify({ messages, imageURLs })
      );
    }
  }, [messages, imageURLs]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    let interval;
    if (autoCapture && live) {
      interval = setInterval(() => {
        if (!isWaitingForResponse && Date.now() - lastQuestionTime > 10000) {
          captureAndAnalyze();
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [autoCapture, live, isWaitingForResponse, lastQuestionTime]);

  const speak = (text) => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const sendMessage = async (text) => {
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
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

      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, assistantMsg]);
      
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
    } finally {
      setLoading(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || isWaitingForResponse) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/png');

    try {
      setIsWaitingForResponse(true);
      const imageRef = ref(storage, `screenshots/${Date.now()}.png`);
      await uploadString(imageRef, dataURL, 'data_url');
      const url = await getDownloadURL(imageRef);
      setImageURLs((prev) => [...prev, url]);

      const res = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataURL }),
      });

      const data = await res.json();
      const reply = data.summary || 'No image data found.';

      // Avoid repeating the same message
      if (reply !== lastAskedRef.current) {
        const captureMsg = { role: 'user', content: '[📸 Snapshot taken]', image: url };
        const assistantMsg = { role: 'assistant', content: reply, image: url };
        
        setMessages((prev) => [...prev, captureMsg, assistantMsg]);
        
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

      setLastQuestionTime(Date.now());
    } catch (err) {
      console.error('Live analysis failed:', err);
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  const takeScreenshot = async (dataURL) => {
    try {
      const imageRef = ref(storage, `screenshots/${Date.now()}.png`);
      await uploadString(imageRef, dataURL, 'data_url');
      const url = await getDownloadURL(imageRef);
      setImageURLs((prev) => [...prev, url]);

      const userMsg = { role: 'user', content: '[📸 Snapshot taken]', image: url };
      setMessages((prev) => [...prev, userMsg]);

      // Save to Firestore if we have a quote reference
      if (quoteRef.current) {
        await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
          ...userMsg,
          timestamp: serverTimestamp()
        });
      }

      const res = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataURL }),
      });

      const data = await res.json();
      const reply = data.summary || 'No image data found.';
      const assistantMsg = { role: 'assistant', content: reply };
      setMessages((prev) => [...prev, assistantMsg]);
      
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
    }
  };

  const handleImportPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataURL = event.target.result;
      await takeScreenshot(dataURL);
    };
    reader.readAsDataURL(file);
  };

  const startLiveChat = async () => {
    setLive(true);
    setAutoCapture(true);
    speak('OK, lets take a look!');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      setStream(stream);
    } catch (err) {
      console.error('Camera access failed:', err);
      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          content: "I couldn't access your camera. Please check your camera permissions and try again." 
        }
      ]);
      setLive(false);
      setAutoCapture(false);
    }
  };

  const stopLiveChat = () => {
    setAutoCapture(false);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setLive(false);
  };

  const saveFinalQuote = async () => {
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
    }
  };

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
              >
                📸 Snap
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
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
            className="flex-1 outline-none px-4 text-sm"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-full transition"
          >
            Send
          </button>
        </div>

        {!live && (
          <div className="mt-3 flex justify-end px-4 gap-2">
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
