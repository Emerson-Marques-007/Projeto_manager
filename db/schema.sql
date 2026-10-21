CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  season TEXT,
  logo_url TEXT,
  official_site TEXT,
  source TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  league_id TEXT REFERENCES leagues(id),
  name TEXT NOT NULL,
  country TEXT,
  season TEXT,
  crest_url TEXT,
  transfer_budget NUMERIC(14, 2) NOT NULL DEFAULT 0,
  wage_budget NUMERIC(14, 2) NOT NULL DEFAULT 0,
  squad_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  debt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reputation NUMERIC(5, 2) NOT NULL DEFAULT 50,
  board_objective TEXT,
  financial_profile TEXT,
  source TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  nationality TEXT,
  image_url TEXT,
  source TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS managers (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  image_url TEXT,
  source TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  competition_type TEXT NOT NULL DEFAULT 'cup',
  country TEXT,
  logo_url TEXT,
  source TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stadiums (
  id TEXT PRIMARY KEY,
  club_id TEXT REFERENCES clubs(id),
  name TEXT NOT NULL,
  capacity INTEGER,
  city TEXT,
  country TEXT,
  image_url TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_staff (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  manager_id TEXT NOT NULL REFERENCES managers(id),
  role TEXT NOT NULL DEFAULT 'manager',
  starts_on DATE,
  ends_on DATE,
  PRIMARY KEY (club_id, manager_id, role, starts_on)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS careers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES clubs(id),
  manager_name TEXT NOT NULL,
  season INTEGER NOT NULL DEFAULT 1,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clubs_league_id_idx ON clubs(league_id);
CREATE INDEX IF NOT EXISTS stadiums_club_id_idx ON stadiums(club_id);
CREATE INDEX IF NOT EXISTS careers_user_id_idx ON careers(user_id);