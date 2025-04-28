import { useEffect, useState } from 'react';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';

export default function Chatbot({ contractorId }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchChatbotSettings = async () => {
      try {
        const docRef = doc(db, 'users', contractorId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setSettings(docSnap.data().chatbotSettings);
        } else {
          console.error('No chatbot settings found for contractor:', contractorId);
        }
      } catch (error) {
        console.error('Error fetching chatbot settings:', error);
      }
    };

    fetchChatbotSettings();
  }, [contractorId]);

  if (!settings) return <p>Loading chatbot...</p>;

  return (
    <div>
      <img src={settings.logoUrl} alt={`${settings.businessName} Logo`} style={{ width: '50px', height: '50px' }} />
      <h2>{settings.businessName} Chatbot</h2>
      <p>{settings.greeting || 'Hello! How can we assist you today?'}</p>
      {/* Add chatbot UI and logic here */}
    </div>
  );
}
