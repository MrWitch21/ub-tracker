import type { Runner } from '../lib/types';
import { runnerColor } from './RaceMap';
import { resolveRunnerImageUrl } from '../lib/imageAssets';

interface Props {
  runners: Runner[];
  followRunnerId: string | null;
  onSelectFollow: (id: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function RunnerTray({ runners, followRunnerId, onSelectFollow, size = 'md' }: Props) {
  const avatarSize = size === 'lg' ? 84 : size === 'md' ? 56 : 44;
  const nameSize   = size === 'lg' ? 16 : size === 'md' ? 13 : 12;

  return (
    <div style={{
      display: 'flex', gap: size === 'lg' ? 16 : 8,
      overflowX: 'auto', padding: size === 'lg' ? 16 : 10,
      scrollSnapType: 'x mandatory',
    }}>
      {runners.map((r, idx) => {
        const color = runnerColor(idx);
        const isFollowed = r.id === followRunnerId;
        const progress = r.target_dist > 0 ? (r.logged_dist / r.target_dist) * 100 : 0;
        const imgUrl = resolveRunnerImageUrl(r.img_url);

        return (
          <button
            key={r.id}
            onClick={() => onSelectFollow(isFollowed ? null : r.id)}
            style={{
              flex: '0 0 auto',
              padding: size === 'lg' ? 16 : 10,
              background: 'var(--surface)',
              border: `2px solid ${isFollowed ? color : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              boxShadow: isFollowed ? `0 0 0 3px ${color}20` : 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6,
              scrollSnapAlign: 'start',
              minWidth: avatarSize + 40,
              transition: 'all 0.15s',
              position: 'relative',
            }}
          >
            <div style={{
              width: avatarSize, height: avatarSize, borderRadius: '50%', overflow: 'hidden',
              border: `3px solid ${r.is_active ? 'var(--active)' : r.is_finished ? 'var(--finished)' : color}`,
              background: 'var(--bg)',
              ...(r.is_active ? { animation: 'glow 1.8s infinite' } : {}),
            }}>
              {imgUrl ? (
                <img src={imgUrl} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: avatarSize * 0.4, fontWeight: 800, color: 'var(--muted)',
                  background: color + '22',
                }}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{
              fontSize: nameSize, fontWeight: 700,
              maxWidth: avatarSize + 20,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {r.name}
            </div>
            <div style={{ fontSize: size === 'lg' ? 12 : 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {r.logged_dist.toFixed(1)} / {r.target_dist} km
            </div>
            <div className="progress" style={{ width: '100%', height: 4 }}>
              <div style={{ width: `${Math.min(100, progress)}%`, background: color }} />
            </div>
            {r.is_finished && (
              <div style={{
                position: 'absolute', top: 4, right: 4,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--finished)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>✓</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
