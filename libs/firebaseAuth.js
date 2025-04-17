// File: libs/firebaseAuth.js
// This file will handle the integration between NextAuth and Firebase Auth

import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { db } from './firebaseClient'; // Your existing Firebase client

/**
 * Synchronizes a NextAuth session with Firebase Authentication
 * @param {Object} session - The NextAuth session object 
 * @returns {Promise<Object>} The Firebase user if successful
 */
export async function syncNextAuthWithFirebase(session) {
  if (!session?.user?.email) {
    console.error('No valid session to sync with Firebase');
    return null;
  }

  try {
    // Step 1: Call your backend endpoint to get a custom token for this user
    const response = await fetch('/api/auth/firebase-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email,
        name: session.user.name || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get Firebase token: ${response.statusText}`);
    }

    const { customToken } = await response.json();

    // Step 2: Sign in to Firebase with the custom token
    const auth = getAuth();
    const userCredential = await signInWithCustomToken(auth, customToken);
    
    console.log('Successfully signed in to Firebase Auth', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('Error syncing NextAuth session with Firebase:', error);
    return null;
  }
}

// File: pages/api/auth/firebase-token.js
// This API endpoint will generate a Firebase custom token

import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '../../../libs/firebaseAdmin';

// Initialize Firebase Admin if it hasn't been initialized yet
initAdmin();

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user info from request body
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get the user from the session (this assumes you're using NextAuth session)
    // Verify the request is authenticated using NextAuth's getSession or similar mechanism
    // (Omitted for brevity - in a real implementation, you'd verify the session here)

    // Create a custom token for this user
    // If the user doesn't exist in Firebase, this will create them
    let firebaseUser;
    
    try {
      // Try to get existing user
      firebaseUser = await getAuth().getUserByEmail(email);
    } catch (error) {
      // If user doesn't exist, create them
      if (error.code === 'auth/user-not-found') {
        firebaseUser = await getAuth().createUser({
          email,
          displayName: name,
          emailVerified: true, // Since they're authenticated via NextAuth, we trust the email
        });
      } else {
        throw error;
      }
    }

    // Generate a custom token for this user
    const customToken = await getAuth().createCustomToken(firebaseUser.uid);

    return res.status(200).json({ customToken });
  } catch (error) {
    console.error('Error creating Firebase token:', error);
    return res.status(500).json({ error: 'Failed to create Firebase token' });
  }
}

// File: libs/firebaseAdmin.js
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

// File: _app.js or equivalent in your Next.js structure
// Update your _app.js to include the Firebase sync logic

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { syncNextAuthWithFirebase } from '../libs/firebaseAuth';

// Component to handle Firebase authentication syncing
function FirebaseAuthSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      // Sync the NextAuth session with Firebase Auth
      syncNextAuthWithFirebase(session).catch(console.error);
    }
  }, [session]);

  return null; // This component doesn't render anything
}

// Main App component
export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <FirebaseAuthSync />
      <Component {...pageProps} />
    </SessionProvider>
  );
}

// File: pages/api/auth/[...nextauth].js
// Configure NextAuth as you have it now

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Add other providers if needed
  ],
  callbacks: {
    async session({ session, token, user }) {
      // You can add custom data to the session here if needed
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
