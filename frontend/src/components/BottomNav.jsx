import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Euro, Calendar, Users
} from 'lucide-react';

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Home',     exact: true },
  { to: '/tasks',    icon: CheckSquare,     label: 'Aufgaben' },
  { to: '/finance',  icon: Euro,            label: 'Finanzen' },
  { to: '/calendar', icon: Calendar,        label: 'Kalender' },
  { to: '/groups',   icon: Users,           label: 'Gruppen'  },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 35,
      background: 'rgba(17,17,17,0.97)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid #1e1e1e',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '6px 4px 8px',
      }}>
        {NAV.map(({ to, icon: Icon, label, exact }) => {
          const active = exact
            ? location.pathname === to
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '6px 12px',
                borderRadius: '12px',
                transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? '#f97316' : 'transparent',
                  boxShadow: active ? '0 4px 12px rgba(249,115,22,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  <Icon size={20} color={active ? '#ffffff' : '#64748b'} />
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  color: active ? '#f97316' : '#64748b',
                  transition: 'color 0.15s',
                }}>
                  {label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
