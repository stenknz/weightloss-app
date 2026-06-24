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
