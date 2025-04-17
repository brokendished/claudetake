// libs/firebaseAuth.js
import { getAuth, signInWithCustomToken } from 'firebase/auth';

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
    const response = await fetch('/api/auth/firebase-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        name: session.user.name || '',
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
