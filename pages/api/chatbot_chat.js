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
      return res.status(405).json({ error: 'Method not allowed' }); // Ensure JSON response
    }

    const { sessionId, messages, name, email, image } = req.body;

    if (!sessionId || !messages) {
      return res.status(400).json({ error: 'Missing required fields' }); // Ensure JSON response
    }

    // Rate limiting
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    // Process chatbot logic here (e.g., call OpenAI API, save to Firestore, etc.)
    const openai = getOpenAIClient();
    let reply = `This is a placeholder response for session ${sessionId}.`;

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            ...messages,
          ],
        });
        reply = completion.choices[0].message.content;
      } catch (err) {
        console.error('Error calling OpenAI API:', err);
        reply = 'Sorry, I encountered an issue while processing your request.';
      }
    }

    // Save the conversation to Firestore
    const sessionRef = db.collection('chat_sessions').doc(sessionId);
    await sessionRef.set(
      {
        messages,
        name,
        email,
        lastUpdated: new Date(),
      },
      { merge: true }
    );

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error in chatbot_chat API:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message }); // Ensure JSON response
  }
}
