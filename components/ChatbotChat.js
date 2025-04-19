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
  writeBatch,
  updateDoc // Add this import
} from 'firebase/firestore';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { useSession } from 'next-auth/react';
import summarizeQuote from '../libs/summarizeQuote';
import { speak } from '../libs/speech';
import { v4 as uuidv4 } from 'uuid';

const MAX_MESSAGES_STORAGE = 50; // Limit stored messages to prevent localStorage overflow
const MAX_IMAGES_STORAGE = 5;    // Limit stored image references

export default function ChatbotChat() {
  // State management
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
  const [loadingStates, setLoadingStates] = useState({
  sendingMessage: false,
  analyzingImage: false,
  savingQuote: false,
  resetting: false,
  submittingQuote: false
  });

  // Refs and router
  const router = useRouter();
  const quoteIdFromURL = router.query.quoteId;
  const contractorId = useRef(router.query.ref || null);
  const chatRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const isMounted = useRef(true);
  const lastAskedRef = useRef('');
  const quoteRef = useRef(null);
  const { data: session } = useSession();

const sessionId = useRef(null);

// Add this useEffect right after your other useEffects
useEffect(() => {
  if (!sessionId.current) {
    if (typeof window === 'undefined') {
      sessionId.current = uuidv4();
    } else {
      const existingId = localStorage.getItem('current_session_id');
      if (existingId) {
        sessionId.current = existingId;
      } else {
        const newId = uuidv4();
        localStorage.setItem('current_session_id', newId);
        sessionId.current = newId;
      }
    }
  }
}, []);

  // Speech recognition hook with browser support check
  const { listening, isSupported: speechSupported, error: speechError } = useSpeechRecognition({
    enabled: live,
    onResult: (text) => {
      if (text && isMounted.current) {
        sendMessage(text);
        setIsWaitingForResponse(false);
      }
    },
  });

  // Media stream management utility
  const useMediaStreamCleanup = () => {
    const activeStreamRef = useRef(null);

    const startStream = useCallback(async (constraints) => {
      try {
        // First clean up any existing stream
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Get new stream
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStreamRef.current = newStream;
        return newStream;
      } catch (err) {
        console.error('Error accessing media devices:', err);
        throw err;
      }
    }, []);

    const stopStream = useCallback(() => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
    }, []);

    // Ensure cleanup on component unmount
    useEffect(() => {
      return () => {
        stopStream();
      };
    }, [stopStream]);

    return { startStream, stopStream };
  };

  const { startStream, stopStream } = useMediaStreamCleanup();


  
  // Safe localStorage utility
  const safelyStoreData = useCallback((key, data) => {
    try {
      const serialized = JSON.stringify(data);
      // Check size before attempting to store
      if (serialized.length > 1000000) { // ~1MB limit
        const reducedData = {
          ...data,
          messages: data.messages.slice(-20),
          imageURLs: data.imageURLs.slice(-2)
        };
        localStorage.setItem(key, JSON.stringify(reducedData));
        return false; // Indicate reduction happened
      }
      localStorage.setItem(key, serialized);
      return true;
    } catch (err) {
      console.error('Storage error:', err);
      // If quota exceeded, try removing older items
      if (err.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem(key);
          const reducedData = {
            messages: data.messages.slice(-10),
            imageURLs: data.imageURLs.slice(-1)
          };
          localStorage.setItem(key, JSON.stringify(reducedData));
        } catch (retryErr) {
          console.error('Retry storage failed:', retryErr);
        }
      }
      return false;
    }
  }, []);

  // Initialize messages from existing quote or localStorage
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (quoteIdFromURL) {
          const docRef = doc(db, 'quotes', quoteIdFromURL);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            quoteRef.current = docRef;
            if (isMounted.current) {
              setImageURLs(docSnap.data().images || []);
            }
            
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
                if (isMounted.current) {
                  setError('Failed to load chat history');
                }
              }
            );
            
            return () => unsub();
          } else {
            if (isMounted.current) {
              setError(`Quote ID ${quoteIdFromURL} not found`);
            }
          }
        } else {
          // Try to load from localStorage
          try {
            const stored = localStorage.getItem(`chat_${sessionId.current}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (isMounted.current) {
                setMessages(parsed.messages || []);
                setImageURLs(parsed.imageURLs || []);
              }
            } else {
              // Start with welcome message
              if (isMounted.current) {
                setMessages([
                  {
                    role: 'assistant',
                    content: `Hi, I'm here to help understand your project! Describe the issue, snap a photo, or go live.`,
                    suggestions: ['Plumbing', 'AC', 'Broken Appliance'],
                  },
                ]);
              }
            }
          } catch (storageError) {
            console.error('LocalStorage error:', storageError);
            // Reset to welcome message on storage error
            if (isMounted.current) {
              setMessages([
                {
                  role: 'assistant',
                  content: `Hi, I'm here to help understand your project! Describe the issue, snap a photo, or go live.`,
                  suggestions: ['Plumbing', 'AC', 'Broken Appliance'],
                },
              ]);
            }
          }
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        if (isMounted.current) {
          setError('Failed to load initial data');
        }
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
    if (!quoteRef.current && typeof window !== 'undefined' && isMounted.current) {
      safelyStoreData(`chat_${sessionId.current}`, { 
        messages: messages.slice(-MAX_MESSAGES_STORAGE), 
        imageURLs: imageURLs.slice(-MAX_IMAGES_STORAGE) 
      });
    }
  }, [messages, imageURLs, safelyStoreData]);

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
        if (!isWaitingForResponse && 
            Date.now() - lastQuestionTime > 10000 && 
            stream.active && 
            isMounted.current) {
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
      // Stop media streams will be handled by the media stream cleanup utility
    };
  }, []);

  // Helper function to compress images before upload
  const compressImage = useCallback((dataURL, maxWidth = 1200) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataURL;
    });
  }, []);

  // Send a text message
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || !isMounted.current) return;
    
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoadingStates(prev => ({...prev, sendingMessage: true}));
    
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
        // Add timeout signal
        signal: AbortSignal.timeout(15000),
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
      if (quoteRef.current && isMounted.current) {
        await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
          ...userMsg,
          timestamp: serverTimestamp()
        });
        await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
          ...assistantMsg,
          timestamp: serverTimestamp()
        });
      }
      
      if (live && isMounted.current) speak(data.reply);
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
        setLoadingStates(prev => ({...prev, sendingMessage: false}));
      }
    }
  }, [messages, session, imageURLs, live]);

  // Capture and analyze image from live video
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || isWaitingForResponse || !stream || !stream.active || !isMounted.current) return;

    try {
      setIsWaitingForResponse(true);
      setLoadingStates(prev => ({...prev, analyzingImage: true}));
      
      // Create canvas and capture image
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const rawDataURL = canvas.toDataURL('image/png');
      
      // Compress image before upload
      const dataURL = await compressImage(rawDataURL);

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
        
        if (live && isMounted.current) speak(reply);
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
        setLoadingStates(prev => ({...prev, analyzingImage: false}));
      }
    }
  }, [compressImage, live, stream, isWaitingForResponse]);



