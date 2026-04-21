import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Smartphone, AlertCircle } from 'lucide-react';
import type { Runner } from '../lib/types';

interface Props {
  runner: Runner;
  supabaseUrl: string;
  onClose: () => void;
}

/** Modal that shows GPSLogger setup details for a runner. */
export default function GPSLoggerSetup({ runner, supabaseUrl, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!runner.gps_token) {
    return (
      <Modal onClose={onClose}>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Nincs GPS token / No GPS token</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Futtasd le a `supabase-schema-gps-token.sql` migrációt a Supabase SQL Editorban.<br />
            Run the migration SQL in Supabase.
          </div>
        </div>
      </Modal>
    );
  }

  const fullUrl = `${supabaseUrl}/functions/v1/gps-ingest?token=${runner.gps_token}`;
  const body = `{"lat":%LAT,"lon":%LON}`;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyRow = ({ label, value, keyId, mono = true }: { label: string; value: string; keyId: string; mono?: boolean }) => (
    <div style={{ marginBottom: 12 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          readOnly
          value={value}
          style={{
            fontFamily: mono ? 'var(--font-mono)' : undefined,
            fontSize: 12,
            flex: 1,
          }}
          onFocus={(e) => e.target.select()}
        />
        <button
          onClick={() => copy(value, keyId)}
          className="btn btn-ghost"
          style={{ padding: '8px 12px', flexShrink: 0 }}
        >
          {copied === keyId ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Smartphone size={20} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>GPSLogger beállítás</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {runner.name} · Android háttér GPS
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 8 }}>
            <X size={16} />
          </button>
        </div>

        {/* Steps */}
        <ol style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 20, marginBottom: 20, color: 'var(--text)' }}>
          <li>Telepítsd a <strong>GPSLogger</strong> appot (F-Droid vagy Play Store, ingyenes)</li>
          <li>Nyisd meg → <strong>Log to custom URL</strong> → kapcsold be</li>
          <li>Az alábbi mezőket töltsd ki</li>
          <li><strong>General options</strong> → kapcsold be: „Start on bootup", „Start on app launch"</li>
          <li><strong>Performance</strong> → <strong>Logging interval: 20s</strong>, accuracy 10m</li>
          <li>Nyomj a nagy <strong>Start</strong> gombra → mehet a zsebbe 🎒</li>
        </ol>

        {/* URL */}
        <CopyRow label="URL" value={fullUrl} keyId="url" />

        {/* Body */}
        <CopyRow label={'HTTP Body'} value={body} keyId="body" />

        {/* Headers + Method (not copyable, just labels) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label>HTTP Headers</label>
            <input readOnly value="Content-Type: application/json" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }} />
          </div>
          <div>
            <label>HTTP Method</label>
            <input readOnly value="POST" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
          </div>
        </div>

        {/* QR code — point the phone camera at this to auto-fill URL (manual still needed for body) */}
        <div style={{
          marginTop: 20, padding: 16, background: 'var(--bg)',
          borderRadius: 10, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            QR-kód az URL-hez
          </div>
          <div style={{ background: '#fff', padding: 12, display: 'inline-block', borderRadius: 8 }}>
            <QRCodeSVG value={fullUrl} size={180} level="M" />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
            Olvasd be a telefonon, hogy ne kelljen bepötyögni az URL-t.<br />
            Scan with phone to avoid typing the URL.
          </div>
        </div>

        {/* Test hint */}
        <div style={{
          marginTop: 16, padding: 12,
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
          fontSize: 12, color: '#78350f',
        }}>
          <strong>⚠️ Zárolt képernyő:</strong> A GPSLogger Android foreground service-ként fut — zsebben és zárolt képernyővel is megy.
          Értesítés-sávban látható kell legyen egy ikon amikor aktív.
        </div>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 16,
          maxWidth: 500, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
