'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export type WeightPoint = { date: string; kg: number };

export function WeightChart({ data, targetKg }: { data: WeightPoint[]; targetKg?: number | null }) {
  if (!data || data.length === 0) {
    return <div className="text-sm py-8 text-center" style={{ color: 'rgb(var(--muted))' }}>No data yet.</div>;
  }
  const minKg = Math.min(...data.map((d) => d.kg), targetKg ?? Infinity) - 1;
  const maxKg = Math.max(...data.map((d) => d.kg)) + 1;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--teal))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="rgb(var(--teal))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(var(--border), 0.15)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }}
            tickFormatter={(v: string) => v.slice(5)}
            stroke="rgba(var(--border), 0.2)"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[Math.floor(minKg), Math.ceil(maxKg)]}
            tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }}
            stroke="transparent"
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(var(--panel-rgb), 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(var(--border), 0.3)',
              borderRadius: 10,
              fontSize: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
            labelStyle={{ color: 'rgb(var(--text))', fontWeight: 600 }}
            formatter={(v: number) => [`${v.toFixed(1)} kg`, 'Weight']}
          />
          <Area
            type="monotone"
            dataKey="kg"
            stroke="rgb(var(--teal))"
            strokeWidth={2}
            fill="url(#weightGradient)"
            dot={{ r: 3, fill: 'rgb(var(--teal))', stroke: 'transparent' }}
            activeDot={{ r: 5, fill: 'rgb(var(--teal))', stroke: 'rgb(var(--panel))', strokeWidth: 2 }}
          />
          {targetKg ? (
            <ReferenceLine
              y={Number(targetKg)}
              stroke="rgb(var(--warn))"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{ value: 'Target', position: 'insideTopRight', fill: 'rgb(var(--warn))', fontSize: 10 }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
