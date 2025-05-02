import Head from 'next/head';
import Header from '../components/Header';
import ChatbotChat from '../components/ChatbotChat';
import ErrorBoundary from '../components/ErrorBoundary';
import { useSession } from 'next-auth/react';

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

      <main className="container mx-auto px-4">
        <ErrorBoundary>
          <ChatbotChat />
        </ErrorBoundary>
      </main>
    </div>
  );
}