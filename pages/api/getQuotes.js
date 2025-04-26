import { db } from '../../libs/firebaseClient';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userEmail = session.user.email;
    const quotesRef = collection(db, 'quotes');
    const q = query(quotesRef, where('email', '==', userEmail));
    const querySnapshot = await getDocs(q);

    const quotes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ quotes });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
}
