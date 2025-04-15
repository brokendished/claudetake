import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize the Google Vision client
const client = new ImageAnnotatorClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { name, email, phone, issue, image, messages = [] } = req.body;
  const contact = email || phone;

  if (!name || !contact || messages.length === 0) {
    return res.status(400).json({ error: 'Missing name, contact info, or messages' });
  }

  let aiResponse = 'Sorry, I couldn’t generate a helpful response.';

  // Handle Google Vision Image Processing
  let imageAnalysis = '';
  if (image) {
    try {
      // Base64 decode the image (you might need to adjust depending on how image data is sent)
      const imageBuffer = Buffer.from(image.split(',')[1], 'base64');

      // Send the image to Google Vision API for analysis
      const [result] = await client.textDetection(imageBuffer);
      const detections = result.textAnnotations;

      if (detections.length > 0) {
        imageAnalysis = `Image contains: ${detections[0].description}`;
      } else {
        imageAnalysis = 'No text found in the image.';
      }
    } catch (err) {
      console.error('Google Vision error:', err.message);
      imageAnalysis = 'Error processing the image.';
    }
  }

  // OpenAI API call for generating responses based on user messages
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful, friendly AI that assists with diagnosing home repair issues and providing ballpark quotes. Respond like a human and be brief but useful.'
          },
          ...messages.map(msg => ({
            role: msg.from === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          // Optionally append image analysis here
          {
            role: 'assistant',
            content: imageAnalysis
          }
        ],
        temperature: 0.7
      })
    });

    const data = await openaiRes.json();
    aiResponse = data.choices?.[0]?.message?.content || aiResponse;
  } catch (err) {
    console.error('OpenAI error:', err.message);
  }

  // Google Sheets Logging only
  try {
    if (process.env.SHEET_WEBHOOK_URL) {
      await fetch(process.env.SHEET_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          issue,
          image,
          aiResponse,
          messages
        })
      });
    }
  } catch (err) {
    console.error('Google Sheets log error:', err.message);
  }

  res.status(200).json({ success: true, reply: aiResponse });
}
