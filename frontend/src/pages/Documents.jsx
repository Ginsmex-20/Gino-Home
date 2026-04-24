import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, File, Image, Trash2, Edit, Download, Search, Loader2, FilePlus } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';

const CATS = ['Alle', 'Vertrag', 'Rechnung', 'Ausweis', 'Versicherung', 'Steuern', 'Sonstiges'];
const CAT_VALS = ['contract', 'invoice', 'identity', 'insurance', 'tax', 'other'];

function fileIcon(mime) {
  if (mime?.startsWith('image/')) return <Image size={18} className="text-purple-400" />;
  if (mime?.includes('pdf')) return <FileText size={18} className="text-red-400" />;
  return <File size={18} className="text-blue-400" />;
}

function formatSize(bytes) {
  if (!bytes) return '–';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export default function Documents() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [uploadForm, setUploadForm] = useState({ title: '', category: 'other', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', category: '', description: '' });

  const { data: docs = [], isLoading } = useQuery({ queryKey: ['documents', catFilter], queryFn: () => api.get('/documents' + (catFilter ? `?category=${catFilter}` : '')) });

  const uploadMutation = useMutation({
    mutationFn: fd => api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { qc.invalidateQueries(['documents']); setShowUpload(false); setSelectedFile(null); setUploadForm({ title: '', category: 'other', description: '' }); }
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/documents/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['documents']); setShowEdit(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries(['documents'])
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('title', uploadForm.title || selectedFile.name);
    fd.append('category', uploadForm.category);
    fd.append('description', uploadForm.description);
    uploadMutation.mutate(fd);
  };

  const handleFileSelect = e => {
    const f = e.target.files[0];
    if (f) { setSelectedFile(f); setUploadForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') })); }
  };

  const filtered = docs.filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Dokumente</h1>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors">
          <Upload size={16} /> Hochladen
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl" placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATS.map((c, i) => (
            <button key={c} onClick={() => setCatFilter(i === 0 ? '' : CAT_VALS[i - 1])}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${(i === 0 ? catFilter === '' : catFilter === CAT_VALS[i-1]) ? 'bg-orange-500 text-white' : 'bg-bg-card border border-border text-slate-400 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
          <FilePlus size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Keine Dokumente gefunden</p>
          <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-orange-400 hover:text-orange-500">Erstes Dokument hochladen →</button>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-4 py-3 hover:bg-bg-hover transition-colors group">
                <div className="w-9 h-9 bg-bg rounded-lg flex items-center justify-center shrink-0">{fileIcon(doc.mimetype)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                  <p className="text-xs text-slate-500">{doc.filename} · {formatSize(doc.size)} · {format(new Date(doc.created_at), 'd. MMM yyyy', { locale: de })}</p>
                </div>
                {doc.category && <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 shrink-0">{doc.category}</span>}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={doc.filepath} download target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-green-400 rounded-lg transition-colors"><Download size={14} /></a>
                  <button onClick={() => { setEditDoc(doc); setEditForm({ title: doc.title, category: doc.category, description: doc.description || '' }); setShowEdit(true); }} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"><Edit size={14} /></button>
                  <button onClick={() => deleteMutation.mutate(doc.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Dokument hochladen">
        <div className="space-y-4">
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border hover:border-orange-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors">
            <Upload size={24} className="text-slate-500 mx-auto mb-2" />
            {selectedFile ? (
              <p className="text-sm text-orange-400 font-medium">{selectedFile.name} ({formatSize(selectedFile.size)})</p>
            ) : (
              <p className="text-sm text-slate-500">Klicken zum Auswählen <span className="text-orange-400">oder Datei ziehen</span></p>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel</label><input className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}>
              {CAT_VALS.map((v, i) => <option key={v} value={v}>{CATS[i+1]}</option>)}
            </select>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label><textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {uploadMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Hochladen
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Dokument bearbeiten" size="sm">
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel</label><input className="w-full px-3.5 py-2.5 text-sm" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
              {CAT_VALS.map((v, i) => <option key={v} value={v}>{CATS[i+1]}</option>)}
            </select>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label><textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => editMutation.mutate({ id: editDoc.id, data: editForm })} disabled={editMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {editMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
