import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, Euro, FileText, KeyRound, Calendar, User, LogOut, Home } from 'lucide-react';
import useAuth from '../stores/auth';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/groups', icon: Users, label: 'Gruppen' },
  { to: '/tasks', icon: CheckSquare, label: 'Aufgaben' },
  { to: '/finance', icon: Euro, label: 'Finanzen' },
  { to: '/documents', icon: FileText, label: 'Dokumente' },
  { to: '/vault', icon: KeyRound, label: 'Tresor' },
  { to: '/calendar', icon: Calendar, label: 'Kalender' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-56 flex flex-col bg-bg-sidebar border-r border-border h-screen shrink-0">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Home size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-base">Gino-Home</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-bg-hover'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
              isActive ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-bg-hover'
            }`
          }
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
              <User size={13} className="text-orange-400" />
            </div>
          )}
          <span className="truncate">{user?.username || 'Profil'}</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={18} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