const submitQuote = useCallback(async () => {
  if (!session?.user?.email || !isMounted.current) {
    setError('You need to be logged in to submit quotes');
    return;
  }
  
  try {
    setLoadingStates(prev => ({...prev, submittingQuote: true}));
    
    // Make sure we have a saved quote first
    if (!quoteRef.current) {
      // Save the quote if it hasn't been saved yet
      await saveFinalQuote();
      if (!quoteRef.current) {
        throw new Error("Failed to save the quote first");
      }
    }
    
    // Generate summary for the email
    let summary = '';
    try {
      summary = await summarizeQuote(messages);
    } catch (error) {
      // Fallback to first user message
      const userMessages = messages.filter(m => m.role === 'user');
      summary = userMessages.length > 0 
        ? userMessages[0].content 
        : 'Quote request';
    }
    
    // Collect user information
    const userInfo = {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      quoteId: quoteRef.current.id,
      summary: summary,
      timestamp: new Date().toISOString(),
      imageCount: imageURLs.length
    };
    
    // Send the quote submission to our API
    const res = await fetch('/api/submit-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInfo,
        imageURLs: imageURLs.slice(0, 3), // Send up to 3 images to avoid large payloads
        quoteId: quoteRef.current.id
      }),
      signal: AbortSignal.timeout(15000),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Error: ${res.status}`);
    }
    
    // Update quote status in Firestore
    await updateDoc(quoteRef.current, {
      status: 'Submitted',
      submittedAt: serverTimestamp()
    });
    
    // Show success message
    if (isMounted.current) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Your quote has been submitted! A confirmation email has been sent to you, and the contractor will contact you soon.'
        }
      ]);
    }
  } catch (error) {
    console.error('Failed to submit quote:', error);
    
    if (isMounted.current) {
      setError('Failed to submit quote: ' + (error.message || 'Unknown error'));
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `I couldn't submit your quote. Error: ${error.message || 'Unknown error'}. Please try again later.`
        }
      ]);
    }
  } finally {
    if (isMounted.current) {
      setLoadingStates(prev => ({...prev, submittingQuote: false}));
    }
  }
}, [messages, session, imageURLs, isMounted]);

  


  
  // Handle uploaded photo
  const takeScreenshot = useCallback(async (dataURL) => {
    if (!isMounted.current) return;
    
    try {
      setLoadingStates(prev => ({...prev, analyzingImage: true}));
      
      // Compress image before upload
      const compressedDataURL = await compressImage(dataURL);
      
      // Upload to Firebase
      const imageRef = ref(storage, `screenshots/${Date.now()}.png`);
      await uploadString(imageRef, compressedDataURL, 'data_url');
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
    }
  }, [compressImage]);

  // Handle file upload from input
  const handleImportPhoto = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !isMounted.current) return;
    
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
      if (event.target?.result && isMounted.current) {
        await takeScreenshot(event.target.result);
      }
    };
    reader.onerror = () => {
      if (isMounted.current) {
        setError('Failed to read the file. Please try another image.');
      }
    };
    reader.readAsDataURL(file);
  }, [takeScreenshot]);

  // Start live video chat
  const startLiveChat = useCallback(async () => {
    if (!isMounted.current) return;
    
    setLive(true);
    setAutoCapture(true);
    speak('OK, lets take a look!');
    
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }
      
      const mediaStream = await startStream({
        video: { facingMode },
        audio: true,
      });
      
      if (isMounted.current) {
        setStream(mediaStream);
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
  }, [facingMode, startStream]);

  // Stop live video chat
  const stopLiveChat = useCallback(() => {
    if (!isMounted.current) return;
    
    setAutoCapture(false);
    stopStream();
    setStream(null);
    setLive(false);
  }, [stopStream]);

