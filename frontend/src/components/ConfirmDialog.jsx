import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Wiederverwendbarer Bestätigungs-Dialog im App-Style.
 *
 * Props:
 *  open         – boolean, ob der Dialog sichtbar ist
 *  title        – Titel (z.B. "Ordner löschen?")
 *  message      – Beschreibungstext
 *  confirmLabel – Text des Bestätigungs-Buttons (default: "Löschen")
 *  danger       – true → roter Button, false → oranger Button
 *  onConfirm    – Callback bei Bestätigung
 *  onCancel     – Callback bei Abbruch / Escape
 */
export default function ConfirmDialog({
  open,
  title = 'Bist du sicher?',
  message = 'Diese Aktion kann nicht rückgängig gemacht werden.',
  confirmLabel = 'Löschen',
  danger = true,
  onConfirm,
  onCancel,
}) {
  /* Keyboard-Support */
  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter')  onConfirm?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const accent = danger ? '#ef4444' : '#f97316';
  const accentBg = danger ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)';
  const accentBorder = danger ? 'rgba(239,68,68,0.25)' : 'rgba(249,115,22,0.25)';
  const shadow = danger ? '0 4px 16px rgba(239,68,68,0.35)' : '0 4px 16px rgba(249,115,22,0.35)';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9001,
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '22px',
        padding: '32px 28px 24px',
        width: 'min(380px, calc(100vw - 32px))',
        boxShadow: '0 30px 70px rgba(0,0,0,0.85)',
        animation: 'dialogIn 0.18s ease',
      }}>

        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: '16px',
          background: accentBg, border: `1px solid ${accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <AlertTriangle size={24} color={accent} />
        </div>

        {/* Titel */}
        <h3 style={{
          margin: '0 0 10px', color: '#fff',
          fontSize: '18px', fontWeight: 700, textAlign: 'center',
        }}>
          {title}
        </h3>

        {/* Nachricht */}
        <p style={{
          margin: '0 0 28px', color: '#64748b',
          fontSize: '14px', textAlign: 'center', lineHeight: 1.6,
        }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px', borderRadius: '13px',
            background: '#111', border: '1px solid #2a2a2a',
            color: '#94a3b8', fontSize: '14px', fontWeight: 500,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.target.style.background = '#1a1a1a'}
            onMouseLeave={e => e.target.style.background = '#111'}
          >
            Abbrechen
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '12px', borderRadius: '13px',
            background: accent, border: 'none',
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', boxShadow: shadow, transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => e.target.style.opacity = '0.85'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`@keyframes dialogIn { from { opacity:0; transform:translate(-50%,-48%) scale(0.97); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }`}</style>
    </>
  );
}
