import type { Runner } from '../lib/types';
import { useElapsed } from '../lib/hooks';
import { resolveRunnerImageUrl } from '../lib/imageAssets';

interface Props {
  runner: Runner | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function ActiveRunnerCard({ runner, size = 'md' }: Props) {
  const elapsed = useElapsed(runner?.started_at ?? null, runner?.finished_at ?? null);
  const imgUrl = resolveRunnerImageUrl(runner?.img_url);

  if (!runner) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: size === 'lg' ? 40 : 20 }}>
        <div style={{ fontSize: size === 'lg' ? 24 : 14, fontWeight: 600 }}>
          Nincs aktív futó / No active runner
        </div>
      </div>
    );
  }

  const progress = runner.target_dist > 0 ? Math.min(100, (runner.logged_dist / runner.target_dist) * 100) : 0;

  const imgSize = size === 'lg' ? 180 : size === 'md' ? 110 : 72;
  const nameSize = size === 'lg' ? 56 : size === 'md' ? 24 : 18;
  const distSize = size === 'lg' ? 72 : size === 'md' ? 28 : 20;
  const elapsedSize = size === 'lg' ? 88 : size === 'md' ? 32 : 22;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: size === 'lg' ? 24 : 14, alignItems: 'center' }}>
      <div style={{
        width: imgSize, height: imgSize, borderRadius: '50%', overflow: 'hidden',
        border: '4px solid var(--active)', boxShadow: '0 6px 20px rgba(231,76,60,0.25)',
        background: 'var(--bg)',
      }}>
        {imgUrl ? (
          <img src={imgUrl} alt={runner.name}
               style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: imgSize * 0.4, fontWeight: 800, color: 'var(--muted)',
          }}>
            {runner.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: size === 'lg' ? 14 : 11, color: 'var(--active)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ background: 'var(--active)' }} />
          Most fut / Active
        </div>
        <h3 style={{ fontSize: nameSize, fontWeight: 800, marginTop: 6, lineHeight: 1.1 }}>
          {runner.name}
        </h3>
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: size === 'lg' ? 14 : 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Megtett táv / Progress
          </span>
          <span style={{ fontSize: size === 'lg' ? 14 : 11, color: 'var(--muted)', fontWeight: 600 }}>
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="progress" style={{ height: size === 'lg' ? 18 : 10 }}>
          <div style={{ width: `${progress}%` }} />
        </div>
        <div style={{
          marginTop: 10, textAlign: 'center',
          fontFamily: 'var(--font-mono)', fontSize: distSize, fontWeight: 800,
        }}>
          <span style={{ color: 'var(--active)' }}>{runner.logged_dist.toFixed(2)}</span>
          <span style={{ color: 'var(--muted)' }}> / {runner.target_dist} km</span>
        </div>
      </div>

      <div style={{
        width: '100%', padding: size === 'lg' ? 20 : 12,
        background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: size === 'lg' ? 13 : 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Futóidő / Elapsed time
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: elapsedSize, fontWeight: 800, color: 'var(--brand)', letterSpacing: '-0.02em' }}>
          {elapsed}
        </div>
        {runner.started_at && (
          <div style={{ fontSize: size === 'lg' ? 12 : 10, color: 'var(--muted)', marginTop: 4 }}>
            Start: {new Date(runner.started_at).toLocaleTimeString('hu-HU')}
          </div>
        )}
      </div>
    </div>
  );
}
