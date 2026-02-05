// src/ChatBot.tsx
import React, { useState } from 'react';

const ChatBot = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { text: "こんにちは！今日は何を勉強する？", sender: "bot" }
  ]);

  const sendMessage = () => {
    if (!input) return;

    // 自分のメッセージを追加
    const newMessages = [...messages, { text: input, sender: "user" }];
    setMessages(newMessages);
    setInput('');

    // 1秒後にボットが返事をする（フリをする）
    setTimeout(() => {
      setMessages(prev => [...prev, { text: "すごいね！応援してるよ！", sender: "bot" }]);
    }, 1000);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '10px', maxWidth: '400px' }}>
      <div style={{ height: '300px', overflowY: 'scroll', marginBottom: '10px' }}>
        {messages.map((m, i) => (
          <p key={i} style={{ textAlign: m.sender === 'user' ? 'right' : 'left' }}>
            <span style={{ background: m.sender === 'user' ? '#def' : '#eee', padding: '5px 10px', borderRadius: '10px' }}>
              {m.text}
            </span>
          </p>
        ))}
      </div>
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)} 
        placeholder="メッセージを入力..."
      />
      <button onClick={sendMessage}>送信</button>
    </div>
  );
};

export default ChatBot;