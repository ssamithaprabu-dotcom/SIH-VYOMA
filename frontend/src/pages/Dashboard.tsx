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

      {/* Sensor Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {s.dht22 && (
          <>
            <SensorCard title="Temperature" value={displayData?.temperature} unit="°C" icon={<Thermometer className="w-5 h-5"/>} />
            <SensorCard title="Humidity" value={displayData?.humidity} unit="%" icon={<Droplets className="w-5 h-5"/>} />
          </>
        )}
        {s.bmp280 && (
          <SensorCard title="Baro Altitude" value={displayData?.altitude !== null ? displayData?.altitude : undefined} unit="m" icon={<Mountain className="w-5 h-5"/>} status={!rocketConnected ? 'unavailable' : 'normal'} />
        )}
        {s.gps && (
          <SensorCard title="GPS Altitude" value={displayData?.gps_lat !== null ? displayData?.altitude : undefined} unit="m" icon={<Mountain className="w-5 h-5"/>} status={!rocketConnected ? 'unavailable' : 'normal'} />
        )}
        {(!s.bmp280 && !s.gps && s.mpu6050) && (
          <SensorCard title="Altitude" value={undefined} unit="m" icon={<Mountain className="w-5 h-5"/>} status={!rocketConnected ? 'unavailable' : 'unavailable'} subLabel="SENSOR UNAVAILABLE" />
        )}
        {s.mpu6050 && (
          <SensorCard title="Vertical Velocity" value={displayData?.velocity !== null ? displayData?.velocity : undefined} unit="m/s" icon={<Gauge className="w-5 h-5"/>} />
        )}
        {s.battery && (
          <SensorCard title="Battery" value={displayData?.battery} unit="V" icon={<Battery className="w-5 h-5"/>} />
        )}
        {s.gps && (
          <SensorCard title="GPS Sats" value={displayData?.gps_sats} icon={<MapPin className="w-5 h-5"/>} />
        )}
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
