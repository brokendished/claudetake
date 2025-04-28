// Initialize Firebase Admin SDK
import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (typeof window !== 'undefined') {
  throw new Error('Firebase Admin SDK should only be initialized on the server side.');
}

if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
  console.error('Missing Firebase server-side environment variables.');
  throw new Error('Missing Firebase server-side environment variables. Please ensure they are set in Vercel.');
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensure proper formatting
    }),
  });
}
