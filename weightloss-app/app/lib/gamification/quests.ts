import { query } from '@/lib/db';
import { QUEST_POOL } from './types';
import { todayISO } from '@/lib/utils';

export async function ensureDailyQuests(userId: number, date?: string) {
  const d = date ?? todayISO();
  const existing = await query(
    'SELECT * FROM daily_quests WHERE user_id = $1 AND quest_date = $2', [userId, d]
  );
  if (existing.rows.length > 0) return existing.rows;

  const shuffled = [...QUEST_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
  for (const q of shuffled) {
    await query(
      `INSERT INTO daily_quests (user_id, quest_date, quest_type, target_value, xp_reward)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, d, q.type, q.target, q.xp]
    );
  }
  const inserted = await query(
    'SELECT * FROM daily_quests WHERE user_id = $1 AND quest_date = $2 ORDER BY id', [userId, d]
  );
  return inserted.rows;
}

export async function updateQuestProgress(userId: number, questType: string, progress: number, date?: string) {
  const d = date ?? todayISO();
  const r = await query<{ id: number; completed: boolean; xp_reward: number; quest_type: string }>(
    `UPDATE daily_quests SET progress = LEAST(target_value, progress + $1),
            completed = (progress + $1 >= target_value),
            completed_at = CASE WHEN (progress + $1 >= target_value) AND NOT completed THEN now() ELSE completed_at END
     WHERE user_id = $2 AND quest_date = $3 AND quest_type = $4 AND NOT completed
     RETURNING id, completed, xp_reward, quest_type`,
    [progress, userId, d, questType]
  );
  const row = r.rows[0];
  return row ? { id: row.id, questType: row.quest_type, completed: row.completed, xpReward: row.xp_reward } : null;
}
