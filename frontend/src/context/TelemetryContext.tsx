import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../api';

export interface TelemetryPoint {
  timestamp: number | string;
  temperature: number | null;
  humidity: number | null;
  mq09: number | null;
  mq135: number | null;
  flame: number;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  altitude: number;
  velocity: number;
  battery: number | null;
  gps_lat: number | null;
  gps_lon: number | null;
  gps_sats: number | null;
  orientation?: { roll: number; pitch: number; yaw: number };
}

export interface Mission {
  id: string;
  name: string;
  operator: string;
  status: string;
  start_time: string;
  end_time?: string;
}

interface TelemetryContextType {
  socket: Socket | null;
  connected: boolean; // Note: this is the backend websocket connection
  rocketConnected: boolean; // Tracks the actual ESP8266 heartbeat
  latest: TelemetryPoint | null;
  history: TelemetryPoint[];
  currentMission: Mission | null;
  settings: any;
  mode: 'LIVE' | 'SIMULATION';
  refreshMission: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextType>({} as TelemetryContextType);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [rocketConnected, setRocketConnected] = useState(false);
  const [latest, setLatest] = useState<TelemetryPoint | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [settings, setSettings] = useState<any>({ sensors: {}, thresholds: {} });
  const [lastPacketTime, setLastPacketTime] = useState<number>(0);

  const refreshMission = async () => {
    try {
      const m = await api.get('/missions/current');
      setCurrentMission(m);
      if (m) {
        const hist = await api.get(`/telemetry/history?limit=100&missionId=${m.id}`);
        setHistory(hist.reverse());
      } else {
        setHistory([]);
        setLatest(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshSettings = async () => {
    try {
      const s = await api.get('/settings');
      setSettings(s);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshMission();
    refreshSettings();

    const s = io(window.location.origin.replace('5173', '4000'));
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    
    s.on('telemetry', ({ point }) => {
      setLatest(point);
      setLastPacketTime(Date.now());
      setHistory(prev => {
        const next = [...prev, point];
        if (next.length > 4000) next.shift(); // keep last 4000 for charts
        return next;
      });
    });

    return () => { s.disconnect(); };
  }, []);

  // Check rocket heartbeat every second
  useEffect(() => {
    const timer = setInterval(() => {
      // If no packet received in the last 5 seconds, it's disconnected
      if (Date.now() - lastPacketTime > 5000) {
        setRocketConnected(false);
      } else {
        setRocketConnected(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastPacketTime]);

  const mode = settings.mode || 'SIMULATION';

  return (
    <TelemetryContext.Provider value={{ socket, connected, rocketConnected, latest, history, currentMission, settings, mode, refreshMission, refreshSettings }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export const useTelemetry = () => useContext(TelemetryContext);
