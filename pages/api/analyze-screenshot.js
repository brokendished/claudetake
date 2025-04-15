// pages/api/analyze-screenshot.js

import { google } from 'googleapis';

const askedLabels = new Set();
const askedWebEntities = new Set();

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

const IGNORED_LABELS = ["Person", "Face", "Human", "Nose", "Head", "Smile", "Arm", "Hair", "Eyebrow", "Animal", "Mammal", "Dog", "Cat"];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { image } = req.body;

  if (!image || !image.startsWith('data:image')) {
    console.error('❌ No valid image received:', image?.slice(0, 100));
    return res.status(400).json({ error: 'Invalid image' });
  }

  try {
    const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT, 'base64').toString();
    const serviceAccount = JSON.parse(decoded);

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const vision = google.vision({ version: 'v1', auth });

    const response = await vision.images.annotate({
      requestBody: {
        requests: [
          {
            image: {
              content: image.replace(/^data:image\/\w+;base64,/, ''),
            },
            features: [
              { type: 'LABEL_DETECTION' },
              { type: 'WEB_DETECTION' },
              { type: 'LOGO_DETECTION' },
            ],
          },
        ],
      },
    });

    const data = response?.data?.responses?.[0] || {};
    const text = data?.fullTextAnnotation?.text?.trim();
    const labels = data?.labelAnnotations?.map((l) => l.description) || [];
    const webEntities = data?.webDetection?.webEntities?.map((e) => e.description).filter(Boolean) || [];
    const logos = data?.logoAnnotations?.map((l) => l.description) || [];

    let summary = 'No insight found.';

    if (text && text.length < 200) {
      summary = `I noticed some text: "${text.split('\n')[0]}" — does that help clarify the issue?`;
    } else {
      const freshLabel = labels.find((l) => !askedLabels.has(l) && !IGNORED_LABELS.includes(l));
      if (freshLabel) {
        askedLabels.add(freshLabel);
        if (LABEL_MAP[freshLabel]) {
          summary = LABEL_MAP[freshLabel];
        } else {
          summary = `Looks like it could be a "${freshLabel}" — want to tell me more about that?`;
        }
      } else {
        const freshLogo = logos.find((l) => !askedLabels.has(l));
        if (freshLogo) {
          askedLabels.add(freshLogo);
          summary = `Looks like a "${freshLogo}" — is that the product having trouble?`;
        } else {
          const freshWeb = webEntities.find((e) => !askedWebEntities.has(e));
          if (freshWeb) {
            askedWebEntities.add(freshWeb);
            summary = `Could this be related to "${freshWeb}"? What's going on with it?`;
          }
        }
      }
    }

    return res.status(200).json({ summary });
  } catch (error) {
    console.error('🔥 Vision API error:', error.message, error);
    return res.status(500).json({ error: 'Vision API failed' });
  }
}
