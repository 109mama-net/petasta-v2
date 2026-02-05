// src/App.tsx
import React from 'react';
import ChatBot from './ChatBot';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#4A90E2', textAlign: 'center' }}>
        Study Buddy
      </h1>
      <p style={{ textAlign: 'center', color: '#666' }}>
        スクールのチャットボット（デモ版）
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <ChatBot />
      </div>
    </div>
  );
}

export default App;