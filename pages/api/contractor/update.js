import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '../../../libs/firebaseAdmin';

initAdmin();
const db = getFirestore();

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { contractorId, updates } = req.body;

    if (!contractorId || !updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid data' });
    }

    const contractorRef = db.collection('contractors').doc(contractorId);

    await contractorRef.set(updates, { merge: true });

    return res.status(200).json({ success: true, message: 'Contractor data updated successfully' });
  } catch (error) {
    console.error('Error updating contractor data:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
