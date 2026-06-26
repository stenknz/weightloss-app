'use client';

export function WeightRing({
  currentKg, targetKg, startKg, lost, toGo
}: {
  currentKg: number;
  targetKg: number | null;
  startKg: number | null;
  lost: number | null;
  toGo: number | null;
}) {
  const hasTarget = targetKg != null && targetKg > 0;
  const hasStart = startKg != null && startKg > 0;

  let progress = 0;
  if (hasTarget && hasStart) {
    progress = Math.min(100, Math.max(0, ((startKg - currentKg) / (startKg - targetKg)) * 100));
  }

  const size = 140;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="ring-glow">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--teal))" />
            <stop offset="100%" stopColor="rgb(var(--blue))" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(var(--border), 0.3)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700 ease-out"
        />
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgb(var(--text))"
          fontSize="22"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        >
          {currentKg.toFixed(1)}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 16}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgb(var(--muted))"
          fontSize="10"
          fontWeight="500"
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        >
          kg
        </text>
      </svg>
      {lost != null && toGo != null && (
        <div className="flex items-center gap-3 text-xs" style={{ color: 'rgb(var(--muted))' }}>
          <span className="flex items-center gap-1">
            <span style={{ color: 'rgb(var(--good))' }}>↓ {lost.toFixed(1)} kg</span> lost
          </span>
          <span className="flex items-center gap-1">
            <span style={{ color: 'rgb(var(--warn))' }}>↓ {toGo.toFixed(1)} kg</span> to go
          </span>
        </div>
      )}
    </div>
  );
}
