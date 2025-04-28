import { auth } from "../firebase-config"; // Use centralized Firebase instance
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { syncNextAuthWithFirebase } from "../libs/firebaseAuth";

// Component to handle Firebase authentication syncing
export default function FirebaseAuthSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      // Sync the NextAuth session with Firebase Auth
      syncNextAuthWithFirebase(session, auth).catch((error) => {
        console.error("Error syncing NextAuth with Firebase:", error);
      });
    }
  }, [session]);

  return null; // This component doesn't render anything
}
