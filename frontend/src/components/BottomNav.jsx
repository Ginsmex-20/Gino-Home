import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Euro, Calendar, Users,
  FileText, KeyRound, User
} from 'lucide-react';

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Home',     exact: true },
  { to: '/tasks',     icon: CheckSquare,     label: 'Aufgaben' },
  { to: '/finance',   icon: Euro,            label: 'Finanzen' },
  { to: '/calendar',  icon: Calendar,        label: 'Kalender' },
  { to: '/groups',    icon: Users,           label: 'Gruppen'  },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-bottom">
      {/* Blur + border */}
      <div className="bg-[#111111]/95 backdrop-blur-md border-t border-[#1e1e1e]">
        <div className="flex items-center justify-around px-1 py-1.5">
          {NAV.map(({ to, icon: Icon, label, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-orange-500 shadow-lg shadow-orange-500/30' : ''}`}>
                  <Icon size={20} className={active ? 'text-white' : 'text-slate-500'} />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-orange-400' : 'text-slate-600'}`}>
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
