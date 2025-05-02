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
            </div>
          ))}
          <div ref={chatRef} />
        </div>

        {live && stream && (
          <div className="bg-black p-2 rounded-xl shadow-md text-white">
            <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-md" />
            <p className="text-xs text-center mt-2">🎥 Live analysis in progress...</p>
            <div className="flex justify-between mt-2 gap-2">
              <button
                onClick={captureAndAnalyze}
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

        <div className="border-t pt-4">
          <div className="flex items-center gap-2">
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

          {!live && (
            <div className="mt-3 flex justify-center px-4 gap-2">
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
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleImportPhoto}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
