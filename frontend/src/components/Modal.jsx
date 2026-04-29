import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  // Desktop-Maxbreite
  const sizes = { sm: 'md:max-w-md', md: 'md:max-w-lg', lg: 'md:max-w-2xl', xl: 'md:max-w-4xl' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet / Dialog */}
      <div
        className={`
          relative w-full ${sizes[size]}
          bg-bg-card border border-border shadow-2xl
          rounded-t-3xl md:rounded-2xl
          max-h-[92vh] flex flex-col
          animate-slide-up md:animate-none
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag-Handle (nur Mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base md:text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-bg-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollbarer Inhalt */}
        <div className="p-4 md:p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
