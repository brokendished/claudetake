import { useState } from 'react';
import { auth, db } from '../firebase-config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [greeting, setGreeting] = useState('');
  const [industry, setIndustry] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save contractor details in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        displayName,
        role: 'contractor',
        businessName,
        logoUrl,
        chatbotSettings: {
          greeting,
          industry,
          tone: 'default', // Default tone, can be updated later
        },
        createdAt: new Date(),
      });

      alert('Account created successfully!');
    } catch (error) {
      console.error('Error signing up:', error);
      alert('Error signing up: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSignup}>
      <h1>Contractor Signup</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input type="text" placeholder="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      <input type="text" placeholder="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
      <input type="url" placeholder="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
      <input type="text" placeholder="Chatbot Greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} />
      <select value={industry} onChange={(e) => setIndustry(e.target.value)} required>
        <option value="">Select Industry</option>
        <option value="power-washing">Power Washing</option>
        <option value="landscaping">Landscaping</option>
        <option value="other">Other</option>
      </select>
      <button type="submit">Sign Up</button>
    </form>
  );
}
