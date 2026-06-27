import { NextRequest } from 'next/server';
import { json } from '@/lib/api';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { todayISO, startOfWeekISO, endOfWeekISO } from '@/lib/utils';
import { parseISO, differenceInDays } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const userId = auth.user.id;

  const today = todayISO();
  const wkStart = startOfWeekISO(today);
  const wkEnd   = endOfWeekISO(today);

  // Today's totals
  const todayFood = await query<{
    calories: string | null; protein_g: string | null; carbs_g: string | null; fat_g: string | null;
    fibre_g: string | null; sugar_g: string | null;
  }>(
    `SELECT COALESCE(SUM(calories),  0)::text AS calories,
            COALESCE(SUM(protein_g), 0)::text AS protein_g,
            COALESCE(SUM(carbs_g),   0)::text AS carbs_g,
            COALESCE(SUM(fat_g),     0)::text AS fat_g,
            COALESCE(SUM(fibre_g),   0)::text AS fibre_g,
            COALESCE(SUM(sugar_g),   0)::text AS sugar_g
       FROM food_logs WHERE user_id = $1 AND entry_date = $2`,
    [userId, today]
  );
  const todayExercise = await query<{ burned: string | null }>(
    `SELECT COALESCE(SUM(calories_burned), 0)::text AS burned
       FROM exercise_logs WHERE user_id = $1 AND entry_date = $2`,
    [userId, today]
  );
  const todayWater = await query<{ ml: number | null }>(
    `SELECT COALESCE(SUM(amount_ml), 0)::int AS ml
       FROM water_logs WHERE user_id = $1 AND entry_date = $2`,
    [userId, today]
  );
  const todaySteps = await query<{ steps: number | null }>(
    `SELECT COALESCE(MAX(steps), 0)::int AS steps
       FROM step_logs WHERE user_id = $1 AND entry_date = $2`,
    [userId, today]
  );

  // Weekly average weight
  const wkWeights = await query<{ weight_kg: string }>(
    `SELECT weight_kg::text AS weight_kg FROM weigh_ins
      WHERE user_id = $1 AND entry_date BETWEEN $2 AND $3
      ORDER BY entry_date ASC`,
    [userId, wkStart, wkEnd]
  );
  const wkAvgWeight = wkWeights.rows.length
    ? wkWeights.rows.reduce((s, r) => s + Number.parseFloat(r.weight_kg), 0) / wkWeights.rows.length
    : null;

  // Latest 30 weigh-ins for the chart
  const recentWeights = await query<{ entry_date: string; weight_kg: string }>(
    `SELECT entry_date::text AS entry_date, weight_kg::text AS weight_kg
       FROM weigh_ins WHERE user_id = $1
       ORDER BY entry_date DESC LIMIT 30`,
    [userId]
  );
  const series = recentWeights.rows.reverse();

  // Estimated rate of loss: kg per week from first to last of series
  let rateKgPerWeek: number | null = null;
  if (series.length >= 2) {
    const first = series[0];
    const last  = series[series.length - 1];
    const days  = Math.max(1, differenceInDays(parseISO(last.entry_date), parseISO(first.entry_date)));
    const wDiff = Number.parseFloat(last.weight_kg) - Number.parseFloat(first.weight_kg);
    rateKgPerWeek = (wDiff / days) * 7;
  }

  // Streak: consecutive days with at least one log entry
  const streakDates = await query<{ d: string }>(
    `SELECT DISTINCT entry_date::text AS d FROM (
        SELECT entry_date FROM weigh_ins WHERE user_id = $1
        UNION SELECT entry_date FROM food_logs WHERE user_id = $1
        UNION SELECT entry_date FROM exercise_logs WHERE user_id = $1
        UNION SELECT entry_date FROM water_logs WHERE user_id = $1
        UNION SELECT entry_date FROM step_logs WHERE user_id = $1
     ) s
     ORDER BY d DESC LIMIT 365`,
    [userId]
  );
  let streak = 0;
  {
    let cursor = parseISO(today);
    for (const row of streakDates.rows) {
      const d = parseISO(row.d);
      if (differenceInDays(cursor, d) === 0) {
        streak++;
        cursor = new Date(cursor.getTime() - 86400_000);
      } else if (differenceInDays(cursor, d) === 1 && streak === 0) {
        // allow yesterday as streak start
        streak++;
        cursor = new Date(d.getTime() - 86400_000);
      } else {
        break;
      }
    }
  }

  // Adherence: % of last 30 days that had at least one entry
  const adherenceDays = await query<{ n: number }>(
    `WITH days AS (
       SELECT DISTINCT entry_date::text AS d FROM (
         SELECT entry_date FROM weigh_ins WHERE user_id = $1
         UNION SELECT entry_date FROM food_logs WHERE user_id = $1
         UNION SELECT entry_date FROM exercise_logs WHERE user_id = $1
         UNION SELECT entry_date FROM water_logs WHERE user_id = $1
         UNION SELECT entry_date FROM step_logs WHERE user_id = $1
       ) s
       WHERE entry_date >= (CURRENT_DATE - INTERVAL '29 days')
     )
     SELECT COUNT(*)::int AS n FROM days`,
    [userId]
  );
  const adherencePct = Math.round((Number(adherenceDays.rows[0]?.n ?? 0) / 30) * 100);

  // Goals
  const u = await query<{
    target_weight_kg: string | null;
    target_calorie_deficit: number | null;
    target_date: string | null;
    calorie_target: number | null;
    protein_target_g: number | null;
    carbs_target_g: number | null;
    fat_target_g: number | null;
    water_target_ml: number | null;
  }>(
    `SELECT target_weight_kg::text AS target_weight_kg,
            target_calorie_deficit,
            to_char(target_date, 'YYYY-MM-DD') AS target_date,
            calorie_target, protein_target_g, carbs_target_g, fat_target_g,
            water_target_ml
       FROM users WHERE id = $1`,
    [userId]
  );

  return json({
    today: {
      date: today,
      calories_in:   Number(todayFood.rows[0]?.calories   || 0),
      protein_g:     Number(todayFood.rows[0]?.protein_g  || 0),
      carbs_g:       Number(todayFood.rows[0]?.carbs_g    || 0),
      fat_g:         Number(todayFood.rows[0]?.fat_g      || 0),
      fibre_g:       Number(todayFood.rows[0]?.fibre_g    || 0),
      sugar_g:       Number(todayFood.rows[0]?.sugar_g    || 0),
      calories_burned: Number(todayExercise.rows[0]?.burned || 0),
      water_ml:      Number(todayWater.rows[0]?.ml || 0),
      steps:         Number(todaySteps.rows[0]?.steps || 0)
    },
    week: {
      start: wkStart,
      end:   wkEnd,
      avg_weight_kg: wkAvgWeight,
      weigh_in_count: wkWeights.rows.length
    },
    weight_series: series.map((r) => ({ date: r.entry_date, kg: Number.parseFloat(r.weight_kg) })),
    rate_kg_per_week: rateKgPerWeek,
    streak_days: streak,
    adherence_pct: adherencePct,
    goals: u.rows[0] || {}
  });
}
