-- =============================================================================
-- UltraBalaton Tracker - GPSLogger integration migration
-- =============================================================================
-- Run this in Supabase SQL Editor AFTER the main schema.
-- Adds a per-runner auth token for external GPS clients (GPSLogger, etc.).
-- =============================================================================

-- Add gps_token column if missing
ALTER TABLE runners ADD COLUMN IF NOT EXISTS gps_token VARCHAR(16);

-- Generate a short, URL-safe random token
CREATE OR REPLACE FUNCTION generate_gps_token() RETURNS text AS $$
DECLARE
  chars text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill tokens for existing runners
UPDATE runners SET gps_token = generate_gps_token() WHERE gps_token IS NULL;

-- Default for new runners
ALTER TABLE runners ALTER COLUMN gps_token SET DEFAULT generate_gps_token();

-- Ensure uniqueness (critical for auth)
CREATE UNIQUE INDEX IF NOT EXISTS idx_runners_gps_token ON runners(gps_token) WHERE gps_token IS NOT NULL;

-- =============================================================================
-- RPC for Edge Function to ingest GPS by token (bypasses RLS via SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION record_gps_by_token(p_token text, p_lat float, p_lon float)
RETURNS TABLE(runner_id uuid, delta_km float) AS $$
DECLARE
  v_runner_id uuid;
  v_delta float;
BEGIN
  SELECT id INTO v_runner_id FROM runners WHERE gps_token = p_token LIMIT 1;

  IF v_runner_id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  -- Reuse the existing haversine logic from record_gps()
  v_delta := record_gps(v_runner_id, p_lat, p_lon);

  RETURN QUERY SELECT v_runner_id, v_delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
