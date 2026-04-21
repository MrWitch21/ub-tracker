import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { createRace } from '../lib/api';
import type { Race } from '../lib/types';

export default function NewRace() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [teamTarget, setTeamTarget] = useState('210');
  const [plannedStart, setPlannedStart] = useState('');
  const [adminPin, setAdminPin] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Race | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !adminPin.trim()) return;
    setBusy(true);
    try {
      const race = await createRace({
        name: name.trim(),
        adminPin: adminPin.trim(),
        teamTarget: Number(teamTarget) || 210,
        plannedStart: plannedStart ? new Date(plannedStart).toISOString() : null,
      });
      setCreated(race);
    } catch (err) {
      alert('Hiba / Error: ' + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────
  if (created) {
    const copyCode = async () => {
      await navigator.clipboard.writeText(created.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card" style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto 20px', borderRadius: '50%',
            background: 'var(--success)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={36} strokeWidth={3} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Elkészült! / Created!</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
            {created.name}
          </p>

          <div style={{ padding: 20, background: 'var(--bg)', borderRadius: 10, marginBottom: 16 }}>
            <label style={{ marginBottom: 8 }}>Verseny kód / Race code</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <div className="share-code">{created.code}</div>
              <button
                onClick={copyCode}
                className="btn btn-ghost"
                style={{ padding: '12px' }}
                title="Másolás"
              >
                {copied ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div style={{ padding: 16, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, marginBottom: 20, textAlign: 'left' }}>
            <label style={{ color: 'var(--warn)', marginBottom: 6 }}>Admin PIN</label>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: 'var(--warn)' }}>
              {adminPin}
            </div>
            <div style={{ fontSize: 12, color: '#9a3412', marginTop: 6, lineHeight: 1.5 }}>
              ⚠️ Jegyezd meg! Ez kell az admin oldalhoz. Mindenki más csak a kóddal nézheti.<br />
              ⚠️ Save it! Needed for admin page. Everyone else can only view with the code.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/race/${created.code}/admin`} className="btn btn-dark btn-lg" style={{ flex: 1, justifyContent: 'center' }}>
              Admin oldal / Admin
            </Link>
            <Link to={`/race/${created.code}`} className="btn btn-primary btn-lg" style={{ flex: 1, justifyContent: 'center' }}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Create form ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: 20 }}>
      <Link to="/" style={{ color: 'var(--muted)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Vissza / Back
      </Link>

      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Új verseny / New race
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
          Kapsz egy osztható kódot, amit bárki használhat, hogy megnézze a versenyt.
        </p>

        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label>Verseny neve / Race name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. UB 2026 - Foxconn csapat" required />
          </div>
          <div>
            <label>Csapat célTáv (km) / Team target (km)</label>
            <input type="number" step="1" value={teamTarget} onChange={(e) => setTeamTarget(e.target.value)} />
          </div>
          <div>
            <label>Tervezett rajt / Planned start (opt.)</label>
            <input type="datetime-local" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
          </div>
          <div>
            <label>Admin PIN *</label>
            <input
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              inputMode="numeric"
              maxLength={10}
              required
              style={{ fontFamily: 'var(--font-mono)', fontSize: 18, letterSpacing: '0.2em' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              4-10 karakter. Csak admin oldalhoz kell. / 4-10 chars. Needed only for admin page.
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg"
                  disabled={busy || !name.trim() || !adminPin.trim()}
                  style={{ justifyContent: 'center', marginTop: 8 }}>
            {busy ? 'Létrehozás…' : 'Létrehozás / Create'}
          </button>
        </form>
      </div>
    </div>
  );
}
