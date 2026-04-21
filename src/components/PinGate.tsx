import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { verifyAdminPin } from '../lib/api';

interface Props {
  raceId: string;
  raceCode: string;
  children: React.ReactNode;
}

/** Gate a page behind an admin PIN. Persists to sessionStorage for the race. */
export default function PinGate({ raceId, raceCode, children }: Props) {
  const storageKey = `admin-pin-${raceId}`;
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(storageKey) === 'true';
  });
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unlocked) sessionStorage.setItem(storageKey, 'true');
  }, [unlocked, storageKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyAdminPin(raceId, pin.trim());
      if (ok) {
        setUnlocked(true);
      } else {
        setError('Hibás PIN kód / Wrong PIN');
        setPin('');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, margin: '0 auto 16px',
          borderRadius: '50%', background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={28} color="var(--muted)" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Admin hozzáférés</h2>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
          Admin access
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
          Verseny / Race: <strong>{raceCode}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN kód"
            autoFocus
            style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}
          />
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10, fontWeight: 600 }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !pin.trim()}
                  style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}>
            Belépés / Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
