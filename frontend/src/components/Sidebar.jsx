import { useState } from 'react';
import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, CheckSquare, Euro, FileText,
  KeyRound, Calendar, User, LogOut, Home, Briefcase, Star,
  ChevronDown, ChevronRight, Plus, X, PanelLeftClose, PanelLeftOpen, ShoppingCart, Hash, BookOpen, ReceiptText,
  Zap,
} from 'lucide-react';
import useAuth from '../stores/auth';
import api from '../api/client';
import { NotificationBell } from './Notifications';
import useNotifications from '../stores/notifications';
import useUpdate from '../stores/update';

const personalNav = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',  exact: true },
  { to: '/tasks',      icon: CheckSquare,     label: 'Aufgaben'               },
  { to: '/finance',    icon: Euro,            label: 'Finanzen'               },
  { to: '/vertraege',  icon: ReceiptText,     label: 'Verträge'               },
  { to: '/groceries',  icon: ShoppingCart,    label: 'Einkäufe'              },
  { to: '/documents',  icon: FileText,        label: 'Dokumente'              },
  { to: '/vault',      icon: KeyRound,        label: 'Tresor'                 },
  { to: '/calendar',   icon: Calendar,        label: 'Kalender'               },
  { to: '/notizen',    icon: BookOpen,        label: 'Notizbuch'              },
];

const groupSubNav = [
  { tab: 'tasks',     icon: CheckSquare, label: 'Aufgaben'  },
  { tab: 'chat',      icon: Hash,        label: 'Chat'      },
  { tab: 'notizen',  icon: BookOpen,    label: 'Notizbuch' },
  { tab: 'documents', icon: FileText,    label: 'Dokumente' },
  { tab: 'calendar',  icon: Calendar,    label: 'Kalender'  },
  { tab: 'members',   icon: Users,       label: 'Mitglieder'},
];

const typeDot = { household: '#4ade80', work: '#60a5fa', general: '#f97316' };

