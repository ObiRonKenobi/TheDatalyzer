import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Database } from 'lucide-react';
import { DataPoint, ChartConfig } from '../types';

interface ChartViewProps {
  data: DataPoint[];
  config: ChartConfig;
}

const ChartView: React.FC<ChartViewProps> = ({ data, config }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 font-medium gap-4">
        <div className="w-12 h-12 border-2 border-slate-800 rounded-xl flex items-center justify-center">
          <Database className="w-6 h-6 opacity-20" />
        </div>
        <p className="text-sm tracking-wide uppercase font-black italic">No Data Stream Detected</p>
      </div>
    );
  }

  const formatYAxis = (value: number) => {
    if (value >= 1000000000000) return `${(value / 1000000000000).toFixed(1)}T`;
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    return value.toLocaleString();
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 }
    };

    const gridColor = "#1e293b"; // slate-800
    const textColor = "#64748b"; // slate-500
    const tooltipBg = "#0f172a"; // slate-900
    const tooltipBorder = "#1e293b"; // slate-800

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">YEAR: {label}</p>
            <div className="space-y-1.5">
              {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[11px] font-bold text-slate-300 uppercase">{entry.name}</span>
                  </div>
                  <span className="text-[11px] font-mono font-black text-white">{formatYAxis(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return null;
    };

    const hasRightAxis = config.series.some(s => s.yAxisId === 'right');

    switch (config.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis 
              dataKey="year" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
              tickFormatter={formatYAxis}
              dx={-10}
            />
            {hasRightAxis && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
                tickFormatter={formatYAxis}
                dx={10}
              />
            )}
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
            {config.series.map(s => (
              <Bar 
                key={s.key} 
                dataKey={s.key} 
                name={s.name} 
                fill={s.color} 
                radius={[4, 4, 0, 0]} 
                yAxisId={s.yAxisId || 'left'}
              />
            ))}
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              {config.series.map(s => (
                <linearGradient key={`grad-${s.key}`} id={`color-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis 
              dataKey="year" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
              tickFormatter={formatYAxis}
              dx={-10}
            />
            {hasRightAxis && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
                tickFormatter={formatYAxis}
                dx={10}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
            {config.series.map(s => (
              <Area 
                key={s.key}
                type="monotone" 
                dataKey={s.key} 
                name={s.name}
                stroke={s.color} 
                fillOpacity={1} 
                fill={`url(#color-${s.key})`} 
                strokeWidth={3} 
                animationDuration={1500}
                yAxisId={s.yAxisId || 'left'}
              />
            ))}
          </AreaChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis 
              dataKey="year" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
              tickFormatter={formatYAxis}
              dx={-10}
            />
            {hasRightAxis && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
                tickFormatter={formatYAxis}
                dx={10}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
            {config.series.map(s => (
              <Line 
                key={s.key}
                type="monotone" 
                dataKey={s.key} 
                name={s.name}
                stroke={s.color} 
                strokeWidth={4} 
                dot={false} 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }} 
                animationDuration={1500}
                yAxisId={s.yAxisId || 'left'}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartView;
