import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, RefreshCw, Sparkles } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { SocketManager, NotificationPanel, ToastContainer, NotificationBell } from './Notifications';
import useAuth from '../stores/auth';
import useUpdate from '../stores/update';
import api from '../api/client';

/* ── Seiten-Titel ────────────────────────────────────────────────── */
function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname === '/')                  return 'Dashboard';
  if (pathname.startsWith('/tasks'))     return 'Aufgaben';
  if (pathname.startsWith('/finance'))   return 'Finanzen';
  if (pathname.startsWith('/documents')) return 'Dokumente';
  if (pathname.startsWith('/vault'))     return 'Tresor';
  if (pathname.startsWith('/calendar'))  return 'Kalender';
  if (pathname.startsWith('/groceries')) return 'Einkäufe';
  if (pathname.startsWith('/groups/'))   return 'Gruppe';
  if (pathname.startsWith('/groups'))    return 'Gruppen';
  if (pathname.startsWith('/profile'))   return 'Profil';
  if (pathname.startsWith('/updates'))   return 'Updates';
  if (pathname.startsWith('/vertraege')) return 'Verträge';
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

/* ── Update-Banner ───────────────────────────────────────────────── */
function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [info, setInfo] = useState(null);
  const deployedRef = useRef(null);
  const { setUpdate, clearUpdate } = useUpdate();

  useEffect(() => {
    const check = async () => {
      try {
        const data = await api.get('/version');
        if (!deployedRef.current) {
          deployedRef.current = data.deployedAt;
        } else if (deployedRef.current !== data.deployedAt) {
          setInfo(data);
          setShow(true);
          setUpdate(data);
        }
      } catch {}
    };
    check();
    const interval = setInterval(check, 30 * 1000); // alle 30 Sek prüfen
    window.addEventListener('socket:reconnect', check);
    return () => {
      clearInterval(interval);
      window.removeEventListener('socket:reconnect', check);
    };
  }, [setUpdate]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(90deg, #1a0800, #2d1200, #1a0800)',
      borderBottom: '1px solid rgba(249,115,22,0.4)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: '0 2px 20px rgba(249,115,22,0.2)',
    }}>
      <Sparkles size={15} color="#f97316" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '13px', color: '#e2e8f0' }}>
        <span style={{ color: '#f97316', fontWeight: 700 }}>
          Gino-Home {info?.version}
        </span>
        {' '}ist verfügbar —{' '}
        <span style={{ color: '#94a3b8' }}>
          {info?.changelog?.[0]?.title}
        </span>
      </span>
      <button
        onClick={() => window.location.reload()}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', background: '#f97316', color: '#fff',
          border: 'none', borderRadius: '8px', fontSize: '12px',
          fontWeight: 600, cursor: 'pointer', flexShrink: 0,
        }}>
        <RefreshCw size={12} /> Jetzt aktualisieren
      </button>
      <button onClick={() => { setShow(false); clearUpdate(); }}
        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', flexShrink: 0, fontSize: '16px', lineHeight: 1 }}>
        ✕
      </button>
    </div>
  );
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
      <UpdateBanner />
      <SocketManager />
      <NotificationPanel />
      <ToastContainer />

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
            /* Safe-area-inset-top schiebt Inhalt unter Dynamic Island / Notch.
               Auf Geraeten ohne Insel (z.B. iPhone SE, Android, Desktop)
               ist env(safe-area-inset-top) = 0 und der Header bleibt 56px hoch. */
            padding: '0 16px',
            paddingTop: 'env(safe-area-inset-top)',
            height: 'calc(56px + env(safe-area-inset-top))',
            boxSizing: 'border-box',
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

          {/* Glocke */}
          <NotificationBell style={{ marginRight: '4px' }} />

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
