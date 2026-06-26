'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

export type StepsPoint = { date: string; steps: number };

export function StepsChart({ data, days = 7 }: { data: StepsPoint[]; days?: number }) {
  if (!data || data.length === 0) {
    return <div className="text-sm py-8 text-center" style={{ color: 'rgb(var(--muted))' }}>No step data yet.</div>;
  }
  const displayData = data.slice(-days);
  const goal = 10000;
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="stepsBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--blue))" stopOpacity={0.9} />
              <stop offset="100%" stopColor="rgb(var(--blue))" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(var(--border), 0.1)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: 'rgb(var(--muted))' }}
            tickFormatter={(v: string) => v.slice(5)}
            stroke="transparent"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'rgb(var(--muted))' }}
            stroke="transparent"
            axisLine={false}
            tickLine={false}
            width={30}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(var(--panel-rgb), 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(var(--border), 0.3)',
              borderRadius: 10,
              fontSize: 11,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
            labelStyle={{ color: 'rgb(var(--text))', fontWeight: 600 }}
            formatter={(v: number) => [v.toLocaleString(), 'Steps']}
          />
          <Bar dataKey="steps" fill="url(#stepsBar)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <ReferenceLine
            y={goal}
            stroke="rgb(var(--warn))"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
            label={{ value: '10k', position: 'right', fill: 'rgb(var(--warn))', fontSize: 9 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
