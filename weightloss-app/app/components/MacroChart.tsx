'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export type MacroData = { name: string; value: number; color: string; label: string };

export function MacroChart({ data }: { data: MacroData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;
  if (!hasData) {
    return <div className="text-sm py-8 text-center" style={{ color: 'rgb(var(--muted))' }}>No food logged today.</div>;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-40 w-40 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
              stroke="transparent"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
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
              formatter={(value: number, name: string) => [
                `${value.toFixed(0)}g (${((value / total) * 100).toFixed(0)}%)`,
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--muted))' }}>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="w-12">{d.label}</span>
            <span className="font-medium" style={{ color: 'rgb(var(--text))' }}>{d.value.toFixed(0)}g</span>
            <span>({((d.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
