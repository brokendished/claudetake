// pages/dashboard.js

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../libs/firebaseClient'

export default function Dashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => signIn(),
  })

  const [quotes, setQuotes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredQuotes, setFilteredQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  // Load this user's quotes from /consumers/{uid}/quotes
  useEffect(() => {
    if (status !== 'authenticated') return
    if (status !== 'authenticated') return      console.error('User UID is missing or session is not authenticated.');
    async function loadQuotes() {
      try {unction loadQuotes() {
        console.log('Session:', session); // Debug session data
        const q = query(sion:', session); // Debug session datauotes() {
          collection(db, 'consumers', session.user.uid, 'quotes'),
          orderBy('createdAt', 'desc')session.user.uid, 'quotes'),n); // Debug session data
        ) orderBy('createdAt', 'desc')onst q = query(
        const snap = await getDocs(q),
        const data = snap.docs.map(doc => {
          const d = doc.data().map(doc => {
          return {= doc.data() = await getDocs(q)
            id: doc.id,cs.map(doc => {
            ...d,oc.id, = doc.data()
            createdAt: d.createdAt?.toDate?.() || new Date(),
          } createdAt: d.createdAt?.toDate?.() || new Date(), id: doc.id,
        })}  ...d,
        console.log('Quotes:', data); // Debug fetched quotes
        setQuotes(data)otes:', data); // Debug fetched quotes
      } catch (err) {a)
        console.error('Error loading quotes:', err)
        setError(err.message)loading quotes:', err)
      } finally {err.message)r) {
        setLoading(false)ing quotes:', err)
      } setLoading(false) setError(err.message)
    } } } finally {
    }        setLoading(false)
    loadQuotes()
  }, [session, status])
  }, [session, status])
  // Filter by keyword
  useEffect(() => {ordus])
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      setFilteredQuotes()) {
        quotes.filter(q =>erm.toLowerCase() {
          (q.issue   || '').toLowerCase().includes(term) ||
          (q.aiReply || '').toLowerCase().includes(term)
        ) (q.issue   || '').toLowerCase().includes(term) ||uotes.filter(q =>
      )   (q.aiReply || '').toLowerCase().includes(term)   (q.issue   || '').toLowerCase().includes(term) ||
    } else {Reply || '').toLowerCase().includes(term)
      setFilteredQuotes(quotes)
    } else { )
  }, [searchTerm, quotes])otes)
    }      setFilteredQuotes(quotes)
  if (status !== 'authenticated') {
    return <p className="p-4">Loading your session…</p>
  }
  if (status !== 'authenticated') {  if (status !== 'authenticated') {
  if (loading) {assName="p-4">Loading your session…</p>assName="p-4">Loading your session…</p>
    return <p>Loading...</p>
  }
  if (loading) {  if (loading) {
  if (error) {Loading...</p>Loading...</p>
    return <p>Error: {error}</p>
  }
  if (error) {  if (error) {
  return ( <p>Error: {error}</p> <p>Error: {error}</p>
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Your Quotes</h1>
  return (  return (
      <inputssName="max-w-4xl mx-auto p-4">ssName="max-w-4xl mx-auto p-4">
        type="text"="text-2xl font-semibold mb-4">Your Quotes</h1>="text-2xl font-semibold mb-4">Your Quotes</h1>
        placeholder="Search by keyword..."
        aria-label="Search quotes"
        className="w-full border p-2 mb-4 rounded shadow-sm text-sm"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}className="w-full border p-2 mb-4 rounded shadow-sm text-sm"className="w-full border p-2 mb-4 rounded shadow-sm text-sm"
      />        value={searchTerm}        value={searchTerm}
rm(e.target.value)}rm(e.target.value)}
      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <p className="text-gray-500">No quotes found.</p>assName="grid gap-4">assName="grid gap-4">
        ) : (
          filteredQuotes.map(q => (
            <div key={q.id} className="border rounded-lg p-4 shadow bg-white">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-800">
                  {q.issue || 'Quote Request'}tes.map(q => (assName="flex justify-between items-start">
                </h2> p-4 shadow bg-white">t-gray-800">
                <span className="text-sm text-gray-500">tems-start">
                  {q.createdAt.toLocaleDateString()}ssName="text-lg font-semibold text-gray-800">
                </span>.issue || 'Quote Request'}n className="text-sm text-gray-500">
              </div>                </h2>                  {q.createdAt.toLocaleDateString()}
text-sm text-gray-500">
              {q.images?.[0] && (.createdAt.toLocaleDateString()}
                <img
                  src={q.images[0]}
                  alt={`Snapshot for quote ${q.id}`}
                  className="mt-2 max-w-xs rounded border"mages?.[0] && (src={q.images[0]}
                /><img  alt="Snapshot"
              )}                  src={q.images[0]}                  className="mt-2 max-w-xs rounded border"

              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">der"
                {q.aiReply || 'No summary available.'}
              </p>              )}              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">

              <details className="mt-2 text-sm text-blue-600 cursor-pointer">itespace-pre-wrap">
                <summary>View Full Conversation</summary>
                <div className="bg-gray-50 mt-2 p-2 rounded border text-gray-600 text-xs">t-xs">blue-600 cursor-pointer">
                  {q.chatTranscript?.map((m, i) => (
                    <div key={i} className="mb-1"> cursor-pointer">ext-gray-600 text-xs">
                      <strong>{m.role}:</strong> {m.content}iew Full Conversation</summary>trong>{m.role}:</strong> {m.content}ranscript?.map((m, i) => (
                    </div>className="bg-gray-50 mt-2 p-2 rounded border text-gray-600 text-xs"> </div>div key={i} className="mb-1">
                  ))}hatTranscript?.map((m, i) => (}<strong>{m.role}:</strong> {m.content}
                </div> key={i} className="mb-1">v>
              </details>    <strong>{m.role}:</strong> {m.content}: ())}
            </div>        </div>      <p className="text-gray-500 mt-2">No conversation available.</p>    </div>
          ))        ))}      )}    </details>
        )}    </div>  </details></div>
      </div>    </details>  </div>))
    </div>         </div>       ))     )}
  )         ))       )}     </div>
}        )}      </div>    </div>






}  )    </div>      </div>



}  )    </div>  )
}
