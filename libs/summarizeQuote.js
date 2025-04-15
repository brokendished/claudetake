// lib/summarizeQuote.js
export default async function summarizeQuote(messages) {
  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();
    return data.summary || 'No summary available.';
  } catch (error) {
    console.error('Error summarizing quote:', error);
    return 'Summary failed.';
  }
}
