import { useState, useRef, useEffect } from 'react';

export default function ChatbotChat({ role }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatRef = useRef(null);

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
        body: JSON.stringify({ message: input }),
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
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
      chatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
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
  );
}
