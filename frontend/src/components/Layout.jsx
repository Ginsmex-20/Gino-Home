import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import useAuth from '../stores/auth';

/* ── Mobile-Erkennung ────────────────────────────────────────────── */
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

/* ── Seiten-Titel aus URL ────────────────────────────────────────── */
function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname === '/')                  return 'Dashboard';
  if (pathname.startsWith('/tasks'))     return 'Aufgaben';
  if (pathname.startsWith('/finance'))   return 'Finanzen';
  if (pathname.startsWith('/documents')) return 'Dokumente';
  if (pathname.startsWith('/vault'))     return 'Tresor';
  if (pathname.startsWith('/calendar'))  return 'Kalender';
  if (pathname.startsWith('/groups/'))   return '';
  if (pathname.startsWith('/groups'))    return 'Gruppen';
  if (pathname.startsWith('/profile'))   return 'Profil';
  return 'Gino-Home';
}

export default function Layout() {
  const isMobile        = useIsMobile();
  const [open, setOpen] = useState(false);
  const pageTitle       = usePageTitle();
  const { user }        = useAuth();

  /* ── Desktop Sidebar collapsed-State (localStorage) ─────────── */
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; }
    catch { return false; }
  });
  const toggleCollapsed = useCallback(() => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  const openSidebar  = useCallback(() => setOpen(true),  []);
  const closeSidebar = useCallback(() => setOpen(false), []);

  useEffect(() => { if (!isMobile) setOpen(false); }, [isMobile]);
  useEffect(() => {
    document.body.style.overflow = (isMobile && open) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, open]);

  const { pathname } = useLocation();
  useEffect(() => { if (isMobile) setOpen(false); }, [pathname]);

  return (
    <div style={{
      display: 'flex', height: '100dvh', overflow: 'hidden',
      backgroundColor: '#0f0f0f',
    }}>

      {/* ── Desktop Sidebar (einklappbar) ────────────────────────── */}
      {!isMobile && (
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      )}

      {/* ── Mobil: Overlay-Sidebar ──────────────────────────────── */}
      {isMobile && (
        <>
          <div onClick={closeSidebar} style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            opacity: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
            transition: 'opacity 0.25s ease',
          }} />
          <div style={{
            position: 'fixed', top: 0, left: 0, height: '100%',
            zIndex: 50, willChange: 'transform',
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
            boxShadow: open ? '8px 0 40px rgba(0,0,0,0.6)' : 'none',
          }}>
            <Sidebar onClose={closeSidebar} isMobile />
          </div>
        </>
      )}

      {/* ── Hauptbereich ────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Mobiler App-Header */}
        {isMobile && (
          <header style={{
            flexShrink: 0, zIndex: 30,
            display: 'flex', alignItems: 'center',
            padding: '0 16px', height: '56px',
            background: 'rgba(15,15,15,0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button onClick={openSidebar} style={{
              width: 40, height: 40, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.07)', border: 'none',
              color: '#e2e8f0', cursor: 'pointer', marginRight: 12, flexShrink: 0,
            }}>
              <Menu size={20} />
            </button>
            <span style={{
              flex: 1, fontSize: '17px', fontWeight: 700,
              color: '#fff', letterSpacing: '-0.4px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {pageTitle || 'Gino-Home'}
            </span>
            <div style={{ marginLeft: 8, flexShrink: 0 }}>
              {user?.avatar
                ? <img src={user.avatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f97316' }} />
                : <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#f97316,#ea580c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, color: 'white',
                  }}>
                    {(user?.username || 'G')[0].toUpperCase()}
                  </div>
              }
            </div>
          </header>
        )}

        {/* Seiteninhalt */}
        <div style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{
            padding: isMobile ? '16px' : '24px',
            paddingBottom: isMobile ? '100px' : '24px',
            maxWidth: '1280px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <Outlet />
          </div>
        </div>
      </main>

      {isMobile && <BottomNav />}
    </div>
  );
}
