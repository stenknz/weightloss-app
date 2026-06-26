'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export type MeasurePoint = { date: string; waist?: number | null; chest?: number | null; hips?: number | null; thigh?: number | null; arm?: number | null };

export function MeasureChart({ data }: { data: MeasurePoint[] }) {
  if (!data || data.length === 0) {
    return <div className="text-sm py-8 text-center" style={{ color: 'rgb(var(--muted))' }}>No measurements yet.</div>;
  }

  const colors = [
    'rgb(var(--teal))',
    'rgb(var(--blue))',
    'rgb(var(--warn))',
    'rgb(168 85 247)',
    'rgb(236 72 153)'
  ];

  const lines = [
    { key: 'waist', label: 'Waist', color: colors[0] },
    { key: 'chest', label: 'Chest', color: colors[1] },
    { key: 'hips',  label: 'Hips',  color: colors[2] },
    { key: 'thigh', label: 'Thigh', color: colors[3] },
    { key: 'arm',   label: 'Arm',   color: colors[4] },
  ];

  const allVals = data.flatMap((d) =>
    lines.map((l) => (d as any)[l.key]).filter((v): v is number => v != null)
  );
  const min = allVals.length ? Math.min(...allVals) - 2 : 0;
  const max = allVals.length ? Math.max(...allVals) + 2 : 100;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(var(--border), 0.1)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }}
            tickFormatter={(v: string) => v.slice(5)}
            stroke="transparent"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[Math.floor(min), Math.ceil(max)]}
            tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }}
            stroke="transparent"
            axisLine={false}
            tickLine={false}
            width={30}
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
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
            iconType="circle"
            iconSize={8}
          />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              stroke={l.color}
              strokeWidth={2}
              dot={{ r: 3, fill: l.color, stroke: 'transparent' }}
              activeDot={{ r: 5, fill: l.color, stroke: 'rgb(var(--panel))', strokeWidth: 2 }}
              connectNulls
              name={l.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
