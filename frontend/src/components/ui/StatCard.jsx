/* ──────────────────────────────────────────────────────────────────────
   StatCard — Kompakte Stat-Karte mit Icon, Label und Wert
   Optional klickbar als Filter
   ────────────────────────────────────────────────────────────────────── */
export default function StatCard({ icon: Icon, label, value, color = '#f97316', onClick, active, hint }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: '120px',
        background: active ? `${color}15` : '#141414',
        border: `1px solid ${active ? `${color}55` : '#1e1e1e'}`,
        borderRadius: '14px', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s', textAlign: 'left',
      }}
      onMouseEnter={e => { if (onClick && !active) e.currentTarget.style.borderColor = `${color}66`; }}
      onMouseLeave={e => { if (onClick && !active) e.currentTarget.style.borderColor = '#1e1e1e'; }}
    >
      <div style={{
        width: '38px', height: '38px', borderRadius: '10px',
        background: `${color}1a`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {Icon && <Icon size={18} color={color} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '20px', color: '#fff', fontWeight: 700, margin: '2px 0 0', lineHeight: 1.1 }}>{value}</p>
        {hint && <p style={{ fontSize: '10px', color: '#475569', margin: '2px 0 0' }}>{hint}</p>}
      </div>
    </button>
  );
}
