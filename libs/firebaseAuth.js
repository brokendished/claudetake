// libs/firebaseAuth.js

import axios from 'axios';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

/**
 * Synchronizes a NextAuth session with Firebase Authentication
 * @param {Object} session - The NextAuth session object
 * @returns {Promise<Object|null>} The Firebase user if successful, or null
 */
export async function syncNextAuthWithFirebase(session) {
  if (!session?.user?.email) {
    console.error('No valid session to sync with Firebase');
    return null;
  }

  try {
    const response = await fetch('/api/firebase-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        name:  session.user.name || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get Firebase token: ${response.statusText}`);
    }

    const { customToken } = await response.json();
    const auth = getAuth();
    const userCredential = await signInWithCustomToken(auth, customToken);

    console.log('Successfully signed in to Firebase Auth', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('Error syncing NextAuth session with Firebase:', error);
    return null;
  }
}

/**
 * Verifies email and password against Firebase Authentication REST API
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object|null>} User info { uid, email, displayName } or null
 */
export async function verifyPassword(email, password) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

  try {
    const { data } = await axios.post(url, {
      email,
      password,
      returnSecureToken: true,
    });
    return {
      uid:         data.localId,
      email:       data.email,
      displayName: data.displayName || ''
    };
  } catch (error) {
    console.error('Firebase password sign-in failed:', error.response?.data || error.message);
    return null;
  }
}

