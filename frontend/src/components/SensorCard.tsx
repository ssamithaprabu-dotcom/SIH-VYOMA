import React from 'react';

interface SensorCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  icon: React.ReactNode;
  status?: 'normal' | 'warning' | 'critical' | 'unavailable';
  subLabel?: string;
}

export function SensorCard({ title, value, unit, icon, status = 'normal', subLabel }: SensorCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'warning': return 'text-vyoma-warning';
      case 'critical': return 'text-vyoma-critical';
      case 'unavailable': return 'text-gray-500';
      case 'normal':
      default: return 'text-vyoma-success';
    }
  };

  const getStatusBorder = () => {
    switch (status) {
      case 'warning': return 'border-vyoma-warning/30';
      case 'critical': return 'border-vyoma-critical/30';
      case 'unavailable': return 'border-gray-800';
      case 'normal':
      default: return 'border-vyoma-primary/20';
    }
  };

  return (
    <div className={`glass-panel p-5 flex flex-col justify-between h-32 border ${getStatusBorder()} transition-colors`}>
      <div className="flex justify-between items-start">
        <h3 className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">{title}</h3>
        <div className={`opacity-80 ${getStatusColor()}`}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-1 mt-auto">
        {status === 'unavailable' ? (
          <span className="text-sm text-gray-500 font-mono tracking-widest uppercase">Unavailable</span>
        ) : (
          <>
            <span className={`text-2xl font-bold font-mono tracking-tight ${getStatusColor()}`}>
              {(value === undefined || value === null || value === '') ? '—' : value}
            </span>
            {unit && <span className="text-xs text-gray-400 font-mono ml-1">{unit}</span>}
          </>
        )}
      </div>
      
      {subLabel && (
        <div className="text-[9px] text-gray-500 font-mono mt-1 tracking-wider uppercase">
          {subLabel}
        </div>
      )}
    </div>
  );
}
