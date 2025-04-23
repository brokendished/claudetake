// pages/api/contractor/[contractorId]/quotes.js

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { contractorId } = req.query
  const { name, email, description } = req.body

  if (!name || !email || !description) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

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

    // Write into contractors/{uid}/quotes
    const ref = await db
      .collection('contractors')
      .doc(contractorId)
      .collection('quotes')
      .add({
        name,
        email,
        description,
        status: 'new',
        createdAt: new Date(),
      })

    return res.status(201).json({ id: ref.id })
  } catch (err) {
    console.error('🚨 /api/contractor/[uid]/quotes error:', err)
    return res.status(500).json({ error: err.message })
  }
}
