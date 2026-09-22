import React, { useState } from 'react';
import { api } from '../api';
import { useTelemetry } from '../context/TelemetryContext';
import { Settings as SettingsIcon, Save, RotateCcw, ShieldAlert, Cpu } from 'lucide-react';

export function Settings() {
  const { settings, refreshSettings } = useTelemetry();
  
  const [localSettings, setLocalSettings] = useState(
    settings.sensors ? settings : {
      mode: "SIMULATION",
      sensors: { dht22: true, mq09: true, mq135: false, flame: true, mpu6050: true, bmp280: false, gps: false, battery: false, lora: false, microsd: true, buzzer: true },
      network: { espIp: "192.168.4.1", port: 8080, telemetryInterval: 100, connectionTimeout: 5000 },
      pressure: { p0: 1013.25 },
      thresholds: { 
        mq09: { low: 200, normal: 300, high: 500, critical: 800 },
        mq135: { low: 200, normal: 300, high: 500, critical: 800 }
      }
    }
  );
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (category: string, key: string, value: any) => {
    if (category === 'root') {
      setLocalSettings({ ...localSettings, [key]: value });
    } else if (category === 'thresholds_mq09') {
      setLocalSettings({
        ...localSettings,
        thresholds: { ...localSettings.thresholds, mq09: { ...localSettings.thresholds.mq09, [key]: value } }
      });
    } else if (category === 'thresholds_mq135') {
      setLocalSettings({
        ...localSettings,
        thresholds: { ...localSettings.thresholds, mq135: { ...localSettings.thresholds.mq135, [key]: value } }
      });
    } else {
      setLocalSettings({
        ...localSettings,
        [category]: { ...localSettings[category as keyof typeof localSettings], [key]: value }
      });
    }
    setSuccess(false);
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await api.put('/settings', localSettings);
      await refreshSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const Checkbox = ({ id, label, checked, onChange, subtitle }: any) => (
    <div className="flex items-start gap-3 p-3 rounded hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-vyoma-primary/10" onClick={() => onChange(!checked)}>
      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-vyoma-primary border-vyoma-primary text-black' : 'border-gray-600 bg-black/40'}`}>
        {checked && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <div>
        <div className="text-sm font-bold text-gray-200">{label}</div>
        <div className="text-xs text-gray-500 font-mono mt-1">{subtitle}</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-4 border-b border-vyoma-primary/20 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-widest text-white flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-vyoma-primary" />
            SYSTEM CONFIGURATION
          </h2>
          <p className="text-gray-400 font-mono text-sm mt-1">Configure telemetry endpoints and sensor modules</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => { setLocalSettings(settings); setSuccess(false); }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded font-mono text-xs tracking-wider flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> REVERT
          </button>
          <button 
            onClick={saveSettings}
            disabled={loading}
            className="px-6 py-2 bg-vyoma-primary hover:bg-vyoma-primary/90 text-black font-bold rounded font-mono text-sm tracking-widest flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {loading ? 'SAVING...' : 'SAVE CONFIG'}
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-vyoma-success/20 border border-vyoma-success/50 text-vyoma-success px-4 py-3 rounded-lg text-sm font-mono flex items-center justify-center">
          Configuration saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Sensor Config */}
        <div className="glass-panel p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3 text-vyoma-primary border-b border-vyoma-primary/20 pb-3">
            <Cpu className="w-5 h-5" />
            <h3 className="font-bold tracking-widest">HARDWARE SENSORS</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="col-span-full text-xs text-gray-500 font-mono tracking-widest uppercase mb-2">Phase 1 (Current)</div>
            <Checkbox id="dht22" label="DHT22" subtitle="Temp & Humidity" checked={localSettings.sensors.dht22} onChange={(v:any) => handleChange('sensors', 'dht22', v)} />
            <Checkbox id="mpu6050" label="MPU6050" subtitle="IMU / Orientation" checked={localSettings.sensors.mpu6050} onChange={(v:any) => handleChange('sensors', 'mpu6050', v)} />
            <Checkbox id="flame" label="Flame Sensor" subtitle="IR Flame Detection" checked={localSettings.sensors.flame} onChange={(v:any) => handleChange('sensors', 'flame', v)} />
            <Checkbox id="mq09" label="MQ-09" subtitle="Combustibles / CO" checked={localSettings.sensors.mq09} onChange={(v:any) => handleChange('sensors', 'mq09', v)} />
            <Checkbox id="mq135" label="MQ-135" subtitle="Air Quality / NH3" checked={localSettings.sensors.mq135} onChange={(v:any) => handleChange('sensors', 'mq135', v)} />
            
            <div className="col-span-full text-xs text-gray-500 font-mono tracking-widest uppercase mb-2 mt-4">Phase 2 (Future)</div>
            <Checkbox id="bmp280" label="BMP280" subtitle="Barometric Altitude" checked={localSettings.sensors.bmp280} onChange={(v:any) => handleChange('sensors', 'bmp280', v)} />
            <Checkbox id="gps" label="GPS/GNSS" subtitle="Location Data" checked={localSettings.sensors.gps} onChange={(v:any) => handleChange('sensors', 'gps', v)} />
            <Checkbox id="battery" label="Battery Monitor" subtitle="Voltage Tracking" checked={localSettings.sensors.battery} onChange={(v:any) => handleChange('sensors', 'battery', v)} />
            <Checkbox id="lora" label="LoRa SX1278" subtitle="Long Range Telemetry" checked={localSettings.sensors.lora} onChange={(v:any) => handleChange('sensors', 'lora', v)} />
            <Checkbox id="microsd" label="Micro SD" subtitle="Telemetry Logging" checked={localSettings.sensors.microsd} onChange={(v:any) => handleChange('sensors', 'microsd', v)} />
            <Checkbox id="buzzer" label="Buzzer" subtitle="Local Alert" checked={localSettings.sensors.buzzer} onChange={(v:any) => handleChange('sensors', 'buzzer', v)} />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Dashboard Mode Config */}
          <div className="glass-panel p-6 flex flex-col gap-6">
            <h3 className="font-bold tracking-widest text-vyoma-primary border-b border-vyoma-primary/20 pb-3">DASHBOARD MODE</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => handleChange('root', 'mode', 'LIVE')}
                className={`flex-1 py-3 px-4 rounded border flex items-center justify-center gap-2 font-mono font-bold tracking-widest transition-colors ${localSettings.mode === 'LIVE' ? 'bg-vyoma-success/20 border-vyoma-success text-vyoma-success' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
              >
                <span className={`w-2 h-2 rounded-full ${localSettings.mode === 'LIVE' ? 'bg-vyoma-success animate-pulse' : 'bg-transparent'}`}></span>
                LIVE MODE
              </button>
              <button 
                onClick={() => handleChange('root', 'mode', 'SIMULATION')}
                className={`flex-1 py-3 px-4 rounded border flex items-center justify-center gap-2 font-mono font-bold tracking-widest transition-colors ${localSettings.mode === 'SIMULATION' ? 'bg-vyoma-warning/20 border-vyoma-warning text-vyoma-warning' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
              >
                <span className={`w-2 h-2 rounded-full ${localSettings.mode === 'SIMULATION' ? 'bg-vyoma-warning' : 'bg-transparent'}`}></span>
                SIMULATION MODE
              </button>
            </div>
          </div>
          {/* Network Config */}
          <div className="glass-panel p-6 flex flex-col gap-6">
            <h3 className="font-bold tracking-widest text-vyoma-primary border-b border-vyoma-primary/20 pb-3">SYSTEM PARAMETERS</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2 tracking-widest">SEA-LEVEL PRESSURE (P0)</label>
                <input 
                  type="number" 
                  value={localSettings.pressure?.p0 || 1013.25} 
                  onChange={(e) => handleChange('pressure', 'p0', Number(e.target.value))}
                  className="w-full bg-black/50 border border-vyoma-primary/30 rounded px-4 py-2 text-white font-mono focus:border-vyoma-primary outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Reference hPa for altitude.</p>
              </div>
            </div>

            <h3 className="font-bold tracking-widest text-vyoma-primary border-b border-vyoma-primary/20 pb-3 mt-2">NETWORK INTERFACE</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2 tracking-widest">ESP8266 IP</label>
                <input 
                  type="text" 
                  value={localSettings.network?.espIp || ''} 
                  onChange={(e) => handleChange('network', 'espIp', e.target.value)}
                  className="w-full bg-black/50 border border-vyoma-primary/30 rounded px-4 py-2 text-white font-mono focus:border-vyoma-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2 tracking-widest">PORT</label>
                <input 
                  type="number" 
                  value={localSettings.network?.port || 8080} 
                  onChange={(e) => handleChange('network', 'port', Number(e.target.value))}
                  className="w-full bg-black/50 border border-vyoma-primary/30 rounded px-4 py-2 text-white font-mono focus:border-vyoma-primary outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2 tracking-widest">TELEMETRY INTERVAL (ms)</label>
                <input 
                  type="number" 
                  value={localSettings.network?.telemetryInterval || 100} 
                  onChange={(e) => handleChange('network', 'telemetryInterval', Number(e.target.value))}
                  className="w-full bg-black/50 border border-vyoma-primary/30 rounded px-4 py-2 text-white font-mono focus:border-vyoma-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2 tracking-widest">TIMEOUT (ms)</label>
                <input 
                  type="number" 
                  value={localSettings.network?.connectionTimeout || 5000} 
                  onChange={(e) => handleChange('network', 'connectionTimeout', Number(e.target.value))}
                  className="w-full bg-black/50 border border-vyoma-primary/30 rounded px-4 py-2 text-white font-mono focus:border-vyoma-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Gas Thresholds */}
          <div className="glass-panel p-6 flex flex-col gap-6 border-vyoma-warning/30">
            <div className="flex items-center gap-3 text-vyoma-warning border-b border-vyoma-warning/20 pb-3">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold tracking-widest">GAS THRESHOLDS</h3>
            </div>
            
            <div className="mb-4">
              <h4 className="text-xs text-gray-400 font-mono tracking-widest mb-3">MQ-09 (CO / LPG)</h4>
              <div className="grid grid-cols-4 gap-2">
                <div><label className="block text-[10px] text-gray-500 font-mono mb-1">LOW</label><input type="number" value={localSettings.thresholds?.mq09?.low || 0} onChange={(e) => handleChange('thresholds_mq09', 'low', Number(e.target.value))} className="w-full bg-black/50 border border-vyoma-success/30 rounded px-2 py-1 text-white font-mono text-sm" /></div>
                <div><label className="block text-[10px] text-gray-500 font-mono mb-1">NORMAL</label><input type="number" value={localSettings.thresholds?.mq09?.normal || 0} onChange={(e) => handleChange('thresholds_mq09', 'normal', Number(e.target.value))} className="w-full bg-black/50 border border-vyoma-primary/30 rounded px-2 py-1 text-white font-mono text-sm" /></div>
                <div><label className="block text-[10px] text-gray-500 font-mono mb-1">HIGH</label><input type="number" value={localSettings.thresholds?.mq09?.high || 0} onChange={(e) => handleChange('thresholds_mq09', 'high', Number(e.target.value))} className="w-full bg-black/50 border border-vyoma-warning/30 rounded px-2 py-1 text-white font-mono text-sm" /></div>
                <div><label className="block text-[10px] text-gray-500 font-mono mb-1">CRIT</label><input type="number" value={localSettings.thresholds?.mq09?.critical || 0} onChange={(e) => handleChange('thresholds_mq09', 'critical', Number(e.target.value))} className="w-full bg-black/50 border border-vyoma-critical/30 rounded px-2 py-1 text-white font-mono text-sm" /></div>
              </div>
            </div>

            <div>
              <h4 className="text-xs text-gray-400 font-mono tracking-widest mb-3">MQ-135 (NH3 / Air)</h4>
              <div className="grid grid-cols-4 gap-2">
                <div><label className="block text-[10px] text-gray-500 font-mono mb-1">LOW</label><input type="number" value={localSettings.thresholds?.mq135?.low || 0} onChange={(e) => handleChange('thresholds_mq135', 'low', Number(e.target.value))} className="w-full bg-black/50 border border-vyoma-success/30 rounded px-2 py-1 text-white font-mono text-sm" /></div>
                <div><label className="block text-[10px] text-gray-500 font-mono mb-1">NORMAL</label><input type="number" value={localSettings.thresholds?.mq135?.normal || 0} onChange={(e) => handleChange('thresholds_mq135', 'normal', Number(e.target.value))} className="w-full bg-black/50 border border-vyoma-primary/30 rounded px-2 py-1 text-white font-mono text-sm" /></div>
                <div><label className="block text-[10px] text-gray-500 font-mono mb-1">HIGH</label><input type="number" value={localSettings.thresholds?.mq135?.high || 0} onChange={(e) => handleChange('thresholds_mq135', 'high', Number(e.target.value))} className="w-full bg-black/50 border border-vyoma-warning/30 rounded px-2 py-1 text-white font-mono text-sm" /></div>
                <div><label className="block text-[10px] text-gray-500 font-mono mb-1">CRIT</label><input type="number" value={localSettings.thresholds?.mq135?.critical || 0} onChange={(e) => handleChange('thresholds_mq135', 'critical', Number(e.target.value))} className="w-full bg-black/50 border border-vyoma-critical/30 rounded px-2 py-1 text-white font-mono text-sm" /></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
