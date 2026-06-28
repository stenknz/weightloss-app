export type EventType =
  | 'food_logged' | 'water_logged' | 'weigh_in_logged'
  | 'exercise_logged' | 'steps_logged' | 'note_logged';

export interface GameEvent {
  userId: number;
  type: EventType;
  sourceTable?: string;
  sourceId?: number;
  data?: Record<string, unknown>;
}

export interface CelebrationResult {
  xpAwarded: number;
  levelUp: { oldLevel: number; newLevel: number } | null;
  newAchievements: { slug: string; name: string; xpReward: number }[];
  questProgress: { id: number; questType: string; completed: boolean; xpReward: number }[];
  challengeProgress: { id: number; challengeType: string; completed: boolean; xpReward: number } | null;
  streakMilestones: string[];
  journeyProgress: { progressKm: number; currentMilestone: string | null } | null;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  value: number;
}

export const QUEST_POOL = [
  { type: 'water_goal', target: 1, xp: 15, label: 'Drink Up', desc: 'Reach your daily water goal' },
  { type: 'fibre_30g', target: 30, xp: 20, label: 'Get Your Greens', desc: 'Eat at least 30g of fibre' },
  { type: 'under_calories', target: 1, xp: 15, label: 'Stay on Track', desc: 'Stay under your calorie goal' },
  { type: 'log_all_meals', target: 4, xp: 15, label: 'Log It All', desc: 'Log all 4 meal slots' },
  { type: 'exercise_30min', target: 30, xp: 20, label: 'Move Your Body', desc: 'Exercise for 30+ minutes' },
  { type: 'steps_8000', target: 8000, xp: 15, label: 'Hit the Pavement', desc: 'Take 8,000+ steps' },
  { type: 'weigh_in', target: 1, xp: 10, label: 'Weigh In', desc: 'Log a weigh-in' },
  { type: 'protein_goal', target: 1, xp: 20, label: 'Protein Push', desc: 'Hit your protein goal' },
] as const;

export const CHALLENGE_POOL = [
  { type: 'lose_05kg', target: 0.5, xp: 100, label: 'The Weigh Down', desc: 'Lose 0.5kg this week' },
  { type: 'calorie_5_days', target: 5, xp: 100, label: 'Perfect Week', desc: 'Hit calorie goal 5 days' },
  { type: 'exercise_4_times', target: 4, xp: 100, label: 'Half Marathon', desc: 'Exercise 4 times' },
  { type: 'avg_steps_8000', target: 8000, xp: 75, label: 'Step It Up', desc: 'Average 8,000+ steps' },
  { type: 'water_5_days', target: 5, xp: 75, label: 'Hydration Hero', desc: 'Hit water goal 5 days' },
  { type: 'log_every_day', target: 7, xp: 150, label: 'Full Tracker', desc: 'Log every day this week' },
] as const;
