import { useRef, useState } from 'react';
import { Upload, Trash2, Camera } from 'lucide-react';

interface Props {
  /** Current image URL (if any) */
  value: string | null;
  /** Called when a new file is selected. Receives the File; parent handles upload. */
  onFileSelected: (file: File) => Promise<void>;
  /** Called when user clears the image. */
  onClear: () => void;
  size?: number;
  placeholder?: string;
}

export default function ImageUpload({ value, onFileSelected, onClear, size = 56, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Csak kép / Only images');
      return;
    }
    setUploading(true);
    try {
      await onFileSelected(file);
    } catch (err) {
      alert('Feltöltés sikertelen / Upload failed:\n' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      style={{
        position: 'relative',
        width: size, height: size,
        borderRadius: '50%',
        border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
        background: value ? 'transparent' : 'var(--surface-2)',
        overflow: 'hidden',
        cursor: uploading ? 'wait' : 'pointer',
        flexShrink: 0,
        transition: 'border-color 0.15s, transform 0.1s',
      }}
      onClick={() => !uploading && inputRef.current?.click()}
      title={value ? 'Kattints új képért / Click to replace' : 'Kattints kép feltöltéséhez / Click to upload'}
    >
      {value ? (
        <img
          src={value}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 2,
          color: 'var(--muted)',
        }}>
          <Camera size={size > 40 ? 18 : 14} />
          {placeholder && <span style={{ fontSize: 9, fontWeight: 600 }}>{placeholder}</span>}
        </div>
      )}

      {uploading && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'var(--primary)',
        }}>
          <Upload size={14} style={{ animation: 'pulse 1s infinite' }} />
        </div>
      )}

      {value && !uploading && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          style={{
            position: 'absolute',
            top: -4, right: -4,
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--danger)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--surface)',
            padding: 0,
          }}
          title="Kép törlése"
        >
          <Trash2 size={10} />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
