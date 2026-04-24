import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckSquare, Clock, Trash2, Edit, Home, Star, Loader2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';
import useAuth from '../stores/auth';

const STATUS_OPTS = [
  { value: 'todo', label: 'To-do', color: 'bg-slate-700 text-slate-200' },
  { value: 'in_progress', label: 'In Bearbeitung', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'done', label: 'Erledigt', color: 'bg-green-500/20 text-green-400' },
  { value: 'blocked', label: 'Blockiert', color: 'bg-red-500/20 text-red-400' },
];
const PRIO_OPTS = [
  { value: 'low', label: 'Niedrig', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'medium', label: 'Mittel', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'high', label: 'Hoch', color: 'bg-red-500/20 text-red-400' },
];

const emptyForm = { title: '', description: '', status: 'todo', priority: 'medium', type: 'general', due_date: '', assignee_id: '', group_id: '', budget: '', notes: '' };

function StatusBadge({ status }) {
  const opt = STATUS_OPTS.find(o => o.value === status) || STATUS_OPTS[0];
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${opt.color}`}>{opt.label}</span>;
}
function PrioBadge({ priority }) {
  const opt = PRIO_OPTS.find(o => o.value === priority) || PRIO_OPTS[1];
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${opt.color}`}>{opt.label}</span>;
}

export default function Tasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState({ type: '', status: '' });

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks', filter], queryFn: () => {
    const p = new URLSearchParams();
    if (filter.type) p.set('type', filter.type);
    if (filter.status) p.set('status', filter.status);
    return api.get('/tasks?' + p);
  }});
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: () => api.get('/groups') });

  const saveMutation = useMutation({
    mutationFn: data => editing ? api.put(`/tasks/${editing.id}`, data) : api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries(['tasks']); closeModal(); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries(['tasks'])
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries(['tasks'])
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = task => { setEditing(task); setForm({ ...task, due_date: task.due_date || '', assignee_id: task.assignee_id || '', group_id: task.group_id || '', budget: task.budget || '', notes: task.notes || '' }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const grouped = STATUS_OPTS.reduce((acc, s) => {
    acc[s.value] = tasks.filter(t => t.status === s.value);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Aufgaben</h1>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 text-sm rounded-xl" value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
            <option value="">Alle Typen</option>
            <option value="household">Haushalt</option>
            <option value="general">Allgemein</option>
          </select>
          <select className="px-3 py-2 text-sm rounded-xl" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">Alle Status</option>
            {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> Aufgabe
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_OPTS.map(({ value, label, color }) => (
            <div key={value} className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${color}`}>{label}</span>
                <span className="text-xs text-slate-500 bg-bg px-2 py-0.5 rounded-full">{grouped[value]?.length || 0}</span>
              </div>
              <div className="space-y-2">
                {grouped[value]?.map(task => (
                  <div key={task.id} className="bg-bg hover:bg-bg-hover rounded-xl p-3 group transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{task.title}</p>
                        {task.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => openEdit(task)} className="p-1 text-slate-500 hover:text-white rounded transition-colors"><Edit size={12} /></button>
                        <button onClick={() => deleteMutation.mutate(task.id)} className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <PriBadge priority={task.priority} />
                      {task.type === 'household' && <span className="px-1.5 py-0.5 rounded text-xs bg-green-500/10 text-green-500 flex items-center gap-1"><Home size={10} />Haushalt</span>}
                      {task.due_date && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10} />{format(new Date(task.due_date), 'd. MMM', { locale: de })}</span>}
                      {task.budget > 0 && <span className="text-xs text-slate-500">{task.budget} €</span>}
                    </div>
                    {value !== 'done' && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <select className="w-full text-xs py-1 px-2 rounded-lg" value={task.status} onChange={e => statusMutation.mutate({ id: task.id, status: e.target.value })}>
                          {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-slate-400 mb-1.5">Titel *</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="Aufgabe..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Status</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Priorität</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIO_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Typ</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="general">Allgemein</option>
              <option value="household">Haushalt</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Fälligkeitsdatum</label>
            <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Budget (€)</label>
            <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" placeholder="0.00" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Gruppe</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}>
              <option value="">Keine Gruppe</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-slate-400 mb-1.5">Hinweise</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
          <button onClick={closeModal} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Abbrechen</button>
          <button onClick={() => saveMutation.mutate(form)} disabled={!form.title || saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {editing ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function PriBadge({ priority }) {
  const opt = PRIO_OPTS.find(o => o.value === priority) || PRIO_OPTS[1];
  return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.label}</span>;
}
