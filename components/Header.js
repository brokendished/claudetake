import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../libs/firebaseClient';

export default function Header() {
  const [user, loading] = useAuthState(auth);

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <Link href="/">
        <span className="text-xl font-bold">AI Quote Chatbot</span>
      </Link>
      <nav className="space-x-4">
        {!loading && !user && (
          <>
            <Link href="/login">
              <a>Log In</a>
            </Link>
            <Link href="/signup">
              <a>Sign Up</a>
            </Link>
          </>
        )}
        {!loading && user && (
          <>
            <Link href="/dashboard">
              <a>Dashboard</a>
            </Link>
            <button onClick={handleLogout} className="ml-2">
              Log Out
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
