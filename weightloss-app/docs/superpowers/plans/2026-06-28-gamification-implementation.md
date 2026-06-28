# Gamification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add XP, levels, achievements, streaks, daily quests, weekly challenges, journey map, leaderboards, and celebrations to the weight loss app.

**Architecture:** A `lib/gamification/` engine handles all game logic. Each existing Server Action calls `handleEvent()` after its DB write. The engine returns celebration data (xp, level-ups, achievements) that the client renders as toast notifications, confetti, and modals. 9 new DB tables, 12 new UI components, 1 new page. All additive — zero existing tables modified.

**Tech Stack:** Next.js 14 App Router, PostgreSQL 16, canvas-confetti, Lucide icons, existing glassmorphism theme.

---

## File Structure

### New Files
```
lib/gamification/types.ts           — Shared types, quest/challenge pools
lib/gamification/xp.ts              — awardXp(), calculateLevel(), xpProgress()
lib/gamification/anti-cheat.ts      — validateEvent()
lib/gamification/streaks.ts         — updateStreak(), getStreaks(), checkStreakMilestone()
lib/gamification/achievements.ts    — checkAndUnlockAchievements()
lib/gamification/quests.ts          — ensureDailyQuests(), updateQuestProgress()
lib/gamification/challenges.ts      — ensureWeeklyChallenge(), updateChallengeProgress()
lib/gamification/journey.ts         — updateJourney()
lib/gamification/leaderboard.ts     — getLeaderboard()
lib/gamification/index.ts           — handleEvent() main entry point
lib/actions/gamification.ts         — getGamificationData() server action

components/gamification/LevelBadge.tsx
components/gamification/XpBar.tsx
components/gamification/StreakDisplay.tsx
components/gamification/BadgeCard.tsx
components/gamification/BadgeGallery.tsx
components/gamification/QuestCard.tsx
components/gamification/ChallengeBanner.tsx
components/gamification/JourneyMap.tsx
components/gamification/LeaderboardTable.tsx
components/gamification/ConfettiOverlay.tsx
components/gamification/GamificationWidget.tsx
components/gamification/LevelUpModal.tsx

app/app/gamification/page.tsx
```

### Modified Files
```
lib/schema.sql                  — Append 9 new tables + seed achievements
lib/actions/food.ts             — Add handleEvent() call
lib/actions/water.ts            — Add handleEvent() call
lib/actions/weigh-in.ts         — Add handleEvent() call
lib/actions/exercise.ts         — Add handleEvent() call
lib/actions/steps.ts            — Add handleEvent() call
app/app/page.tsx                — Add GamificationWidget to dashboard
package.json                    — Add canvas-confetti
```

---

### Task 1: Database Migration

**Files:** Modify `lib/schema.sql`

- [ ] **Add 9 gamification tables + seed data + user init rows**

Append to the end of `lib/schema.sql`:

