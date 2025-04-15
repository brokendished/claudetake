// libs/speech.js

/**
 * Text-to-speech function with fallbacks and error handling
 * @param {string} text - The text to speak
 * @param {Object} options - Optional parameters
 * @param {number} options.rate - Speech rate (0.1 to 10)
 * @param {number} options.pitch - Speech pitch (0 to 2)
 * @param {Function} options.onStart - Callback when speech starts
 * @param {Function} options.onEnd - Callback when speech ends
 * @param {Function} options.onError - Callback when speech fails
 * @returns {boolean} Whether speech synthesis was initiated
 */
export function speak(text, options = {}) {
  // Check if speech synthesis is available
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (options.onError) {
      options.onError(new Error('Speech synthesis not supported'));
    }
    return false;
  }

  // Default options
  const settings = {
    rate: options.rate || 1,
    pitch: options.pitch || 1,
    onStart: options.onStart || null,
    onEnd: options.onEnd || null,
    onError: options.onError || null
  };

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices (handle async loading of voices in some browsers)
    let voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Some browsers load voices asynchronously
      speechSynthesis.onvoiceschanged = () => {
        voices = speechSynthesis.getVoices();
        setVoice(utterance, voices);
      };
    } else {
      setVoice(utterance, voices);
    }

    // Configure utterance
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    
    // Set up event handlers
    if (settings.onStart) utterance.onstart = settings.onStart;
    if (settings.onEnd) utterance.onend = settings.onEnd;
    if (settings.onError) utterance.onerror = settings.onError;

    // Cancel any ongoing speech and start new speech
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    
    return true;
  } catch (err) {
    console.error('Speech synthesis error:', err);
    if (settings.onError) {
      settings.onError(err);
    }
    return false;
  }
}

/**
 * Helper function to select the best available voice
 * @param {SpeechSynthesisUtterance} utterance - The utterance to set voice for
 * @param {Array} voices - Available voices
 */
function setVoice(utterance, voices) {
  // Preferred voices in order of preference
  const preferredVoices = [
    'Google UK English Female',
    'en-US-Wavenet-F',
    'Microsoft Zira Desktop',
    'en-GB',
    'en-US'
  ];
  
  // Try to find one of our preferred voices
  for (const preferred of preferredVoices) {
    const voice = voices.find(v => 
      v.name.includes(preferred) || 
      v.lang.includes(preferred)
    );
    
    if (voice) {
      utterance.voice = voice;
      return;
    }
  }
  
  // Fallback to first English voice
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  if (englishVoice) {
    utterance.voice = englishVoice;
    return;
  }
  
  // Final fallback - use default voice (first in the list)
  if (voices.length > 0) {
    utterance.voice = voices[0];
  }
}
