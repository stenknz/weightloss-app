import type { GameEvent, CelebrationResult } from './types';
import { validateEvent } from './anti-cheat';
import { awardXp } from './xp';
import { updateStreak } from './streaks';
import { checkAndUnlockAchievements } from './achievements';
import { ensureDailyQuests, updateQuestProgress } from './quests';
import { ensureWeeklyChallenge, updateChallengeProgress } from './challenges';
import { updateJourney } from './journey';
import { query } from '@/lib/db';
import { startOfWeekISO } from '@/lib/utils';

export async function handleEvent(event: GameEvent): Promise<CelebrationResult> {
  const { userId, type, sourceTable, sourceId, data } = event;

  const { allowed } = validateEvent(type, data);
  if (!allowed) {
    return { xpAwarded: 0, levelUp: null, newAchievements: [], questProgress: [], streakMilestones: [], challengeProgress: null, journeyProgress: null };
  }

  const { oldLevel, newLevel } = await awardXp(userId, type, undefined, sourceTable, sourceId);

  const today = new Date().toISOString().slice(0, 10);
  const streakType = type === 'food_logged' || type === 'steps_logged' || type === 'note_logged' ? 'logging' :
    type === 'water_logged' ? 'water' : type === 'exercise_logged' ? 'exercise' : 'logging';
  const { streakMilestones } = await updateStreak(userId, streakType, today);

  if (type === 'food_logged') {
    await updateStreak(userId, 'nutrition', today);
  }

  const newAchievements = await checkAndUnlockAchievements(userId, type, data);

  await ensureDailyQuests(userId);
  const questResult = await updateQuestForEvent(userId, type, data, today);

  await ensureWeeklyChallenge(userId);
  const challengeResult = await updateChallengeForEvent(userId, type, data);

  let journeyResult = null;
  if (type === 'weigh_in_logged') {
    journeyResult = await updateJourney(userId);
  }

  return {
    xpAwarded: 0,
    levelUp: newLevel > oldLevel ? { oldLevel, newLevel } : null,
    newAchievements,
    questProgress: questResult ? [questResult] : [],
    streakMilestones,
    challengeProgress: challengeResult,
    journeyProgress: journeyResult,
  };
}

async function updateQuestForEvent(userId: number, type: string, data?: Record<string, unknown>, today?: string): Promise<{ id: number; questType: string; completed: boolean; xpReward: number } | null> {
  const d = today ?? new Date().toISOString().slice(0, 10);

  if (type === 'food_logged') {
    const totals = await query(
      `SELECT COALESCE(SUM(calories),0) AS cals, COALESCE(SUM(fibre_g),0) AS fibre, COALESCE(SUM(protein_g),0) AS protein
       FROM food_logs WHERE user_id = $1 AND entry_date = $2`,
      [userId, d]
    );
    const t = totals.rows[0];
    const fibre = Number(t?.fibre ?? 0);
    const protein = Number(t?.protein ?? 0);

    const userRow = await query('SELECT calorie_target, protein_target_g FROM users WHERE id = $1', [userId]);
    const calTarget = userRow.rows[0]?.calorie_target ?? 2000;
    const proteinTarget = userRow.rows[0]?.protein_target_g ?? 100;

    if (fibre >= 30) {
      const r = await updateQuestProgress(userId, 'fibre_30g', 30, d);
      if (r) return r;
    }
    if (Number(t?.cals ?? 0) <= calTarget) {
      const r = await updateQuestProgress(userId, 'under_calories', 1, d);
      if (r) return r;
    }
    if (protein >= proteinTarget) {
      const r = await updateQuestProgress(userId, 'protein_goal', 1, d);
      if (r) return r;
    }

    const r = await updateQuestProgress(userId, 'log_all_meals', 1, d);
    if (r) return r;
  }

  if (type === 'water_logged') {
    const r = await updateQuestProgress(userId, 'water_goal', 1, d);
    if (r) return r;
  }

  if (type === 'exercise_logged') {
    const r = await updateQuestProgress(userId, 'exercise_30min', 1, d);
    if (r) return r;
  }

  if (type === 'steps_logged') {
    const r = await updateQuestProgress(userId, 'steps_8000', Number(data?.steps ?? 0), d);
    if (r) return r;
  }

  if (type === 'weigh_in_logged') {
    const r = await updateQuestProgress(userId, 'weigh_in', 1, d);
    if (r) return r;
  }

  return null;
}

async function updateChallengeForEvent(userId: number, type: string, data?: Record<string, unknown>): Promise<{ id: number; challengeType: string; completed: boolean; xpReward: number } | null> {
  const challengeMap: Record<string, string> = {
    weigh_in_logged: 'lose_05kg',
    exercise_logged: 'exercise_4_times',
    steps_logged: 'avg_steps_8000',
  };
  const challengeType = challengeMap[type];
  if (!challengeType) return null;

  if (challengeType === 'lose_05kg') {
    const weekStart = startOfWeekISO(new Date().toISOString().slice(0, 10));
    const weighIns = await query<{ weight_kg: string }>(
      `SELECT weight_kg FROM weigh_ins
       WHERE user_id = $1 AND entry_date >= $2::date
       ORDER BY entry_date ASC`,
      [userId, weekStart]
    );
    if (weighIns.rows.length >= 2) {
      const first = Number(weighIns.rows[0].weight_kg);
      const latest = Number(weighIns.rows[weighIns.rows.length - 1].weight_kg);
      const lost = Math.max(0, first - latest);
      return updateChallengeProgress(userId, challengeType, lost);
    }
    return null;
  }

  if (challengeType === 'avg_steps_8000') {
    const weekStart = startOfWeekISO(new Date().toISOString().slice(0, 10));
    const stepData = await query<{ total: string; days: string }>(
      `SELECT COALESCE(SUM(steps), 0) AS total, COUNT(DISTINCT entry_date) AS days
       FROM step_logs WHERE user_id = $1 AND entry_date >= $2::date`,
      [userId, weekStart]
    );
    const total = Number(stepData.rows[0]?.total ?? 0);
    const days = Number(stepData.rows[0]?.days ?? 0);
    const avg = days > 0 ? Math.round(total / days) : 0;
    return updateChallengeProgress(userId, challengeType, avg);
  }

  return updateChallengeProgress(userId, challengeType, 1);
}