```sql
-- =============================================================================
-- Gamification tables (v2.0 — all IF NOT EXISTS, zero production risk)
-- =============================================================================

CREATE TABLE IF NOT EXISTS xp_events (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  source_table TEXT,
  source_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xp_events_user ON xp_events(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS xp_events_source ON xp_events(source_table, source_id) WHERE source_table IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_levels (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('beginner','consistency','weight_loss','nutrition','special')),
  icon TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS daily_quests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL,
  quest_type TEXT NOT NULL,
  target_value REAL NOT NULL DEFAULT 1,
  progress REAL NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS daily_quests_user_date ON daily_quests(user_id, quest_date);

CREATE TABLE IF NOT EXISTS weekly_challenges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  challenge_type TEXT NOT NULL,
  target_value REAL NOT NULL DEFAULT 1,
  progress REAL NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  xp_reward INTEGER NOT NULL DEFAULT 75,
  completed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS weekly_challenges_user_week ON weekly_challenges(user_id, week_start);

CREATE TABLE IF NOT EXISTS streaks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('logging','water','nutrition','exercise')),
  current_count INTEGER NOT NULL DEFAULT 0,
  longest_count INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, streak_type)
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp BIGINT NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  achievements_unlocked INTEGER NOT NULL DEFAULT 0,
  total_days_logged INTEGER NOT NULL DEFAULT 0,
  total_water_ml BIGINT NOT NULL DEFAULT 0,
  total_calories_tracked BIGINT NOT NULL DEFAULT 0,
  challenges_completed INTEGER NOT NULL DEFAULT 0,
  total_weight_kg_lost REAL NOT NULL DEFAULT 0,
  journeys_completed INTEGER NOT NULL DEFAULT 0,
  streak_protection_tokens INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journey_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journey_type TEXT NOT NULL DEFAULT 'nz_walk',
  total_distance_km REAL NOT NULL DEFAULT 3000,
  progress_km REAL NOT NULL DEFAULT 0,
  current_milestone TEXT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS journey_progress_user ON journey_progress(user_id, journey_type);

INSERT INTO achievements (slug, name, description, category, xp_reward, condition_type, condition_value) VALUES
  ('first_weigh_in', 'First Steps', 'Log your first weigh-in', 'beginner', 25, 'weigh_in_count', 1),
  ('first_food', 'Fuel Up', 'Log your first food entry', 'beginner', 25, 'food_count', 1),
  ('first_litre', 'Hydrated', 'Log 1L of water total', 'beginner', 25, 'water_ml', 1000),
  ('streak_3', 'Threepeat', 'Maintain a 3-day logging streak', 'consistency', 50, 'streak_days', 3),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day logging streak', 'consistency', 100, 'streak_days', 7),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day logging streak', 'consistency', 500, 'streak_days', 30),
  ('streak_100', 'Century Club', 'Maintain a 100-day logging streak', 'consistency', 2000, 'streak_days', 100),
  ('streak_365', 'Year Strong', 'Maintain a 365-day logging streak', 'consistency', 10000, 'streak_days', 365),
  ('weight_loss_1', 'First Kilo', 'Lose 1 kg from your starting weight', 'weight_loss', 100, 'weight_lost_kg', 1),
  ('weight_loss_5', 'Half Stone', 'Lose 5 kg from your starting weight', 'weight_loss', 300, 'weight_lost_kg', 5),
  ('weight_loss_10', 'Double Digits', 'Lose 10 kg from your starting weight', 'weight_loss', 1000, 'weight_lost_kg', 10),
  ('weight_loss_20', 'Transform', 'Lose 20 kg from your starting weight', 'weight_loss', 3000, 'weight_lost_kg', 20),
  ('calorie_7_days', 'Calorie Controlled', 'Hit your calorie goal 7 days in a row', 'nutrition', 200, 'calorie_streak_days', 7),
  ('protein_30', 'Protein Power', 'Hit your protein goal 30 times', 'nutrition', 500, 'protein_hit_count', 30),
  ('water_50', 'Aqua Champion', 'Hit your water goal 50 times', 'nutrition', 500, 'water_hit_count', 50),
  ('full_month', 'Full Month', 'Log every day for a full calendar month', 'special', 1000, 'daily_log_month', 1),
  ('early_bird_50', 'Early Bird', 'Log before 7 AM 50 times', 'special', 200, 'early_log_count', 50),
  ('night_owl_50', 'Night Owl', 'Log after 10 PM 50 times', 'special', 200, 'late_log_count', 50),
  ('nz_walker', 'NZ Walker', 'Complete the New Zealand journey map', 'special', 5000, 'journey_complete', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO user_levels (user_id, level, total_xp) SELECT id, 1, 0 FROM users ON CONFLICT (user_id) DO NOTHING;
INSERT INTO user_stats (user_id) SELECT id FROM users ON CONFLICT (user_id) DO NOTHING;
INSERT INTO streaks (user_id, streak_type)
  SELECT u.id, s.streak_type FROM users u
  CROSS JOIN (VALUES ('logging'),('water'),('nutrition'),('exercise')) AS s(streak_type)
  ON CONFLICT (user_id, streak_type) DO NOTHING;
```

- [ ] **Verify 9 new tables all use IF NOT EXISTS**

Run: `grep -c "CREATE TABLE IF NOT EXISTS" app/lib/schema.sql`
Expected: >= 20 (original 11 + 9 new)

---

### Task 2: Gamification Engine — Core

**Files:** Create `lib/gamification/types.ts`, `xp.ts`, `anti-cheat.ts`

- [ ] **Create `lib/gamification/types.ts`**

```typescript
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
```

- [ ] **Create `lib/gamification/xp.ts`**

