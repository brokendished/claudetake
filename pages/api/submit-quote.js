// pages/api/submit-quote.js

import { initAdmin } from '../../libs/firebaseAdmin';
import { getFirestore, serverTimestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Resend } from 'resend';

// 1. Initialize Firebase Admin & Resend email service
initAdmin();
const adminDb   = getFirestore();
const authAdmin = getAuth();
const resend    = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Extract and verify Firebase ID token (to get consumer UID)
    const authHeader = req.headers.authorization || '';
    let consumerUid = null;
    if (authHeader.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split(' ')[1];
        const decoded = await authAdmin.verifyIdToken(idToken);
        consumerUid = decoded.uid;
      } catch (e) {
        console.warn('Invalid auth token:', e.message);
      }
    }

    // 3. Pull payload
    const { userInfo, imageURLs = [], quoteId } = req.body;
    if (!userInfo?.email || !quoteId) {
      return res.status(400).json({ error: 'Missing required information' });
    }

    // 4. Load & authorize the existing quote
    const quoteRef  = adminDb.collection('quotes').doc(quoteId);
    const quoteSnap = await quoteRef.get();
    if (!quoteSnap.exists) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    const quoteData = quoteSnap.data();
    if (quoteData.email !== userInfo.email) {
      return res.status(403).json({ error: 'Not authorized to submit this quote' });
    }

    // 5. Build email HTML for user
    const userEmailHtml = `
      <h1>Your Quote Request Has Been Submitted</h1>
      <p>Hi ${userInfo.name || 'there'},</p>
      <p>Your quote request has been submitted successfully. Here's a summary:</p>
      <ul>
        <li><strong>Quote ID:</strong> ${quoteId}</li>
        <li><strong>Description:</strong> ${userInfo.summary}</li>
        <li><strong>Submitted:</strong> ${new Date(userInfo.timestamp).toLocaleString()}</li>
        ${imageURLs.length > 0 ? '<li><strong>Images:</strong> Yes</li>' : ''}
      </ul>
      <p>Thank you for using our service!</p>
    `;

    // 6. Build email HTML for contractor
    const contractorEmailHtml = `
      <h1>New Quote Request</h1>
      <p>A new quote request has been submitted:</p>
      <ul>
        <li><strong>Customer:</strong> ${userInfo.name || userInfo.email}</li>
        <li><strong>Email:</strong> ${userInfo.email}</li>
        <li><strong>Quote ID:</strong> ${quoteId}</li>
        <li><strong>Description:</strong> ${userInfo.summary}</li>
        <li><strong>Submitted:</strong> ${new Date(userInfo.timestamp).toLocaleString()}</li>
      </ul>
      ${imageURLs.length > 0
        ? `<p><strong>Images:</strong></p>
           <div>
             ${imageURLs
               .map(url => `<img src="${url}" style="max-width:200px;margin:5px;" />`)
               .join('')}
           </div>`
        : '<p>No images provided.</p>'}
      <p>Please check your dashboard to review and respond.</p>
    `;

    // 7. Send emails
    const contractorEmail = process.env.CONTRACTOR_EMAIL;
    await Promise.all([
      resend.emails.send({
        from:    'quotes@yourdomain.com',
        to:      userInfo.email,
        subject: 'Your Quote Request Confirmation',
        html:    userEmailHtml,
      }),
      resend.emails.send({
        from:    'quotes@yourdomain.com',
        to:      contractorEmail,
        subject: `New Quote Request from ${userInfo.name || userInfo.email}`,
        html:    contractorEmailHtml,
      }),
    ]);

    // 8. Update top-level quote status
    await quoteRef.update({
      status:      'Submitted',
      submittedAt: serverTimestamp(),
    });

    // 9. Mirror into /consumers/{uid}/quotes/{quoteId}
    if (consumerUid) {
      await adminDb
        .collection('consumers')
        .doc(consumerUid)
        .collection('quotes')
        .doc(quoteId)
        .set(
          {
            ...quoteData,
            status:      'Submitted',
            submittedAt: serverTimestamp(),
          },
          { merge: true }
        );
    }

    return res.status(200).json({
      success: true,
      message: 'Quote submitted successfully',
    });
  } catch (error) {
    console.error('Error in submit-quote API:', error);
    return res.status(500).json({
      error:   'Internal Server Error',
      message: error.message,
    });
  }
}
