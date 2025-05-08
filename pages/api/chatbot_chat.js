// pages/api/chatbot_chat.js
import { getDb } from '../../libs/firebaseAdmin';
import OpenAI from 'openai';
import analyzeImage from '../../libs/server/analyzeScreenshot';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '../../libs/firebaseAdmin';

initAdmin(); // Ensure Firebase Admin is initialized
const db = getFirestore(); // Ensure Firestore is initialized correctly

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Rate limiting state
 * Simple in-memory rate limiting (would use Redis in production)
 */
const rateLimits = {
  requests: {},
  resetTime: Date.now() + 60000, // Reset every minute
};

// Reset rate limits periodically
setInterval(() => {
  rateLimits.requests = {};
  rateLimits.resetTime = Date.now() + 60000;
}, 60000);

// Check rate limit for an IP
function checkRateLimit(ip) {
  // Reset if needed
  if (Date.now() > rateLimits.resetTime) {
    rateLimits.requests = {};
    rateLimits.resetTime = Date.now() + 60000;
  }

  // Initialize counter
  if (!rateLimits.requests[ip]) {
    rateLimits.requests[ip] = 0;
  }

  // Increment and check
  rateLimits.requests[ip]++;
  return rateLimits.requests[ip] <= 10; // Allow 10 requests per minute
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, image, sessionId, contractorId } = req.body;

    // Get contractor context if available
    let contractorContext = '';
    if (contractorId) {
      const contractorDoc = await db.collection('contractors').doc(contractorId).get();
      if (contractorDoc.exists) {
        const data = contractorDoc.data();
        contractorContext = `You are representing ${data.businessName}. Industry: ${data.industry}. `;
      }
    }

    // Process image if provided
    let imageAnalysis = '';
    if (image) {
      const vision = require('@google-cloud/vision');
      const client = new vision.ImageAnnotatorClient();
      const [result] = await client.textDetection(Buffer.from(image.split(',')[1], 'base64'));
      imageAnalysis = result.fullTextAnnotation?.text || '';
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${contractorContext}You are a professional, helpful assistant focused on gathering information for quotes and estimates.`
        },
        { 
          role: "user", 
          content: `${message}${imageAnalysis ? `\nImage Analysis: ${imageAnalysis}` : ''}`
        }
      ],
    });

    const reply = completion.choices[0]?.message?.content;

    // Save to Firestore if we have a session
    if (sessionId) {
      await db.collection('chat_sessions').doc(sessionId).collection('messages').add({
        message,
        reply,
        timestamp: new Date(),
        image: image || null,
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({ error: error.message });
  }
}
