import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare, Users, TrendingUp, TrendingDown, Calendar,
  Clock, Euro, ArrowRight, FileText, CreditCard,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import api from '../api/client';
import useAuth from '../stores/auth';

/* ── Tageszeit-Begrüßung ────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Gute Nacht';
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  if (h < 22) return 'Guten Abend';
  return 'Gute Nacht';
}

/* ── Stat-Karte ─────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, bg, to }) {
  const card = (
    <div style={{
      background: '#161616',
      border: '1px solid #232323',
      borderRadius: '20px',
      padding: '18px',
      cursor: to ? 'pointer' : 'default',
      transition: 'border-color 0.15s, transform 0.15s',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { if (to) { e.currentTarget.style.borderColor = color + '50'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#232323'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Subtle glow in top-right corner */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 40, height: 40, borderRadius: '12px', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px',
      }}>
        <Icon size={19} color={color} />
      </div>
      <p style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '0 0 4px', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{label}</p>
    </div>
  );

  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{card}</Link> : card;
}

/* ── Section card ───────────────────────────────────────────────────── */
function Section({ icon: Icon, title, to, toLabel = 'Alle', children, accent = '#f97316' }) {
  return (
    <div style={{ background: '#161616', border: '1px solid #232323', borderRadius: '20px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '8px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={accent} />
          </div>
          <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{title}</span>
        </div>
        {to && (
          <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = accent}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          >
            {toLabel} <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */
function Empty({ label }) {
  return <p style={{ textAlign: 'center', color: '#374151', fontSize: '13px', padding: '24px 16px', margin: 0 }}>{label}</p>;
}

/* ── Divider row ────────────────────────────────────────────────────── */
function Row({ style = {}, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.04)', ...style }}>
      {children}
    </div>
  );
}

/* ── Status pill ────────────────────────────────────────────────────── */
const S_COLOR = { todo: '#94a3b8', in_progress: '#f59e0b', done: '#22c55e', archiv: '#64748b' };
const S_BG    = { todo: 'rgba(148,163,184,.1)', in_progress: 'rgba(245,158,11,.12)', done: 'rgba(34,197,94,.12)', archiv: 'rgba(100,116,139,.1)' };
const S_LABEL = { todo: 'To-do', in_progress: 'In Arbeit', done: 'Erledigt', archiv: 'Archiv' };

/* ── Dashboard ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const { data: tasks    = [] } = useQuery({ queryKey: ['tasks'],            queryFn: () => api.get('/tasks') });
  const { data: groups   = [] } = useQuery({ queryKey: ['groups'],           queryFn: () => api.get('/groups') });
  const { data: summary  }      = useQuery({ queryKey: ['finance-summary'],  queryFn: () => api.get('/finance/summary') });
  const { data: events   = [] } = useQuery({ queryKey: ['calendar-upcoming'], queryFn: () => api.get(`/calendar?from=${new Date().toISOString()}`) });
  const { data: contracts = [] } = useQuery({ queryKey: ['contracts'],       queryFn: () => api.get('/finance/contracts') });

  const openTasks    = tasks.filter(t => t.status !== 'done' && t.status !== 'archiv');
  const urgentCancel = contracts.filter(c => {
    if (!c.cancel_until) return false;
    const d = differenceInDays(parseISO(c.cancel_until), new Date());
    return d >= 0 && d <= 30;
  });

  const today = format(new Date(), "EEEE, d. MMMM yyyy", { locale: de });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Greeting ──────────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ paddingBottom: '4px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          {getGreeting()}, {user?.username}
        </h1>
        <p style={{ color: '#374151', fontSize: '13px', margin: 0 }}>{today}</p>
      </div>

      {/* ── Urgent cancel warning ──────────────────────────────────── */}
      {urgentCancel.length > 0 && (
        <Link to="/vertraege" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '11px 16px', borderRadius: '14px',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#f87171', flex: 1 }}>
              <strong>{urgentCancel.length}</strong> Vertrag{urgentCancel.length > 1 ? 'e' : ''} müssen bald gekündigt werden!
            </span>
            <ArrowRight size={14} color="#f87171" />
          </div>
        </Link>
      )}

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <StatCard icon={CheckSquare}  label="Offene Aufgaben" value={openTasks.length}                                      color="#f97316" bg="rgba(249,115,22,.12)" to="/tasks"    />
        <StatCard icon={Users}         label="Gruppen"          value={groups.length}                                         color="#3b82f6" bg="rgba(59,130,246,.12)"  to="/groups"   />
        <StatCard icon={TrendingUp}    label="Einnahmen"         value={`${(summary?.income  || 0).toFixed(0)} €`}            color="#22c55e" bg="rgba(34,197,94,.12)"   to="/finance"  />
        <StatCard icon={TrendingDown}  label="Ausgaben"          value={`${(summary?.expense || 0).toFixed(0)} €`}            color="#ef4444" bg="rgba(239,68,68,.12)"   to="/finance"  />
      </div>

      {/* ── Tasks ─────────────────────────────────────────────────── */}
      <Section icon={CheckSquare} title="Aufgaben" to="/tasks">
        {openTasks.length === 0 ? <Empty label="Keine offenen Aufgaben" /> : (
          openTasks.slice(0, 5).map(task => (
            <Row key={task.id}>
              <span style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: S_BG[task.status], color: S_COLOR[task.status], flexShrink: 0 }}>
                {S_LABEL[task.status]}
              </span>
              <span style={{ fontSize: '13px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.title}
              </span>
              {task.due_date && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#4b5563', flexShrink: 0 }}>
                  <Clock size={10} />{format(new Date(task.due_date), 'd. MMM', { locale: de })}
                </span>
              )}
            </Row>
          ))
        )}
      </Section>

      {/* ── Finance ───────────────────────────────────────────────── */}
      <Section icon={Euro} title="Finanzen" to="/finance" accent="#22c55e">
        <div style={{ padding: '4px 18px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Bilanz',          value: `${(summary?.balance  || 0).toFixed(2)} €`, color: (summary?.balance || 0) >= 0 ? '#22c55e' : '#ef4444' },
            { label: 'Verträge/Monat',  value: `${(summary?.contracts_total || 0).toFixed(2)} €`, color: '#f97316' },
            { label: 'Restschuld',      value: `${(summary?.loans_remaining  || 0).toFixed(0)} €`, color: '#f43f5e' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '11px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{label}</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Calendar ──────────────────────────────────────────────── */}
      <Section icon={Calendar} title="Termine" to="/calendar" toLabel="Kalender" accent="#60a5fa">
        {events.length === 0 ? <Empty label="Keine bevorstehenden Termine" /> : (
          events.slice(0, 4).map(event => (
            <Row key={event.id}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: event.color || '#f97316', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.title}
              </span>
              <span style={{ fontSize: '11px', color: '#4b5563', flexShrink: 0 }}>
                {format(new Date(event.start_date), 'd. MMM', { locale: de })}
              </span>
            </Row>
          ))
        )}
      </Section>

      {/* ── Verträge quick-view ───────────────────────────────────── */}
      {contracts.filter(c => c.status === 'active').length > 0 && (
        <Section icon={FileText} title="Aktive Verträge" to="/vertraege" accent="#a78bfa">
          {contracts.filter(c => c.status === 'active').slice(0, 3).map(c => (
            <Row key={c.id}>
              <span style={{ fontSize: '13px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.title}
              </span>
              <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 600, flexShrink: 0 }}>
                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
                  c.billing_cycle === 'yearly' ? c.amount / 12 : c.billing_cycle === 'quarterly' ? c.amount / 3 : c.billing_cycle === 'biannual' ? c.amount / 6 : c.amount
                )}/Mo
              </span>
            </Row>
          ))}
        </Section>
      )}

      {/* ── Groups ────────────────────────────────────────────────── */}
      {groups.length > 0 && (
        <Section icon={Users} title="Gruppen" to="/groups" accent="#3b82f6">
          {groups.slice(0, 4).map(g => (
            <Link key={g.id} to={`/groups/${g.id}`} style={{ textDecoration: 'none' }}>
              <Row style={{ transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#3b82f6', flexShrink: 0 }}>
                  {g.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                  <p style={{ fontSize: '11px', color: '#4b5563', margin: 0 }}>{g.member_count} Mitgl.</p>
                </div>
                <ArrowRight size={14} color="#374151" />
              </Row>
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}
