'use client';

import { CheckCircle2 } from 'lucide-react';

interface Props {
  label: string;
  description: string;
  progress: number;
  targetValue: number;
  completed: boolean;
  xpReward: number;
}

export function QuestCard({ label, description, progress, targetValue, completed, xpReward }: Props) {
  const pct = targetValue > 0 ? Math.min(100, (progress / targetValue) * 100) : 0;
  return (
    <div className={`card rounded-xl p-3 flex items-center gap-3 ${completed ? 'border border-green-500/30' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        completed ? 'bg-green-500/20' : 'bg-gradient-to-br from-teal-500 to-blue-600/30'
      }`}>
        {completed ? <CheckCircle2 size={20} className="text-green-500" /> : <span className="text-lg">🎯</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{label}</div>
        <div className="text-xs truncate" style={{ color: 'rgb(var(--muted))' }}>{description}</div>
        {!completed && (
          <div className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--border))' }}>
            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
        completed ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-400'
      }`}>
        {completed ? '✓' : `+${xpReward} XP`}
      </div>
    </div>
  );
}
