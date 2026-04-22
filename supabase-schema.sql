-- =============================================================================
-- UltraBalaton Tracker - Supabase schema
-- =============================================================================
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Then enable Realtime on the tables in Dashboard → Database → Replication.
-- =============================================================================

-- Enable UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generate a human-friendly 6-character code
CREATE OR REPLACE FUNCTION generate_race_code() RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- omit I, O, 0, 1 for clarity
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS races (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(8) UNIQUE NOT NULL DEFAULT generate_race_code(),
  name              TEXT NOT NULL,
  admin_pin         VARCHAR(10),                       -- optional, for admin actions
  team_target       FLOAT NOT NULL DEFAULT 210,        -- total target km (e.g. Ultra Balaton 210)
  planned_start_at  TIMESTAMPTZ,
  actual_start_at   TIMESTAMPTZ,
  actual_end_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id       UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  img_url       TEXT,
  target_dist   FLOAT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  is_finished   BOOLEAN NOT NULL DEFAULT FALSE,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  sort_order    INT NOT NULL DEFAULT 0,
  logged_dist   FLOAT NOT NULL DEFAULT 0,
  last_lat      FLOAT,
  last_lon      FLOAT,
  last_update   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_runners_race ON runners(race_id, sort_order);

CREATE TABLE IF NOT EXISTS position_history (
  id          BIGSERIAL PRIMARY KEY,
  runner_id   UUID NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
  lat         FLOAT NOT NULL,
  lon         FLOAT NOT NULL,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_position_history_runner ON position_history(runner_id, id);

-- =============================================================================
-- RPC: record_gps
-- Atomically inserts a history point AND updates the runner's last position
-- + logged_dist (with 20m noise filter). Safer than two round trips.
-- =============================================================================

CREATE OR REPLACE FUNCTION record_gps(p_runner UUID, p_lat FLOAT, p_lon FLOAT)
RETURNS FLOAT AS $$
DECLARE
  v_old_lat FLOAT;
  v_old_lon FLOAT;
  v_delta   FLOAT := 0;
  v_R       FLOAT := 6371;            -- Earth radius in km
  v_dLat    FLOAT;
  v_dLon    FLOAT;
  v_a       FLOAT;
BEGIN
  SELECT last_lat, last_lon INTO v_old_lat, v_old_lon FROM runners WHERE id = p_runner;

  IF v_old_lat IS NOT NULL AND v_old_lon IS NOT NULL THEN
    v_dLat := radians(p_lat - v_old_lat);
    v_dLon := radians(p_lon - v_old_lon);
    v_a := sin(v_dLat / 2) ^ 2
         + cos(radians(v_old_lat)) * cos(radians(p_lat)) * sin(v_dLon / 2) ^ 2;
    v_delta := v_R * 2 * atan2(sqrt(v_a), sqrt(1 - v_a));
    -- Noise filter: ignore jitter under 20 m
    IF v_delta < 0.02 THEN v_delta := 0; END IF;
  END IF;

  UPDATE runners
     SET last_lat = p_lat,
         last_lon = p_lon,
         last_update = now(),
         logged_dist = logged_dist + v_delta
   WHERE id = p_runner;

  INSERT INTO position_history (runner_id, lat, lon) VALUES (p_runner, p_lat, p_lon);

  RETURN v_delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Row Level Security
-- For simplicity: anyone (anon) with the code can read & write.
-- The "share code" IS the access control.
-- For a more secure setup, front this behind a server with admin_pin checks.
-- =============================================================================

ALTER TABLE races             ENABLE ROW LEVEL SECURITY;
ALTER TABLE runners           ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_history  ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (makes script re-runnable)
DROP POLICY IF EXISTS "public read races"             ON races;
DROP POLICY IF EXISTS "public write races"            ON races;
DROP POLICY IF EXISTS "public read runners"           ON runners;
DROP POLICY IF EXISTS "public write runners"          ON runners;
DROP POLICY IF EXISTS "public read position_history"  ON position_history;
DROP POLICY IF EXISTS "public write position_history" ON position_history;

CREATE POLICY "public read races"             ON races             FOR SELECT USING (true);
CREATE POLICY "public write races"            ON races             FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "public read runners"           ON runners           FOR SELECT USING (true);
CREATE POLICY "public write runners"          ON runners           FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "public read position_history"  ON position_history  FOR SELECT USING (true);
CREATE POLICY "public write position_history" ON position_history  FOR ALL    USING (true) WITH CHECK (true);

-- =============================================================================
-- Enable realtime
-- =============================================================================
-- If the publication already exists this will raise an error; ignore it.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE races;
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE runners;
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- position_history NOT added to realtime — can be large & bursty;
-- the frontend fetches the history once and appends new points via runner.last_lat/lon changes.
