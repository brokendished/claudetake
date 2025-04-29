import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '../../../libs/firebaseAdmin';

initAdmin();
const db = getFirestore();

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { contractorId } = req.query; // Updated from uid to contractorId

    if (!contractorId) {
      return res.status(400).json({ error: 'Missing contractor ID' });
    }

    const contractorRef = db.collection('contractors').doc(contractorId);
    const contractorDoc = await contractorRef.get();

    if (!contractorDoc.exists) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    return res.status(200).json(contractorDoc.data());
  } catch (error) {
    console.error('Error fetching contractor data:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}