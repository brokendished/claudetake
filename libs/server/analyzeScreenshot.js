
// libs/server/analyzeScreenshot.js
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Singleton pattern for Vision client
let visionClient = null;

/**
 * Get or create the Vision client instance
 * @returns {ImageAnnotatorClient} Google Vision client
 */
function getVisionClient() {
  if (!visionClient) {
    try {
      // Try using the credentials file first
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        visionClient = new ImageAnnotatorClient({
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        });
      } 
      // Fall back to the encoded service account
      else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT, 'base64').toString();
        const credentials = JSON.parse(decoded);
        visionClient = new ImageAnnotatorClient({ credentials });
      } 
      else {
        throw new Error('No Google credentials available');
      }
    } catch (error) {
      console.error('Failed to initialize Vision client:', error);
      throw error;
    }
  }
  return visionClient;
}

// List of personal attributes to filter out from results
const BLOCKLIST = [
  'face', 'head', 'dog', 'cat', 'chin', 'beard', 'hair', 'ceiling', 'person', 'animal', 
  'smile', 'skin', 'mammal', 'human body', 'gesture', 'nose', 'ear', 'eye', 'mouth', 
  'hand', 'finger',
];

/**
 * Analyze an image using Google Vision API
 * @param {string} imageData - Image data URL or public image URL
 * @returns {Promise<string>} Analysis summary
 */
export default async function analyzeImage(imageData) {
  if (!imageData) return 'No image provided';
  
  try {
    const client = getVisionClient();
    let request;
    
    // Handle different image sources
    if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
      // Base64 data URL
      request = {
        image: {
          content: imageData.replace(/^data:image\/\w+;base64,/, ''),
        },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'WEB_DETECTION', maxResults: 5 },
          { type: 'LOGO_DETECTION', maxResults: 5 },
          { type: 'TEXT_DETECTION' },
        ],
      };
    } else if (typeof imageData === 'string' && imageData.startsWith('http')) {
      // Public URL
      request = {
        image: {
          source: { imageUri: imageData },
        },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'WEB_DETECTION', maxResults: 5 },
          { type: 'LOGO_DETECTION', maxResults: 5 },
          { type: 'TEXT_DETECTION' },
        ],
      };
    } else {
      throw new Error('Invalid image format');
    }

    // Make the API request
    const [result] = await client.annotateImage(request);
    
    // Process the results
    let summary = '';

    // Check for text in the image
    const fullText = result.fullTextAnnotation?.text?.trim();
    if (fullText && fullText.length < 200) {
      const firstLine = fullText.split('\n')[0];
      summary = `I noticed some text: "${firstLine}" — does that help clarify the issue?`;
      return summary;
    }

    // Filter labels to remove personal attributes
    const safeLabels = (result.labelAnnotations || [])
      .map(label => label.description)
      .filter(label => !BLOCKLIST.some(block => 
        label.toLowerCase().includes(block.toLowerCase())
      ));

    // Get logos
    const logos = (result.logoAnnotations || [])
      .map(logo => logo.description);

    // Get web entities
    const webEntities = (result.webDetection?.webEntities || [])
      .map(entity => entity.description)
      .filter(Boolean)
      .slice(0, 3);

    // Predefined responses for common household items
    const LABEL_MAP = {
      'Refrigerator': "That looks like a refrigerator. Is it leaking, too cold, or not cooling?",
      'Oven': "Looks like an oven. Is it not heating or showing an error?",
      'Sink': "I see a sink. Are we dealing with a clog or leak?",
      'Bookcase': "That looks like a bookcase. Is it damaged or unstable?",
      'Lawn': "Ah the great outdoors. Are you needing mowing, landscaping, or drainage help?",
      'Fence': "I see a fence — are you thinking repair, painting, or replacement?",
      'Patio': "That looks like a patio area. Powerwashing, sealing, or something else?",
      'Deck': "Could be a deck. Loose boards or maybe staining?",
      'Door': "I noticed a door. Is it misaligned, creaking, or not closing properly?",
      'Window': "This could be a window. Broken glass, drafts, or trouble opening it?",
      'Shower': "That appears to be a shower. Is it leaking, not draining, or moldy?",
      'Toilet': "Spotted a toilet. Is it running, clogged, or leaking?",
      'Light': "Looks like a light fixture. Need help with wiring or a replacement?",
    };

    // Generate a summary based on available data
    if (safeLabels.length > 0) {
      const matchedLabel = safeLabels.find(label => LABEL_MAP[label]);
      if (matchedLabel) {
        summary = LABEL_MAP[matchedLabel];
      } else {
        summary = `Looks like it could be a "${safeLabels[0]}" — want to tell me more about that?`;
      }
    } else if (logos.length > 0) {
      summary = `Looks like a "${logos[0]}" — is that the product having trouble?`;
    } else if (webEntities.length > 0) {
      summary = `Could this be related to "${webEntities[0]}"? What's going on with it?`;
    } else {
      summary = "I'm not quite sure what I'm seeing. Can you describe the issue you're having?";
    }

    return summary;
  } catch (error) {
    console.error('Google Vision API error:', error);
    return "I couldn't analyze that image. Let's try a different approach - can you describe what you're seeing?";
  }
}
