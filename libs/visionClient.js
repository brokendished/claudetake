// libs/visionClient.js

export default async function analyzeImage(dataURL) {
  const res = await fetch('/api/analyze-screenshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataURL }),
  });

  const data = await res.json();
  return data.summary || 'No insight found.';
}
