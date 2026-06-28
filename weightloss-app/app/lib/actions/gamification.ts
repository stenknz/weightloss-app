'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateLevel, xpProgress } from '@/lib/gamification/xp';
import { getStreaks } from '@/lib/gamification/streaks';
import { getLeaderboard } from '@/lib/gamification/leaderboard';
import { ensureDailyQuests } from '@/lib/gamification/quests';
import { ensureWeeklyChallenge } from '@/lib/gamification/challenges';
import { QUEST_POOL, CHALLENGE_POOL } from '@/lib/gamification/types';

export async function getGamificationData() {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const [levelData, stats, streaks, achievements, quests, challenge, journey] = await Promise.all([
    query('SELECT * FROM user_levels WHERE user_id = $1', [user.id]),
    query('SELECT * FROM user_stats WHERE user_id = $1', [user.id]),
    getStreaks(user.id),
    query(
      `SELECT a.slug, a.name, a.description, a.category, a.icon, a.xp_reward, ua.unlocked_at
       FROM achievements a LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       ORDER BY a.id`, [user.id]
    ),
    ensureDailyQuests(user.id),
    ensureWeeklyChallenge(user.id),
    query('SELECT * FROM journey_progress WHERE user_id = $1 AND journey_type = $2', [user.id, 'nz_walk']),
  ]);

  const lvl = levelData.rows[0] ?? { level: 1, total_xp: 0 };
  const s = stats.rows[0] ?? {};
  const j = journey.rows[0] ?? { progress_km: 0, current_milestone: null, completed: false };
  const totalXp = Number(lvl.total_xp);
  const level = Number(lvl.level);
  const { currentLevelXp, xpForNext } = xpProgress(totalXp, level);

  return {
    level,
    totalXp,
    xpProgress: { current: currentLevelXp, needed: xpForNext },
    stats: s,
    streaks,
    achievements: achievements.rows.map((a: any) => ({
      slug: a.slug, name: a.name, description: a.description, category: a.category,
      unlocked: !!a.unlocked_at, unlockedAt: a.unlocked_at, xpReward: a.xp_reward,
    })),
    quests: quests.map((q: any) => {
      const def = QUEST_POOL.find(p => p.type === q.quest_type);
      return { ...q, label: def?.label ?? q.quest_type, description: def?.desc ?? '' };
    }),
    challenge: challenge ? (() => {
      const def = CHALLENGE_POOL.find(p => p.type === challenge.challenge_type);
      return { ...challenge, label: def?.label ?? challenge.challenge_type, description: def?.desc ?? '' };
    })() : null,
    journey: { progressKm: j.progress_km, currentMilestone: j.current_milestone, completed: j.completed, totalDistanceKm: 3000 },
  };
}

export async function getLeaderboardData(type: string, _period: string = 'all') {
  return getLeaderboard(type, _period);
}
