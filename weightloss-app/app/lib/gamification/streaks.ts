import { query } from '@/lib/db';
import { awardXp } from './xp';

const STREAK_MILESTONES = [3, 7, 30, 100, 365];
const STREAK_XP: Record<number, number> = { 3: 50, 7: 100, 30: 500, 100: 2000, 365: 10000 };

export async function getStreaks(userId: number) {
  const r = await query('SELECT * FROM streaks WHERE user_id = $1 ORDER BY streak_type', [userId]);
  return r.rows;
}

export async function updateStreak(
  userId: number, streakType: string, activityDate: string
): Promise<{ streakMilestones: string[]; protectionUsed: boolean }> {
  const [streak] = (await query(
    'SELECT * FROM streaks WHERE user_id = $1 AND streak_type = $2', [userId, streakType]
  )).rows ?? { current_count: 0, longest_count: 0, last_activity_date: null };

  const today = new Date(activityDate);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const lastDate = streak.last_activity_date ? new Date(streak.last_activity_date) : null;
  const todayStr = today.toISOString().slice(0, 10);
  const lastStr = lastDate ? lastDate.toISOString().slice(0, 10) : null;

  if (lastStr === todayStr) return { streakMilestones: [], protectionUsed: false };

  let newCount = streak.current_count;
  const milestones: string[] = [];

  if (lastStr === yesterday.toISOString().slice(0, 10)) {
    newCount += 1;
  } else if (lastStr && lastStr < yesterday.toISOString().slice(0, 10)) {
    const stats = await query<{ streak_protection_tokens: number }>(
      'SELECT streak_protection_tokens FROM user_stats WHERE user_id = $1', [userId]
    );
    const tokens = stats.rows[0]?.streak_protection_tokens ?? 0;
    if (tokens > 0) {
      await query('UPDATE user_stats SET streak_protection_tokens = streak_protection_tokens - 1 WHERE user_id = $1', [userId]);
      newCount += 1;
    } else {
      newCount = 1;
    }
  } else {
    newCount = 1;
  }

  const newLongest = Math.max(newCount, streak.longest_count);

  await query(
    'UPDATE streaks SET current_count = $1, longest_count = $2, last_activity_date = $3, updated_at = now() WHERE user_id = $4 AND streak_type = $5',
    [newCount, newLongest, todayStr, userId, streakType]
  );

  for (const ms of STREAK_MILESTONES) {
    if (newCount === ms || (newCount > ms && (streak.current_count || 0) < ms)) {
      const xpAmt = STREAK_XP[ms];
      await awardXp(userId, 'streak_' + ms, xpAmt);
      milestones.push(streakType + '_' + ms);
    }
  }

  await query('UPDATE user_stats SET longest_streak = GREATEST(longest_streak, $1) WHERE user_id = $2', [newLongest, userId]);

  return { streakMilestones: milestones, protectionUsed: false };
}
