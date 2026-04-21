import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, ArrowRight } from 'lucide-react';
import { findRaceByCode } from '../lib/api';

export default function Landing() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const race = await findRaceByCode(trimmed);
      if (!race) {
        setError(`Nincs ilyen kódú verseny / No such race: ${trimmed}`);
        return;
      }
      navigate(`/race/${trimmed}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ maxWidth: 460, width: '100%' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 10 }}>🏃</div>
          <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
            UltraBalaton Tracker
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 10 }}>
            Valós idejű váltófutás-követő · Real-time relay race tracker
          </p>
        </div>

        {/* Join card */}
        <div style={{
          background: '#fff', color: 'var(--text)',
          borderRadius: 16, padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            Csatlakozás / Join race
          </div>
          <form onSubmit={handleJoin}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VERSENY KÓD · RACE CODE"
              maxLength={8}
              autoCapitalize="characters"
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: '0.2em',
                padding: '14px 12px',
              }}
            />
            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10, fontWeight: 600, textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={busy || !code.trim()}
              style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}
            >
              Megnyitás / Open <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Create link */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={() => navigate('/new')}
            style={{
              color: '#94a3b8', fontSize: 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
            }}
          >
            <Plus size={15} /> Új verseny létrehozása / Create new race
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, color: '#64748b', fontSize: 11, lineHeight: 1.6 }}>
          <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Supabase + OpenStreetMap<br />
          By CNT IT · Free time project
        </div>
      </div>
    </div>
  );
}
