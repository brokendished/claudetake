// This API endpoint will generate a Firebase custom token
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '../../libs/firebaseAdmin';

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
