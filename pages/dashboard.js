// pages/dashboard.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collectionGroup, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../libs/firebaseClient';

export default function Dashboard() {
  const [user, loading] = useAuthState(auth);
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Load all quotes submitted by this user
  useEffect(() => {
    if (loading || !user) return;
    const loadQuotes = async () => {
      try {
        const q = query(
          collectionGroup(db, 'quotes'),
          where('ownerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            createdAt: d.createdAt?.toDate?.() || new Date()
          };
        });
        setQuotes(data);
      } catch (err) {
        console.error('Error loading quotes:', err);
      }
    };
    loadQuotes();
  }, [user, loading]);

  // Filter quotes by search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredQuotes(
        quotes.filter(q =>
          (q.aiReply || '').toLowerCase().includes(term) ||
          (q.issue || '').toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredQuotes(quotes);
    }
  }, [searchTerm, quotes]);

  if (loading || !user) {
    return <p className="p-4">Loading…</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Your Quotes</h1>

      <input
        type="text"
        placeholder="Search by keyword..."
        className="w-full border p-2 mb-4 rounded shadow-sm text-sm"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <p className="text-gray-500">No quotes found.</p>
        ) : (
          filteredQuotes.map(q => (
            <div key={q.id} className="border rounded-lg p-4 shadow bg-white">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-800">
                  {q.issue || 'Quote Request'}
                </h2>
                <span className="text-sm text-gray-500">
                  {q.createdAt.toLocaleDateString()}
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
