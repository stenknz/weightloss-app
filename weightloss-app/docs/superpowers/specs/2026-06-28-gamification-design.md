# Gamification System — Design Spec

**Date:** 2026-06-28
**Version:** v2.0
**Applies to:** Weight Loss App (Next.js 14, App Router, PostgreSQL 16)

## Overview

Add a comprehensive gamification layer to motivate daily engagement, reward consistency, and visualize long-term health progress. All new features are additive — zero modifications to existing tables, zero data loss risk. Uses `IF NOT EXISTS` migrations only.

## Scope (v2.0)

| Feature | Status |
|---------|--------|
| XP & Leveling System | Included |
| Achievement Badges | Included |
| Daily Quests | Included |
| Weekly Challenges | Included |
| Streak System | Included |
| Journey Map (Walk NZ) | Included |
| Stats Dashboard | Included |
| Celebrations & Animations | Included |
| Leaderboards (opt-in) | Included |
| Anti-Cheat Protection | Included |
| Push Notifications | **Deferred** |

---

## 1. XP & Leveling System

### XP Awards

| Action | XP |
|--------|----|
| Log weight | +10 |
| Log water (per entry) | +5 |
| Log a meal (food entry) | +5 |
| Complete daily calorie goal | +20 |
| Complete protein goal | +20 |
| Complete fibre goal | +15 |
| Hit water goal (daily) | +15 |
| Exercise session | +25 |
| Complete all daily goals | +50 (bonus) |
| Streak milestones (7d/30d/100d/365d) | +100/+500/+2000/+10000 |

### Level Curve

Formula: `xpForLevel(n) = floor(50 * (n * (1 + n/20)^0.8))`

**Pacing (~150 XP/day for active user):**

| Level | XP to next | Total XP | Est. Time |
|-------|-----------|----------|-----------|
| 1 | — | 0 | Start |
| 2 | 100 | 100 | ~1 day |
| 5 | 270 | 720 | ~5 days |
| 10 | 700 | ~4,000 | ~3 weeks |
| 20 | 2,100 | ~16,000 | ~4 months |
| 30 | 4,400 | ~40,000 | ~9 months |
| 50 | 10,000 | ~120,000 | ~2 years |
| 75 | 20,000 | ~300,000 | ~4 years |
| 100 | 35,000 | ~600,000 | ~7+ years |

### Display

- Current level shown as a circular badge with XP progress ring (Apple Fitness-style)
- XP bar reads: "1,245 / 4,000 XP to Level 10"
- Level-up triggers confetti celebration + LevelUpModal

---

## 2. Achievement Badges

15 badges across 5 categories. Static definitions seeded at migration.

### Beginner (auto-unlock on first action)

| Badge | Condition | XP |
|-------|-----------|----|
| First Steps | First weigh-in logged | +25 |
| Fuel Up | First food entry logged | +25 |
| Hydrated | First 1L of water logged (cumulative) | +25 |

### Consistency (streak milestones)

| Badge | Condition | XP |
|-------|-----------|----|
| Threepeat | 3-day logging streak | +50 |
| Week Warrior | 7-day logging streak | +100 |
| Monthly Master | 30-day logging streak | +500 |
| Century Club | 100-day logging streak | +2,000 |
| Year Strong | 365-day logging streak | +10,000 |

### Weight Loss

| Badge | Condition | XP |
|-------|-----------|----|
| First Kilo | Lose 1 kg from starting weight | +100 |
| Half Stone | Lose 5 kg | +300 |
| Double Digits | Lose 10 kg | +1,000 |
| Transform | Lose 20 kg | +3,000 |

### Nutrition

| Badge | Condition | XP |
|-------|-----------|----|
| Calorie Controlled | Hit calorie goal 7 days in a row | +200 |
| Protein Power | Hit protein goal 30 times total | +500 |
| Aqua Champion | Hit water goal 50 times total | +500 |

### Special

| Badge | Condition | XP |
|-------|-----------|----|
| Full Month | Logged every day for a calendar month | +1,000 |
| Early Bird | Log before 7 AM (50 times) | +200 |
| Night Owl | Log after 10 PM (50 times) | +200 |
| NZ Walker | Complete the NZ journey map | +5,000 |

---

## 3. Daily Quests

- **3 quests per user per day.** Generated at midnight server-side (or on first daily request).
- **Pool of 8 quests**, randomly selected each day:

