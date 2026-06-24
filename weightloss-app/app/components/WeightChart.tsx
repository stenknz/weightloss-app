'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export type WeightPoint = { date: string; kg: number };

export function WeightChart({ data, targetKg }: { data: WeightPoint[]; targetKg?: number | null }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-muted py-8 text-center">No data yet.</div>;
  }
  const minKg = Math.min(...data.map((d) => d.kg), targetKg ?? Infinity) - 1;
  const maxKg = Math.max(...data.map((d) => d.kg)) + 1;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }}
            tickFormatter={(v: string) => v.slice(5)}
            stroke="rgb(var(--muted))"
          />
          <YAxis
            domain={[Math.floor(minKg), Math.ceil(maxKg)]}
            tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }}
            stroke="rgb(var(--muted))"
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: 'rgb(var(--panel))',
              border: '1px solid rgb(var(--border))',
              borderRadius: 6,
              fontSize: 12
            }}
            labelStyle={{ color: 'rgb(var(--text))' }}
            formatter={(v: number) => [`${v.toFixed(1)} kg`, 'Weight']}
          />
          <Line
            type="monotone"
            dataKey="kg"
            stroke="rgb(var(--accent))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'rgb(var(--accent))' }}
            activeDot={{ r: 5 }}
          />
          {targetKg ? (
            <ReferenceLine
              y={Number(targetKg)}
              stroke="rgb(var(--warn))"
              strokeDasharray="4 4"
              label={{ value: 'Target', position: 'insideTopRight', fill: 'rgb(var(--warn))', fontSize: 10 }}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
