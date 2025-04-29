import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '../../../libs/firebaseAdmin';
import formidable from 'formidable';
import { uploadFileToStorage } from '../../../libs/firebaseStorage'; // Assume this helper uploads files to Firebase Storage

initAdmin();
const db = getFirestore();

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        return res.status(400).json({ error: 'Invalid form data' });
      }

      const { name, businessName, greeting } = fields;
      const { contractorId } = req.headers; // Use contractorId consistently

      if (!contractorId || !name || !businessName || !greeting) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      let logoUrl = null;
      if (files.logo) {
        logoUrl = await uploadFileToStorage(files.logo, `contractors/${contractorId}/logo`);
      }

      const contractorRef = db.collection('contractors').doc(contractorId);
      await contractorRef.set(
        {
          name,
          businessName,
          greeting,
          logo: logoUrl,
          personalizedLink: `https://claudetake.vercel.app/contractor/${contractorId}`,
        },
        { merge: true }
      );

      return res.status(200).json({ success: true });
    });
  } catch (error) {
    console.error('Error saving contractor settings:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
