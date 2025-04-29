import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '../../../libs/firebaseAdmin';

initAdmin();
const db = getFirestore();

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, businessName } = req.body;
    const { uid } = req.headers; // Assume UID is passed in headers for simplicity

    if (!uid || !name || !businessName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const contractorRef = db.collection('contractors').doc(uid);
    await contractorRef.set(
      {
        name,
        businessName,
        personalizedLink: `https://claudetake.vercel.app/contractor/${uid}`,
      },
      { merge: true }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving contractor settings:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