const saveFinalQuote = useCallback(async () => {
  if (!session?.user?.email || !isMounted.current) {
    setError('You need to be logged in to save quotes');
    return;
  }
  
  try {
    setLoadingStates(prev => ({...prev, savingQuote: true}));
    
    // 1. Get Firebase Auth User
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    // If not signed in to Firebase but have NextAuth session, try to sync
    if (!currentUser) {
      try {
        console.log("Attempting to sync NextAuth session with Firebase...");
        // Dynamically import to avoid build errors
        const { syncNextAuthWithFirebase } = await import('../libs/firebaseAuth');
        await syncNextAuthWithFirebase(session);
        
        // Check again if we have a Firebase user after sync
        const newCurrentUser = getAuth().currentUser;
        if (!newCurrentUser) {
          throw new Error("Failed to sync with Firebase Authentication");
        }
        
        console.log("Successfully synced with Firebase Auth:", newCurrentUser.email);
      } catch (syncError) {
        console.error("Firebase Auth sync error:", syncError);
        throw new Error("Failed to authenticate with Firebase. Please try signing out and back in.");
      }
    }
    
    // Get the current Firebase user again (should be available now)
    const firebaseUser = getAuth().currentUser;
    
    if (!firebaseUser) {
      throw new Error("Firebase authentication required. Please refresh and try again.");
    }
    
    console.log("Using Firebase Auth with email:", firebaseUser.email);
    
    // Make sure we have the session ID
    if (!sessionId.current) {
      const newId = uuidv4();
      sessionId.current = newId;
      localStorage.setItem('current_session_id', newId);
    }
    
    // Generate quote summary
    let summary = '';
    try {
      summary = await summarizeQuote(messages);
    } catch (error) {
      // Fallback to first user message
      const userMessages = messages.filter(m => m.role === 'user');
      summary = userMessages.length > 0 
        ? userMessages[0].content 
        : 'Quote request';
    }
    
    // Prepare quote data with Firebase Auth email
    const quoteData = {
      sessionId: sessionId.current,
      timestamp: serverTimestamp(),
      name: session?.user?.name || '',
      email: firebaseUser.email, // Use Firebase auth email to match security rules
      images: imageURLs,
      issue: summary,
      contractorId: contractorId.current,
      created: new Date().toISOString(),
      status: 'Pending',
      uid: firebaseUser.uid // Include Firebase UID for additional security
    };
    
    console.log("Preparing to save quote with data:", {
      email: firebaseUser.email,
      uid: firebaseUser.uid,
      hasExistingQuote: !!quoteRef.current
    });
    
    // Save quote document
    if (quoteRef.current) {
      // Update existing quote
      await setDoc(quoteRef.current, quoteData, { merge: true });
      console.log("Updated existing quote:", quoteRef.current.id);
    } else {
      // Create new quote (using a predictable ID pattern for better security)
      const userSpecificId = `quote_${firebaseUser.uid}_${Date.now()}`;
      const quotesCollection = collection(db, 'quotes');
      const newQuoteRef = doc(quotesCollection, userSpecificId);
      
      // Create the quote document
      await setDoc(newQuoteRef, quoteData);
      quoteRef.current = newQuoteRef;
      console.log("Created new quote with ID:", userSpecificId);
      
      // Save messages in batches to avoid Firestore limits
      if (messages.length > 0) {
        const messagesCollection = collection(db, 'quotes', userSpecificId, 'messages');
        
        // Use smaller batch size for better reliability
        const batchSize = 100;
        for (let i = 0; i < messages.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = messages.slice(i, i + batchSize);
          
          console.log(`Processing messages batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(messages.length/batchSize)}`);
          
          for (const msg of chunk) {
            const msgRef = doc(messagesCollection);
            batch.set(msgRef, {
              ...msg,
              timestamp: serverTimestamp()
            });
          }
          
          await batch.commit();
          console.log(`Committed batch ${Math.floor(i/batchSize) + 1}`);
        }
      }
    }
    
    if (isMounted.current) {
      setQuoteSaved(true);
      // Show success message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Your quote has been saved successfully! You can view it in your dashboard.'
        }
      ]);
    }
  } catch (error) {
    console.error('Failed to save quote:', error);
    
    // Handle different error types
    let userFriendlyMessage = 'Unknown error';
    
    if (error.code === 'permission-denied') {
      userFriendlyMessage = 'Permission denied. Make sure you are signed in with the correct account.';
    } else if (error.code === 'unavailable') {
      userFriendlyMessage = 'Firebase is temporarily unavailable. Please try again in a moment.';
    } else if (error.code === 'unauthenticated') {
      userFriendlyMessage = 'Your login session has expired. Please sign out and sign in again.';
    } else {
      userFriendlyMessage = error.message || 'Unknown error';
    }
    
    if (isMounted.current) {
      setError('Failed to save your quote: ' + userFriendlyMessage);
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `I couldn't save your quote. Error: ${userFriendlyMessage}. Please try signing out and back in.`
        }
      ]);
    }
  } finally {
    if (isMounted.current) {
      setLoadingStates(prev => ({...prev, savingQuote: false}));
    }
  }
}, [messages, session, imageURLs]);
  

  // Switch camera between front and back (mobile only)
  const switchCamera = useCallback(() => {
    if (!stream || !isMounted.current) return;
    
    // Toggle facing mode
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    
    // Restart with new facing mode
    stopStream();
    startStream({
      video: { facingMode: facingMode === 'environment' ? 'user' : 'environment' },
      audio: true,
    }).then(newStream => {
      if (isMounted.current) {
        setStream(newStream);
      }
    }).catch(err => {
      console.error('Failed to switch camera:', err);
    });
  }, [stream, facingMode, startStream, stopStream]);

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
                disabled={isWaitingForResponse || loadingStates.analyzingImage}
              >
                {isWaitingForResponse || loadingStates.analyzingImage ? '⏳ Processing...' : '📸 Snap'}
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
            onKeyPress={(e) => e.key === 'Enter' && !loadingStates.sendingMessage && sendMessage(input)}
            className="flex-1 outline-none px-4 text-sm"
            disabled={loadingStates.sendingMessage}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loadingStates.sendingMessage || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-full transition disabled:bg-blue-300"
          >
            {loadingStates.sendingMessage ? '⏳ Sending...' : 'Send'}
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
              disabled={quoteSaved || loadingStates.savingQuote}
            >
              {quoteSaved ? '✓ Saved' : loadingStates.savingQuote ? '💾 Saving...' : '💾 Save Quote'}
            </button>
          )}
          {session?.user?.email && (
            <button
              onClick={submitQuote}
              className="text-sm bg-blue-600 text-white rounded-full px-3 py-1 shadow hover:bg-blue-700"
              disabled={loadingStates.submittingQuote || (!quoteRef.current && loadingStates.savingQuote)}
            >
              {loadingStates.submittingQuote ? '⏳ Submitting...' : '📤 Submit Quote'}
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
