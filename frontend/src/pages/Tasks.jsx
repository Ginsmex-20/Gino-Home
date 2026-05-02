import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, Trash2, Edit, Home, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';

const STATUS_OPTS = [
  { value: 'todo',        label: 'To-do',    color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  { value: 'in_progress', label: 'In Arbeit', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  { value: 'done',        label: 'Erledigt',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)'   },
  { value: 'archiv',      label: 'Archiv',    color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
];
const PRIO_OPTS = [
  { value: 'low',    label: 'Niedrig', color: '#3b82f6' },
  { value: 'medium', label: 'Mittel',  color: '#f59e0b' },
  { value: 'high',   label: 'Hoch',    color: '#ef4444' },
];

const emptyForm = {
  title: '', description: '', status: 'todo', priority: 'medium',
  type: 'general', due_date: '', group_id: '', budget: '', notes: '',
};

export default function Tasks() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [filterType, setFilterType] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filterType],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filterType) p.set('type', filterType);
      return api.get('/tasks?' + p);
    },
  });
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: () => api.get('/groups') });

  const saveMutation = useMutation({
    mutationFn: data => editing
      ? api.put(`/tasks/${editing.id}`, data)
      : api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries(['tasks']); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries(['tasks']),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries(['tasks']),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = task => {
    setEditing(task);
    setForm({
      ...task,
      due_date: task.due_date || '',
      group_id: task.group_id || '',
      budget:   task.budget   || '',
      notes:    task.notes    || '',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const grouped = STATUS_OPTS.reduce((acc, s) => {
    acc[s.value] = tasks.filter(t => t.status === s.value);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>Aufgaben</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '14px' }}
          >
            <option value="">Alle Typen</option>
            <option value="household">Haushalt</option>
            <option value="general">Allgemein</option>
          </select>
          <button
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', background: '#f97316', color: '#fff',
              border: 'none', borderRadius: '12px', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Aufgabe
          </button>
        </div>
      </div>

      {/* ── Kanban (horizontal scroll on mobile) ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 size={24} color="#f97316" />
        </div>
      ) : (
        <div className="kanban-scroll">
          {STATUS_OPTS.map(({ value, label, color, bg }) => (
            <div key={value} className="kanban-col" style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '14px',
              flexShrink: 0,
            }}>
              {/* Column header */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color, background: bg }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '11px', color: '#4b5563', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '99px' }}>
                    {grouped[value]?.length || 0}
                  </span>
                </div>
                {value === 'archiv' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      placeholder="Archiv durchsuchen..."
                      value={archiveSearch}
                      onChange={e => setArchiveSearch(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {/* Task cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(() => {
                  const displayedTasks = value === 'archiv'
                    ? (grouped[value] || []).filter(t => !archiveSearch || t.title.toLowerCase().includes(archiveSearch.toLowerCase()) || (t.description || '').toLowerCase().includes(archiveSearch.toLowerCase()))
                    : (grouped[value] || []);
                  return displayedTasks.map(task => {
                    const prio = PRIO_OPTS.find(o => o.value === task.priority) || PRIO_OPTS[1];
                    return (
                      <div key={task.id} style={{
                        background: '#111', border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px', padding: '12px',
                      }}>
                        {/* Title + actions */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '8px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p style={{ fontSize: '11px', color: '#64748b', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {task.description}
                              </p>
                            )}
                          </div>
                          {/* Always-visible action buttons */}
                          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                            <button
                              onClick={() => openEdit(task)}
                              style={{ padding: '5px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', lineHeight: 0 }}
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(task.id)}
                              style={{ padding: '5px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', lineHeight: 0 }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: value !== 'done' && value !== 'archiv' ? '8px' : 0 }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: prio.color, background: prio.color + '22', padding: '2px 7px', borderRadius: '6px' }}>
                            {prio.label}
                          </span>
                          {task.type === 'household' && (
                            <span style={{ fontSize: '10px', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 7px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Home size={9} /> Haushalt
                            </span>
                          )}
                          {task.due_date && (
                            <span style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={9} /> {format(new Date(task.due_date), 'd. MMM', { locale: de })}
                            </span>
                          )}
                        </div>

                        {/* Status-Wechsel */}
                        {value !== 'done' && value !== 'archiv' && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                            <select
                              value={task.status}
                              onChange={e => statusMutation.mutate({ id: task.id, status: e.target.value })}
                              style={{ width: '100%', padding: '5px 8px', borderRadius: '8px', fontSize: '12px' }}
                            >
                              {STATUS_OPTS.filter(s => s.value !== 'archiv').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
                {(grouped[value]?.length || 0) === 0 && (
                  <p style={{ fontSize: '12px', color: '#374151', textAlign: 'center', padding: '16px 0' }}>Leer</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <Modal open={showModal} onClose={closeModal} title={editing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Titel *</label>
            <input
              placeholder="Aufgabe..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Beschreibung</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%', padding: '10px 14px' }}>
                {STATUS_OPTS.filter(s => s.value !== 'archiv').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Priorität</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: '100%', padding: '10px 14px' }}>
                {PRIO_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Typ</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '10px 14px' }}>
                <option value="general">Allgemein</option>
                <option value="household">Haushalt</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Fälligkeitsdatum</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ width: '100%', padding: '10px 14px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Budget (€)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} style={{ width: '100%', padding: '10px 14px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Gruppe</label>
              <select value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))} style={{ width: '100%', padding: '10px 14px' }}>
                <option value="">Keine Gruppe</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Hinweise</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={closeModal}
              style={{ padding: '9px 16px', fontSize: '14px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Abbrechen
            </button>
            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.title || saveMutation.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 20px', background: '#f97316', color: '#fff',
                border: 'none', borderRadius: '12px', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer',
                opacity: (!form.title || saveMutation.isPending) ? 0.5 : 1,
              }}
            >
              {saveMutation.isPending && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {editing ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
