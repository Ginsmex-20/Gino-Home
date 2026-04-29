import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Users, TrendingUp, TrendingDown, Calendar, Clock, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import api from '../api/client';
import useAuth from '../stores/auth';

const STATUS_COLOR = { todo: '#94a3b8', in_progress: '#f59e0b', done: '#22c55e', blocked: '#ef4444' };
const STATUS_BG    = { todo: 'rgba(148,163,184,.12)', in_progress: 'rgba(245,158,11,.15)', done: 'rgba(34,197,94,.15)', blocked: 'rgba(239,68,68,.15)' };
const STATUS_LABEL = { todo: 'To-do', in_progress: 'In Arbeit', done: 'Erledigt', blocked: 'Blockiert' };

const STAT_CARDS = [
  { key: 'tasks',   icon: CheckSquare,  label: 'Offene Aufgaben', iconColor: '#f97316', bg: 'rgba(249,115,22,.15)', to: '/tasks' },
  { key: 'groups',  icon: Users,        label: 'Gruppen',         iconColor: '#3b82f6', bg: 'rgba(59,130,246,.15)', to: '/groups' },
  { key: 'income',  icon: TrendingUp,   label: 'Einnahmen',       iconColor: '#22c55e', bg: 'rgba(34,197,94,.15)',  to: '/finance' },
  { key: 'expense', icon: TrendingDown, label: 'Ausgaben',        iconColor: '#ef4444', bg: 'rgba(239,68,68,.15)',  to: '/finance' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: tasks   = [] } = useQuery({ queryKey: ['tasks'],           queryFn: () => api.get('/tasks') });
  const { data: groups  = [] } = useQuery({ queryKey: ['groups'],          queryFn: () => api.get('/groups') });
  const { data: summary }      = useQuery({ queryKey: ['finance-summary'], queryFn: () => api.get('/finance/summary') });
  const { data: events  = [] } = useQuery({ queryKey: ['calendar-upcoming'], queryFn: () => api.get(`/calendar?from=${new Date().toISOString()}`) });

  const openTasks = tasks.filter(t => t.status !== 'done');

  const statValues = {
    tasks:   openTasks.length,
    groups:  groups.length,
    income:  `${(summary?.income  || 0).toFixed(2)} €`,
    expense: `${(summary?.expense || 0).toFixed(2)} €`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Begrüßung (Desktop) ──────────────────────────────────── */}
      <div className="hidden md:block">
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
          Guten Tag, {user?.username}! 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
        </p>
      </div>

      {/* ── Stat-Karten ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
      }}>
        {STAT_CARDS.map(({ key, icon: Icon, label, iconColor, bg, to }) => (
          <Link key={key} to={to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '16px',
              transition: 'transform 0.15s, border-color 0.15s',
              cursor: 'pointer',
            }}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '12px',
              }}>
                <Icon size={20} color={iconColor} />
              </div>
              <p style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: '0 0 4px 0', lineHeight: 1 }}>
                {statValues[key]}
              </p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Aktuelle Aufgaben ───────────────────────────────────── */}
      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={16} color="#f97316" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Aufgaben</span>
          </div>
          <Link to="/tasks" style={{ fontSize: '13px', color: '#f97316', textDecoration: 'none' }}>Alle →</Link>
        </div>
        {openTasks.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '14px', padding: '20px 16px' }}>
            Keine offenen Aufgaben 🎉
          </p>
        ) : (
          <div>
            {openTasks.slice(0, 5).map(task => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{
                  padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                  background: STATUS_BG[task.status], color: STATUS_COLOR[task.status], flexShrink: 0,
                }}>
                  {STATUS_LABEL[task.status]}
                </span>
                <span style={{ fontSize: '14px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </span>
                {task.due_date && (
                  <span style={{ fontSize: '12px', color: '#64748b', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />{format(new Date(task.due_date), 'd. MMM', { locale: de })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Kommende Termine ─────────────────────────────────────── */}
      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#f97316" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Termine</span>
          </div>
          <Link to="/calendar" style={{ fontSize: '13px', color: '#f97316', textDecoration: 'none' }}>Kalender →</Link>
        </div>
        {events.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '14px', padding: '20px 16px' }}>
            Keine bevorstehenden Termine
          </p>
        ) : (
          <div>
            {events.slice(0, 4).map(event => (
              <div key={event.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: event.color, flexShrink: 0 }} />
                <span style={{ fontSize: '14px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.title}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', flexShrink: 0 }}>
                  {format(new Date(event.start_date), 'd. MMM', { locale: de })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Finanzen ─────────────────────────────────────────────── */}
      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Euro size={16} color="#f97316" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Finanzen</span>
          </div>
          <Link to="/finance" style={{ fontSize: '13px', color: '#f97316', textDecoration: 'none' }}>Details →</Link>
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'Bilanz', value: `${(summary?.balance || 0).toFixed(2)} €`, color: (summary?.balance || 0) >= 0 ? '#22c55e' : '#ef4444' },
            { label: 'Verträge/Monat', value: `${(summary?.contracts_total || 0).toFixed(0)} €`, color: '#f59e0b' },
            { label: 'Restschuld', value: `${(summary?.loans_remaining || 0).toFixed(0)} €`, color: '#f43f5e' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
            }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{label}</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gruppen ─────────────────────────────────────────────── */}
      {groups.length > 0 && (
        <div style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 16px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#f97316" />
              <span style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Gruppen</span>
            </div>
            <Link to="/groups" style={{ fontSize: '13px', color: '#f97316', textDecoration: 'none' }}>Alle →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {groups.slice(0, 4).map(g => (
              <Link key={g.id} to={`/groups/${g.id}`} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                textDecoration: 'none',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '12px',
                  background: 'rgba(249,115,22,.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '15px', fontWeight: 700, color: '#f97316', flexShrink: 0,
                }}>
                  {g.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>{g.member_count} Mitglieder</p>
                </div>
                <span style={{ color: '#374151', fontSize: '18px' }}>›</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
