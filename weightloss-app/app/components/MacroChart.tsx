'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export type MacroPoint = { date: string; protein: number; carbs: number; fat: number };

export function MacroChart({ data }: { data: MacroPoint[] }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-muted py-8 text-center">No data yet.</div>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} tickFormatter={(v: string) => v.slice(5)} stroke="rgb(var(--muted))" />
          <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} stroke="rgb(var(--muted))" width={40} />
          <Tooltip
            contentStyle={{
              background: 'rgb(var(--panel))',
              border: '1px solid rgb(var(--border))',
              borderRadius: 6,
              fontSize: 12
            }}
            labelStyle={{ color: 'rgb(var(--text))' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="protein" stackId="m" fill="rgb(34 197 94)"  name="Protein (g)" />
          <Bar dataKey="carbs"   stackId="m" fill="rgb(59 130 246)" name="Carbs (g)" />
          <Bar dataKey="fat"     stackId="m" fill="rgb(234 179 8)"  name="Fat (g)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
