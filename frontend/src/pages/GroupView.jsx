import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, FileText, Calendar as CalIcon, Users, ArrowLeft,
  Plus, Trash2, Loader2, UserMinus, Crown, Hash, RefreshCw, Copy,
  Edit, Upload, Search, Download, Image, File, Clock, Home,
  ChevronLeft, ChevronRight, Briefcase, Star, Euro, Send, X, BookOpen
} from 'lucide-react';
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
  if (mime?.startsWith('image/')) return <Image size={18} className="text-purple-400" />;
  if (mime?.includes('pdf'))      return <FileText size={18} className="text-red-400" />;
  return <File size={18} className="text-blue-400" />;
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

function DocumentsTab({ groupId }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [search, setSearch]               = useState('');
  const [catFilter, setCatFilter]         = useState('');
  const [subFilter, setSubFilter]         = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [showTypeDD, setShowTypeDD]       = useState(false);
  const [showUpload, setShowUpload]       = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [editDoc, setEditDoc]             = useState(null);
  const [selectedFile, setSelectedFile]   = useState(null);
  const [uploadForm, setUploadForm]       = useState({ title: '', category: 'other', subcategory: '', description: '' });
  const [editForm, setEditForm]           = useState({ title: '', category: '', description: '' });
  const [showCatInput, setShowCatInput]   = useState(false);
  const [newCatName, setNewCatName]       = useState('');
  const [showSubInput, setShowSubInput]   = useState(false);
  const [newSubName, setNewSubName]       = useState('');
  const [uploadError, setUploadError]     = useState('');

  // Unterkategorie-Filter zurücksetzen wenn Kategorie wechselt
  useEffect(() => { setSubFilter(''); setShowSubInput(false); }, [catFilter]);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['group-docs', groupId, catFilter, subFilter],
    queryFn: () => {
      let url = `/documents?group_id=${groupId}`;
      if (catFilter) url += `&category=${encodeURIComponent(catFilter)}`;
      if (subFilter) url += `&subcategory=${encodeURIComponent(subFilter)}`;
      return api.get(url);
    }
  });

  const { data: customCats = [] } = useQuery({
    queryKey: ['doc-categories', groupId],
    queryFn: () => api.get(`/documents/categories?group_id=${groupId}`)
  });

  // Alle Unterkategorien dieser Gruppe — client-seitig nach parent_category gefiltert
  const { data: allSubs = [] } = useQuery({
    queryKey: ['doc-subcategories', groupId],
    queryFn: () => api.get(`/documents/subcategories?group_id=${groupId}`)
  });

  // Unterkats für aktive Kategorie (Filter-Leiste)
  const catSubs = allSubs.filter(s => s.parent_category === catFilter);
  // Unterkats für Upload-Modal (nach gewählter upload-Kategorie)
  const uploadCatSubs = allSubs.filter(s => s.parent_category === uploadForm.category);

  const addCatMutation = useMutation({
    mutationFn: name => api.post('/documents/categories', { name, group_id: groupId }),
    onSuccess: () => { qc.invalidateQueries(['doc-categories', groupId]); setNewCatName(''); setShowCatInput(false); }
  });
  const delCatMutation = useMutation({
    mutationFn: id => api.delete(`/documents/categories/${id}`),
    onSuccess: () => qc.invalidateQueries(['doc-categories', groupId])
  });

  const addSubMutation = useMutation({
    mutationFn: name => api.post('/documents/subcategories', { name, group_id: groupId, parent_category: catFilter }),
    onSuccess: () => { qc.invalidateQueries(['doc-subcategories', groupId]); setNewSubName(''); setShowSubInput(false); }
  });
  const delSubMutation = useMutation({
    mutationFn: id => api.delete(`/documents/subcategories/${id}`),
    onSuccess: () => qc.invalidateQueries(['doc-subcategories', groupId])
  });

  // WICHTIG: kein Content-Type Header — Axios setzt die boundary automatisch für FormData
  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('title', uploadForm.title || selectedFile.name);
      fd.append('category', uploadForm.category);
      fd.append('subcategory', uploadForm.subcategory || '');
      fd.append('description', uploadForm.description);
      fd.append('group_id', groupId);
      return api.post('/documents/upload', fd);
    },
    onSuccess: () => {
      qc.invalidateQueries(['group-docs', groupId]);
      setShowUpload(false); setSelectedFile(null);
      setUploadForm({ title: '', category: 'other', subcategory: '', description: '' });
      setUploadError('');
    },
    onError: err => setUploadError(err?.error || err?.message || 'Upload fehlgeschlagen'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/documents/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['group-docs', groupId]); setShowEdit(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries(['group-docs', groupId])
  });

  const handleFileSelect = e => {
    const f = e.target.files[0];
    if (f) { setSelectedFile(f); setUploadForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') })); }
  };

  const filtered = docs.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.filename?.toLowerCase().includes(search.toLowerCase())) return false;
    if (!matchesMime(d.mimetype, typeFilter)) return false;
    return true;
  });

  const activeTypeName = DOC_FILE_TYPES.find(t => t.value === typeFilter)?.label || 'Alle Typen';

  // Pill-Style helper
  const pill = (active) => ({
    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? '#f97316' : '#1e1e1e',
    color: active ? '#fff' : '#94a3b8',
    outline: active ? '1px solid #f97316' : '1px solid #2a2a2a',
  });

  const subPill = (active) => ({
    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
    border: 'none', cursor: 'pointer',
    background: active ? 'rgba(249,115,22,0.18)' : '#161616',
    color: active ? '#f97316' : '#64748b',
    outline: active ? '1px solid rgba(249,115,22,0.45)' : '1px solid #222',
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-4">

      {/* ── Kopfzeile: Anzahl + Typ-Dropdown + Hochladen ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">{docs.length} Dokument{docs.length !== 1 ? 'e' : ''} in dieser Gruppe</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Dateityp-Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowTypeDD(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', borderRadius: '10px',
              background: typeFilter ? 'rgba(249,115,22,0.12)' : '#1e1e1e',
              border: typeFilter ? '1px solid rgba(249,115,22,0.4)' : '1px solid #2a2a2a',
              color: typeFilter ? '#f97316' : '#94a3b8',
              fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {activeTypeName} <span style={{ fontSize: '9px', opacity: 0.7, marginLeft: '2px' }}>▾</span>
            </button>
            {showTypeDD && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                borderRadius: '12px', padding: '4px', minWidth: '145px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}>
                {DOC_FILE_TYPES.map(t => (
                  <button key={t.value} onClick={() => { setTypeFilter(t.value); setShowTypeDD(false); }} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 12px', borderRadius: '8px', border: 'none',
                    background: typeFilter === t.value ? 'rgba(249,115,22,0.15)' : 'transparent',
                    color: typeFilter === t.value ? '#f97316' : '#cbd5e1',
                    fontSize: '13px', cursor: 'pointer',
                  }}>{t.label}</button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
            <Upload size={15} /> Hochladen
          </button>
        </div>
      </div>

      {/* ── Suche ── */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl" placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* ── Kategorie-Pills ── */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {CATS.map((c, i) => (
          <button key={c} onClick={() => setCatFilter(i === 0 ? '' : CAT_VALS[i - 1])}
            style={pill(i === 0 ? catFilter === '' : catFilter === CAT_VALS[i - 1])}>
            {c}
          </button>
        ))}
        {customCats.map(cat => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button onClick={() => setCatFilter(cat.name)} style={pill(catFilter === cat.name)}>
              {cat.icon} {cat.name}
            </button>
            <button onClick={() => delCatMutation.mutate(cat.id)} style={{ color: '#475569', cursor: 'pointer', background: 'none', border: 'none', padding: '2px' }}>
              <X size={11} />
            </button>
          </div>
        ))}
        {showCatInput ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input autoFocus placeholder="Kategoriename..." value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newCatName.trim()) addCatMutation.mutate(newCatName.trim()); if (e.key === 'Escape') setShowCatInput(false); }}
              style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '12px', background: '#1e1e1e', border: '1px solid #f97316', color: '#fff', outline: 'none', width: '130px' }} />
            <button onClick={() => { if (newCatName.trim()) addCatMutation.mutate(newCatName.trim()); }}
              style={{ padding: '4px 10px', borderRadius: '8px', background: '#f97316', color: '#fff', border: 'none', fontSize: '12px', cursor: 'pointer' }}>+</button>
            <button onClick={() => setShowCatInput(false)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShowCatInput(true)} style={{
            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
            background: '#1e1e1e', border: '1px dashed #2a2a2a', color: '#64748b', cursor: 'pointer',
          }}>+ Kategorie</button>
        )}
      </div>

      {/* ── Unterkategorie-Pills (erscheint wenn eine Kategorie gewählt ist) ── */}
      {catFilter && (
        <div style={{
          display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
          paddingLeft: '14px', borderLeft: '2px solid #2a2a2a',
        }}>
          <span style={{ fontSize: '11px', color: '#475569', marginRight: '2px', whiteSpace: 'nowrap' }}>Unterordner:</span>
          <button onClick={() => setSubFilter('')} style={subPill(subFilter === '')}>Alle</button>
          {catSubs.map(sub => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
              <button onClick={() => setSubFilter(sub.name)} style={subPill(subFilter === sub.name)}>{sub.name}</button>
              <button onClick={() => delSubMutation.mutate(sub.id)} style={{ color: '#374151', cursor: 'pointer', background: 'none', border: 'none', padding: '2px', lineHeight: 1 }}>
                <X size={10} />
              </button>
            </div>
          ))}
          {showSubInput ? (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input autoFocus placeholder="Unterordner..." value={newSubName} onChange={e => setNewSubName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newSubName.trim()) addSubMutation.mutate(newSubName.trim()); if (e.key === 'Escape') setShowSubInput(false); }}
                style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', background: '#161616', border: '1px solid #f97316', color: '#fff', outline: 'none', width: '115px' }} />
              <button onClick={() => { if (newSubName.trim()) addSubMutation.mutate(newSubName.trim()); }}
                style={{ padding: '3px 8px', borderRadius: '6px', background: '#f97316', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer' }}>+</button>
              <button onClick={() => setShowSubInput(false)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowSubInput(true)} style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
              background: '#161616', border: '1px dashed #2a2a2a', color: '#475569', cursor: 'pointer',
            }}>+ Unterordner</button>
          )}
        </div>
      )}

      {/* ── Dokumenten-Liste ── */}
      {filtered.length === 0 ? (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-12 text-center">
          <FileText size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Keine Dokumente gefunden</p>
          <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-orange-400 hover:text-orange-500">Erstes Dokument hochladen →</button>
        </div>
      ) : (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[#2a2a2a]">
            {filtered.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#252525] transition-colors group">
                <div className="w-9 h-9 bg-[#161616] rounded-lg flex items-center justify-center shrink-0">{fileIcon(doc.mimetype)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                  <p className="text-xs text-slate-500">{doc.uploader_name && `${doc.uploader_name} · `}{formatSize(doc.size)} · {format(new Date(doc.created_at), 'd. MMM yyyy', { locale: de })}</p>
                </div>
                {doc.category && <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 shrink-0">{doc.category}{doc.subcategory ? ` / ${doc.subcategory}` : ''}</span>}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={doc.filepath} download target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-green-400 rounded-lg transition-colors"><Download size={14} /></a>
                  <button onClick={() => { setEditDoc(doc); setEditForm({ title: doc.title, category: doc.category, description: doc.description || '' }); setShowEdit(true); }}
                    className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"><Edit size={14} /></button>
                  <button onClick={() => deleteMutation.mutate(doc.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Upload Modal ── */}
      <Modal open={showUpload} onClose={() => { setShowUpload(false); setUploadError(''); }} title="Dokument hochladen">
        <div className="space-y-4">
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#2a2a2a] hover:border-orange-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors">
            <Upload size={24} className="text-slate-500 mx-auto mb-2" />
            {selectedFile
              ? <p className="text-sm text-orange-400 font-medium">{selectedFile.name} ({formatSize(selectedFile.size)})</p>
              : <p className="text-sm text-slate-500">Klicken zum Auswählen <span className="text-orange-400">oder Datei ziehen</span></p>}
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}>
              {CAT_VALS.map((v, i) => <option key={v} value={v}>{CATS[i + 1]}</option>)}
              {customCats.map(cat => <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>)}
            </select></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Unterordner <span style={{ color: '#475569', fontSize: '11px' }}>(optional)</span></label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.subcategory} onChange={e => setUploadForm(f => ({ ...f, subcategory: e.target.value }))}>
              <option value="">— Keiner —</option>
              {uploadCatSubs.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} /></div>
          {uploadError && <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: '8px', padding: '8px 12px' }}>{uploadError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowUpload(false); setUploadError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => uploadMutation.mutate()} disabled={!selectedFile || uploadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {uploadMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Hochladen
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Bearbeiten Modal ── */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Dokument bearbeiten" size="sm">
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
              {CAT_VALS.map((v, i) => <option key={v} value={v}>{CATS[i + 1]}</option>)}
              {customCats.map(cat => <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>)}
            </select></div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => editMutation.mutate({ id: editDoc.id, data: editForm })} disabled={editMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {editMutation.isPending && <Loader2 size={14} className="animate-spin" />} Speichern
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
function MembersTab({ group, members, isAdmin, user, removeMutation, regenCodeMutation, roleMutation, onInvite }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const copyCode = () => { navigator.clipboard.writeText(group?.invite_code || ''); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); };

  return (
    <div className="space-y-4">
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
              {m.avatar
                ? <img src={m.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                : <div className="w-10 h-10 rounded-full bg-orange-500/15 flex items-center justify-center text-sm font-bold text-orange-500">{m.username[0].toUpperCase()}</div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  {m.username}
                  {m.role === 'admin' && <Crown size={12} className="text-amber-400" />}
                </p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${m.role === 'admin' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
                {m.role === 'admin' ? 'Admin' : 'Mitglied'}
              </span>
              {m.id !== user?.id && isAdmin && (
                <div className="flex gap-1">
                  {/* Rolle ändern */}
                  <button
                    onClick={() => roleMutation.mutate({ groupId: group.id, userId: m.id, role: m.role === 'admin' ? 'member' : 'admin' })}
                    title={m.role === 'admin' ? 'Zum Mitglied herabstufen' : 'Zum Admin befördern'}
                    className={`p-2 rounded-lg transition-colors ${m.role === 'admin' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'}`}>
                    <Crown size={14} />
                  </button>
                  {/* Entfernen */}
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