| Quest | Condition | XP |
|-------|-----------|----|
| Drink Up | Reach daily water goal | +15 |
| Get Your Greens | Eat ≥30g fibre | +20 |
| Stay on Track | Stay under calorie goal | +15 |
| Log It All | Log all 4 meal slots | +15 |
| Move Your Body | Exercise ≥30 min | +20 |
| Hit the Pavement | ≥8,000 steps | +15 |
| Weigh In | Log a weigh-in | +10 |
| Protein Push | Hit protein goal | +20 |

- No penalty for incomplete quests.
- Completed quests show ✓ and can't be re-awarded until next day.
- Auto-progress tracked — e.g., "Drink Up" shows "1.2L / 2.7L".

---

## 4. Weekly Challenges

- **1 challenge per user per week.** Resets Monday.
- **Pool of 6 challenges**, the most relevant one is auto-assigned:

| Challenge | Condition | XP |
|-----------|-----------|----|
| The Weigh Down | Lose ≥0.5 kg this week | +100 |
| Perfect Week | Hit calorie goal ≥5 days | +100 |
| Half Marathon | Exercise ≥4 times | +100 |
| Step It Up | Avg ≥8,000 steps | +75 |
| Hydration Hero | Hit water goal ≥5 days | +75 |
| Full Tracker | Log every day this week | +150 |

---

## 5. Streak System

### Tracked Types

| Streak | Trigger |
|--------|---------|
| Daily Logging | Any log entry on consecutive calendar days |
| Water | Hit daily water goal consecutive days |
| Nutrition | Logged ≥1 meal with macros consecutive days |
| Exercise | Logged ≥1 exercise session consecutive days |

### Mechanics

- Each type has `current_count` and `longest_count`.
- **Fire indicator:** 🔥 emoji with count. Intensity scales at 7, 30, 100, 365.
- **Streak protection:** 1 protection token earned every 30 consecutive days. Auto-applied on first missed day to prevent streak reset.
- **Milestone XP bonuses** awarded at thresholds (7d/+100, 30d/+500, 100d/+2,000, 365d/+10,000).
- XP is awarded once per milestone (not daily).

---

## 6. Journey Map: Walk Across New Zealand

### Theme

Single global theme: walk from Cape Reinga to Bluff (~3,000 km).

### Movement Formula

| Action | Distance |
|--------|----------|
| 1 kg weight lost | 60 km |
| 1 consecutive logging day | 5 km |
| 10,000 steps | 8 km |

Completing the journey requires a realistic blend: ~20 kg lost + 100-day streak + consistent daily steps.

### Milestones

| Milestone | Distance |
|-----------|----------|
| Cape Reinga | 0 km (start) |
| Kaitaia | 100 km |
| Auckland | 400 km |
| Hamilton | 550 km |
| Taupō | 700 km |
| Wellington | 1,100 km |
| Cook Strait | 1,150 km |
| Christchurch | 1,800 km |
| Dunedin | 2,500 km |
| Bluff | 3,000 km (complete) |

### Display

- Vertical timeline-style map with milestone checkpoints.
- Current location highlighted. Progress bar shows % complete.
- Completion unlocks "NZ Walker" badge (+5,000 XP).

---

## 7. Stats Dashboard

### Route: `/gamification`

Single dedicated page. Also a compact widget on the main dashboard.

### Stats Displayed

- Current level (circular badge + XP bar)
- Total XP earned (lifetime)
- Longest streak (best-ever)
- Current streak count + fire indicator
- Total weight lost (kg from starting weight)
- Achievements unlocked (X of 15 — gallery preview)
- Total days logged
- Total water consumed (litres)
- Total calories tracked
- Weekly challenges completed
- Journey map progress (NZ walk)

---

## 8. Celebrations & Animations

### Triggers

| Event | Animation |
|-------|-----------|
| Level up | `canvas-confetti` burst + LevelUpModal overlay |
| New achievement | Badge card flip animation + toast notification |
| Streak milestone | Fire 🔥 scale-up animation + XP toast |
| Quest completed | Green checkmark pulse + "+XP" float-up text |
| Weight milestone | Celebration card + optional confetti |

### Implementation

- Use `canvas-confetti` (5KB library, compatible with Recharts).
- Server Action returns `{ celebration: 'level_up', level: 5 }` — client renders confetti on response.
- Existing toast system reused for "+50 XP" and "Achievement unlocked!" messages.

---

## 9. Leaderboards (Opt-in)

### Categories

| Board | Metric |
|-------|--------|
| Longest Streak | Current daily logging streak |
| Most XP This Week | XP earned in current week |
| Most Challenges | Total weekly challenges completed |
| Biggest Loser | % of starting weight lost |

### Privacy

- **Opt-in only.** Off by default. Toggle in Settings.
- **Display name:** default "User #ID", customizable in Settings.
- No identifying information exposed.

