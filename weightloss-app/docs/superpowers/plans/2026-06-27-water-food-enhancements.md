# Water & Food Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable water goals with sex-based defaults and fibre/sugar fields to food logging.

**Architecture:** Additive DB migrations → Backend API updates → Frontend form/chart updates. No breaking changes.

**Tech Stack:** PostgreSQL, Next.js App Router, Recharts, Zod

---

### Task 1: Database Migration (schema.sql)

**Files:**
- Modify: `app/lib/schema.sql`

- [ ] **Add water_target_ml column + fibre/sugar columns**

Add at end of schema.sql, before the trigger section:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS water_target_ml INTEGER NOT NULL DEFAULT 2700;
UPDATE users SET water_target_ml = 3700 WHERE sex = 'male' AND water_target_ml = 2700;

ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS fibre_g NUMERIC(6,1) CHECK (fibre_g IS NULL OR fibre_g >= 0);
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS sugar_g NUMERIC(6,1) CHECK (sugar_g IS NULL OR sugar_g >= 0);
```

### Task 2: Backend — Water Goal

**Files:**
- Modify: `app/lib/auth.ts`
- Modify: `app/app/api/goals/route.ts`
- Modify: `app/app/api/auth/me/route.ts`
- Modify: `app/app/api/stats/route.ts`
- Modify: `app/app/api/profile/route.ts`

- [ ] **auth.ts** — Add `water_target_ml: number` to `CurrentUser` type. Add `water_target_ml` to SELECT in `getCurrentUser()`.
- [ ] **PUT /api/goals** — Parse `water_target_ml` (500–15000 ml validation). Add to UPDATE SET.
- [ ] **GET /api/goals** — Add `water_target_ml` to SELECT.
- [ ] **GET /api/auth/me** — Add `water_target_ml` to response.
- [ ] **GET /api/stats** — Add `water_target_ml` to goals SELECT and response.
- [ ] **GET /api/profile** — Add `water_target_ml` to SELECT.

### Task 3: Backend — Fibre & Sugar

**Files:**
- Modify: `app/lib/validation.ts`
- Modify: `app/app/api/food/route.ts`
- Modify: `app/app/api/stats/route.ts`

- [ ] **validation.ts** — Add `fibre_g`, `sugar_g` to `foodLogSchema`.
- [ ] **POST /api/food** — Add fibre_g and sugar_g INSERT params.
- [ ] **GET /api/food** — Add fibre_g and sugar_g to SELECT.
- [ ] **GET /api/stats** — Add fibre_g and sugar_g to todayFood SUM and response.

### Task 4: Frontend — Water Goal (GoalsClient, goals page)

**Files:**
- Modify: `app/components/GoalsClient.tsx`
- Modify: `app/app/goals/page.tsx`

- [ ] **GoalsClient** — Add water target state, input field (in L, convert *1000 for storage).
- [ ] **Goals type** — Add `water_target_ml: number | null`.
- [ ] **goals/page.tsx** — Pass `user.water_target_ml` to initial.

### Task 5: Frontend — Water Tracking (WaterClient, WaterChart, water page)

**Files:**
- Modify: `app/components/WaterClient.tsx`
- Modify: `app/components/WaterChart.tsx`
- Modify: `app/app/water/page.tsx`

- [ ] **WaterClient** — Accept `goalMl` prop. Replace hardcoded 2000. Show "X.X L consumed" + "Goal: Y.Y L". Uncapped progress bar.
- [ ] **WaterChart** — Accept optional `goalMl` prop (default 2700). Dynamic reference line.
- [ ] **water/page.tsx** — Pass `user.water_target_ml` as `goalMl` prop.

### Task 6: Frontend — Dashboard Water

**Files:**
- Modify: `app/app/page.tsx`

- [ ] Replace `waterTarget = 2000` with `user.water_target_ml ?? 2000`.
- [ ] Pass `goalMl` to WaterChart.

### Task 7: Frontend — Food Fibre & Sugar

**Files:**
- Modify: `app/components/FoodClient.tsx`
- Modify: `app/components/QuickLog.tsx`

- [ ] **FoodClient Row type** — Add `fibre_g`, `sugar_g`.
- [ ] **FoodClient form** — Add 2 inputs (Fibre g, Sugar g).
- [ ] **FoodClient todayTotals** — Add fibre/sugar reduce.
- [ ] **FoodClient Progress bars** — Add 2 components.
- [ ] **FoodClient table** — Add fibre/sugar columns.
- [ ] **FoodClient save handler** — Add to body and Row.
- [ ] **QuickLog FoodForm** — Add fibre/sugar inputs.

### Task 8: Frontend — Dashboard Fibre & Sugar Stats

**Files:**
- Modify: `app/app/page.tsx`

- [ ] Add fibre_g/sugar_g to todayFood SQL SELECT.
- [ ] Add to todayFood type.
- [ ] Change MiniStat grid to sm:grid-cols-3.
- [ ] Add 2 new MiniStat components.

### Task 9: Food Page & Test Data

**Files:**
- Modify: `app/app/food/page.tsx`
- Modify: `scripts/seed-test-data.js`

- [ ] **food/page.tsx** — Add fibre_g, sugar_g to SELECT.
- [ ] **seed-test-data.js** — Add random fibre_g/sugar_g to food entries.

### Task 10: Build, Verify, Commit

- [ ] Run `npm run build` (or `next build`).
- [ ] Commit all changes.
