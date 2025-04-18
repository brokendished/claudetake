// pages/api/submit-quote.js
import { initAdmin } from '../../libs/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';

// Initialize Firebase Admin
initAdmin();
const adminDb = getFirestore();

// Initialize Resend (email service)
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userInfo, imageURLs, quoteId } = req.body;
  
  if (!userInfo || !userInfo.email || !quoteId) {
    return res.status(400).json({ error: 'Missing required information' });
  }

  try {
    // Verify that the quote exists and belongs to this user
    const quoteDoc = await adminDb.collection('quotes').doc(quoteId).get();
    
    if (!quoteDoc.exists) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    const quoteData = quoteDoc.data();
    
    if (quoteData.email !== userInfo.email) {
      return res.status(403).json({ error: 'Not authorized to submit this quote' });
    }
    
    // Get contractor information from environment variables or database
    const contractorEmail = process.env.CONTRACTOR_EMAIL || 'contractor@example.com';
    const contractorName = process.env.CONTRACTOR_NAME || 'Contractor';
    
    // Generate email content for user
    const userEmailHtml = `
      <h1>Your Quote Request Has Been Submitted</h1>
      <p>Hi ${userInfo.name || 'there'},</p>
      <p>Your quote request has been submitted successfully. Here's a summary:</p>
      <p><strong>Quote ID:</strong> ${quoteId}</p>
      <p><strong>Description:</strong> ${userInfo.summary}</p>
      <p><strong>Submitted:</strong> ${new Date(userInfo.timestamp).toLocaleString()}</p>
      ${imageURLs.length > 0 ? '<p><strong>Images:</strong> Included</p>' : ''}
      <p>A contractor will review your request and contact you soon.</p>
      <p>Thank you for using our service!</p>
    `;
    
    // Generate email content for contractor
    const contractorEmailHtml = `
      <h1>New Quote Request</h1>
      <p>A new quote request has been submitted:</p>
      <p><strong>Customer:</strong> ${userInfo.name || 'Not provided'}</p>
      <p><strong>Email:</strong> ${userInfo.email}</p>
      <p><strong>Quote ID:</strong> ${quoteId}</p>
      <p><strong>Description:</strong> ${userInfo.summary}</p>
      <p><strong>Submitted:</strong> ${new Date(userInfo.timestamp).toLocaleString()}</p>
      ${imageURLs.length > 0 ? `
        <p><strong>Images:</strong></p>
        <div>
          ${imageURLs.map(url => `<img src="${url}" style="max-width: 300px; margin: 10px;" />`).join('')}
        </div>
      ` : '<p>No images provided</p>'}
      <p>Please log into the dashboard to view the complete quote details.</p>
    `;
    
    // Send email to user
    await resend.emails.send({
      from: 'quotes@yourdomain.com',
      to: userInfo.email,
      subject: 'Your Quote Request Confirmation',
      html: userEmailHtml
    });
    
    // Send email to contractor
    await resend.emails.send({
      from: 'quotes@yourdomain.com',
      to: contractorEmail,
      subject: `New Quote Request from ${userInfo.name || userInfo.email}`,
      html: contractorEmailHtml
    });
    
    // Update quote status in Firestore
    await adminDb.collection('quotes').doc(quoteId).update({
      status: 'Submitted',
      submittedAt: new Date()
    });
    
    // Return success
    return res.status(200).json({ 
      success: true, 
      message: 'Quote submitted successfully' 
    });
  } catch (error) {
    console.error('Error submitting quote:', error);
    return res.status(500).json({ 
      error: 'Failed to submit quote',
      message: error.message 
    });
  }
}
