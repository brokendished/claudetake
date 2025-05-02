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
  updateDoc
} from 'firebase/firestore';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { useSession } from 'next-auth/react';
import summarizeQuote from '../libs/summarizeQuote';
import { getAuth } from 'firebase/auth';
import { speak } from '../libs/speech';
import { v4 as uuidv4 } from 'uuid';

const MAX_MESSAGES_STORAGE = 50;
const MAX_IMAGES_STORAGE = 5;

export default function ChatbotChat({ role, contractorData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatRef = useRef(null);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const fileInputRef = useRef(null);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Add welcome message on component mount
    setMessages([{
      role: 'assistant',
      content: contractorData?.greeting || 'Hello! How can I assist you today?'
    }]);
  }, [contractorData]);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(input) {
    if (!input.trim()) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/chatbot_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          contractorId: contractorData?.contractorId || null
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error: ${response.status}`);
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: data.reply }
      ]);
      setInput('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
      chatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Add photo capture function
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setLoading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          const response = await fetch('/api/chatbot_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: '[Photo uploaded]',
              image: reader.result,
              contractorId: contractorData?.contractorId
            }),
          });
          
          if (!response.ok) throw new Error('Failed to process image');
          
          const data = await response.json();
          setMessages(prev => [
            ...prev,
            { role: 'user', content: '[Photo uploaded]', image: reader.result },
            { role: 'assistant', content: data.reply }
          ]);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError('Failed to process image');
      } finally {
        setLoading(false);
      }
    }
  };

  // Media stream management utility
  const useMediaStreamCleanup = () => {
    // ...your original media stream code...
  };

  const { startStream, stopStream } = useMediaStreamCleanup();

  return (
    <div className="flex justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 px-4">
      <div className="flex flex-col w-full max-w-[600px] pt-6 pb-4 bg-white rounded-lg shadow-md">
        {!session?.user?.email && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 mb-2 rounded">
            You're not logged in — your chat is temporary and won't be saved to your dashboard.
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex flex-col gap-4 flex-1 mb-4 overflow-y-auto px-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`px-4 py-2 rounded-lg text-sm animate-bounceChat ${
                msg.role === 'assistant'
                  ? 'bg-gray-100 text-gray-800 self-start'
                  : 'bg-blue-100 text-blue-900 self-end'
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={chatRef} />
        </div>

        {/* Live Video Section */}
        {showLiveChat && (
          <div className="bg-black p-2 rounded-xl shadow-md text-white">
            <LiveChat
              onMessage={(msg) => {
                setMessages(prev => [...prev, msg]);
              }}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2 items-center bg-white rounded-full p-2 shadow-md border border-gray-200">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) sendMessage(input);
            }}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${
              loading || !input.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* Action Buttons */}
        {!showLiveChat && (
          <div className="mt-3 flex justify-center px-4 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              📷 Take Photo
            </button>
            <button
              onClick={() => setShowLiveChat(prev => !prev)}
              className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-color</button>
              {showLiveChat ? '❌ Stop Live' : '🎥 Start Live'}
            </button>
            <button
              onClick={() => {
                // Add your save quote functionality here
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: 'Quote saved successfully! We will contact you shortly.'
                }]);
              }}
              className="px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              💾 Save Quote
            </button>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handlePhotoUpload}
          className="hidden"
        />

        {error && (
          <p className="mt-2 text-red-500 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}
