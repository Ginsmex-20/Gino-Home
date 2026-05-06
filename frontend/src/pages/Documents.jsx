import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, File, Image, Trash2, Edit, Download,
  Search, Loader2, FilePlus, X, Film, Music, Archive, FileCode, ChevronRight,
  Copy, CheckSquare, Square, Users, Star, AlertCircle, ArrowDownUp
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';

// ── Konstanten ────────────────────────────────────────────────────────────────
const CATS = [
  { label: 'Alle',         value: '' },
  { label: 'Vertrag',      value: 'contract' },
  { label: 'Rechnung',     value: 'invoice' },
  { label: 'Ausweis',      value: 'identity' },
  { label: 'Versicherung', value: 'insurance' },
  { label: 'Steuern',      value: 'tax' },
  { label: 'Sonstiges',    value: 'other' },
];

const FILE_TYPES = [
  { label: 'Alle Typen', value: '' },
  { label: 'Bilder',     value: 'image' },
  { label: 'PDFs',       value: 'pdf' },
  { label: 'Videos',     value: 'video' },
  { label: 'Audio',      value: 'audio' },
  { label: 'Office',     value: 'office' },
  { label: 'Archive',    value: 'archive' },
];

function matchesMime(mime, f) {
  if (!f) return true;
  if (!mime) return false;
  if (f === 'image')   return mime.startsWith('image/');
  if (f === 'pdf')     return mime.includes('pdf');
  if (f === 'video')   return mime.startsWith('video/');
  if (f === 'audio')   return mime.startsWith('audio/');
  if (f === 'office')  return ['word','excel','powerpoint','spreadsheet','presentation','document'].some(k => mime.includes(k));
  if (f === 'archive') return ['zip','rar','7z','tar','gzip'].some(k => mime.includes(k));
  return true;
}

function fileIcon(mime) {
  if (!mime) return <File size={18} className="text-slate-400" />;
  if (mime.startsWith('image/'))   return <Image   size={18} className="text-purple-400" />;
  if (mime.includes('pdf'))        return <FileText size={18} className="text-red-400" />;
  if (mime.startsWith('video/'))   return <Film    size={18} className="text-pink-400" />;
  if (mime.startsWith('audio/'))   return <Music   size={18} className="text-green-400" />;
  if (['zip','rar','tar'].some(k => mime.includes(k))) return <Archive size={18} className="text-yellow-400" />;
  if (mime.includes('word') || mime.includes('document'))   return <FileText size={18} className="text-blue-400" />;
  if (mime.includes('excel') || mime.includes('spreadsheet')) return <FileText size={18} className="text-emerald-400" />;
  if (mime.startsWith('text/')) return <FileCode size={18} className="text-cyan-400" />;
  return <File size={18} className="text-slate-400" />;
}

