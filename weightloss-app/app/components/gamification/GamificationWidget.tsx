'use client';

import { useEffect, useState } from 'react';
import { getGamificationData } from '@/lib/actions/gamification';
import { LevelBadge } from './LevelBadge';
import { XpBar } from './XpBar';
import { StreakDisplay } from './StreakDisplay';
import { QuestCard } from './QuestCard';
import { useRouter } from 'next/navigation';

export function GamificationWidget() {
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    getGamificationData().then(d => {
      if (!('error' in d)) setData(d);
    });
  }, []);

  if (!data) return null;

  return (
    <div className="card rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-4">
        <LevelBadge level={data.level} currentXp={data.xpProgress.current} xpNeeded={data.xpProgress.needed} size={64} />
        <div className="flex-1">
          <div className="text-lg font-bold">Level {data.level}</div>
          <XpBar currentXp={data.xpProgress.current} xpNeeded={data.xpProgress.needed} level={data.level} />
        </div>
        <button onClick={() => router.push('/gamification')} className="btn-ghost text-sm">
          View all →
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StreakDisplay currentCount={data.streaks?.[0]?.current_count ?? 0} longestCount={data.streaks?.[0]?.longest_count ?? 0} type="Daily" />
        <div className="card-tight text-center">
          <div className="text-lg font-bold" style={{ color: 'rgb(var(--accent))' }}>{data.totalXp.toLocaleString()}</div>
          <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Total XP</div>
        </div>
        <div className="card-tight text-center">
          <div className="text-lg font-bold" style={{ color: 'rgb(var(--accent))' }}>{data.stats?.achievements_unlocked ?? 0}/15</div>
          <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Badges</div>
        </div>
        <div className="card-tight text-center">
          <div className="text-lg font-bold" style={{ color: 'rgb(var(--accent))' }}>{Math.round(data.journey?.progressKm ?? 0)}</div>
          <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>KM Walked</div>
        </div>
      </div>

      {data.quests && data.quests.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Today's Quests</h4>
          <div className="space-y-2">
            {data.quests.map((q: any) => (
              <QuestCard key={q.id} label={q.label} description={q.description} progress={q.progress} targetValue={q.target_value} completed={q.completed} xpReward={q.xp_reward} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
