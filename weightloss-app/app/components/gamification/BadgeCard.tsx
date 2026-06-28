'use client';

import { Lock, Award } from 'lucide-react';

interface Props {
  slug: string;
  name: string;
  description: string;
  category: string;
  unlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
}

export function BadgeCard({ name, description, category, unlocked, unlockedAt, xpReward }: Props) {
  return (
    <div className={`card rounded-xl p-3 text-center transition-all duration-300 ${unlocked ? '' : 'opacity-50 grayscale'}`}>
      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 mx-auto" style={{
        background: unlocked ? 'linear-gradient(135deg, #0ea5a0, #3b82f6)' : 'rgb(var(--border))'
      }}>
        <Award size={22} className="text-white" />
        {!unlocked && <Lock size={12} className="absolute -bottom-0.5 -right-0.5 text-red-400" />}
      </div>
      <div className="text-sm font-semibold truncate">{name}</div>
      <div className="text-xs truncate" style={{ color: 'rgb(var(--muted))' }}>{category}</div>
      {unlocked && unlockedAt && (
        <div className="text-xs mt-1" style={{ color: 'rgb(var(--good))' }}>
          Unlocked {new Date(unlockedAt).toLocaleDateString()}
        </div>
      )}
      {!unlocked && (
        <div className="text-xs mt-1" style={{ color: 'rgb(var(--muted))' }}>+{xpReward} XP</div>
      )}
    </div>
  );
}
