import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase-config'; // Use centralized Firebase instance
import { useRouter } from 'next/router';

export default function Dashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => signIn(),
  });
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load quotes for the logged-in consumer
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.uid) {
      const fetchQuotes = async () => {
        try {
          const q = query(
            collection(db, 'quotes'),
            where('consumerId', '==', session.user.uid), // Fetch quotes for the logged-in consumer
            orderBy('createdAt', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const fetchedQuotes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          }));
          setQuotes(fetchedQuotes);
        } catch (err) {
          console.error('Error fetching quotes:', err);
          setError('Failed to load quotes. Please try again later.');
        } finally {
          setLoading(false);
        }
      };

      fetchQuotes();
    }
  }, [status, session]);

  // Filter quotes by search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredQuotes(
        quotes.filter(q =>
          (q.issue || '').toLowerCase().includes(term) ||
          (q.aiReply || '').toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredQuotes(quotes);
    }
  }, [searchTerm, quotes]);

  if (loading) {
    return <p>Loading your quotes...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Your Quotes</h1>
      <input
        type="text"
        placeholder="Search by keyword..."
        aria-label="Search quotes"
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
              <h2 className="text-lg font-semibold">{q.issue || 'Quote Request'}</h2>
              <p className="text-sm text-gray-500">{q.createdAt.toLocaleDateString()}</p>
              {q.images?.[0] && (
                <img
                  src={q.images[0]}
                  alt={`Snapshot for quote ${q.id}`}
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
