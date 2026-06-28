-- =============================================================================
-- Weight Loss Web App - PostgreSQL schema
-- Loaded by the official postgres image on first startup
-- (mounted at /docker-entrypoint-initdb.d/01-schema.sql)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id                       SERIAL PRIMARY KEY,
  email                    TEXT UNIQUE NOT NULL,
  password_hash            TEXT NOT NULL,
  name                     TEXT NOT NULL,
  role                     TEXT NOT NULL DEFAULT 'user'
                           CHECK (role IN ('user', 'admin')),
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  sex                      TEXT CHECK (sex IN ('male', 'female', 'other')),
  age                      INTEGER CHECK (age IS NULL OR (age > 0 AND age < 130)),
  height_cm                NUMERIC(5,1) CHECK (height_cm IS NULL OR height_cm > 0),
  activity_level           TEXT CHECK (activity_level IN
                            ('sedentary','light','moderate','active','very_active')),
  target_weight_kg         NUMERIC(5,1) CHECK (target_weight_kg IS NULL OR target_weight_kg > 0),
  target_calorie_deficit   INTEGER CHECK (target_calorie_deficit IS NULL OR target_calorie_deficit > 0),
  target_date              DATE,
  calorie_target           INTEGER CHECK (calorie_target IS NULL OR calorie_target > 0),
  protein_target_g         INTEGER CHECK (protein_target_g IS NULL OR protein_target_g >= 0),
  carbs_target_g           INTEGER CHECK (carbs_target_g   IS NULL OR carbs_target_g   >= 0),
  fat_target_g             INTEGER CHECK (fat_target_g     IS NULL OR fat_target_g     >= 0),
  photo_storage_used_bytes BIGINT  NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user       ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires    ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS invites (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email       TEXT,
  note        TEXT,
  expires_at  TIMESTAMPTZ,
  max_uses    INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses        INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weigh_ins (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  weight_kg  NUMERIC(5,1) NOT NULL CHECK (weight_kg > 0),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weigh_ins_user_date ON weigh_ins(user_id, entry_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS weigh_ins_user_day ON weigh_ins(user_id, entry_date);

CREATE TABLE IF NOT EXISTS measurements (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  waist_cm   NUMERIC(5,1) CHECK (waist_cm IS NULL OR waist_cm > 0),
  chest_cm   NUMERIC(5,1) CHECK (chest_cm IS NULL OR chest_cm > 0),
  hips_cm    NUMERIC(5,1) CHECK (hips_cm  IS NULL OR hips_cm  > 0),
  thigh_cm   NUMERIC(5,1) CHECK (thigh_cm IS NULL OR thigh_cm > 0),
  arm_cm     NUMERIC(5,1) CHECK (arm_cm   IS NULL OR arm_cm   > 0),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS measurements_user_date ON measurements(user_id, entry_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS measurements_user_day ON measurements(user_id, entry_date);

CREATE TABLE IF NOT EXISTS photos (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date    DATE NOT NULL,
  filename      TEXT NOT NULL,
  original_name TEXT,
  mime_type     TEXT,
  size_bytes    BIGINT,
  caption       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_user_date ON photos(user_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS food_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  meal       TEXT CHECK (meal IS NULL OR meal IN ('breakfast','lunch','dinner','snack')),
  description TEXT NOT NULL,
  calories    NUMERIC(7,1) NOT NULL CHECK (calories >= 0),
  protein_g   NUMERIC(6,1) CHECK (protein_g IS NULL OR protein_g >= 0),
  carbs_g     NUMERIC(6,1) CHECK (carbs_g   IS NULL OR carbs_g   >= 0),
  fat_g       NUMERIC(6,1) CHECK (fat_g     IS NULL OR fat_g     >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS food_logs_user_date ON food_logs(user_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  activity        TEXT NOT NULL,
  duration_min    INTEGER CHECK (duration_min IS NULL OR duration_min >= 0),
  calories_burned NUMERIC(7,1) CHECK (calories_burned IS NULL OR calories_burned >= 0),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exercise_logs_user_date ON exercise_logs(user_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS water_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  amount_ml  INTEGER NOT NULL CHECK (amount_ml > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS water_logs_user_date ON water_logs(user_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS step_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  steps      INTEGER NOT NULL CHECK (steps >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS step_logs_user_date ON step_logs(user_id, entry_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS step_logs_user_day ON step_logs(user_id, entry_date);

CREATE TABLE IF NOT EXISTS daily_notes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS daily_notes_user_date ON daily_notes(user_id, entry_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS daily_notes_user_day ON daily_notes(user_id, entry_date);

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_user    ON audit_log(user_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('invite_only', 'true'),
  ('app_name',    'Weight Loss')
ON CONFLICT (key) DO NOTHING;

-- updated_at maintenance
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_touch ON users;
CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS daily_notes_touch ON daily_notes;
CREATE TRIGGER daily_notes_touch BEFORE UPDATE ON daily_notes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE users ADD COLUMN IF NOT EXISTS water_target_ml INTEGER NOT NULL DEFAULT 2700;
UPDATE users SET water_target_ml = 3700 WHERE sex = 'male' AND water_target_ml = 2700;

ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS fibre_g NUMERIC(6,1) CHECK (fibre_g IS NULL OR fibre_g >= 0);
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS sugar_g NUMERIC(6,1) CHECK (sugar_g IS NULL OR sugar_g >= 0);

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
