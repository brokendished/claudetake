// pages/api/chatbot_chat.js
import OpenAI from 'openai';
import analyzeImage from '../../libs/server/analyzeScreenshot';

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
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP for rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  // Apply rate limiting
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ 
      error: 'Too many requests',
      message: 'Please wait a moment before sending more messages' 
    });
  }

  try {
    const {
      messages = [],
      name = '',
      email = '',
      phone = '',
      category = '',
      image = '',
      sessionId = '',
    } = req.body;

    // Validate required inputs
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    // Normalize message format and clean data
    const cleanedMessages = messages
      .filter(msg => {
        // Ensure messages have required fields
        return (msg.role || msg.from) && (msg.content || msg.text);
      })
      .map(msg => {
        // Standardize message format
        return {
          role: msg.role || (msg.from === 'user' ? 'user' : 'assistant'),
          content: msg.content || msg.text
        };
      });

    if (cleanedMessages.length === 0) {
      return res.status(400).json({ error: 'No valid messages found' });
    }

    // System prompt for the assistant
    const systemPrompt = `
You are a helpful virtual assistant working on behalf of a local contractor and this is their customer or potential customer. Your job is to gather enough information so a professional can provide a quote.

Do not mention AI, OpenAI, Google, or any backend tools. Never suggest third-party services or external websites.

Keep things simple and clear for the user. Don't ask too many questions at once. Focus on understanding the problem, collecting photos or video if needed, and confirming the user's contact info.

Don't try to fix the issue or guess the price. Never speculate. Just thank the user, summarize the issue, and let them know their contractor will follow up.  

If a product is relevant and you're told to recommend one, only reference the contractor's preferred source — never an outside vendor.

Your tone should be efficient, polite, and professional — like you're part of the contractor's team.
`;

    // Process image if provided
    let visionSummary = '';
    if (image) {
      try {
        visionSummary = await analyzeImage(image);
      } catch (imageError) {
        console.error('Image analysis error:', imageError);
        visionSummary = 'I had trouble analyzing that image. Can you describe what you see?';
      }
    }

    // Build the full message list
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...(visionSummary
        ? [
            {
              role: 'system',
              content: `Image analysis:\n${visionSummary}`,
            },
          ]
        : []),
      ...cleanedMessages,
    ];

    // Get OpenAI client
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error('OpenAI client not available');
    }

    // Call OpenAI API with exponential backoff retry
    const maxRetries = 2;
    let attempt = 0;
    let reply = null;

    while (attempt <= maxRetries && !reply) {
      try {
        reply = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: fullMessages,
          max_tokens: 500,
          temperature: 0.7,
        });
      } catch (apiError) {
        attempt++;
        
        if (apiError.status === 429) {
          // Rate limit - wait longer between retries
          console.warn('OpenAI rate limit hit, retrying...');
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        } else if (attempt >= maxRetries) {
          // Out of retries - throw error
          throw apiError;
        } else {
          // Other error - retry with backoff
          console.warn(`OpenAI API error (attempt ${attempt}):`, apiError);
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
      }
    }

    if (!reply) {
      throw new Error('Failed to get response from OpenAI API after retries');
    }

    const replyText = reply.choices?.[0]?.message?.content?.trim() || 'I apologize, but I\'m having trouble responding right now.';

    // Log to Google Sheets if webhook URL is provided
    if (process.env.SHEET_WEBHOOK_URL) {
      try {
        await fetch(process.env.SHEET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Timestamp: new Date().toISOString(),
            SessionId: sessionId,
            Name: name,
            Email: email,
            Phone: phone,
            Category: category,
            HasImage: !!image,
            Issue: cleanedMessages.find((m) => m.role === 'user')?.content || '',
            'AI Reply': replyText,
            'Image Analysis': visionSummary,
          }),
        });
      } catch (loggingError) {
        // Non-critical error, just log it
        console.error('Sheet logging failed:', loggingError);
      }
    }

    // Return successful response
    return res.status(200).json({ reply: replyText });
  } catch (err) {
    console.error('Chatbot API error:', err);
    
    // Return appropriate error based on the type
    if (err.name === 'AbortError' || err.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Request timed out',
        message: 'The server took too long to respond. Please try again.' 
      });
    } else if (err.status === 429 || err.message?.includes('rate limit')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'The service is currently busy. Please try again in a moment.' 
      });
    } else if (err.status === 400 || err.status === 401) {
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'There was a problem with the service configuration. Please contact support.' 
      });
    } else {
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'Something went wrong. Please try again later.' 
      });
    }
  }
}
