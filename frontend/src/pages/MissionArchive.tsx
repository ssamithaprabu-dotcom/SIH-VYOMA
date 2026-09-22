import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { Archive, Download, Eye, X, Search, Filter } from 'lucide-react';
import { TelemetryChart } from '../components/TelemetryChart';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export function MissionArchive() {
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest');

  // Modal State
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [missionReport, setMissionReport] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const data = await api.get('/missions');
      setMissions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (missionName: string) => {
    if (!reportRef.current) return;
    
    // We create a loading overlay or just wait
    const originalStyle = reportRef.current.style.cssText;
    
    try {
      // Temporarily adjust styles for PDF generation if needed
      reportRef.current.style.backgroundColor = '#0b0f19'; // vyoma-dark
      reportRef.current.style.padding = '20px';
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Higher quality
        backgroundColor: '#0b0f19',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      pdf.save(`${missionName.replace(/\s+/g, '_')}_report.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      if (reportRef.current) reportRef.current.style.cssText = originalStyle;
    }
  };

  const openMissionView = async (mission: any) => {
    setSelectedMission(mission);
    setLoadingDetails(true);
    setMissionReport(null);
    
    try {
      const report = await api.get(`/reports/${mission.id}/data`);
      setMissionReport(report);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeMissionView = () => {
    setSelectedMission(null);
    setMissionReport(null);
  };

  const filteredMissions = missions
    .filter(m => {
      const q = search.toLowerCase();
      const matchesSearch = (m.id && m.id.toLowerCase().includes(q)) || 
                            (m.name && m.name.toLowerCase().includes(q)) || 
                            (m.operator && m.operator.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      if (sortOrder === 'oldest') return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      if (sortOrder === 'altitude') return (b.max_altitude || 0) - (a.max_altitude || 0);
      if (sortOrder === 'velocity') return (b.max_velocity || 0) - (a.max_velocity || 0);
      return 0;
    });

  const kpis = {
    total: missions.length,
    completed: missions.filter(m => m.status === 'COMPLETED' || m.status === 'LANDED').length,
    running: missions.filter(m => !['COMPLETED', 'ABORTED', 'LANDED', 'IDLE'].includes(m.status)).length,
    aborted: missions.filter(m => m.status === 'ABORTED').length
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-mono tracking-widest">LOADING ARCHIVE...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-10">
      
      {/* Header & KPIs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-widest text-white flex items-center gap-3 mb-1">
            <Archive className="w-6 h-6 text-vyoma-primary" />
            MISSION ARCHIVE
          </h2>
          <p className="text-gray-400 font-mono text-sm">Archive, analyze and generate reports for all recorded missions.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="glass-panel px-4 py-2 text-center min-w-[100px]">
            <div className="text-[10px] text-gray-500 font-mono tracking-widest mb-1">TOTAL MISSIONS</div>
            <div className="text-xl font-bold text-white">{kpis.total}</div>
          </div>
          <div className="glass-panel px-4 py-2 text-center min-w-[100px] border-vyoma-success/30">
            <div className="text-[10px] text-vyoma-success/70 font-mono tracking-widest mb-1">COMPLETED</div>
            <div className="text-xl font-bold text-vyoma-success">{kpis.completed}</div>
          </div>
          <div className="glass-panel px-4 py-2 text-center min-w-[100px] border-vyoma-primary/30">
            <div className="text-[10px] text-vyoma-primary/70 font-mono tracking-widest mb-1">RUNNING</div>
            <div className="text-xl font-bold text-vyoma-primary">{kpis.running}</div>
          </div>
          <div className="glass-panel px-4 py-2 text-center min-w-[100px] border-vyoma-critical/30">
            <div className="text-[10px] text-vyoma-critical/70 font-mono tracking-widest mb-1">ABORTED</div>
            <div className="text-xl font-bold text-vyoma-critical">{kpis.aborted}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <Search className="w-5 h-5 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by ID, Name, or Operator..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-white font-mono w-full text-sm"
          />
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/50 border border-vyoma-primary/30 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-vyoma-primary outline-none"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="IDLE">IDLE</option>
              <option value="ASCENT">ASCENT</option>
              <option value="APOGEE">APOGEE</option>
              <option value="DESCENT">DESCENT</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="LANDED">LANDED</option>
              <option value="ABORTED">ABORTED</option>
            </select>
          </div>
          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-black/50 border border-vyoma-primary/30 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-vyoma-primary outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="altitude">Highest Altitude</option>
            <option value="velocity">Highest Velocity</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-x-auto">
        {filteredMissions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4">
            <div className="text-gray-500 font-mono tracking-widest text-lg uppercase">NO MISSION RECORDS</div>
            <div className="text-gray-500 font-mono text-xs mb-2">Start a new mission to begin recording telemetry.</div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-vyoma-primary/20 text-[10px] text-gray-500 font-mono tracking-wider uppercase">
                <th className="p-4 font-normal">Mission ID / Status</th>
                <th className="p-4 font-normal">Mission Name</th>
                <th className="p-4 font-normal">Start Time / Duration</th>
                <th className="p-4 font-normal">Max Alt</th>
                <th className="p-4 font-normal">Max Vel</th>
                <th className="p-4 font-normal">Max Accel</th>
                <th className="p-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMissions.map((m) => {
                const isRunning = !['COMPLETED', 'ABORTED', 'LANDED', 'IDLE'].includes(m.status);
                const durationMins = m.duration_sec ? Math.floor(m.duration_sec / 60) : 0;
                const durationSecs = m.duration_sec ? Math.floor(m.duration_sec % 60) : 0;
                const durationStr = m.duration_sec ? `${durationMins.toString().padStart(2, '0')}:${durationSecs.toString().padStart(2, '0')}` : '--';

                return (
                  <tr key={m.id} className="border-b border-vyoma-primary/10 hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <div className="font-mono text-xs text-white">{m.id}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-vyoma-success animate-pulse"></span>}
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${isRunning ? 'text-vyoma-success' : 'text-gray-500'}`}>
                          {isRunning ? `🟢 CURRENT MISSION (${m.status})` : m.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-sm text-gray-200">{m.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono tracking-wider mt-1 uppercase">OP: {m.operator || 'Unknown'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-xs text-gray-300">{new Date(m.start_time).toLocaleString()}</div>
                      <div className="text-[10px] text-vyoma-primary font-mono tracking-wider mt-1">{durationStr}</div>
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-300">{typeof m.max_altitude === 'number' ? `${m.max_altitude.toFixed(1)} m` : '--'}</td>
                    <td className="p-4 font-mono text-xs text-gray-300">{typeof m.max_velocity === 'number' ? `${m.max_velocity.toFixed(1)} m/s` : '--'}</td>
                    <td className="p-4 font-mono text-xs text-gray-300">{typeof m.max_acceleration === 'number' ? `${m.max_acceleration.toFixed(2)} g` : '--'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openMissionView(m)}
                          className="px-3 py-1.5 bg-vyoma-primary/10 text-vyoma-primary hover:bg-vyoma-primary hover:text-black rounded text-[10px] font-mono font-bold tracking-widest uppercase transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> VIEW
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal overlay */}
      {selectedMission && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-end">
          <div className="w-full max-w-4xl bg-vyoma-dark border-l border-vyoma-primary/30 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right-8 duration-300">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-vyoma-panel border-b border-vyoma-primary/20 p-6 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white tracking-widest mb-1">{selectedMission.name}</h3>
                <div className="text-xs text-gray-400 font-mono tracking-wider">
                  REPORT PREVIEW • {selectedMission.id}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleDownloadPdf(selectedMission.name)}
                  disabled={loadingDetails}
                  className="px-4 py-2 bg-vyoma-primary/10 text-vyoma-primary border border-vyoma-primary/30 hover:bg-vyoma-primary hover:text-black rounded text-xs font-mono font-bold tracking-widest uppercase transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> DOWNLOAD PDF
                </button>
                <button onClick={closeMissionView} className="text-gray-500 hover:text-white transition-colors p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content - THIS IS THE PDF TARGET */}
            <div ref={reportRef} className="p-8 flex flex-col gap-8 bg-vyoma-dark">
              {loadingDetails || !missionReport ? (
                <div className="p-12 text-center text-vyoma-primary font-mono tracking-widest animate-pulse">GENERATING REPORT...</div>
              ) : (
                <>
                  {/* VYOMA HEADER */}
                  <div className="border-b-2 border-vyoma-primary/50 pb-6 mb-2">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h1 className="text-3xl font-bold text-white tracking-widest">VYOMA</h1>
                        <div className="text-sm text-vyoma-primary font-mono tracking-wider uppercase">Mission Report</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-sm text-gray-300">Generated: {new Date().toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-1 uppercase">MODE: {missionReport.mode}</div>
                      </div>
                    </div>
                    
                    {/* MISSION INFORMATION */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Mission Name</div>
                        <div className="text-sm font-bold text-white">{missionReport.missionInfo.name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Mission ID</div>
                        <div className="text-sm font-bold text-white">{missionReport.missionInfo.id}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Operator</div>
                        <div className="text-sm font-bold text-white">{missionReport.missionInfo.operator || 'Unknown'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Status</div>
                        <div className={`text-sm font-bold ${missionReport.missionInfo.status === 'ABORTED' ? 'text-vyoma-critical' : 'text-vyoma-success'}`}>{missionReport.missionInfo.status}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Start Time</div>
                        <div className="text-sm text-gray-300">{new Date(missionReport.missionInfo.start_time).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono mb-1 uppercase">End Time</div>
                        <div className="text-sm text-gray-300">{missionReport.missionInfo.end_time ? new Date(missionReport.missionInfo.end_time).toLocaleString() : '--'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono mb-1 uppercase">Time of Flight</div>
                        <div className="text-sm text-gray-300 font-mono">{missionReport.flightSummary.flightTime.toFixed(1)} s</div>
                      </div>
                    </div>
                  </div>

                  {/* FLIGHT SUMMARY & ENVIRONMENTAL */}
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-widest uppercase mb-4 border-b border-white/10 pb-2">Flight Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="glass-panel p-4 border-l-2 border-vyoma-primary">
                        <div className="text-[9px] text-gray-500 font-mono mb-1">MAX ALTITUDE</div>
                        <div className="text-lg font-bold text-white font-mono">{missionReport.flightSummary.maxAltitude?.toFixed(1) ?? '--'} <span className="text-xs text-gray-500">m</span></div>
                      </div>
                      <div className="glass-panel p-4 border-l-2 border-vyoma-primary">
                        <div className="text-[9px] text-gray-500 font-mono mb-1">MAX VELOCITY</div>
                        <div className="text-lg font-bold text-white font-mono">{missionReport.flightSummary.maxVelocity?.toFixed(1) ?? '--'} <span className="text-xs text-gray-500">m/s</span></div>
                      </div>
                      <div className="glass-panel p-4 border-l-2 border-vyoma-primary">
                        <div className="text-[9px] text-gray-500 font-mono mb-1">MAX ACCEL</div>
                        <div className="text-lg font-bold text-white font-mono">{missionReport.flightSummary.maxAccel?.toFixed(2) ?? '--'} <span className="text-xs text-gray-500">g</span></div>
                      </div>
                      <div className="glass-panel p-4 border-l-2 border-vyoma-primary">
                        <div className="text-[9px] text-gray-500 font-mono mb-1">MAX ANGULAR VEL</div>
                        <div className="text-lg font-bold text-white font-mono">{missionReport.flightSummary.maxGyro?.toFixed(0) ?? '--'} <span className="text-xs text-gray-500">°/s</span></div>
                      </div>
                      
                      <div className="glass-panel p-4">
                        <div className="text-[9px] text-gray-500 font-mono mb-1">TEMPERATURE (MIN/MAX)</div>
                        <div className="text-sm font-bold text-white font-mono">
                          {missionReport.sensorStatus.dht22 === false ? <span className="text-gray-500">Sensor Not Available</span> : 
                           `${missionReport.environmentalData.minTemp ?? '--'} / ${missionReport.environmentalData.maxTemp ?? '--'} °C`}
                        </div>
                      </div>
                      <div className="glass-panel p-4">
                        <div className="text-[9px] text-gray-500 font-mono mb-1">HUMIDITY (MIN/MAX)</div>
                        <div className="text-sm font-bold text-white font-mono">
                           {missionReport.sensorStatus.dht22 === false ? <span className="text-gray-500">Sensor Not Available</span> : 
                           `${missionReport.environmentalData.minHum ?? '--'} / ${missionReport.environmentalData.maxHum ?? '--'} %`}
                        </div>
                      </div>
                      <div className="glass-panel p-4">
                        <div className="text-[9px] text-gray-500 font-mono mb-1">GAS (MQ09/MQ135 PEAK)</div>
                        <div className="text-sm font-bold text-vyoma-warning font-mono">
                           {missionReport.gasData.mq09_max ?? '--'} / {missionReport.gasData.mq135_max ?? '--'}
                        </div>
                        <div className="text-[8px] text-gray-500 mt-1 uppercase">Raw ADC / Uncalibrated</div>
                      </div>
                      <div className="glass-panel p-4 border-vyoma-critical/30">
                        <div className="text-[9px] text-vyoma-critical/80 font-mono mb-1">FLAME DETECTIONS</div>
                        <div className="text-lg font-bold text-vyoma-critical font-mono">
                           {missionReport.sensorStatus.flame === false ? <span className="text-gray-500 text-xs">Not Available</span> : missionReport.flameData.events}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Graphs */}
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-widest uppercase mb-4 border-b border-white/10 pb-2">Telemetry Graphs</h4>
                    {missionReport.telemetry.length === 0 ? (
                      <div className="glass-panel p-8 text-center text-gray-500 font-mono text-sm">NO TELEMETRY DATA RECORDED</div>
                    ) : (
                      <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <TelemetryChart data={missionReport.telemetry} dataKey="altitude" title="Altitude Over Time" unit=" m" colors={['#06b6d4']} />
                          <TelemetryChart data={missionReport.telemetry} dataKey="velocity" title="Vertical Velocity Over Time" unit=" m/s" colors={['#f59e0b']} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <TelemetryChart data={missionReport.telemetry} dataKey={['accel_x', 'accel_y', 'accel_z']} title="Acceleration (X,Y,Z)" colors={['#ef4444', '#22c55e', '#3b82f6']} />
                          <TelemetryChart data={missionReport.telemetry} dataKey={['gyro_x', 'gyro_y', 'gyro_z']} title="Angular Velocity (X,Y,Z)" colors={['#ef4444', '#22c55e', '#3b82f6']} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {missionReport.sensorStatus.dht22 !== false && <TelemetryChart data={missionReport.telemetry} dataKey="temperature" title="Temperature" unit=" °C" colors={['#ef4444']} />}
                          {(missionReport.sensorStatus.mq09 !== false || missionReport.sensorStatus.mq135 !== false) && 
                            <TelemetryChart data={missionReport.telemetry} dataKey={['mq09', 'mq135']} title="Gas Levels (Uncalibrated ADC)" colors={['#f59e0b', '#3b82f6']} />
                          }
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Timeline */}
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-widest uppercase mb-4 border-b border-white/10 pb-2">Mission Events Timeline</h4>
                    <div className="glass-panel p-6 font-mono text-sm">
                       <div className="flex gap-4 mb-3 pb-3 border-b border-white/5">
                          <span className="text-gray-500 w-24 shrink-0">{new Date(missionReport.missionInfo.start_time).toLocaleTimeString()}</span>
                          <span className="text-vyoma-primary font-bold">Mission started</span>
                       </div>
                       
                       {missionReport.missionEvents.map((alert: any) => (
                         <div key={alert.id} className="flex gap-4 mb-3 pb-3 border-b border-white/5">
                            <span className="text-gray-500 w-24 shrink-0">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                            <span className={alert.severity === 'CRITICAL' ? 'text-vyoma-critical font-bold' : 'text-vyoma-warning font-bold'}>
                              [{alert.severity}] {alert.sensor}: {alert.message}
                            </span>
                         </div>
                       ))}

                       {missionReport.missionInfo.end_time && (
                         <div className="flex gap-4">
                            <span className="text-gray-500 w-24 shrink-0">{new Date(missionReport.missionInfo.end_time).toLocaleTimeString()}</span>
                            <span className="text-vyoma-primary font-bold">Mission ended (Final Status: {missionReport.missionInfo.status})</span>
                         </div>
                       )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
