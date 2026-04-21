import { useEventTimer } from '../lib/hooks';

interface Props {
  raceStartAt: string | null;
  raceEndAt: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function EventTimer({ raceStartAt, raceEndAt, size = 'md' }: Props) {
  const { label, phase } = useEventTimer(raceStartAt, raceEndAt);

  const color = phase === 'before' ? '#6366f1'
              : phase === 'running' ? 'var(--success)'
              : phase === 'after'   ? 'var(--brand)'
              : 'var(--muted)';

  const fontSize = size === 'xl' ? 84 : size === 'lg' ? 48 : size === 'md' ? 28 : 18;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      padding: size === 'xl' ? '18px 28px' : '10px 14px',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    }}>
      {size !== 'xl' && (
        <span style={{
          fontSize: size === 'lg' ? 13 : 11,
          fontWeight: 600, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Rajt / Race timer
        </span>
      )}
      <strong style={{
        fontFamily: 'var(--font-mono)',
        fontSize, fontWeight: 800, color,
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        {label}
      </strong>
      {raceStartAt && (
        <span style={{ fontSize: size === 'xl' ? 14 : 11, color: 'var(--muted)' }}>
          Rajt / Start: {new Date(raceStartAt).toLocaleString('hu-HU')}
        </span>
      )}
    </div>
  );
}
