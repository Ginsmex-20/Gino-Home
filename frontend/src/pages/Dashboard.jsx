import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare, Users, TrendingUp, TrendingDown, Calendar,
  Clock, ArrowRight, FileText, CreditCard, Wallet,
  AlertTriangle, BellRing, Layers,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import api from '../api/client';
import useAuth from '../stores/auth';
import { StatCard, WarningBanner } from '../components/ui';

/* ──────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Gute Nacht';
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  if (h < 22) return 'Guten Abend';
  return 'Gute Nacht';
}

function fmtMoney(n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0); }

/* ──────────────────────────────────────────────────────────────────────
   Section — modulare Sektion mit Header
   ────────────────────────────────────────────────────────────────────── */
function Section({ icon: Icon, title, count, to, toLabel = 'Alle ansehen', children, accent = '#f97316' }) {
  return (
    <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 30, height: 30, borderRadius: '9px', background: `${accent}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={15} color={accent} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: '#fff', fontSize: '14px', margin: 0 }}>{title}</p>
            {count !== undefined && <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0' }}>{count} Eintr.</p>}
          </div>
        </div>
        {to && (
          <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = accent}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            {toLabel} <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ label }) {
  return <p style={{ textAlign: 'center', color: '#475569', fontSize: '12px', padding: '24px 16px', margin: 0 }}>{label}</p>;
}

function Row({ children, to, onClick }) {
  const content = (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px',
      borderTop: '1px solid #1a1a1a', cursor: (to || onClick) ? 'pointer' : 'default', transition: 'background 0.15s',
    }}
      onMouseEnter={e => { if (to || onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >{children}</div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

/* ── Status pills (für Tasks) ─────────────────────────────────────────── */
const STATUS_PILL = {
  todo:        { label: 'To-do',    color: '#94a3b8', bg: 'rgba(148,163,184,.1)' },
  in_progress: { label: 'In Arbeit',color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  done:        { label: 'Erledigt', color: '#22c55e', bg: 'rgba(34,197,94,.12)' },
  archiv:      { label: 'Archiv',   color: '#64748b', bg: 'rgba(100,116,139,.1)' },
};

/* ══════════════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user } = useAuth();
  const { data: tasks    = [] } = useQuery({ queryKey: ['tasks'],             queryFn: () => api.get('/tasks') });
  const { data: groups   = [] } = useQuery({ queryKey: ['groups'],            queryFn: () => api.get('/groups') });
  const { data: summary  }      = useQuery({ queryKey: ['finance-summary'],   queryFn: () => api.get('/finance/summary') });
  const { data: events   = [] } = useQuery({ queryKey: ['calendar-upcoming'], queryFn: () => api.get(`/calendar?from=${new Date().toISOString()}`) });
  const { data: contracts = [] }= useQuery({ queryKey: ['contracts'],         queryFn: () => api.get('/finance/contracts') });
  const { data: documents = [] }= useQuery({ queryKey: ['documents'],         queryFn: () => api.get('/documents') });

  const openTasks    = tasks.filter(t => t.status !== 'done' && t.status !== 'archiv');
  const urgentCancel = contracts.filter(c => {
    if (!c.cancel_until) return false;
    const d = differenceInDays(parseISO(c.cancel_until), new Date());
    return d >= 0 && d <= 30;
  });
  const overdueDocs = documents.filter(d => d.due_date && !d.paid && new Date(d.due_date) < new Date());

  const today = format(new Date(), "EEEE, d. MMMM yyyy", { locale: de });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Begrüßung ────────────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ paddingBottom: '4px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          {getGreeting()}, {user?.username}
        </h1>
        <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>{today}</p>
      </div>

      {/* ── Warnungen ────────────────────────────────────────────────── */}
      {overdueDocs.length > 0 && (
        <Link to="/documents" style={{ textDecoration: 'none' }}>
          <WarningBanner icon={BellRing} severity="critical" onClick={() => {}}>
            <strong style={{ color: '#ef4444' }}>{overdueDocs.length} Dokument{overdueDocs.length !== 1 ? 'e' : ''} überfällig</strong>
            <span style={{ color: '#94a3b8' }}> — z.B. unbezahlte Rechnungen</span>
          </WarningBanner>
        </Link>
      )}
      {urgentCancel.length > 0 && (
        <Link to="/vertraege" style={{ textDecoration: 'none' }}>
          <WarningBanner icon={AlertTriangle} severity="critical" onClick={() => {}}>
            <strong style={{ color: '#ef4444' }}>{urgentCancel.length} Vertrag{urgentCancel.length !== 1 ? 'e' : ''}</strong>
            <span style={{ color: '#94a3b8' }}> müssen bald gekündigt werden!</span>
          </WarningBanner>
        </Link>
      )}

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <Link to="/tasks" style={{ textDecoration: 'none' }}>
          <StatCard icon={CheckSquare} label="Offene Aufgaben" value={openTasks.length} color="#f97316" hint={tasks.length > 0 ? `von ${tasks.length} gesamt` : null} />
        </Link>
        <Link to="/groups" style={{ textDecoration: 'none' }}>
          <StatCard icon={Users} label="Gruppen" value={groups.length} color="#3b82f6" />
        </Link>
        <Link to="/finance" style={{ textDecoration: 'none' }}>
          <StatCard icon={TrendingUp} label="Einnahmen" value={fmtMoney(summary?.income)} color="#22c55e" />
        </Link>
        <Link to="/finance" style={{ textDecoration: 'none' }}>
          <StatCard icon={TrendingDown} label="Ausgaben" value={fmtMoney(summary?.expense)} color="#ef4444" />
        </Link>
      </div>

      {/* ── Sektionen ────────────────────────────────────────────────── */}
      <Section icon={CheckSquare} title="Offene Aufgaben" count={openTasks.length} to="/tasks" accent="#f97316">
        {openTasks.length === 0 ? <Empty label="Alles erledigt — wow!" /> : (
          openTasks.slice(0, 5).map(task => {
            const s = STATUS_PILL[task.status] || STATUS_PILL.todo;
            return (
              <Row key={task.id} to={`/tasks`}>
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: s.bg, color: s.color, flexShrink: 0 }}>
                  {s.label}
                </span>
                <span style={{ fontSize: '13px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                {task.due_date && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', flexShrink: 0 }}>
                    <Clock size={10} /> {format(new Date(task.due_date), 'd. MMM', { locale: de })}
                  </span>
                )}
              </Row>
            );
          })
        )}
      </Section>

      <Section icon={Wallet} title="Finanzen" to="/finance" accent="#22c55e">
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Bilanz',          value: fmtMoney(summary?.balance),         color: (summary?.balance || 0) >= 0 ? '#22c55e' : '#ef4444' },
            { label: 'Verträge/Monat',  value: fmtMoney(summary?.contracts_total), color: '#f97316' },
            { label: 'Restschuld',      value: fmtMoney(summary?.loans_remaining), color: '#f43f5e' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: '10px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{label}</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Calendar} title="Bevorstehende Termine" count={events.length} to="/calendar" toLabel="Kalender" accent="#60a5fa">
        {events.length === 0 ? <Empty label="Keine bevorstehenden Termine" /> : (
          events.slice(0, 4).map(event => (
            <Row key={event.id} to="/calendar">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: event.color || '#f97316', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</span>
              <span style={{ fontSize: '11px', color: '#475569', flexShrink: 0 }}>{format(new Date(event.start_date), 'd. MMM', { locale: de })}</span>
            </Row>
          ))
        )}
      </Section>

      {contracts.filter(c => c.status === 'active').length > 0 && (
        <Section icon={FileText} title="Aktive Verträge" count={contracts.filter(c => c.status === 'active').length} to="/vertraege" accent="#a78bfa">
          {contracts.filter(c => c.status === 'active').slice(0, 3).map(c => (
            <Row key={c.id} to="/vertraege">
              <span style={{ fontSize: '13px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
              <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 600, flexShrink: 0 }}>
                {fmtMoney(c.billing_cycle === 'yearly' ? c.amount / 12 : c.billing_cycle === 'quarterly' ? c.amount / 3 : c.billing_cycle === 'biannual' ? c.amount / 6 : c.amount)}/Mo
              </span>
            </Row>
          ))}
        </Section>
      )}

      {groups.length > 0 && (
        <Section icon={Users} title="Gruppen" count={groups.length} to="/groups" accent="#3b82f6">
          {groups.slice(0, 4).map(g => (
            <Row key={g.id} to={`/groups/${g.id}`}>
              <div style={{ width: 32, height: 32, borderRadius: '9px', background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#3b82f6', flexShrink: 0 }}>
                {g.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                <p style={{ fontSize: '11px', color: '#475569', margin: '1px 0 0' }}>{g.member_count} Mitgl.</p>
              </div>
              <ArrowRight size={14} color="#475569" />
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}
