// hooks/useSpeechRecognition.js

import { useEffect, useRef, useState, useCallback } from 'react';

export default function useSpeechRecognition({ onResult, enabled }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);

  // Check for browser support
  useEffect(() => {
    const checkSupport = () => {
      if (typeof window !== 'undefined') {
        // Check for various implementations of the Speech Recognition API
        const SpeechRecognition = window.SpeechRecognition || 
                                  window.webkitSpeechRecognition || 
                                  window.mozSpeechRecognition || 
                                  window.msSpeechRecognition;
        
        setIsSupported(!!SpeechRecognition);
        return !!SpeechRecognition;
      }
      return false;
    };
    
    checkSupport();
  }, []);

  // Start/stop recognition based on enabled prop
  useEffect(() => {
    if (!isSupported || !enabled) {
      // Clean up if disabled
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setListening(false);
      }
      return;
    }

    try {
      // Use the appropriate constructor
      const SpeechRecognition = window.SpeechRecognition || 
                                window.webkitSpeechRecognition || 
                                window.mozSpeechRecognition || 
                                window.msSpeechRecognition;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setListening(true);
        setError(null);
      };
      
      recognition.onend = () => {
        setListening(false);
        // Attempt to restart if still enabled
        if (enabled && recognitionRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error('Failed to restart speech recognition:', e);
          }
        }
      };
      
      recognition.onerror = (e) => {
        console.error('🎤 Speech recognition error:', e);
        setError(e.error);
        setListening(false);
      };
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join(' ')
          .trim();
        if (transcript && onResult) onResult(transcript);
      };

      recognitionRef.current = recognition;
      
      // Start recognition
      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
        setError('start_error');
      }

      // Cleanup function
      return () => {
        try {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      };
    } catch (e) {
      console.error('Speech recognition setup error:', e);
      setError('setup_error');
      return () => {};
    }
  }, [enabled, isSupported, onResult]);

  return { 
    listening, 
    isSupported, 
    error 
  };
}
