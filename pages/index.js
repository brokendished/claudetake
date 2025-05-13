import Head from 'next/head';
import { useSession, signIn } from 'next-auth/react';
import ChatbotChat from '../components/ChatbotChat';
import Header from '../components/Header';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
      <Head>
        <title>Get Quick Estimates | ClaudeTake</title>
        <meta name="description" content="Get quick estimates and professional advice" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-8">
        {!session && (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Get Quick Estimates</h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect with contractors and get instant estimates
            </p>
            <button
              onClick={() => signIn('google')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Sign in with Google to Save Quotes
            </button>
          </div>
        )}
        <ChatbotChat />
      </main>
    </div>
  );
}