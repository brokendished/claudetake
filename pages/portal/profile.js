// pages/portal/profile.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../libs/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Header from '../../components/Header';

export default function Profile() {
  const [user, loading] = useAuthState(auth);
  const [name, setName] = useState('');
  const router = useRouter();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Load existing profile data
  useEffect(() => {
    if (user) {
      const ref = doc(db, 'contractors', user.uid);
      getDoc(ref).then(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setName(data.name || '');
        }
      }).catch(err => console.error('Error fetching profile:', err));
    }
  }, [user]);

  // Save updated profile
  const saveProfile = async () => {
    if (!user) return;
    try {
      const ref = doc(db, 'contractors', user.uid);
      await setDoc(ref, { name }, { merge: true });
      router.replace('/portal');
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  if (loading || !user) {
    return <p className="p-4">Loading…</p>;
  }

  return (
    <div>
      <Header />
      <main className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
        <label className="block mb-4">
          <span className="text-sm font-medium">Organization Name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
          />
        </label>
        <button
          onClick={saveProfile}
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          Save Profile
        </button>
      </main>
    </div>
  );
}
