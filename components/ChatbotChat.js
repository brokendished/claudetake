import { useState, useEffect, useRef, useCallback } from 'react';
import { db, storage, auth } from '../libs/firebaseClient';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';

export default function ChatbotChat({ contractorId }) {
  // States
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [imageUrls, setImageUrls] = useState([]);
  const { data: session } = useSession();
  
  // Refs
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const chatRef = useRef(null);

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
          </div>
        ))}
        <div ref={chatRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            📷 Upload Photo
          </button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
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
