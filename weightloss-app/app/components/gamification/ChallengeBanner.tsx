'use client';

interface Props {
  label: string;
  description: string;
  progress: number;
  targetValue: number;
  completed: boolean;
  xpReward: number;
}

export function ChallengeBanner({ label, description, progress, targetValue, completed, xpReward }: Props) {
  const pct = targetValue > 0 ? Math.min(100, (progress / targetValue) * 100) : 0;
  return (
    <div className={`card rounded-xl p-4 ${completed ? 'border border-green-500/30' : 'bg-gradient-to-br from-teal-500/10 to-blue-600/10'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{description}</div>
        </div>
        <div className={`text-sm font-bold px-3 py-1 rounded-full ${
          completed ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {completed ? 'Completed!' : `+${xpReward} XP`}
        </div>
      </div>
      {!completed && (
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--border))' }}>
          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="text-xs mt-1 text-right" style={{ color: 'rgb(var(--muted))' }}>{Math.round(progress)} / {targetValue}</div>
    </div>
  );
}
