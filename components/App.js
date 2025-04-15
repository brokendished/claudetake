import React from 'react';
import './App.css';
import ChatbotChat from './ChatbotChat';
import Header from './Header';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';

function App() {
  return (
    <div className="App">
      <Header />
      <ChatbotChat />
    </div>
  );
}

export default App;
