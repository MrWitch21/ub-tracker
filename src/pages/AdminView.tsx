import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Play, Square, RefreshCcw, Trash2, Check, X, Edit2, Save, Smartphone } from 'lucide-react';
import { useRace } from '../lib/hooks';
import * as api from '../lib/api';
import PinGate from '../components/PinGate';
import GPSLoggerSetup from '../components/GPSLoggerSetup';
import type { Runner } from '../lib/types';

export default function AdminView() {
  const { code } = useParams<{ code: string }>();
  const { race, runners, teamTotal, loading, error } = useRace(code);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>BetĂ¶ltĂ©sâ€¦</div>;
  if (error || !race) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
        {error ?? 'Race not found'}
        <div style={{ marginTop: 16 }}><Link to="/" className="btn btn-ghost">Vissza</Link></div>
      </div>
    );
  }

  return (
    <PinGate raceId={race.id} raceCode={race.code}>
      <AdminContent race={race} runners={runners} teamTotal={teamTotal} code={code!} />
    </PinGate>
  );
}

function AdminContent({ race, runners, teamTotal, code }: { race: NonNullable<ReturnType<typeof useRace>['race']>; runners: Runner[]; teamTotal: number; code: string }) {
  const [busy, setBusy] = useState(false);
  const [newRunner, setNewRunner] = useState({ name: '', imgUrl: '', targetDist: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Runner>>({});
  const [gpsSetupRunner, setGpsSetupRunner] = useState<Runner | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';

  async function guarded(fn: () => Promise<any>, errMsg = 'Hiba tĂ¶rtĂ©nt.') {
    setBusy(true);
    try { await fn(); }
    catch (err) { alert(`${errMsg}\n${(err as Error).message}`); }
    finally { setBusy(false); }
  }

  const handleCreate = () =>
    guarded(async () => {
      if (!newRunner.name.trim()) return;
      const nextSort = Math.max(0, ...runners.map((r) => r.sort_order)) + 1;
      await api.createRunner(race.id, {
        name: newRunner.name.trim(),
        imgUrl: newRunner.imgUrl.trim() || null,
        targetDist: Number(newRunner.targetDist) || 0,
        sortOrder: nextSort,
      });
      setNewRunner({ name: '', imgUrl: '', targetDist: '' });
    });

  const handleStartEdit = (r: Runner) => {
    setEditId(r.id);
    setEditDraft({ name: r.name, img_url: r.img_url, target_dist: r.target_dist });
  };

  const handleSaveEdit = () =>
    guarded(async () => {
      if (!editId) return;
      await api.updateRunner(editId, {
        name: editDraft.name,
        img_url: editDraft.img_url ?? null,
        target_dist: Number(editDraft.target_dist) || 0,
      });
      setEditId(null); setEditDraft({});
    });

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{
        padding: '14px 20px', background: 'var(--brand)', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow)',
      }}>
        <Link to={`/race/${code}`} style={{ color: '#fff', display: 'flex', padding: 6 }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{race.name}</div>
          <div style={{ fontSize: 11, opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
            Admin Â· {race.code}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Share with runners */}
        <section className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Oszd meg a futĂłkkal / Share with runners
          </div>
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            A futĂłk ezen a linken keresztĂĽl tudnak GPS-t kĂĽldeni:
          </div>
          <div style={{
            padding: 12, background: '#fff', borderRadius: 8,
            fontFamily: 'var(--font-mono)', fontSize: 13, wordBreak: 'break-all',
            border: '1px solid #dbeafe',
          }}>
            {window.location.origin}/race/{race.code}/run
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 10 }}
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/race/${race.code}/run`);
              alert('Link mĂˇsolva! / Link copied!');
            }}
          >
            Link mĂˇsolĂˇsa / Copy link
          </button>
        </section>

        {/* Race control */}
        <section className="card">
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Verseny vezĂ©rlĂ©s / Race control
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
            <Stat label="Tervezett rajt / Planned"      value={fmtDateTime(race.planned_start_at)} />
            <Stat label="TĂ©nyleges rajt / Actual start" value={fmtDateTime(race.actual_start_at)}
                  accent={race.actual_start_at ? 'success' : undefined} />
            <Stat label="TĂ©nyleges cĂ©l / Actual end"    value={fmtDateTime(race.actual_end_at)}
                  accent={race.actual_end_at ? 'brand' : undefined} />
            <Stat label="Csapat / Team"                 value={`${teamTotal.toFixed(1)} / ${race.team_target.toFixed(0)} km`} />
          </div>

          <div className="race-control-row">
            <button className="btn btn-success" disabled={busy}
                    onClick={() => guarded(() => api.raceStart(race.id))}>
              <Play size={14} /> RAJT / START
            </button>
            <button className="btn btn-dark" disabled={busy}
                    onClick={() => guarded(() => api.raceEnd(race.id))}>
              <Square size={14} /> CĂ‰L / END
            </button>
            <button
              className="btn btn-ghost" disabled={busy}
              onClick={() => {
                if (confirm('Biztosan resetelni szeretnĂ©d a teljes versenyt? Minden GPS adat tĂ¶rlĹ‘dik!\n\nAre you sure?')) {
                  guarded(() => api.raceReset(race.id));
                }
              }}
            >
              <RefreshCcw size={14} /> Reset
            </button>

            <div className="race-control-spacer" />

            <input
              type="datetime-local"
              defaultValue={toLocalInput(race.planned_start_at)}
              onChange={(e) =>
                guarded(async () => {
                  const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                  await api.updateRace(race.id, { planned_start_at: v });
                })
              }
            />
          </div>
        </section>

        {/* Runners */}
        <section className="card">
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            FutĂłk / Runners ({runners.length})
          </div>

          {runners.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
              Nincsenek futĂłk. Add hozzĂˇ az elsĹ‘t lent.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {runners.map((runner) => {
              const isEditing = editId === runner.id;
              return (
                <div
                  key={runner.id}
                  className="runner-row"
                  style={{
                    border: `1px solid ${runner.is_active ? 'var(--active)' : runner.is_finished ? 'var(--finished)' : 'var(--border)'}`,
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--bg)', flexShrink: 0,
                    border: runner.is_active ? '2px solid var(--active)' : '2px solid var(--border)',
                  }}>
                    {runner.img_url ? (
                      <img src={runner.img_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontWeight: 800 }}>
                        {runner.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="edit-runner-grid">
                      <input value={editDraft.name ?? ''} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} placeholder="NĂ©v" />
                      <input value={editDraft.img_url ?? ''} onChange={(e) => setEditDraft({ ...editDraft, img_url: e.target.value })} placeholder="Image URL" />
                      <input type="number" step="0.1" value={editDraft.target_dist ?? ''} onChange={(e) => setEditDraft({ ...editDraft, target_dist: Number(e.target.value) })} placeholder="km" />
                    </div>
                  ) : (
                    <div className="runner-info">
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{runner.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        {runner.logged_dist.toFixed(2)} / {runner.target_dist} km
                        {runner.is_active && <span style={{ color: 'var(--active)', marginLeft: 10, fontWeight: 700 }}>â—Ź Most fut</span>}
                        {runner.is_finished && <span style={{ color: 'var(--finished)', marginLeft: 10, fontWeight: 700 }}>âś“ KĂ©sz</span>}
                      </div>
                    </div>
                  )}

                  <div className="runner-actions">
                    {isEditing ? (
                      <>
                        <button className="btn btn-success" onClick={handleSaveEdit} disabled={busy}>
                          <Save size={13} /> Ment
                        </button>
                        <button className="btn btn-ghost" onClick={() => { setEditId(null); setEditDraft({}); }}>
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={runner.is_active ? 'btn btn-danger' : 'btn btn-ghost'}
                          onClick={() => guarded(() =>
                            runner.is_active ? api.stopRunner(runner.id) : api.setActiveRunner(race.id, runner.id)
                          )}
                          disabled={busy}
                        >
                          {runner.is_active ? 'STOP' : 'START'}
                        </button>
                        <button
                          className={runner.is_finished ? 'btn btn-success' : 'btn btn-ghost'}
                          onClick={() => guarded(() => api.finishRunner(runner.id, !runner.is_finished))}
                          disabled={busy}
                        >
                          <Check size={13} /> {runner.is_finished ? 'KĂ‰SZ' : 'KĂ©sz?'}
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ color: 'var(--primary)' }}
                          onClick={() => setGpsSetupRunner(runner)}
                          title="GPSLogger beĂˇllĂ­tĂˇs"
                        >
                          <Smartphone size={13} />
                        </button>
                        <button className="btn btn-ghost" onClick={() => handleStartEdit(runner)} disabled={busy}>
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => {
                            if (confirm(`Biztosan tĂ¶rlĂ¶d: ${runner.name}?`)) {
                              guarded(() => api.deleteRunner(runner.id));
                            }
                          }}
                          disabled={busy}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: 16, padding: 12, background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              + Ăšj futĂł / Add runner
            </div>
            <div className="new-runner-grid">
              <input placeholder="NĂ©v / Name" value={newRunner.name} onChange={(e) => setNewRunner({ ...newRunner, name: e.target.value })} />
              <input placeholder="Image URL (optional)" value={newRunner.imgUrl} onChange={(e) => setNewRunner({ ...newRunner, imgUrl: e.target.value })} />
              <input type="number" step="0.1" placeholder="km" value={newRunner.targetDist} onChange={(e) => setNewRunner({ ...newRunner, targetDist: e.target.value })} />
              <button className="btn btn-primary" onClick={handleCreate} disabled={busy || !newRunner.name.trim()}>
                <Plus size={14} /> HozzĂˇad
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              Optional: give an image URL now, or edit it later anytime.
            </div>
          </div>
        </section>
      </main>

      {gpsSetupRunner && (
        <GPSLoggerSetup
          runner={gpsSetupRunner}
          supabaseUrl={supabaseUrl}
          onClose={() => setGpsSetupRunner(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'success' | 'brand' }) {
  const color = accent === 'success' ? 'var(--success)' : accent === 'brand' ? 'var(--brand)' : 'var(--text)';
  return (
    <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return 'â€”';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('hu-HU');
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

