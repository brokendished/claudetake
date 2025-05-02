// pages/api/chatbot_chat.js
import OpenAI from 'openai';
import analyzeImage from '../../libs/server/analyzeScreenshot';
import { getFirestore, initAdmin } from '../../../libs/firebaseAdmin'; // Correct the import path

initAdmin(); // Ensure Firebase Admin is initialized
const db = getFirestore(); // Ensure Firestore is initialized correctly

// Create OpenAI client instance
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

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
      return res.status(405).json({ error: 'Method not allowed' }); // Ensure JSON response
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' }); // Ensure JSON response
    }

    const db = getFirestore();
    const chatbotResponse = `You said: ${message}`; // Example chatbot logic

    // Save the message to Firestore (if needed)
    await db.collection('chatbotMessages').add({
      message,
      response: chatbotResponse,
      timestamp: new Date(),
    });

    return res.status(200).json({ reply: chatbotResponse });
  } catch (error) {
    console.error('Error in /api/chatbot_chat:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
