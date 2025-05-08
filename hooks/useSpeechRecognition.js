// hooks/useSpeechRecognition.js

import { useState, useEffect, useCallback } from 'react';

export default function useSpeechRecognition({ enabled, onResult }) {
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          onResult(transcript);
        };
        setRecognition(recognition);
      }
    }
  }, [onResult]);

  useEffect(() => {
    if (recognition && enabled && !listening) {
      recognition.start();
      setListening(true);
    } else if (recognition && !enabled && listening) {
      recognition.stop();
      setListening(false);
    }
  }, [enabled, listening, recognition]);

  return { listening };
}
