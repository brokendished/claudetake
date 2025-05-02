import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;

// Ensure Firebase Admin SDK is only initialized on the server side
if (typeof window !== 'undefined') {
  throw new Error('Firebase Admin SDK should only be initialized on the server side.');
}

// Check for missing environment variables
const { FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID } = process.env;
if (!FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PROJECT_ID) {
  console.error('Missing Firebase server-side environment variables.');
  throw new Error('Missing Firebase server-side environment variables. Please ensure they are set in Vercel.');
}

// Initialize Firebase Admin SDK if not already initialized
export function initAdmin() {
  if (!getApps().length) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensure proper formatting
      }),
    });
  }
}

export { getFirestore };
