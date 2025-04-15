// components/LiveChat.js
import { useEffect, useRef, useState, useCallback } from 'react';
import analyzeImage from '../libs/visionClient';

export default function LiveChat({ onMessage }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const isMounted = useRef(true);

  // Use useCallback to prevent function recreation on each render
  const startLiveVideo = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIsSupported(false);
        return;
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (isMounted.current) {
        setStream(mediaStream);
        setIsRunning(true);
      } else {
        // Clean up if component unmounted during async call
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      if (isMounted.current) {
        setIsSupported(false);
      }
    }
  }, []);

  const stopLiveVideo = useCallback(() => {
    setIsRunning(false);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Component mount/unmount effect
  useEffect(() => {
    isMounted.current = true;
    startLiveVideo();
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      stopLiveVideo();
    };
  }, [startLiveVideo, stopLiveVideo]);

  // Video analysis effect with proper dependencies
  useEffect(() => {
    let interval;
    
    if (isRunning && videoRef.current && stream) {
      interval = setInterval(async () => {
        if (!isMounted.current) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');

        try {
          const analysis = await analyzeImage(dataURL);
          if (isMounted.current && onMessage) {
            onMessage({ role: 'assistant', content: analysis });
          }
        } catch (err) {
          console.error('Live analysis failed:', err);
        }
      }, 2000); // every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, stream, onMessage]);

  // Connect video element to stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isSupported) {
    return (
      <div className="bg-yellow-100 p-4 rounded-xl shadow-md text-yellow-800">
        <p className="text-center">Camera access is not supported in your browser.</p>
        <p className="text-center text-sm mt-2">Try using Chrome, Firefox or Edge.</p>
      </div>
    );
  }

  return (
    <div className="bg-black p-2 rounded-xl shadow-md text-white">
      <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-md" />
      <p className="text-xs text-center mt-2">🎥 Live analysis in progress...</p>
      <div className="flex justify-end mt-2">
        <button onClick={stopLiveVideo} className="py-1 px-3 bg-red-500 text-white rounded-md text-sm">
          ✖️ Stop Live
        </button>
      </div>
    </div>
  );
}
