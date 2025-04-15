// libs/speech.js

export function speak(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);

  // Pick a smoother voice
  const preferredVoice = speechSynthesis.getVoices().find(
    (v) => v.name.includes('Google UK English Female') || v.name.includes('en-US-Wavenet-F')
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.rate = 1;
  utterance.pitch = 1;
  speechSynthesis.cancel(); // cancel any ongoing speech
  speechSynthesis.speak(utterance);
}
