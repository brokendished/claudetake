import Head from 'next/head';
import Header from '../components/Header';
import ChatbotChat from '../components/ChatbotChat';
import ErrorBoundary from '../components/ErrorBoundary';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
      <Head>
        <title>Contractor Assistant</title>
        <meta name="description" content="Get quick estimates and professional advice" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-8">
        {!session && (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Welcome to ClaudeTake</h1>
            <div className="space-x-4">
              <Link href="/login">
                <a className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                  Customer Login
                </a>
              </Link>
              <Link href="/contractor/signup">
                <a className="inline-block bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">
                  Contractor Signup
                </a>
              </Link>
            </div>
          </div>
        )}
        <ErrorBoundary>
          <ChatbotChat />
        </ErrorBoundary>
      </main>
    </div>
  );
}