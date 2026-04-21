interface Props { total: number; target: number; size?: 'sm' | 'md' | 'lg'; }

export default function TeamProgress({ total, target, size = 'md' }: Props) {
  const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;
  const totalSize = size === 'lg' ? 72 : size === 'md' ? 28 : 20;
  const labelSize = size === 'lg' ? 16 : size === 'md' ? 12 : 11;

  return (
    <div className="card">
      <div style={{
        fontSize: labelSize, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: size === 'lg' ? 14 : 8,
      }}>
        Csapat teljesítmény / Team performance
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
        <span style={{ fontSize: totalSize, fontWeight: 800, color: 'var(--primary)' }}>
          {total.toFixed(2)}
        </span>
        <span style={{ fontSize: totalSize * 0.5, color: 'var(--muted)' }}>
          / {target.toFixed(0)} km
        </span>
      </div>
      <div className="progress" style={{ height: size === 'lg' ? 22 : 12 }}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <div style={{ textAlign: 'right', marginTop: 6, fontSize: labelSize, color: 'var(--muted)', fontWeight: 600 }}>
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}
