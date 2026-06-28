'use client';

import { useState } from 'react';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { XpBar } from '@/components/gamification/XpBar';
import { StreakDisplay } from '@/components/gamification/StreakDisplay';
import { BadgeGallery } from '@/components/gamification/BadgeGallery';
import { QuestCard } from '@/components/gamification/QuestCard';
import { ChallengeBanner } from '@/components/gamification/ChallengeBanner';
import { JourneyMap } from '@/components/gamification/JourneyMap';
import { LeaderboardTable } from '@/components/gamification/LeaderboardTable';

interface Props {
  data: any;
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'badges', label: 'Badges' },
  { key: 'quests', label: 'Quests' },
  { key: 'journey', label: 'Journey' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

export default function GamificationClient({ data }: Props) {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--accent))' }}>Gamification</h1>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-gradient-to-br from-teal-500/20 to-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-white/5'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="card rounded-2xl p-6">
            <div className="flex items-start gap-6 flex-wrap">
              <LevelBadge level={data.level} currentXp={data.xpProgress.current} xpNeeded={data.xpProgress.needed} size={96} />
              <div className="flex-1 min-w-[200px]">
                <div className="text-2xl font-bold">Level {data.level}</div>
                <div className="text-sm mb-2" style={{ color: 'rgb(var(--muted))' }}>{data.totalXp.toLocaleString()} total XP</div>
                <XpBar currentXp={data.xpProgress.current} xpNeeded={data.xpProgress.needed} level={data.level} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card-tight text-center">
              <div className="text-2xl font-bold" style={{ color: 'rgb(var(--accent))' }}>{data.stats?.total_days_logged ?? 0}</div>
              <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Days Logged</div>
            </div>
            <div className="card-tight text-center">
              <div className="text-2xl font-bold" style={{ color: 'rgb(var(--accent))' }}>{data.stats?.longest_streak ?? 0}</div>
              <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Longest Streak</div>
            </div>
            <div className="card-tight text-center">
              <div className="text-2xl font-bold" style={{ color: 'rgb(var(--accent))' }}>{data.stats?.achievements_unlocked ?? 0}/15</div>
              <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Badges</div>
            </div>
            <div className="card-tight text-center">
              <div className="text-2xl font-bold" style={{ color: 'rgb(var(--accent))' }}>{data.stats?.challenges_completed ?? 0}</div>
              <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Challenges</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="card-tight text-center">
              <div className="text-lg font-bold" style={{ color: 'rgb(var(--accent))' }}>{(Number(data.stats?.total_water_ml ?? 0) / 1000).toFixed(1)}L</div>
              <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Water Logged</div>
            </div>
            <div className="card-tight text-center">
              <div className="text-lg font-bold" style={{ color: 'rgb(var(--accent))' }}>{(Number(data.stats?.total_calories_tracked ?? 0)).toLocaleString()}</div>
              <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Calories Tracked</div>
            </div>
            <div className="card-tight text-center">
              <div className="text-lg font-bold" style={{ color: 'rgb(var(--accent))' }}>{Number(data.stats?.total_weight_kg_lost ?? 0).toFixed(1)} kg</div>
              <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Weight Lost</div>
            </div>
          </div>

          {data.streaks && data.streaks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--muted))' }}>Streaks</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.streaks.map((s: any) => (
                  <StreakDisplay key={s.streak_type} currentCount={s.current_count} longestCount={s.longest_count} type={s.streak_type} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'badges' && (
        <div className="card rounded-2xl p-4">
          <BadgeGallery achievements={data.achievements} />
        </div>
      )}

      {tab === 'quests' && (
        <div className="space-y-4">
          {data.challenge && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--muted))' }}>Weekly Challenge</h3>
              <ChallengeBanner label={data.challenge.label} description={data.challenge.description}
                progress={data.challenge.progress} targetValue={data.challenge.target_value}
                completed={data.challenge.completed} xpReward={data.challenge.xp_reward} />
            </div>
          )}
          {data.quests && data.quests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--muted))' }}>Today's Quests</h3>
              <div className="space-y-2">
                {data.quests.map((q: any) => (
                  <QuestCard key={q.id} label={q.label} description={q.description}
                    progress={q.progress} targetValue={q.target_value}
                    completed={q.completed} xpReward={q.xp_reward} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'journey' && (
        <JourneyMap progressKm={data.journey.progressKm} currentMilestone={data.journey.currentMilestone}
          completed={data.journey.completed} totalDistanceKm={data.journey.totalDistanceKm} />
      )}

      {tab === 'leaderboard' && <LeaderboardTable />}
    </div>
  );
}
