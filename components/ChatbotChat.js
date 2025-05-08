import { useState, useEffect, useRef, useCallback } from 'react';
import { db, storage, auth } from '../libs/firebaseClient';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import LiveChat from './livechat';

export default function ChatbotChat({ contractorId }) {
  // States
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [imageUrls, setImageUrls] = useState([]);
  const { data: session } = useSession();
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [quoteSaved, setQuoteSaved] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    sendingMessage: false,
    savingQuote: false,
  });
  
  // Refs
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const chatRef = useRef(null);

  // Add useEffect for initial greeting
  useEffect(() => {
    // Set initial greeting message
    setMessages([{
      role: 'assistant',
      content: contractorId 
        ? 'Hi! I\'m here to help you get a quote. Feel free to describe your project, share a photo, or start a live video chat!'
        : 'Welcome! I\'m here to help understand your project. You can describe the issue, upload photos, or start a live chat!',
      suggestions: ['Upload a photo', 'Start live chat', 'Describe project']
    }]);
  }, [contractorId]);

  // Handle file upload
  const handleFileUpload = async (file) => {
    try {
      setLoading(true);
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const imageRef = ref(storage, `quotes/${sessionId}/${Date.now()}.jpg`);
        await uploadString(imageRef, reader.result, 'data_url');
        const url = await getDownloadURL(imageRef);
        setImageUrls(prev => [...prev, url]);
        
        // Send to chatbot
        const res = await fetch('/api/chatbot_chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '[Image uploaded]',
            image: reader.result,
            sessionId,
            contractorId
          }),
        });
        
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          { role: 'user', content: '[Image uploaded]', image: url },
          { role: 'assistant', content: data.reply }
        ]);
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send message
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
          sessionId,
          contractorId
        }),
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save quote
  const saveQuote = async () => {
    if (!session?.user?.email) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, savingQuote: true }));
      
      const quoteData = {
        messages,
        imageUrls,
        consumerId: session.user.uid,
        contractorId,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'quotes'), quoteData);
      
      setQuoteSaved(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Quote saved successfully! We will contact you shortly.'
      }]);
      
    } catch (err) {
      console.error('Error saving quote:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to save quote. Please try again.'
      }]);
    } finally {
      setLoadingStates(prev => ({ ...prev, savingQuote: false }));
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[80%] ${
              msg.role === 'assistant' 
                ? 'bg-gray-100 self-start' 
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
            {/* Add suggestion buttons */}
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

      {/* Add Live Chat component if enabled */}
      {showLiveChat && (
        <div className="p-4 bg-black rounded-lg mb-4">
          <LiveChat onMessage={(msg) => {
            setMessages(prev => [...prev, msg]);
          }} />
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-4 space-y-4">
        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            📷 Upload Photo
          </button>
          
          <button
            onClick={() => setShowLiveChat(prev => !prev)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showLiveChat ? '❌ Stop Live' : '🎥 Start Live'}
          </button>

          {session?.user?.email && (
            <button
              onClick={saveQuote}
              disabled={loadingStates.savingQuote || quoteSaved}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              {quoteSaved ? '✓ Saved' : loadingStates.savingQuote ? '💾 Saving...' : '💾 Save Quote'}
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
