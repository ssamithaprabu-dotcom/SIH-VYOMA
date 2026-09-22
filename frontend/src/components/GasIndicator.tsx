import React from 'react';

interface GasIndicatorProps {
  label: string;
  value: number | null;
  lowThresh: number;
  warnThresh: number;
  critThresh: number;
}

export function GasIndicator({ label, value, lowThresh, warnThresh, critThresh }: GasIndicatorProps) {
  if (value === null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <span className="text-xs font-mono text-gray-400">{label}</span>
          <span className="text-sm font-bold text-gray-500">UNAVAILABLE</span>
        </div>
        <div className="h-2 w-full bg-gray-800 rounded-full" />
      </div>
    );
  }

  let statusText = 'LOW';
  let colorClass = 'bg-green-500';
  let textClass = 'text-green-500';
  
  if (value >= critThresh) {
    statusText = 'CRITICAL';
    colorClass = 'bg-red-500';
    textClass = 'text-red-500 text-glow-critical';
  } else if (value >= warnThresh) {
    statusText = 'HIGH';
    colorClass = 'bg-amber-500';
    textClass = 'text-amber-500';
  } else if (value >= lowThresh) {
    statusText = 'NORMAL';
    colorClass = 'bg-cyan-400';
    textClass = 'text-cyan-400';
  }

  // Calculate percentage for the bar (cap at 100%)
  const maxScale = critThresh * 1.5; // just for visual scaling
  const pct = Math.min(100, Math.max(0, (value / maxScale) * 100));

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-end">
        <span className="text-xs font-mono text-gray-400 tracking-wider">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-bold tracking-widest ${textClass}`}>{statusText}</span>
          <span className="text-xs text-gray-500 font-mono">({value})</span>
        </div>
      </div>
      
      {/* Gauge Bar */}
      <div className="relative h-2 w-full bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full ${colorClass} transition-all duration-300 ease-out`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
      
      {/* Threshold markers */}
      <div className="relative w-full h-4 mt-1">
        <div className="absolute top-0 w-px h-2 bg-gray-600" style={{ left: `${(lowThresh / maxScale) * 100}%` }} />
        <div className="absolute top-0 w-px h-2 bg-gray-500" style={{ left: `${(warnThresh / maxScale) * 100}%` }} />
        <div className="absolute top-0 w-px h-2 bg-gray-400" style={{ left: `${(critThresh / maxScale) * 100}%` }} />
      </div>
    </div>
  );
}
