import React from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { SensorCard } from '../components/SensorCard';
import { TelemetryChart } from '../components/TelemetryChart';
import { Rocket3D } from '../components/Rocket3D';
import { GasIndicator } from '../components/GasIndicator';
import { MissionEvents } from '../components/MissionEvents';
import { Thermometer, Droplets, Mountain, Gauge, Battery, MapPin, Flame } from 'lucide-react';
import { api } from '../api';

export function Dashboard() {
  const { rocketConnected, currentMission, latest, history, settings, refreshMission } = useTelemetry();
  const s = settings.sensors || {};
  const mq09Thresh = settings.thresholds?.mq09 || { low: 200, normal: 300, high: 500, critical: 800 };
  const mq135Thresh = settings.thresholds?.mq135 || { low: 200, normal: 300, high: 500, critical: 800 };
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startMission = async () => {
    const name = prompt("Enter new mission name:", `VYOMA-FLIGHT-${Date.now().toString().slice(-4)}`);
    if (name) {
      await api.post('/missions', { name });
      refreshMission();
    }
  };

  const endMission = async () => {
    if (confirm("Are you sure you want to end the current mission?")) {
      await api.post('/missions/current/end', {});
      refreshMission();
    }
  };

  const isActive = rocketConnected && currentMission;
  
  // Use `latest` only when there is an active mission and rocket is connected
  const displayData = isActive ? latest : null;

  // Pre-calculate derived data for rendering
  const roll = displayData?.orientation?.roll || 0;
  const pitch = displayData?.orientation?.pitch || 0;
  const yaw = displayData?.orientation?.yaw || 0;

  const missionStateColor = () => {
    if (!currentMission) return 'text-gray-500';
    switch(currentMission.status) {
      case 'ASCENT': return 'text-vyoma-success';
      case 'APOGEE': return 'text-vyoma-warning';
      case 'DESCENT': return 'text-vyoma-primary';
      case 'LANDED': return 'text-gray-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      
      {/* Top Status Bar / Summary */}
      <div className="glass-panel p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 items-center">
          <div>
            <div className="text-xs text-gray-400 font-mono tracking-widest mb-1">MISSION STATUS</div>
            <div className={`text-2xl font-bold tracking-widest ${missionStateColor()}`}>{currentMission ? currentMission.status : 'NONE'}</div>
          </div>
          
          <div>
            <div className="text-xs text-gray-400 font-mono tracking-widest mb-1">MAX ALTITUDE</div>
            <div className="text-2xl font-bold text-white tracking-widest">
              {isActive ? Math.max(...history.map(p => p.altitude || 0), 0).toFixed(1) : '—'} <span className="text-sm text-gray-500">m</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 font-mono tracking-widest mb-1">CUR. VELOCITY</div>
            <div className="text-2xl font-bold text-white tracking-widest">
              {isActive && displayData?.velocity !== undefined && displayData.velocity !== null ? Math.abs(displayData.velocity).toFixed(1) : '—'} <span className="text-sm text-gray-500">m/s</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 font-mono tracking-widest mb-1">CUR. ACCEL.</div>
            <div className="text-2xl font-bold text-white tracking-widest">
              {isActive && displayData ? Math.max(Math.abs(displayData.accel_x), Math.abs(displayData.accel_y), Math.abs(displayData.accel_z)).toFixed(2) : '—'} <span className="text-sm text-gray-500">g</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 font-mono tracking-widest mb-1">CUR. ANG. VEL.</div>
            <div className="text-2xl font-bold text-white tracking-widest">
              {isActive && displayData ? Math.max(Math.abs(displayData.gyro_x), Math.abs(displayData.gyro_y), Math.abs(displayData.gyro_z)).toFixed(0) : '—'} <span className="text-sm text-gray-500">°/s</span>
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-400 font-mono tracking-widest mb-1">TIME OF FLIGHT</div>
            <div className="text-2xl font-bold text-vyoma-primary tracking-widest">
              {isActive && currentMission 
                ? (currentMission.end_time 
                  ? new Date(new Date(currentMission.end_time).getTime() - new Date(currentMission.start_time).getTime()).toISOString().substr(11, 8)
                  : new Date(Math.max(0, now - new Date(currentMission.start_time).getTime())).toISOString().substr(11, 8))
                : '—:—:—'
              }
            </div>
          </div>
        </div>
        
        {displayData?.flame === 1 && (
          <div className="mt-6 bg-vyoma-critical/20 border border-vyoma-critical px-6 py-3 rounded-lg flex items-center gap-3 animate-pulse">
            <Flame className="text-vyoma-critical w-6 h-6" />
            <span className="text-vyoma-critical font-bold tracking-widest text-lg">FLAME DETECTED</span>
          </div>
        )}
      </div>

      {!currentMission ? (
        <div className="bg-vyoma-panelLight/50 border border-vyoma-primary/20 p-4 rounded-lg flex items-center justify-between">
          <div className="text-gray-400 font-mono tracking-widest">READY TO START RECORDING TELEMETRY</div>
          <button 
            onClick={startMission}
            className="bg-vyoma-primary text-black font-bold px-6 py-2 rounded hover:bg-vyoma-primary/90 transition-colors tracking-wider text-sm"
          >
            START NEW MISSION
          </button>
        </div>
      ) : (
        <div className="bg-vyoma-primary/10 border border-vyoma-primary/20 p-4 rounded-lg flex items-center justify-between">
          <div className="text-vyoma-primary font-mono tracking-widest">MISSION RECORDING ACTIVE</div>
          <button 
            onClick={endMission}
            className="bg-vyoma-critical text-white font-bold px-6 py-2 rounded hover:bg-vyoma-critical/90 transition-colors tracking-wider text-sm"
          >
            END MISSION
          </button>
        </div>
      )}

      {/* LIVE TELEMETRY */}
      <div>
        <h4 className="text-lg font-bold text-white tracking-widest uppercase mb-4 border-b border-white/10 pb-2">LIVE TELEMETRY</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          
          {/* TIMESTAMP CARD */}
          <div className="glass-panel p-5 flex flex-col justify-between h-32 border border-vyoma-primary/20">
            <h3 className="text-[11px] text-gray-400 font-mono tracking-wider uppercase mb-1">TELEMETRY TIMESTAMP</h3>
            {!isActive || displayData?.timestamp == null ? (
              <>
                <div className="text-2xl font-bold font-mono tracking-tight text-gray-500">--:--:--</div>
                <div className="text-[10px] text-gray-500 font-mono mt-auto uppercase">NO TELEMETRY</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {new Date(displayData.timestamp).toISOString().substr(11, 12)}
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <div>
                    <div className="text-[9px] text-gray-500 font-mono uppercase">LAST PACKET</div>
                    <div className="text-xs text-gray-300 font-mono">{new Date(displayData.timestamp).toISOString().substr(11, 8)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-gray-500 font-mono uppercase">DATA AGE</div>
                    <div className="text-xs text-vyoma-primary font-mono">{((now - displayData.timestamp) / 1000).toFixed(1)} sec</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* TEMPERATURE CARD */}
          {s.dht22 && (
            <div className={`glass-panel p-5 flex flex-col justify-between h-32 border ${!isActive || displayData?.temperature == null ? 'border-gray-800' : 'border-vyoma-primary/20'}`}>
              <div className="flex justify-between items-start">
                <h3 className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">TEMPERATURE</h3>
                <Thermometer className={`w-5 h-5 ${!isActive || displayData?.temperature == null ? 'text-gray-600' : 'text-vyoma-success'}`} />
              </div>
              {!isActive || displayData?.temperature == null ? (
                <div className="mt-auto">
                  <div className="text-2xl font-bold font-mono tracking-tight text-gray-500">
                    -- <span className="text-xs text-gray-600 ml-1">°C</span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1 tracking-wider uppercase">SENSOR UNAVAILABLE</div>
                </div>
              ) : (
                <div className="mt-auto">
                  <div className="text-2xl font-bold font-mono tracking-tight text-vyoma-success">
                    {displayData.temperature.toFixed(1)} <span className="text-xs text-gray-400 ml-1">°C</span>
                  </div>
                  <div className="text-[9px] text-vyoma-success font-mono mt-1 tracking-wider uppercase">NORMAL</div>
                </div>
              )}
            </div>
          )}

          {/* HUMIDITY CARD */}
          {s.dht22 && (
            <div className={`glass-panel p-5 flex flex-col justify-between h-32 border ${!isActive || displayData?.humidity == null ? 'border-gray-800' : 'border-vyoma-primary/20'}`}>
              <div className="flex justify-between items-start">
                <h3 className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">HUMIDITY</h3>
                <Droplets className={`w-5 h-5 ${!isActive || displayData?.humidity == null ? 'text-gray-600' : 'text-vyoma-success'}`} />
              </div>
              {!isActive || displayData?.humidity == null ? (
                <div className="mt-auto">
                  <div className="text-2xl font-bold font-mono tracking-tight text-gray-500">
                    -- <span className="text-xs text-gray-600 ml-1">%</span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1 tracking-wider uppercase">SENSOR UNAVAILABLE</div>
                </div>
              ) : (
                <div className="mt-auto">
                  <div className="text-2xl font-bold font-mono tracking-tight text-vyoma-success">
                    {displayData.humidity.toFixed(1)} <span className="text-xs text-gray-400 ml-1">%</span>
                  </div>
                  <div className="text-[9px] text-vyoma-success font-mono mt-1 tracking-wider uppercase">NORMAL</div>
                </div>
              )}
            </div>
          )}

          {/* ALTITUDE CARD */}
          {(s.bmp280 || s.gps) && (
            <div className={`glass-panel p-5 flex flex-col justify-between h-32 border ${!isActive || displayData?.altitude == null ? 'border-gray-800' : 'border-vyoma-primary/20'}`}>
              <div className="flex justify-between items-start">
                <h3 className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">{s.bmp280 ? 'ALTITUDE' : 'GPS ALTITUDE'}</h3>
                <Mountain className={`w-5 h-5 ${!isActive || displayData?.altitude == null ? 'text-gray-600' : 'text-vyoma-success'}`} />
              </div>
              {!isActive || displayData?.altitude == null ? (
                <div className="mt-auto">
                  <div className="text-2xl font-bold font-mono tracking-tight text-gray-500">
                    -- <span className="text-xs text-gray-600 ml-1">m</span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1 tracking-wider uppercase">SENSOR UNAVAILABLE</div>
                </div>
              ) : (
                <div className="mt-auto">
                  <div className="text-2xl font-bold font-mono tracking-tight text-vyoma-success">
                    {displayData.altitude.toFixed(1)} <span className="text-xs text-gray-400 ml-1">m</span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1 tracking-wider uppercase">{s.bmp280 ? 'BAROMETRIC' : 'GPS'}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* MQ-09 CARD */}
          {s.mq09 && (
            <div className={`glass-panel p-5 flex flex-col justify-between h-32 border ${!isActive || displayData?.mq09 == null ? 'border-gray-800' : 'border-vyoma-primary/20'}`}>
              <h3 className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">GAS CONCENTRATION <br/> MQ-09</h3>
              {!isActive || displayData?.mq09 == null ? (
                <div className="flex justify-between items-end mt-auto">
                  <div>
                    <div className="text-2xl font-bold font-mono tracking-tight text-gray-500">
                      -- <span className="text-xs text-gray-600 ml-1">ADC</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-gray-500 font-mono uppercase">STATUS</div>
                    <div className="text-xs font-bold font-mono tracking-wider text-gray-500">NO DATA</div>
                  </div>
                </div>
              ) : (
                (() => {
                  const val = displayData.mq09;
                  let color = 'text-vyoma-success';
                  let status = 'NORMAL';
                  if (val >= mq09Thresh.critical) { color = 'text-vyoma-critical'; status = 'CRITICAL'; }
                  else if (val >= mq09Thresh.high) { color = 'text-vyoma-warning'; status = 'HIGH'; }
                  else if (val < mq09Thresh.normal && val >= mq09Thresh.low) { color = 'text-green-400'; status = 'LOW'; }
                  
                  return (
                    <div className="flex justify-between items-end mt-auto">
                      <div>
                        <div className={`text-2xl font-bold font-mono tracking-tight ${color}`}>
                          {val.toFixed(0)} <span className="text-xs text-gray-400 ml-1">ADC</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-gray-500 font-mono uppercase">STATUS</div>
                        <div className={`text-xs font-bold font-mono tracking-wider ${color}`}>{status}</div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* MQ-135 CARD */}
          {s.mq135 && (
            <div className={`glass-panel p-5 flex flex-col justify-between h-32 border ${!isActive || displayData?.mq135 == null ? 'border-gray-800' : 'border-vyoma-primary/20'}`}>
              <h3 className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">GAS CONCENTRATION <br/> MQ-135</h3>
              {!isActive || displayData?.mq135 == null ? (
                <div className="flex justify-between items-end mt-auto">
                  <div>
                    <div className="text-2xl font-bold font-mono tracking-tight text-gray-500">
                      -- <span className="text-xs text-gray-600 ml-1">ADC</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-gray-500 font-mono uppercase">STATUS</div>
                    <div className="text-xs font-bold font-mono tracking-wider text-gray-500">NO DATA</div>
                  </div>
                </div>
              ) : (
                (() => {
                  const val = displayData.mq135;
                  let color = 'text-vyoma-success';
                  let status = 'NORMAL';
                  if (val >= mq135Thresh.critical) { color = 'text-vyoma-critical'; status = 'CRITICAL'; }
                  else if (val >= mq135Thresh.high) { color = 'text-vyoma-warning'; status = 'HIGH'; }
                  else if (val < mq135Thresh.normal && val >= mq135Thresh.low) { color = 'text-green-400'; status = 'LOW'; }
                  
                  return (
                    <div className="flex justify-between items-end mt-auto">
                      <div>
                        <div className={`text-2xl font-bold font-mono tracking-tight ${color}`}>
                          {val.toFixed(0)} <span className="text-xs text-gray-400 ml-1">ADC</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-gray-500 font-mono uppercase">STATUS</div>
                        <div className={`text-xs font-bold font-mono tracking-wider ${color}`}>{status}</div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* FLAME STATUS CARD */}
          {s.flame && (
            <div className={`glass-panel p-5 flex flex-col justify-between h-32 border ${!isActive ? 'border-gray-800' : (displayData?.flame === 1 ? 'border-vyoma-critical' : 'border-vyoma-primary/20')}`}>
              <h3 className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">FLAME STATUS</h3>
              {!isActive ? (
                <div className="mt-auto">
                  <div className="text-xl font-bold font-mono tracking-tight text-gray-500 flex items-center gap-2">
                    SENSOR UNAVAILABLE
                  </div>
                </div>
              ) : (
                <div className="mt-auto">
                  {displayData?.flame === 1 ? (
                    <div className="text-xl font-bold font-mono tracking-tight text-vyoma-critical flex items-center gap-2">
                      🔴 FLAME DETECTED
                    </div>
                  ) : (
                    <div className="text-xl font-bold font-mono tracking-tight text-vyoma-success flex items-center gap-2">
                      🟢 CLEAR
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: 3D Rocket + Gas/Orientation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[400px]">
          <Rocket3D roll={roll} pitch={pitch} yaw={yaw} />
        </div>
        
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 flex-1 flex flex-col gap-6 justify-center">
            <h3 className="text-xs font-mono text-gray-400 tracking-wider uppercase">Gas Monitoring</h3>
            {s.mq09 && (
              <GasIndicator label="MQ-9 (Gas/Smoke)" value={displayData?.mq09 ?? null} lowThresh={mq09Thresh.low} warnThresh={mq09Thresh.high} critThresh={mq09Thresh.critical} />
            )}
            {s.mq135 && (
              <GasIndicator label="MQ-135 (Gas/Air Qual)" value={displayData?.mq135 ?? null} lowThresh={mq135Thresh.low} warnThresh={mq135Thresh.high} critThresh={mq135Thresh.critical} />
            )}
            {!s.mq09 && !s.mq135 && (
              <div className="text-gray-500 font-mono text-sm">NO GAS SENSORS ENABLED</div>
            )}
          </div>
          
          <div className="glass-panel p-6 flex-1">
            <h3 className="text-xs font-mono text-gray-400 tracking-wider uppercase mb-4">Acceleration (IMU)</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-400 font-mono text-sm">X-AXIS</span><span className="font-mono text-vyoma-primary">{displayData?.accel_x?.toFixed(2) ?? '—'} g</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-400 font-mono text-sm">Y-AXIS</span><span className="font-mono text-vyoma-primary">{displayData?.accel_y?.toFixed(2) ?? '—'} g</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-400 font-mono text-sm">Z-AXIS</span><span className="font-mono text-vyoma-primary">{displayData?.accel_z?.toFixed(2) ?? '—'} g</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TelemetryChart data={isActive ? history : []} dataKey="altitude" title="Altitude Over Time" unit=" m" colors={['#06b6d4']} />
        <TelemetryChart data={isActive ? history : []} dataKey="velocity" title="Vertical Velocity Over Time" unit=" m/s" colors={['#f59e0b']} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TelemetryChart data={isActive ? history : []} dataKey={['accel_x', 'accel_y', 'accel_z']} title="Acceleration (X,Y,Z)" colors={['#ef4444', '#22c55e', '#3b82f6']} />
        <TelemetryChart data={isActive ? history : []} dataKey={['gyro_x', 'gyro_y', 'gyro_z']} title="Angular Velocity (X,Y,Z)" colors={['#ef4444', '#22c55e', '#3b82f6']} />
      </div>

      {/* Mission Events */}
      <MissionEvents />
    </div>
  );
}
