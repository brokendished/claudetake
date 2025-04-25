// pages/api/contractor/[contractorId]/quotes.js

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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

  // Initialize Firebase Admin SDK (once)
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  const db = getFirestore();
  const authAdmin = getAuth();

  // Determine consumer UID (if signed in)
  let consumerUid = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split(' ')[1];
    try {
      const decoded = await authAdmin.verifyIdToken(idToken);
      consumerUid = decoded.uid;
    } catch (e) {
      console.warn('Invalid consumer token:', e.message);
    }
  }

  try {
    // 1) Write to contractor's quotes sub-collection
    const quoteData = {
      name,
      email,
      description,
      status: 'new',
      createdAt: new Date(),
      ownerId: consumerUid,  // for collectionGroup filtering
    };

    const quoteRef = await db
      .collection('contractors')
      .doc(contractorId)
      .collection('quotes')
      .add(quoteData);

    // 2) If signed-in as consumer, also write to their personal quotes
    if (consumerUid) {
      await db
        .collection('consumers')
        .doc(consumerUid)
        .collection('quotes')
        .doc(quoteRef.id)
        .set(quoteData);
    }

    return res.status(201).json({ id: quoteRef.id });
  } catch (err) {
    console.error('🚨 Quote submit error:', err);
    return res.status(500).json({ error: err.message });
  }
}
