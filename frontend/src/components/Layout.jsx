import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import useAuth from '../stores/auth';

/* ── Seiten-Titel ────────────────────────────────────────────────── */
function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname === '/')                  return 'Dashboard';
  if (pathname.startsWith('/tasks'))     return 'Aufgaben';
  if (pathname.startsWith('/finance'))   return 'Finanzen';
  if (pathname.startsWith('/documents')) return 'Dokumente';
  if (pathname.startsWith('/vault'))     return 'Tresor';
  if (pathname.startsWith('/calendar'))  return 'Kalender';
  if (pathname.startsWith('/groups/'))   return 'Gruppe';
  if (pathname.startsWith('/groups'))    return 'Gruppen';
  if (pathname.startsWith('/profile'))   return 'Profil';
  return 'Gino-Home';
}

/* ── Desktop collapsed-State ─────────────────────────────────────── */
function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  }, []);
  return [collapsed, toggle];
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useCollapsed();
  const pageTitle = usePageTitle();
  const { user }  = useAuth();
  const { pathname } = useLocation();

  /* Sidebar bei Navigation schließen */
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  /* Body-Scroll sperren wenn Sidebar offen */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', backgroundColor: '#0f0f0f' }}>

      {/* ════════════════════════════════════════════════════
          DESKTOP SIDEBAR — per CSS (.sidebar-desktop) auf
          Mobilgeräten ausgeblendet (display:none !important)
          ════════════════════════════════════════════════════ */}
      <div className="sidebar-desktop" style={{ display: 'flex', flexShrink: 0 }}>
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>

      {/* ════════════════════════════════════════════════════
          MOBIL-OVERLAY — per CSS (.mobile-overlay-sidebar)
          auf Desktop ausgeblendet
          ════════════════════════════════════════════════════ */}
      <div className="mobile-overlay-sidebar" style={{ display: 'none' }}>
        {/* Backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 0.25s ease',
          }}
        />
        {/* Slide-in Panel */}
        <div style={{
          position: 'fixed', top: 0, left: 0, height: '100%',
          zIndex: 50, willChange: 'transform',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          boxShadow: mobileOpen ? '8px 0 48px rgba(0,0,0,0.7)' : 'none',
        }}>
          <Sidebar onClose={() => setMobileOpen(false)} isMobile />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          HAUPTBEREICH
          ════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Mobiler App-Header (per CSS nur auf Mobile sichtbar) */}
        <header
          className="mobile-header"
          style={{
            display: 'none',           /* CSS überschreibt das auf Mobile zu flex */
            alignItems: 'center',
            padding: '0 16px',
            height: '56px',
            flexShrink: 0,
            background: 'rgba(15,15,15,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            zIndex: 30,
            position: 'sticky',
            top: 0,
          }}
        >
          {/* Hamburger ☰ */}
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: '#cbd5e1', cursor: 'pointer', marginRight: 12,
            }}
          >
            <Menu size={21} />
          </button>

          {/* Seiten-Titel */}
          <span style={{
            flex: 1, fontSize: '17px', fontWeight: 700, color: '#fff',
            letterSpacing: '-0.4px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {pageTitle}
          </span>

          {/* Avatar */}
          {user?.avatar
            ? <img src={user.avatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f97316', flexShrink: 0 }} />
            : <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#f97316,#ea580c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: 'white',
              }}>
                {(user?.username || 'G')[0].toUpperCase()}
              </div>
          }
        </header>

        {/* Seiteninhalt */}
        <div style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{
            padding: '16px',
            paddingBottom: '100px',   /* Platz für BottomNav auf Mobil */
            maxWidth: '1280px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
            /* Desktop: mehr Padding */
            className="page-content"
          >
            <Outlet />
          </div>
        </div>
      </main>

      {/* BottomNav (per CSS nur auf Mobile sichtbar) */}
      <div className="bottom-nav-bar" style={{ display: 'none' }}>
        <BottomNav />
      </div>
    </div>
  );
}
