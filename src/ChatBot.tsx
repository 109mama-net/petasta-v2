// src/ChatBot.tsx
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

const ChatBot = () => {
  const [input, setInput] = useState('');
  const [schoolData, setSchoolData] = useState<any[]>([]);
  const [messages, setMessages] = useState([
    { text: "資格スクールの窓口へようこそ！気になるボタンを選んでみてください。", sender: "bot" }
  ]);

  useEffect(() => {
    fetch('/qa_data.csv')
      .then(response => response.text())
      .then(csvText => {
        const result = Papa.parse(csvText, { header: true });
        setSchoolData(result.data);
      });
  }, []);

  // ★送信処理を1つにまとめました
  const handleSend = (text: string) => {
    if (!text) return;
    const newMessages = [...messages, { text: text, sender: "user" }];
    setMessages(newMessages);

    setTimeout(() => {
      const found = schoolData.find(data => 
        data.keywords && data.keywords.split(',').some((key: string) => text.includes(key.trim()))
      );
      const replyText = found ? found.answer : "すみません、その点については窓口へ直接お問い合わせください。";
      setMessages(prev => [...prev, { text: replyText, sender: "bot" }]);
    }, 800);
    setInput('');
  };

  return (
    <div style={{ 
      border: 'none', padding: '20px', borderRadius: '20px', width: '380px', 
      backgroundColor: '#fdfdfd', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' 
    }}>
      <div style={{ height: '400px', overflowY: 'scroll', marginBottom: '15px', padding: '10px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', margin: '15px 0' }}>
            {m.sender === 'bot' && (
              <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#FFD700', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎓</div>
            )}
            <div style={{ 
              background: m.sender === 'user' ? '#007AFF' : '#f0f0f0', color: m.sender === 'user' ? 'white' : '#333',
              padding: '10px 15px', borderRadius: m.sender === 'user' ? '20px 20px 2px 20px' : '2px 20px 20px 20px',
              maxWidth: '70%', fontSize: '14px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* ★ここに「おすすめ質問ボタン」を表示！ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
        {schoolData.map((data, index) => (
          data.keywords && (
            <button 
              key={index}
              onClick={() => handleSend(data.keywords.split(',')[0])} // キーワードの1つ目を送信
              style={{ 
                backgroundColor: 'white', border: '1px solid #007AFF', color: '#007AFF', 
                padding: '5px 12px', borderRadius: '15px', fontSize: '12px', cursor: 'pointer'
              }}
            >
              {data.keywords.split(',')[0]} {/* ボタンに表示する名前 */}
            </button>
          )
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
        <input 
          style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ddd', outline: 'none' }}
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder="質問を入力..."
        />
        <button onClick={() => handleSend(input)} style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#007AFF', color: 'white', border: 'none', cursor: 'pointer' }}>➤</button>
      </div>
    </div>
  );
};

export default ChatBot;