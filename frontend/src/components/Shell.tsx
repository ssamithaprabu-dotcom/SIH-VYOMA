import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import { Rocket, LayoutDashboard, Archive, Settings as SettingsIcon, LogOut, Wifi, WifiOff } from 'lucide-react';
import { MissionAssistant } from './MissionAssistant';

export function Shell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const { connected, rocketConnected, currentMission, latest, settings, mode, history } = useTelemetry();
  const [now, setNow] = React.useState(Date.now());
  const [packetRate, setPacketRate] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    // Calculate simple packet rate over the last 1 second
    if (!history || history.length < 2) {
      setPacketRate(0);
      return;
    }
    const recent = history.filter(p => now - Number(p.timestamp) < 1000);
    setPacketRate(recent.length);
  }, [history, now]);

  const dataAge = latest ? (now - Number(latest.timestamp)) / 1000 : Infinity;
  const timeoutMs = settings?.network?.connectionTimeout || 5000;
  const isTelemetryLost = latest && dataAge > (timeoutMs / 1000);

  return (
    <div className="flex h-screen overflow-hidden bg-vyoma-dark">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-vyoma-panel border-r border-vyoma-primary/20 relative z-20 shadow-2xl">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-vyoma-primary/20">
          <Rocket className="w-8 h-8 text-vyoma-primary" />
          <div>
            <h1 className="text-xl font-bold tracking-widest text-vyoma-primary">VYOMA</h1>
            <p className="text-[10px] text-gray-400 font-mono">MISSION CONTROL</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/archive', icon: Archive, label: 'Mission Archive' },
            { to: '/settings', icon: SettingsIcon, label: 'Settings' }
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-vyoma-primary/10 text-vyoma-primary border border-vyoma-primary/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-vyoma-primary/20">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:text-white hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-8 bg-vyoma-panelLight border-b border-vyoma-primary/20 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 tracking-wider">MISSION</span>
              <span className="text-sm font-semibold text-white">
                {currentMission ? currentMission.name : 'NO ACTIVE MISSION'}
              </span>
            </div>
            {mode === 'LIVE' ? (
              <div className="px-3 py-1 rounded bg-vyoma-success/20 border border-vyoma-success text-vyoma-success text-xs font-bold tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-vyoma-success animate-pulse"></span>
                LIVE TELEMETRY
              </div>
            ) : (
              <div className="px-3 py-1 rounded bg-vyoma-warning/20 border border-vyoma-warning text-vyoma-warning text-xs font-bold tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-vyoma-warning"></span>
                SIMULATION
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-[10px] text-gray-400 tracking-wider">CURRENT TIME</span>
              <span className="text-sm font-mono font-medium text-white">
                {new Date(now).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex flex-col items-end hidden lg:flex">
              <span className="text-[10px] text-gray-400 tracking-wider">MISSION TIME</span>
              <span className="text-sm font-mono font-medium text-vyoma-primary">
                {currentMission ? new Date(Math.max(0, now - new Date(currentMission.start_time).getTime())).toISOString().substr(11, 8) : '--:--:--'}
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 tracking-wider">IP / PORT</span>
              <span className="text-sm font-mono font-medium text-gray-300">
                {settings?.network?.espIp || '192.168.4.1'}:{settings?.network?.port || 8080}
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 tracking-wider">PACKET RATE</span>
              <span className="text-sm font-mono font-medium text-vyoma-primary">
                {packetRate}/s
              </span>
            </div>
            
            <div className="flex flex-col items-end w-32">
              <span className="text-[10px] text-gray-400 tracking-wider">LAST TELEMETRY</span>
              {isTelemetryLost ? (
                <span className="text-sm font-mono font-bold text-vyoma-critical animate-pulse">
                  TELEMETRY LOST
                </span>
              ) : (
                <span className="text-sm font-mono font-medium text-vyoma-primary">
                  {latest ? new Date(latest.timestamp).toLocaleTimeString() : '--:--:--'}
                </span>
              )}
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 tracking-wider">ROCKET LINK</span>
              <div className="flex items-center gap-2">
                {rocketConnected ? (
                  <Wifi className="w-4 h-4 text-vyoma-success" />
                ) : (
                  <WifiOff className="w-4 h-4 text-vyoma-critical" />
                )}
                <span className={`text-sm font-bold ${rocketConnected ? 'text-vyoma-success' : 'text-vyoma-critical'}`}>
                  {rocketConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content scrollable area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <MissionAssistant />
    </div>
  );
}
