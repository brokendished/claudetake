export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      timestamp,
      name,
      email,
      phone,
      image,
      issue,
      transcript,
      aiReply,
    } = req.body;

    const webhookUrl = process.env.SHEET_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('Missing SHEET_WEBHOOK_URL in environment variables');
      return res.status(500).json({ error: 'Missing webhook URL' });
    }

    const payload = {
      Timestamp: timestamp || new Date().toISOString(),
      Name: name || '',
      Email: email || '',
      Phone: phone || '',
      Image: image || '',
      Issue: issue || '',
      'Chat Transcript': transcript || '',
      'AI Reply': aiReply || '',
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Log to sheet error:', err);
    res.status(500).json({ error: 'Failed to log to Google Sheets' });
  }
}
