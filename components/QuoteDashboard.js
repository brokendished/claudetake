import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { db } from '../libs/firebaseClient';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  limit,
  startAfter,
  documentSnapshot,
  getDoc
} from 'firebase/firestore';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function QuoteDashboard() {
  const { data: session, status } = useSession();
  const [quotes, setQuotes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const router = useRouter();

  // Filter quotes based on search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredQuotes(
        quotes.filter((q) =>
          q.issue?.toLowerCase().includes(term) ||
          q.status?.toLowerCase().includes(term) ||
          q.contractorNote?.toLowerCase().includes(term) ||
          q.chatTranscript?.some(msg => 
            msg.content?.toLowerCase().includes(term)
          )
        )
      );
    } else {
      setFilteredQuotes(quotes);
    }
  }, [searchTerm, quotes]);

  // Load quotes when session is available
  useEffect(() => {
    let unsubscribe = () => {};

    const loadQuotes = async () => {
      // Clear any previous error
      setError(null);
      
      if (status === 'loading') return;
      
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Create query with proper ordering
        const quotesQuery = query(
          collection(db, 'quotes'),
          where('email', '==', session.user.email),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        // Use onSnapshot for real-time updates
        unsubscribe = onSnapshot(
          quotesQuery,
          async (snapshot) => {
            try {
              // Set last visible document for pagination
              const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
              setLastVisible(lastVisibleDoc);
              setHasMore(snapshot.docs.length === 10);
              
              // Process quotes with message data
              const quotesData = [];
              
              for (const docSnapshot of snapshot.docs) {
                const quoteData = { 
                  id: docSnapshot.id, 
                  ...docSnapshot.data(),
                  // Convert timestamp to date string if it exists
                  formattedDate: docSnapshot.data().timestamp ? 
                    new Date(docSnapshot.data().timestamp.seconds * 1000).toLocaleString() : 
                    'Unknown date'
                };
                
                // Get messages from subcollection
                const messagesQuery = query(
                  collection(db, 'quotes', docSnapshot.id, 'messages'),
                  orderBy('timestamp', 'asc')
                );
                
                const messagesSnapshot = await getDocs(messagesQuery);
                quoteData.chatTranscript = messagesSnapshot.docs.map(doc => doc.data());
                
                quotesData.push(quoteData);
              }
              
              setQuotes(quotesData);
              setLoading(false);
            } catch (err) {
              console.error('Error processing quotes:', err);
              setError('Failed to process quotes data');
              setLoading(false);
            }
          },
          (err) => {
            console.error('Firebase query error:', err);
            setError('Failed to load quotes. Please try again.');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Dashboard error:', err);
        setError('An error occurred while loading quotes');
        setLoading(false);
      }
    };

    loadQuotes();
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [session, status]);

  // Load more quotes (pagination)
  const loadMoreQuotes = useCallback(async () => {
    if (!session?.user?.email || !lastVisible || !hasMore || isLoadingMore) return;
    
    try {
      setIsLoadingMore(true);
      
      const nextQuery = query(
        collection(db, 'quotes'),
        where('email', '==', session.user.email),
        orderBy('timestamp', 'desc'),
        startAfter(lastVisible),
        limit(10)
      );
      
      const snapshot = await getDocs(nextQuery);
      
      // Update last visible document
      const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);
      setHasMore(snapshot.docs.length === 10);
      
      // Process quotes with message data
      const newQuotesData = [];
      
      for (const docSnapshot of snapshot.docs) {
        const quoteData = { 
          id: docSnapshot.id, 
          ...docSnapshot.data(),
          formattedDate: docSnapshot.data().timestamp ? 
            new Date(docSnapshot.data().timestamp.seconds * 1000).toLocaleString() : 
            'Unknown date'
        };
        
        // Get messages from subcollection
        const messagesQuery = query(
          collection(db, 'quotes', docSnapshot.id, 'messages'),
          orderBy('timestamp', 'asc')
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        quoteData.chatTranscript = messagesSnapshot.docs.map(doc => doc.data());
        
        newQuotesData.push(quoteData);
      }
      
      // Append new quotes to existing ones
      setQuotes(prevQuotes => [...prevQuotes, ...newQuotesData]);
    } catch (err) {
      console.error('Error loading more quotes:', err);
      setError('Failed to load more quotes');
    } finally {
      setIsLoadingMore(false);
    }
  }, [session, lastVisible, hasMore, isLoadingMore]);

  // Update quote status
  const handleStatusChange = async (id, status) => {
    try {
      await updateDoc(doc(db, 'quotes', id), { 
        status,
        statusUpdatedAt: new Date()
      });
      
      // No need to update state manually as onSnapshot will handle it
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update quote status');
    }
  };

  // Update contractor note
  const handleContractorNote = async (id, note) => {
    try {
      await updateDoc(doc(db, 'quotes', id), { 
        contractorNote: note,
        noteUpdatedAt: new Date()
      });
      
      // No need to update state manually as onSnapshot will handle it
    } catch (err) {
      console.error('Failed to update note:', err);
      setError('Failed to save contractor note');
    }
  };

  // Update quote summary
  const handleSummaryEdit = async (id, summary) => {
    try {
      await updateDoc(doc(db, 'quotes', id), { issue: summary });
      
      // No need to update state manually as onSnapshot will handle it
    } catch (err) {
      console.error('Failed to update summary:', err);
      setError('Failed to save summary changes');
    }
  };

  // Toggle expanded conversation view
  const toggleChat = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Continue existing chat
  const handleContinueChat = (id) => {
    router.push(`/?quoteId=${id}`);
  };

  // Show login prompt if not authenticated
  if (status !== 'loading' && !session) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-semibold mb-6">My Quotes</h1>
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-8 shadow">
          <p className="text-lg mb-4">You need to sign in to view your quotes</p>
          <Link href="/api/auth/signin">
            <a className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              Sign In
            </a>
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-semibold mb-6">My Quotes</h1>
        <p className="text-gray-500">Loading your quotes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">My Quotes</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
          {error}
          <button 
            className="ml-2 text-sm underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search quotes by keyword..."
          className="w-full border-gray-300 rounded-md shadow-sm p-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-2">No quotes found.</p>
            <p className="text-sm text-gray-400">
              {quotes.length > 0 
                ? 'Try adjusting your search terms.' 
                : 'Create a new quote to get started.'}
            </p>
            <Link href="/">
              <a className="mt-4 inline-block bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
                + New Quote
              </a>
            </Link>
          </div>
        ) : (
          filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="border rounded-lg p-4 shadow bg-white space-y-2"
            >
              <div className="flex justify-between items-start">
                <p className="text-xs text-gray-400">ID: {quote.id}</p>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  quote.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  quote.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  quote.status === 'Quote Sent' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {quote.status || 'Pending'}
                </span>
              </div>
              
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Summary:
                </label>
                <textarea
                  className="w-full border-gray-300 rounded-md text-sm shadow-sm min-h-[60px]"
                  defaultValue={quote.issue || ''}
                  onBlur={(e) => handleSummaryEdit(quote.id, e.target.value)}
                  placeholder="Quote summary"
                />
              </div>
              
              {quote.images?.[0] && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-1">Image:</p>
                  <img
                    src={quote.images[0]}
                    alt="Quote"
                    className="w-full max-w-xs rounded-md border"
                  />
                </div>
              )}
              
              <p className="text-sm text-gray-500">
                Submitted: {quote.formattedDate}
              </p>

              <button
                className="text-sm text-blue-600 underline cursor-pointer"
                onClick={() => toggleChat(quote.id)}
              >
                {expandedId === quote.id ? 'Hide' : 'View'} Conversation
              </button>
              
              {expandedId === quote.id && (
                <div className="mt-2 p-2 border rounded bg-gray-50 text-sm space-y-1 max-h-48 overflow-y-auto">
                  {quote.chatTranscript && quote.chatTranscript.length > 0 ? (
                    quote.chatTranscript.map((msg, idx) => (
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
                        {msg.image && (
                          <img 
                            src={msg.image} 
                            alt="Snapshot" 
                            className="mt-1 max-w-[100px] rounded border" 
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No conversation history available.</p>
                  )}
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
                  placeholder="Add notes about this quote..."
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
          ))
        )}
      </div>

      {/* Load more button */}
      {quotes.length > 0 && hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMoreQuotes}
            disabled={isLoadingMore}
            className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-600 text-sm font-medium px-4 py-2 rounded-full disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : 'Load More Quotes'}
          </button>
        </div>
      )}
    </div>
  );
}
