// This file assumes you're using pages/dashboard.js and have Firestore hooked up
// Add this improved quote dashboard logic with summary + image display

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../libs/firebaseClient';

export default function Dashboard() {
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredQuotes, setFilteredQuotes] = useState([]);

  useEffect(() => {
    if (session?.user?.email) {
      loadQuotes();
    }
  }, [session]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredQuotes(
        quotes.filter((q) =>
          q.aiReply?.toLowerCase().includes(term) ||
          q.issue?.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredQuotes(quotes);
    }
  }, [searchTerm, quotes]);

  const loadQuotes = async () => {
    try {
      const q = query(
        collection(db, 'quotes'),
        where('email', '==', session.user.email),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setQuotes(data);
    } catch (error) {
      console.error('Error loading quotes:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Your Quotes</h1>

      <input
        type="text"
        placeholder="Search by keyword..."
        className="w-full border p-2 mb-4 rounded shadow-sm text-sm"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <p className="text-gray-500">No quotes found.</p>
        ) : (
          filteredQuotes.map((q) => (
            <div key={q.id} className="border rounded-lg p-4 shadow bg-white">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-800">
                  {q.issue || 'Quote Request'}
                </h2>
                <span className="text-sm text-gray-500">
                  {new Date(q.timestamp?.seconds * 1000).toLocaleDateString()}
                </span>
              </div>

              {q.images?.[0] && (
                <img
                  src={q.images[0]}
                  alt="Snapshot"
                  className="mt-2 max-w-xs rounded border"
                />
              )}

              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {q.aiReply || 'No summary available.'}
              </p>

              <details className="mt-2 text-sm text-blue-600 cursor-pointer">
                <summary>View Full Conversation</summary>
                <div className="bg-gray-50 mt-2 p-2 rounded border text-gray-600 text-xs">
                  {q.chatTranscript?.map((m, i) => (
                    <div key={i} className="mb-1">
                      <strong>{m.role}:</strong> {m.content}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
