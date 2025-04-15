import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export default async function analyzeImage(imageUrl) {
  try {
    const [result] = await client.annotateImage({
      image: { source: { imageUri: imageUrl } },
      features: [
        { type: 'LABEL_DETECTION' },
        { type: 'LOGO_DETECTION' },
        { type: 'WEB_DETECTION' },
      ],
    });

    const blocklist = [
      'face', 'head', 'dog', 'cat', 'chin', 'beard', 'hair', 'ceiling', 'person', 'animal', 'smile', 'skin', 'mammal',
      'human body', 'gesture', 'nose', 'ear', 'eye', 'mouth', 'hand', 'finger',
    ];

    const labels = result.labelAnnotations?.map((l) => l.description).filter(Boolean) || [];
    const logos = result.logoAnnotations?.map((l) => l.description).filter(Boolean) || [];
    const webDesc = result.webDetection?.webEntities
      ?.map((w) => w.description)
      .filter(Boolean)
      .slice(0, 3) || [];

    const safeLabels = labels.filter(label =>
      !blocklist.some(block => label.toLowerCase().includes(block))
    );

    return {
      labels: safeLabels.slice(0, 5),
      logos: logos.slice(0, 3),
      web: webDesc,
    };
  } catch (err) {
    console.error('Google Vision error:', err);
    return null;
  }
}
