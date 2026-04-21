import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Tv, Settings, Navigation, Home, Share2 } from 'lucide-react';
import { useRace } from '../lib/hooks';
import RaceMap from '../components/RaceMap';
import ActiveRunnerCard from '../components/ActiveRunnerCard';
import TeamProgress from '../components/TeamProgress';
import EventTimer from '../components/EventTimer';
import RunnerTray from '../components/RunnerTray';

export default function RaceView() {
  const { code } = useParams<{ code: string }>();
  const { race, runners, activeRunner, teamTotal, raceStartAt, loading, error } = useRace(code);
  const [followId, setFollowId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (loading) {
    return <CenterMessage text="Betöltés… / Loading…" />;
  }
  if (error || !race) {
    return <CenterMessage text={error ?? 'Nincs ilyen verseny / Race not found'} error />;
  }

  const effectiveFollow = followId ?? activeRunner?.id ?? null;

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <header style={{
        padding: '12px 16px',
        background: 'var(--brand)',
        color: '#fff',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: 'var(--shadow)', zIndex: 10,
      }}>
        <Link to="/" style={{ color: '#fff', display: 'flex', padding: 6 }}>
          <Home size={18} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {race.name}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
            Kód: {race.code}
          </div>
        </div>

        <button onClick={copyLink} title="Link másolása" style={{ color: '#fff', padding: 8 }}>
          <Share2 size={16} />
          {copied && <span style={{ fontSize: 11, marginLeft: 4 }}>✓</span>}
        </button>
        <Link to={`/race/${code}/run`} title="GPS küldés" style={{ color: '#fff', padding: 8 }}>
          <Navigation size={16} />
        </Link>
        <Link to={`/race/${code}/tv`} title="TV nézet" style={{ color: '#fff', padding: 8 }}>
          <Tv size={16} />
        </Link>
        <Link to={`/race/${code}/admin`} title="Admin" style={{ color: '#fff', padding: 8 }}>
          <Settings size={16} />
        </Link>
      </header>

      <div className="dashboard-grid" style={{ flex: 1, display: 'grid', overflow: 'hidden' }}>
        <div style={{ position: 'relative', background: '#dce4e6' }}>
          <RaceMap runners={runners} followRunnerId={effectiveFollow} />
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 500, minWidth: 200 }}>
            <EventTimer raceStartAt={raceStartAt} raceEndAt={race.actual_end_at} size="md" />
          </div>
        </div>

        <aside style={{
          overflowY: 'auto', padding: 14,
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <ActiveRunnerCard runner={activeRunner} size="md" />
          <TeamProgress total={teamTotal} target={race.team_target} size="md" />
        </aside>
      </div>

      <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <RunnerTray
          runners={runners}
          followRunnerId={effectiveFollow}
          onSelectFollow={setFollowId}
          size="md"
        />
      </footer>

      <style>{`
        .dashboard-grid { grid-template-columns: 1fr 340px; }
        @media (max-width: 860px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(40vh, 1fr) auto;
          }
        }
      `}</style>
    </div>
  );
}

function CenterMessage({ text, error }: { text: string; error?: boolean }) {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: error ? 'var(--danger)' : 'var(--muted)', fontSize: 15,
      padding: 20, textAlign: 'center',
    }}>
      <div>
        {text}
        <div style={{ marginTop: 16 }}>
          <Link to="/" className="btn btn-ghost">Vissza / Back</Link>
        </div>
      </div>
    </div>
  );
}
