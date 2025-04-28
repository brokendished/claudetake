import { useState } from 'react';
import { auth, db } from "../firebase-config";
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function Signup() {
  const router = useRouter();

  const handleGoogleSignup = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if the user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Save initial contractor details in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          role: 'contractor',
          createdAt: new Date(),
        });
      }

      // Redirect to account creation landing page
      router.push('/contractor/account-setup');
    } catch (error) {
      console.error('Error signing up with Google:', error);
      alert('Error signing up: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Contractor Signup</h1>
      <p className="text-sm text-gray-600 mb-4">
        Sign in with Google to create your contractor account.
      </p>
      <button
        onClick={handleGoogleSignup}
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
      >
        Sign Up with Google
      </button>
    </div>
  );
}
