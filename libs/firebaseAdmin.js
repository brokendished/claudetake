
// Initialize Firebase Admin SDK
import { getApps, initializeApp, cert } from 'firebase-admin/app';

export function initAdmin() {
  // Only initialize if it hasn't been initialized yet
  if (getApps().length === 0) {
    // Initialize with service account or environment variables
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}
