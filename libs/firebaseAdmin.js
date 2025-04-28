import { initializeApp, cert, getApps } from 'firebase-admin/app';

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
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensure proper formatting
    }),
  });
}
