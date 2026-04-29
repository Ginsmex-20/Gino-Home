import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, FileText, Calendar, Users, ArrowLeft,
  Plus, Trash2, Loader2, UserPlus, UserMinus, Crown,
  Hash, RefreshCw, Copy, LogIn, Home, Briefcase, Star
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';
import useAuth from '../stores/auth';

const typeIcons = { household: Home, work: Briefcase, general: Star };
const typeLabels = { household: 'Haushalt', work: 'Arbeit', general: 'Allgemein' };
const typeBg = {
  household: 'bg-green-500/10 text-green-400',
  work: 'bg-blue-500/10 text-blue-400',
  general: 'bg-orange-500/10 text-orange-500'
};

const TABS = [
  { id: 'members',   label: 'Mitglieder', icon: Users },
  { id: 'tasks',     label: 'Aufgaben',   icon: CheckSquare },
  { id: 'documents', label: 'Dokumente',  icon: FileText },
  { id: 'calendar',  label: 'Kalender',   icon: Calendar },
];

// ── Mitglieder Tab ───────────────────────────────────────────────────────────
function MembersTab({ group, members, isAdmin, user, removeMutation, regenCodeMutation }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const copyCode = () => {
    navigator.clipboard.writeText(group?.invite_code || '');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };
  return (
    <div className="space-y-4">
      {group?.invite_code && (
        <div className="p-4 bg-[#161616] rounded-xl border border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 flex items-center gap-1.5"><Hash size={12} /> Einladungscode</span>
            {isAdmin && (
              <button onClick={() => regenCodeMutation.mutate(group.id)}
                className="text-xs text-slate-500 hover:text-orange-500 flex items-center gap-1 transition-colors">
                <RefreshCw size={11} className={regenCodeMutation.isPending ? 'animate-spin' : ''} /> Erneuern
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <code className="text-xl font-mono font-bold text-orange-500 tracking-widest flex-1">{group.invite_code}</code>
            <button onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-sm transition-colors">
              <Copy size={13} />{copiedCode ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 bg-[#161616] rounded-xl">
            {m.avatar
              ? <img src={m.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
              : <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center text-sm font-bold text-orange-500">{m.username[0].toUpperCase()}</div>}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                {m.username}
                {m.role === 'admin' && <Crown size={12} className="text-amber-400" />}
              </p>
              <p className="text-xs text-slate-500">{m.email}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-md ${m.role === 'admin' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
              {m.role === 'admin' ? 'Admin' : 'Mitglied'}
            </span>
            {m.id !== user?.id && isAdmin && (
              <button onClick={() => removeMutation.mutate({ groupId: group.id, userId: m.id })}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                <UserMinus size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Aufgaben Tab ─────────────────────────────────────────────────────────────
function TasksTab({ groupId }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['group-tasks', groupId],
    queryFn: () => api.get(`/tasks?group_id=${groupId}`)
  });

  const addMutation = useMutation({
    mutationFn: d => api.post('/tasks', { ...d, group_id: groupId }),
    onSuccess: () => { qc.invalidateQueries(['group-tasks', groupId]); setShowAdd(false); setForm({ title: '', description: '', priority: 'medium', due_date: '' }); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries(['group-tasks', groupId])
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries(['group-tasks', groupId])
  });

  const priorities = { low: { label: 'Niedrig', cls: 'text-green-400' }, medium: { label: 'Mittel', cls: 'text-amber-400' }, high: { label: 'Hoch', cls: 'text-red-400' } };
  const open = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-orange-500" /></div>;

  const TaskRow = ({ t }) => (
    <div className="flex items-start gap-3 p-3.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl group">
      <button onClick={() => updateMutation.mutate({ id: t.id, status: t.status === 'done' ? 'todo' : 'done' })}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.status === 'done' ? 'bg-green-500 border-green-500' : 'border-slate-600 hover:border-orange-500'}`}>
        {t.status === 'done' && <span className="text-white text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>{t.title}</p>
        {t.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{t.description}</p>}
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`text-xs ${priorities[t.priority]?.cls}`}>{priorities[t.priority]?.label}</span>
          {t.due_date && <span className="text-xs text-slate-500">📅 {format(new Date(t.due_date), 'd. MMM', { locale: de })}</span>}
          {t.creator_name && <span className="text-xs text-slate-600">von {t.creator_name}</span>}
        </div>
      </div>
      <button onClick={() => deleteMutation.mutate(t.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 rounded-lg transition-all">
        <Trash2 size={13} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#3a3a3a] hover:border-orange-500/50 text-slate-500 hover:text-orange-500 rounded-xl text-sm transition-colors">
        <Plus size={14} /> Aufgabe hinzufügen
      </button>
      {open.length > 0 && <div className="space-y-2">{open.map(t => <TaskRow key={t.id} t={t} />)}</div>}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 font-medium uppercase tracking-wider">Erledigt ({done.length})</p>
          {done.map(t => <TaskRow key={t.id} t={t} />)}
        </div>
      )}
      {tasks.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">Noch keine Aufgaben in dieser Gruppe</p>}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Aufgabe erstellen" size="sm">
        <div className="space-y-3">
          <div><label className="block text-xs text-slate-400 mb-1">Titel *</label>
            <input className="w-full px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Beschreibung</label>
            <textarea className="w-full px-3 py-2 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Priorität</label>
              <select className="w-full px-3 py-2 text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Niedrig</option><option value="medium">Mittel</option><option value="high">Hoch</option>
              </select></div>
            <div><label className="block text-xs text-slate-400 mb-1">Fällig</label>
              <input type="date" className="w-full px-3 py-2 text-sm" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-400">Abbrechen</button>
            <button onClick={() => addMutation.mutate(form)} disabled={!form.title || addMutation.isPending}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
              {addMutation.isPending && <Loader2 size={13} className="animate-spin" />} Erstellen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Dokumente Tab ────────────────────────────────────────────────────────────
function DocumentsTab({ groupId }) {
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'other', description: '' });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['group-docs', groupId],
    queryFn: () => api.get(`/documents?group_id=${groupId}`)
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', form.title || file.name);
      fd.append('category', form.category);
      fd.append('description', form.description);
      fd.append('group_id', groupId);
      return api.post('/documents/upload', fd);
    },
    onSuccess: () => { qc.invalidateQueries(['group-docs', groupId]); setShowUpload(false); setFile(null); setForm({ title: '', category: 'other', description: '' }); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries(['group-docs', groupId])
  });

  const formatSize = b => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  const typeIcon = mime => mime?.includes('pdf') ? '📄' : mime?.includes('image') ? '🖼️' : mime?.includes('word') ? '📝' : '📁';

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-3">
      <button onClick={() => setShowUpload(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#3a3a3a] hover:border-orange-500/50 text-slate-500 hover:text-orange-500 rounded-xl text-sm transition-colors">
        <Plus size={14} /> Dokument hochladen
      </button>
      {docs.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">Noch keine Dokumente in dieser Gruppe</p>}
      {docs.map(d => (
        <div key={d.id} className="flex items-center gap-3 p-3.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl group">
          <span className="text-2xl">{typeIcon(d.mimetype)}</span>
          <div className="flex-1 min-w-0">
            <a href={d.filepath} target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium text-white hover:text-orange-400 transition-colors block truncate">{d.title}</a>
            <p className="text-xs text-slate-500 mt-0.5">{d.uploader_name} · {formatSize(d.size)} · {format(new Date(d.created_at), 'd. MMM yyyy', { locale: de })}</p>
          </div>
          <button onClick={() => deleteMutation.mutate(d.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 rounded-lg transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Dokument hochladen" size="sm">
        <div className="space-y-3">
          <div><label className="block text-xs text-slate-400 mb-1">Datei *</label>
            <input type="file" onChange={e => setFile(e.target.files[0])}
              className="w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500/10 file:text-orange-500 file:text-xs" /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Titel</label>
            <input className="w-full px-3 py-2 text-sm" placeholder={file?.name || ''} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-slate-400">Abbrechen</button>
            <button onClick={() => uploadMutation.mutate()} disabled={!file || uploadMutation.isPending}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
              {uploadMutation.isPending && <Loader2 size={13} className="animate-spin" />} Hochladen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Kalender Tab ─────────────────────────────────────────────────────────────
function CalendarTab({ groupId }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', start_date: '', end_date: '', description: '', color: '#f97316' });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['group-calendar', groupId],
    queryFn: () => api.get(`/calendar?group_id=${groupId}`)
  });

  const addMutation = useMutation({
    mutationFn: d => api.post('/calendar', { ...d, group_id: groupId, all_day: true }),
    onSuccess: () => { qc.invalidateQueries(['group-calendar', groupId]); setShowAdd(false); setForm({ title: '', start_date: '', end_date: '', description: '', color: '#f97316' }); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/calendar/${id}`),
    onSuccess: () => qc.invalidateQueries(['group-calendar', groupId])
  });

  const sorted = [...events].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const upcoming = sorted.filter(e => new Date(e.start_date) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const past = sorted.filter(e => new Date(e.start_date) < new Date(new Date().setHours(0, 0, 0, 0))).reverse();

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-orange-500" /></div>;

  const EventRow = ({ e }) => (
    <div className="flex items-center gap-3 p-3.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl group">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{e.title}</p>
        <p className="text-xs text-slate-500">{format(new Date(e.start_date), 'EEEE, d. MMMM yyyy', { locale: de })}{e.creator_name ? ` · ${e.creator_name}` : ''}</p>
        {e.description && <p className="text-xs text-slate-600 mt-0.5 truncate">{e.description}</p>}
      </div>
      <button onClick={() => deleteMutation.mutate(e.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 rounded-lg transition-all">
        <Trash2 size={13} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#3a3a3a] hover:border-orange-500/50 text-slate-500 hover:text-orange-500 rounded-xl text-sm transition-colors">
        <Plus size={14} /> Termin hinzufügen
      </button>
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Kommende Termine</p>
          {upcoming.map(e => <EventRow key={e.id} e={e} />)}
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 font-medium uppercase tracking-wider">Vergangene Termine</p>
          {past.map(e => <EventRow key={e.id} e={e} />)}
        </div>
      )}
      {events.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">Noch keine Termine in dieser Gruppe</p>}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Termin erstellen" size="sm">
        <div className="space-y-3">
          <div><label className="block text-xs text-slate-400 mb-1">Titel *</label>
            <input className="w-full px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Beschreibung</label>
            <textarea className="w-full px-3 py-2 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Datum *</label>
              <input type="date" className="w-full px-3 py-2 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: e.target.value }))} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Enddatum</label>
              <input type="date" className="w-full px-3 py-2 text-sm" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-400">Abbrechen</button>
            <button onClick={() => addMutation.mutate(form)} disabled={!form.title || !form.start_date || addMutation.isPending}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
              {addMutation.isPending && <Loader2 size={13} className="animate-spin" />} Erstellen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Haupt GroupView ──────────────────────────────────────────────────────────
export default function GroupView() {
  const { groupId, tab } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const activeTab = tab || 'members';

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.get(`/groups/${groupId}`)
  });

  const { data: members = [] } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => api.get(`/groups/${groupId}/members`),
    enabled: !!groupId
  });

  const regenCodeMutation = useMutation({
    mutationFn: id => api.post(`/groups/${id}/regenerate-code`),
    onSuccess: () => qc.invalidateQueries(['group', groupId])
  });

  const removeMutation = useMutation({
    mutationFn: ({ groupId: gid, userId }) => api.delete(`/groups/${gid}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries(['group-members', groupId])
  });

  const isAdmin = members.find(m => m.id === user?.id)?.role === 'admin';

  if (groupLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={24} className="animate-spin text-orange-500" />
    </div>
  );

  if (!group) return (
    <div className="text-center py-12">
      <p className="text-slate-400">Gruppe nicht gefunden</p>
      <Link to="/groups" className="text-orange-500 text-sm mt-2 inline-block">← Zurück zu Gruppen</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/groups"
          className="p-2 hover:bg-[#2a2a2a] rounded-xl transition-colors text-slate-400 hover:text-white">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{group.name}</h1>
          {group.description && <p className="text-sm text-slate-400 truncate">{group.description}</p>}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 ${typeBg[group.type] || 'bg-orange-500/10 text-orange-500'}`}>
          {typeLabels[group.type]}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1a1a] p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id}
              onClick={() => navigate(`/groups/${groupId}/${t.id}`)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-1 justify-center ${activeTab === t.id ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'members' && (
        <MembersTab group={group} members={members} isAdmin={isAdmin} user={user}
          removeMutation={removeMutation} regenCodeMutation={regenCodeMutation} />
      )}
      {activeTab === 'tasks' && <TasksTab groupId={groupId} />}
      {activeTab === 'documents' && <DocumentsTab groupId={groupId} />}
      {activeTab === 'calendar' && <CalendarTab groupId={groupId} />}
    </div>
  );
}
