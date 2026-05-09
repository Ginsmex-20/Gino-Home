import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, FileText, Calendar as CalIcon, Users, ArrowLeft,
  Plus, Trash2, Loader2, UserMinus, Crown, Hash, RefreshCw, Copy,
  Edit, Upload, Search, Download, Image, File, Clock, Home,
  ChevronLeft, ChevronRight, Briefcase, Star, Euro, Send, X, BookOpen,
  ArrowDownUp, Film, Music, Archive, FileCode,
  FileSignature, Receipt, CreditCard, Shield, Banknote, Folder,
  BellRing, Paperclip, CheckCircle2, Eye, FolderOpen, LayoutGrid,
  List as ListIcon, AlertTriangle, Square,
} from 'lucide-react';
import { StatCard, CategoryCard, EmptyState, WarningBanner } from '../components/ui';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths
} from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';
import useAuth from '../stores/auth';
import { getSocket } from '../api/socket';
import NotizenPage from './Notizen';

// ── Shared constants ─────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: 'todo',        label: 'To-do',         color: 'bg-slate-700 text-slate-200' },
  { value: 'in_progress', label: 'In Bearbeitung', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'done',        label: 'Erledigt',       color: 'bg-green-500/20 text-green-400' },
  { value: 'archiv',      label: 'Archiv',         color: 'bg-purple-500/20 text-purple-400' },
];
const PRIO_OPTS = [
  { value: 'low',    label: 'Niedrig', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'medium', label: 'Mittel',  color: 'bg-amber-500/20 text-amber-400' },
  { value: 'high',   label: 'Hoch',    color: 'bg-red-500/20 text-red-400' },
];
const CATS     = ['Alle', 'Vertrag', 'Rechnung', 'Ausweis', 'Versicherung', 'Steuern', 'Sonstiges'];
const CAT_VALS = ['contract', 'invoice', 'identity', 'insurance', 'tax', 'other'];
const COLORS   = ['#f97316','#2563eb','#16a34a','#dc2626','#d97706','#db2777','#0891b2'];

const typeIcons  = { household: Home, work: Briefcase, general: Star };
const typeLabels = { household: 'Haushalt', work: 'Arbeit', general: 'Allgemein' };
const typeBg     = {
  household: 'bg-green-500/10 text-green-400',
  work:      'bg-blue-500/10 text-blue-400',
  general:   'bg-orange-500/10 text-orange-500',
};

