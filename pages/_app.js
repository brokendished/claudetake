i// pages/_app.js

import '@/styles/globals.css';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../libs/firebaseClient';

export default function MyApp({ Component, pageProps }) {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading…</div>;
  }

  // Optionally, you can redirect to /login here if you want all pages protected:
  // if (!user) { 
  //   if (typeof window !== 'undefined') window.location.href = '/login';
  //   return null;
  // }

  return <Component {...pageProps} user={user} />;
}
