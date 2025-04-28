import Head from 'next/head';
import Header from '../components/Header';
import ChatbotChat from '../components/ChatbotChat';
import { signIn } from 'next-auth/react';

export default function Home() {
  return (
    <div className="home-container">
      <Head>
        <title>QuickQuote Chatbot</title>
      </Head>
      <Header />
      <main>
        <ChatbotChat />
      </main>
      <button
        onClick={() => signIn()}
        className="login-button bg-blue-600 text-white px-4 py-2 rounded"
      >
        Login
      </button>
    </div>
  );
}