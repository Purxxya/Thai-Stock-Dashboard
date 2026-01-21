
import React, { useMemo } from 'react';
import { 
  ComposedChart, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  ReferenceArea, 
  Line,
  Cell
} from 'recharts';
import { HistoryItem } from '../types';

interface StockChartProps {
  data: HistoryItem[];
  color: string;
  prevClose: number;
  viewType: 'line' | 'candle';
}

const StockChart: React.FC<StockChartProps> = ({ data, color, prevClose, viewType }) => {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      body: [item.open ?? item.price, item.close ?? item.price],
      wick: [item.low ?? item.price, item.high ?? item.price],
    }));
  }, [data]);

  const getInterval = () => {
    if (data.length <= 15) return 0;
    if (data.length <= 40) return 4;
    return 10;
  };

  const lunchPoints = data.filter(d => d.isLunch);
  const lunchStart = lunchPoints.length > 0 ? lunchPoints[0].time : null;
  const lunchEnd = lunchPoints.length > 0 ? lunchPoints[lunchPoints.length - 1].time : null;

  return (
    <div className="h-[400px] w-full mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" opacity={0.5} />
          
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
            interval={getInterval()}
          />
          
          <YAxis 
            yAxisId="price"
            domain={['auto', 'auto']} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
            orientation="right"
          />

          <YAxis 
            yAxisId="volume"
            domain={[0, (data: any) => Math.max(...data.map((d: any) => d.volume || 0)) * 5]} 
            hide
          />

          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #f1f5f9', 
              borderRadius: '20px', 
              fontSize: '11px', 
              boxShadow: '0 20px 40px -8px rgb(0 0 0 / 0.1)',
              padding: '16px'
            }}
            itemStyle={{ padding: '2px 0' }}
            labelStyle={{ color: '#0f172a', marginBottom: '8px', borderBottom: '2px solid #f8fafc', paddingBottom: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.12em' }}
            cursor={{ stroke: '#f1f5f9', strokeWidth: 10 }}
            formatter={(value: any, name: string) => {
              if (name === 'Candle' || name === 'Wick') return [null, null];
              if (typeof value !== 'number') return [value, name];
              if (name === 'Volume') return [value.toLocaleString(), name];
              return [`฿${value.toFixed(2)}`, name];
            }}
          />

          {viewType === 'line' ? (
            <Area 
              yAxisId="price"
              type="monotone" 
              dataKey="price" 
              stroke={color} 
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              strokeWidth={3}
              animationDuration={1500}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: color }}
              name="Price"
            />
          ) : (
            <>
              <Bar yAxisId="price" dataKey="wick" barSize={1} animationDuration={1000} name="Wick">
                {chartData.map((entry, index) => (
                  <Cell key={`wick-${index}`} fill={(entry.close || 0) >= (entry.open || 0) ? '#10b981' : '#dc2626'} />
                ))}
              </Bar>
              <Bar yAxisId="price" dataKey="body" barSize={12} animationDuration={1000} name="Candle">
                {chartData.map((entry, index) => (
                  <Cell key={`body-${index}`} fill={(entry.close || 0) >= (entry.open || 0) ? '#10b981' : '#dc2626'} />
                ))}
              </Bar>
            </>
          )}

          <Line yAxisId="price" type="monotone" dataKey="ema5" stroke="#3b82f6" strokeWidth={2} dot={false} name="Trend" opacity={0.3} />

          <Bar yAxisId="volume" dataKey="volume" barSize={6} animationDuration={1000} name="Volume">
            {chartData.map((entry, index) => (
              <Cell key={`vol-${index}`} fill={(entry.close || 0) >= (entry.open || 0) ? '#10b98122' : '#dc262622'} />
            ))}
          </Bar>

          <ReferenceLine 
            yAxisId="price"
            y={prevClose} 
            stroke="#cbd5e1" 
            strokeDasharray="6 6" 
            label={{ 
              position: 'left', 
              value: `PREV ฿${prevClose.toFixed(2)}`, 
              fill: '#94a3b8', 
              fontSize: 9,
              fontWeight: '900',
              offset: 12
            }} 
          />

          {lunchStart && lunchEnd && (
            <ReferenceArea 
              yAxisId="price"
              x1={lunchStart} 
              x2={lunchEnd} 
              fill="#f8fafc" 
              fillOpacity={0.5}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
