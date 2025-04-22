// pages/api/contractor/profile.js

import { initAdmin } from '../../../libs/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

initAdmin();                     // ensure the Admin SDK is initialized
const db = getFirestore();       // Firestore client
const auth = getAuth();          // Auth client

export default async function handler(req, res) {
  // 1) Extract & verify the Firebase token from the Authorization header
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  let uid;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  // 2) Reference to this contractor’s doc
  const ref = db.collection('contractors').doc(uid);

  if (req.method === 'GET') {
    // Return existing settings
    const snap = await ref.get();
    return res.status(200).json(snap.exists ? snap.data() : {});
  }

  if (req.method === 'POST') {
    // Merge in whatever they’ve sent (profile, delivery, slug, etc.)
    await ref.set(req.body, { merge: true });
    return res.status(204).end();
  }

  // 3) Method not allowed
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
