import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Euro, Calendar, Menu } from 'lucide-react';

const TABS = [
  { to: '/',         icon: LayoutDashboard, label: 'Home',     exact: true  },
  { to: '/tasks',    icon: CheckSquare,     label: 'Aufgaben', exact: false },
  { to: '/finance',  icon: Euro,            label: 'Finanzen', exact: false },
  { to: '/calendar', icon: Calendar,        label: 'Kalender', exact: false },
  { to: '/mehr',     icon: Menu,            label: 'Mehr',     exact: false },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 35,
      background: 'rgba(14,14,16,0.78)',
      backdropFilter: 'blur(24px) saturate(160%)',
      WebkitBackdropFilter: 'blur(24px) saturate(160%)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 -8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      paddingBottom: 'env(safe-area-inset-bottom, 8px)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-around',
        padding: '8px 4px 4px',
      }}>
        {TABS.map(({ to, icon: Icon, label, exact }) => {
          const active = exact ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <button key={to} onClick={() => navigate(to)} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '4px', padding: '4px 2px',
              background: 'none', border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}>
              <div style={{
                width: 50, height: 32, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'rgba(249,115,22,0.2)' : 'transparent',
                transition: 'background 0.2s',
              }}>
                <Icon size={22} color={active ? '#f97316' : '#6b7280'} strokeWidth={active ? 2.2 : 1.8} />
              </div>
              <span style={{
                fontSize: '10px', fontWeight: active ? 600 : 400,
                color: active ? '#f97316' : '#6b7280',
                letterSpacing: '0.01em',
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
