import Head from 'next/head';
import Header from '../components/Header';
import ChatbotChat from '../components/ChatbotChat';
import ErrorBoundary from '../components/ErrorBoundary';
import { signIn } from 'next-auth/react';

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
        <button
          onClick={() => signIn('google')}
          className="login-button bg-blue-600 text-white px-4 py-2 rounded"
        >
          Login
        </button>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
            onClick={() => console.log('GetQuote button clicked')}
          >
            GetQuote
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 mt-4"
            onClick={() => console.log('Dashboard button clicked')}














}  );    </ErrorBoundary>      </div>        </div>          </button>            Sign out          >            onClick={() => console.log('Sign out button clicked')}            className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 mt-4"          <button          </button>            Dashboard          >      </div>
    </ErrorBoundary>
  );
}