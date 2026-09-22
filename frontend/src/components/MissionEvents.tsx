import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useTelemetry } from '../context/TelemetryContext';

interface MissionEvent {
  id: number;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  sensor: string;
  message: string;
}

export function MissionEvents() {
  const { currentMission, latest } = useTelemetry();
  const [events, setEvents] = useState<MissionEvent[]>([]);

  useEffect(() => {
    if (!currentMission) return;
    
    // Fetch events every 2 seconds
    const fetchEvents = async () => {
      try {
        const res = await api.get(`/missions/${currentMission.id}/alerts`);
        setEvents(res);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchEvents();
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, [currentMission, latest]);

  if (!currentMission) return null;

  return (
    <div className="glass-panel p-6 flex flex-col h-72">
      <h3 className="text-xs font-mono text-gray-400 tracking-wider mb-4 uppercase">Mission Events</h3>
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {events.length === 0 ? (
          <div className="text-gray-500 font-mono text-sm text-center mt-10">NO EVENTS LOGGED</div>
        ) : (
          events.map(ev => (
            <div key={ev.id} className="flex gap-4 items-start border-l-2 border-gray-700 pl-3 py-1">
              <div className="text-xs font-mono text-gray-500 whitespace-nowrap pt-0.5">
                {new Date(ev.timestamp).toLocaleTimeString()}
              </div>
              <div className="flex flex-col">
                <span className={`text-[10px] font-bold tracking-widest ${
                  ev.severity === 'CRITICAL' ? 'text-vyoma-critical' : 
                  ev.severity === 'WARNING' ? 'text-vyoma-warning' : 'text-vyoma-primary'
                }`}>
                  {ev.severity}
                </span>
                <span className="text-sm text-gray-300">{ev.message}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
