import { useState } from 'react';
import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, CheckSquare, Euro, FileText,
  KeyRound, Calendar, User, LogOut, Home, Briefcase, Star,
  ChevronDown, ChevronRight, Plus
} from 'lucide-react';
import useAuth from '../stores/auth';
import api from '../api/client';

// ── Persönliche Navigation ───────────────────────────────────────────────────
const personalNav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/tasks',     icon: CheckSquare,     label: 'Aufgaben' },
  { to: '/finance',   icon: Euro,            label: 'Finanzen' },
  { to: '/documents', icon: FileText,        label: 'Dokumente' },
  { to: '/vault',     icon: KeyRound,        label: 'Tresor' },
  { to: '/calendar',  icon: Calendar,        label: 'Kalender' },
];

// Gruppen-Sub-Navigation
const groupSubNav = [
  { tab: 'tasks',     icon: CheckSquare, label: 'Aufgaben' },
  { tab: 'documents', icon: FileText,    label: 'Dokumente' },
  { tab: 'calendar',  icon: Calendar,    label: 'Kalender' },
  { tab: 'members',   icon: Users,       label: 'Mitglieder' },
];

const typeIcons = { household: Home, work: Briefcase, general: Star };
const typeDot   = { household: 'bg-green-400', work: 'bg-blue-400', general: 'bg-orange-400' };

// ── Gruppen-Abschnitt ────────────────────────────────────────────────────────
function GroupsSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId: activeGroupId } = useParams();
  const [expanded, setExpanded] = useState(() => {
    // Aktive Gruppe automatisch ausklappen
    if (activeGroupId) return { [activeGroupId]: true };
    return {};
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups')
  });

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));
  const isGroupActive = (id) => location.pathname.startsWith(`/groups/${id}`);

  return (
    <div className="mt-1">
      {/* Gruppen-Header */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-0.5">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Gruppen</span>
        <button onClick={() => navigate('/groups')}
          className="p-0.5 rounded text-slate-600 hover:text-orange-500 transition-colors" title="Neue Gruppe">
          <Plus size={12} />
        </button>
      </div>

      {groups.length === 0 && (
        <button onClick={() => navigate('/groups')}
          className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors rounded-lg">
          + Gruppe erstellen
        </button>
      )}

      {groups.map(g => {
        const Icon = typeIcons[g.type] || Star;
        const isOpen = expanded[g.id];
        const isActive = isGroupActive(g.id);

        return (
          <div key={g.id}>
            {/* Gruppen-Zeile */}
            <button
              onClick={() => {
                toggle(g.id);
                if (!isOpen) navigate(`/groups/${g.id}`);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-slate-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              {/* Typ-Farb-Punkt */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${typeDot[g.type] || 'bg-orange-400'}`} />
              <span className="flex-1 text-left truncate">{g.name}</span>
              {isOpen
                ? <ChevronDown size={13} className="shrink-0 text-slate-600" />
                : <ChevronRight size={13} className="shrink-0 text-slate-600" />
              }
            </button>

            {/* Sub-Navigation */}
            {isOpen && (
              <div className="ml-5 pl-2 border-l border-[#2a2a2a] space-y-0.5 mb-1">
                {groupSubNav.map(({ tab, icon: SubIcon, label }) => {
                  const path = `/groups/${g.id}/${tab}`;
                  const isTabActive = location.pathname === path || (tab === 'members' && location.pathname === `/groups/${g.id}`);
                  return (
                    <NavLink key={tab} to={path}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isTabActive
                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                          : 'text-slate-500 hover:text-white hover:bg-[#2a2a2a]'
                      }`}>
                      <SubIcon size={13} />{label}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Haupt-Sidebar ────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="hidden md:flex w-56 flex-col bg-[#111111] border-r border-[#1e1e1e] h-screen shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Home size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-base">Gino-Home</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">

        {/* Persönlich-Label */}
        <div className="px-3 py-1.5 mb-0.5">
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Persönlich</span>
        </div>

        {/* Persönliche Nav-Links */}
        {personalNav.map(({ to, icon: Icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#2a2a2a]'
              }`
            }>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        {/* Gruppen Separator */}
        <div className="my-2 border-t border-[#1e1e1e]" />

        {/* Gruppen mit Dropdown */}
        <GroupsSection />
      </nav>

      {/* Footer: Profil + Logout */}
      <div className="p-3 border-t border-[#1e1e1e]">
        <NavLink to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
              isActive ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2a2a]'
            }`
          }>
          {user?.avatar
            ? <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
            : <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                <User size={13} className="text-orange-400" />
              </div>
          }
          <span className="truncate">{user?.username || 'Profil'}</span>
        </NavLink>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={17} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
