/* ──────────────────────────────────────────────────────────────────────
   WarningBanner — Klickbarer Banner für Warnungen (überfällig, Ablauf etc.)
   Severity: 'critical' | 'warning' | 'info'
   ────────────────────────────────────────────────────────────────────── */
export default function WarningBanner({ icon: Icon, severity = 'warning', children, onClick }) {
  const colors = {
    critical: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  icon: '#ef4444' },
    warning:  { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)', icon: '#f97316' },
    info:     { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)', icon: '#3b82f6' },
  }[severity] || { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)', icon: '#f97316' };

  return (
    <div onClick={onClick}
      style={{
        background: colors.bg, border: `1px solid ${colors.border}`,
        borderRadius: '12px', padding: '11px 14px',
        display: 'flex', alignItems: 'center', gap: '10px',
        cursor: onClick ? 'pointer' : 'default',
      }}>
      {Icon && <Icon size={15} color={colors.icon} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1, fontSize: '13px', color: '#e2e8f0' }}>{children}</span>
      {onClick && <span style={{ fontSize: '11px', color: '#475569' }}>→</span>}
    </div>
  );
}
