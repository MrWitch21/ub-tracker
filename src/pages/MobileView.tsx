import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Home, Map, Users, BarChart2, ChevronRight } from 'lucide-react';
import { useRace } from '../lib/hooks';
import { useElapsed, useEventTimer } from '../lib/hooks';
import RaceMap from '../components/RaceMap';
import ActiveRunnerCard from '../components/ActiveRunnerCard';
import TeamProgress from '../components/TeamProgress';
import { runnerColor } from '../components/RaceMap';
import { resolveRunnerImageUrl } from '../lib/imageAssets';
import type { Runner } from '../lib/types';

type Tab = 'map' | 'runners' | 'stats';

export default function MobileView() {
  const { code } = useParams<{ code: string }>();
  const { race, runners, activeRunner, teamTotal, raceStartAt, loading, error } = useRace(code);
  const [tab, setTab] = useState<Tab>('map');
  const [followId, setFollowId] = useState<string | null>(null);

  if (loading) return <CenterMsg text="Betöltés…" />;
  if (error || !race) return <CenterMsg text={error ?? 'Nincs ilyen verseny'} error />;

  const effectiveFollow = followId ?? activeRunner?.id ?? null;

  function handleRunnerTap(id: string) {
    setFollowId(prev => prev === id ? null : id);
    setTab('map');
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', overflow: 'hidden',
      background: 'var(--bg)',
      fontFamily: 'var(--font-ui)',
    }}>
      <MobileHeader raceName={race.name} raceStartAt={raceStartAt} raceEndAt={race.actual_end_at} />

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* MAP TAB */}
        <div style={{ display: tab === 'map' ? 'block' : 'none', height: '100%', position: 'relative' }}>
          <RaceMap runners={runners} followRunnerId={effectiveFollow} raceId={race.id} />

          {activeRunner && (
            <div style={{
              position: 'absolute', bottom: 14, left: 12, right: 12, zIndex: 500,
              background: 'rgba(255,255,255,0.96)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border)',
            }}>
              <RunnerAvatar runner={activeRunner} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--active)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span className="live-dot" style={{ background: 'var(--active)' }} />
                  Most fut / Active
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                  {activeRunner.name}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 3 }}>
                  <span style={{ color: 'var(--active)', fontWeight: 700 }}>{activeRunner.logged_dist.toFixed(2)}</span>
                  <span style={{ color: 'var(--muted)' }}> / {activeRunner.target_dist} km</span>
                </div>
              </div>
              <button
                onClick={() => setTab('stats')}
                style={{ color: 'var(--muted)', padding: 4, background: 'none', border: 'none' }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* RUNNERS TAB */}
        {tab === 'runners' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {runners.map((r, idx) => (
                <RunnerListRow
                  key={r.id}
                  runner={r}
                  idx={idx}
                  isFollowed={r.id === effectiveFollow}
                  onTap={() => handleRunnerTap(r.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ActiveRunnerCard runner={activeRunner} size="sm" />
            <TeamProgress total={teamTotal} target={race.team_target} size="sm" />
            <RunnerStatsGrid runners={runners} />
          </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      <nav style={{
        display: 'flex',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {([
          { id: 'map'     as Tab, icon: Map,       label: 'Térkép'   },
          { id: 'runners' as Tab, icon: Users,     label: 'Futók'    },
          { id: 'stats'   as Tab, icon: BarChart2, label: 'Eredmény' },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '10px 0',
              color: tab === id ? 'var(--primary)' : 'var(--muted)',
              fontSize: 11, fontWeight: tab === id ? 700 : 400,
              background: 'none', border: 'none',
              borderTop: `2px solid ${tab === id ? 'var(--primary)' : 'transparent'}`,
              transition: 'color 0.15s, border-color 0.15s',
              minHeight: 52,
            }}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MobileHeader({ raceName, raceStartAt, raceEndAt }: {
  raceName: string; raceStartAt: string | null; raceEndAt: string | null;
}) {
  const { label, phase } = useEventTimer(raceStartAt, raceEndAt);
  const timerColor = phase === 'before' ? '#6366f1'
                   : phase === 'running' ? 'var(--success)'
                   : phase === 'after'   ? '#fff'
                   : 'rgba(255,255,255,0.5)';

  return (
    <header style={{
      padding: '10px 14px',
      paddingTop: 'max(10px, env(safe-area-inset-top))',
      background: 'var(--brand)',
      color: '#fff',
      display: 'flex', alignItems: 'center', gap: 10,
      flexShrink: 0,
      zIndex: 10,
    }}>
      <Link to="/" style={{ color: '#fff', padding: 4, display: 'flex', flexShrink: 0 }}>
        <Home size={18} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 800, fontSize: 15,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.2,
        }}>
          {raceName}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800,
        color: timerColor, letterSpacing: '-0.02em', flexShrink: 0,
      }}>
        {label}
      </div>
    </header>
  );
}

function RunnerAvatar({ runner, size }: { runner: Runner; size: number }) {
  const imgUrl = resolveRunnerImageUrl(runner.img_url);
  const color = runnerColor(0); // fallback; actual idx passed from parent

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      border: '3px solid var(--active)', boxShadow: '0 0 0 3px rgba(231,76,60,0.2)',
      background: 'var(--bg)',
      animation: 'glow 1.8s infinite',
    }}>
      {imgUrl ? (
        <img src={imgUrl} alt={runner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.4, fontWeight: 800, color: 'var(--muted)',
          background: color + '22',
        }}>
          {runner.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function RunnerListRow({ runner, idx, isFollowed, onTap }: {
  runner: Runner; idx: number; isFollowed: boolean; onTap: () => void;
}) {
  const color = runnerColor(idx);
  const imgUrl = resolveRunnerImageUrl(runner.img_url);
  const progress = runner.target_dist > 0 ? Math.min(100, (runner.logged_dist / runner.target_dist) * 100) : 0;

  return (
    <button
      onClick={onTap}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'var(--surface)',
        border: `2px solid ${isFollowed ? color : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        boxShadow: isFollowed ? `0 0 0 3px ${color}25` : 'var(--shadow-sm)',
        width: '100%', textAlign: 'left',
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left color strip */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: color, borderRadius: '12px 0 0 12px',
      }} />

      {/* Avatar */}
      <div style={{
        width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        border: `3px solid ${runner.is_active ? 'var(--active)' : runner.is_finished ? 'var(--finished)' : color}`,
        background: 'var(--bg)',
        marginLeft: 6,
        ...(runner.is_active ? { animation: 'glow 1.8s infinite' } : {}),
      }}>
        {imgUrl ? (
          <img src={imgUrl} alt={runner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: 'var(--muted)',
            background: color + '22',
          }}>
            {runner.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {runner.name}
          </span>
          {runner.is_active && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--active)',
              background: 'rgba(231,76,60,0.1)', borderRadius: 99,
              padding: '2px 7px', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span className="live-dot" style={{ width: 6, height: 6, background: 'var(--active)' }} />
              Fut
            </span>
          )}
          {runner.is_finished && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--finished)',
              background: 'rgba(22,163,74,0.1)', borderRadius: 99,
              padding: '2px 7px', flexShrink: 0,
            }}>
              ✓ Kész
            </span>
          )}
        </div>
        <div className="progress" style={{ height: 6, marginBottom: 6 }}>
          <div style={{ width: `${progress}%`, background: color }} />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          <span style={{ fontWeight: 700, color }}>{runner.logged_dist.toFixed(2)}</span>
          <span style={{ color: 'var(--muted)' }}> / {runner.target_dist} km</span>
          <span style={{ color: 'var(--muted)', marginLeft: 8 }}>({progress.toFixed(0)}%)</span>
        </div>
      </div>

      <ChevronRight size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
    </button>
  );
}

function RunnerStatsGrid({ runners }: { runners: Runner[] }) {
  if (!runners.length) return null;

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Futók összesítő
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {runners.map((r, idx) => {
          const color = runnerColor(idx);
          const pct = r.target_dist > 0 ? Math.min(100, (r.logged_dist / r.target_dist) * 100) : 0;
          return (
            <RunnerStatRow key={r.id} runner={r} color={color} pct={pct} />
          );
        })}
      </div>
    </div>
  );
}

function RunnerStatRow({ runner, color, pct }: { runner: Runner; color: string; pct: number }) {
  const elapsed = useElapsed(runner.started_at, runner.finished_at);
  const imgUrl = resolveRunnerImageUrl(runner.img_url);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        border: `2px solid ${runner.is_active ? 'var(--active)' : runner.is_finished ? 'var(--finished)' : color}`,
        background: 'var(--bg)',
      }}>
        {imgUrl ? (
          <img src={imgUrl} alt={runner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: 'var(--muted)',
            background: color + '22',
          }}>
            {runner.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%' }}>
            {runner.name}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
            {runner.started_at ? elapsed : '--:--:--'}
          </span>
        </div>
        <div className="progress" style={{ height: 5 }}>
          <div style={{ width: `${pct}%`, background: color }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color, fontWeight: 700 }}>
            {runner.logged_dist.toFixed(2)} km
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function CenterMsg({ text, error }: { text: string; error?: boolean }) {
  return (
    <div style={{
      height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: error ? 'var(--danger)' : 'var(--muted)', fontSize: 15,
      padding: 20, textAlign: 'center', flexDirection: 'column', gap: 16,
    }}>
      <div>{text}</div>
      <Link to="/" className="btn btn-ghost">Vissza / Back</Link>
    </div>
  );
}
