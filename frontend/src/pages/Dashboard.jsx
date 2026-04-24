import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Users, TrendingUp, TrendingDown, Calendar, Clock, Euro, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import api from '../api/client';
import useAuth from '../stores/auth';

const STAT_CARDS = [
  { key: 'tasks', icon: CheckSquare, label: 'Offene Aufgaben', iconCls: 'text-orange-400', bgCls: 'bg-orange-500/15', to: '/tasks' },
  { key: 'groups', icon: Users, label: 'Gruppen', iconCls: 'text-blue-400', bgCls: 'bg-blue-500/15', to: '/groups' },
  { key: 'income', icon: TrendingUp, label: 'Einnahmen', iconCls: 'text-green-400', bgCls: 'bg-green-500/15', to: '/finance' },
  { key: 'expense', icon: TrendingDown, label: 'Ausgaben', iconCls: 'text-red-400', bgCls: 'bg-red-500/15', to: '/finance' },
];

const STATUS_COLOR = { todo: 'text-slate-400', in_progress: 'text-amber-400', done: 'text-green-400', blocked: 'text-red-400' };
const STATUS_BG = { todo: 'bg-slate-700', in_progress: 'bg-amber-500/20', done: 'bg-green-500/20', blocked: 'bg-red-500/20' };
const STATUS_LABEL = { todo: 'To-do', in_progress: 'In Arbeit', done: 'Erledigt', blocked: 'Blockiert' };

export default function Dashboard() {
  const { user } = useAuth();
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => api.get('/tasks') });
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: () => api.get('/groups') });
  const { data: summary } = useQuery({ queryKey: ['finance-summary'], queryFn: () => api.get('/finance/summary') });
  const { data: events = [] } = useQuery({ queryKey: ['calendar-upcoming'], queryFn: () => api.get(`/calendar?from=${new Date().toISOString()}`) });

  const openTasks = tasks.filter(t => t.status !== 'done');

  const statValues = {
    tasks: openTasks.length,
    groups: groups.length,
    income: `${(summary?.income || 0).toFixed(2)} €`,
    expense: `${(summary?.expense || 0).toFixed(2)} €`,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Guten Tag, {user?.username}! 👋</h1>
        <p className="text-slate-400 text-sm mt-1">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, icon: Icon, label, iconCls, bgCls, to }) => (
          <Link key={key} to={to}>
            <div className="bg-bg-card border border-border rounded-2xl p-5 hover:border-orange-500/40 transition-colors">
              <div className={`w-10 h-10 rounded-xl ${bgCls} flex items-center justify-center mb-3`}>
                <Icon size={20} className={iconCls} />
              </div>
              <p className="text-2xl font-bold text-white">{statValues[key]}</p>
              <p className="text-sm text-slate-400 mt-0.5">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><CheckSquare size={16} className="text-orange-500" /> Aktuelle Aufgaben</h2>
            <Link to="/tasks" className="text-xs text-orange-500 hover:text-orange-600">Alle →</Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Keine offenen Aufgaben</p>
          ) : (
            <div className="space-y-2">
              {openTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-bg hover:bg-bg-hover rounded-xl transition-colors">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_BG[task.status]} ${STATUS_COLOR[task.status]}`}>
                    {STATUS_LABEL[task.status]}
                  </span>
                  <span className="text-sm text-slate-200 flex-1 truncate">{task.title}</span>
                  {task.due_date && (
                    <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                      <Clock size={11} />{format(new Date(task.due_date), 'd. MMM', { locale: de })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><Calendar size={16} className="text-orange-500" /> Kommende Termine</h2>
            <Link to="/calendar" className="text-xs text-orange-500 hover:text-orange-600">Kalender →</Link>
          </div>
          {events.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Keine bevorstehenden Termine</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-center gap-3 p-3 bg-bg hover:bg-bg-hover rounded-xl transition-colors">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                  <span className="text-sm text-slate-200 flex-1 truncate">{event.title}</span>
                  <span className="text-xs text-slate-500 shrink-0">{format(new Date(event.start_date), 'd. MMM', { locale: de })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><Euro size={16} className="text-orange-500" /> Finanzübersicht</h2>
            <Link to="/finance" className="text-xs text-orange-500 hover:text-orange-600">Details →</Link>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Bilanz', value: `${(summary?.balance || 0).toFixed(2)} €`, cls: (summary?.balance || 0) >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold' },
              { label: 'Aktive Verträge', value: `${summary?.active_contracts || 0} (${(summary?.contracts_total || 0).toFixed(0)} €/Mo)`, cls: 'text-amber-400 font-bold' },
              { label: 'Gesamtrestschuld', value: `${(summary?.loans_remaining || 0).toFixed(2)} €`, cls: 'text-rose-400 font-bold' },
              { label: 'Belastung/Monat', value: `${((summary?.loans_monthly || 0) + (summary?.contracts_total || 0)).toFixed(0)} €`, cls: 'text-orange-400 font-bold' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between items-center p-3 bg-bg rounded-xl">
                <span className="text-sm text-slate-400">{label}</span>
                <span className={`text-sm ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><Users size={16} className="text-orange-500" /> Meine Gruppen</h2>
            <Link to="/groups" className="text-xs text-orange-500 hover:text-orange-600">Alle →</Link>
          </div>
          {groups.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Noch keine Gruppen</p>
          ) : (
            <div className="space-y-2">
              {groups.slice(0, 4).map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 bg-bg hover:bg-bg-hover rounded-xl transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center text-sm font-bold text-orange-500">
                    {g.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{g.name}</p>
                    <p className="text-xs text-slate-500">{g.member_count} Mitglieder</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
