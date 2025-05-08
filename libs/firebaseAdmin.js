import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Handle private key issues with newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

export function initAdmin() {
  if (!getApps().length) {
    try {
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_CLIENT_EMAIL || 
          !process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error('Missing Firebase server-side environment variables');
      }
      return initializeApp(firebaseAdminConfig);
    } catch (error) {
      console.error('Firebase Admin Error:', error);
      throw error;
    }
  }
  return getApps()[0];
}

export const getDb = () => {
  initAdmin();
  return getFirestore();
};
