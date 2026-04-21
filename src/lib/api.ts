import { supabase } from './supabase';
import type { Race, Runner, PositionPoint } from './types';

// ── Race ──────────────────────────────────────────────────────────────────

export async function createRace(data: {
  name: string; adminPin?: string | null; teamTarget?: number; plannedStart?: string | null;
}): Promise<Race> {
  const { data: row, error } = await supabase
    .from('races')
    .insert({
      name: data.name,
      admin_pin: data.adminPin ?? null,
      team_target: data.teamTarget ?? 210,
      planned_start_at: data.plannedStart ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return row as Race;
}

export async function findRaceByCode(code: string): Promise<Race | null> {
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data as Race | null;
}

/** Verify admin PIN for a race. Returns true on match. */
export async function verifyAdminPin(raceId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('races')
    .select('admin_pin')
    .eq('id', raceId)
    .single();
  if (error) return false;
  // If no PIN set, deny by default (admin must set a PIN)
  if (!data.admin_pin) return false;
  return data.admin_pin === pin;
}

export async function raceStart(raceId: string) {
  const { error } = await supabase
    .from('races')
    .update({ actual_start_at: new Date().toISOString(), actual_end_at: null })
    .eq('id', raceId);
  if (error) throw error;
}

export async function raceEnd(raceId: string) {
  const { error } = await supabase
    .from('races')
    .update({ actual_end_at: new Date().toISOString() })
    .eq('id', raceId);
  if (error) throw error;
  // Also close any active runner
  await supabase
    .from('runners')
    .update({ is_active: false, is_finished: true, finished_at: new Date().toISOString() })
    .eq('race_id', raceId)
    .eq('is_active', true);
}

export async function updateRace(raceId: string, patch: Partial<Pick<Race, 'name' | 'team_target' | 'planned_start_at' | 'admin_pin'>>) {
  const { error } = await supabase.from('races').update(patch).eq('id', raceId);
  if (error) throw error;
}

export async function raceReset(raceId: string) {
  // Wipe position history
  const { data: runners } = await supabase.from('runners').select('id').eq('race_id', raceId);
  const ids = (runners ?? []).map((r) => r.id);
  if (ids.length > 0) {
    await supabase.from('position_history').delete().in('runner_id', ids);
  }
  await supabase
    .from('runners')
    .update({
      is_active: false, is_finished: false,
      started_at: null, finished_at: null,
      logged_dist: 0, last_lat: null, last_lon: null, last_update: null,
    })
    .eq('race_id', raceId);
  await supabase
    .from('races')
    .update({ actual_start_at: null, actual_end_at: null })
    .eq('id', raceId);
}

// ── Runners ────────────────────────────────────────────────────────────────

export async function listRunners(raceId: string): Promise<Runner[]> {
  const { data, error } = await supabase
    .from('runners')
    .select('*')
    .eq('race_id', raceId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Runner[];
}

export async function createRunner(raceId: string, data: {
  name: string; imgUrl?: string | null; targetDist: number; sortOrder: number;
}): Promise<Runner> {
  const { data: row, error } = await supabase
    .from('runners')
    .insert({
      race_id: raceId,
      name: data.name,
      img_url: data.imgUrl ?? null,
      target_dist: data.targetDist,
      sort_order: data.sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return row as Runner;
}

export async function updateRunner(id: string, patch: Partial<Runner>) {
  const { error } = await supabase.from('runners').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteRunner(id: string) {
  const { error } = await supabase.from('runners').delete().eq('id', id);
  if (error) throw error;
}

/** Set a runner active — deactivates all others in the same race. */
export async function setActiveRunner(raceId: string, runnerId: string) {
  // Deactivate all
  await supabase.from('runners').update({ is_active: false }).eq('race_id', raceId);
  // Activate this one, preserve started_at if present
  const { data: existing } = await supabase
    .from('runners').select('started_at').eq('id', runnerId).single();
  await supabase
    .from('runners')
    .update({
      is_active: true,
      started_at: existing?.started_at ?? new Date().toISOString(),
    })
    .eq('id', runnerId);
}

export async function stopRunner(runnerId: string) {
  await supabase.from('runners').update({ is_active: false }).eq('id', runnerId);
}

export async function finishRunner(runnerId: string, finished: boolean) {
  await supabase
    .from('runners')
    .update(finished
      ? { is_finished: true, is_active: false, finished_at: new Date().toISOString() }
      : { is_finished: false, finished_at: null })
    .eq('id', runnerId);
}

// ── GPS ────────────────────────────────────────────────────────────────────

/** Calls the server-side RPC record_gps which handles distance delta + noise filter. */
export async function recordGps(runnerId: string, lat: number, lon: number): Promise<number> {
  const { data, error } = await supabase.rpc('record_gps', {
    p_runner: runnerId, p_lat: lat, p_lon: lon,
  });
  if (error) throw error;
  return data as number;
}

export async function getRoute(runnerId: string): Promise<PositionPoint[]> {
  const { data, error } = await supabase
    .from('position_history')
    .select('lat, lon')
    .eq('runner_id', runnerId)
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PositionPoint[];
}
