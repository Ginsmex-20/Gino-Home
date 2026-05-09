import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Trash2, UserPlus, UserMinus, Crown, Home, Briefcase, Star,
  Loader2, Copy, RefreshCw, Hash, LogIn, CheckSquare, FileText, Calendar,
  DollarSign, ArrowLeft, MessageSquare, Send, TrendingUp, TrendingDown,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';
import useAuth from '../stores/auth';
import { StatCard, CategoryCard, PageHeader, EmptyState } from '../components/ui';

/* ════════════════════════════════════════════════════════════════════
   GRUPPEN-TYPEN KONFIGURATION
   ════════════════════════════════════════════════════════════════════ */
const TYPE_CONFIG = {
  household: { label: 'Haushalt',  icon: Home,      color: '#22c55e' },
  work:      { label: 'Arbeit',    icon: Briefcase, color: '#3b82f6' },
  general:   { label: 'Allgemein', icon: Star,      color: '#f97316' },
};

// Backwards-Compat Helpers
const typeIcons = { household: Home, work: Briefcase, general: Star };
const typeLabels = { household: 'Haushalt', work: 'Arbeit', general: 'Allgemein' };
const typeBg = {
  household: 'bg-green-500/10 text-green-400',
  work: 'bg-blue-500/10 text-blue-400',
  general: 'bg-orange-500/10 text-orange-500'
};

const statusColors = { todo: 'text-slate-400', in_progress: 'text-blue-400', done: 'text-green-400' };

/* ════════════════════════════════════════════════════════════════════
   GRUPPEN-KARTE — modernes Design
   ════════════════════════════════════════════════════════════════════ */
