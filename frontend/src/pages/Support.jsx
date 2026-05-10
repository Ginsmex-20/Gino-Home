import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone, Mail, ExternalLink, Plus, Trash2, Edit, Loader2, Search,
  HeadphonesIcon, Headphones, Globe, Copy, Check,
} from 'lucide-react';
import Modal from '../components/Modal';
import api from '../api/client';
import { PageHeader, EmptyState, StatCard } from '../components/ui';

function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      return true;
    }
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  } catch { return false; }
}

function displayDomain(url) {
  if (!url) return '';
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

/* Karte für einen Support-Kontakt */
function SupportCard({ entry, onEdit, onDelete }) {
  const [copied, setCopied] = useState('');
  const copy = (text, field) => { if (copyToClipboard(text)) { setCopied(field); setTimeout(() => setCopied(''), 1500); } };
  const hrefUrl = entry.website ? (entry.website.startsWith('http') ? entry.website : `https://${entry.website}`) : null;
  const telHref = entry.username ? `tel:${entry.username.replace(/\s+/g, '')}` : null;

  return (
    <div style={{
      background: '#141414', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '14px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = '#06b6d455'}
    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e1e'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(6,182,212,0.08))',
          border: '1px solid rgba(6,182,212,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: 700, color: '#06b6d4',
        }}>
          {entry.title ? entry.title[0].toUpperCase() : <Headphones size={20} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</p>
          {entry.username && <p style={{ fontSize: '12px', color: '#06b6d4', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📞 {entry.username}</p>}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button onClick={() => onEdit(entry)} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', borderRadius: '6px' }}><Edit size={13} /></button>
          <button onClick={() => onDelete(entry.id)} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', borderRadius: '6px' }}><Trash2 size={13} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Telefon */}
        {entry.username && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#0a0a0a', borderRadius: '9px' }}>
            <Phone size={13} color="#22c55e" />
            <span style={{ flex: 1, fontSize: '13px', color: '#cbd5e1', fontFamily: 'monospace' }}>{entry.username}</span>
            <a href={telHref} style={{ padding: '5px 9px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}>Anrufen</a>
            <button onClick={() => copy(entry.username, 'tel')} style={{ padding: '5px', background: 'transparent', border: 'none', color: copied === 'tel' ? '#22c55e' : '#64748b', cursor: 'pointer' }}>
              {copied === 'tel' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        )}
        {/* E-Mail */}
        {entry.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#0a0a0a', borderRadius: '9px' }}>
            <Mail size={13} color="#3b82f6" />
            <span style={{ flex: 1, fontSize: '13px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.email}</span>
            <a href={`mailto:${entry.email}`} style={{ padding: '5px 9px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}>Mail</a>
            <button onClick={() => copy(entry.email, 'mail')} style={{ padding: '5px', background: 'transparent', border: 'none', color: copied === 'mail' ? '#22c55e' : '#64748b', cursor: 'pointer' }}>
              {copied === 'mail' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        )}
        {/* Website */}
        {entry.website && (
          <a href={hrefUrl} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#0a0a0a', borderRadius: '9px', textDecoration: 'none' }}>
            <Globe size={13} color="#a855f7" />
            <span style={{ flex: 1, fontSize: '13px', color: '#cbd5e1' }}>{displayDomain(entry.website)}</span>
            <ExternalLink size={11} color="#64748b" />
          </a>
        )}
      </div>
      {entry.notes && <p style={{ fontSize: '11px', color: '#64748b', margin: 0, padding: '4px 4px 0' }}>{entry.notes}</p>}
    </div>
  );
}

const emptyForm = { title: '', email: '', username: '', website: '', notes: '', category: 'support' };

export default function Support() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(emptyForm);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['vault', 'support'],
    queryFn:  () => api.get('/vault?category=support'),
  });

  const saveMut = useMutation({
    mutationFn: d => editing ? api.put(`/vault/${editing.id}`, d) : api.post('/vault', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault'] }); setShowModal(false); setEditing(null); setForm(emptyForm); },
  });

  const delMut = useMutation({
    mutationFn: id => api.delete(`/vault/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vault'] }),
  });

  const filtered = entries.filter(e => !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.username?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = (e) => { setEditing(e); setForm({ ...emptyForm, ...e, category: 'support' }); setShowModal(true); };
  const handleDel  = (id) => { if (confirm('Support-Kontakt wirklich löschen?')) delMut.mutate(id); };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Headphones}
        title="Support"
        subtitle="Hotlines & Support-Kontakte für schnellen Zugriff"
        iconColor="#06b6d4"
        action={
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-medium shadow-md shadow-cyan-500/20"
            style={{ background: '#06b6d4' }}>
            <Plus size={16} /> Kontakt hinzufügen
          </button>
        }
      />

      {/* Such-Bar */}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl"
          placeholder="DHL, O2, Telekom..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-cyan-500" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Headphones} title="Keine Support-Kontakte"
          message="Speichere wichtige Hotlines & E-Mails (DHL, O2, Strom-Anbieter etc.) für schnellen Zugriff im Notfall."
          actionLabel="Ersten Kontakt hinzufügen" onAction={openCreate} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(e => <SupportCard key={e.id} entry={e} onEdit={openEdit} onDelete={handleDel} />)}
        </div>
      )}

      {/* Modal: hinzufügen / bearbeiten */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Support-Kontakt bearbeiten' : 'Neuer Support-Kontakt'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Unternehmen / Anbieter *</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="z.B. DHL, O2, Telekom..."
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Telefon-Hotline</label>
              <input type="tel" className="w-full px-3.5 py-2.5 text-sm" placeholder="+49 800 123456"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Support-E-Mail</label>
              <input type="email" className="w-full px-3.5 py-2.5 text-sm" placeholder="support@firma.de"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Website</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="firma.de/service"
              value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Notizen</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} placeholder="z.B. Mo-Fr 8-18 Uhr"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => saveMut.mutate(form)} disabled={!form.title || saveMut.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#06b6d4', color: '#fff', border: 'none', borderRadius: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saveMut.isPending ? 0.7 : 1 }}>
              {saveMut.isPending && <Loader2 size={13} className="animate-spin" />} Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
