import { useState, useEffect, useRef, useCallback } from 'react';
import { db, storage, auth } from '../libs/firebaseClient';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import LiveChat from './livechat';
import { useRouter } from 'next/router';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import summarizeQuote from '../libs/summarizeQuote';

export default function ChatbotChat({ contractorId }) {
  const { data: session, status } = useSession();
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

  const sessionId = useRef(uuidv4());
  const quoteRef = useRef(null);
  const lastAskedRef = useRef('');
  const router = useRouter();
  const quoteIdFromURL = router.query.quoteId;
  const contractorIdRef = useRef(router.query.ref || contractorId);

  const chatRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

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
    setMessages([{
      role: 'assistant',
      content: `Hi! I'm here to help understand your project! Describe the issue, snap a photo, or go live.`,
      suggestions: ['Plumbing', 'AC', 'Broken Appliance'],
    }]);
  }, []);

  const speak = useCallback((text) => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    try {
      setLoading(true);
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      setInput('');
      
      const res = await fetch('/api/chatbot_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current,
          contractorId: contractorIdRef.current
        }),
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (live) speak(data.reply);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveFinalQuote = async () => {
    if (status !== 'authenticated') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please sign in to save your quote.'
      }]);
      return;
    }

    try {
      const summary = await summarizeQuote(messages);
      const docRef = await addDoc(collection(db, 'quotes'), {
        sessionId: sessionId.current,
        timestamp: serverTimestamp(),
        name: session.user?.name || '',
        email: session.user?.email || '',
        images: imageURLs,
        issue: summary,
        contractorId: contractorIdRef.current,
        status: 'pending'
      });
      quoteRef.current = docRef;
      setQuoteSaved(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Quote saved successfully! We will contact you shortly.'
      }]);
    } catch (error) {
      console.error('Failed to save quote:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to save quote. Please try again.'
      }]);
    }
  };

  const startLiveChat = async () => {
    setLive(true);
    setAutoCapture(true);
    speak('OK, let\'s take a look!');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      setStream(stream);
    } catch (err) {
      console.error('Camera access failed:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Camera access failed. Please check your permissions.'
      }]);
    }
  };

  const stopLiveChat = () => {
    setAutoCapture(false);
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setLive(false);
  };

  const handleImportPhoto = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoadingStates(prev => ({ ...prev, analyzingImage: true }));
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const imageRef = ref(storage, `screenshots/${Date.now()}.png`);
          await uploadString(imageRef, reader.result, 'data_url');
          const url = await getDownloadURL(imageRef);

          setMessages(prev => [...prev, {
            role: 'user',
            content: '[Photo uploaded]',
            image: url
          }]);

          const response = await fetch('/api/analyze-screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: reader.result }),
          });

          if (!response.ok) throw new Error('Failed to analyze image');
          
          const data = await response.json();
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.summary || 'I can help analyze what I see in this image.'
          }]);
        } catch (err) {
          console.error('Error processing image:', err);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Sorry, I had trouble processing that image. Could you describe what you see?'
          }]);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, analyzingImage: false }));
    }
  }, []);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[80%] ${
              msg.role === 'assistant' 
                ? 'bg-gray-100 self-start shadow'
                : 'bg-blue-100 self-end'
            }`}
          >
            {msg.content}
            {msg.image && (
              <img
                src={msg.image}
                alt="Uploaded content"
                className="mt-2 rounded max-w-full"
              />
            )}
            {msg.suggestions && (
              <div className="flex flex-wrap gap-2 mt-2">
                {msg.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(suggestion)}
                    className="px-3 py-1 text-sm bg-white border border-blue-500 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={chatRef} />
      </div>

      {live && stream && (
        <div className="bg-black p-2 rounded-xl shadow-md text-white mb-4">
          <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-md" />
          <p className="text-xs text-center mt-2">🎥 Live analysis in progress...</p>
          <div className="flex justify-between mt-2 gap-2">
            <button
              onClick={captureAndAnalyze}
              disabled={isWaitingForResponse}
              className="flex-1 py-1 bg-white text-black rounded-md text-sm"
            >
              {isWaitingForResponse ? '⏳ Processing...' : '📸 Snap'}
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

      <div className="border-t p-4 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportPhoto}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? '📸 Processing...' : '📷 Upload Photo'}
          </button>

          <button
            onClick={live ? stopLiveChat : startLiveChat}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {live ? '❌ Stop Live' : '🎥 Start Live'}
          </button>

          {status === 'authenticated' && !quoteSaved && (
            <button
              onClick={saveFinalQuote}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              💾 Save Quote
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '⏳ Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

