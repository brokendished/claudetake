import Head from 'next/head';
import Header from '../components/Header';
import ChatbotChat from '../components/ChatbotChat';

export default function Home() {
  return (
    <>
      <Head>
        <title>QuickQuote Chatbot</title>
      </Head>
      <Header />
      <main>
        <ChatbotChat />
      </main>
    </>
  );
}
