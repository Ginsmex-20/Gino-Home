import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const maxW = { sm: '440px', md: '520px', lg: '680px', xl: '900px' }[size] || '520px';
  const isMobile = window.innerWidth < 768;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '16px',
      }}
    >
      {/* Backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }} />

      {/* Dialog / Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isMobile ? '100%' : maxW,
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: isMobile ? '24px 24px 0 0' : '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          maxHeight: isMobile ? '92dvh' : '90dvh',
          display: 'flex', flexDirection: 'column',
          animation: isMobile ? 'slide-up 0.3s cubic-bezier(0.32,0.72,0,1)' : 'none',
        }}
      >
        {/* Drag-Handle (nur Mobil) */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '12px 20px 14px' : '18px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#94a3b8', cursor: 'pointer',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Inhalt */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
