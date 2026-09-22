import React, { useState, useEffect, useRef } from 'react';
import { Activity, AlertTriangle, CheckCircle, RefreshCcw, Wifi, WifiOff } from 'lucide-react';

interface AIAlert {
  alert_id: string;
  status: string;
  sensor: string;
  parameter: string;
  current_value: number;
  unit: string;
  flight_phase: string;
  fault: string;
  severity: string;
  possible_causes?: string;
  recommended_action?: string;
  confidence?: string;
  ai_status: 'PENDING' | 'COMPLETE' | 'FALLBACK';
  sources?: string[];
}

export function AIFlightMonitor() {
  const [connectionStatus, setConnectionStatus] = useState<'OFFLINE' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'>('CONNECTING');
  const [alerts, setAlerts] = useState<Map<string, AIAlert>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setConnectionStatus(prev => prev === 'OFFLINE' ? 'RECONNECTING' : 'CONNECTING');
    
    const wsUrl = (import.meta as any).env.VITE_VYOMA_AI_WS_URL || 'ws://localhost:8000/ws/telemetry';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('CONNECTED');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'status' && payload.data?.connection_status) {
          // Connected message
        } else if (payload.type === 'ai_alert' || payload.type === 'ai_alert_update') {
          const alertData = payload.data as AIAlert;
          if (alertData && alertData.alert_id) {
            setAlerts(prev => {
              const newMap = new Map(prev);
              newMap.set(alertData.alert_id, alertData);
              return newMap;
            });
          }
        }
      } catch (err) {
        console.error("Error parsing AI WebSocket message", err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('OFFLINE');
      scheduleReconnect();
    };

    ws.onerror = () => {
      // Error will trigger close which handles reconnect
      if (ws.readyState !== WebSocket.OPEN) {
        setConnectionStatus('OFFLINE');
      }
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, 5000);
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case 'CRITICAL': return 'text-vyoma-critical border-vyoma-critical';
      case 'WARNING': return 'text-vyoma-warning border-vyoma-warning';
      case 'NORMAL': return 'text-vyoma-success border-vyoma-success';
      default: return 'text-gray-400 border-gray-600';
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <h3 className="text-lg font-bold text-white tracking-widest uppercase flex items-center gap-2">
          <Activity className="w-5 h-5 text-vyoma-primary" />
          AI Flight Monitor
        </h3>
        <div className="flex items-center gap-2">
          {connectionStatus === 'CONNECTED' ? (
            <span className="text-vyoma-success text-xs font-mono tracking-wider flex items-center gap-2">
              <Wifi className="w-4 h-4" /> AI BACKEND CONNECTED
            </span>
          ) : connectionStatus === 'OFFLINE' ? (
            <span className="text-gray-500 text-xs font-mono tracking-wider flex items-center gap-2">
              <WifiOff className="w-4 h-4" /> AI BACKEND OFFLINE
            </span>
          ) : (
            <span className="text-vyoma-warning text-xs font-mono tracking-wider flex items-center gap-2 animate-pulse">
              <RefreshCcw className="w-4 h-4 animate-spin" /> AI BACKEND RECONNECTING
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {alerts.size === 0 ? (
          <div className="text-gray-500 text-sm font-mono text-center py-8">
            NO ACTIVE AI ALERTS
          </div>
        ) : (
          Array.from(alerts.values()).reverse().map(alert => (
            <div key={alert.alert_id} className={`bg-vyoma-panelLight/30 border-l-4 p-4 rounded-r-lg ${getStatusColor(alert.status || alert.severity)}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase mb-1">
                    {alert.sensor} / {alert.parameter}
                  </span>
                  <span className={`text-xl font-bold font-mono uppercase ${getStatusColor(alert.status || alert.severity).split(' ')[0]}`}>
                    {alert.fault}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">VALUE</span>
                  <span className="text-white font-mono text-lg">{alert.current_value} <span className="text-sm text-gray-500">{alert.unit}</span></span>
                </div>
              </div>

              {/* AI Status Badge */}
              <div className="flex items-center gap-2 mt-3 mb-3">
                {alert.ai_status === 'PENDING' && (
                  <span className="bg-vyoma-warning/20 text-vyoma-warning text-[10px] px-2 py-1 rounded border border-vyoma-warning/30 font-mono tracking-wider animate-pulse flex items-center gap-1">
                    <RefreshCcw className="w-3 h-3 animate-spin" /> Analysing…
                  </span>
                )}
                {alert.ai_status === 'COMPLETE' && (
                  <span className="bg-vyoma-primary/20 text-vyoma-primary text-[10px] px-2 py-1 rounded border border-vyoma-primary/30 font-mono tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Complete
                  </span>
                )}
                {alert.ai_status === 'FALLBACK' && (
                  <span className="bg-gray-700/50 text-gray-300 text-[10px] px-2 py-1 rounded border border-gray-600 font-mono tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Rule-based recommendation (AI unavailable)
                  </span>
                )}
              </div>

              {/* Details (Rule + AI Explanation) */}
              <div className="mt-3 bg-black/40 rounded p-3 text-sm flex flex-col gap-3">
                {alert.possible_causes && (
                  <div>
                    <div className="text-[9px] text-vyoma-primary font-mono tracking-wider uppercase mb-1 flex items-center justify-between">
                      <span>POSSIBLE CAUSES</span>
                      <span className="text-gray-500">AI inference</span>
                    </div>
                    <div className="text-gray-300">{alert.possible_causes}</div>
                  </div>
                )}
                
                {alert.recommended_action && (
                  <div>
                    <div className="text-[9px] text-vyoma-primary font-mono tracking-wider uppercase mb-1 flex items-center justify-between">
                      <span>RECOMMENDED ACTION</span>
                      {alert.ai_status !== 'FALLBACK' ? <span className="text-gray-500">AI inference</span> : null}
                    </div>
                    <div className="text-gray-300 font-bold">{alert.recommended_action}</div>
                  </div>
                )}

                {alert.confidence && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                    <span className="text-[9px] text-gray-500 font-mono tracking-wider uppercase">CONFIDENCE</span>
                    <span className="text-xs text-vyoma-primary font-mono">{alert.confidence} <span className="text-[9px] text-gray-500 ml-1 uppercase">(Heuristic confidence)</span></span>
                  </div>
                )}

                {alert.sources && alert.sources.length > 0 && (
                  <div className="border-t border-white/5 pt-2 mt-1">
                    <div className="text-[9px] text-gray-500 font-mono tracking-wider uppercase mb-1">SOURCES</div>
                    <ul className="list-disc list-inside text-xs text-gray-400">
                      {alert.sources.map((src, i) => (
                        <li key={i}>{src}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="text-[9px] text-gray-500 font-mono tracking-wider text-right mt-2 uppercase">
                PHASE: {alert.flight_phase} | ID: {alert.alert_id.split('-').pop()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
