import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../libs/firebaseClient';
import Header from '../components/Header';

export default function Home() {
  const [user, loading] = useAuthState(auth);

  return (
    <div>
      <Header />
      <main className="p-6">
        <h1 className="text-3xl font-bold mb-4">Welcome to AI Quote Chatbot</h1>
        <p>Submit your issue and get a summary saved instantly.</p>
        {!loading && !user && (
          <p className="mt-4">
            <a href="/signup" className="text-blue-500">Sign up</a>{' '}
            or{' '}
            <a href="/login" className="text-blue-500">Log in</a>{' '}
            to get started.
          </p>
        )}
      </main>
    </div>
  );
}
