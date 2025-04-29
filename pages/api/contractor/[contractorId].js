import { db } from '../../../firebase';

export default async function handler(req, res) {
  const { contractorId } = req.query; // Use contractorId consistently

  try {
    const contractorRef = db.collection('contractors').doc(contractorId);
    const doc = await contractorRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Contractor not found' });
      return;
    }

    res.status(200).json(doc.data());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contractor' });
  }
}