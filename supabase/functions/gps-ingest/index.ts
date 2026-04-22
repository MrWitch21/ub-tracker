// =============================================================================
// GPS ingest Edge Function (robust v2)
// =============================================================================
// Receives HTTP POST from GPSLogger (Android) and writes the point to Postgres.
//
// Deploy:  supabase functions deploy gps-ingest --no-verify-jwt
//
// Accepts many body formats, logs what it receives for easy debugging.
// =============================================================================

// deno-lint-ignore-file
// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
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

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (!s || s.startsWith('%')) return null;        // unresolved GPSLogger var like %LAT
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Try every reasonable body format: URL params, JSON, sloppy JSON (unquoted keys),
 * form-urlencoded, and fallback regex.
 */
async function extractCoords(req: Request, url: URL): Promise<{ lat: number | null; lon: number | null; raw: string }> {
  // 1. Try URL query params first (works even if body is empty)
  let lat = parseNum(url.searchParams.get('lat') ?? url.searchParams.get('latitude'));
  let lon = parseNum(url.searchParams.get('lon') ?? url.searchParams.get('lng') ?? url.searchParams.get('longitude'));

  const rawText = await req.text().catch(() => '');

  if (!rawText) return { lat, lon, raw: rawText };

  // 2a. JSON body
  if (lat === null || lon === null) {
    try {
      const body = JSON.parse(rawText);
      lat = lat ?? parseNum(body.lat ?? body.latitude);
      lon = lon ?? parseNum(body.lon ?? body.lng ?? body.longitude);
    } catch { /* not JSON */ }
  }

  // 2b. Sloppy JSON like {lat:46.9,lon:17.8} — add missing quotes around keys
  if (lat === null || lon === null) {
    try {
      const fixed = rawText.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
      const body = JSON.parse(fixed);
      lat = lat ?? parseNum(body.lat ?? body.latitude);
      lon = lon ?? parseNum(body.lon ?? body.lng ?? body.longitude);
    } catch { /* still not JSON */ }
  }

  // 2c. Form-urlencoded: lat=46.9&lon=17.8
  if (lat === null || lon === null) {
    try {
      const params = new URLSearchParams(rawText);
      lat = lat ?? parseNum(params.get('lat') ?? params.get('latitude'));
      lon = lon ?? parseNum(params.get('lon') ?? params.get('lng') ?? params.get('longitude'));
    } catch { /* ignore */ }
  }

  // 2d. Regex fallback: anywhere in the raw text
  if (lat === null || lon === null) {
    const latMatch = rawText.match(/lat(?:itude)?\s*[=:]\s*"?(-?\d+\.?\d*)"?/i);
    const lonMatch = rawText.match(/lo(?:n|ng)(?:itude)?\s*[=:]\s*"?(-?\d+\.?\d*)"?/i);
    if (latMatch) lat = lat ?? parseNum(latMatch[1]);
    if (lonMatch) lon = lon ?? parseNum(lonMatch[1]);
  }

  return { lat, lon, raw: rawText };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  if (req.method === 'GET') {
    return json({ status: 'ok', service: 'ub-tracker gps-ingest', version: 2 });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Token ────────────────────────────────────────────────────────────────
  const url = new URL(req.url);
  const token =
    url.searchParams.get('token') ??
    req.headers.get('x-gps-token') ??
    '';

  if (!token || token.length < 6) {
    return json({ error: 'missing_token', hint: 'Add ?token=XXX to URL' }, 401);
  }

  // ── Coords ───────────────────────────────────────────────────────────────
  const { lat, lon, raw } = await extractCoords(req, url);

  if (lat === null || lon === null) {
    // Log EVERYTHING to help debugging — visible in Supabase Dashboard → Functions → Logs
    console.error('BAD REQUEST: could not extract coords', {
      token_prefix: token.substring(0, 4) + '…',
      content_type: req.headers.get('content-type'),
      user_agent: req.headers.get('user-agent'),
      body_length: raw.length,
      body_preview: raw.substring(0, 400),
      query: url.search,
    });
    return json({
      error: 'missing_coords',
      hint: 'Body must contain lat and lon. Expected: {"lat":46.9,"lon":17.88}',
      received: {
        content_type: req.headers.get('content-type'),
        body_preview: raw.substring(0, 200),
      },
    }, 400);
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return json({ error: 'invalid_coords', lat, lon }, 400);
  }

  // ── Write ────────────────────────────────────────────────────────────────
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
