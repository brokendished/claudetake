import Head from 'next/head';
import Header from '../components/Header';
import ChatbotChat from '../components/ChatbotChat';
import ErrorBoundary from '../components/ErrorBoundary';
import { signIn } from 'next-auth/react';

export default function Home() {
  return (
    <div className="home-container">
      <Head>
        <title>QuickQuote Chatbot</title>
      </Head>
      <Header />
      <main>
        <ErrorBoundary>
          <ChatbotChat role="customer" />
        </ErrorBoundary>
      </main>
      <button
        onClick={() => signIn('google')}
        className="login-button bg-blue-600 text-white px-4 py-2 rounded"
      >
        Login
      </button>
    </div>
  );
}