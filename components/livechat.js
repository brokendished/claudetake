// components/LiveChat.js
import { useEffect, useRef, useState } from 'react';
import analyzeImage from '../libs/visionClient';

export default function LiveChat({ onMessage }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    startLiveVideo();
    return stopLiveVideo;
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning && videoRef.current) {
      interval = setInterval(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');

        try {
          const analysis = await analyzeImage(dataURL);
          if (onMessage) {
            onMessage({ role: 'assistant', content: analysis });
          }
        } catch (err) {
          console.error('Live analysis failed:', err);
        }
      }, 2000); // every 2 seconds
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const startLiveVideo = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsRunning(true);
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  };

  const stopLiveVideo = () => {
    setIsRunning(false);
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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
