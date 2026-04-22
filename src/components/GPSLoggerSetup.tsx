import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, AlertCircle, Smartphone } from 'lucide-react';
import type { Runner } from '../lib/types';

interface Props {
  runner: Runner;
  supabaseUrl: string;
  onClose: () => void;
}

type Platform = 'android' | 'ios';

export default function GPSLoggerSetup({ runner, supabaseUrl, onClose }: Props) {
  const [platform, setPlatform] = useState<Platform>('android');
  const [copied, setCopied] = useState<string | null>(null);

  if (!runner.gps_token) {
    return (
      <Modal onClose={onClose}>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Nincs GPS token / No GPS token</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Futtasd le a `supabase-schema-gps-token.sql` migrációt a Supabase SQL Editorban.
          </div>
        </div>
      </Modal>
    );
  }

  const fullUrl = `${supabaseUrl}/functions/v1/gps-ingest?token=${runner.gps_token}`;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Smartphone size={20} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>GPS kliens beállítás</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {runner.name} · Háttér GPS küldés
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 8 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg)', padding: 4, borderRadius: 8 }}>
          <PlatformTab active={platform === 'android'} onClick={() => setPlatform('android')}>
            🤖 Android
          </PlatformTab>
          <PlatformTab active={platform === 'ios'} onClick={() => setPlatform('ios')}>
             iOS / iPhone
          </PlatformTab>
        </div>

        {platform === 'android' ? (
          <AndroidSetup fullUrl={fullUrl} copied={copied} onCopy={copy} />
        ) : (
          <IosSetup fullUrl={fullUrl} token={runner.gps_token!} runnerName={runner.name} copied={copied} onCopy={copy} />
        )}
      </div>
    </Modal>
  );
}

function AndroidSetup({ fullUrl, copied, onCopy }: { fullUrl: string; copied: string | null; onCopy: (text: string, key: string) => void }) {
  const body = '{"lat":%LAT,"lon":%LON}';

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
        <strong>App:</strong> <a href="https://f-droid.org/packages/com.mendhak.gpslogger/" target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>GPSLogger for Android</a> (F-Droid vagy Play Store, ingyenes)
      </div>

      <ol style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 20, marginBottom: 20 }}>
        <li>Telepítsd a GPSLogger-t</li>
        <li>Engedélyezd: <strong>Helyadat „Mindig"</strong>, <strong>Akkumulátor opt. kikapcsolva</strong></li>
        <li><strong>Logging details</strong> → <strong>Log to custom URL</strong> bekapcsolva</li>
        <li>Töltsd ki az alábbi mezőket</li>
        <li><strong>Performance</strong> → Logging interval: <strong>20s</strong></li>
        <li>Nagy <strong>Start</strong> gomb → mehet a zsebbe 🎒</li>
      </ol>

      <CopyRow label="URL" value={fullUrl} keyId="url" copied={copied} onCopy={onCopy} />
      <CopyRow label="HTTP Body" value={body} keyId="body" copied={copied} onCopy={onCopy} />

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

      <QrBlock value={fullUrl} label="QR-kód az URL-hez" />

      <TipBox>
        <strong>✅ Zárolt képernyő OK:</strong> A GPSLogger Android foreground service-ként fut — zsebben és zárolt képernyővel is megy.
      </TipBox>
    </>
  );
}