function PriBadge({ priority }) {
  const opt = PRIO_OPTS.find(o => o.value === priority) || PRIO_OPTS[1];
  return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.label}</span>;
}
function fileIcon(mime) {
  if (!mime) return <File size={18} className="text-slate-400" />;
  if (mime.startsWith('image/'))   return <Image   size={18} className="text-purple-400" />;
  if (mime.includes('pdf'))        return <FileText size={18} className="text-red-400" />;
  if (mime.startsWith('video/'))   return <Film    size={18} className="text-pink-400" />;
  if (mime.startsWith('audio/'))   return <Music   size={18} className="text-green-400" />;
  if (['zip','rar','tar'].some(k => mime.includes(k))) return <Archive size={18} className="text-yellow-400" />;
  if (mime.includes('word') || mime.includes('document'))     return <FileText size={18} className="text-blue-400" />;
  if (mime.includes('excel') || mime.includes('spreadsheet')) return <FileText size={18} className="text-emerald-400" />;
  if (mime.startsWith('text/')) return <FileCode size={18} className="text-cyan-400" />;
  return <File size={18} className="text-slate-400" />;
}
function formatSize(b) {
  if (!b) return '–';
  if (b < 1024)        return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: AUFGABEN
// ════════════════════════════════════════════════════════════════════════════
function TasksTab({ groupId, groupName }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const emptyForm = { title: '', description: '', status: 'todo', priority: 'medium', due_date: '', budget: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [archiveSearch, setArchiveSearch] = useState('');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['group-tasks', groupId],
    queryFn:  () => api.get(`/tasks?group_id=${groupId}`)
  });

  const saveMutation = useMutation({
    mutationFn: data => editing
      ? api.put(`/tasks/${editing.id}`, data)
      : api.post('/tasks', { ...data, group_id: groupId }),
    onSuccess: () => { qc.invalidateQueries(['group-tasks', groupId]); setShowModal(false); setEditing(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/tasks/${id}`),
    onSuccess:  () => qc.invalidateQueries(['group-tasks', groupId])
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess:  () => qc.invalidateQueries(['group-tasks', groupId])
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = t  => { setEditing(t); setForm({ ...emptyForm, ...t, due_date: t.due_date || '', budget: t.budget || '', notes: t.notes || '' }); setShowModal(true); };

  const grouped = STATUS_OPTS.reduce((acc, s) => {
    acc[s.value] = tasks.filter(t => t.status === s.value);
    return acc;
  }, {});

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{tasks.length} Aufgabe{tasks.length !== 1 ? 'n' : ''} in dieser Gruppe</p>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
          <Plus size={15} /> Aufgabe
        </button>
      </div>

      <div className="kanban-scroll md:grid md:grid-cols-2 xl:grid-cols-4">
        {STATUS_OPTS.map(({ value, label, color }) => (
          <div key={value} className="kanban-col md:min-w-0 bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-4">
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${color}`}>{label}</span>
                <span className="text-xs text-slate-500 bg-[#161616] px-2 py-0.5 rounded-full">{grouped[value]?.length || 0}</span>
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
            <div className="space-y-2">
              {grouped[value]?.length === 0 && (
                <p className="text-xs text-slate-700 text-center py-2">Keine Aufgaben</p>
              )}
              {(() => {
                const displayedTasks = value === 'archiv'
                  ? (grouped[value] || []).filter(t => !archiveSearch || t.title.toLowerCase().includes(archiveSearch.toLowerCase()) || (t.description || '').toLowerCase().includes(archiveSearch.toLowerCase()))
                  : (grouped[value] || []);
                return displayedTasks.map(task => (
                  <div key={task.id} className="bg-[#161616] hover:bg-[#1a1a1a] rounded-xl p-3 group transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate flex-1">{task.title}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => openEdit(task)} className="p-1 text-slate-500 hover:text-white rounded transition-colors"><Edit size={12} /></button>
                        <button onClick={() => deleteMutation.mutate(task.id)} className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {task.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <PriBadge priority={task.priority} />
                      {task.due_date && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10} />{format(new Date(task.due_date), 'd. MMM', { locale: de })}</span>}
                      {task.creator_name && task.creator_name !== task.assignee_name && <span className="text-xs text-slate-600">von {task.creator_name}</span>}
                    </div>
                    {value !== 'done' && value !== 'archiv' && (
                      <div className="mt-2 pt-2 border-t border-[#2a2a2a]">
                        <select className="w-full text-xs py-1 px-2 rounded-lg bg-[#222] border border-[#333] text-slate-300"
                          value={task.status} onChange={e => statusMutation.mutate({ id: task.id, status: e.target.value })}>
                          {STATUS_OPTS.filter(s => s.value !== 'archiv').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2"><label className="block text-sm text-slate-400 mb-1.5">Titel *</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="col-span-1 sm:col-span-2"><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Status</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTS.filter(s => s.value !== 'archiv').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Priorität</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIO_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Fälligkeitsdatum</label>
            <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Budget (€)</label>
            <input type="number" className="w-full px-3.5 py-2.5 text-sm" placeholder="0.00" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
          <div className="col-span-2"><label className="block text-sm text-slate-400 mb-1.5">Hinweise</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#2a2a2a]">
          <button onClick={() => { setShowModal(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
          <button onClick={() => saveMutation.mutate(form)} disabled={!form.title || saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 shadow-md shadow-orange-500/20">
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {editing ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: DOKUMENTE
// ════════════════════════════════════════════════════════════════════════════
const DOC_FILE_TYPES = [
  { label: 'Alle Typen', value: '' },
  { label: 'Bilder',     value: 'image' },
  { label: 'PDFs',       value: 'pdf' },
  { label: 'Videos',     value: 'video' },
  { label: 'Audio',      value: 'audio' },
  { label: 'Office',     value: 'office' },
  { label: 'Archive',    value: 'archive' },
];

const DOC_CATS = [
  { label: 'Alle',         value: '' },
  { label: 'Vertrag',      value: 'contract' },
  { label: 'Rechnung',     value: 'invoice' },
  { label: 'Ausweis',      value: 'identity' },
  { label: 'Versicherung', value: 'insurance' },
  { label: 'Steuern',      value: 'tax' },
  { label: 'Sonstiges',    value: 'other' },
];

const DOC_IMPORTANCE = {
  dringend: { label: 'Dringend', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',     border: '#ef4444' },
  wichtig:  { label: 'Wichtig',  color: '#f97316', bg: 'rgba(249,115,22,0.1)',    border: '#f97316' },
  normal:   { label: 'Normal',   color: '#64748b', bg: 'rgba(100,116,139,0.08)',  border: 'transparent' },
  archiv:   { label: 'Archiv',   color: '#334155', bg: 'rgba(51,65,85,0.15)',     border: '#1e293b' },
};

function matchesMime(mime, filter) {
  if (!filter) return true;
  if (filter === 'image')   return mime?.startsWith('image/');
  if (filter === 'pdf')     return mime?.includes('pdf');
  if (filter === 'video')   return mime?.startsWith('video/');
  if (filter === 'audio')   return mime?.startsWith('audio/');
  if (filter === 'office')  return mime?.includes('word') || mime?.includes('excel') || mime?.includes('powerpoint') || mime?.includes('spreadsheet') || mime?.includes('presentation') || mime?.includes('openxmlformats');
  if (filter === 'archive') return mime?.includes('zip') || mime?.includes('rar') || mime?.includes('7z') || mime?.includes('tar') || mime?.includes('gzip');
  return true;
}

function DocPill({ active, onClick, children, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <button onClick={onClick} style={{
        padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
        whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
        background: active ? '#f97316' : 'transparent',
        color: active ? '#fff' : '#94a3b8',
        border: active ? '1px solid #f97316' : '1px solid #2a2a2a',
      }}>{children}</button>
      {onDelete && (
        <button onClick={onDelete} style={{ color: '#475569', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, padding: '2px' }}>
          <X size={11} />
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB: DOKUMENTE (Gruppe) — gleicher Stil wie persönliche Dokumente
   ════════════════════════════════════════════════════════════════════ */
const GROUP_CAT_CONFIG = {
  contract:  { label: 'Verträge',     icon: FileSignature, color: '#3b82f6' },
  invoice:   { label: 'Rechnungen',   icon: Receipt,        color: '#f97316' },
  identity:  { label: 'Ausweise',     icon: CreditCard,     color: '#a855f7' },
  insurance: { label: 'Versicherung', icon: Shield,         color: '#06b6d4' },
  tax:       { label: 'Steuern',      icon: Banknote,       color: '#10b981' },
  other:     { label: 'Sonstiges',    icon: Folder,         color: '#64748b' },
};
const GROUP_CAT_KEYS = Object.keys(GROUP_CAT_CONFIG);

const GROUP_FILE_TYPES = [
  { label: 'Alle Typen', value: '' },
  { label: 'Bilder',     value: 'image' },
  { label: 'PDFs',       value: 'pdf' },
  { label: 'Videos',     value: 'video' },
  { label: 'Audio',      value: 'audio' },
  { label: 'Office',     value: 'office' },
  { label: 'Archive',    value: 'archive' },
];

function getDocDueUrgency(due_date, paid) {
  if (!due_date) return null;
  if (paid) return { level: 'paid', label: 'Bezahlt', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: '#22c55e' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(due_date);
  const diffDays = Math.ceil((due - today) / 86400000);
  if (diffDays < 0)   return { level: 'overdue',  label: `Überfällig (${Math.abs(diffDays)}T)`, color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: '#ef4444' };
  if (diffDays === 0) return { level: 'today',    label: 'Heute fällig!',          color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: '#f97316' };
  if (diffDays <= 7)  return { level: 'soon',     label: `Fällig in ${diffDays}T`, color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: '#f97316' };
  if (diffDays <= 30) return { level: 'upcoming', label: `Fällig in ${diffDays}T`, color: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: '#eab308' };
  return { level: 'ok', label: format(due, 'd. MMM yyyy', { locale: de }), color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'transparent' };
}

/* Detail-Modal mit Anhängen */
function GroupDocDetailModal({ open, doc, onClose, onEdit, onDelete }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', doc?.id],
    queryFn: () => api.get(`/documents/${doc.id}/attachments`),
    enabled: !!doc?.id && open,
  });

  const addAttachMut = useMutation({
    mutationFn: (files) => {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      return api.post(`/documents/${doc.id}/attachments`, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries(['attachments', doc.id]);
      qc.invalidateQueries(['group-docs']);
      setUploading(false);
    },
    onError: () => setUploading(false),
  });

  const delAttachMut = useMutation({
    mutationFn: (id) => api.delete(`/documents/attachments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['attachments', doc.id]);
      qc.invalidateQueries(['group-docs']);
    },
  });

  const handleAttach = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    addAttachMut.mutate(files);
    e.target.value = '';
  };

  if (!doc) return null;
  const cat = GROUP_CAT_CONFIG[doc.category] || GROUP_CAT_CONFIG.other;
  const CatIcon = cat.icon;
  const urg = getDocDueUrgency(doc.due_date, doc.paid);
  const imp = doc.importance || 'normal';
  const impCfg = DOC_IMPORTANCE[imp] || DOC_IMPORTANCE.normal;

  return (
    <Modal open={open} onClose={onClose} title={null} size="lg">
      <div style={{ marginTop: '-8px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${cat.color}1a, ${cat.color}05)`,
          border: `1px solid ${cat.color}33`, borderRadius: '14px', padding: '16px 18px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: `${cat.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CatIcon size={22} color={cat.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', color: cat.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {cat.label}{doc.subcategory ? ` › ${doc.subcategory}` : ''}
            </p>
            <p style={{ fontSize: '18px', color: '#fff', fontWeight: 700, margin: '3px 0', lineHeight: 1.2, wordBreak: 'break-word' }}>{doc.title}</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {urg && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: urg.bg, color: urg.color, border: `1px solid ${urg.border}66` }}>
                  {doc.paid ? <CheckCircle2 size={11} /> : <CalIcon size={11} />} {urg.label}
                </span>
              )}
              {imp !== 'normal' && (
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: impCfg.bg, color: impCfg.color, border: `1px solid ${impCfg.border}` }}>
                  {impCfg.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {doc.description && (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Beschreibung</p>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{doc.description}</p>
          </div>
        )}

        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Hauptdatei</p>
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {fileIcon(doc.mimetype)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', color: '#fff', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{formatSize(doc.size)} · {doc.uploader_name || '—'} · {format(new Date(doc.created_at), 'd. MMM yyyy', { locale: de })}</p>
          </div>
          <a href={doc.filepath} download target="_blank" rel="noreferrer"
            style={{ padding: '7px 12px', background: '#1e1e1e', color: '#cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
            <Download size={13} /> Download
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Paperclip size={12} /> Anhänge {attachments.length > 0 && <span style={{ background: '#f97316', color: '#fff', borderRadius: '8px', padding: '1px 7px', fontSize: '10px' }}>{attachments.length}</span>}
          </p>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Datei{uploading ? ' wird hochgeladen…' : ' hinzufügen'}
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleAttach} />
        </div>

        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}><Loader2 size={18} className="animate-spin text-orange-500 mx-auto" /></div>
          ) : attachments.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
              <Paperclip size={20} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
              <p style={{ margin: 0 }}>Keine zusätzlichen Dateien</p>
              <p style={{ margin: '3px 0 0', fontSize: '11px' }}>Mehrere Dateien können hier angehängt werden (z.B. Mahnung zur Rechnung)</p>
            </div>
          ) : (
            attachments.map((att, idx) => (
              <div key={att.id} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: idx > 0 ? '1px solid #1e1e1e' : 'none' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {fileIcon(att.mimetype)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</p>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0' }}>{formatSize(att.size)} · {format(new Date(att.created_at), 'd. MMM yyyy', { locale: de })}</p>
                </div>
                <a href={att.filepath} download target="_blank" rel="noreferrer" style={{ padding: '6px', color: '#64748b', borderRadius: '6px', display: 'flex' }}><Download size={13} /></a>
                <button onClick={() => { if (confirm('Anhang löschen?')) delAttachMut.mutate(att.id); }}
                  style={{ padding: '6px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', display: 'flex' }}><Trash2 size={13} /></button>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #1e1e1e', paddingTop: '14px' }}>
          <button onClick={() => onDelete(doc.id)}
            style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trash2 size={13} /> Löschen
          </button>
          <button onClick={() => onEdit(doc)}
            style={{ padding: '8px 14px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit size={13} /> Bearbeiten
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DocumentsTab({ groupId }) {
  const qc = useQueryClient();
  const fileRef = useRef();

  const [search, setSearch]               = useState('');
  const [catFilter, setCatFilter]         = useState('');
  const [subFilter, setSubFilter]         = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [sortBy, setSortBy]               = useState('importance');
  const [importanceFilter, setImpFilter]  = useState('');
  const [dueFilter, setDueFilter]         = useState('');
  const [viewMode, setViewMode]           = useState('list');

  const [showUpload, setShowUpload]   = useState(false);
  const [showEdit, setShowEdit]       = useState(false);
  const [editDoc, setEditDoc]         = useState(null);
  const [detailDoc, setDetailDoc]     = useState(null);

  const [uploadForm, setUploadForm]   = useState({ title: '', category: 'invoice', subcategory: '', description: '', due_date: '', paid: false, importance: 'normal' });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editForm, setEditForm]       = useState({ title: '', category: '', subcategory: '', description: '', importance: 'normal', starred: 0, due_date: '', paid: false });
  const [uploadError, setUploadError] = useState('');

  const [showNewCat, setShowNewCat]   = useState(false);
  const [newCatName, setNewCatName]   = useState('');
  const [showNewSub, setShowNewSub]   = useState(false);
  const [newSubName, setNewSubName]   = useState('');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['group-docs', groupId, catFilter],
    queryFn: () => api.get(`/documents?group_id=${groupId}` + (catFilter ? `&category=${catFilter}` : '')),
  });
  const { data: customCats = [] } = useQuery({
    queryKey: ['doc-categories', groupId],
    queryFn: () => api.get(`/documents/categories?group_id=${groupId}`),
  });
  const { data: filterSubs = [] } = useQuery({
    queryKey: ['doc-subcategories-filter', groupId, catFilter],
    queryFn: () => catFilter ? api.get(`/documents/subcategories?group_id=${groupId}&parent_category=${encodeURIComponent(catFilter)}`) : Promise.resolve([]),
    enabled: !!catFilter,
  });
  const { data: uploadSubs = [] } = useQuery({
    queryKey: ['doc-subcategories-upload', groupId, uploadForm.category],
    queryFn: () => api.get(`/documents/subcategories?group_id=${groupId}&parent_category=${encodeURIComponent(uploadForm.category)}`),
    enabled: !!uploadForm.category,
  });
  const { data: editSubs = [] } = useQuery({
    queryKey: ['doc-subcategories-edit', groupId, editForm.category],
    queryFn: () => editForm.category ? api.get(`/documents/subcategories?group_id=${groupId}&parent_category=${encodeURIComponent(editForm.category)}`) : Promise.resolve([]),
    enabled: !!editForm.category,
  });

  const addCatMut = useMutation({ mutationFn: name => api.post('/documents/categories', { name, group_id: groupId }), onSuccess: () => { qc.invalidateQueries(['doc-categories', groupId]); setNewCatName(''); setShowNewCat(false); } });
  const delCatMut = useMutation({ mutationFn: id => api.delete(`/documents/categories/${id}`), onSuccess: () => { qc.invalidateQueries(['doc-categories', groupId]); if (catFilter) setCatFilter(''); } });
  const addSubMut = useMutation({ mutationFn: ({ name, parent }) => api.post('/documents/subcategories', { name, parent_category: parent, group_id: groupId }), onSuccess: (_, { parent }) => { qc.invalidateQueries(['doc-subcategories-filter', groupId, parent]); qc.invalidateQueries(['doc-subcategories-upload', groupId, parent]); setNewSubName(''); setShowNewSub(false); } });
  const delSubMut = useMutation({ mutationFn: id => api.delete(`/documents/subcategories/${id}`), onSuccess: () => { qc.invalidateQueries(['doc-subcategories-filter', groupId, catFilter]); if (subFilter) setSubFilter(''); } });

  const uploadMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('file', selectedFiles[0]);
      fd.append('title', uploadForm.title || selectedFiles[0].name);
      fd.append('category', uploadForm.category);
      fd.append('subcategory', uploadForm.subcategory || '');
      fd.append('description', uploadForm.description);
      fd.append('group_id', groupId);
      if (uploadForm.due_date) fd.append('due_date', uploadForm.due_date);
      fd.append('paid', uploadForm.paid ? '1' : '0');
      const main = await api.post('/documents/upload', fd);
      if (uploadForm.importance && uploadForm.importance !== 'normal') {
        await api.put(`/documents/${main.id}`, { ...main, importance: uploadForm.importance });
      }
      if (selectedFiles.length > 1) {
        const fd2 = new FormData();
        for (let i = 1; i < selectedFiles.length; i++) fd2.append('files', selectedFiles[i]);
        await api.post(`/documents/${main.id}/attachments`, fd2);
      }
      return main;
    },
    onSuccess: () => {
      qc.invalidateQueries(['group-docs', groupId]);
      setShowUpload(false); setSelectedFiles([]);
      setUploadForm({ title: '', category: 'invoice', subcategory: '', description: '', due_date: '', paid: false, importance: 'normal' });
      setUploadError('');
    },
    onError: err => setUploadError(err?.error || err?.message || 'Upload fehlgeschlagen'),
  });

  const editMut = useMutation({ mutationFn: ({ id, data }) => api.put(`/documents/${id}`, data), onSuccess: () => { qc.invalidateQueries(['group-docs', groupId]); setShowEdit(false); } });
  const delMut  = useMutation({ mutationFn: id => api.delete(`/documents/${id}`), onSuccess: () => { qc.invalidateQueries(['group-docs', groupId]); setDetailDoc(null); } });
  const starMut = useMutation({ mutationFn: id => api.patch(`/documents/${id}/star`, {}), onSuccess: () => qc.invalidateQueries(['group-docs', groupId]) });
  const paidMut = useMutation({ mutationFn: id => api.patch(`/documents/${id}/paid`, {}), onSuccess: () => qc.invalidateQueries(['group-docs', groupId]) });

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const overdueDocs = useMemo(() => docs.filter(d => d.due_date && !d.paid && new Date(d.due_date) < today), [docs, today]);
  const soonDocs    = useMemo(() => docs.filter(d => d.due_date && !d.paid && new Date(d.due_date) >= today && Math.ceil((new Date(d.due_date) - today) / 86400000) <= 7), [docs, today]);
  const pendingDocs = useMemo(() => docs.filter(d => d.due_date && !d.paid), [docs]);
  const paidCount   = useMemo(() => docs.filter(d => d.paid).length, [docs]);
  const catCounts = useMemo(() => {
    const counts = {};
    for (const k of GROUP_CAT_KEYS) counts[k] = 0;
    for (const c of customCats) counts[c.name] = 0;
    for (const d of docs) counts[d.category] = (counts[d.category] || 0) + 1;
    return counts;
  }, [docs, customCats]);

  const filtered = docs.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && !matchesMime(d.mimetype, typeFilter)) return false;
    if (subFilter && d.subcategory !== subFilter) return false;
    if (dueFilter === 'overdue') return d.due_date && !d.paid && new Date(d.due_date) < today;
    if (dueFilter === 'pending') return d.due_date && !d.paid;
    if (dueFilter === 'paid')    return d.paid;
    return true;
  });

  const sortedFiltered = [...filtered]
    .filter(d => importanceFilter === 'starred' ? d.starred : (importanceFilter ? d.importance === importanceFilter : true))
    .sort((a, b) => {
      if (sortBy === 'importance') {
        const order = { dringend: 0, wichtig: 1, normal: 2, archiv: 3 };
        const diff = (order[a.importance] ?? 2) - (order[b.importance] ?? 2);
        if (diff !== 0) return diff;
        if (b.starred !== a.starred) return b.starred - a.starred;
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === 'date') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'due') {
        const da = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
        const dbb = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
        return da - dbb;
      }
      return 0;
    });

  const selectCat = val => { setCatFilter(val); setSubFilter(''); };
  const openEditFromDetail = (doc) => {
    setDetailDoc(null);
    setEditDoc(doc);
    setEditForm({ title: doc.title, category: doc.category || 'other', subcategory: doc.subcategory || '', description: doc.description || '', importance: doc.importance || 'normal', starred: doc.starred || 0, due_date: doc.due_date || '', paid: !!doc.paid });
    setShowEdit(true);
  };

  return (
    <div className="space-y-5">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => { setUploadError(''); setShowUpload(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
          <Upload size={16} /> Hochladen
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <StatCard icon={FolderOpen}    label="Gesamt"     value={docs.length}        color="#f97316" onClick={() => setDueFilter('')} active={!dueFilter} />
        <StatCard icon={AlertTriangle} label="Überfällig" value={overdueDocs.length} color="#ef4444" onClick={() => setDueFilter(dueFilter === 'overdue' ? '' : 'overdue')} active={dueFilter === 'overdue'} />
        <StatCard icon={CalIcon}       label="Ausstehend" value={pendingDocs.length} color="#f97316" onClick={() => setDueFilter(dueFilter === 'pending' ? '' : 'pending')} active={dueFilter === 'pending'} />
        <StatCard icon={CheckCircle2}  label="Bezahlt"    value={paidCount}          color="#22c55e" onClick={() => setDueFilter(dueFilter === 'paid' ? '' : 'paid')}       active={dueFilter === 'paid'} />
      </div>

      {/* Warning */}
      {(overdueDocs.length > 0 || soonDocs.length > 0) && (
        <WarningBanner icon={BellRing} severity={overdueDocs.length > 0 ? 'critical' : 'warning'}
          onClick={() => setDueFilter(overdueDocs.length > 0 ? 'overdue' : 'pending')}>
          {overdueDocs.length > 0 && <strong style={{ color: '#ef4444' }}>{overdueDocs.length} überfällig</strong>}
          {overdueDocs.length > 0 && soonDocs.length > 0 && <span style={{ color: '#475569' }}> · </span>}
          {soonDocs.length > 0 && <span style={{ color: '#f97316', fontWeight: 600 }}>{soonDocs.length} fällig in 7 Tagen</span>}
        </WarningBanner>
      )}

      {/* Kategorie-Cards */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Kategorie</p>
          {!showNewCat && (
            <button onClick={() => setShowNewCat(true)} style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Plus size={11} /> Neue Kategorie
            </button>
          )}
        </div>
        <div className="tab-scroll" style={{ gap: '8px' }}>
          <CategoryCard icon={FolderOpen} label="Alle" color="#f97316" count={docs.length} active={!catFilter} onClick={() => selectCat('')} />
          {GROUP_CAT_KEYS.map(key => {
            const cfg = GROUP_CAT_CONFIG[key];
            return <CategoryCard key={key} icon={cfg.icon} label={cfg.label} color={cfg.color} count={catCounts[key] || 0} active={catFilter === key} onClick={() => selectCat(key)} />;
          })}
          {customCats.map(cat => (
            <CategoryCard key={cat.id} icon={Folder} label={cat.name} color={cat.color || '#f97316'}
              count={catCounts[cat.name] || 0} active={catFilter === cat.name} onClick={() => selectCat(cat.name)}
              onDelete={() => delCatMut.mutate(cat.id)} />
          ))}
          {showNewCat && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
              <input autoFocus placeholder="Name..." value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newCatName.trim()) addCatMut.mutate(newCatName.trim()); if (e.key === 'Escape') setShowNewCat(false); }}
                style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '13px', background: '#1e1e1e', border: '1px solid #f97316', color: '#fff', outline: 'none', width: '130px' }} />
              <button onClick={() => newCatName.trim() && addCatMut.mutate(newCatName.trim())} style={{ padding: '8px 10px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>+</button>
              <button onClick={() => setShowNewCat(false)} style={{ padding: '8px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Unterordner */}
      {catFilter && (
        <div className="tab-scroll" style={{ gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginRight: '4px', flexShrink: 0 }}>UNTERORDNER:</span>
          <button onClick={() => setSubFilter('')} style={{
            padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
            background: !subFilter ? '#f97316' : 'transparent', color: !subFilter ? '#fff' : '#94a3b8',
            border: !subFilter ? '1px solid #f97316' : '1px solid #2a2a2a',
          }}>Alle</button>
          {filterSubs.map(sub => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              <button onClick={() => setSubFilter(sub.name)} style={{
                padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
                background: subFilter === sub.name ? '#f97316' : 'transparent', color: subFilter === sub.name ? '#fff' : '#94a3b8',
                border: subFilter === sub.name ? '1px solid #f97316' : '1px solid #2a2a2a',
              }}>{sub.name}</button>
              <button onClick={() => delSubMut.mutate(sub.id)} style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><X size={11} /></button>
            </div>
          ))}
          {showNewSub ? (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
              <input autoFocus placeholder="z.B. Versicherungspolice..." value={newSubName} onChange={e => setNewSubName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newSubName.trim()) addSubMut.mutate({ name: newSubName.trim(), parent: catFilter }); if (e.key === 'Escape') setShowNewSub(false); }}
                style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '12px', background: '#1e1e1e', border: '1px solid #f97316', color: '#fff', outline: 'none', width: '160px' }} />
              <button onClick={() => newSubName.trim() && addSubMut.mutate({ name: newSubName.trim(), parent: catFilter })} style={{ padding: '5px 10px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>+</button>
            </div>
          ) : (
            <button onClick={() => setShowNewSub(true)} style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', color: '#64748b', background: 'transparent', border: '1px dashed #2a2a2a', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              + Unterordner
            </button>
          )}
        </div>
      )}

      {/* Smart-Bar */}
      <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input className="w-full pl-9 pr-3 py-2 text-sm rounded-lg" placeholder="Dokument suchen..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }} />
          </div>
          <div style={{ display: 'flex', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '2px' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', background: viewMode === 'list' ? '#1e1e1e' : 'transparent', color: viewMode === 'list' ? '#f97316' : '#64748b', border: 'none', cursor: 'pointer' }}><ListIcon size={14} /></button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', background: viewMode === 'grid' ? '#1e1e1e' : 'transparent', color: viewMode === 'grid' ? '#f97316' : '#64748b', border: 'none', cursor: 'pointer' }}><LayoutGrid size={14} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowDownUp size={12} color="#64748b" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#cbd5e1', padding: '5px 8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <option value="importance">Wichtigkeit</option>
              <option value="due">Fälligkeit</option>
              <option value="date">Datum</option>
              <option value="name">Name</option>
              <option value="size">Größe</option>
            </select>
          </div>
          <div style={{ width: '1px', height: '14px', background: '#1e1e1e' }} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#cbd5e1', padding: '5px 8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
            {GROUP_FILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div style={{ width: '1px', height: '14px', background: '#1e1e1e' }} />
          {[
            { key: '',         label: 'Alle' },
            { key: 'starred',  label: '⭐ Favoriten' },
            { key: 'dringend', label: 'Dringend' },
            { key: 'wichtig',  label: 'Wichtig' },
            { key: 'archiv',   label: 'Archiv' },
          ].map(f => (
            <button key={f.key} onClick={() => setImpFilter(f.key)} style={{
              padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              background: importanceFilter === f.key ? 'rgba(249,115,22,0.15)' : 'transparent',
              color: importanceFilter === f.key ? '#f97316' : '#64748b',
              border: `1px solid ${importanceFilter === f.key ? 'rgba(249,115,22,0.4)' : '#1e1e1e'}`,
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Liste / Grid / Empty */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
      ) : sortedFiltered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Keine Dokumente"
          message="Lade das erste Gruppen-Dokument hoch"
          actionLabel="Hochladen" onAction={() => setShowUpload(true)} />
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {sortedFiltered.map(doc => {
            const cat = GROUP_CAT_CONFIG[doc.category] || GROUP_CAT_CONFIG.other;
            const CatIcon = cat.icon;
            const urg = getDocDueUrgency(doc.due_date, doc.paid);
            const imp = doc.importance || 'normal';
            const impCfg = DOC_IMPORTANCE[imp] || DOC_IMPORTANCE.normal;
            return (
              <div key={doc.id} onClick={() => setDetailDoc(doc)}
                style={{
                  background: '#141414', border: `1px solid ${impCfg.border === 'transparent' ? '#1e1e1e' : impCfg.border}55`,
                  borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', gap: '10px', opacity: imp === 'archiv' ? 0.6 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
                onMouseLeave={e => e.currentTarget.style.borderColor = impCfg.border === 'transparent' ? '#1e1e1e' : `${impCfg.border}55`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${cat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CatIcon size={16} color={cat.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: '#fff', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</p>
                    <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0', textTransform: 'uppercase' }}>{cat.label}</p>
                  </div>
                  {doc.starred ? <Star size={14} fill="#f59e0b" color="#f59e0b" /> : null}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {urg && <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, background: urg.bg, color: urg.color, border: `1px solid ${urg.border}66` }}>{urg.label}</span>}
                  {imp !== 'normal' && <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, background: impCfg.bg, color: impCfg.color, border: `1px solid ${impCfg.border}` }}>{impCfg.label}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#475569', borderTop: '1px solid #1e1e1e', paddingTop: '8px' }}>
                  <span>{formatSize(doc.size)}</span>
                  {doc.attachment_count > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Paperclip size={10} /> {doc.attachment_count}</span>}
                  <span>{format(new Date(doc.created_at), 'd. MMM', { locale: de })}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div style={{ padding: '8px 16px 6px', borderBottom: '1px solid #1e1e1e' }}>
            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>{sortedFiltered.length} Dokument{sortedFiltered.length !== 1 ? 'e' : ''}</span>
          </div>
          <div className="divide-y divide-border">
            {sortedFiltered.map(doc => {
              const cat = GROUP_CAT_CONFIG[doc.category] || GROUP_CAT_CONFIG.other;
              const CatIcon = cat.icon;
              const imp = doc.importance || 'normal';
              const impCfg = DOC_IMPORTANCE[imp] || DOC_IMPORTANCE.normal;
              const urg = getDocDueUrgency(doc.due_date, doc.paid);
              return (
                <div key={doc.id} className="group" onClick={() => setDetailDoc(doc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    borderLeft: `3px solid ${impCfg.border}`,
                    background: imp === 'archiv' ? 'rgba(15,23,42,0.5)' : undefined,
                    opacity: imp === 'archiv' ? 0.6 : 1,
                    padding: '12px 14px 12px 12px', cursor: 'pointer', transition: 'background 0.15s',
                  }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${cat.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CatIcon size={16} color={cat.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</p>
                      {doc.attachment_count > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', background: 'rgba(249,115,22,0.12)', color: '#f97316', borderRadius: '5px', fontSize: '10px', fontWeight: 600, flexShrink: 0 }}>
                          <Paperclip size={9} /> {doc.attachment_count}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: cat.color }}>{cat.label}</span>
                      {doc.subcategory && <span> · {doc.subcategory}</span>}
                      {doc.uploader_name && <span> · von {doc.uploader_name}</span>}
                      <span className="hidden sm:inline"> · {formatSize(doc.size)}</span>
                    </p>
                  </div>
                  {urg && (
                    <button onClick={(e) => { e.stopPropagation(); paidMut.mutate(doc.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: urg.bg, color: urg.color, border: `1px solid ${urg.border}66`, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {doc.paid ? <CheckCircle2 size={11} /> : <CalIcon size={11} />} {urg.label}
                    </button>
                  )}
                  {imp !== 'normal' && (
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: impCfg.bg, color: impCfg.color, border: `1px solid ${impCfg.border}`, flexShrink: 0 }}>
                      {impCfg.label}
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); starMut.mutate(doc.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: doc.starred ? '#f59e0b' : '#334155', display: 'flex', padding: '4px', flexShrink: 0 }}>
                    <Star size={14} fill={doc.starred ? '#f59e0b' : 'none'} />
                  </button>
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <a href={doc.filepath} download target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-green-400 rounded-lg transition-colors"><Download size={14} /></a>
                    <button onClick={() => setDetailDoc(doc)} className="p-1.5 text-slate-500 hover:text-orange-400 rounded-lg transition-colors"><Eye size={14} /></button>
                    <button onClick={() => delMut.mutate(doc.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail-Modal */}
      <GroupDocDetailModal open={!!detailDoc} doc={detailDoc} onClose={() => setDetailDoc(null)}
        onEdit={openEditFromDetail}
        onDelete={(id) => { if (confirm('Dokument und alle Anhänge löschen?')) delMut.mutate(id); }} />

      {/* Upload-Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Dokument hochladen" size="md">
        <div className="space-y-4">
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-orange-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors">
            <Upload size={24} className="text-slate-500 mx-auto mb-2" />
            {selectedFiles.length > 0 ? (
              <div>
                <p className="text-sm text-orange-400 font-medium">{selectedFiles.length} Datei{selectedFiles.length !== 1 ? 'en' : ''} ausgewählt</p>
                <p className="text-xs text-slate-500 mt-1">{selectedFiles[0].name}{selectedFiles.length > 1 ? ` + ${selectedFiles.length - 1} Anhang${selectedFiles.length > 2 ? 'e' : ''}` : ''}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-300 font-medium">Mehrere Dateien wählbar</p>
                <p className="text-xs text-slate-500 mt-1">Erste Datei = Hauptdokument · Rest = Anhänge</p>
              </div>
            )}
            <input ref={fileRef} type="file" multiple className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || []);
                if (files.length) {
                  setSelectedFiles(files);
                  setUploadForm(p => ({ ...p, title: p.title || files[0].name.replace(/\.[^.]+$/, '') }));
                }
              }} />
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '8px', maxHeight: '120px', overflowY: 'auto' }}>
              {selectedFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', fontSize: '12px' }}>
                  {fileIcon(f.type)}
                  <span style={{ color: i === 0 ? '#f97316' : '#94a3b8', fontWeight: i === 0 ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i === 0 && '⭐ '} {f.name}
                  </span>
                  <span style={{ color: '#475569', fontSize: '10px' }}>{formatSize(f.size)}</span>
                  <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          <div><label className="block text-sm text-slate-400 mb-1.5">Titel</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.category}
                onChange={e => setUploadForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}>
                {GROUP_CAT_KEYS.map(k => <option key={k} value={k}>{GROUP_CAT_CONFIG[k].label}</option>)}
                {customCats.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Wichtigkeit</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.importance}
                onChange={e => setUploadForm(f => ({ ...f, importance: e.target.value }))}>
                {Object.entries(DOC_IMPORTANCE).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Unterordner <span className="text-slate-600 text-xs">(optional)</span></label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.subcategory}
              onChange={e => setUploadForm(f => ({ ...f, subcategory: e.target.value }))}>
              <option value="">— Kein Unterordner —</option>
              {uploadSubs.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
            </select>
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={uploadForm.description}
              onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-slate-400 mb-1.5 flex items-center gap-1.5">
              <CalIcon size={13} /> Fällig am <span className="text-slate-600 text-xs">(optional)</span>
            </label>
              <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.due_date}
                onChange={e => setUploadForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingBottom: '8px' }}>
                <input type="checkbox" checked={uploadForm.paid} onChange={e => setUploadForm(f => ({ ...f, paid: e.target.checked }))}
                  style={{ accentColor: '#22c55e', width: '15px', height: '15px' }} />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Bereits bezahlt</span>
              </label>
            </div>
          </div>

          {uploadError && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{uploadError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => uploadMut.mutate()} disabled={selectedFiles.length === 0 || uploadMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {uploadMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Hochladen{selectedFiles.length > 1 ? ` (+${selectedFiles.length - 1} Anhänge)` : ''}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit-Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Dokument bearbeiten" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={editForm.category}
                onChange={e => setEditForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}>
                {GROUP_CAT_KEYS.map(k => <option key={k} value={k}>{GROUP_CAT_CONFIG[k].label}</option>)}
                {customCats.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Unterordner</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={editForm.subcategory}
                onChange={e => setEditForm(f => ({ ...f, subcategory: e.target.value }))}>
                <option value="">— Kein Unterordner —</option>
                {editSubs.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Wichtigkeit</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(DOC_IMPORTANCE).map(([key, cfg]) => (
                <button key={key} onClick={() => setEditForm(f => ({ ...f, importance: key }))}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', border: `1px solid ${editForm.importance === key ? cfg.color : '#2a2a2a'}`,
                    background: editForm.importance === key ? cfg.bg : 'transparent',
                    color: editForm.importance === key ? cfg.color : '#64748b',
                  }}>{cfg.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-slate-400 mb-1.5 flex items-center gap-1.5">
              <CalIcon size={13} /> Fällig am
            </label>
              <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={editForm.due_date}
                onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingBottom: '8px' }}>
                <input type="checkbox" checked={editForm.paid} onChange={e => setEditForm(f => ({ ...f, paid: e.target.checked }))}
                  style={{ accentColor: '#22c55e', width: '15px', height: '15px' }} />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Bezahlt</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => editMut.mutate({ id: editDoc.id, data: editForm })} disabled={editMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {editMut.isPending && <Loader2 size={14} className="animate-spin" />} Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
// ════════════════════════════════════════════════════════════════════════════
// TAB: KALENDER
// ════════════════════════════════════════════════════════════════════════════
function CalendarTab({ groupId }) {
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const emptyForm = { title: '', description: '', start_date: '', end_date: '', all_day: true, color: '#f97316' };
  const [form, setForm] = useState(emptyForm);

  const from = format(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const to   = format(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: events = [] } = useQuery({
    queryKey: ['group-calendar', groupId, from, to],
    queryFn:  () => api.get(`/calendar?group_id=${groupId}&from=${from}&to=${to}T23:59:59`)
  });

  const saveMutation = useMutation({
    mutationFn: d => editing
      ? api.put(`/calendar/${editing.id}`, d)
      : api.post('/calendar', { ...d, group_id: groupId }),
    onSuccess: () => { qc.invalidateQueries(['group-calendar', groupId]); setShowModal(false); setEditing(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/calendar/${id}`),
    onSuccess:  () => qc.invalidateQueries(['group-calendar', groupId])
  });

  const openCreate = day => {
    setEditing(null);
    const dateStr = format(day || new Date(), 'yyyy-MM-dd');
    setForm({ ...emptyForm, start_date: dateStr, end_date: dateStr });
    setShowModal(true);
  };

  const openEdit = ev => {
    setEditing(ev);
    setForm({ title: ev.title, description: ev.description || '', start_date: ev.start_date?.split('T')[0] || ev.start_date, end_date: ev.end_date?.split('T')[0] || ev.start_date, all_day: ev.all_day, color: ev.color });
    setShowModal(true);
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(currentDate),   { weekStartsOn: 1 })
  });

  const getEventsForDay = day => events.filter(e => isSameDay(new Date(e.start_date), day));
  const selectedEvents  = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{events.length} Termin{events.length !== 1 ? 'e' : ''} diesen Monat</p>
        <button onClick={() => openCreate(new Date())}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
          <Plus size={15} /> Termin
        </button>
      </div>

      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-slate-400 hover:text-white"><ChevronLeft size={18} /></button>
          <h2 className="font-semibold text-white text-lg">{format(currentDate, 'MMMM yyyy', { locale: de })}</h2>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-slate-400 hover:text-white"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 border-b border-[#2a2a2a]">
          {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-500 py-2.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents      = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected     = selectedDay && isSameDay(day, selectedDay);
            const today          = isToday(day);
            return (
              <div key={i} onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                className={`min-h-[72px] p-1.5 border-r border-b border-[#2a2a2a] cursor-pointer transition-colors ${!isCurrentMonth ? 'opacity-30' : ''} ${isSelected ? 'bg-orange-500/10' : 'hover:bg-[#252525]'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${today ? 'bg-orange-500 text-white' : 'text-slate-300'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map(e => (
                    <div key={e.id} className="text-xs px-1 py-0.5 rounded truncate font-medium" style={{ backgroundColor: e.color + '25', color: e.color }}>{e.title}</div>
                  ))}
                  {dayEvents.length > 2 && <div className="text-xs text-slate-500 px-1">+{dayEvents.length - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">{format(selectedDay, 'EEEE, d. MMMM yyyy', { locale: de })}</h3>
            <button onClick={() => openCreate(selectedDay)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs transition-colors">
              <Plus size={12} /> Termin
            </button>
          </div>
          {selectedEvents.length === 0
            ? <p className="text-sm text-slate-500">Keine Termine an diesem Tag</p>
            : <div className="space-y-2">
                {selectedEvents.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-[#161616] rounded-xl group">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{e.title}</p>
                      {e.description && <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>}
                      {e.creator_name && <p className="text-xs text-slate-600">von {e.creator_name}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(e)} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"><Edit size={13} /></button>
                      <button onClick={() => deleteMutation.mutate(e.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Termin bearbeiten' : 'Neuer Termin'}>
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel *</label><input className="w-full px-3.5 py-2.5 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label><textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1.5">Startdatum *</label><input type={form.all_day ? 'date' : 'datetime-local'} className="w-full px-3.5 py-2.5 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Enddatum</label><input type={form.all_day ? 'date' : 'datetime-local'} className="w-full px-3.5 py-2.5 text-sm" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.all_day} onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-300">Ganztägig</span>
          </label>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Farbe</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e1e1e] scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowModal(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => saveMutation.mutate(form)} disabled={!form.title || !form.start_date || saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {editing ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: MITGLIEDER (mit Rollenverwaltung)
// ════════════════════════════════════════════════════════════════════════════
function MemberProfileModal({ member, onClose }) {
  if (!member) return null;
  return (
    <Modal open={!!member} onClose={onClose} title="Profil" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0 16px' }}>
        {/* Avatar groß */}
        {member.avatar
          ? <img src={member.avatar} alt="" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #f97316', flexShrink: 0 }} />
          : <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(234,88,12,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px', fontWeight: 700, color: '#f97316',
              border: '3px solid rgba(249,115,22,0.3)',
            }}>
              {member.username[0].toUpperCase()}
            </div>
        }
        {/* Name + Rolle */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
            {member.username}
            {member.role === 'admin' && <Crown size={16} className="text-amber-400" />}
          </p>
          <span style={{
            display: 'inline-block', marginTop: '6px',
            padding: '3px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            background: member.role === 'admin' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.15)',
            color: member.role === 'admin' ? '#f59e0b' : '#94a3b8',
          }}>
            {member.role === 'admin' ? 'Administrator' : 'Mitglied'}
          </span>
        </div>
        {/* E-Mail */}
        {member.email && (
          <div style={{
            width: '100%', padding: '12px 16px',
            background: '#0f0f0f', borderRadius: '12px',
            border: '1px solid #1e1e1e',
            fontSize: '13px', color: '#94a3b8', textAlign: 'center',
          }}>
            {member.email}
          </div>
        )}
        {/* Bio falls vorhanden */}
        {member.bio && (
          <div style={{
            width: '100%', padding: '12px 16px',
            background: '#0f0f0f', borderRadius: '12px',
            border: '1px solid #1e1e1e',
            fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5,
          }}>
            {member.bio}
          </div>
        )}
        <button onClick={onClose} style={{
          padding: '10px 28px', borderRadius: '12px', background: '#1e1e1e',
          border: '1px solid #2a2a2a', color: '#94a3b8', fontSize: '14px',
          fontWeight: 500, cursor: 'pointer', marginTop: '4px',
        }}>Schließen</button>
      </div>
    </Modal>
  );
}

function MembersTab({ group, members, isAdmin, user, removeMutation, regenCodeMutation, roleMutation, onInvite }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [viewMember, setViewMember] = useState(null);
  const copyCode = () => { navigator.clipboard.writeText(group?.invite_code || ''); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); };

  return (
    <div className="space-y-4">
      <MemberProfileModal member={viewMember} onClose={() => setViewMember(null)} />

      {group?.invite_code && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-white">Einladungscode</p>
              <p className="text-xs text-slate-500 mt-0.5">Teile diesen Code mit Personen, die beitreten sollen</p>
            </div>
            {isAdmin && (
              <button onClick={() => regenCodeMutation.mutate(group.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-orange-500 bg-[#161616] border border-[#2a2a2a] rounded-lg transition-colors">
                <RefreshCw size={11} className={regenCodeMutation.isPending ? 'animate-spin' : ''} /> Erneuern
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 bg-[#161616] rounded-xl p-3">
            <code className="text-2xl font-mono font-bold text-orange-500 tracking-widest flex-1">{group.invite_code}</code>
            <button onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-sm transition-colors">
              <Copy size={14} />{copiedCode ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
          <p className="text-sm font-medium text-white">{members.length} Mitglied{members.length !== 1 ? 'er' : ''}</p>
          {isAdmin && (
            <button onClick={onInvite}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-xs transition-colors">
              <Users size={13} /> Per E-Mail einladen
            </button>
          )}
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#252525] transition-colors">
              {/* Avatar – klickbar zum Profil öffnen */}
              <button
                onClick={() => setViewMember(m)}
                title={`${m.username} Profil ansehen`}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
              >
                {m.avatar
                  ? <img src={m.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid transparent', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'} />
                  : <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'rgba(249,115,22,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700, color: '#f97316',
                      border: '2px solid transparent', transition: 'border-color 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                    >{m.username[0].toUpperCase()}</div>
                }
              </button>
              {/* Name + Email – auch klickbar */}
              <button
                onClick={() => setViewMember(m)}
                style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  {m.username}
                  {m.role === 'admin' && <Crown size={12} className="text-amber-400" />}
                </p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </button>
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${m.role === 'admin' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
                {m.role === 'admin' ? 'Admin' : 'Mitglied'}
              </span>
              {m.id !== user?.id && isAdmin && (
                <div className="flex gap-1">
                  <button
                    onClick={() => roleMutation.mutate({ groupId: group.id, userId: m.id, role: m.role === 'admin' ? 'member' : 'admin' })}
                    title={m.role === 'admin' ? 'Zum Mitglied herabstufen' : 'Zum Admin befördern'}
                    className={`p-2 rounded-lg transition-colors ${m.role === 'admin' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'}`}>
                    <Crown size={14} />
                  </button>
                  <button onClick={() => removeMutation.mutate({ groupId: group.id, userId: m.id })}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <UserMinus size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: CHAT (Echtzeit via Socket.io)
// ════════════════════════════════════════════════════════════════════════════
function ChatTab({ groupId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  // Nachrichten beim Laden holen
  useEffect(() => {
    api.get(`/groups/${groupId}/chat`)
      .then(msgs => setMessages(Array.isArray(msgs) ? msgs : []))
      .catch(() => {});
  }, [groupId]);

  // Socket: Echtzeit-Nachrichten empfangen
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ groupId: gId, message: msg }) => {
      if (parseInt(gId) !== parseInt(groupId)) return;
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    };
    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [groupId]);

  // Auto-Scroll ans Ende
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await api.post(`/groups/${groupId}/chat`, { content });
      // Eigene Nachricht direkt einfügen (Server emittiert sie nicht zurück)
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    } catch {
      setText(content); // Bei Fehler wieder einsetzen
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '520px',
      background: '#1e1e1e',
      borderRadius: '16px',
      border: '1px solid #2a2a2a',
      overflow: 'hidden',
    }}>
      {/* Nachrichten-Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#475569' }}>
            <Hash size={36} style={{ margin: '0 auto 10px', opacity: 0.25 }} />
            <p style={{ fontSize: '14px' }}>Noch keine Nachrichten. Schreib die erste!</p>
          </div>
        )}
        {messages.map(m => {
          const isOwn = m.user_id === user?.id;
          const avatarSrc = isOwn ? user?.avatar : m.avatar;
          const displayName = isOwn ? (user?.username || 'Du') : (m.username || '?');
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
              {/* Avatar – links für andere, rechts für eigene */}
              <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden' }}>
                {avatarSrc
                  ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{
                      width: 30, height: 30,
                      background: isOwn ? 'rgba(249,115,22,0.3)' : 'rgba(100,116,139,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700,
                      color: isOwn ? '#f97316' : '#94a3b8',
                    }}>
                      {displayName[0].toUpperCase()}
                    </div>
                }
              </div>
              <div style={{ maxWidth: '72%' }}>
                {/* Name über der Bubble – rechts für eigene, links für andere */}
                <p style={{
                  fontSize: '11px', color: '#64748b', marginBottom: '2px',
                  textAlign: isOwn ? 'right' : 'left',
                  paddingInline: '4px',
                }}>
                  {displayName}
                </p>
                <div style={{
                  padding: '9px 13px',
                  borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: isOwn ? '#f97316' : '#2a2a2a',
                  color: '#fff', fontSize: '14px', wordBreak: 'break-word', lineHeight: 1.45,
                }}>
                  {m.content}
                </div>
                <p style={{ fontSize: '10px', color: '#374151', marginTop: '3px', textAlign: isOwn ? 'right' : 'left', paddingInline: '4px' }}>
                  {format(new Date(m.created_at), 'HH:mm', { locale: de })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Eingabefeld */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #2a2a2a', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Nachricht schreiben..."
          disabled={sending}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: '12px',
            background: '#2a2a2a', border: '1px solid #333', color: '#fff',
            fontSize: '14px', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            padding: '10px 14px', borderRadius: '12px',
            background: text.trim() && !sending ? '#f97316' : '#2a2a2a',
            border: 'none', color: text.trim() && !sending ? '#fff' : '#475569',
            cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: NOTIZBUCH (Gruppen-Workspace)
// ════════════════════════════════════════════════════════════════════════════
function NotizenTab({ groupId }) {
  return <NotizenPage groupId={groupId} />;
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: FINANZEN (Gruppen-Budget)
// ════════════════════════════════════════════════════════════════════════════
function FinanceTab({ groupId, isAdmin, user }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const emptyForm = { title: '', amount: '', type: 'expense', category: '', date: format(new Date(), 'yyyy-MM-dd') };
  const [form, setForm] = useState(emptyForm);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['group-finance', groupId],
    queryFn:  () => api.get(`/finance/items?group_id=${groupId}`)
  });

  const { data: summary } = useQuery({
    queryKey: ['group-finance-summary', groupId],
    queryFn:  () => api.get(`/finance/summary?group_id=${groupId}`)
  });

  const addMutation = useMutation({
    mutationFn: data => api.post('/finance/items', { ...data, group_id: groupId }),
    onSuccess:  () => {
      qc.invalidateQueries(['group-finance', groupId]);
      qc.invalidateQueries(['group-finance-summary', groupId]);
      setShowModal(false);
      setForm(emptyForm);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/finance/items/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries(['group-finance', groupId]);
      qc.invalidateQueries(['group-finance-summary', groupId]);
    }
  });

  const income  = summary?.income  ?? items.filter(i => i.type === 'income').reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const expense = summary?.expense ?? items.filter(i => i.type === 'expense').reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const balance = income - expense;

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-5">
      {/* Übersicht-Karten */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Einnahmen</p>
          <p className="text-lg font-bold text-green-400">+{parseFloat(income).toFixed(2)} €</p>
        </div>
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Ausgaben</p>
          <p className="text-lg font-bold text-red-400">-{parseFloat(expense).toFixed(2)} €</p>
        </div>
        <div className={`bg-[#1e1e1e] border rounded-2xl p-4 text-center ${balance >= 0 ? 'border-green-500/20' : 'border-red-500/20'}`}>
          <p className="text-xs text-slate-500 mb-1">Bilanz</p>
          <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {balance >= 0 ? '+' : ''}{parseFloat(balance).toFixed(2)} €
          </p>
        </div>
      </div>

      {/* Liste */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} Buchung{items.length !== 1 ? 'en' : ''}</p>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
          <Plus size={15} /> Eintrag
        </button>
      </div>

      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <Euro size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Noch keine Buchungen vorhanden</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-orange-400 hover:text-orange-500">Ersten Eintrag hinzufügen →</button>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a2a]">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#252525] group transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.creator_name || item.username || 'Unbekannt'}
                    {item.date ? ` · ${format(new Date(item.date), 'd. MMM yyyy', { locale: de })}` : ''}
                  </p>
                </div>
                {item.category && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#2a2a2a] text-slate-400 shrink-0">{item.category}</span>
                )}
                <span className={`text-sm font-bold shrink-0 ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {item.type === 'income' ? '+' : '-'}{parseFloat(item.amount).toFixed(2)} €
                </span>
                {(item.user_id === user?.id || isAdmin) && (
                  <button onClick={() => deleteMutation.mutate(item.id)}
                    className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Neuer Eintrag */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setForm(emptyForm); }} title="Neuer Eintrag" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Titel *</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Betrag (€) *</label>
              <input type="number" step="0.01" min="0" className="w-full px-3.5 py-2.5 text-sm" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Typ</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="z.B. Miete, Lebensmittel..." value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Datum</label>
            <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => addMutation.mutate(form)} disabled={!form.title || !form.amount || addMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {addMutation.isPending && <Loader2 size={14} className="animate-spin" />} Hinzufügen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HAUPT-KOMPONENTE
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'tasks',     label: 'Aufgaben',   icon: CheckSquare },
  { id: 'documents', label: 'Dokumente',  icon: FileText },
  { id: 'calendar',  label: 'Kalender',   icon: CalIcon },
  { id: 'chat',      label: 'Chat',       icon: Hash },
  { id: 'notizen',   label: 'Notizbuch',  icon: BookOpen },
  { id: 'finance',   label: 'Finanzen',   icon: Euro },
  { id: 'members',   label: 'Mitglieder', icon: Users },
];

export default function GroupView() {
  const { groupId, tab } = useParams();
  const navigate          = useNavigate();
  const { user }          = useAuth();
  const qc                = useQueryClient();
  const activeTab         = tab || 'tasks';
  const [showInvite, setShowInvite]   = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn:  () => api.get(`/groups/${groupId}`)
  });

  const { data: members = [] } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn:  () => api.get(`/groups/${groupId}/members`),
    enabled:  !!groupId
  });

  const regenCodeMutation = useMutation({
    mutationFn: id => api.post(`/groups/${id}/regenerate-code`),
    onSuccess:  ()  => qc.invalidateQueries(['group', groupId])
  });

  const removeMutation = useMutation({
    mutationFn: ({ groupId: gid, userId }) => api.delete(`/groups/${gid}/members/${userId}`),
    onSuccess:  () => qc.invalidateQueries(['group-members', groupId])
  });

  const roleMutation = useMutation({
    mutationFn: ({ groupId: gid, userId, role }) => api.patch(`/groups/${gid}/members/${userId}/role`, { role }),
    onSuccess:  () => qc.invalidateQueries(['group-members', groupId])
  });

  const inviteMutation = useMutation({
    mutationFn: email => api.post(`/groups/${groupId}/members`, { email }),
    onSuccess:  () => { qc.invalidateQueries(['group-members', groupId]); setShowInvite(false); setInviteEmail(''); setInviteError(''); },
    onError:    err => setInviteError(err.error || 'Fehler')
  });

  const isAdmin = members.find(m => m.id === user?.id)?.role === 'admin';

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>;
  if (!group)    return (
    <div className="text-center py-12">
      <p className="text-slate-400">Gruppe nicht gefunden</p>
      <Link to="/groups" className="text-orange-500 text-sm mt-2 inline-block">← Zurück</Link>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/groups" className="p-2 hover:bg-[#2a2a2a] rounded-xl transition-colors text-slate-400 hover:text-white shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-white truncate">{group.name}</h1>
          {group.description && <p className="text-xs md:text-sm text-slate-400 mt-0.5 truncate">{group.description}</p>}
        </div>
        <span className={`text-xs px-2 md:px-2.5 py-1 rounded-lg font-medium shrink-0 ${typeBg[group.type] || 'bg-orange-500/10 text-orange-500'}`}>
          {typeLabels[group.type]}
        </span>
      </div>

      {/* Tab-Bar — horizontal scroll auf Mobil */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#1a1a1a', padding: '4px', borderRadius: '16px', minWidth: 'max-content' }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => navigate(`/groups/${groupId}/${t.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '12px',
                  fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: activeTab === t.id ? '#f97316' : 'transparent',
                  color: activeTab === t.id ? '#fff' : '#64748b',
                  boxShadow: activeTab === t.id ? '0 4px 12px rgba(249,115,22,0.25)' : 'none',
                  whiteSpace: 'nowrap',
                }}>
                <Icon size={14} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab-Inhalt */}
      {activeTab === 'tasks'     && <TasksTab     groupId={groupId} groupName={group.name} />}
      {activeTab === 'documents' && <DocumentsTab groupId={groupId} />}
      {activeTab === 'calendar'  && <CalendarTab  groupId={groupId} />}
      {activeTab === 'chat'      && <ChatTab      groupId={groupId} />}
      {activeTab === 'notizen'   && <NotizenTab   groupId={groupId} />}
      {activeTab === 'finance'   && <FinanceTab   groupId={groupId} isAdmin={isAdmin} user={user} />}
      {activeTab === 'members'   && (
        <MembersTab group={group} members={members} isAdmin={isAdmin} user={user}
          removeMutation={removeMutation} regenCodeMutation={regenCodeMutation}
          roleMutation={roleMutation}
          onInvite={() => { setShowInvite(true); setInviteError(''); }} />
      )}

      {/* Einlade-Modal */}
      <Modal open={showInvite} onClose={() => { setShowInvite(false); setInviteError(''); }} title="Mitglied einladen" size="sm">
        <div className="space-y-4">
          {inviteError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{inviteError}</div>}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">E-Mail-Adresse</label>
            <input type="email" className="w-full px-3.5 py-2.5 text-sm" placeholder="email@example.com"
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1.5">Der Benutzer muss bereits ein Konto haben.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowInvite(false); setInviteError(''); }} className="px-4 py-2 text-sm text-slate-400">Abbrechen</button>
            <button onClick={() => inviteMutation.mutate(inviteEmail)} disabled={!inviteEmail || inviteMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {inviteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />} Einladen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
