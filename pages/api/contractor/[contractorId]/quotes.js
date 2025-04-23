// pages/api/contractor/[contractorId]/quotes.js
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore }             from 'firebase-admin/firestore'
import { getAuth }                  from 'firebase-admin/auth'
import adminAuth                    from 'firebase-admin' // for auth

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { contractorId } = req.query
  const { name, email, description } = req.body

  if (!name || !email || !description) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Initialize Admin SDK
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  }
  const db   = getFirestore()
  const auth = getAuth()

  let consumerUid = null
  const authHeader = req.headers.authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    // Try to verify a Firebase ID token if the consumer signed in
    try {
      const idToken = authHeader.split(' ')[1]
      const decoded = await auth.verifyIdToken(idToken)
      consumerUid = decoded.uid
    } catch (e) {
      // not signed in or invalid token—ignore and proceed anonymously
      console.warn('Invalid consumer token:', e.message)
    }
  }

  try {
    // 1) Write to the contractor’s sub-collection
    const quoteRef = await db
      .collection('contractors')
      .doc(contractorId)
      .collection('quotes')
      .add({ name, email, description, status: 'new', createdAt: new Date() })

    // 2) If we have a consumer UID, also write to their personal sub-collection
    if (consumerUid) {
      await db
        .collection('consumers')
        .doc(consumerUid)
        .collection('quotes')
        .doc(quoteRef.id)
        .set({
          contractorId,
          name, email, description,
          status: 'new',
          createdAt: new Date(),
        })
    }

    return res.status(201).json({ id: quoteRef.id })
  } catch (err) {
    console.error('🚨 Quote submit error:', err)
    return res.status(500).json({ error: err.message })
  }
}
