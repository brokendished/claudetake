import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { speak } from '../libs/speech';

export default function ChatbotChat({ role }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatRef = useRef(null);
  const { data: session } = useSession();

  // Scroll to the bottom of the chat when messages change
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send a message to the chatbot
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          role,
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${res.status}`);
      }

      const data = await res.json();
      const botMessage = { role: 'assistant', content: data.reply };

      setMessages((prev) => [...prev, botMessage]);
      if (role === 'customer') speak(data.reply);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [messages, role, session]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px]">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`px-4 py-2 rounded-lg text-sm ${
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
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) sendMessage(input);
            }}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className={`px-4 py-2 rounded-lg text-white ${
              loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
        {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  );
}
