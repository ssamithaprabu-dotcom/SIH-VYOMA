import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { api } from '../api';
import { useTelemetry } from '../context/TelemetryContext';

export function MissionAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'VYOMA Mission Assistant initialized. Ask me about telemetry, flight status, or sensor values.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentMission } = useTelemetry();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    
    try {
      const res = await api.post('/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error communicating with assistant backend.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-vyoma-primary rounded-full flex items-center justify-center shadow-lg hover:bg-vyoma-primary/90 transition-all z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageSquare className="text-black w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] glass-panel-light flex flex-col shadow-2xl z-50 border border-vyoma-primary/40 overflow-hidden transform transition-all">
          <div className="bg-vyoma-panel px-4 py-3 border-b border-vyoma-primary/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-vyoma-primary" />
              <span className="font-mono text-sm font-bold text-white tracking-wider">VYOMA ASSISTANT</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-vyoma-primary text-black' : 'bg-black/40 text-gray-200 border border-vyoma-primary/10'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-black/40 border border-vyoma-primary/10 rounded-lg px-3 py-2 text-sm text-vyoma-primary animate-pulse">
                  Analyzing telemetry...
                </div>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSend} className="p-3 bg-black/20 border-t border-vyoma-primary/20 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about altitude, velocity..."
              className="flex-1 bg-black/40 border border-vyoma-primary/20 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-vyoma-primary"
            />
            <button type="submit" disabled={loading || !input.trim()} className="bg-vyoma-primary/20 hover:bg-vyoma-primary/40 text-vyoma-primary rounded px-3 flex items-center justify-center transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
