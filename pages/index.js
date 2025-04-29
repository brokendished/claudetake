import Head from 'next/head';
import Header from '../components/Header';
import ChatbotChat from '../components/ChatbotChat';
import ErrorBoundary from '../components/ErrorBoundary';
import { signIn, signOut } from 'next-auth/react';

export default function Home() {
  console.log('Rendering Home component');
  return (
    <ErrorBoundary>
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
        <div className="flex flex-col items-center justify-center min-h-screen">
          <button
            onClick={() => signIn('google')}
            className="login-button bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          >
            Login
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 mt-4"
            onClick={() => window.location.href = '/contractor/signup'}
          >
            GetQuote
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 mt-4"
            onClick={() => window.location.href = '/contractor/dashboard'}
          >
            Dashboard
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 mt-4"
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}