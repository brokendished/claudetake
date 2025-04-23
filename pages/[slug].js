// pages/[slug].js

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function PublicQuote({ contractor }) {
  const { data: session } = useSession()
  const [form, setForm] = useState({ name: '', email: '', description: '' })
  const [submitted, setSubmitted] = useState(false)

  // If signed in, prefill name/email
  useEffect(() => {
    if (session?.user) {
      setForm(f => ({
        ...f,
        name: session.user.name || f.name,
        email: session.user.email || f.email,
      }))
    }
  }, [session])

  async function handleSubmit(e) {
    e.preventDefault()
    const headers = { 'Content-Type': 'application/json' }
    if (session?.firebaseToken) {
      headers['Authorization'] = `Bearer ${session.firebaseToken}`
    }
    await fetch(`/api/contractor/${contractor.uid}/quotes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(form),
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <p className="text-lg">
          {contractor.thankYouMessage || 'Thanks! We’ll be in touch.'}
        </p>
        {session && (
          <button
            onClick={() => signOut()}
            className="mt-4 text-sm text-blue-600"
          >
            Sign out ({session.user.email})
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {session ? (
        <div className="mb-4 text-sm">
          Signed in as <strong>{session.user.email}</strong>.{' '}
          <button onClick={() => signOut()} className="underline">
            Sign out
          </button>
        </div>
      ) : (
        <div className="mb-4 text-sm">
          <button
            onClick={() => signIn('google')}
            className="underline text-blue-600"
          >
            Sign in with Google
          </button>{' '}
          or continue as guest.
        </div>
      )}

      <h1 className="text-xl font-bold mb-2">
        {contractor.businessName} – Request a Quote
      </h1>
      <p className="mb-4">{contractor.introMessage}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="font-medium">Name</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded p-2"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </label>

        <label className="block">
          <span className="font-medium">Email</span>
          <input
            type="email"
            className="mt-1 block w-full border rounded p-2"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
        </label>

        <label className="block">
          <span className="font-medium">Issue Description</span>
          <textarea
            className="mt-1 block w-full border rounded p-2"
            value={form.description}
            onChange={e =>
              setForm(f => ({ ...f, description: e.target.value }))
            }
            rows={4}
            required
          />
        </label>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          Submit
        </button>
      </form>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Server-side data fetching
// ----------------------------------------------------------------------------

export async function getServerSideProps({ params }) {
  try {
    // Inline Firebase Admin init
    const { initializeApp, cert, getApps } = require('firebase-admin/app')
    const { getFirestore } = require('firebase-admin/firestore')

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      })
    }

    const db = getFirestore()
    const qs = await db
      .collection('contractors')
      .where('linkSlug', '==', params.slug)
      .limit(1)
      .get()

    if (qs.empty) {
      return { notFound: true }
    }

    const doc = qs.docs[0]
    return {
      props: {
        contractor: { uid: doc.id, ...doc.data() },
      },
    }
  } catch (err) {
    console.error('🚨 [slug] getServerSideProps error:', err)
    return { notFound: true }
  }
}
