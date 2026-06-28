'use client';

interface Props {
  level: number;
  currentXp: number;
  xpNeeded: number;
  size?: number;
}

export function LevelBadge({ level, currentXp, xpNeeded, size = 80 }: Props) {
  const pct = xpNeeded > 0 ? Math.min(100, (currentXp / xpNeeded) * 100) : 0;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--border))" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3b82f6" strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color: 'rgb(var(--accent))' }}>{level}</span>
    </div>
  );
}
