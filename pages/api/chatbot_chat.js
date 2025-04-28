// pages/api/chatbot_chat.js
import OpenAI from 'openai';
import analyzeImage from '../../libs/server/analyzeScreenshot';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '../../libs/firebaseAdmin';

initAdmin();
const db = getFirestore();

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
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, messages, name, email, image } = req.body;

    if (!sessionId || !messages) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process chatbot logic here (e.g., call OpenAI API, save to Firestore, etc.)
    const reply = `This is a placeholder response for session ${sessionId}.`;

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error in chatbot_chat API:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
