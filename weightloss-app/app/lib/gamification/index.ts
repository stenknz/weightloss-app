import type { GameEvent, CelebrationResult } from './types';
import { validateEvent } from './anti-cheat';
import { awardXp } from './xp';
import { updateStreak } from './streaks';
import { checkAndUnlockAchievements } from './achievements';
import { ensureDailyQuests, updateQuestProgress } from './quests';
import { ensureWeeklyChallenge, updateChallengeProgress } from './challenges';
import { updateJourney } from './journey';
import { query } from '@/lib/db';

export async function handleEvent(event: GameEvent): Promise<CelebrationResult> {
  const { userId, type, sourceTable, sourceId, data } = event;

  const { allowed } = validateEvent(type, data);
  if (!allowed) {
    return { xpAwarded: 0, levelUp: null, newAchievements: [], questProgress: [], streakMilestones: [], challengeProgress: null, journeyProgress: null };
  }

  const { oldLevel, newLevel } = await awardXp(userId, type, undefined, sourceTable, sourceId);

  const date = new Date().toISOString().slice(0, 10);
  const streakType = type === 'food_logged' || type === 'steps_logged' || type === 'note_logged' ? 'logging' :
    type === 'water_logged' ? 'water' : type === 'exercise_logged' ? 'exercise' : 'logging';
  const { streakMilestones } = await updateStreak(userId, streakType, date);

  if (type === 'food_logged') {
    await updateStreak(userId, 'nutrition', date);
  }

  const newAchievements = await checkAndUnlockAchievements(userId, type, data);

  await ensureDailyQuests(userId);
  const questResult = await updateQuestForEvent(userId, type, data);

  const challenge = await ensureWeeklyChallenge(userId);
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

async function updateQuestForEvent(userId: number, type: string, data?: Record<string, unknown>): Promise<{ id: number; questType: string; completed: boolean; xpReward: number } | null> {
  const today = new Date().toISOString().slice(0, 10);

  if (type === 'food_logged') {
    const totals = await query(
      `SELECT COALESCE(SUM(calories),0) AS cals, COALESCE(SUM(fibre_g),0) AS fibre, COALESCE(SUM(protein_g),0) AS protein
       FROM food_logs WHERE user_id = $1 AND entry_date = $2`,
      [userId, today]
    );
    const t = totals.rows[0];
    const fibre = Number(t?.fibre ?? 0);
    const protein = Number(t?.protein ?? 0);

    const userRow = await query('SELECT calorie_target, protein_target_g FROM users WHERE id = $1', [userId]);
    const calTarget = userRow.rows[0]?.calorie_target ?? 2000;
    const proteinTarget = userRow.rows[0]?.protein_target_g ?? 100;

    if (fibre >= 30) {
      const r = await updateQuestProgress(userId, 'fibre_30g', 30, today);
      if (r) return r;
    }
    if (Number(t?.cals ?? 0) <= calTarget) {
      const r = await updateQuestProgress(userId, 'under_calories', 1, today);
      if (r) return r;
    }
    if (protein >= proteinTarget) {
      const r = await updateQuestProgress(userId, 'protein_goal', 1, today);
      if (r) return r;
    }

    const r = await updateQuestProgress(userId, 'log_all_meals', 1, today);
    if (r) return r;
  }

  if (type === 'water_logged') {
    const r = await updateQuestProgress(userId, 'water_goal', 1, today);
    if (r) return r;
  }

  if (type === 'exercise_logged') {
    const r = await updateQuestProgress(userId, 'exercise_30min', 1, today);
    if (r) return r;
  }

  if (type === 'steps_logged') {
    const r = await updateQuestProgress(userId, 'steps_8000', Number(data?.steps ?? 0), today);
    if (r) return r;
  }

  if (type === 'weigh_in_logged') {
    const r = await updateQuestProgress(userId, 'weigh_in', 1, today);
    if (r) return r;
  }

  return null;
}

async function updateChallengeForEvent(userId: number, type: string, _data?: Record<string, unknown>): Promise<{ id: number; challengeType: string; completed: boolean; xpReward: number } | null> {
  const challengeMap: Record<string, string> = {
    weigh_in_logged: 'lose_05kg',
    exercise_logged: 'exercise_4_times',
    steps_logged: 'avg_steps_8000',
  };
  const challengeType = challengeMap[type];
  if (!challengeType) return null;
  return updateChallengeProgress(userId, challengeType, 1);
}