function IosSetup({ fullUrl, token, runnerName, copied, onCopy }: { fullUrl: string; token: string; runnerName: string; copied: string | null; onCopy: (text: string, key: string) => void }) {
  const tid = (runnerName.replace(/[^A-Za-z]/g, '').substring(0, 2) || 'UB').toUpperCase();

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
        <strong>App:</strong> <a href="https://apps.apple.com/us/app/owntracks/id692424691" target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>OwnTracks</a> (App Store, ingyenes)
      </div>

      <ol style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 20, marginBottom: 16 }}>
        <li>Telepítsd az OwnTracks-ot az App Store-ból</li>
        <li>Első indításnál engedélyezd: <strong>Location „Always Allow"</strong> (fontos, nem elég a „While using"!)</li>
        <li>Tap az <strong>(i)</strong> ikonra jobb felül → <strong>Settings</strong> → <strong>Mode: HTTP</strong></li>
        <li><strong>URL</strong> mezőbe add meg a lenti URL-t</li>
        <li><strong>TrackerID</strong>: <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{tid}</code> (kétbetűs azonosító)</li>
        <li><strong>DeviceID</strong>: bármi (pl. iphone)</li>
        <li>Tap <strong>Done</strong>, majd nyomd meg a felső jobb sarokban a <strong>felhő ikont</strong> (HTTP módba lép)</li>
        <li><strong>Preferences</strong> → <strong>Advanced</strong> → <strong>locatorInterval: 20</strong>, <strong>locatorDisplacement: 15</strong></li>
        <li>Vissza a fő képernyőre → mehet a zsebbe 📱</li>
      </ol>

      <CopyRow label="URL" value={fullUrl} keyId="url" copied={copied} onCopy={onCopy} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <CopyRow label="TrackerID (TID)" value={tid} keyId="tid" copied={copied} onCopy={onCopy} inline />
        <div>
          <label>Mode</label>
          <input readOnly value="HTTP" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
        </div>
      </div>

      <QrBlock value={fullUrl} label="QR-kód (URL-hez)" />

      <TipBox warn>
        <strong>⚠️ iOS korlátok:</strong> Az iOS nem enged fix 20 mp-es intervallumot — az Apple OS dönt mikor küld pontot (tipikusan 15-50 m elmozdulásnál). Ha a futó áll, iOS felfüggeszti a trackinget. Mozgás közben folyamatos.<br />
        <br />
        <strong>✅ Zárolt képernyő:</strong> Engedélyezve (a felső sávban látható kék/fehér helyjelző ikon, ez iOS biztonsági jelzés, nem lehet elrejteni).
      </TipBox>

      <details style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>További OwnTracks beállítások (haladó)</summary>
        <div style={{ padding: '10px 0', lineHeight: 1.6 }}>
          <strong>Auth:</strong> nem kell (a token az URL-ben van).<br />
          <strong>Password:</strong> üres.<br />
          <strong>Username:</strong> üres vagy akármi.<br />
          <strong>Token:</strong> <code style={{ fontSize: 11 }}>{token}</code> (az URL-ben már benne van).<br />
          <strong>Monitoring mode:</strong> Move (a Follow mode-ot NE használd mert túl sok adat).
        </div>
      </details>
    </>
  );
}

function PlatformTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 700,
        background: active ? 'var(--surface)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--muted)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function CopyRow({ label, value, keyId, copied, onCopy, inline }: {
  label: string; value: string; keyId: string; copied: string | null;
  onCopy: (text: string, key: string) => void; inline?: boolean;
}) {
  return (
    <div style={{ marginBottom: inline ? 0 : 12 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          readOnly
          value={value}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, flex: 1 }}
          onFocus={(e) => e.target.select()}
        />
        <button onClick={() => onCopy(value, keyId)} className="btn btn-ghost" style={{ padding: '8px 12px', flexShrink: 0 }}>
          {copied === keyId ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

function QrBlock({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ marginTop: 20, padding: 16, background: 'var(--bg)', borderRadius: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ background: '#fff', padding: 12, display: 'inline-block', borderRadius: 8 }}>
        <QRCodeSVG value={value} size={180} level="M" />
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
        Olvasd be a telefonon, hogy ne kelljen bepötyögni.
      </div>
    </div>
  );
}

function TipBox({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <div style={{
      marginTop: 16, padding: 12,
      background: warn ? '#fffbeb' : '#ecfdf5',
      border: `1px solid ${warn ? '#fde68a' : '#a7f3d0'}`,
      borderRadius: 8,
      fontSize: 12,
      color: warn ? '#78350f' : '#064e3b',
      lineHeight: 1.5,
    }}>
      {children}
    </div>
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
          background: 'var(--surface)', borderRadius: 16,
          maxWidth: 520, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
