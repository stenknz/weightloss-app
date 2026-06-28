import { query } from '@/lib/db';

const XP_VALUES: Record<string, number> = {
  weigh_in_logged: 10,
  water_logged: 5,
  food_logged: 5,
  exercise_logged: 25,
  steps_logged: 5,
};

export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.floor(50 * (n * Math.pow(1 + n / 20, 0.8)));
}

export function calculateLevel(totalXp: number): number {
  let level = 1;
  while (true) {
    const needed = xpForLevel(level + 1);
    if (needed > totalXp) return level;
    level++;
  }
}

export function xpProgress(totalXp: number, level: number): { currentLevelXp: number; xpForNext: number } {
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return { currentLevelXp: totalXp - currentLevelXp, xpForNext: nextLevelXp - currentLevelXp };
}

export async function awardXp(
  userId: number, eventType: string, points?: number, sourceTable?: string, sourceId?: number
): Promise<{ oldLevel: number; newLevel: number }> {
  const pts = points ?? XP_VALUES[eventType] ?? 5;
  if (!pts) return { oldLevel: 0, newLevel: 0 };

  if (sourceTable && sourceId != null) {
    const exists = await query('SELECT 1 FROM xp_events WHERE source_table = $1 AND source_id = $2', [sourceTable, sourceId]);
    if (exists.rowCount && exists.rowCount > 0) return { oldLevel: 0, newLevel: 0 };
  }

  await query(
    'INSERT INTO xp_events (user_id, event_type, points, source_table, source_id) VALUES ($1,$2,$3,$4,$5)',
    [userId, eventType, pts, sourceTable ?? null, sourceId ?? null]
  );

  const r = await query<{ total_xp: number; level: number }>(
    `SELECT COALESCE(total_xp,0) AS total_xp, COALESCE(level,1) AS level FROM user_levels WHERE user_id = $1`,
    [userId]
  );
  const current = r.rows[0] ?? { total_xp: 0, level: 1 };
  const newTotal = current.total_xp + pts;
  const newLevel = calculateLevel(newTotal);

  await query('UPDATE user_levels SET total_xp = $1, level = $2, updated_at = now() WHERE user_id = $3',
    [newTotal, newLevel, userId]);

  return { oldLevel: current.level, newLevel };
}
