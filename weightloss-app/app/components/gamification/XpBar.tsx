'use client';

interface Props {
  currentXp: number;
  xpNeeded: number;
  level: number;
}

export function XpBar({ currentXp, xpNeeded, level }: Props) {
  const pct = xpNeeded > 0 ? Math.min(100, (currentXp / xpNeeded) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: 'rgb(var(--muted))' }}>
        <span>{currentXp.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
        <span>Level {level + 1}</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--border))' }}>
        <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
