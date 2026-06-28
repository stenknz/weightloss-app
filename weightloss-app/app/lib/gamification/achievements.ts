import { query } from '@/lib/db';
import { awardXp } from './xp';

export async function checkAndUnlockAchievements(
  userId: number, _eventType: string, _eventData?: Record<string, unknown>
): Promise<{ slug: string; name: string; xpReward: number }[]> {
  const unlocked = (await query(
    'SELECT a.slug FROM achievements a JOIN user_achievements ua ON ua.achievement_id = a.id WHERE ua.user_id = $1',
    [userId]
  )).rows.map(r => r.slug as string);

  const allAchievements = (await query('SELECT * FROM achievements ORDER BY id')).rows;
  const newOnes: { slug: string; name: string; xpReward: number }[] = [];

  for (const a of allAchievements) {
    if (unlocked.includes(a.slug as string)) continue;
    if (await checkCondition(userId, a.condition_type as string, a.condition_value as number)) {
      await query(
        'INSERT INTO user_achievements (user_id, achievement_id, xp_awarded) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [userId, a.id, a.xp_reward]
      );
      if (Number(a.xp_reward) > 0) {
        await awardXp(userId, 'achievement_' + a.slug, Number(a.xp_reward));
      }
      await query(
        'UPDATE user_stats SET achievements_unlocked = (SELECT COUNT(*) FROM user_achievements WHERE user_id = $1) WHERE user_id = $2',
        [userId, userId]
      );
      newOnes.push({ slug: a.slug as string, name: a.name as string, xpReward: Number(a.xp_reward) });
    }
  }
  return newOnes;
}

async function checkCondition(userId: number, type: string, value: number): Promise<boolean> {
  switch (type) {
    case 'weigh_in_count': {
      const r = await query('SELECT COUNT(*) AS c FROM weigh_ins WHERE user_id = $1', [userId]);
      return Number(r.rows[0]?.c ?? 0) >= value;
    }
    case 'food_count': {
      const r = await query('SELECT COUNT(*) AS c FROM food_logs WHERE user_id = $1', [userId]);
      return Number(r.rows[0]?.c ?? 0) >= value;
    }
    case 'water_ml': {
      const r = await query('SELECT COALESCE(SUM(amount_ml), 0) AS t FROM water_logs WHERE user_id = $1', [userId]);
      return Number(r.rows[0]?.t ?? 0) >= value;
    }
    case 'streak_days': {
      const r = await query('SELECT current_count FROM streaks WHERE user_id = $1 AND streak_type = $2', [userId, 'logging']);
      return (r.rows[0]?.current_count ?? 0) >= value;
    }
    case 'weight_lost_kg': {
      const [firstRow, latestRow] = (await Promise.all([
        query('SELECT weight_kg FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date ASC LIMIT 1', [userId]),
        query('SELECT weight_kg FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 1', [userId]),
      ])).map(r => Number(r.rows[0]?.weight_kg ?? 0));
      return firstRow > 0 && (firstRow - latestRow) >= value;
    }
    case 'calorie_streak_days': {
      const user = await query<{ calorie_target: number }>('SELECT calorie_target FROM users WHERE id = $1', [userId]);
      const target = user.rows[0]?.calorie_target ?? 2000;
      const r = await query(
        `SELECT entry_date, COALESCE(SUM(calories),0) AS cals FROM food_logs
         WHERE user_id = $1 AND entry_date >= CURRENT_DATE - $2::integer
         GROUP BY entry_date ORDER BY entry_date DESC LIMIT $2`,
        [userId, value]
      );
      const hitDays = r.rows.filter(row => Number(row.cals) <= target).length;
      return hitDays >= value;
    }
    case 'protein_hit_count': {
      const user = await query<{ protein_target_g: number }>('SELECT protein_target_g FROM users WHERE id = $1', [userId]);
      const target = user.rows[0]?.protein_target_g ?? 100;
      const r = await query(
        `SELECT COUNT(DISTINCT entry_date) AS c FROM food_logs
         WHERE user_id = $1 AND COALESCE(protein_g,0) >= $2`,
        [userId, target]
      );
      return Number(r.rows[0]?.c ?? 0) >= value;
    }
    case 'water_hit_count': {
      const user = await query<{ water_target_ml: number }>('SELECT water_target_ml FROM users WHERE id = $1', [userId]);
      const target = user.rows[0]?.water_target_ml ?? 2700;
      const r = await query(
        `SELECT COUNT(DISTINCT entry_date) AS c FROM water_logs
         WHERE user_id = $1 AND amount_ml >= $2`,
        [userId, target]
      );
      return Number(r.rows[0]?.c ?? 0) >= value;
    }
    default:
      return false;
  }
}
