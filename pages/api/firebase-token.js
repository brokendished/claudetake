// pages/api/firebase-token.js

import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '../../libs/firebaseAdmin';

// ── initialize Admin SDK ─────────────────────────────────────────────────────
initAdmin();

// ── DEBUG & CORS PREFLIGHT ────────────────────────────────────────────────────
// (Place these lines *before* your `export default` so they run on every invocation)
export default async function handler(req, res) {
  // 1) Handle CORS preflight so your browser’s POST isn’t rejected immediately
  if (req.method === 'OPTIONS') {
    // You can also set headers here if you need more CORS control
    return res.status(200).end();
  }

  // 2) Log the exact env‑vars your Admin SDK needs
  console.log('🔑 FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('🔑 FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
  console.log(
    '🔑 FIREBASE_SERVICE_ACCOUNT_KEY present?:',
    !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  );

  // 3) Only accept the real POST from your client
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // …the rest of your token‑minting logic…
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let firebaseUser;
    try {
      firebaseUser = await getAuth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        firebaseUser = await getAuth().createUser({
          email,
          displayName: name,
          emailVerified: true,
        });
      } else {
        throw error;
      }
    }

    const customToken = await getAuth().createCustomToken(firebaseUser.uid);
    return res.status(200).json({ customToken });
  } catch (error) {
    console.error('Error creating Firebase token:', error);
    return res.status(500).json({ error: 'Failed to create Firebase token' });
  }
}
