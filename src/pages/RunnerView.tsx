import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, MapPin, Battery, AlertCircle, Check } from 'lucide-react';
import { useRace } from '../lib/hooks';
import { useGeolocation } from '../lib/useGeolocation';
import { recordGps } from '../lib/api';
import type { Runner } from '../lib/types';

/**
 * Runner view — the page a runner opens on their phone to send GPS updates.
 * Flow: open /race/CODE/run → pick "I am <name>" → tap START → send GPS every 15s.
 */
export default function RunnerView() {
  const { code } = useParams<{ code: string }>();
  const { race, runners, loading, error } = useRace(code);
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(() => {
    // Remember the runner choice in localStorage per race
    if (!code) return null;
    return localStorage.getItem(`runner-${code}`);
  });

  useEffect(() => {
    if (selectedRunnerId && code) {
      localStorage.setItem(`runner-${code}`, selectedRunnerId);
    }
  }, [selectedRunnerId, code]);

  const selectedRunner = selectedRunnerId ? runners.find((r) => r.id === selectedRunnerId) ?? null : null;

  if (loading) return <CenterMsg>Betöltés… / Loading…</CenterMsg>;
  if (error || !race) return <CenterMsg error>{error ?? 'Race not found'}</CenterMsg>;

  // If no runner selected yet, show picker
  if (!selectedRunner) {
    return (
      <div style={{ minHeight: '100vh', padding: 20 }}>
        <Link to={`/race/${code}`} style={{ color: 'var(--muted)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
          <ArrowLeft size={14} /> Vissza / Back
        </Link>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
            Ki vagy? / Who are you?
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
            Válaszd ki magad, hogy a GPS-ed rád kerüljön.<br />
            Select yourself so your GPS gets mapped to you.
          </p>

          {runners.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
              Még nincs futó. Kérd az admin-t, hogy adjon hozzá téged.<br />
              No runners yet. Ask admin to add you.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {runners.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRunnerId(r.id)}
                  className="card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    textAlign: 'left',
                    border: '2px solid transparent',
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--bg)', flexShrink: 0,
                    border: '2px solid var(--border)',
                  }}>
                    {r.img_url ? (
                      <img src={r.img_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'var(--muted)' }}>
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {r.logged_dist.toFixed(1)} / {r.target_dist} km
                    </div>
                  </div>
                  {r.is_active && <span style={{ color: 'var(--active)', fontSize: 12, fontWeight: 700 }}>● MOST FUT</span>}
                  {r.is_finished && <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 700 }}>✓ KÉSZ</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <RunnerTracker
      runner={selectedRunner}
      raceCode={code!}
      onUnselect={() => {
        if (code) localStorage.removeItem(`runner-${code}`);
        setSelectedRunnerId(null);
      }}
    />
  );
}

// ── Active tracking screen ────────────────────────────────────────────────

function RunnerTracker({ runner, raceCode, onUnselect }: { runner: Runner; raceCode: string; onUnselect: () => void }) {
  const [stats, setStats] = useState({ sent: 0, lastDelta: 0, lastSentAt: null as number | null });

  const { lat, lng, accuracy, timestamp, error, isTracking, start, stop } = useGeolocation({
    intervalMs: 15_000,
    onUpdate: async (pos) => {
      try {
        const delta = await recordGps(runner.id, pos.lat, pos.lng);
        setStats((s) => ({ sent: s.sent + 1, lastDelta: delta, lastSentAt: Date.now() }));
      } catch (err) {
        console.error('GPS push failed:', err);
      }
    },
  });

  const timeSinceSent = useNow(stats.lastSentAt);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--brand)', color: '#fff' }}>
      <header style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to={`/race/${raceCode}`} style={{ color: '#fff', padding: 6, display: 'flex' }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            GPS küldés · Tracking
          </div>
        </div>
        <button onClick={onUnselect} style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
          Más futó / Switch
        </button>
      </header>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500, margin: '0 auto' }}>
        {/* Runner identity */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: 18, background: 'rgba(255,255,255,0.08)',
          borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
            background: 'rgba(255,255,255,0.1)',
            border: isTracking ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.2)',
            flexShrink: 0,
          }}>
            {runner.img_url ? (
              <img src={runner.img_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>
                {runner.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Te vagy · You are
            </div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{runner.name}</div>
          </div>
        </div>

        {/* Status */}
        {!isTracking ? (
          <button onClick={start} className="btn btn-success btn-lg" style={{ width: '100%', justifyContent: 'center', padding: '18px 24px', fontSize: 18 }}>
            <Play size={20} /> GPS INDÍTÁSA / START GPS
          </button>
        ) : (
          <button onClick={stop} className="btn btn-danger btn-lg" style={{ width: '100%', justifyContent: 'center', padding: '18px 24px', fontSize: 18 }}>
            <Pause size={20} /> GPS LEÁLLÍTÁSA / STOP
          </button>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: 14, background: 'rgba(239,68,68,0.15)',
            border: '1px solid #ef4444', borderRadius: 10,
            display: 'flex', alignItems: 'start', gap: 10,
          }}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: '#fca5a5' }}>{error}</div>
          </div>
        )}

        {/* Live stats */}
        {isTracking && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <StatCard
              icon={<MapPin size={14} />}
              label="Pozíció / Position"
              value={lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '—'}
              sub={accuracy ? `±${Math.round(accuracy)} m` : undefined}
            />
            <StatCard
              icon={<Check size={14} />}
              label="Küldve / Sent"
              value={`${stats.sent}`}
              sub={stats.lastSentAt ? `${timeSinceSent}s ago` : undefined}
            />
          </div>
        )}

        {/* Tips */}
        <div style={{
          padding: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, fontSize: 13, color: '#94a3b8', lineHeight: 1.6,
        }}>
          <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Battery size={14} /> Tippek / Tips
          </div>
          📍 A böngésző GPS-e kérni fog engedélyt, add meg<br />
          🔋 Tartsd a képernyőt bekapcsolva, vagy használd a natív appot (ha van)<br />
          ⚠️ Ha zárolod a képernyőt, a Chrome 1-2 perc után leáll. Ajánlott a képernyőt ébren tartani.<br />
          📶 15 mp-enként küld adatot a szervernek
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: 14, background: 'rgba(255,255,255,0.06)',
      borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function useNow(reference: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!reference) return 0;
  return Math.floor((now - reference) / 1000);
}

function CenterMsg({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: error ? 'var(--danger)' : 'var(--muted)', fontSize: 15,
      padding: 20, textAlign: 'center',
    }}>
      {children}
    </div>
  );
}
