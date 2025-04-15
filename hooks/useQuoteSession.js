// hooks/useQuoteSession.js
import { useState, useRef, useEffect } from 'react';
import { db, storage } from '../libs/firebaseClient';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import summarizeQuote from '../libs/summarizeQuote';

export default function useQuoteSession(session, analyzeImage) {
  const [messages, setMessages] = useState([]);
  const [imageURLs, setImageURLs] = useState([]);
  const sessionId = useRef(uuidv4());
  const quoteRef = useRef(null);
  const lastAskedRef = useRef('');
  const lastAnalysisRef = useRef(null);

  // Load from localStorage if user returns
  useEffect(() => {
    const stored = localStorage.getItem(`chat_${sessionId.current}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setMessages(parsed.messages || []);
      setImageURLs(parsed.imageURLs || []);
    } else {
      setMessages([
        {
          role: 'assistant',
          content: "Hi, I'm here to help understand your current project so we can get you a quick estimate! Feel free to describe the problem, snap a photo, or start a live video session!",
          suggestions: ['Plumbing', 'AC', 'Broken Appliance'],
        },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      `chat_${sessionId.current}`,
      JSON.stringify({ messages, imageURLs })
    );
  }, [messages, imageURLs]);

  const speak = (text) => {
    if (typeof window !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices[0];
      utterance.rate = 1.25;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };

  const addMessage = async (msg) => {
    setMessages((prev) => [...prev, msg]);
    if (quoteRef.current) {
      try {
        await addDoc(collection(db, 'quotes', quoteRef.current.id, 'messages'), {
          ...msg,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        console.error('Error saving message to Firestore:', err);
      }
    }
  };

  const sendMessage = async (text, responseTo = '') => {
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
      });

      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.reply, responseTo };
      lastAskedRef.current = data.reply;
      lastAnalysisRef.current = data.reply;
      await addMessage(assistantMsg);
    } catch (err) {
      console.error('Chatbot error:', err);
      await addMessage({ role: 'assistant', content: 'Oops! Something went wrong.' });
    }
  };

  const captureAndAnalyze = async (dataURL) => {
    try {
      const analysis = await analyzeImage(dataURL);
      if (analysis !== lastAskedRef.current) {
        const msg = {
          role: 'assistant',
          content: analysis,
          responseTo: 'liveImage',
          imageContext: dataURL,
        };
        speak(analysis);
        await addMessage(msg);
        lastAskedRef.current = analysis;
        lastAnalysisRef.current = analysis;
      }
    } catch (err) {
      console.error('Live analysis failed:', err);
    }
  };

  const uploadAndAnalyzeImage = async (dataURL, fromLive = false) => {
    try {
      const imageRef = ref(storage, `screenshots/${Date.now()}.png`);
      await uploadString(imageRef, dataURL, 'data_url');
      const url = await getDownloadURL(imageRef);
      setImageURLs((prev) => [...prev, url]);
      await addMessage({ role: 'user', content: '[📸 Snapshot taken]', image: url });
      if (!fromLive) {
        const analysis = await analyzeImage(dataURL);
        await addMessage({ role: 'assistant', content: analysis });
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    }
  };

  const saveFinalQuote = async () => {
    try {
      const summary = await summarizeQuote(messages);
      const docRef = await addDoc(collection(db, 'quotes'), {
        sessionId: sessionId.current,
        timestamp: serverTimestamp(),
        name: session?.user?.name || '',
        email: session?.user?.email || '',
        phone: '',
        images: imageURLs,
        issue: summary,
      });
      quoteRef.current = docRef;
    } catch (error) {
      console.error('Failed to save quote:', error);
    }
  };

  return {
    messages,
    setMessages,
    imageURLs,
    sessionId,
    quoteRef,
    lastAskedRef,
    lastAnalysisRef,
    sendMessage,
    addMessage,
    captureAndAnalyze,
    uploadAndAnalyzeImage,
    saveFinalQuote,
    speak,
  };
}
