import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface TelemetryChartProps {
  data: any[];
  dataKey: string | string[];
  title: string;
  colors?: string[];
  unit?: string;
}

export function TelemetryChart({ data, dataKey, title, colors = ['#06b6d4'], unit = '' }: TelemetryChartProps) {
  const keys = Array.isArray(dataKey) ? dataKey : [dataKey];
  const [timeRange, setTimeRange] = useState<number>(0); // 0 means all

  const filteredData = useMemo(() => {
    if (!timeRange || data.length === 0) return data;
    const now = Date.now();
    return data.filter(d => now - Number(d.timestamp) <= timeRange * 1000);
  }, [data, timeRange]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    let current = null;
    
    // We only calculate stats for the first key for simplicity if multiple
    const key = keys[0];
    
    for (const p of filteredData) {
      const v = Number(p[key]);
      if (isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
      current = v; // latest
    }
    
    if (min === Infinity) return null;
    return { min, max, current };
  }, [filteredData, keys]);

  return (
    <div className="glass-panel p-4 flex flex-col h-72">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xs font-mono text-gray-400 tracking-wider uppercase">{title}</h3>
          {stats && (
            <div className="flex gap-4 mt-2">
              <div className="text-[10px] font-mono text-gray-500">MIN <span className="text-gray-300 ml-1">{stats.min.toFixed(1)}{unit}</span></div>
              <div className="text-[10px] font-mono text-gray-500">MAX <span className="text-gray-300 ml-1">{stats.max.toFixed(1)}{unit}</span></div>
              <div className="text-[10px] font-mono text-gray-500">CUR <span className="text-vyoma-primary ml-1">{stats.current?.toFixed(1)}{unit}</span></div>
            </div>
          )}
        </div>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="bg-black/40 border border-gray-700 text-xs font-mono text-gray-400 rounded px-2 py-1 outline-none"
        >
          <option value={10}>10s</option>
          <option value={30}>30s</option>
          <option value={60}>1m</option>
          <option value={300}>5m</option>
          <option value={0}>All</option>
        </select>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(t) => new Date(t).toLocaleTimeString()}
              stroke="#4b5563"
              fontSize={10}
              tickMargin={8}
            />
            <YAxis 
              stroke="#4b5563"
              fontSize={10}
              tickFormatter={(val) => `${val}${unit}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#101722', borderColor: '#06b6d440', fontSize: '12px' }}
              labelFormatter={(label) => new Date(label).toLocaleTimeString()}
              itemStyle={{ color: '#fff' }}
            />
            {keys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
