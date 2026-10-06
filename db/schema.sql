-- ============================================================================
--  MealMe — PostgreSQL schema
--  A real relational database for all app data. Authentication is handled by
--  Firebase; every table is keyed by the Firebase user id (uid), so the backend
--  trusts the verified token and stores/serves the data from here.
-- ============================================================================

-- Users mirror the Firebase Auth accounts (created on first sign-in).
CREATE TABLE IF NOT EXISTS users (
  uid         TEXT PRIMARY KEY,             -- Firebase UID
  email       TEXT,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One health/nutrition profile per user (1-to-1 with users).
CREATE TABLE IF NOT EXISTS profiles (
  uid             TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  age             INTEGER,
  sex             TEXT,
  height_cm       REAL,
  weight_kg       REAL,
  activity        TEXT,
  goal            TEXT,
  diet            TEXT,
  diet_other      TEXT,
  priority        TEXT,
  priority_other  TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipes: global seed recipes (owner_uid NULL) plus each user's own custom
-- recipes (owner_uid = their uid).
CREATE TABLE IF NOT EXISTS recipes (
  id                  TEXT PRIMARY KEY,
  owner_uid           TEXT REFERENCES users(uid) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  emoji               TEXT,
  cuisine             TEXT,
  meal_types          TEXT[] NOT NULL DEFAULT '{}',
  cook_time_minutes   INTEGER NOT NULL DEFAULT 30,
  servings            INTEGER NOT NULL DEFAULT 2,
  difficulty          TEXT,
  cost_estimate_fcfa  INTEGER NOT NULL DEFAULT 0,
  calories            INTEGER NOT NULL DEFAULT 0,
  description         TEXT,
  steps               TEXT[] NOT NULL DEFAULT '{}',
  tags                TEXT[] NOT NULL DEFAULT '{}',
  is_custom           BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipes_owner ON recipes(owner_uid);

-- Ingredients belong to a recipe (many-to-one).
CREATE TABLE IF NOT EXISTS ingredients (
  id         SERIAL PRIMARY KEY,
  recipe_id  TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  quantity   REAL NOT NULL DEFAULT 0,
  unit       TEXT NOT NULL DEFAULT 'piece',
  section    TEXT NOT NULL DEFAULT 'other'
);
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe ON ingredients(recipe_id);

-- One planned meal per (user, day, slot).
CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id         SERIAL PRIMARY KEY,
  uid        TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  day        DATE NOT NULL,
  slot       TEXT NOT NULL,                 -- breakfast | lunch | dinner
  recipe_id  TEXT NOT NULL,                 -- id of a bundled or custom recipe
  servings   INTEGER NOT NULL DEFAULT 2,
  UNIQUE (uid, day, slot)
);
CREATE INDEX IF NOT EXISTS idx_plan_uid ON meal_plan_entries(uid);

-- Pantry items the user already has at home.
CREATE TABLE IF NOT EXISTS pantry_items (
  id        SERIAL PRIMARY KEY,
  uid       TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  quantity  REAL NOT NULL DEFAULT 1,
  unit      TEXT NOT NULL DEFAULT 'piece',
  section   TEXT NOT NULL DEFAULT 'other',
  expiry    DATE
);
CREATE INDEX IF NOT EXISTS idx_pantry_uid ON pantry_items(uid);

-- Favourites: many-to-many between users and recipes.
CREATE TABLE IF NOT EXISTS favorites (
  uid        TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  recipe_id  TEXT NOT NULL,                 -- id of a bundled or custom recipe
  PRIMARY KEY (uid, recipe_id)
);

-- AI chat history — every message the user exchanges with the assistant.
CREATE TABLE IF NOT EXISTS ai_messages (
  id         SERIAL PRIMARY KEY,
  uid        TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  role       TEXT NOT NULL,                -- 'user' | 'assistant'
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_uid ON ai_messages(uid);

-- Reminder settings (1-to-1 with users).
CREATE TABLE IF NOT EXISTS reminders (
  uid                        TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  enabled                    BOOLEAN NOT NULL DEFAULT false,
  breakfast_hour             INTEGER NOT NULL DEFAULT 7,
  breakfast_minute           INTEGER NOT NULL DEFAULT 30,
  lunch_hour                 INTEGER NOT NULL DEFAULT 13,
  lunch_minute               INTEGER NOT NULL DEFAULT 0,
  dinner_hour                INTEGER NOT NULL DEFAULT 19,
  dinner_minute              INTEGER NOT NULL DEFAULT 30,
  nudge_if_nothing_planned   BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================================
--  Admin & moderation additions
--  - users.disabled : an admin can disable an account (blocked at login).
--  - recipes.status : user-published recipes start 'pending' and an admin
--                     approves or rejects them before they go public.
--  Written as ALTER … IF NOT EXISTS so re-running the migration is safe.
-- ============================================================================
ALTER TABLE users   ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS status   TEXT    NOT NULL DEFAULT 'approved';
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);
