import { useState } from 'react';
import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, CheckSquare, Euro, FileText,
  KeyRound, Calendar, User, LogOut, Home, Briefcase, Star,
  ChevronDown, ChevronRight, Plus, X
} from 'lucide-react';
import useAuth from '../stores/auth';
import api from '../api/client';

// ── Persönliche Navigation ────────────────────────────────────────────────────
const personalNav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/tasks',     icon: CheckSquare,     label: 'Aufgaben' },
  { to: '/finance',   icon: Euro,            label: 'Finanzen' },
  { to: '/documents', icon: FileText,        label: 'Dokumente' },
  { to: '/vault',     icon: KeyRound,        label: 'Tresor' },
  { to: '/calendar',  icon: Calendar,        label: 'Kalender' },
];

const groupSubNav = [
  { tab: 'tasks',     icon: CheckSquare, label: 'Aufgaben' },
  { tab: 'documents', icon: FileText,    label: 'Dokumente' },
  { tab: 'calendar',  icon: Calendar,    label: 'Kalender' },
  { tab: 'members',   icon: Users,       label: 'Mitglieder' },
];

const typeIcons = { household: Home, work: Briefcase, general: Star };
const typeDot   = { household: 'bg-green-400', work: 'bg-blue-400', general: 'bg-orange-400' };

// ── Gruppen-Abschnitt ─────────────────────────────────────────────────────────
function GroupsSection({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId: activeGroupId } = useParams();
  const [expanded, setExpanded] = useState(() =>
    activeGroupId ? { [activeGroupId]: true } : {}
  );

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups'),
  });

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));
  const isGroupActive = (id) => location.pathname.startsWith(`/groups/${id}`);

  const handleNav = (path) => {
    navigate(path);
    onClose?.();
  };

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between px-3 py-1.5 mb-0.5">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Gruppen</span>
        <button onClick={() => handleNav('/groups')}
          className="p-0.5 rounded text-slate-600 hover:text-orange-500 transition-colors" title="Neue Gruppe">
          <Plus size={12} />
        </button>
      </div>

      {groups.length === 0 && (
        <button onClick={() => handleNav('/groups')}
          className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors rounded-lg">
          + Gruppe erstellen
        </button>
      )}

      {groups.map(g => {
        const isOpen   = expanded[g.id];
        const isActive = isGroupActive(g.id);

        return (
          <div key={g.id}>
            <button
              onClick={() => {
                toggle(g.id);
                if (!isOpen) handleNav(`/groups/${g.id}`);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-slate-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${typeDot[g.type] || 'bg-orange-400'}`} />
              <span className="flex-1 text-left truncate">{g.name}</span>
              {isOpen
                ? <ChevronDown size={13} className="shrink-0 text-slate-600" />
                : <ChevronRight size={13} className="shrink-0 text-slate-600" />
              }
            </button>

            {isOpen && (
              <div className="ml-5 pl-2 border-l border-[#2a2a2a] space-y-0.5 mb-1">
                {groupSubNav.map(({ tab, icon: SubIcon, label }) => {
                  const path = `/groups/${g.id}/${tab}`;
                  const isTabActive =
                    location.pathname === path ||
                    (tab === 'members' && location.pathname === `/groups/${g.id}`);
                  return (
                    <NavLink
                      key={tab} to={path}
                      onClick={() => onClose?.()}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isTabActive
                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                          : 'text-slate-500 hover:text-white hover:bg-[#2a2a2a]'
                      }`}
                    >
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

// ── Haupt-Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar({ onClose, isMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleNavClick = () => { onClose?.(); };

  return (
    <aside style={{
      width: '224px',
      display: 'flex',
      flexDirection: 'column',
      background: '#111111',
      borderRight: '1px solid #1e1e1e',
      height: '100%',
      flexShrink: 0,
      overflowY: 'auto',
    }}>
      {/* Logo + X-Button (Mobil) */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#f97316',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(249,115,22,0.35)',
          }}>
            <Home size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, color: 'white', fontSize: '15px', letterSpacing: '-0.3px' }}>
            Gino-Home
          </span>
        </div>

        {/* Schließen-Button nur auf Mobil */}
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              padding: '6px', borderRadius: '8px',
              color: '#94a3b8', background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>

        {/* Persönlich-Label */}
        <div style={{ padding: '6px 12px', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Persönlich
          </span>
        </div>

        {personalNav.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to} to={to} end={exact}
            onClick={handleNavClick}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 500,
              textDecoration: 'none',
              marginBottom: '2px',
              transition: 'all 0.15s',
              background: isActive ? '#f97316' : 'transparent',
              color: isActive ? '#ffffff' : '#94a3b8',
              boxShadow: isActive ? '0 4px 12px rgba(249,115,22,0.25)' : 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} color={isActive ? '#ffffff' : '#94a3b8'} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* Separator */}
        <div style={{ borderTop: '1px solid #1e1e1e', margin: '8px 0' }} />

        {/* Gruppen */}
        <GroupsSection onClose={onClose} />
      </nav>

      {/* Footer: Profil + Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid #1e1e1e', flexShrink: 0 }}>
        <NavLink
          to="/profile"
          onClick={handleNavClick}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 12px', borderRadius: '12px',
            fontSize: '14px', fontWeight: 500,
            textDecoration: 'none', marginBottom: '4px',
            background: isActive ? '#f97316' : 'transparent',
            color: isActive ? '#ffffff' : '#94a3b8',
            transition: 'all 0.15s',
          })}
        >
          {({ isActive }) => (
            <>
              {user?.avatar
                ? <img src={user.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#f97316' + '33',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <User size={13} color={isActive ? '#ffffff' : '#fb923c'} />
                  </div>
              }
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: isActive ? '#ffffff' : '#94a3b8',
              }}>
                {user?.username || 'Profil'}
              </span>
            </>
          )}
        </NavLink>

        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 12px', borderRadius: '12px',
            fontSize: '14px', fontWeight: 500,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#94a3b8', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={17} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
