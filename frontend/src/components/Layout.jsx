import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Home } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

/* ── Mobile-Erkennung ──────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return isMobile;
}

export default function Layout() {
  const isMobile      = useIsMobile();
  const [open, setOpen] = useState(false);

  const openSidebar  = useCallback(() => setOpen(true),  []);
  const closeSidebar = useCallback(() => setOpen(false), []);

  /* Sidebar schließen wenn auf Desktop gewechselt */
  useEffect(() => { if (!isMobile) setOpen(false); }, [isMobile]);

  /* Kein Body-Scroll wenn Sidebar offen */
  useEffect(() => {
    document.body.style.overflow = (isMobile && open) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, open]);

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', backgroundColor: '#161616' }}>

      {/* ── Desktop: Sidebar immer sichtbar ─────────────────────── */}
      {!isMobile && <Sidebar />}

      {/* ── Mobil: Sidebar als Overlay ──────────────────────────── */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeSidebar}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(3px)',
              opacity: open ? 1 : 0,
              pointerEvents: open ? 'auto' : 'none',
              transition: 'opacity 0.25s ease',
            }}
          />
          {/* Slide-in Sidebar */}
          <div style={{
            position: 'fixed', top: 0, left: 0, height: '100%',
            zIndex: 50,
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
            willChange: 'transform',
            boxShadow: open ? '4px 0 32px rgba(0,0,0,0.5)' : 'none',
          }}>
            <Sidebar onClose={closeSidebar} isMobile />
          </div>
        </>
      )}

      {/* ── Hauptinhalt ─────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Mobiler Header */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 30, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '0 16px', height: '52px',
            background: 'rgba(17,17,17,0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #1e1e1e',
          }}>
            {/* Hamburger */}
            <button
              onClick={openSidebar}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 38, height: 38, borderRadius: 10,
                background: '#1e1e1e', border: '1px solid #2a2a2a',
                color: '#94a3b8', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Menu size={20} />
            </button>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: '#f97316',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
              }}>
                <Home size={14} color="white" />
              </div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px' }}>
                Gino-Home
              </span>
            </div>
          </div>
        )}

        {/* Seiten-Inhalt */}
        <div style={{
          padding: isMobile ? '16px' : '24px',
          paddingBottom: isMobile ? '90px' : '24px',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          flex: 1,
        }}>
          <Outlet />
        </div>
      </main>

      {/* BottomNav: nur Mobil */}
      {isMobile && <BottomNav onMenuOpen={openSidebar} />}
    </div>
  );
}
