// pages/[slug].js

import { useState } from 'react'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export default function PublicQuote({ contractor }) {
  const [form, setForm] = useState({ name: '', email: '', description: '' })
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    await fetch(`/api/contractor/${contractor.uid}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto">
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

// Server‑side fetch so there are no public Firestore reads
export async function getServerSideProps({ params }) {
  try {
    // Initialize Firebase Admin SDK if not already
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
