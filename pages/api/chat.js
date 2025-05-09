export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Only POST requests are allowed'
      });
    }

    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message must be a non-empty string'
      });
    }

    // Example response logic
    const reply = `You said: ${message}`;
    return res.status(200).json({ success: true, reply });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
}
