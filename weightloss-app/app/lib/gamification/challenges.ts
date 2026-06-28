import { query } from '@/lib/db';
import { CHALLENGE_POOL } from './types';
import { startOfWeekISO } from '@/lib/utils';

export async function ensureWeeklyChallenge(userId: number) {
  const weekStart = startOfWeekISO(new Date().toISOString().slice(0, 10));
  const existing = await query(
    'SELECT * FROM weekly_challenges WHERE user_id = $1 AND week_start = $2', [userId, weekStart]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const c = CHALLENGE_POOL[Math.floor(Math.random() * CHALLENGE_POOL.length)];
  await query(
    `INSERT INTO weekly_challenges (user_id, week_start, challenge_type, target_value, xp_reward)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, weekStart, c.type, c.target, c.xp]
  );
  const inserted = await query(
    'SELECT * FROM weekly_challenges WHERE user_id = $1 AND week_start = $2', [userId, weekStart]
  );
  return inserted.rows[0];
}

export async function updateChallengeProgress(userId: number, challengeType: string, progress: number) {
  const weekStart = startOfWeekISO(new Date().toISOString().slice(0, 10));
  const r = await query<{ id: number; completed: boolean; xp_reward: number; challenge_type: string }>(
    `UPDATE weekly_challenges SET progress = LEAST(target_value, progress + $1),
            completed = (progress + $1 >= target_value),
            completed_at = CASE WHEN (progress + $1 >= target_value) AND NOT completed THEN now() ELSE completed_at END
     WHERE user_id = $2 AND week_start = $3 AND challenge_type = $4 AND NOT completed
     RETURNING id, completed, xp_reward, challenge_type`,
    [progress, userId, weekStart, challengeType]
  );
  const row = r.rows[0];
  return row ? { id: row.id, challengeType: row.challenge_type, completed: row.completed, xpReward: row.xp_reward } : null;
}
