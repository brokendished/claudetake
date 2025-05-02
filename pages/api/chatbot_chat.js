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
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, contractorId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const db = getDb();

    // Get contractor data if available
    let contractorContext = '';
    if (contractorId) {
      const contractorDoc = await db.collection('contractors').doc(contractorId).get();
      if (contractorDoc.exists) {
        const data = contractorDoc.data();
        contractorContext = `You are a chatbot for ${data.businessName}. You specialize in ${data.industry || 'their industry'}. `;
      }
    }

    // Get chatbot response with contractor context
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: `${contractorContext}Provide helpful, concise responses focused on contractor services and quote requests.`
        },
        { role: "user", content: message }
      ],
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not process that.';

    // Store the conversation only if we have a contractorId
    if (contractorId) {
      await db.collection('chatMessages').add({
        contractorId,
        message,
        reply,
        timestamp: new Date()
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}
