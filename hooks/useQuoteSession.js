import { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../libs/firebaseClient';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { speak } from '../libs/speech';
import summarizeQuote from '../libs/summarizeQuote';

// Constants for storage limits
const MAX_LOCAL_MESSAGES = 50;
const MAX_LOCAL_IMAGES = 5;

/**
 * Custom hook for managing a quote session
 * @param {Object} session - Auth session data
 * @param {Function} analyzeImage - Function to analyze image data
 * @returns {Object} Quote session utilities and state
 */
export default function useQuoteSession(session, analyzeImage) {
  const [messages, setMessages] = useState([]);
  const [imageURLs, setImageURLs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  return {
    messages,
    imageURLs,
    sessionId: sessionId.current,
    quoteRef,
    lastAskedRef,
    lastAnalysisRef,
    error,
    loading,
    setMessages,
    setError,
    sendMessage,
    addMessage,
    captureAndAnalyze,
    uploadAndAnalyzeImage,
    saveFinalQuote,
    speak
  };
} Refs for maintaining state across re-renders
  const sessionId = useRef(null);
  const quoteRef = useRef(null);
  const lastAskedRef = useRef('');
  const lastAnalysisRef = useRef(null);
  const isMounted = useRef(true);

  // Initialize session ID on first render
  useEffect(() => {
    if (!sessionId.current) {
      // Try to get existing session from localStorage
      try {
        const storedSessionId = localStorage.getItem('current_session_id');
        sessionId.current = storedSessionId || uuidv4();
        
        // Store the session ID if it's new
        if (!storedSessionId) {
          localStorage.setItem('current_session_id', sessionId.current);
        }
      } catch (err) {
        // Fallback if localStorage fails
        console.error('LocalStorage error:', err);
        sessionId.current = uuidv4();
      }
    }
  }, []);

  // Component cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load messages from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`chat_${sessionId.current}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed.messages || []);
        setImageURLs(parsed.imageURLs || []);
      } else {
        // Initialize with welcome message
        setMessages([
          {
            role: 'assistant',
            content: "Hi, I'm here to help understand your current project so we can get you a quick estimate! Feel free to describe the problem, snap a photo, or start a live video session!",
            suggestions: ['Plumbing', 'AC', 'Broken Appliance'],
          },
        ]);
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
      setError('Failed to load previous conversation');
      
      // Reset to default welcome message
      setMessages([
        {
          role: 'assistant',
          content: "Hi, I'm here to help understand your project! Something went wrong loading your previous conversation, but we can start fresh.",
          suggestions: ['Plumbing', 'AC', 'Broken Appliance'],
        },
      ]);
    }
  }, []);

  // Save to localStorage whenever messages or images change
  useEffect(() => {
    if (!isMounted.current) return;
    
    try {
      localStorage.setItem(
        `chat_${sessionId.current}`,
        JSON.stringify({
          messages: messages.slice(-MAX_LOCAL_MESSAGES),
          imageURLs: imageURLs.slice(-MAX_LOCAL_IMAGES)
        })
      );
    } catch (err) {
      console.error('LocalStorage save error:', err);
      
      // If quota exceeded, try removing older items
      if (err.name === 'QuotaExceededError') {
        try {
          // Attempt to save with fewer messages
          localStorage.setItem(
            `chat_${sessionId.current}`,
            JSON.stringify({
              messages: messages.slice(-20),
              imageURLs: imageURLs.slice(-2)
            })
          );
        } catch (retryErr) {
          console.error('Retry storage failed:', retryErr);
          setError('Storage space full. Some messages may not be saved.');
        }
      }
    }
  }, [messages, imageURLs]);

  /**
   * Add a message to the conversation
   * @param {Object} msg - Message object with role and content
   * @returns {Promise<void>}
   */
  const addMessage = useCallback(async (msg) => {
    if (!msg || !msg.role || !msg.content) {
      console.error('Invalid message format:', msg);
      return;
    }
    
    // Update state
    if (isMounted.current) {
      setMessages((prev) => [...prev, msg]);
    }
    
    // Save to Firestore if we have a quote reference
    if (quoteRef.current) {
      try {
        await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
          ...msg,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        console.error('Error saving message to Firestore:', err);
        if (isMounted.current) {
          setError('Failed to save message to database');
        }
      }
    }
  }, []);

  /**
   * Send a user message and get AI response
   * @param {string} text - User message text
   * @param {string} responseTo - Optional reference to what message this responds to
   * @returns {Promise<void>}
   */
  const sendMessage = useCallback(async (text, responseTo = '') => {
    if (!text || typeof text !== 'string') {
      console.error('Invalid message text:', text);
      return;
    }
    
    if (isMounted.current) {
      setLoading(true);
    }
    
    const userMsg = { role: 'user', content: text, responseTo };
    await addMessage(userMsg);

    try {
      const res = await fetch('/api/chatbot_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.current,
          messages: [...messages, userMsg],
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          phone: '',
          category: '',
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
      const assistantMsg = { role: 'assistant', content: data.reply, responseTo };
      
      if (isMounted.current) {
        lastAskedRef.current = data.reply;
        lastAnalysisRef.current = data.reply;
        await addMessage(assistantMsg);
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      
      if (isMounted.current) {
        const errorMessage = err.name === 'AbortError' 
          ? 'Request timed out. Please try again.'
          : `Error: ${err.message || 'Unknown error'}`;
          
        await addMessage({ 
          role: 'assistant', 
          content: `Oops! Something went wrong: ${errorMessage}` 
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [messages, addMessage, session, imageURLs]);

  /**
   * Analyze a live video frame
   * @param {string} dataURL - Base64 image data
   * @returns {Promise<void>}
   */
  const captureAndAnalyze = useCallback(async (dataURL) => {
    if (!dataURL || !isMounted.current) return;
    
    try {
      if (!analyzeImage || typeof analyzeImage !== 'function') {
        throw new Error('Image analysis function not available');
      }
      
      const analysis = await analyzeImage(dataURL);
      
      // Only update if we have a new analysis and component is still mounted
      if (analysis !== lastAskedRef.current && isMounted.current) {
        const msg = {
          role: 'assistant',
          content: analysis,
          responseTo: 'liveImage',
          imageContext: dataURL,
        };
        
        speak(analysis);
        await addMessage(msg);
        
        if (isMounted.current) {
          lastAskedRef.current = analysis;
          lastAnalysisRef.current = analysis;
        }
      }
    } catch (err) {
      console.error('Live analysis failed:', err);
      
      if (isMounted.current) {
        setError('Image analysis failed');
      }
    }
  }, [analyzeImage, addMessage]);

  /**
   * Upload and analyze an image
   * @param {string} dataURL - Base64 image data
   * @param {boolean} fromLive - Whether this is from live video
   * @returns {Promise<void>}
   */
  const uploadAndAnalyzeImage = useCallback(async (dataURL, fromLive = false) => {
    if (!dataURL || !isMounted.current) return;
    
    try {
      if (isMounted.current) {
        setLoading(true);
      }
      
      // Create unique filename based on timestamp
      const imageRef = ref(storage, `screenshots/${Date.now()}-${sessionId.current}.png`);
      await uploadString(imageRef, dataURL, 'data_url');
      const url = await getDownloadURL(imageRef);
      
      if (isMounted.current) {
        setImageURLs((prev) => [...prev, url]);
      } else {
        return; // Component unmounted
      }
      
      await addMessage({ role: 'user', content: '[📸 Snapshot taken]', image: url });
      
      if (!fromLive && analyzeImage) {
        const analysis = await analyzeImage(dataURL);
        await addMessage({ role: 'assistant', content: analysis });
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      
      if (isMounted.current) {
        setError('Failed to upload image');
        await addMessage({ 
          role: 'assistant', 
          content: 'Sorry, I had trouble with that image. Can you try again or describe what you see?' 
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [addMessage, analyzeImage]);

  /**
   * Save the conversation as a quote in Firestore
   * @returns {Promise<void>}
   */
  const saveFinalQuote = useCallback(async () => {
    if (!session?.user?.email) {
      setError('You need to be logged in to save quotes');
      return;
    }
    
    try {
      if (isMounted.current) {
        setLoading(true);
      }
      
      // Generate summary of conversation
      const summary = await summarizeQuote(messages);
      
      // Check if we already have a quote reference
      if (quoteRef.current) {
        // Update existing quote with new data
        // Implementation would go here...
        console.log('Updating existing quote:', quoteRef.current.id);
      } else {
        // Create new quote document
        const docRef = await addDoc(collection(db, 'quotes'), {
          sessionId: sessionId.current,
          timestamp: serverTimestamp(),
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          phone: '',
          images: imageURLs,
          issue: summary,
        });
        
        if (isMounted.current) {
          quoteRef.current = docRef;
          
          // Add all messages to subcollection
          for (const msg of messages) {
            await addDoc(collection(db, 'quotes', docRef.id, 'messages'), {
              ...msg,
              timestamp: serverTimestamp()
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to save quote:', error);
      
      if (isMounted.current) {
        setError('Failed to save your quote');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [messages, session, imageURLs]);

  //