function GroupCard({ group, onSelect }) {
  const cfg = TYPE_CONFIG[group.type] || TYPE_CONFIG.general;
  const Icon = cfg.icon;
  const [hov, setHov] = useState(false);

  return (
    <div onClick={() => onSelect(group)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#141414',
        border: `1px solid ${hov ? cfg.color + '55' : '#1e1e1e'}`,
        borderRadius: '14px', padding: '14px',
        cursor: 'pointer', transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: '12px', flexShrink: 0,
          background: `linear-gradient(135deg, ${cfg.color}33, ${cfg.color}1a)`,
          border: `1px solid ${cfg.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: 700, color: cfg.color,
        }}>
          {group.name[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
          {group.description && (
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.description}</p>
          )}
        </div>
        <span style={{
          padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
          background: `${cfg.color}1a`, color: cfg.color, border: `1px solid ${cfg.color}33`,
          display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
        }}>
          <Icon size={10} /> {cfg.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1e1e1e', paddingTop: '10px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
          <Users size={12} /> {group.member_count} {group.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
        </span>
        <ArrowLeft size={14} color={hov ? cfg.color : '#475569'} style={{ transform: 'rotate(180deg)', transition: 'color 0.15s' }} />
      </div>
    </div>
  );
}

// ── Tab: Mitglieder ──────────────────────────────────────────────────────────
function MembersTab({ group, members, isAdmin, user, onInvite, removeMutation, regenCodeMutation, roleMutation }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const copyCode = () => {
    const val = group.invite_code || '';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(val);
      } else {
        const el = document.createElement('textarea');
        el.value = val;
        el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
    } catch {}
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Invite Code */}
      {group.invite_code && (
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
          <p className="text-xs text-slate-600 mt-1.5">Teile diesen Code — neue Mitglieder geben ihn bei "Beitreten" ein.</p>
        </div>
      )}
      {/* Member list */}
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 bg-[#161616] rounded-xl group">
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
              <>
                <button
                  onClick={() => roleMutation.mutate({ groupId: group.id, userId: m.id, role: m.role === 'admin' ? 'member' : 'admin' })}
                  title={m.role === 'admin' ? 'Zu Mitglied degradieren' : 'Zum Admin befördern'}
                  className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <Crown size={14} />
                </button>
                <button onClick={() => removeMutation.mutate({ groupId: group.id, userId: m.id })}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <UserMinus size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {isAdmin && (
        <button onClick={onInvite}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#3a3a3a] hover:border-orange-500/50 text-slate-500 hover:text-orange-500 rounded-xl text-sm transition-colors">
          <UserPlus size={14} /> Mitglied per E-Mail einladen
        </button>
      )}
    </div>
  );
}

// ── Tab: Aufgaben ────────────────────────────────────────────────────────────
function TasksTab({ groupId }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', due_date: '' });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['group-tasks', groupId],
    queryFn: () => api.get(`/tasks?group_id=${groupId}`)
  });

  const addMutation = useMutation({
    mutationFn: d => api.post('/tasks', { ...d, group_id: groupId }),
    onSuccess: () => { qc.invalidateQueries(['group-tasks', groupId]); setShowAdd(false); setForm({ title: '', description: '', priority: 'medium', status: 'todo', due_date: '' }); }
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

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-3">
      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#3a3a3a] hover:border-orange-500/50 text-slate-500 hover:text-orange-500 rounded-xl text-sm transition-colors">
        <Plus size={14} /> Aufgabe hinzufügen
      </button>
      {tasks.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Noch keine Aufgaben in dieser Gruppe</p>}
      {tasks.map(t => (
        <div key={t.id} className="flex items-start gap-3 p-3.5 bg-[#161616] rounded-xl group">
          <button onClick={() => updateMutation.mutate({ id: t.id, status: t.status === 'done' ? 'todo' : 'done' })}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.status === 'done' ? 'bg-green-500 border-green-500' : 'border-slate-600 hover:border-orange-500'}`}>
            {t.status === 'done' && <span className="text-white text-xs">✓</span>}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>{t.title}</p>
            {t.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{t.description}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs ${priorities[t.priority]?.cls || 'text-slate-400'}`}>{priorities[t.priority]?.label}</span>
              {t.due_date && <span className="text-xs text-slate-500">{format(new Date(t.due_date), 'd. MMM', { locale: de })}</span>}
              {t.creator_name && <span className="text-xs text-slate-600">von {t.creator_name}</span>}
            </div>
          </div>
          <button onClick={() => deleteMutation.mutate(t.id)}
            style={{ padding: '7px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', lineHeight: 0, flexShrink: 0 }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Gruppen-Aufgabe" size="sm">
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

// ── Tab: Dokumente ───────────────────────────────────────────────────────────
function DocumentsTab({ groupId }) {
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'other', description: '' });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['group-docs', groupId],
    queryFn: () => api.get(`/documents?group_id=${groupId}`)
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['doc-categories', groupId],
    queryFn: () => api.get(`/documents/categories?group_id=${groupId}`)
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

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-3">
      <button onClick={() => setShowUpload(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#3a3a3a] hover:border-orange-500/50 text-slate-500 hover:text-orange-500 rounded-xl text-sm transition-colors">
        <Plus size={14} /> Dokument hochladen
      </button>
      {docs.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Noch keine Dokumente in dieser Gruppe</p>}
      {docs.map(d => (
        <div key={d.id} className="flex items-center gap-3 p-3.5 bg-[#161616] rounded-xl group">
          <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
            <FileText size={18} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <a href={d.filepath} target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium text-white hover:text-orange-400 transition-colors truncate block">{d.title}</a>
            <p className="text-xs text-slate-500 mt-0.5">{d.uploader_name} · {formatSize(d.size)} · {format(new Date(d.created_at), 'd. MMM yyyy', { locale: de })}</p>
          </div>
          <button onClick={() => deleteMutation.mutate(d.id)}
            style={{ padding: '7px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', lineHeight: 0, flexShrink: 0 }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Dokument hochladen" size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Datei *</label>
            <input type="file" onChange={e => setFile(e.target.files[0])}
              className="w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500/10 file:text-orange-500 file:text-xs" />
          </div>
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

// ── Tab: Kalender ────────────────────────────────────────────────────────────
function CalendarTab({ groupId }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', start_date: '', end_date: '', all_day: true, color: '#f97316', description: '' });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['group-calendar', groupId],
    queryFn: () => api.get(`/calendar?group_id=${groupId}`)
  });

  const addMutation = useMutation({
    mutationFn: d => api.post('/calendar', { ...d, group_id: groupId }),
    onSuccess: () => { qc.invalidateQueries(['group-calendar', groupId]); setShowAdd(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/calendar/${id}`),
    onSuccess: () => qc.invalidateQueries(['group-calendar', groupId])
  });

  const upcoming = [...events].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).filter(e => new Date(e.start_date) >= new Date(new Date().setHours(0,0,0,0)));
  const past = [...events].sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).filter(e => new Date(e.start_date) < new Date(new Date().setHours(0,0,0,0)));

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-orange-500" /></div>;

  const EventRow = ({ e }) => (
    <div className="flex items-center gap-3 p-3.5 bg-[#161616] rounded-xl group">
      <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: e.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{e.title}</p>
        <p className="text-xs text-slate-500">{format(new Date(e.start_date), 'EEEE, d. MMMM yyyy', { locale: de })} · von {e.creator_name}</p>
      </div>
      <button onClick={() => deleteMutation.mutate(e.id)}
        style={{ padding: '7px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', lineHeight: 0, flexShrink: 0 }}>
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
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kommende Termine</p>
          {upcoming.map(e => <EventRow key={e.id} e={e} />)}
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Vergangene Termine</p>
          {past.map(e => <EventRow key={e.id} e={e} />)}
        </div>
      )}
      {events.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Noch keine Termine in dieser Gruppe</p>}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Gruppen-Termin" size="sm">
        <div className="space-y-3">
          <div><label className="block text-xs text-slate-400 mb-1">Titel *</label>
            <input className="w-full px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Beschreibung</label>
            <textarea className="w-full px-3 py-2 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Start *</label>
              <input type="date" className="w-full px-3 py-2 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Ende</label>
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

