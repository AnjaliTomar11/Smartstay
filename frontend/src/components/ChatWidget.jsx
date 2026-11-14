import { useState, useRef, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I am the SmartStay assistant. Ask me about rooms, prices, check-in time or booking.' },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { from: 'bot', text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { from: 'bot', text: 'Sorry, the server is not reachable right now.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
      {open && (
        <div style={{
          width: 320, height: 400, background: '#fff', color: '#222',
          border: '1px solid #ccc', borderRadius: 12, display: 'flex',
          flexDirection: 'column', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', marginBottom: 10,
        }}>
          <div style={{ background: '#b23a3a', color: '#fff', padding: 12, borderRadius: '12px 12px 0 0', fontWeight: 'bold' }}>
            SmartStay Assistant
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ textAlign: m.from === 'user' ? 'right' : 'left', margin: '6px 0' }}>
                <span style={{
                  display: 'inline-block', padding: '8px 12px', borderRadius: 12, maxWidth: '85%',
                  background: m.from === 'user' ? '#b23a3a' : '#eee',
                  color: m.from === 'user' ? '#fff' : '#222',
                }}>
                  {m.text}
                </span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid #ddd' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type your question..."
              style={{ flex: 1, border: 'none', padding: 12, outline: 'none', background: '#fff', color: '#222' }}
            />
            <button
              onClick={send}
              disabled={sending}
              style={{ border: 'none', background: '#b23a3a', color: '#fff', padding: '0 16px', cursor: 'pointer' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open chat"
        style={{
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: '#b23a3a', color: '#fff', fontSize: 24, cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
        }}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}