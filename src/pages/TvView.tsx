import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import RaceMap, { runnerColor } from '../components/RaceMap';
import { useElapsed, useEventTimer, useRace } from '../lib/hooks';
import { foxconnLogoUrl, resolveRunnerImageUrl } from '../lib/imageAssets';
import { getNearestBalatonSettlement, resolveLocationName } from '../lib/locationLookup';
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
      <div style={{
        height: '100vh',
        background: '#0a0f1a',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'clamp(24px, 2.6vw, 52px)',
      }}>
        Betoltes... / Loading...
      </div>
    );
  }

  if (error || !race) {
    return (
      <div style={{
        height: '100vh',
        background: '#0a0f1a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}>
        <div style={{ fontSize: 'clamp(20px, 2vw, 36px)' }}>{error ?? 'Race not found'}</div>
        <Link to="/" style={{ color: '#60a5fa', fontSize: 16 }}>&lt; Vissza</Link>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#0a0f1a',
      color: '#fff',
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gridTemplateRows: 'clamp(86px, 8.5vh, 148px) 1fr clamp(250px, 29vh, 420px)',
    }}>
      <header style={{
        gridColumn: '1 / -1',
        background: '#111827',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(20px, 2vw, 40px)',
        padding: '0 clamp(20px, 2vw, 48px)',
        borderBottom: '2px solid #1f2937',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1vw, 22px)', flexShrink: 0 }}>
          <img
            src={foxconnLogoUrl}
            alt="Foxconn"
            style={{ height: 'clamp(46px, 4.1vw, 76px)', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 'clamp(21px, 2.05vw, 46px)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: '#dbeafe',
              whiteSpace: 'nowrap',
            }}>
              UltraBalaton
            </div>
            <div style={{
              fontSize: 'clamp(11px, 0.8vw, 16px)',
              color: '#93c5fd',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 800,
            }}>
              Race Tracker
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'clamp(24px, 2.3vw, 52px)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {race.name}
          </div>
          <div style={{
            fontSize: 'clamp(13px, 1vw, 22px)',
            color: '#9ca3af',
            marginTop: 4,
            fontFamily: 'var(--font-mono)',
          }}>
            {race.code} / Elo kovetes
          </div>
        </div>
      </header>

      <aside style={{
        gridRow: '2 / 3',
        background: '#0f172a',
        padding: 'clamp(16px, 1.5vw, 36px)',
        borderRight: '2px solid #1f2937',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(14px, 1.2vw, 28px)',
      }}>
        <TvEventTimer raceStartAt={raceStartAt} raceEndAt={race.actual_end_at} />
        <TvActiveRunner runner={activeRunner} />

        <div style={{
          padding: 'clamp(16px, 1.3vw, 28px)',
          background: '#111827',
          borderRadius: 14,
          border: '1px solid #1f2937',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 'clamp(12px, 0.9vw, 19px)',
            fontWeight: 700,
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 'clamp(8px, 0.7vw, 14px)',
          }}>
            Csapat / Team
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(48px, 4.8vw, 104px)',
              fontWeight: 900,
              color: '#60a5fa',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              {teamTotal.toFixed(1)}
            </span>
            <span style={{ fontSize: 'clamp(20px, 1.7vw, 40px)', color: '#6b7280' }}>
              / {race.team_target.toFixed(0)} km
            </span>
          </div>

          <div style={{
            marginTop: 'clamp(10px, 0.8vw, 18px)',
            height: 'clamp(12px, 1vw, 20px)',
            background: '#1f2937',
            borderRadius: 999,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${race.team_target > 0 ? Math.min(100, (teamTotal / race.team_target) * 100) : 0}%`,
              background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        <div style={{
          marginTop: 'auto',
          paddingTop: 'clamp(10px, 0.8vw, 16px)',
          borderTop: '1px solid #1f2937',
          fontSize: 'clamp(9px, 0.66vw, 20px)',
          color: '#6b7280',
          lineHeight: 1.35,
        }}>
          by CNT IT (Az applikacio munka idon kivul keszult / Developed outside working hours, in personal free time)
        </div>
      </aside>

      <div style={{ gridRow: '2 / 3', position: 'relative' }}>
        <RaceMap
          runners={runners}
          followRunnerId={activeRunner?.id ?? null}
          raceId={race.id}
          autoPanCycle
          forceOverview={!!race.actual_end_at}
          markerScale={3}
          followZoom={17.5}
          overviewZoomOffset={0.3}
        />
      </div>

      <footer style={{
        gridColumn: '1 / -1',
        background: '#111827',
        borderTop: '2px solid #1f2937',
        padding: 'clamp(22px, 2vw, 44px) clamp(26px, 2.35vw, 52px)',
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(1, runners.length)}, minmax(0, 1fr))`,
        gap: 'clamp(20px, 1.7vw, 34px)',
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
  const color = phase === 'before'
    ? '#a5b4fc'
    : phase === 'running'
      ? '#22c55e'
      : phase === 'after'
        ? '#f59e0b'
        : '#6b7280';

  const cleanLabel = label.replace(/^T\s*[+-]?\s*/, '');

  return (
    <div style={{
      padding: 'clamp(14px, 1.1vw, 24px)',
      background: '#111827',
      borderRadius: 14,
      border: '1px solid #1f2937',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 'clamp(11px, 0.85vw, 18px)',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 700,
      }}>
        Rajtora / Race clock
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'clamp(62px, 6.2vw, 152px)',
        fontWeight: 900,
        color,
        letterSpacing: '-0.03em',
        lineHeight: 1.02,
        marginTop: 6,
      }}>
        {cleanLabel}
      </div>
    </div>
  );
}

function TvActiveRunner({ runner }: { runner: Runner | null }) {
  const elapsed = useElapsed(runner?.started_at ?? null, runner?.finished_at ?? null);
  const runnerImgUrl = resolveRunnerImageUrl(runner?.img_url);
  const locationName = useRunnerLocationName(runner?.last_lat ?? null, runner?.last_lon ?? null);

  if (!runner) {
    return (
      <div style={{
        padding: 'clamp(24px, 2vw, 56px)',
        textAlign: 'center',
        background: '#111827',
        borderRadius: 14,
        border: '1px solid #1f2937',
      }}>
        <div style={{ fontSize: 'clamp(16px, 1.4vw, 32px)', color: '#6b7280' }}>
          Nincs aktiv futo<br />
          <span style={{ fontSize: 'clamp(12px, 1vw, 22px)' }}>No active runner</span>
        </div>
      </div>
    );
  }

  const progress = runner.target_dist > 0 ? (runner.logged_dist / runner.target_dist) * 100 : 0;

  return (
    <div style={{
      padding: 'clamp(16px, 1.3vw, 32px)',
      background: '#111827',
      borderRadius: 14,
      border: '2px solid #ef4444',
      boxShadow: '0 0 clamp(20px, 2vw, 48px) rgba(239,68,68,0.2)',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(14px, 1.2vw, 26px)',
        marginBottom: 'clamp(14px, 1.2vw, 24px)',
      }}>
        <div style={{
          width: 'clamp(110px, 9vw, 250px)',
          height: 'clamp(110px, 9vw, 250px)',
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#1f2937',
          border: '4px solid #ef4444',
          animation: 'glow-active 2s infinite',
          flexShrink: 0,
        }}>
          {runnerImgUrl ? (
            <img src={runnerImgUrl} alt={runner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(42px, 3.4vw, 92px)',
              fontWeight: 800,
              color: '#9ca3af',
            }}>
              {runner.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'clamp(12px, 0.95vw, 21px)',
            fontWeight: 800,
            color: '#ef4444',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              width: 'clamp(8px, 0.7vw, 14px)',
              height: 'clamp(8px, 0.7vw, 14px)',
              borderRadius: '50%',
              background: '#ef4444',
              animation: 'pulse 1.5s infinite',
            }} />
            Most fut / Active
          </div>

          <div style={{
            fontSize: 'clamp(34px, 3.2vw, 74px)',
            fontWeight: 900,
            lineHeight: 1.34,
            marginTop: 4,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {runner.name}
          </div>
          {locationName && (
            <div style={{
              marginTop: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#93c5fd',
              fontSize: 'clamp(14px, 1.1vw, 24px)',
              fontWeight: 700,
              lineHeight: 1.2,
            }}>
              <MapPin size={18} />
              <span>{locationName}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: 'clamp(14px, 1.1vw, 26px)',
        background: '#0a0f1a',
        borderRadius: 10,
        textAlign: 'center',
        marginBottom: 'clamp(12px, 1vw, 22px)',
      }}>
        <div style={{
          fontSize: 'clamp(11px, 0.85vw, 18px)',
          color: '#6b7280',
          textTransform: 'uppercase',
          fontWeight: 700,
          letterSpacing: '0.08em',
          marginBottom: 'clamp(4px, 0.4vw, 10px)',
        }}>
          Futoido / Elapsed
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(44px, 4.4vw, 98px)',
          fontWeight: 900,
          color: '#fbbf24',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          {elapsed}
        </div>
      </div>

      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'clamp(6px, 0.6vw, 12px)',
          fontSize: 'clamp(13px, 1vw, 21px)',
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}>
          <span>Tav / Distance</span>
          <span>{progress.toFixed(0)}%</span>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(32px, 2.9vw, 62px)',
          fontWeight: 800,
          marginBottom: 'clamp(8px, 0.7vw, 14px)',
        }}>
          <span style={{ color: '#ef4444' }}>{runner.logged_dist.toFixed(2)}</span>
          <span style={{ color: '#6b7280', fontSize: 'clamp(20px, 1.8vw, 40px)' }}>
            {' / '}{runner.target_dist} km
          </span>
        </div>

        <div style={{
          height: 'clamp(12px, 1vw, 22px)',
          background: '#1f2937',
          borderRadius: 999,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, progress)}%`,
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
  const runnerImgUrl = resolveRunnerImageUrl(runner.img_url);

  return (
    <div style={{
      padding: 'clamp(20px, 1.8vw, 36px) clamp(20px, 1.8vw, 36px)',
      background: '#0a0f1a',
      borderRadius: 10,
      border: `2px solid ${border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(16px, 1.3vw, 26px)',
      opacity: runner.is_finished ? 0.75 : 1,
      position: 'relative',
      minWidth: 0,
    }}>
      <div style={{
        width: 'clamp(92px, 6.9vw, 170px)',
        height: 'clamp(92px, 6.9vw, 170px)',
        borderRadius: '50%',
        overflow: 'hidden',
        border: `2px solid ${color}`,
        background: '#1f2937',
        flexShrink: 0,
      }}>
        {runnerImgUrl ? (
          <img src={runnerImgUrl} alt={runner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'clamp(24px, 2vw, 48px)',
            fontWeight: 800,
            color: '#9ca3af',
          }}>
            {runner.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 'clamp(24px, 1.9vw, 40px)',
          fontWeight: 800,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {runner.name}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(17px, 1.35vw, 28px)',
          color: '#9ca3af',
        }}>
          {runner.logged_dist.toFixed(1)} / {runner.target_dist} km
        </div>
        <div style={{
          marginTop: 6,
          height: 'clamp(6px, 0.5vw, 11px)',
          background: '#1f2937',
          borderRadius: 999,
          overflow: 'hidden',
        }}>
          <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: color }} />
        </div>
      </div>

      {runner.is_finished && (
        <div style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 'clamp(24px, 2vw, 40px)',
          height: 'clamp(24px, 2vw, 40px)',
          borderRadius: '50%',
          background: '#22c55e',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'clamp(13px, 1.1vw, 22px)',
          fontWeight: 800,
          border: '2px solid #111827',
        }}>
          OK
        </div>
      )}
    </div>
  );
}

function useRunnerLocationName(lat: number | null, lon: number | null): string | null {
  const [name, setName] = useState<string | null>(null);
  const roundedLat = useMemo(() => (lat == null ? null : Number(lat.toFixed(4))), [lat]);
  const roundedLon = useMemo(() => (lon == null ? null : Number(lon.toFixed(4))), [lon]);

  useEffect(() => {
    if (roundedLat == null || roundedLon == null) {
      setName(null);
      return;
    }

    const fallback = getNearestBalatonSettlement(roundedLat, roundedLon);
    setName(fallback);
    let cancelled = false;

    (async () => {
      const onlineName = await resolveLocationName(roundedLat, roundedLon);
      if (!cancelled && onlineName) setName(onlineName);
    })();

    return () => { cancelled = true; };
  }, [roundedLat, roundedLon]);

  return name;
}
