// pages/[slug].js

import { useState } from 'react'
import { auth } from '../libs/firebaseClient'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export default function PublicQuote({ contractor }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    description: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [quoteId, setQuoteId] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()

    // 1) Get the consumer’s Firebase ID token
    const idToken = await auth.currentUser.getIdToken()

    // 2) Send the form data + token
    const res = await fetch(`/api/contractor/${contractor.contractorId}/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(form),
    })
    const { id } = await res.json()

    setQuoteId(id)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-2">Thank you, {form.name}!</h2>
        <p>
          Your quote request <strong>#{quoteId}</strong> has been sent to{' '}
          <strong>{contractor.businessName}</strong>.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          You’ll receive updates at <strong>{form.email}</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">
        {contractor.businessName} – Request a Quote
      </h1>
      <p>{contractor.introMessage}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="font-medium">Name</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded p-2"
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
        </label>

        <label className="block">
          <span className="font-medium">Email</span>
          <input
            type="email"
            className="mt-1 block w-full border rounded p-2"
            value={form.email}
            onChange={(e) =>
              setForm((f) => ({ ...f, email: e.target.value }))
            }
            required
          />
        </label>

        <label className="block">
          <span className="font-medium">Issue Description</span>
          <textarea
            className="mt-1 block w-full border rounded p-2"
            rows={4}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
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

// Server-side fetch—securely loads the contractor’s settings
export async function getServerSideProps({ params }) {
  try {
    // Initialize Admin SDK once
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
        contractor: { contractorId: doc.id, ...doc.data() }, // Use contractorId consistently
      },
    }
  } catch (err) {
    console.error('🚨 [slug] getServerSideProps error:', err)
    return { notFound: true }
  }
}