// ── Tab: Chat ────────────────────────────────────────────────────────────────
function ChatTab({ groupId, currentUser }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['group-chat', groupId],
    queryFn: () => api.get(`/groups/${groupId}/chat`),
    refetchInterval: 4000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: content => api.post(`/groups/${groupId}/chat`, { content }),
    onSuccess: () => { qc.invalidateQueries(['group-chat', groupId]); setMessage(''); }
  });

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message.trim());
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '420px' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 0 12px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px' }}>
            <MessageSquare size={36} style={{ color: '#374151' }} />
            <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}>Noch keine Nachrichten — starte die Unterhaltung!</p>
          </div>
        )}
        {messages.map(m => {
          const isMe = m.user_id === currentUser?.id;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
              {!isMe && (
                m.avatar
                  ? <img src={m.avatar} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                  : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#f97316', flexShrink: 0 }}>{m.username[0].toUpperCase()}</div>
              )}
              <div style={{ maxWidth: '72%' }}>
                {!isMe && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 3px 4px' }}>{m.username}</p>}
                <div style={{
                  padding: '8px 13px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMe ? '#f97316' : '#1e1e1e',
                  color: isMe ? '#fff' : '#e2e8f0',
                  fontSize: '14px', lineHeight: '1.45',
                  border: isMe ? 'none' : '1px solid #2a2a2a',
                  wordBreak: 'break-word'
                }}>
                  {m.content}
                </div>
                <p style={{ fontSize: '10px', color: '#4b5563', margin: '3px 4px 0', textAlign: isMe ? 'right' : 'left' }}>
                  {format(new Date(m.created_at), 'HH:mm', { locale: de })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #1e1e1e' }}>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Nachricht schreiben..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#fff', fontSize: '14px', outline: 'none' }}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          style={{ padding: '10px 14px', borderRadius: '12px', background: message.trim() ? '#f97316' : '#2a2a2a', color: message.trim() ? '#fff' : '#4b5563', border: 'none', cursor: message.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}
        >
          {sendMutation.isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

// ── Tab: Finanzen ────────────────────────────────────────────────────────────
function FinanceTab({ groupId }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', type: 'expense', category: 'Sonstiges', date: new Date().toISOString().split('T')[0] });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['group-finance', groupId],
    queryFn: () => api.get(`/finance/items?group_id=${groupId}`)
  });

  const { data: summary } = useQuery({
    queryKey: ['group-finance-summary', groupId],
    queryFn: () => api.get(`/finance/summary?group_id=${groupId}`)
  });

  const addMutation = useMutation({
    mutationFn: d => api.post('/finance/items', { ...d, group_id: groupId }),
    onSuccess: () => {
      qc.invalidateQueries(['group-finance', groupId]);
      qc.invalidateQueries(['group-finance-summary', groupId]);
      setShowAdd(false);
      setForm({ title: '', amount: '', type: 'expense', category: 'Sonstiges', date: new Date().toISOString().split('T')[0] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/finance/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['group-finance', groupId]);
      qc.invalidateQueries(['group-finance-summary', groupId]);
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-orange-500" /></div>;

  const income = summary?.income || 0;
  const expense = summary?.expense || 0;
  const balance = income - expense;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div style={{ padding: '12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
            <TrendingUp size={12} style={{ color: '#22c55e' }} />
            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Einnahmen</p>
          </div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#22c55e', margin: 0 }}>+{income.toFixed(2)}€</p>
        </div>
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
            <TrendingDown size={12} style={{ color: '#ef4444' }} />
            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Ausgaben</p>
          </div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444', margin: 0 }}>-{expense.toFixed(2)}€</p>
        </div>
        <div style={{ padding: '12px', background: balance >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${balance >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px' }}>Bilanz</p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: balance >= 0 ? '#22c55e' : '#ef4444', margin: 0 }}>{balance >= 0 ? '+' : ''}{balance.toFixed(2)}€</p>
        </div>
      </div>

      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#3a3a3a] hover:border-orange-500/50 text-slate-500 hover:text-orange-500 rounded-xl text-sm transition-colors">
        <Plus size={14} /> Buchung hinzufügen
      </button>

      {items.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Noch keine Buchungen in dieser Gruppe</p>}

      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#161616', borderRadius: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.type === 'income' ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: '0 0 2px' }}>{item.title}</p>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{item.creator_name} · {item.category} · {format(new Date(item.date), 'd. MMM', { locale: de })}</p>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: item.type === 'income' ? '#22c55e' : '#ef4444', flexShrink: 0 }}>
            {item.type === 'income' ? '+' : '-'}{parseFloat(item.amount).toFixed(2)}€
          </span>
          <button onClick={() => deleteMutation.mutate(item.id)} style={{ padding: '6px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', lineHeight: 0, flexShrink: 0 }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Buchung hinzufügen" size="sm">
        <div className="space-y-3">
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ v: 'expense', l: '− Ausgabe', c: '#ef4444', bg: 'rgba(239,68,68,0.1)' }, { v: 'income', l: '+ Einnahme', c: '#22c55e', bg: 'rgba(34,197,94,0.1)' }].map(t => (
              <button key={t.v} onClick={() => setForm(f => ({ ...f, type: t.v }))}
                style={{ flex: 1, padding: '8px', borderRadius: '10px', border: `1px solid ${form.type === t.v ? t.c : '#2a2a2a'}`, background: form.type === t.v ? t.bg : '#1e1e1e', color: form.type === t.v ? t.c : '#6b7280', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s' }}>
                {t.l}
              </button>
            ))}
          </div>
          <div><label className="block text-xs text-slate-400 mb-1">Titel *</label>
            <input className="w-full px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div><label className="block text-xs text-slate-400 mb-1">Betrag (€) *</label>
              <input type="number" step="0.01" min="0" className="w-full px-3 py-2 text-sm" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Datum</label>
              <input type="date" className="w-full px-3 py-2 text-sm" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-400">Abbrechen</button>
            <button onClick={() => addMutation.mutate(form)} disabled={!form.title || !form.amount || addMutation.isPending}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
              {addMutation.isPending && <Loader2 size={13} className="animate-spin" />} Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function Groups() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  const [showCreate, setShowCreate] = useState(false);
  const [showInviteEmail, setShowInviteEmail] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'general' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: groups = [], isLoading } = useQuery({ queryKey: ['groups'], queryFn: () => api.get('/groups') });
  const { data: members = [] } = useQuery({
    queryKey: ['group-members', selected?.id],
    queryFn: () => api.get(`/groups/${selected.id}/members`),
    enabled: !!selected?.id
  });

  const createMutation = useMutation({
    mutationFn: data => api.post('/groups', data),
    onSuccess: g => { qc.invalidateQueries(['groups']); setShowCreate(false); setForm({ name: '', description: '', type: 'general' }); selectGroup(g); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/groups/${id}`),
    onSuccess: () => { qc.invalidateQueries(['groups']); setSelected(null); }
  });

  const inviteEmailMutation = useMutation({
    mutationFn: ({ id, email }) => api.post(`/groups/${id}/members`, { email }),
    onSuccess: () => { qc.invalidateQueries(['group-members', selected?.id]); setShowInviteEmail(false); setInviteEmail(''); setError(''); },
    onError: err => setError(err.error || 'Fehler')
  });

  const joinMutation = useMutation({
    mutationFn: code => api.post('/groups/join', { code }),
    onSuccess: ({ group }) => { qc.invalidateQueries(['groups']); setShowJoin(false); setJoinCode(''); setError(''); selectGroup(group); },
    onError: err => setError(err.error || 'Ungültiger Code')
  });

  const removeMutation = useMutation({
    mutationFn: ({ groupId, userId }) => api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries(['group-members', selected?.id])
  });

  const regenCodeMutation = useMutation({
    mutationFn: id => api.post(`/groups/${id}/regenerate-code`),
    onSuccess: data => { setSelected(s => ({ ...s, invite_code: data.invite_code })); qc.invalidateQueries(['groups']); }
  });

  const roleMutation = useMutation({
    mutationFn: ({ groupId, userId, role }) => api.patch(`/groups/${groupId}/members/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries(['group-members', selected?.id])
  });

  const selectGroup = (g) => { setSelected(g); setActiveTab('members'); };
  const isAdmin = selected && members.find(m => m.id === user?.id)?.role === 'admin';

  const TABS = [
    { id: 'members', label: 'Mitglieder', icon: Users },
    { id: 'tasks', label: 'Aufgaben', icon: CheckSquare },
    { id: 'documents', label: 'Dokumente', icon: FileText },
    { id: 'calendar', label: 'Kalender', icon: Calendar },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'finance', label: 'Finanzen', icon: DollarSign },
  ];

  // ── Gruppen-Detailansicht ─────────────────────────────────────────────────
  if (selected) {
    const cfg = TYPE_CONFIG[selected.type] || TYPE_CONFIG.general;
    const TypeIcon = cfg.icon;
    return (
      <div className="space-y-5">
        {/* Hero-Header mit Gradient */}
        <div style={{
          background: `linear-gradient(135deg, ${cfg.color}1a, ${cfg.color}05)`,
          border: `1px solid ${cfg.color}33`,
          borderRadius: '16px', padding: '16px 18px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <button onClick={() => setSelected(null)}
            style={{
              padding: '8px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.07)', color: '#cbd5e1',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; e.currentTarget.style.color = '#cbd5e1'; }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{
            width: 50, height: 50, borderRadius: '12px', flexShrink: 0,
            background: `${cfg.color}33`, border: `1px solid ${cfg.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, color: cfg.color,
          }}>
            {selected.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', color: cfg.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <TypeIcon size={11} /> {cfg.label}
            </p>
            <h1 style={{ fontSize: '20px', color: '#fff', fontWeight: 700, margin: '3px 0 2px', lineHeight: 1.2, wordBreak: 'break-word' }}>{selected.name}</h1>
            {selected.description && <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.description}</p>}
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <Users size={12} /> {members.length}
          </span>
          {isAdmin && selected.created_by === user?.id && (
            <button onClick={() => deleteMutation.mutate(selected.id)}
              style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Tabs – scrollbar auf Mobile */}
        <div className="flex gap-1 bg-[#1a1a1a] p-1 rounded-xl overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-1 justify-center ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-white hover:bg-[#2a2a2a]'}`}>
                <Icon size={13} />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'members' && (
            <MembersTab group={selected} members={members} isAdmin={isAdmin} user={user}
              onInvite={() => { setShowInviteEmail(true); setError(''); }}
              removeMutation={removeMutation} regenCodeMutation={regenCodeMutation} roleMutation={roleMutation} />
          )}
          {activeTab === 'tasks' && <TasksTab groupId={selected.id} />}
          {activeTab === 'documents' && <DocumentsTab groupId={selected.id} />}
          {activeTab === 'calendar' && <CalendarTab groupId={selected.id} />}
          {activeTab === 'chat' && <ChatTab groupId={selected.id} currentUser={user} />}
          {activeTab === 'finance' && <FinanceTab groupId={selected.id} />}
        </div>

        {/* Invite Modal */}
        <Modal open={showInviteEmail} onClose={() => { setShowInviteEmail(false); setError(''); }} title="Per E-Mail einladen" size="sm">
          <div className="space-y-4">
            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">E-Mail-Adresse</label>
              <input type="email" className="w-full px-3.5 py-2.5 text-sm" placeholder="email@example.com"
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <p className="text-xs text-slate-500 mt-1.5">Der Benutzer muss bereits ein Konto haben.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowInviteEmail(false); setError(''); }} className="px-4 py-2 text-sm text-slate-400">Abbrechen</button>
              <button onClick={() => inviteEmailMutation.mutate({ id: selected?.id, email: inviteEmail })}
                disabled={!inviteEmail || inviteEmailMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
                {inviteEmailMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Einladen
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ── Gruppen-Liste ─────────────────────────────────────────────────────────
  // Typ-Counts für CategoryCards
  const typeCounts = useMemo(() => {
    const m = { household: 0, work: 0, general: 0 };
    for (const g of groups) m[g.type] = (m[g.type] || 0) + 1;
    return m;
  }, [groups]);

  const totalMembers = useMemo(() => groups.reduce((s, g) => s + (g.member_count || 0), 0), [groups]);
  const adminGroups  = useMemo(() => groups.filter(g => g.created_by === user?.id).length, [groups, user]);

  const filteredGroups = typeFilter ? groups.filter(g => g.type === typeFilter) : groups;

  return (
    <div className="space-y-5">
      {/* ═══ Kopfzeile ═══ */}
      <PageHeader
        icon={Users}
        title="Gruppen"
        subtitle="Haushalt, Arbeit & Co. — gemeinsam organisieren"
        action={
          <div className="flex gap-2">
            <button onClick={() => { setShowJoin(true); setError(''); setJoinCode(''); }}
              className="flex items-center gap-2 px-3 py-2 bg-[#141414] border border-[#1e1e1e] hover:border-orange-500/40 text-slate-300 rounded-xl text-sm transition-colors">
              <LogIn size={14} /> Beitreten
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
              <Plus size={16} /> Neue Gruppe
            </button>
          </div>
        }
      />

      {/* ═══ Stats ═══ */}
      {!isLoading && groups.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <StatCard icon={Layers} label="Gruppen"   value={groups.length}  color="#f97316" />
          <StatCard icon={Users}  label="Mitglieder gesamt" value={totalMembers} color="#3b82f6" hint="alle Gruppen" />
          <StatCard icon={Crown}  label="Admin"     value={adminGroups}    color="#f59e0b" hint="von dir erstellt" />
          <StatCard icon={Home}   label="Haushalt"  value={typeCounts.household} color="#22c55e"
            onClick={() => setTypeFilter(typeFilter === 'household' ? '' : 'household')}
            active={typeFilter === 'household'} />
        </div>
      )}

      {/* ═══ Typ-Filter (CategoryCards) ═══ */}
      {!isLoading && groups.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Typ filtern</p>
          <div className="tab-scroll" style={{ gap: '8px' }}>
            <CategoryCard icon={Layers} label="Alle" color="#f97316" count={groups.length}
              active={!typeFilter} onClick={() => setTypeFilter('')} />
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <CategoryCard key={key} icon={cfg.icon} label={cfg.label} color={cfg.color}
                count={typeCounts[key] || 0} active={typeFilter === key}
                onClick={() => setTypeFilter(typeFilter === key ? '' : key)} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Liste / EmptyState ═══ */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
      ) : groups.length === 0 ? (
        <EmptyState icon={Users} title="Noch keine Gruppen"
          message="Erstelle eine neue Gruppe oder tritt einer bestehenden per Code bei"
          actionLabel="Gruppe erstellen" onAction={() => setShowCreate(true)} />
      ) : filteredGroups.length === 0 ? (
        <EmptyState icon={Users} title="Keine Gruppen gefunden"
          message={`Keine ${TYPE_CONFIG[typeFilter]?.label || ''}-Gruppen — Filter zurücksetzen?`}
          actionLabel="Filter zurücksetzen" onAction={() => setTypeFilter('')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredGroups.map(g => <GroupCard key={g.id} group={g} onSelect={selectGroup} />)}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Neue Gruppe erstellen">
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Name *</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="z.B. Familie Müller" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Typ</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="household">Haushalt</option>
              <option value="work">Arbeit</option>
              <option value="general">Allgemein</option>
            </select></div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400">Abbrechen</button>
            <button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 shadow-md shadow-orange-500/20">
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />} Erstellen
            </button>
          </div>
        </div>
      </Modal>

      {/* Join Modal */}
      <Modal open={showJoin} onClose={() => { setShowJoin(false); setError(''); }} title="Gruppe beitreten" size="sm">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Einladungscode</label>
            <input className="w-full px-3.5 py-2.5 text-sm font-mono tracking-widest uppercase text-center text-xl"
              placeholder="XXXXXXXX" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={8} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowJoin(false); setError(''); }} className="px-4 py-2 text-sm text-slate-400">Abbrechen</button>
            <button onClick={() => joinMutation.mutate(joinCode)} disabled={joinCode.length < 4 || joinMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {joinMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />} Beitreten
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