---

## 10. Anti-Cheat

| Rule | Implementation |
|------|---------------|
| One XP per event | XP awarded exactly once per source entry (dedup by source_id in xp_events) |
| No backdated XP | Only today's and yesterday's entries award XP |
| Unrealistic weight | Weight changes >3 kg/day flagged — don't count toward achievements |
| Rate-limited checks | Goal completions checked max once per hour per user |
| Edit/delete revokes XP | Deleting a log entry deducts associated XP |

---

## 11. Database Schema

All tables use `CREATE TABLE IF NOT EXISTS`. No existing tables modified.

```sql
CREATE TABLE IF NOT EXISTS xp_events (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  source_table TEXT,
  source_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xp_events_user ON xp_events(user_id, created_at);
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

-- Seed achievements
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
```

---

## 12. Architecture

### Engine Module: `lib/gamification/`

```
lib/gamification/
  index.ts       — handleEvent( userId, eventType, eventData ) — main entry point
  xp.ts          — awardXp(), getLevel(), xpForNextLevel()
  achievements.ts — checkAchievements(), unlockAchievement()
  streaks.ts      — updateStreak(), checkStreakMilestone()
  quests.ts       — ensureDailyQuests(), completeQuest()
  challenges.ts   — ensureWeeklyChallenge(), completeChallenge()
  journey.ts      — updateJourneyProgress()
  leaderboard.ts  — getLeaderboardData()
  anti-cheat.ts   — validateEvent(), detectUnrealisticWeight()
```

### Integration Pattern

Every existing Server Action calls `handleEvent()` after its DB write:

```typescript
// In lib/actions/food.ts after successful INSERT:
const g = await import('@/lib/gamification');
return { id: r.rows[0].id, ...(await g.handleEvent(user.id, 'food_logged', { ... })) };
```

`handleEvent()` orchestrates in order:
1. Anti-cheat validation
2. Award XP
3. Update streak
4. Check achievements
5. Update quest/challenge progress
6. Update journey progress
7. Check for level-up
8. Return celebration events

Client receives `{ xpAwarded, levelUp, newAchievements, questProgress, celebrations }` and renders accordingly (toast, confetti, modal).

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| LevelBadge | `components/gamification/LevelBadge.tsx` | Circular level indicator with XP ring |
| XpBar | `components/gamification/XpBar.tsx` | Horizontal "XP to next level" bar |
| BadgeCard | `components/gamification/BadgeCard.tsx` | Single achievement badge |
| BadgeGallery | `components/gamification/BadgeGallery.tsx` | 5-column grid of all badges |
| QuestCard | `components/gamification/QuestCard.tsx` | Daily quest with progress |
| ChallengeBanner | `components/gamification/ChallengeBanner.tsx` | Weekly challenge display |
| StreakDisplay | `components/gamification/StreakDisplay.tsx` | Fire count + streak info |
| JourneyMap | `components/gamification/JourneyMap.tsx` | NZ walk timeline/map |
| LeaderboardTable | `components/gamification/LeaderboardTable.tsx` | Anonymous ranked table |
| ConfettiOverlay | `components/gamification/ConfettiOverlay.tsx` | Canvas confetti wrapper |
| GamificationWidget | `components/gamification/GamificationWidget.tsx` | Dashboard compact widget |
| LevelUpModal | `components/gamification/LevelUpModal.tsx` | Full-screen level celebration |

### New Pages

| Route | File | Description |
|-------|------|-------------|
| `/gamification` | `app/app/gamification/page.tsx` | Full stats dashboard |

### Visual Design

All gamification UI to follow existing app design language:
- Glassmorphism cards (`.card`, `.card-glass`)
- Teal→blue gradient accents (`.gradient-accent`, `.gradient-text`)
- Dark/light theme support via existing CSS variables
- System font stack
- Reuse existing `.btn`, `.input`, `.badge`, `.stat` utility classes
- Lucide icons for badges and UI
- canvas-confetti for celebrations

---

## 13. Data Safety

- Zero existing tables modified — only `CREATE TABLE IF NOT EXISTS` additions
- No existing columns altered or dropped
- XP starts at 0 for all users (no backfill — by design)
- XP events tied to source entries — deleting a food/weight/water entry revokes its XP
- All migrations are idempotent — safe to run on every container boot (via entrypoint.js)
- Journey progress starts at 0 — backfilled from historical data if desired later

---

## 14. Deferred for Future Versions

- Push Notifications (browser Notification API + service worker)
- More journey map themes
- Social features (friend comparisons, team challenges)
- Seasonal events (holiday challenges, summer streaks)
