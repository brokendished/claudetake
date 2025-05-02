import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;

export function initAdmin() {
  if (!getApps().length) {
    try {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      throw error;
    }
  }
  return getApps()[0];
}

export const getDb = () => {
  initAdmin();
  return getFirestore();
};

export { getFirestore };
