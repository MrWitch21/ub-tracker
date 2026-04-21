import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRace, useEventTimer, useElapsed } from '../lib/hooks';
import RaceMap, { runnerColor } from '../components/RaceMap';
import type { Runner } from '../lib/types';

export default function TvView() {
  const { code } = useParams<{ code: string }>();
  const { race, runners, activeRunner, teamTotal, raceStartAt, loading, error } = useRace(code);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0f1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
        Betöltés… / Loading…
      </div>
    );
  }
  if (error || !race) {
    return (
      <div style={{ height: '100vh', background: '#0a0f1a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ fontSize: 24 }}>{error ?? 'Race not found'}</div>
        <Link to="/" style={{ color: '#60a5fa', fontSize: 16 }}>← Vissza</Link>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh', width: '100vw', overflow: 'hidden',
      background: '#0a0f1a', color: '#fff',
      display: 'grid',
      gridTemplateColumns: '520px 1fr',
      gridTemplateRows: '120px 1fr 220px',
    }}>
      <header style={{
        gridColumn: '1 / -1',
        background: '#111827',
        display: 'flex', alignItems: 'center', gap: 30,
        padding: '0 40px',
        borderBottom: '2px solid #1f2937',
      }}>
        <div style={{ fontSize: 56 }}>🏃</div>
        <div>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {race.name}
          </div>
          <div style={{ fontSize: 16, color: '#9ca3af', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            {race.code} · Élő követés
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <TvEventTimer raceStartAt={raceStartAt} raceEndAt={race.actual_end_at} />
      </header>

      <aside style={{
        gridRow: '2 / 3',
        background: '#0f172a',
        padding: 30,
        borderRight: '2px solid #1f2937',
        overflowY: 'auto',
      }}>
        <TvActiveRunner runner={activeRunner} />

        <div style={{
          marginTop: 24, padding: 24,
          background: '#111827', borderRadius: 14,
          border: '1px solid #1f2937',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Csapat · Team
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 64, fontWeight: 900, color: '#60a5fa', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {teamTotal.toFixed(1)}
            </span>
            <span style={{ fontSize: 24, color: '#6b7280' }}>/ {race.team_target.toFixed(0)} km</span>
          </div>
          <div style={{ marginTop: 14, height: 14, background: '#1f2937', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${race.team_target > 0 ? Math.min(100, (teamTotal / race.team_target) * 100) : 0}%`,
              background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      </aside>

      <div style={{ gridRow: '2 / 3', position: 'relative' }}>
        <RaceMap runners={runners} followRunnerId={activeRunner?.id ?? null} />
      </div>

      <footer style={{
        gridColumn: '1 / -1',
        background: '#111827',
        borderTop: '2px solid #1f2937',
        padding: '16px 24px',
        display: 'flex', gap: 16,
        overflowX: 'auto',
      }}>
        {runners.map((r, idx) => (
          <TvRunnerTile key={r.id} runner={r} color={runnerColor(idx)} />
        ))}
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes glow-active {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          50%     { box-shadow: 0 0 0 20px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}

function TvEventTimer({ raceStartAt, raceEndAt }: { raceStartAt: string | null; raceEndAt: string | null }) {
  const { label, phase } = useEventTimer(raceStartAt, raceEndAt);
  const color = phase === 'before' ? '#a5b4fc'
              : phase === 'running' ? '#22c55e'
              : phase === 'after' ? '#f59e0b' : '#6b7280';
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
        Rajt / Race clock
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {label}
      </div>
    </div>
  );
}

function TvActiveRunner({ runner }: { runner: Runner | null }) {
  const elapsed = useElapsed(runner?.started_at ?? null, runner?.finished_at ?? null);

  if (!runner) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#111827', borderRadius: 14, border: '1px solid #1f2937' }}>
        <div style={{ fontSize: 24, color: '#6b7280' }}>
          Nincs aktív futó<br /><span style={{ fontSize: 16 }}>No active runner</span>
        </div>
      </div>
    );
  }

  const progress = runner.target_dist > 0 ? (runner.logged_dist / runner.target_dist) * 100 : 0;

  return (
    <div style={{ padding: 24, background: '#111827', borderRadius: 14, border: '2px solid #ef4444', boxShadow: '0 0 40px rgba(239,68,68,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: '#1f2937',
          border: '4px solid #ef4444', animation: 'glow-active 2s infinite', flexShrink: 0,
        }}>
          {runner.img_url ? (
            <img src={runner.img_url} alt={runner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 800, color: '#9ca3af' }}>
              {runner.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
            Most fut · Active
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, marginTop: 4, letterSpacing: '-0.01em' }}>
            {runner.name}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', background: '#0a0f1a', borderRadius: 10, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
          Futóidő · Elapsed
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 72, fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {elapsed}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          <span>Táv · Distance</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, marginBottom: 10 }}>
          <span style={{ color: '#ef4444' }}>{runner.logged_dist.toFixed(2)}</span>
          <span style={{ color: '#6b7280', fontSize: 24 }}> / {runner.target_dist} km</span>
        </div>
        <div style={{ height: 16, background: '#1f2937', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(100, progress)}%`,
            background: 'linear-gradient(90deg, #ef4444, #fbbf24)',
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

function TvRunnerTile({ runner, color }: { runner: Runner; color: string }) {
  const progress = runner.target_dist > 0 ? (runner.logged_dist / runner.target_dist) * 100 : 0;
  const border = runner.is_active ? '#ef4444' : runner.is_finished ? '#22c55e' : '#1f2937';

  return (
    <div style={{
      flex: '0 0 auto', minWidth: 180, padding: 14, background: '#0a0f1a',
      borderRadius: 10, border: `2px solid ${border}`,
      display: 'flex', alignItems: 'center', gap: 12,
      opacity: runner.is_finished ? 0.75 : 1, position: 'relative',
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: '50%', overflow: 'hidden',
        border: `2px solid ${color}`, background: '#1f2937', flexShrink: 0,
      }}>
        {runner.img_url ? (
          <img src={runner.img_url} alt={runner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#9ca3af' }}>
            {runner.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {runner.name}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#9ca3af' }}>
          {runner.logged_dist.toFixed(1)} / {runner.target_dist} km
        </div>
        <div style={{ marginTop: 4, height: 4, background: '#1f2937', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: color }} />
        </div>
      </div>
      {runner.is_finished && (
        <div style={{
          position: 'absolute', top: -6, right: -6,
          width: 26, height: 26, borderRadius: '50%',
          background: '#22c55e', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, border: '2px solid #111827',
        }}>✓</div>
      )}
    </div>
  );
}
