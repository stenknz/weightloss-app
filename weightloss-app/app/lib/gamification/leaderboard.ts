import { query } from '@/lib/db';
import type { LeaderboardEntry } from './types';

export async function getLeaderboard(type: string, _period: string = 'all'): Promise<LeaderboardEntry[]> {
  switch (type) {
    case 'streak':
      return (await query(
        `SELECT s.current_count AS value
         FROM streaks s JOIN users u ON u.id = s.user_id
         WHERE s.streak_type = 'logging' AND u.is_active = TRUE
         ORDER BY s.current_count DESC LIMIT 50`
      )).rows.map((r, i) => ({ rank: i + 1, displayName: 'Anonymous', value: r.value as number }));
    case 'xp_week': {
      const r = await query(
        `SELECT COALESCE(SUM(e.points),0) AS value
         FROM xp_events e JOIN users u ON u.id = e.user_id
         WHERE e.created_at >= date_trunc('week', now()) AND u.is_active = TRUE
         GROUP BY u.id ORDER BY value DESC LIMIT 50`
      );
      return r.rows.map((r, i) => ({ rank: i + 1, displayName: 'Anonymous', value: Number(r.value) }));
    }
    case 'challenges':
      return (await query(
        `SELECT COALESCE(s.challenges_completed,0) AS value
         FROM user_stats s JOIN users u ON u.id = s.user_id WHERE u.is_active = TRUE
         ORDER BY value DESC LIMIT 50`
      )).rows.map((r, i) => ({ rank: i + 1, displayName: 'Anonymous', value: r.value as number }));
    case 'weight_loss': {
      const r = await query(
        `SELECT (SELECT weight_kg FROM weigh_ins WHERE user_id = u.id ORDER BY entry_date ASC LIMIT 1) AS start_wt,
                (SELECT weight_kg FROM weigh_ins WHERE user_id = u.id ORDER BY entry_date DESC LIMIT 1) AS cur_wt
         FROM users u WHERE u.is_active = TRUE AND EXISTS (SELECT 1 FROM weigh_ins WHERE user_id = u.id)
         ORDER BY ((SELECT weight_kg FROM weigh_ins WHERE user_id = u.id ORDER BY entry_date ASC LIMIT 1) -
                   (SELECT weight_kg FROM weigh_ins WHERE user_id = u.id ORDER BY entry_date DESC LIMIT 1)) DESC LIMIT 50`
      );
      return r.rows.map((r, i) => ({
        rank: i + 1, displayName: 'Anonymous',
        value: Math.round(((Number(r.start_wt) - Number(r.cur_wt)) / Number(r.start_wt)) * 100 * 10) / 10,
      }));
    }
    default:
      return [];
  }
}
