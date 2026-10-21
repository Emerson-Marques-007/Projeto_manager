CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starts_on DATE,
  ends_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_club_memberships (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season_id TEXT REFERENCES seasons(id),
  position TEXT,
  secondary_position TEXT,
  overall NUMERIC(5, 2),
  potential NUMERIC(5, 2),
  market_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  joined_on DATE,
  left_on DATE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (player_id, club_id, season_id)
);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season_id TEXT REFERENCES seasons(id),
  salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  release_clause NUMERIC(14, 2),
  starts_on DATE,
  ends_on DATE,
  contract_type TEXT NOT NULL DEFAULT 'professional',
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS club_competitions (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  season_id TEXT REFERENCES seasons(id),
  group_name TEXT,
  final_position INTEGER,
  points INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (club_id, competition_id, season_id)
);

CREATE TABLE IF NOT EXISTS club_finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season_id TEXT REFERENCES seasons(id),
  transfer_budget NUMERIC(14, 2) NOT NULL DEFAULT 0,
  wage_budget NUMERIC(14, 2) NOT NULL DEFAULT 0,
  annual_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  operating_costs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  debt NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memberships_club_id_idx ON player_club_memberships(club_id);
CREATE INDEX IF NOT EXISTS memberships_current_idx ON player_club_memberships(is_current);
CREATE INDEX IF NOT EXISTS contracts_player_id_idx ON contracts(player_id);
CREATE INDEX IF NOT EXISTS contracts_club_id_idx ON contracts(club_id);
CREATE INDEX IF NOT EXISTS club_competitions_competition_id_idx ON club_competitions(competition_id);
CREATE INDEX IF NOT EXISTS club_finances_club_id_idx ON club_finances(club_id);