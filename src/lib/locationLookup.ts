type Settlement = { name: string; lat: number; lon: number };

type CacheEntry = {
  name: string;
  savedAt: number;
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 75_000;
const STORAGE_KEY = 'ub_location_cache_v1';
const MAX_CACHE_ENTRIES = 300;
const COORD_PRECISION = 3;

const BALATON_SETTLEMENTS: Settlement[] = [
  { name: 'Keszthely', lat: 46.767, lon: 17.247 },
  { name: 'Balatongyorok', lat: 46.754, lon: 17.357 },
  { name: 'Balatonbereny', lat: 46.707, lon: 17.312 },
  { name: 'Balatonmariafurdo', lat: 46.706, lon: 17.39 },
  { name: 'Balatonfenyves', lat: 46.711, lon: 17.481 },
  { name: 'Fonyod', lat: 46.755, lon: 17.579 },
  { name: 'Balatonboglar', lat: 46.777, lon: 17.651 },
  { name: 'Balatonlelle', lat: 46.787, lon: 17.697 },
  { name: 'Balatonszemes', lat: 46.81, lon: 17.772 },
  { name: 'Balatonfoldvar', lat: 46.853, lon: 17.878 },
  { name: 'Szantod', lat: 46.868, lon: 17.905 },
  { name: 'Zamardi', lat: 46.883, lon: 17.954 },
  { name: 'Siofok', lat: 46.907, lon: 18.058 },
  { name: 'Balatonvilagos', lat: 46.978, lon: 18.17 },
  { name: 'Balatonkenese', lat: 47.033, lon: 18.112 },
  { name: 'Balatonalmadi', lat: 47.03, lon: 18.02 },
  { name: 'Balatonfuzfo', lat: 47.066, lon: 18.032 },
  { name: 'Balatonfured', lat: 46.961, lon: 17.885 },
  { name: 'Tihany', lat: 46.913, lon: 17.889 },
  { name: 'Aszofo', lat: 46.928, lon: 17.824 },
  { name: 'Balatonudvari', lat: 46.901, lon: 17.806 },
  { name: 'Revfulop', lat: 46.829, lon: 17.627 },
  { name: 'Badacsony', lat: 46.792, lon: 17.51 },
];

let storageLoaded = false;
let lastRequestAt = 0;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string | null>>();

export function getNearestBalatonSettlement(lat: number, lon: number): string {
  let nearest = BALATON_SETTLEMENTS[0];
  let bestKm = Number.POSITIVE_INFINITY;

  for (const s of BALATON_SETTLEMENTS) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (d < bestKm) {
      bestKm = d;
      nearest = s;
    }
  }

  if (bestKm > 30) return 'Balaton area';
  return nearest.name;
}

export async function resolveLocationName(lat: number, lon: number): Promise<string | null> {
  loadCacheFromStorage();
  const key = coordKey(lat, lon);
  const cached = getFreshCachedValue(key);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  if (Date.now() - lastRequestAt < MIN_REQUEST_INTERVAL_MS) return null;
  lastRequestAt = Date.now();

  const request = fetchFromNominatim(lat, lon)
    .then((name) => {
      if (name) {
        cache.set(key, { name, savedAt: Date.now() });
        trimCache();
        persistCache();
      }
      return name;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(COORD_PRECISION)},${lon.toFixed(COORD_PRECISION)}`;
}

function getFreshCachedValue(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.savedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.name;
}

async function fetchFromNominatim(lat: number, lon: number): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('zoom', '12');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'hu,en');

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const payload = await response.json() as {
    name?: string;
    display_name?: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      hamlet?: string;
      suburb?: string;
      county?: string;
    };
  };

  const direct =
    payload.address?.city ??
    payload.address?.town ??
    payload.address?.village ??
    payload.address?.municipality ??
    payload.address?.hamlet ??
    payload.address?.suburb;

  if (direct && direct.trim()) return direct.trim();
  if (payload.address?.county && payload.address.county.trim()) return payload.address.county.trim();
  if (payload.name && payload.name.trim()) return payload.name.trim();
  if (payload.display_name && payload.display_name.trim()) {
    const firstPart = payload.display_name.split(',')[0]?.trim();
    return firstPart || null;
  }
  return null;
}

function trimCache(): void {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.savedAt > CACHE_TTL_MS) cache.delete(key);
  }

  if (cache.size <= MAX_CACHE_ENTRIES) return;

  const ordered = [...cache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
  const toRemove = ordered.length - MAX_CACHE_ENTRIES;
  for (let i = 0; i < toRemove; i += 1) cache.delete(ordered[i][0]);
}

function loadCacheFromStorage(): void {
  if (storageLoaded || typeof window === 'undefined') return;
  storageLoaded = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value.name !== 'string' || typeof value.savedAt !== 'number') continue;
      if (Date.now() - value.savedAt > CACHE_TTL_MS) continue;
      cache.set(key, value);
    }
    trimCache();
  } catch {
    // Best effort cache only.
  }
}

function persistCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const serializable: Record<string, CacheEntry> = {};
    for (const [key, value] of cache.entries()) serializable[key] = value;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore storage failures on limited environments.
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
