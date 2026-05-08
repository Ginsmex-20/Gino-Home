import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, Eye, EyeOff, Copy, Trash2, Edit, Search, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import Modal from '../components/Modal';
import api from '../api/client';

const CATS = [
  { v: '', l: 'Alle' },
  { v: 'subscription', l: 'Abonnements' },
  { v: 'account', l: 'Accounts' },
  { v: 'email', l: 'E-Mails' },
  { v: 'other', l: 'Sonstiges' },
];

const emptyForm = { title: '', email: '', username: '', password: '', website: '', category: 'other', notes: '' };

function displayDomain(url) {
  if (!url) return '';
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); }
  catch { return url.length > 30 ? url.slice(0, 30) + '…' : url; }
}

function VaultEntry({ entry, onEdit, onDelete }) {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState('');

  const copy = (text, field) => {
    const val = text || '';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(val);
      } else {
        // HTTP-Fallback (kein HTTPS)
        const el = document.createElement('textarea');
        el.value = val;
        el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
    } catch {}
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const catStyles = {
    subscription: 'text-amber-400 bg-amber-500/10',
    account:      'text-blue-400 bg-blue-500/10',
    email:        'text-purple-400 bg-purple-500/10',
    other:        'text-slate-400 bg-slate-700/60',
  };
  const catLabels = { subscription: 'Abo', account: 'Account', email: 'E-Mail', other: 'Sonstiges' };
  const hrefUrl = entry.website ? (entry.website.startsWith('http') ? entry.website : `https://${entry.website}`) : '#';

  return (
    <div className="bg-bg-card border border-border hover:border-orange-500/30 rounded-2xl p-4 transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <KeyRound size={16} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{entry.title}</p>
            {entry.website && (
              <a href={hrefUrl} target="_blank" rel="noreferrer"
                className="text-xs text-orange-500/70 hover:text-orange-500 flex items-center gap-1 mt-0.5 max-w-[180px]">
                <span className="truncate">{displayDomain(entry.website)}</span>
                <ExternalLink size={10} className="shrink-0" />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${catStyles[entry.category] || catStyles.other}`}>
            {catLabels[entry.category] || 'Sonstiges'}
          </span>
          <button onClick={() => onEdit(entry)} className="p-1.5 text-slate-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Edit size={13} /></button>
          <button onClick={() => onDelete(entry.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={13} /></button>
        </div>
      </div>

      <div className="space-y-1.5">
        {entry.email && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-bg rounded-lg">
            <span className="text-xs text-slate-500 shrink-0 w-20">E-Mail</span>
            <span className="text-xs text-slate-300 flex-1 text-right truncate">{entry.email}</span>
            <button onClick={() => copy(entry.email, 'email')} className="shrink-0 p-0.5 text-slate-500 hover:text-orange-500 transition-colors">
              <Copy size={12} className={copied === 'email' ? 'text-green-400' : ''} />
            </button>
          </div>
        )}
        {entry.username && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-bg rounded-lg">
            <span className="text-xs text-slate-500 shrink-0 w-20">Benutzername</span>
            <span className="text-xs text-slate-300 flex-1 text-right truncate">{entry.username}</span>
            <button onClick={() => copy(entry.username, 'username')} className="shrink-0 p-0.5 text-slate-500 hover:text-orange-500 transition-colors">
              <Copy size={12} className={copied === 'username' ? 'text-green-400' : ''} />
            </button>
          </div>
        )}
        {entry.password && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-bg rounded-lg">
            <span className="text-xs text-slate-500 shrink-0 w-20">Passwort</span>
            <span className="text-xs text-slate-300 flex-1 text-right font-mono truncate">{showPw ? entry.password : '••••••••'}</span>
            <div className="flex gap-0.5 shrink-0">
              <button onClick={() => setShowPw(v => !v)} className="p-0.5 text-slate-500 hover:text-orange-500 transition-colors">
                {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button onClick={() => copy(entry.password, 'pw')} className="p-0.5 text-slate-500 hover:text-orange-500 transition-colors">
                <Copy size={12} className={copied === 'pw' ? 'text-green-400' : ''} />
              </button>
            </div>
          </div>
        )}
        {entry.notes && <p className="text-xs text-slate-500 px-1 pt-1 truncate">{entry.notes}</p>}
      </div>
    </div>
  );
}

export default function Vault() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: entries = [], isLoading } = useQuery({ queryKey: ['vault', catFilter], queryFn: () => api.get('/vault' + (catFilter ? `?category=${catFilter}` : '')) });

  const saveMutation = useMutation({
    mutationFn: d => editing ? api.put(`/vault/${editing.id}`, d) : api.post('/vault', d),
    onSuccess: () => { qc.invalidateQueries(['vault']); setShowModal(false); setEditing(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/vault/${id}`),
    onSuccess: () => qc.invalidateQueries(['vault'])
  });

  const openEdit = entry => { setEditing(entry); setForm({ ...entry }); setShowModal(true); };
  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const filtered = entries.filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase()) || e.website?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck size={22} className="text-orange-500" /> Tresor
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Passwörter & Zugangsdaten – verschlüsselt gespeichert</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
          <Plus size={16} /> Eintrag hinzufügen
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl" placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {CATS.map(c => (
            <button key={c.v} onClick={() => setCatFilter(c.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${catFilter === c.v ? 'bg-orange-500 text-white' : 'bg-bg-card border border-border text-slate-400 hover:text-white'}`}>
              {c.l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
          <KeyRound size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Keine Einträge gefunden</p>
          <button onClick={openCreate} className="mt-3 text-sm text-orange-500 hover:text-orange-600">Ersten Eintrag erstellen →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(e => <VaultEntry key={e.id} entry={e} onEdit={openEdit} onDelete={id => deleteMutation.mutate(id)} />)}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}>
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel *</label><input className="w-full px-3.5 py-2.5 text-sm" placeholder="z.B. Netflix, Google..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1.5">E-Mail</label><input type="email" className="w-full px-3.5 py-2.5 text-sm" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Benutzername</label><input className="w-full px-3.5 py-2.5 text-sm" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Passwort</label><input type="password" className="w-full px-3.5 py-2.5 text-sm font-mono" placeholder="Passwort eingeben" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1.5">Website</label><input className="w-full px-3.5 py-2.5 text-sm" placeholder="netflix.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="subscription">Abonnement</option>
                <option value="account">Account</option>
                <option value="email">E-Mail</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Notizen</label><textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowModal(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => saveMutation.mutate(form)} disabled={!form.title || saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 shadow-md shadow-orange-500/20">
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
