// pages/api/contractor/[contractorId]/quotes.js

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, serverTimestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Admin SDK if not already done
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db   = getFirestore();
const auth = getAuth();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { contractorId } = req.query;
  const { name, email, description } = req.body;

  if (!name || !email || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Extract consumer UID from Firebase ID token, if provided
  let consumerUid = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const idToken = authHeader.split(' ')[1];
      const decoded = await auth.verifyIdToken(idToken);
      consumerUid = decoded.uid;
    } catch (e) {
      console.warn('Invalid consumer token:', e.message);
    }
  }

  // Build quote data
  const quoteData = {
    name,
    email,
    description,
    status: 'new',
    createdAt: serverTimestamp(),
    ownerId: consumerUid || null,
  };

  try {
    // 1) Write into contractor’s sub-collection
    const contractorQuotes = db
      .collection('contractors')
      .doc(contractorId)
      .collection('quotes');
    const quoteRef = await contractorQuotes.add(quoteData);

    // 2) Mirror into consumer’s personal sub-collection
    if (consumerUid) {
      const consumerQuotes = db
        .collection('consumers')
        .doc(consumerUid)
        .collection('quotes');
      await consumerQuotes.doc(quoteRef.id).set(quoteData, { merge: true });
    }

    return res.status(201).json({ id: quoteRef.id });
  } catch (err) {
    console.error('🚨 Quote submit error:', err);
    return res.status(500).json({ error: err.message });
  }
}