function formatSize(b) {
  if (!b) return '–';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ── Wichtigkeitskonfiguration ─────────────────────────────────────────────────
const IMPORTANCE = {
  dringend: { label: 'Dringend', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: '#ef4444' },
  wichtig:  { label: 'Wichtig',  color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: '#f97316' },
  normal:   { label: 'Normal',   color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'transparent' },
  archiv:   { label: 'Archiv',   color: '#334155', bg: 'rgba(51,65,85,0.15)', border: '#1e293b' },
};

// ── Pill-Button ───────────────────────────────────────────────────────────────
function Pill({ active, onClick, children, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <button
        onClick={onClick}
        style={{
          padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
          whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
          background: active ? '#f97316' : 'transparent',
          color: active ? '#fff' : '#94a3b8',
          border: active ? '1px solid #f97316' : '1px solid #2a2a2a',
        }}
      >{children}</button>
      {onDelete && (
        <button onClick={onDelete} style={{ color: '#475569', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, padding: '2px' }}
          title="Löschen"><X size={11} /></button>
      )}
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function Documents() {
  const qc = useQueryClient();
  const fileRef = useRef();

  // Filter-States
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('');   // z.B. 'contract'
  const [subFilter,   setSubFilter]   = useState('');   // z.B. 'Handyvertrag O2'
  const [typeFilter,  setTypeFilter]  = useState('');
  const [sortBy,      setSortBy]      = useState('importance'); // 'importance' | 'date' | 'name' | 'size'
  const [importanceFilter, setImportanceFilter] = useState(''); // '' | 'starred' | 'dringend' | 'wichtig' | 'archiv'

  // Modals
  const [showUpload,  setShowUpload]  = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [editDoc,     setEditDoc]     = useState(null);

  // Formulare
  const [uploadForm,  setUploadForm]  = useState({ title: '', category: 'contract', subcategory: '', description: '' });
  const [selectedFile,setSelectedFile]= useState(null);
  const [editForm,    setEditForm]    = useState({ title: '', category: '', subcategory: '', description: '', importance: 'normal', starred: 0 });
  const [uploadError, setUploadError] = useState('');

  // Neue Kategorie inline
  const [showNewCat,  setShowNewCat]  = useState(false);
  const [newCatName,  setNewCatName]  = useState('');

  // Neue Unterkategorie inline (Filter-Bereich)
  const [showNewSub,  setShowNewSub]  = useState(false);
  const [newSubName,  setNewSubName]  = useState('');

  // Neue Unterkategorie im Upload-Modal
  const [showModalSub, setShowModalSub] = useState(false);
  const [modalSubName, setModalSubName] = useState('');

  // Multi-Auswahl + In Gruppe kopieren
  const [selectedDocs, setSelectedDocs]       = useState(new Set());
  const [showCopyModal, setShowCopyModal]     = useState(false);
  const [copyTargetGroup, setCopyTargetGroup] = useState('');
  const [copyResult, setCopyResult]           = useState(null); // { copied, skipped }

  // ── Daten ────────────────────────────────────────────────────────────────────
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', catFilter],
    queryFn: () => api.get('/documents' + (catFilter ? `?category=${catFilter}` : '')),
  });

  const { data: customCats = [] } = useQuery({
    queryKey: ['doc-categories'],
    queryFn: () => api.get('/documents/categories'),
  });

  // Unterkategorien für aktiven Filter-Kategorie (Filterleiste)
  const { data: filterSubs = [] } = useQuery({
    queryKey: ['doc-subcategories-filter', catFilter],
    queryFn: () => catFilter
      ? api.get(`/documents/subcategories?parent_category=${encodeURIComponent(catFilter)}`)
      : Promise.resolve([]),
    enabled: !!catFilter,
  });

  // Unterkategorien für Upload-Kategorie (Modal)
  const { data: uploadSubs = [] } = useQuery({
    queryKey: ['doc-subcategories-upload', uploadForm.category],
    queryFn: () => api.get(`/documents/subcategories?parent_category=${encodeURIComponent(uploadForm.category)}`),
    enabled: !!uploadForm.category,
  });

  // Unterkategorien für Edit-Kategorie (Modal)
  const { data: editSubs = [] } = useQuery({
    queryKey: ['doc-subcategories-edit', editForm.category],
    queryFn: () => editForm.category
      ? api.get(`/documents/subcategories?parent_category=${encodeURIComponent(editForm.category)}`)
      : Promise.resolve([]),
    enabled: !!editForm.category,
  });

  // ── Mutationen ───────────────────────────────────────────────────────────────
  const addCatMut = useMutation({
    mutationFn: name => api.post('/documents/categories', { name }),
    onSuccess: () => { qc.invalidateQueries(['doc-categories']); setNewCatName(''); setShowNewCat(false); },
  });
  const delCatMut = useMutation({
    mutationFn: id => api.delete(`/documents/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries(['doc-categories']); if (catFilter) setCatFilter(''); },
  });

  const addSubMut = useMutation({
    mutationFn: ({ name, parent }) => api.post('/documents/subcategories', { name, parent_category: parent }),
    onSuccess: (_, { parent }) => {
      qc.invalidateQueries(['doc-subcategories-filter', parent]);
      qc.invalidateQueries(['doc-subcategories-upload', parent]);
      setNewSubName(''); setShowNewSub(false);
      setModalSubName(''); setShowModalSub(false);
    },
  });
  const delSubMut = useMutation({
    mutationFn: id => api.delete(`/documents/subcategories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['doc-subcategories-filter', catFilter]);
      qc.invalidateQueries(['doc-subcategories-upload', uploadForm.category]);
      if (subFilter) setSubFilter('');
    },
  });

  const uploadMut = useMutation({
    mutationFn: fd => api.post('/documents/upload', fd),
    onSuccess: () => {
      qc.invalidateQueries(['documents']);
      setShowUpload(false); setSelectedFile(null);
      setUploadForm({ title: '', category: 'contract', subcategory: '', description: '' });
      setUploadError('');
    },
    onError: err => setUploadError(err?.error || err?.message || 'Upload fehlgeschlagen'),
  });

  const editMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/documents/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['documents']); setShowEdit(false); },
  });

  const delMut = useMutation({
    mutationFn: id => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries(['documents']),
  });

  // Gruppen des Nutzers (für Kopieren-Modal)
  const { data: userGroups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups'),
  });

  const copyMut = useMutation({
    mutationFn: ({ doc_ids, group_id }) => api.post('/documents/copy-to-group', { doc_ids, group_id }),
    onSuccess: (data) => {
      const total   = data.copied?.length ?? 0;
      const skipped = data.copied?.filter(c => c.skipped).length ?? 0;
      setCopyResult({ total, skipped, copied: total - skipped });
      setSelectedDocs(new Set());
      qc.invalidateQueries(['documents']);
    },
  });

  const starMut = useMutation({
    mutationFn: id => api.patch(`/documents/${id}/star`, {}),
    onSuccess: () => qc.invalidateQueries(['documents']),
  });

  const importanceMut = useMutation({
    mutationFn: ({ id, importance }) => api.patch(`/documents/${id}/importance`, { importance }),
    onSuccess: () => qc.invalidateQueries(['documents']),
  });

  // ── Hilfsfunktionen ──────────────────────────────────────────────────────────
  const handleUpload = () => {
    if (!selectedFile) return;
    setUploadError('');
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('title', uploadForm.title || selectedFile.name);
    fd.append('category', uploadForm.category);
    fd.append('subcategory', uploadForm.subcategory || '');
    fd.append('description', uploadForm.description);
    uploadMut.mutate(fd);
  };

  const selectCat = val => { setCatFilter(val); setSubFilter(''); setShowNewSub(false); setSelectedDocs(new Set()); };

  const toggleDoc = id => setSelectedDocs(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selectedDocs.size === sortedFiltered.length) { setSelectedDocs(new Set()); }
    else { setSelectedDocs(new Set(sortedFiltered.map(d => d.id))); }
  };

  const filtered = docs.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && !matchesMime(d.mimetype, typeFilter)) return false;
    if (subFilter && d.subcategory !== subFilter) return false;
    return true;
  });

  const sortedFiltered = [...filtered]
    .filter(d => {
      if (importanceFilter === 'starred') return d.starred;
      if (importanceFilter) return d.importance === importanceFilter;
      return true;
    })
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
      return 0;
    });

  // Label der aktiven Kategorie für Anzeige
  const activeCatLabel = catFilter
    ? (CATS.find(c => c.value === catFilter)?.label || customCats.find(c => c.name === catFilter)?.name || catFilter)
    : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Kopfzeile */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Dokumente</h1>
        <button
          onClick={() => { setUploadError(''); setShowUpload(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Upload size={16} /> Hochladen
        </button>
      </div>

      {/* Suchzeile */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl"
          placeholder="Dokument suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Filter-Block ────────────────────────────────────────────────────── */}
      <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Dateityp-Zeile */}
        <div>
          <p style={{ fontSize: '11px', color: '#475569', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dateityp</p>
          <div className="tab-scroll" style={{ gap: '6px' }}>
            {FILE_TYPES.map(t => (
              <Pill key={t.value} active={typeFilter === t.value} onClick={() => setTypeFilter(t.value)}>{t.label}</Pill>
            ))}
          </div>
        </div>

        {/* Trennlinie */}
        <div style={{ borderTop: '1px solid #1e1e1e' }} />

        {/* Kategorie-Zeile */}
        <div>
          <p style={{ fontSize: '11px', color: '#475569', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategorie</p>
          <div className="tab-scroll" style={{ gap: '6px' }}>
            {CATS.map(c => (
              <Pill key={c.value} active={catFilter === c.value} onClick={() => selectCat(c.value)}>{c.label}</Pill>
            ))}
            {customCats.map(cat => (
              <Pill key={cat.id} active={catFilter === cat.name}
                onClick={() => selectCat(cat.name)}
                onDelete={() => delCatMut.mutate(cat.id)}
              >{cat.icon} {cat.name}</Pill>
            ))}
            {showNewCat ? (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input autoFocus placeholder="Name..." value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newCatName.trim()) addCatMut.mutate(newCatName.trim()); if (e.key === 'Escape') setShowNewCat(false); }}
                  style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '12px', background: '#1e1e1e', border: '1px solid #f97316', color: '#fff', outline: 'none', width: '110px' }} />
                <button onClick={() => newCatName.trim() && addCatMut.mutate(newCatName.trim())} style={{ padding: '4px 8px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>+</button>
                <button onClick={() => setShowNewCat(false)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setShowNewCat(true)}
                style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', color: '#64748b', background: 'transparent', border: '1px dashed #2a2a2a', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Kategorie
              </button>
            )}
          </div>
        </div>

        {/* Unterkategorie-Zeile – nur sichtbar wenn Kategorie ausgewählt */}
        {catFilter && (
          <>
            <div style={{ borderTop: '1px solid #1e1e1e' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeCatLabel}
                </p>
                <ChevronRight size={11} style={{ color: '#475569' }} />
                <p style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unterordner</p>
              </div>
              <div className="tab-scroll" style={{ gap: '6px' }}>
                <Pill active={subFilter === ''} onClick={() => setSubFilter('')}>Alle</Pill>
                {filterSubs.map(sub => (
                  <Pill key={sub.id} active={subFilter === sub.name}
                    onClick={() => setSubFilter(sub.name)}
                    onDelete={() => delSubMut.mutate(sub.id)}
                  >{sub.name}</Pill>
                ))}
                {showNewSub ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input autoFocus placeholder="z.B. Handyvertrag O2..." value={newSubName} onChange={e => setNewSubName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newSubName.trim()) addSubMut.mutate({ name: newSubName.trim(), parent: catFilter }); if (e.key === 'Escape') setShowNewSub(false); }}
                      style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '12px', background: '#1e1e1e', border: '1px solid #f97316', color: '#fff', outline: 'none', width: '150px' }} />
                    <button onClick={() => newSubName.trim() && addSubMut.mutate({ name: newSubName.trim(), parent: catFilter })}
                      style={{ padding: '4px 8px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>+</button>
                    <button onClick={() => setShowNewSub(false)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewSub(true)}
                    style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', color: '#64748b', background: 'transparent', border: '1px dashed #2a2a2a', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    + Unterordner
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Aktionsleiste (erscheint wenn Dokumente ausgewählt) ─────────────── */}
      {selectedDocs.size > 0 && (
        <div style={{
          position: 'sticky', top: '12px', zIndex: 40,
          background: '#1a1a1a', border: '1px solid #f97316',
          borderRadius: '14px', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 4px 24px rgba(249,115,22,0.2)',
        }}>
          <span style={{ fontSize: '13px', color: '#f97316', fontWeight: 600, flex: 1 }}>
            {selectedDocs.size} Dokument{selectedDocs.size !== 1 ? 'e' : ''} ausgewählt
          </span>
          <button onClick={() => setSelectedDocs(new Set())}
            style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 10px' }}>
            Abwählen
          </button>
          <button
            onClick={() => { setCopyResult(null); setCopyTargetGroup(userGroups[0]?.id?.toString() || ''); setShowCopyModal(true); }}
            disabled={userGroups.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', background: '#f97316', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              cursor: userGroups.length === 0 ? 'not-allowed' : 'pointer', opacity: userGroups.length === 0 ? 0.5 : 1,
            }}>
            <Users size={14} /> In Gruppe kopieren
          </button>
        </div>
      )}

      {/* ── Sort-Bar ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <ArrowDownUp size={13} style={{ color: '#475569', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '2px' }}>Sortierung:</span>
        {[
          { key: 'importance', label: 'Wichtigkeit' },
          { key: 'date',       label: 'Datum' },
          { key: 'name',       label: 'Name' },
          { key: 'size',       label: 'Größe' },
        ].map(s => (
          <button key={s.key} onClick={() => setSortBy(s.key)} style={{
            padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s',
            background: sortBy === s.key ? '#f97316' : 'transparent',
            color: sortBy === s.key ? '#fff' : '#64748b',
            border: sortBy === s.key ? '1px solid #f97316' : '1px solid #2a2a2a',
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── Schnellfilter-Chips ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {[
          { key: '',        label: 'Alle' },
          { key: 'starred', label: '⭐ Favoriten' },
          { key: 'dringend',label: '🔴 Dringend' },
          { key: 'wichtig', label: '🟡 Wichtig' },
          { key: 'archiv',  label: '📦 Archiv' },
        ].map(f => (
          <button key={f.key} onClick={() => setImportanceFilter(f.key)} style={{
            padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
            background: importanceFilter === f.key ? 'rgba(249,115,22,0.15)' : 'transparent',
            color: importanceFilter === f.key ? '#f97316' : '#64748b',
            border: importanceFilter === f.key ? '1px solid rgba(249,115,22,0.4)' : '1px solid #2a2a2a',
          }}>{f.label}</button>
        ))}
      </div>

      {/* ── Dokument-Liste ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
      ) : sortedFiltered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
          <FilePlus size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Keine Dokumente gefunden</p>
          <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-orange-400 hover:text-orange-500">Erstes Dokument hochladen →</button>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Kopfzeile der Liste: "Alle auswählen" */}
          <div style={{ padding: '8px 16px 6px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedDocs.size === sortedFiltered.length && sortedFiltered.length > 0 ? '#f97316' : '#475569', display: 'flex', padding: 0 }}>
              {selectedDocs.size === sortedFiltered.length && sortedFiltered.length > 0
                ? <CheckSquare size={15} />
                : <Square size={15} />}
            </button>
            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, userSelect: 'none' }}>
              {selectedDocs.size > 0 ? `${selectedDocs.size} / ${sortedFiltered.length} ausgewählt` : 'Alle auswählen'}
            </span>
          </div>
          <div className="divide-y divide-border">
            {sortedFiltered.map(doc => {
              const isSelected = selectedDocs.has(doc.id);
              const imp = doc.importance || 'normal';
              const impCfg = IMPORTANCE[imp] || IMPORTANCE.normal;
              return (
                <div key={doc.id}
                  className="flex items-center group"
                  style={{
                    gap: '3px',
                    borderLeft: `3px solid ${impCfg.border}`,
                    background: isSelected ? 'rgba(249,115,22,0.05)' : (imp === 'archiv' ? 'rgba(15,23,42,0.5)' : undefined),
                    opacity: imp === 'archiv' ? 0.6 : 1,
                    padding: '10px 12px 10px 10px',
                    transition: 'background 0.15s',
                  }}>
                  {/* Checkbox */}
                  <button onClick={() => toggleDoc(doc.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? '#f97316' : '#334155', display: 'flex', flexShrink: 0, padding: '4px' }}>
                    {isSelected ? <CheckSquare size={15} /> : <Square size={15} className="opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 0.15s' }} />}
                  </button>
                  {/* File icon */}
                  <div className="w-9 h-9 bg-bg rounded-lg flex items-center justify-center" style={{ flexShrink: 0 }}>{fileIcon(doc.mimetype)}</div>
                  {/* Title + meta */}
                  <div style={{ flex: 1, minWidth: 0, padding: '0 8px' }}>
                    <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      <span className="hidden sm:inline">{doc.filename} · </span>
                      {formatSize(doc.size)}
                      <span className="hidden md:inline"> · {format(new Date(doc.created_at), 'd. MMM yyyy', { locale: de })}</span>
                    </p>
                  </div>
                  {/* Category badge */}
                  {(doc.category || doc.subcategory) && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 hidden sm:inline" style={{ flexShrink: 0 }}>
                      {doc.category}{doc.subcategory ? ` › ${doc.subcategory}` : ''}
                    </span>
                  )}
                  {/* Importance badge — click to cycle */}
                  {imp !== 'normal' && (
                    <button
                      onClick={() => {
                        const levels = ['normal', 'wichtig', 'dringend', 'archiv'];
                        const next = levels[(levels.indexOf(imp) + 1) % levels.length];
                        importanceMut.mutate({ id: doc.id, importance: next });
                      }}
                      title="Wichtigkeit ändern"
                      style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        background: impCfg.bg, color: impCfg.color,
                        border: `1px solid ${impCfg.border}`,
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {impCfg.label}
                    </button>
                  )}
                  {/* Star button */}
                  <button
                    onClick={() => starMut.mutate(doc.id)}
                    title={doc.starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: doc.starred ? '#f59e0b' : '#334155',
                      display: 'flex', padding: '4px', flexShrink: 0,
                      transition: 'color 0.15s',
                    }}
                  >
                    <Star size={14} fill={doc.starred ? '#f59e0b' : 'none'} />
                  </button>
                  {/* Actions */}
                  <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" style={{ flexShrink: 0 }}>
                    <a href={doc.filepath} download target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-green-400 rounded-lg transition-colors"><Download size={14} /></a>
                    <button onClick={() => { setEditDoc(doc); setEditForm({ title: doc.title, category: doc.category || 'other', subcategory: doc.subcategory || '', description: doc.description || '', importance: doc.importance || 'normal', starred: doc.starred || 0 }); setShowEdit(true); }}
                      className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"><Edit size={14} /></button>
                    <button onClick={() => delMut.mutate(doc.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Upload-Modal ─────────────────────────────────────────────────────── */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Dokument hochladen">
        <div className="space-y-4">
          {/* Datei wählen */}
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-orange-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors">
            <Upload size={24} className="text-slate-500 mx-auto mb-2" />
            {selectedFile
              ? <p className="text-sm text-orange-400 font-medium">{selectedFile.name} ({formatSize(selectedFile.size)})</p>
              : <p className="text-sm text-slate-500">Klicken zum Auswählen <span className="text-orange-400">oder Datei ziehen</span></p>}
            <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) { setSelectedFile(f); setUploadForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') })); } }} />
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Titel</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} /></div>

          {/* Kategorie */}
          <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.category}
              onChange={e => setUploadForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}>
              {CATS.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              {customCats.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>

          {/* Unterkategorie pro Kategorie */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="text-sm text-slate-400">Unterordner <span className="text-slate-600 text-xs">(optional)</span></label>
              <button onClick={() => setShowModalSub(v => !v)} style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer', background: 'none', border: 'none' }}>
                + Neuer Unterordner
              </button>
            </div>
            {showModalSub && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input autoFocus placeholder={`Unterordner für ${CATS.find(c=>c.value===uploadForm.category)?.label || uploadForm.category}...`}
                  value={modalSubName} onChange={e => setModalSubName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && modalSubName.trim()) addSubMut.mutate({ name: modalSubName.trim(), parent: uploadForm.category }); }}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', fontSize: '13px', background: '#1e1e1e', border: '1px solid #f97316', color: '#fff', outline: 'none' }} />
                <button onClick={() => modalSubName.trim() && addSubMut.mutate({ name: modalSubName.trim(), parent: uploadForm.category })}
                  style={{ padding: '7px 12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>+</button>
              </div>
            )}
            <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.subcategory}
              onChange={e => setUploadForm(f => ({ ...f, subcategory: e.target.value }))}>
              <option value="">— Kein Unterordner —</option>
              {uploadSubs.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
            </select>
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={uploadForm.description}
              onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} /></div>

          {uploadError && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{uploadError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={handleUpload} disabled={!selectedFile || uploadMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {uploadMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Hochladen
            </button>
          </div>
        </div>
      </Modal>

      {/* ── In Gruppe kopieren Modal ─────────────────────────────────────────── */}
      <Modal open={showCopyModal} onClose={() => { setShowCopyModal(false); setCopyResult(null); }} title="In Gruppe kopieren" size="sm">
        <div className="space-y-4">
          {copyResult ? (
            /* Ergebnis */
            <div className="space-y-3">
              <div style={{ background: '#16a34a1a', border: '1px solid #16a34a44', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  ✓ {copyResult.copied} Dokument{copyResult.copied !== 1 ? 'e' : ''} kopiert
                </p>
                {copyResult.skipped > 0 && (
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                    {copyResult.skipped} bereits vorhanden (übersprungen)
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <button onClick={() => { setShowCopyModal(false); setCopyResult(null); }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium">
                  Fertig
                </button>
              </div>
            </div>
          ) : (
            /* Gruppen-Auswahl */
            <>
              <div>
                <p className="text-sm text-slate-400 mb-1">{selectedDocs.size} Dokument{selectedDocs.size !== 1 ? 'e' : ''} werden kopiert in:</p>
                {userGroups.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Du bist in keiner Gruppe.</p>
                ) : (
                  <div className="space-y-2 mt-3">
                    {userGroups.map(g => (
                      <label key={g.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                        background: copyTargetGroup === String(g.id) ? 'rgba(249,115,22,0.1)' : '#1a1a1a',
                        border: `1px solid ${copyTargetGroup === String(g.id) ? '#f97316' : '#1e1e1e'}`,
                        transition: 'all 0.15s',
                      }}>
                        <input type="radio" name="copyGroup" value={g.id}
                          checked={copyTargetGroup === String(g.id)}
                          onChange={() => setCopyTargetGroup(String(g.id))}
                          style={{ accentColor: '#f97316' }} />
                        <div>
                          <p style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{g.name}</p>
                          {g.description && <p style={{ fontSize: '11px', color: '#64748b' }}>{g.description}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowCopyModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
                <button
                  onClick={() => copyMut.mutate({ doc_ids: [...selectedDocs], group_id: parseInt(copyTargetGroup) })}
                  disabled={!copyTargetGroup || copyMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {copyMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                  Kopieren
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Bearbeiten-Modal ─────────────────────────────────────────────────── */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Dokument bearbeiten" size="sm">
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={editForm.category}
              onChange={e => setEditForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}>
              {CATS.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Wichtigkeit</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(IMPORTANCE).map(([key, cfg]) => (
                <button key={key}
                  onClick={() => setEditForm(f => ({ ...f, importance: key }))}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', border: `1px solid ${editForm.importance === key ? cfg.color : '#2a2a2a'}`,
                    background: editForm.importance === key ? cfg.bg : 'transparent',
                    color: editForm.importance === key ? cfg.color : '#64748b',
                  }}>
                  {cfg.label}
                </button>
              ))}
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