```typescript
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
```

- [ ] **Create `lib/gamification/anti-cheat.ts`**

```typescript
export function validateEvent(eventType: string, data?: Record<string, unknown>): { allowed: boolean; reason?: string } {
  if (eventType === 'weigh_in_logged') {
    const weight = data?.weight_kg as number | undefined;
    if (weight != null && weight > 500) return { allowed: false, reason: 'unrealistic_weight' };
  }
  if (eventType === 'steps_logged') {
    const steps = data?.steps as number | undefined;
    if (steps != null && steps > 200000) return { allowed: false, reason: 'unrealistic_steps' };
  }
  return { allowed: true };
}
```

---

### Task 3: Gamification Engine — Streaks

**Files:** Create `lib/gamification/streaks.ts`

- [ ] **Create `lib/gamification/streaks.ts`**

```typescript
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

  if (lastStr === todayStr) return { streakMilestones: [], protectionUsed: false }; // Same day

  let newCount = streak.current_count;
  let milestones: string[] = [];

  if (lastStr === yesterday.toISOString().slice(0, 10)) {
    newCount += 1;
  } else if (lastStr && lastStr < yesterday.toISOString().slice(0, 10)) {
    // Check if we have a protection token to use
    const stats = await query<{ streak_protection_tokens: number }>(
      'SELECT streak_protection_tokens FROM user_stats WHERE user_id = $1', [userId]
    );
    const tokens = stats.rows[0]?.streak_protection_tokens ?? 0;
    if (tokens > 0) {
      await query('UPDATE user_stats SET streak_protection_tokens = streak_protection_tokens - 1 WHERE user_id = $1', [userId]);
      newCount += 1; // Protected — streak continues
    } else {
      newCount = 1; // Broken — start new streak
    }
  } else {
    newCount = 1; // First activity or streak broken
  }

  const newLongest = Math.max(newCount, streak.longest_count);

  await query(
    'UPDATE streaks SET current_count = $1, longest_count = $2, last_activity_date = $3, updated_at = now() WHERE user_id = $4 AND streak_type = $5',
    [newCount, newLongest, todayStr, userId, streakType]
  );

  // Award XP for milestone achievements
  for (const ms of STREAK_MILESTONES) {
    if (newCount === ms || (newCount > ms && streak.current_count < ms)) {
      const xpAmt = STREAK_XP[ms];
      await awardXp(userId, 'streak_' + ms, xpAmt);
      milestones.push(streakType + '_' + ms);
    }
  }

  // Update longest streak in user_stats
  await query('UPDATE user_stats SET longest_streak = GREATEST(longest_streak, $1) WHERE user_id = $2', [newLongest, userId]);

  return { streakMilestones: milestones, protectionUsed: false };
}
```

---

### Task 4: Gamification Engine — Achievements

**Files:** Create `lib/gamification/achievements.ts`

- [ ] **Create `lib/gamification/achievements.ts`**

```typescript
import { query } from '@/lib/db';
import { awardXp } from './xp';

export async function checkAndUnlockAchievements(
  userId: number, eventType: string, eventData?: Record<string, unknown>
): Promise<{ slug: string; name: string; xpReward: number }[]> {
  const unlocked = (await query('SELECT a.slug FROM achievements a JOIN user_achievements ua ON ua.achievement_id = a.id WHERE ua.user_id = $1', [userId])).rows.map(r => r.slug);
  const allAchievements = (await query('SELECT * FROM achievements')).rows;
  const newOnes: { slug: string; name: string; xpReward: number }[] = [];

  for (const a of allAchievements) {
    if (unlocked.includes(a.slug)) continue;
    if (await checkCondition(userId, a.condition_type, a.condition_value, eventType, eventData)) {
      await query(
        'INSERT INTO user_achievements (user_id, achievement_id, xp_awarded) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [userId, a.id, a.xp_reward]
      );
      if (a.xp_reward > 0) {
        await awardXp(userId, 'achievement_' + a.slug, a.xp_reward);
      }
      await query('UPDATE user_stats SET achievements_unlocked = (SELECT COUNT(*) FROM user_achievements WHERE user_id = $1) WHERE user_id = $2', [userId, userId]);
      newOnes.push({ slug: a.slug, name: a.name, xpReward: a.xp_reward });
    }
  }
  return newOnes;
}

async function checkCondition(userId: number, type: string, value: number, _eventType: string, _eventData?: Record<string, unknown>): Promise<boolean> {
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
      const [first, latest] = (await Promise.all([
        query('SELECT weight_kg FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date ASC LIMIT 1', [userId]),
        query('SELECT weight_kg FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 1', [userId]),
      ])).map(r => Number(r.rows[0]?.weight_kg ?? 0));
      return first > 0 && (first - latest) >= value;
    }
    case 'calorie_streak_days': {
      // Hit calorie goal N consecutive days
      // Simple check: count how many days in the last N days had calories within goal
      const user = await query<{ calorie_target: number }>('SELECT calorie_target FROM users WHERE id = $1', [userId]);
      const target = user.rows[0]?.calorie_target ?? 2000;
      const r = await query(
        `SELECT entry_date, COALESCE(SUM(calories),0) AS cals FROM food_logs
         WHERE user_id = $1 AND entry_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
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
```

---

### Task 5: Gamification Engine — Quests & Challenges

**Files:** Create `lib/gamification/quests.ts`, `challenges.ts`

- [ ] **Create `lib/gamification/quests.ts`**

```typescript
import { query } from '@/lib/db';
import { QUEST_POOL } from './types';
import { todayISO } from '@/lib/utils';

