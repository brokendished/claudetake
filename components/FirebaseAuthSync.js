
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { syncNextAuthWithFirebase } from '../libs/firebaseAuth';

// Component to handle Firebase authentication syncing
export default function FirebaseAuthSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      // Sync the NextAuth session with Firebase Auth
      syncNextAuthWithFirebase(session).catch(console.error);
    }
  }, [session]);

  return null; // This component doesn't render anything
}
