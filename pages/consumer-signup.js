import { useState } from 'react';
import { auth, db } from "../firebase-config";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function ConsumerSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save consumer details in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        name,
        role: 'consumer',
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
      <h1>Consumer Signup</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <button type="submit">Sign Up</button>
    </form>
  );
}
