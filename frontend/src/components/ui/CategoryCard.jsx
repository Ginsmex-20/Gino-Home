import { X } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────
   CategoryCard — Visuelle Kategorie-Karte mit Icon, Farbe und Count
   Optional löschbar (für eigene Kategorien)
   ────────────────────────────────────────────────────────────────────── */
export default function CategoryCard({ icon: Icon, label, color = '#f97316', count, hint, active, onClick, onDelete }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={onClick}
        style={{
          minWidth: '130px',
          background: active ? `${color}1a` : '#141414',
          border: `1px solid ${active ? color : '#1e1e1e'}`,
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: '10px',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = `${color}66`; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#1e1e1e'; }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '9px',
          background: `${color}22`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {Icon && <Icon size={15} color={color} />}
        </div>
        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', color: active ? '#fff' : '#cbd5e1', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
          {(count !== undefined || hint) && (
            <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0' }}>
              {hint || `${count} Eintr.`}
            </p>
          )}
        </div>
      </button>
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%',
            background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#ef4444',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>
          <X size={10} />
        </button>
      )}
    </div>
  );
}
