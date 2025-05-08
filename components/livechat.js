// components/LiveChat.js
import { useEffect, useRef, useState, useCallback } from 'react';
import analyzeImage from '../libs/visionClient';

export default function LiveChat({ onMessage }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const isMounted = useRef(true);

  const startLiveVideo = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIsSupported(false);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      });

      if (isMounted.current) {
        setStream(mediaStream);
        setIsRunning(true);
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setIsSupported(false);
    }
  }, []);

  const stopLiveVideo = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRunning(false);
  }, [stream]);

  useEffect(() => {
    startLiveVideo();
    return () => {
      isMounted.current = false;
      stopLiveVideo();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isSupported) {
    return (
      <div className="bg-yellow-100 p-4 rounded-lg">
        <p>Camera access is not supported or was denied. Please try another browser.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full rounded-lg"
      />
      <div className="absolute bottom-4 right-4">
        <button
          onClick={stopLiveVideo}
          className="bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          Stop Live
        </button>
      </div>
    </div>
  );
}
