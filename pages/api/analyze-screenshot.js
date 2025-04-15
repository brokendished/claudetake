// pages/api/analyze-screenshot.js

import { ImageAnnotatorClient } from '@google-cloud/vision';

// Use singleton pattern for Vision client
let visionClient = null;

// Cache mechanism to avoid repeated analysis of the same labels
const analysisCache = {
  askedLabels: new Set(),
  askedWebEntities: new Set(),
  clearCache: () => {
    analysisCache.askedLabels.clear();
    analysisCache.askedWebEntities.clear();
  }
};

// Reset cache every 24 hours
setInterval(() => {
  analysisCache.clearCache();
}, 24 * 60 * 60 * 1000);

// Predefined responses for common household items
const LABEL_MAP = {
  Refrigerator: "That looks like a refrigerator. Is it leaking, too cold, or not cooling? Or inviting me over to eat?",
  Oven: "Looks like an oven. Is it not heating or showing an error?",
  Sink: "I see a sink. Are we dealing with a clog or leak?",
  Bookcase: "That looks like a bookcase. Is it damaged or unstable?",
  Lawn: "Ah the great outdoors. Are you needing mowing, landscaping, or drainage help?",
  Fence: "I see a fence — are you thinking repair, painting, or replacement?",
  Patio: "That looks like a patio area. Powerwashing, sealing, or something else?",
  Deck: "Could be a deck. Loose boards or maybe staining?",
  Door: "I noticed a door. Is it misaligned, creaking, or not closing properly?",
  Window: "This could be a window. Broken glass, drafts, or trouble opening it?",
  Shower: "That appears to be a shower. Is it leaking, not draining, or moldy?",
  Toilet: "Spotted a toilet. Is it running, clogged, or leaking?",
  Light: "Looks like a light fixture. Need help with wiring or a replacement?",
};

// Labels to ignore (privacy-related)
const IGNORED_LABELS = [
  "Person", "Face", "Human", "Nose", "Head", "Smile", "Arm", "Hair", 
  "Eyebrow", "Animal", "Mammal", "Dog", "Cat", "Finger", "Hand", 
  "Eye", "Ear", "Mouth", "Chin", "Cheek", "Neck", "Skin"
];

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract image data
  const { image } = req.body;

  // Validate image data
  if (!image || typeof image !== 'string' || !image.startsWith('data:image')) {
    console.error('❌ No valid image received:', 
      image ? `${image.slice(0, 30)}... (${typeof image})` : 'undefined');
    return res.status(400).json({ error: 'Invalid image format' });
  }

  try {
    // Initialize Google Vision client if not already done
    if (!visionClient) {
      try {
        // Try encoded service account first
        if (process.env.GOOGLE_SERVICE_ACCOUNT) {
          const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT, 'base64').toString();
          const serviceAccount = JSON.parse(decoded);
          visionClient = new ImageAnnotatorClient({ credentials: serviceAccount });
        } 
        // Fall back to credentials file
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          visionClient = new ImageAnnotatorClient({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
          });
        } 
        else {
          throw new Error('No Google credentials available');
        }
      } catch (initError) {
        console.error('Failed to initialize Vision client:', initError);
        return res.status(500).json({ 
          error: 'Vision API configuration error',
          message: 'Service is improperly configured'
        });
      }
    }

    // Extract base64 image content
    const imageContent = image.replace(/^data:image\/\w+;base64,/, '');

    // Make request to Google Vision API
    const [result] = await visionClient.annotateImage({
      image: { content: imageContent },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 15 },
        { type: 'WEB_DETECTION', maxResults: 5 },
        { type: 'LOGO_DETECTION', maxResults: 3 },
        { type: 'TEXT_DETECTION' }
      ],
    });

    // Extract results
    const data = result || {};
    const text = data.fullTextAnnotation?.text?.trim();
    const labels = data.labelAnnotations?.map(l => l.description) || [];
    const webEntities = data.webDetection?.webEntities
      ?.filter(e => e.score > 0.5) // Filter by confidence score
      ?.map(e => e.description)
      ?.filter(Boolean) || [];
    const logos = data.logoAnnotations?.map(l => l.description) || [];

    // Generate a summary response
    let summary = 'No insight found.';

    // First check for text in the image
    if (text && text.length < 200) {
      const firstLine = text.split('\n')[0];
      summary = `I noticed some text: "${firstLine}" — does that help clarify the issue?`;
    } 
    // Then check for labels
    else {
      // Filter out ignored labels (privacy-related)
      const safeLabels = labels.filter(label => 
        !IGNORED_LABELS.some(ignored => 
          label.toLowerCase().includes(ignored.toLowerCase())
        )
      );

      // Find a label we haven't asked about yet
      const freshLabel = safeLabels.find(l => !analysisCache.askedLabels.has(l));
      
      if (freshLabel) {
        // Mark this label as used
        analysisCache.askedLabels.add(freshLabel);
        
        // Check if we have a predefined response
        if (LABEL_MAP[freshLabel]) {
          summary = LABEL_MAP[freshLabel];
        } else {
          summary = `Looks like it could be a "${freshLabel}" — want to tell me more about that?`;
        }
      } 
      // Check for logos if no fresh labels
      else {
        const freshLogo = logos.find(l => !analysisCache.askedLabels.has(l));
        
        if (freshLogo) {
          analysisCache.askedLabels.add(freshLogo);
          summary = `Looks like a "${freshLogo}" — is that the product having trouble?`;
        } 
        // Finally check web entities
        else {
          const freshWeb = webEntities.find(e => !analysisCache.askedWebEntities.has(e));
          
          if (freshWeb) {
            analysisCache.askedWebEntities.add(freshWeb);
            summary = `Could this be related to "${freshWeb}"? What's going on with it?`;
          }
        }
      }
    }

    // Return the analysis summary
    return res.status(200).json({ summary });
  } catch (error) {
    console.error('🔥 Vision API error:', error.message, error);
    
    // Provide appropriate error response
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        error: 'Vision API unavailable',
        message: 'The image analysis service is temporarily unavailable'
      });
    } else if (error.code === 16) { // Google API permission error
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'The service lacks permission to access Vision API'
      });
    } else {
      return res.status(500).json({ 
        error: 'Vision API failed',
        message: 'Failed to analyze the image'
      });
    }
  }
}
