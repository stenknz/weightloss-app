'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export type CaloriePoint = { date: string; in: number; out: number };

export function CalorieChart({ data, days = 7 }: { data: CaloriePoint[]; days?: number }) {
  if (!data || data.length === 0) {
    return <div className="text-sm py-8 text-center" style={{ color: 'rgb(var(--muted))' }}>No calorie data yet.</div>;
  }
  const displayData = data.slice(-days);
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
          <Bar
            dataKey="in"
            fill="rgb(var(--teal))"
            radius={[4, 4, 0, 0]}
            maxBarSize={12}
            name="Calories in"
          />
          <Bar
            dataKey="out"
            fill="rgb(var(--warn))"
            radius={[4, 4, 0, 0]}
            maxBarSize={12}
            name="Calories out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
