import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { db } from '../libs/firebaseClient';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function QuoteDashboard() {
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!session?.user?.email) return;

    const q = query(
      collection(db, 'quotes'),
      where('email', '==', session.user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log("Quotes from Firestore:", data); // debug
      setQuotes(data);
    });

    return () => unsubscribe();
  }, [session]);

  const handleStatusChange = async (id, status) => {
    await updateDoc(doc(db, 'quotes', id), { status });
  };

  const handleContractorNote = async (id, note) => {
    await updateDoc(doc(db, 'quotes', id), { contractorNote: note });
  };

  const handleSummaryEdit = async (id, summary) => {
    await updateDoc(doc(db, 'quotes', id), { issue: summary });
  };

  const toggleChat = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleContinueChat = (id) => {
    router.push(`/?quoteId=${id}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">My Quotes</h1>
      <div className="grid gap-4">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="border rounded-lg p-4 shadow bg-white space-y-2"
          >
            <p className="text-sm text-gray-500">Quote ID: {quote.id}</p>
            <textarea
              className="w-full border-gray-300 rounded-md text-sm shadow-sm"
              defaultValue={quote.issue || ''}
              onBlur={(e) => handleSummaryEdit(quote.id, e.target.value)}
              placeholder="Quote summary"
            />
            {quote.images?.[0] && (
              <img
                src={quote.images[0]}
                alt="Quote"
                className="mt-2 w-full max-w-xs rounded-md border"
              />
            )}
            <p className="text-sm text-gray-600">
              Submitted: {quote.timestamp?.toDate().toLocaleString()}
            </p>
            <p className="text-sm">Latest AI Response: {quote.aiReply}</p>

            <p
              className="text-sm text-blue-600 underline cursor-pointer"
              onClick={() => toggleChat(quote.id)}
            >
              {expandedId === quote.id ? 'Hide' : 'View'} Full Conversation
            </p>
            {expandedId === quote.id && (
              <div className="mt-2 p-2 border rounded bg-gray-50 text-sm space-y-1 max-h-48 overflow-y-auto">
                {quote.chatTranscript?.map((msg, idx) => (
                  <div
                    key={idx}
                    className={
                      msg.role === 'assistant'
                        ? 'text-gray-800'
                        : 'text-blue-800'
                    }
                  >
                    <strong>{msg.role === 'assistant' ? 'Bot:' : 'You:'}</strong>{' '}
                    {msg.content}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700">
                Status:
              </label>
              <select
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                value={quote.status || 'Pending'}
                onChange={(e) => handleStatusChange(quote.id, e.target.value)}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Quote Sent</option>
                <option>Closed</option>
              </select>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700">
                Contractor Note:
              </label>
              <textarea
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                defaultValue={quote.contractorNote || ''}
                onBlur={(e) => handleContractorNote(quote.id, e.target.value)}
              />
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={() => handleContinueChat(quote.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-full"
              >
                🔁 Continue Chat
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
