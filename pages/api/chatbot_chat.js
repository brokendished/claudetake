// ✅ pages/api/chatbot_chat.js
import OpenAI from 'openai';
import analyzeImage from '../../libs/server/analyzeScreenshot';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const {
      messages = [],
      name = '',
      email = '',
      phone = '',
      category = '',
      image = '',
    } = req.body;

    const cleanedMessages = messages.filter((msg) => msg.role && msg.content);

    const systemPrompt = `
You are a helpful virtual assistant working on behalf of a local contractor and this is their customer or potential customer. Your job is to gather enough information so a professional can provide a quote.

Do not mention AI, OpenAI, Google, or any backend tools. Never suggest third-party services or external websites.

Keep things simple and clear for the user. Don’t ask too many questions at once. Focus on understanding the problem, collecting photos or video if needed, and confirming the user's contact info.

Don’t try to fix the issue or guess the price. Never speculate. Just thank the user, summarize the issue, and let them know their contractor will follow up.  

If a product is relevant and you're told to recommend one, only reference the contractor’s preferred source — never an outside vendor.

Your tone should be efficient, polite, and professional — like you’re part of the contractor’s team.
`;

    // 🧠 Pull Google Vision context if image provided
    let visionSummary = '';
    if (image) {
      visionSummary = await analyzeImage(image);
    }

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...(visionSummary
        ? [
            {
              role: 'system',
              content: `Google Vision analysis of uploaded image:\n${visionSummary}`,
            },
          ]
        : []),
      ...cleanedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const reply = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: fullMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const replyText = reply.choices?.[0]?.message?.content?.trim() || 'Something went wrong.';

    // 📝 Optional: Log to Google Sheets or elsewhere
    try {
      await fetch(process.env.SHEET_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Timestamp: new Date().toISOString(),
          Name: name,
          Email: email,
          Phone: phone,
          Category: category,
          Image: image,
          Issue: cleanedMessages.find((m) => m.role === 'user')?.content || '',
          'AI Reply': replyText,
          'Image Tags': visionSummary,
        }),
      });
    } catch (err) {
      console.error('Sheet logging failed:', err);
    }

    res.status(200).json({ reply: replyText });
  } catch (err) {
    console.error('Chatbot API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
