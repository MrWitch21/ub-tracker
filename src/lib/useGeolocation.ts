import { useEffect, useRef, useState, useCallback } from 'react';

export interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  timestamp: number | null;
  error: string | null;
  isTracking: boolean;
}

interface Options {
  intervalMs?: number;          // how often to push coords (default 15000)
  onUpdate?: (pos: { lat: number; lng: number; accuracy: number }) => void | Promise<void>;
  minAccuracy?: number | null;  // reject samples worse than this (meters). null = accept all
}

/**
 * Browser geolocation + Wake Lock, fires onUpdate at a fixed interval while tracking.
 *
 * LIMITATION: when the phone's browser tab is backgrounded or the screen locks,
 * the OS will throttle or stop this. Use Wake Lock + instruct the runner to keep
 * the tab visible (screen will stay on automatically).
 */
export function useGeolocation({ intervalMs = 15_000, onUpdate, minAccuracy = null }: Options = {}) {
  const [state, setState] = useState<GeoState>({
    lat: null, lng: null, accuracy: null, timestamp: null, error: null, isTracking: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const getOnce = useCallback((): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('A böngésződ nem támogatja a GPS-t.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 2_000 },
      );
    });
  }, []);

  const tick = useCallback(async () => {
    try {
      const pos = await getOnce();
      if (minAccuracy !== null && pos.accuracy > minAccuracy) {
        setState((s) => ({ ...s, error: `Pontosság túl rossz: ±${Math.round(pos.accuracy)} m` }));
        return;
      }
      setState({
        lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy,
        timestamp: Date.now(), error: null, isTracking: true,
      });
      if (onUpdateRef.current) await onUpdateRef.current(pos);
    } catch (err) {
      setState((s) => ({ ...s, error: (err as GeolocationPositionError).message ?? String(err) }));
    }
  }, [getOnce, minAccuracy]);

  const start = useCallback(async () => {
    if (intervalRef.current) return;
    // Request wake lock so the screen stays on while running
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch { /* wake lock is best-effort */ }

    setState((s) => ({ ...s, isTracking: true, error: null }));
    await tick(); // immediate first sample
    intervalRef.current = setInterval(tick, intervalMs);
  }, [tick, intervalMs]);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (wakeLockRef.current) { wakeLockRef.current.release?.(); wakeLockRef.current = null; }
    setState((s) => ({ ...s, isTracking: false }));
  }, []);

  // Re-acquire wake lock when tab returns to foreground
  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === 'visible' && state.isTracking && 'wakeLock' in navigator) {
        try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); }
        catch { /* ignore */ }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [state.isTracking]);

  useEffect(() => () => stop(), [stop]);

  return { ...state, start, stop };
}
