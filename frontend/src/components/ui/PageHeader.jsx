/* ──────────────────────────────────────────────────────────────────────
   PageHeader — einheitlicher Seitentitel mit Icon, Untertitel & Aktion
   ────────────────────────────────────────────────────────────────────── */
export default function PageHeader({ icon: Icon, title, subtitle, action, iconColor = '#f97316' }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          {Icon && <Icon size={22} color={iconColor} />} {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
