import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate client-side environment variables
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || 
    !firebaseConfig.storageBucket || !firebaseConfig.messagingSenderId || !firebaseConfig.appId) {
  console.error("Missing Firebase client-side environment variables:");
  console.error("NEXT_PUBLIC_FIREBASE_API_KEY:", !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  console.error("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  console.error("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  console.error("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
  console.error("NEXT_PUBLIC_FIREBASE_APP_ID:", !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
  throw new Error("Missing Firebase client-side environment variables. Please check your .env file.");
}

// Validate server-side environment variables
if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
  console.error("Missing Firebase server-side environment variables:");
  console.error("FIREBASE_PRIVATE_KEY:", !!process.env.FIREBASE_PRIVATE_KEY);
  console.error("FIREBASE_CLIENT_EMAIL:", !!process.env.FIREBASE_CLIENT_EMAIL);
  console.error("FIREBASE_PROJECT_ID:", !!process.env.FIREBASE_PROJECT_ID);
  throw new Error("Missing Firebase server-side environment variables. Please check your .env file.");
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp(); // Use getApp() instead of getApps()[0]

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
