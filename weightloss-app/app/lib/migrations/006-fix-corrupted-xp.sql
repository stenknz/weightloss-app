-- Fix corrupted user_levels data caused by pg BIGINT→string concatenation bug
-- Resets total_xp to the actual sum of individual xp_events (which were correct)
-- and sets level=1 (will auto-recalculate on next event via calculateLevel fix)
--
-- Run: psql -d your_database -f lib/migrations/006-fix-corrupted-xp.sql

UPDATE user_levels
SET total_xp = COALESCE((
  SELECT SUM(points)::bigint
  FROM xp_events
  WHERE user_id = user_levels.user_id
), 0),
level = 1,
updated_at = now();
