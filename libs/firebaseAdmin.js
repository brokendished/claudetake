import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;

export function initAdmin() {
  if (!getApps().length) {
    try {
      // Check for required environment variables
      const requiredVars = {
        'FIREBASE_PROJECT_ID': process.env.FIREBASE_PROJECT_ID,
        'FIREBASE_CLIENT_EMAIL': process.env.FIREBASE_CLIENT_EMAIL,
        'FIREBASE_PRIVATE_KEY': process.env.FIREBASE_PRIVATE_KEY
      };

      const missingVars = Object.entries(requiredVars)
        .filter(([, value]) => !value)
        .map(([key]) => key);

      if (missingVars.length > 0) {
        throw new Error(
          `Missing required Firebase Admin environment variables: ${missingVars.join(', ')}\n` +
          'Please add these to your Vercel environment variables.'
        );
      }

      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Handle escaped newlines in the private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
      throw error;
    }
  }
  return getApps()[0];
}

export const getDb = () => {
  initAdmin();
  return getFirestore();
};
