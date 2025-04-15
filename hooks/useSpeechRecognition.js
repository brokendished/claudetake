// hooks/useSpeechRecognition.js

import { useEffect, useRef, useState } from 'react';

export default function useSpeechRecognition({ onResult, enabled }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) return;

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (e) => console.error('🎤 Speech recognition error:', e);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim();
      if (transcript && onResult) onResult(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => recognition.stop();
  }, [enabled]);

  return { listening };
}
