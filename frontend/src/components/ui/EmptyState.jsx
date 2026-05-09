/* ──────────────────────────────────────────────────────────────────────
   EmptyState — wenn keine Einträge vorhanden sind
   ────────────────────────────────────────────────────────────────────── */
export default function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
      {Icon && <Icon size={40} className="text-slate-600 mx-auto mb-3" />}
      {title && <p className="text-slate-300 font-medium mb-1">{title}</p>}
      {message && <p className="text-slate-500 text-sm">{message}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-4 text-sm text-orange-400 hover:text-orange-500">
          {actionLabel} →
        </button>
      )}
    </div>
  );
}
