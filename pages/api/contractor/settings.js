import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '../../../libs/firebaseAdmin';
import formidable from 'formidable';
import { uploadFileToStorage } from '../../../libs/firebaseStorage'; // Ensure this file exists

// Initialize Firebase Admin
initAdmin();
const db = getFirestore();

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    // Allow only POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse the incoming form data
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        return res.status(400).json({ error: 'Invalid form data' });
      }

      // Extract fields and contractorId from headers
      const { name, businessName, greeting } = fields;
      const { contractorId } = req.headers; // Ensure contractorId is used consistently

      // Validate required fields
      if (!contractorId || !name || !businessName || !greeting) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Upload logo if provided
      let logoUrl = null;
      if (files.logo) {
        try {
          logoUrl = await uploadFileToStorage(files.logo, `contractors/${contractorId}/logo`);
        } catch (uploadError) {
          console.error('Error uploading logo:', uploadError);
          return res.status(500).json({ error: 'Failed to upload logo' });
        }
      }

      // Save contractor settings to Firestore
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

      // Respond with success
      return res.status(200).json({ success: true });
    });
  } catch (error) {
    console.error('Error saving contractor settings:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
