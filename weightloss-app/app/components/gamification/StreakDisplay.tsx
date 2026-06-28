'use client';

import { Flame } from 'lucide-react';

interface Props {
  currentCount: number;
  longestCount: number;
  type: string;
}

export function StreakDisplay({ currentCount, longestCount, type }: Props) {
  const color = currentCount >= 100 ? '#ef4444' : currentCount >= 30 ? '#f59e0b' : currentCount >= 7 ? '#f97316' : '#0ea5a0';
  return (
    <div className="card-tight flex items-center gap-3">
      <Flame size={28} style={{ color }} className={currentCount > 0 ? 'drop-shadow-lg' : 'opacity-40'} />
      <div>
        <div className="text-lg font-bold" style={{ color }}>{currentCount} days</div>
        <div className="text-xs capitalize" style={{ color: 'rgb(var(--muted))' }}>{type} • Best: {longestCount}</div>
      </div>
    </div>
  );
}
