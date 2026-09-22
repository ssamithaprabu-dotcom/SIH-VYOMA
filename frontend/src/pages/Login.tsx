import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const data = await api.post('/auth/login', { username, password });
      login(data.username, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(`Error: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vyoma-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      <div className="glass-panel w-full max-w-md p-8 relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-vyoma-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-vyoma-primary/30">
          <Rocket className="w-8 h-8 text-vyoma-primary" />
        </div>
        
        <h1 className="text-2xl font-bold text-white tracking-widest mb-1">VYOMA</h1>
        <p className="text-xs text-vyoma-primary tracking-widest font-mono mb-8 uppercase text-center">
          Mission Control System<br/>
          Telemetry & Avionics Ground Station
        </p>
        
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {error && (
            <div className="p-3 bg-vyoma-critical/10 border border-vyoma-critical/30 rounded-lg text-vyoma-critical text-sm text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1 tracking-wider uppercase">Operator ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-vyoma-primary/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-vyoma-primary focus:ring-1 focus:ring-vyoma-primary transition-all font-mono text-sm"
              placeholder="Enter operator ID"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1 tracking-wider uppercase">Authentication Code</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-vyoma-primary/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-vyoma-primary focus:ring-1 focus:ring-vyoma-primary transition-all font-mono text-sm"
              placeholder="Enter auth code"
              required
            />
          </div>
          
          <div className="flex items-center gap-2 py-2">
            <input type="checkbox" id="remember" className="rounded border-vyoma-primary/30 bg-black/40 text-vyoma-primary focus:ring-vyoma-primary focus:ring-offset-vyoma-dark" />
            <label htmlFor="remember" className="text-xs text-gray-400">Remember credentials</label>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vyoma-primary hover:bg-vyoma-primary/90 text-black font-bold py-3 px-4 rounded-lg transition-all tracking-wider text-sm disabled:opacity-50 mt-4"
          >
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE LINK'}
          </button>
        </form>
      </div>
    </div>
  );
}
