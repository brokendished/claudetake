// pages/api/summarize.js
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid or missing messages array' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Summarize the user’s issue and what was learned from image/voice analysis in a short paragraph.',
        },
        {
          role: 'user',
          content: messages.map((m) => `${m.role}: ${m.content}`).join('\n'),
        },
      ],
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary.';
    res.status(200).json({ summary });
  } catch (err) {
    console.error('Summarize API Error:', err);
    res.status(500).json({ error: 'Failed to summarize quote' });
  }
}
