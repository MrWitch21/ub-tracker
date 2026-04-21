import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Race, Runner } from './types';
import * as api from './api';

/** Subscribe to a race by code. Returns race + runners, kept live via Supabase Realtime. */
export function useRace(code: string | undefined) {
  const [race, setRace] = useState<Race | null>(null);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const foundRace = await api.findRaceByCode(code);
        if (cancelled) return;
        if (!foundRace) {
          setError(`Nincs ilyen kódú verseny: ${code}`);
          setRace(null);
          setRunners([]);
          return;
        }
        setRace(foundRace);
        const runnerList = await api.listRunners(foundRace.id);
        if (cancelled) return;
        setRunners(runnerList);

        // Live subscriptions
        channel = supabase
          .channel(`race-${foundRace.id}`)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'races', filter: `id=eq.${foundRace.id}` },
            (payload) => {
              if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                setRace(payload.new as Race);
              }
            }
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'runners', filter: `race_id=eq.${foundRace.id}` },
            (payload) => {
              setRunners((prev) => {
                if (payload.eventType === 'INSERT') {
                  return [...prev, payload.new as Runner].sort((a, b) => a.sort_order - b.sort_order);
                }
                if (payload.eventType === 'UPDATE') {
                  return prev.map((r) => (r.id === (payload.new as Runner).id ? (payload.new as Runner) : r));
                }
                if (payload.eventType === 'DELETE') {
                  return prev.filter((r) => r.id !== (payload.old as Runner).id);
                }
                return prev;
              });
            }
          )
          .subscribe();
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  const activeRunner = runners.find((r) => r.is_active) ?? null;
  const teamTotal = runners.reduce((s, r) => s + (r.logged_dist || 0), 0);
  const raceStartAt = race?.actual_start_at ?? race?.planned_start_at ?? null;

  return { race, runners, activeRunner, teamTotal, raceStartAt, loading, error };
}

// ── Timer hooks ──────────────────────────────────────────────────────────

export function useEventTimer(raceStartIso: string | null, actualEndIso: string | null): {
  label: string;
  phase: 'before' | 'running' | 'after' | 'unset';
} {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  if (!raceStartIso) return { label: 'T ??:??:??', phase: 'unset' };
  const startMs = new Date(raceStartIso).getTime();
  const endMs = actualEndIso ? new Date(actualEndIso).getTime() : null;

  if (endMs !== null && now >= endMs) {
    return { label: `T+ ${fmt(Math.max(0, endMs - startMs))}`, phase: 'after' };
  }
  if (now < startMs) return { label: `T- ${fmt(startMs - now)}`, phase: 'before' };
  return { label: `T+ ${fmt(now - startMs)}`, phase: 'running' };
}

export function useElapsed(startIso: string | null, endIso: string | null): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (endIso) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [endIso]);

  if (!startIso) return '--:--:--';
  const end = endIso ? new Date(endIso).getTime() : now;
  return fmt(Math.max(0, end - new Date(startIso).getTime()));
}

function fmt(ms: number) {
  const t = Math.floor(ms / 1000);
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}
function pad(n: number) { return n.toString().padStart(2, '0'); }
