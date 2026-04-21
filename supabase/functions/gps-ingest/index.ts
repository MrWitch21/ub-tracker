// =============================================================================
// GPS ingest Edge Function
// =============================================================================
// Receives HTTP POST from GPSLogger (Android) and writes the point to Postgres.
//
// Deploy:  supabase functions deploy gps-ingest --no-verify-jwt
//
// URL shape that GPSLogger calls:
//   POST https://<project>.supabase.co/functions/v1/gps-ingest?token=<gps_token>
//   Body (JSON):  { "lat": 46.90, "lon": 17.89 }
//
// GPSLogger variables: %LAT %LON (and many more, see faq).
// We do NOT require the Supabase anon key header — the gps_token in the query
// string IS the auth. Deploy with --no-verify-jwt so GPSLogger (which can only
// send one Authorization header) isn't required to include a JWT.
// =============================================================================

// deno-lint-ignore-file
// @ts-nocheck - Deno types are resolved at deploy time by Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// Service role key is injected automatically; it bypasses RLS (needed because we use the token as auth)
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Safely parse a number from multiple possible formats
function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  // Health check (GPSLogger's "Validate" button does a GET)
  if (req.method === 'GET') {
    return json({ status: 'ok', service: 'ub-tracker gps-ingest' });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Extract token ────────────────────────────────────────────────────────
  const url = new URL(req.url);
  const token =
    url.searchParams.get('token') ??
    req.headers.get('x-gps-token') ??
    '';

  if (!token || token.length < 6) {
    return json({ error: 'missing_token', hint: 'Add ?token=XXX to URL' }, 401);
  }

  // ── Parse body (support JSON + url-encoded for flexibility) ─────────────
  let lat: number | null = null;
  let lon: number | null = null;
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      lat = parseNum(body.lat ?? body.latitude);
      lon = parseNum(body.lon ?? body.lng ?? body.longitude);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      lat = parseNum(params.get('lat') ?? params.get('latitude'));
      lon = parseNum(params.get('lon') ?? params.get('lng') ?? params.get('longitude'));
    } else {
      // Try query params as last resort (GET-style body-less)
      lat = parseNum(url.searchParams.get('lat'));
      lon = parseNum(url.searchParams.get('lon'));
    }
  } catch (err) {
    return json({ error: 'bad_body', detail: String(err) }, 400);
  }

  if (lat === null || lon === null) {
    return json({ error: 'missing_coords', hint: 'Expected {"lat":..,"lon":..}' }, 400);
  }

  // Basic sanity — reject obviously invalid coords
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return json({ error: 'invalid_coords' }, 400);
  }

  // ── Write to DB via the token RPC ────────────────────────────────────────
  const { data, error } = await supabase.rpc('record_gps_by_token', {
    p_token: token,
    p_lat: lat,
    p_lon: lon,
  });

  if (error) {
    const msg = error.message ?? 'unknown_error';
    if (msg.includes('invalid_token')) {
      return json({ error: 'invalid_token' }, 401);
    }
    console.error('RPC error:', error);
    return json({ error: 'db_error', detail: msg }, 500);
  }

  const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return json({
    ok: true,
    runner_id: result?.runner_id ?? null,
    delta_km: result?.delta_km ?? 0,
    received: { lat, lon },
  });
});