/* ── Gruppen-Abschnitt ──────────────────────────────────────────── */
function GroupsSection({ onClose, collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId: activeGroupId } = useParams();
  const [expanded, setExpanded] = useState(() =>
    activeGroupId ? { [activeGroupId]: true } : {}
  );

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => api.get('/groups'),
  });

  const toggle   = id   => setExpanded(e => ({ ...e, [id]: !e[id] }));
  const isActive = id   => location.pathname.startsWith(`/groups/${id}`);
  const go       = path => { navigate(path); onClose?.(); };

  /* Eingeklappt: nur farbige Punkte */
  if (collapsed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', padding: '8px 0' }}>
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => go(`/groups/${g.id}`)}
            title={g.name}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: isActive(g.id) ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${typeDot[g.type] || '#f97316'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
              fontSize: '12px', fontWeight: 700,
            }}
          >
            {g.name[0].toUpperCase()}
          </button>
        ))}
        <button
          onClick={() => go('/groups')}
          title="Neue Gruppe"
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(249,115,22,0.1)',
            border: '1px dashed rgba(249,115,22,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#f97316',
          }}
        >
          <Plus size={13} />
        </button>
      </div>
    );
  }

  /* Ausgeklappt: vollständige Navigation */
  return (
    <div style={{ marginTop: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px 4px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Gruppen
        </span>
        <button onClick={() => go('/groups')} title="Neue Gruppe" style={{
          padding: '2px', background: 'none', border: 'none', cursor: 'pointer', color: '#475569',
          display: 'flex', borderRadius: '4px',
        }}>
          <Plus size={12} />
        </button>
      </div>

      {groups.length === 0 && (
        <button onClick={() => go('/groups')} style={{
          width: '100%', textAlign: 'left', padding: '8px 12px',
          fontSize: '12px', color: '#475569', background: 'none', border: 'none',
          cursor: 'pointer', borderRadius: '8px',
        }}>
          + Gruppe erstellen
        </button>
      )}

      {groups.map(g => {
        const isOpen   = expanded[g.id];
        const active   = isActive(g.id);
        const dot      = typeDot[g.type] || '#f97316';

        return (
          <div key={g.id}>
            <button
              onClick={() => { toggle(g.id); if (!isOpen) go(`/groups/${g.id}`); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '12px',
                fontSize: '14px', fontWeight: 500,
                background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                color: active ? '#f97316' : '#94a3b8',
                border: 'none', cursor: 'pointer',
                marginBottom: '2px', transition: 'background 0.15s',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {g.name}
              </span>
              {isOpen
                ? <ChevronDown size={13} color="#475569" style={{ flexShrink: 0 }} />
                : <ChevronRight size={13} color="#475569" style={{ flexShrink: 0 }} />
              }
            </button>

            {isOpen && (
              <div style={{ marginLeft: '20px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.07)', marginBottom: '4px' }}>
                {groupSubNav.map(({ tab, icon: SubIcon, label }) => {
                  const path      = `/groups/${g.id}/${tab}`;
                  const tabActive = location.pathname === path ||
                    (tab === 'members' && location.pathname === `/groups/${g.id}`);
                  return (
                    <NavLink
                      key={tab} to={path}
                      onClick={() => onClose?.()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '7px 10px', borderRadius: '10px',
                        fontSize: '12px', fontWeight: 500, textDecoration: 'none',
                        marginBottom: '2px', transition: 'all 0.15s',
                        background: tabActive ? '#f97316' : 'transparent',
                        color: tabActive ? '#fff' : '#64748b',
                      }}
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

/* ── Haupt-Sidebar ──────────────────────────────────────────────── */
export default function Sidebar({ onClose, isMobile, collapsed = false, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const { togglePanel } = useNotifications();
  const { hasUpdate } = useUpdate();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  const W = collapsed ? '64px' : '224px';

  return (
    <aside style={{
      width: W,
      minWidth: W,
      display: 'flex',
      flexDirection: 'column',
      background: '#111111',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      height: '100%',
      flexShrink: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
    }}>

      {/* ── Logo + Collapse-Toggle ───────────────────────────────── */}
      <div style={{
        padding: collapsed ? '16px 0' : '14px 16px',
        /* iOS Mobile: zusaetzlicher Abstand fuer Dynamic Island / Notch */
        paddingTop: isMobile
          ? `calc(14px + env(safe-area-inset-top))`
          : (collapsed ? '16px' : '14px'),
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        flexShrink: 0,
        gap: '10px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: '#f97316', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
          }}>
            <Home size={16} color="white" />
          </div>
          {/* Text nur wenn nicht collapsed und nicht mobile-close-only */}
          {!collapsed && (
            <span style={{ fontWeight: 700, color: 'white', fontSize: '15px', whiteSpace: 'nowrap' }}>
              Gino-Home
            </span>
          )}
        </div>

        {/* Mobil: X-Button | Desktop: Collapse-Toggle */}
        {isMobile && onClose ? (
          <button onClick={onClose} style={{
            padding: '6px', borderRadius: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', display: 'flex', flexShrink: 0,
          }}>
            <X size={18} />
          </button>
        ) : !isMobile && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
            style={{
              padding: '6px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: 'none',
              cursor: 'pointer', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f97316'; e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            {collapsed
              ? <PanelLeftOpen size={16} />
              : <PanelLeftClose size={16} />
            }
          </button>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: collapsed ? '12px 8px' : '12px', overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Abschnitt-Label */}
        {!collapsed && (
          <div style={{ padding: '4px 12px 6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Persönlich
            </span>
          </div>
        )}
        {collapsed && <div style={{ height: '8px' }} />}

        {/* Nav-Links */}
        {personalNav.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to} to={to} end={exact}
            onClick={() => onClose?.()}
            title={collapsed ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : '12px',
              padding: collapsed ? '0' : '10px 12px',
              width: collapsed ? '100%' : undefined,
              height: collapsed ? '44px' : undefined,
              borderRadius: '12px',
              fontSize: '14px', fontWeight: 500,
              textDecoration: 'none',
              marginBottom: '4px',
              transition: 'background 0.15s',
              background: isActive ? (collapsed ? 'rgba(249,115,22,0.2)' : '#f97316') : 'transparent',
              color: isActive ? (collapsed ? '#f97316' : '#fff') : '#64748b',
              boxShadow: isActive && !collapsed ? '0 4px 12px rgba(249,115,22,0.25)' : 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} color={isActive ? (collapsed ? '#f97316' : '#fff') : '#64748b'} />
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
              </>
            )}
          </NavLink>
        ))}

        {/* Separator + Gruppen */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: collapsed ? '8px 0' : '8px 0' }} />

        {!collapsed && (
          <div style={{ padding: '0 12px 4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Gruppen
            </span>
          </div>
        )}

        <GroupsSection onClose={onClose} collapsed={collapsed} />
      </nav>

      {/* ── Footer: Benachrichtigung + Profil + Logout ───────────── */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {/* Benachrichtigungs-Glocke */}
        <button
          onClick={togglePanel}
          title={collapsed ? 'Benachrichtigungen' : undefined}
          style={{
            display: 'flex', alignItems: 'center', width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '10px 12px',
            height: collapsed ? '44px' : undefined,
            borderRadius: '12px', background: 'transparent', border: 'none',
            cursor: 'pointer', gap: collapsed ? 0 : '10px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <NotificationBell noClick />
          {!collapsed && <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>Benachrichtigungen</span>}
        </button>
        {/* Updates */}
        <NavLink
          to="/updates"
          onClick={() => onClose?.()}
          title={collapsed ? 'Updates' : undefined}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : '12px',
            padding: collapsed ? '0' : '10px 12px',
            height: collapsed ? '44px' : undefined,
            borderRadius: '12px',
            fontSize: '14px', fontWeight: 500,
            textDecoration: 'none',
            transition: 'background 0.15s',
            background: isActive ? (collapsed ? 'rgba(249,115,22,0.2)' : '#f97316') : 'transparent',
            color: isActive ? (collapsed ? '#f97316' : '#fff') : (hasUpdate ? '#22c55e' : '#64748b'),
          })}
        >
          {({ isActive }) => (
            <>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap size={18} color={isActive ? (collapsed ? '#f97316' : '#fff') : (hasUpdate ? '#22c55e' : '#64748b')} />
                {hasUpdate && !isActive && (
                  <span className="update-dot" style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#22c55e',
                  }} />
                )}
              </div>
              {!collapsed && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Updates
                  {hasUpdate && !isActive && (
                    <span className="update-dot" style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#22c55e', flexShrink: 0, display: 'inline-block',
                    }} />
                  )}
                </span>
              )}
            </>
          )}
        </NavLink>

        <NavLink
          to="/profile"
          onClick={() => onClose?.()}
          title={collapsed ? 'Profil' : undefined}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : '12px',
            padding: collapsed ? '0' : '10px 12px',
            height: collapsed ? '44px' : undefined,
            borderRadius: '12px',
            fontSize: '14px', fontWeight: 500,
            textDecoration: 'none',
            transition: 'background 0.15s',
            background: isActive ? (collapsed ? 'rgba(249,115,22,0.2)' : '#f97316') : 'transparent',
            color: isActive ? (collapsed ? '#f97316' : '#fff') : '#64748b',
          })}
        >
          {({ isActive }) => (
            <>
              {user?.avatar
                ? <img src={user.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(249,115,22,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <User size={13} color={isActive ? '#f97316' : '#94a3b8'} />
                  </div>
              }
              {!collapsed && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? '#fff' : '#64748b' }}>
                  {user?.username || 'Profil'}
                </span>
              )}
            </>
          )}
        </NavLink>

        <button
          onClick={handleLogout}
          title={collapsed ? 'Abmelden' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : '12px',
            padding: collapsed ? '0' : '10px 12px',
            height: collapsed ? '44px' : undefined,
            width: '100%',
            borderRadius: '12px',
            fontSize: '14px', fontWeight: 500,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#64748b', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={18} color="currentColor" />
          {!collapsed && <span>Abmelden</span>}
        </button>
      </div>
    </aside>
  );
}
