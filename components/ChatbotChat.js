import { useState, useRef, useEffect } from 'react';

export default function ChatbotChat({ role, contractorData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatRef = useRef(null);

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

  return (
    <div className="w-full max-w-3xl">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] mb-4">
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
          {error && (
            <p className="mt-2 text-red-500 text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