export async function ensureDailyQuests(userId: number, date?: string) {
  const d = date ?? todayISO();
  const existing = await query(
    'SELECT * FROM daily_quests WHERE user_id = $1 AND quest_date = $2', [userId, d]
  );
  if (existing.rows.length > 0) return existing.rows;

  // Pick 3 random quests
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
  const r = await query(
    `UPDATE daily_quests SET progress = LEAST(target_value, progress + $1),
            completed = (progress + $1 >= target_value),
            completed_at = CASE WHEN (progress + $1 >= target_value) AND completed = FALSE THEN now() ELSE completed_at END
     WHERE user_id = $1 AND quest_date = $2 AND quest_type = $3 AND NOT completed
     RETURNING id, completed, xp_reward, quest_type`,
    [progress, userId, d, questType]
  );
  return r.rows[0] ?? null;
}
```

- [ ] **Create `lib/gamification/challenges.ts`**

```typescript
import { query } from '@/lib/db';
import { CHALLENGE_POOL } from './types';
import { startOfWeekISO } from '@/lib/utils';

export async function ensureWeeklyChallenge(userId: number) {
  const weekStart = startOfWeekISO(new Date().toISOString().slice(0, 10));
  const existing = await query(
    'SELECT * FROM weekly_challenges WHERE user_id = $1 AND week_start = $2', [userId, weekStart]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  // Pick random challenge
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
  const r = await query(
    `UPDATE weekly_challenges SET progress = LEAST(target_value, progress + $1),
            completed = (progress + $1 >= target_value),
            completed_at = CASE WHEN (progress + $1 >= target_value) AND completed = FALSE THEN now() ELSE completed_at END
     WHERE user_id = $1 AND week_start = $2 AND challenge_type = $3 AND NOT completed
     RETURNING id, completed, xp_reward, challenge_type`,
    [progress, userId, weekStart, challengeType]
  );
  return r.rows[0] ?? null;
}
```

---

### Task 6: Gamification Engine — Journey & Leaderboard

**Files:** Create `lib/gamification/journey.ts`, `leaderboard.ts`, `index.ts`

- [ ] **Create `lib/gamification/journey.ts`**

```typescript
import { query } from '@/lib/db';
import { awardXp } from './xp';

const MILESTONES = [
  { km: 0, name: 'Cape Reinga' }, { km: 100, name: 'Kaitaia' },
  { km: 400, name: 'Auckland' }, { km: 550, name: 'Hamilton' },
  { km: 700, name: 'Taupō' }, { km: 1100, name: 'Wellington' },
  { km: 1150, name: 'Cook Strait' }, { km: 1800, name: 'Christchurch' },
  { km: 2500, name: 'Dunedin' }, { km: 3000, name: 'Bluff' },
];

export async function updateJourney(userId: number): Promise<{ progressKm: number; currentMilestone: string | null; completed: boolean }> {
  // Calculate progress: 60km per kg lost + 5km per streak day + 8km per 10k steps
  const [weightData, streakData, userData] = await Promise.all([
    query('SELECT weight_kg FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date ASC LIMIT 1', [userId]),
    query('SELECT current_count FROM streaks WHERE user_id = $1 AND streak_type = $2', [userId, 'logging']),
    query('SELECT weight_kg FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 1', [userId]),
  ]);

  const startWt = Number(weightData.rows[0]?.weight_kg ?? 0);
  const currentWt = Number(userData.rows[0]?.weight_kg ?? 0);
  const weightLost = startWt > 0 ? Math.max(0, startWt - currentWt) : 0;
  const streakDays = streakData.rows[0]?.current_count ?? 0;

  const progressKm = Math.min(3000, weightLost * 60 + streakDays * 5);

  // Find current milestone
  let currentMilestone: string | null = null;
  for (const m of MILESTONES) {
    if (progressKm >= m.km) currentMilestone = m.name;
  }

  const completed = progressKm >= 3000;

  await query(
    `INSERT INTO journey_progress (user_id, journey_type, progress_km, current_milestone, completed, completed_at)
     VALUES ($1, 'nz_walk', $2, $3, $4, CASE WHEN $4 THEN now() ELSE NULL END)
     ON CONFLICT (user_id, journey_type) DO UPDATE SET
       progress_km = GREATEST(journey_progress.progress_km, $2),
       current_milestone = $3,
       completed = $4 OR journey_progress.completed,
       completed_at = CASE WHEN $4 AND NOT journey_progress.completed THEN now() ELSE journey_progress.completed_at END`,
    [userId, progressKm, currentMilestone, completed]
  );

  return { progressKm, currentMilestone, completed };
}
```

- [ ] **Create `lib/gamification/leaderboard.ts`**

```typescript
import { query } from '@/lib/db';
import type { LeaderboardEntry } from './types';

export async function getLeaderboard(type: string, _period: string = 'all'): Promise<LeaderboardEntry[]> {
  switch (type) {
    case 'streak':
      return (await query(
        `SELECT u.id, COALESCE(u.name, 'User #' || u.id) AS display_name, s.current_count AS value
         FROM streaks s JOIN users u ON u.id = s.user_id WHERE s.streak_type = 'logging' AND u.is_active = TRUE
         ORDER BY s.current_count DESC LIMIT 50`
      )).rows.map((r, i) => ({ rank: i + 1, displayName: 'Anonymous', value: r.value }));
    case 'xp_week': {
      const r = await query(
        `SELECT u.id, COALESCE(u.name, 'User #' || u.id) AS display_name, COALESCE(SUM(e.points),0) AS value
         FROM xp_events e JOIN users u ON u.id = e.user_id
         WHERE e.created_at >= date_trunc('week', now()) AND u.is_active = TRUE
         GROUP BY u.id, u.name ORDER BY value DESC LIMIT 50`
      );
      return r.rows.map((r, i) => ({ rank: i + 1, displayName: 'Anonymous', value: Number(r.value) }));
    }
    case 'challenges':
      return (await query(
        `SELECT u.id, COALESCE(u.name, 'User #' || u.id) AS display_name, COALESCE(s.challenges_completed,0) AS value
         FROM user_stats s JOIN users u ON u.id = s.user_id WHERE u.is_active = TRUE
         ORDER BY value DESC LIMIT 50`
      )).rows.map((r, i) => ({ rank: i + 1, displayName: 'Anonymous', value: r.value }));
    case 'weight_loss': {
      const r = await query(
        `SELECT u.id, COALESCE(u.name, 'User #' || u.id) AS name,
                (SELECT weight_kg FROM weigh_ins WHERE user_id = u.id ORDER BY entry_date ASC LIMIT 1) AS start_wt,
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
```

- [ ] **Create `lib/gamification/index.ts`**

```typescript
import type { GameEvent, CelebrationResult } from './types';
import { validateEvent } from './anti-cheat';
import { awardXp, calculateLevel } from './xp';
import { updateStreak } from './streaks';
import { checkAndUnlockAchievements } from './achievements';
import { ensureDailyQuests, updateQuestProgress } from './quests';
import { ensureWeeklyChallenge, updateChallengeProgress } from './challenges';
import { updateJourney } from './journey';
import { query } from '@/lib/db';

export async function handleEvent(event: GameEvent): Promise<CelebrationResult> {
  const { userId, type, sourceTable, sourceId, data } = event;

  // 1. Anti-cheat
  const { allowed } = validateEvent(type, data);
  if (!allowed) {
    return { xpAwarded: 0, levelUp: null, newAchievements: [], questProgress: [], streakMilestones: [], challengeProgress: null, journeyProgress: null };
  }

  // 2. Award XP
  const { oldLevel, newLevel } = await awardXp(userId, type, undefined, sourceTable, sourceId);

  // 3. Update streaks
  const date = new Date().toISOString().slice(0, 10);
  const streakType = type === 'food_logged' || type === 'steps_logged' || type === 'note_logged' ? 'logging' :
    type === 'water_logged' ? 'water' : type === 'exercise_logged' ? 'exercise' : 'logging';
  const { streakMilestones } = await updateStreak(userId, streakType, date);

  // Also update nutrition streak for food logs
  if (type === 'food_logged') {
    await updateStreak(userId, 'nutrition', date);
  }

  // 4. Check achievements
  const newAchievements = await checkAndUnlockAchievements(userId, type, data);

  // 5. Update daily quests
  await ensureDailyQuests(userId);
  const questResult = await updateQuestForEvent(userId, type, data);

  // 6. Update weekly challenge
  const challenge = await ensureWeeklyChallenge(userId);
  const challengeResult = await updateChallengeForEvent(userId, type, data);

  // 7. Update journey progress (only for weigh-ins and streaks)
  let journeyResult = null;
  if (type === 'weigh_in_logged') {
    journeyResult = await updateJourney(userId);
  }

  return {
    xpAwarded: newLevel > oldLevel ? 0 : 0, // XP counted internally
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
  const questMap: Record<string, { type: string; progress: number }[]> = {
    food_logged: [
      { type: 'log_all_meals', progress: 1 },
      { type: 'fibre_30g', progress: 0 }, // handled below
      { type: 'under_calories', progress: 0 },
      { type: 'protein_goal', progress: 0 },
    ],
    water_logged: [{ type: 'water_goal', progress: 0 }],
    exercise_logged: [{ type: 'exercise_30min', progress: Number(data?.duration_min ?? 0) }],
    steps_logged: [{ type: 'steps_8000', progress: Number(data?.steps ?? 0) }],
    weigh_in_logged: [{ type: 'weigh_in', progress: 1 }],
  };

  const mappings = questMap[type];
  if (!mappings) return null;

  for (const mapping of mappings) {
    const result = await updateQuestProgress(userId, mapping.type, mapping.progress, today);
    if (result) return result;
  }

  // Check fibre/protein/calories goals separately (need to query today's totals)
  if (type === 'food_logged') {
    const totals = await query(
      `SELECT COALESCE(SUM(calories),0) AS cals, COALESCE(SUM(fibre_g),0) AS fibre, COALESCE(SUM(protein_g),0) AS protein
       FROM food_logs WHERE user_id = $1 AND entry_date = $2`,
      [userId, today]
    );
    const t = totals.rows[0];
    const fibre = Number(t?.fibre ?? 0);
    const protein = Number(t?.protein ?? 0);

    if (fibre >= 30) {
      const r = await updateQuestProgress(userId, 'fibre_30g', 30, today);
      if (r) return r;
    }
    const user = await query('SELECT calorie_target, protein_target_g FROM users WHERE id = $1', [userId]);
    const calTarget = user.rows[0]?.calorie_target ?? 2000;
    const proteinTarget = user.rows[0]?.protein_target_g ?? 100;

    if (Number(t?.cals ?? 0) <= calTarget) {
      const r = await updateQuestProgress(userId, 'under_calories', 1, today);
      if (r) return r;
    }
    if (protein >= proteinTarget) {
      const r = await updateQuestProgress(userId, 'protein_goal', 1, today);
      if (r) return r;
    }
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
```

---

### Task 7: Integrate Server Actions

**Files:** Modify `lib/actions/food.ts`, `water.ts`, `weigh-in.ts`, `exercise.ts`, `steps.ts`

- [ ] **Add handleEvent() call to each Server Action**

For each create action, add after the audit call and before return:

```typescript
// In createFood, after audit():
import { handleEvent } from '@/lib/gamification';
const game = await handleEvent({ userId: user.id, type: 'food_logged', sourceTable: 'food_logs', sourceId: r.rows[0].id, data: { calories: parsed.data.calories, protein_g: parsed.data.protein_g, fibre_g: parsed.data.fibre_g } });
return { id: r.rows[0].id, game };

// In createWater, after audit():
const game = await handleEvent({ userId: user.id, type: 'water_logged', sourceTable: 'water_logs', sourceId: r.rows[0].id, data: { amount_ml: parsed.data.amount_ml } });
return { id: r.rows[0].id, game };

// In createWeighIn, after audit():
const game = await handleEvent({ userId: user.id, type: 'weigh_in_logged', sourceTable: 'weigh_ins', sourceId: r.rows[0].id, data: { weight_kg: parsed.data.weight_kg } });
return { id: r.rows[0].id, entry_date: date, game };

// In createExercise, after audit():
const game = await handleEvent({ userId: user.id, type: 'exercise_logged', sourceTable: 'exercise_logs', sourceId: r.rows[0].id, data: { duration_min: parsed.data.duration_min } });
return { id: r.rows[0].id, game };

// In createSteps, after audit():
const game = await handleEvent({ userId: user.id, type: 'steps_logged', sourceTable: 'step_logs', sourceId: r.rows[0].id, data: { steps: parsed.data.steps } });
return { id: r.rows[0].id, game };
```

---

### Task 8: Gamification Data Server Action

**Files:** Create `lib/actions/gamification.ts`

- [ ] **Create the server action**

```typescript
'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateLevel, xpProgress } from '@/lib/gamification/xp';
import { getStreaks } from '@/lib/gamification/streaks';
import { getLeaderboard } from '@/lib/gamification/leaderboard';
import { ensureDailyQuests } from '@/lib/gamification/quests';
import { ensureWeeklyChallenge } from '@/lib/gamification/challenges';
import { QUEST_POOL, CHALLENGE_POOL } from '@/lib/gamification/types';

export async function getGamificationData() {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const [levelData, stats, streaks, achievements, quests, challenge, journey] = await Promise.all([
    query('SELECT * FROM user_levels WHERE user_id = $1', [user.id]),
    query('SELECT * FROM user_stats WHERE user_id = $1', [user.id]),
    getStreaks(user.id),
    query(
      `SELECT a.slug, a.name, a.description, a.category, a.icon, a.xp_reward, ua.unlocked_at
       FROM achievements a LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       ORDER BY a.id`, [user.id]
    ),
    ensureDailyQuests(user.id),
    ensureWeeklyChallenge(user.id),
    query('SELECT * FROM journey_progress WHERE user_id = $1 AND journey_type = $2', [user.id, 'nz_walk']),
  ]);

  const lvl = levelData.rows[0] ?? { level: 1, total_xp: 0 };
  const s = stats.rows[0] ?? {};
  const j = journey.rows[0] ?? { progress_km: 0, current_milestone: null, completed: false };
  const { currentLevelXp, xpForNext } = xpProgress(lvl.total_xp, lvl.level);

  return {
    level: lvl.level,
    totalXp: lvl.total_xp,
    xpProgress: { current: currentLevelXp, needed: xpForNext },
    stats: s,
    streaks,
    achievements: achievements.rows.map((a: any) => ({
      slug: a.slug, name: a.name, description: a.description, category: a.category,
      unlocked: !!a.unlocked_at, unlockedAt: a.unlocked_at, xpReward: a.xp_reward,
    })),
    quests: quests.map((q: any) => {
      const def = QUEST_POOL.find(p => p.type === q.quest_type);
      return { ...q, label: def?.label ?? q.quest_type, description: def?.desc ?? '' };
    }),
    challenge: challenge ? (() => {
      const def = CHALLENGE_POOL.find(p => p.type === challenge.challenge_type);
      return { ...challenge, label: def?.label ?? challenge.challenge_type, description: def?.desc ?? '' };
    })() : null,
    journey: { progressKm: j.progress_km, currentMilestone: j.current_milestone, completed: j.completed, totalDistanceKm: 3000 },
  };
}

export async function getLeaderboardData(type: string, period: string = 'all') {
  return getLeaderboard(type, period);
}
```

---

### Task 9: UI Components — Level, XP, Streak

**Files:** Create `LevelBadge.tsx`, `XpBar.tsx`, `StreakDisplay.tsx`, `GamificationWidget.tsx`

- [ ] **Create each component**

Each component is a `'use client'` component following existing design patterns (glassmorphism, tailwind classes, Lucide icons).

`LevelBadge.tsx` — Circular level indicator with thick ring showing XP progress toward next level. Use the same SVG ring pattern as WeightRing.

`XpBar.tsx` — Horizontal progress bar showing "2,450 / 4,000 XP to Level 10". Use existing `.stat` classes.

`StreakDisplay.tsx` — Shows 🔥 with streak count, streak type label. Color transitions from teal→amber→red at higher counts.

`GamificationWidget.tsx` — Dashboard widget showing level badge + XP bar + active quests + current streaks. This is the compact dashboard embed.

---

### Task 10: UI Components — Badges, Quests, Challenges

**Files:** Create `BadgeCard.tsx`, `BadgeGallery.tsx`, `QuestCard.tsx`, `ChallengeBanner.tsx`

- [ ] **Create each component**

`BadgeCard.tsx` — Glass card with icon placeholder, name, description. When unlocked: full color + "Unlocked" badge. When locked: grayscale + lock icon overlay.

`BadgeGallery.tsx` — 3-column grid of BadgeCards grouped by category. Each category has a heading.

`QuestCard.tsx` — Glass card showing quest label, description, progress bar (filling toward target), XP reward badge. Completed state shows green check.

`ChallengeBanner.tsx` — Full-width glass banner showing the weekly challenge with progress indicator, days remaining, and XP reward. More prominent than quest cards.

---

### Task 11: UI Components — Journey, Leaderboard, Celebrations

**Files:** Create `JourneyMap.tsx`, `LeaderboardTable.tsx`, `ConfettiOverlay.tsx`, `LevelUpModal.tsx`

- [ ] **Create each component**

`JourneyMap.tsx` — Vertical timeline-style component with milestone checkpoints. Each milestone shows location name and km. Current position highlighted. Progress bar at top shows % complete. Uses a vertical line with dots.

`LeaderboardTable.tsx` — Simple ranked table (rank, name, value) with glass styling. Period tabs (All Time, This Week) if supported.

`ConfettiOverlay.tsx` — Wrapper around canvas-confetti library. Exports `fireCelebration(type: string)` function. Triggered on level-up, achievement unlock, streak milestone.

`LevelUpModal.tsx` — Full-screen overlay with level number, confetti, "Level Up!" message. Auto-dismisses after 3 seconds.

---

### Task 12: Gamification Page

**Files:** Create `app/app/gamification/page.tsx`

- [ ] **Create the page**

Server component that calls `getGamificationData()` and renders the full stats dashboard:

```typescript
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getGamificationData } from '@/lib/actions/gamification';
import GamificationClient from './GamificationClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gamification — Weight Loss' };

export default async function GamificationPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const data = await getGamificationData();
  if ('error' in data) return <div>{data.error}</div>;

  return <GamificationClient data={data} />;
}
```

Create `app/app/gamification/GamificationClient.tsx` — `'use client'` component that arranges all gamification components in a dashboard layout with tabs/sections:
- Top row: Level badge + XP bar + Quick stats (total XP, streak, achievements)
- Tabbed sections: Badges, Quests, Challenges, Journey, Leaderboard

---

### Task 13: Dashboard Integration

**Files:** Modify `app/app/page.tsx`

- [ ] **Add GamificationWidget to the dashboard**

After the QuickLog section (or in the stats area), add the GamificationWidget:

```typescript
import { GamificationWidget } from '@/components/gamification/GamificationWidget';

// In the dashboard JSX, add:
<div className="mt-5">
  <GamificationWidget userId={user.id} />
</div>
```

The GamificationWidget internally calls `getGamificationData()` to fetch its data.

---

### Task 14: Install Dependencies & Build

- [ ] **Install canvas-confetti**

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

- [ ] **Build and verify**

```bash
npm run build
```

Expected: Build succeeds, no TypeScript errors.

- [ ] **Commit**

```bash
git add -A
git commit -m "feat: add gamification system — XP, levels, achievements, streaks, quests, challenges, journey map, leaderboards, celebrations"
git push
```
