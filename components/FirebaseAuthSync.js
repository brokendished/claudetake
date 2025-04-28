import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { syncNextAuthWithFirebase } from '../libs/firebaseAuth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration (ensure this matches your firebase-config.js)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase if it hasn't been initialized yet
let firebaseApp;
try {
  firebaseApp = initializeApp(firebaseConfig);
} catch (error) {
  if (!/already exists/.test(error.message)) {
    console.error("Firebase initialization error:", error);
  }
}

const auth = getAuth(firebaseApp);

// Component to handle Firebase authentication syncing
export default function FirebaseAuthSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      // Sync the NextAuth session with Firebase Auth
      syncNextAuthWithFirebase(session, auth).catch((error) => {
        console.error("Error syncing NextAuth with Firebase:", error);
      });
    }
  }, [session]);

  return null; // This component doesn't render anything
}
