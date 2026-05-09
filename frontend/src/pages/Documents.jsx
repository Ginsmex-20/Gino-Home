import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, File, Image, Trash2, Edit, Download,
  Search, Loader2, FilePlus, X, Film, Music, Archive, FileCode, ChevronRight,
  Copy, CheckSquare, Square, Users, Star, ArrowDownUp,
  Calendar, CheckCircle2, BellRing, Paperclip, Plus,
  FileSignature, Receipt, CreditCard, Shield, Banknote, Folder,
  AlertTriangle, Eye, FolderOpen, LayoutGrid, List as ListIcon,
  Link2, Euro, Unlink, Heart, Share2,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';

/* ════════════════════════════════════════════════════════════════════════
   KONSTANTEN
   ════════════════════════════════════════════════════════════════════════ */

const CATEGORY_CONFIG = {
  contract:  { label: 'Verträge',     icon: FileSignature, color: '#3b82f6' },
  invoice:   { label: 'Rechnungen',   icon: Receipt,        color: '#f97316' },
  identity:  { label: 'Ausweise',     icon: CreditCard,     color: '#a855f7' },
  insurance: { label: 'Versicherung', icon: Shield,         color: '#06b6d4' },
  tax:       { label: 'Steuern',      icon: Banknote,       color: '#10b981' },
  other:     { label: 'Sonstiges',    icon: Folder,         color: '#64748b' },
};
const CAT_KEYS = Object.keys(CATEGORY_CONFIG);

const FILE_TYPES = [
  { label: 'Alle Typen', value: '' },
  { label: 'Bilder',     value: 'image' },
  { label: 'PDFs',       value: 'pdf' },
  { label: 'Videos',     value: 'video' },
  { label: 'Audio',      value: 'audio' },
  { label: 'Office',     value: 'office' },
  { label: 'Archive',    value: 'archive' },
];

const IMPORTANCE = {
  dringend: { label: 'Dringend', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: '#ef4444' },
  wichtig:  { label: 'Wichtig',  color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: '#f97316' },
  normal:   { label: 'Normal',   color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'transparent' },
  archiv:   { label: 'Archiv',   color: '#334155', bg: 'rgba(51,65,85,0.15)',  border: '#1e293b' },
};

/* ════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════ */

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

function fileIcon(mime, size = 18) {
  if (!mime) return <File size={size} className="text-slate-400" />;
  if (mime.startsWith('image/'))   return <Image    size={size} className="text-purple-400" />;
  if (mime.includes('pdf'))        return <FileText size={size} className="text-red-400" />;
  if (mime.startsWith('video/'))   return <Film     size={size} className="text-pink-400" />;
  if (mime.startsWith('audio/'))   return <Music    size={size} className="text-green-400" />;
  if (['zip','rar','tar'].some(k => mime.includes(k))) return <Archive size={size} className="text-yellow-400" />;
  if (mime.includes('word') || mime.includes('document'))     return <FileText size={size} className="text-blue-400" />;
  if (mime.includes('excel') || mime.includes('spreadsheet')) return <FileText size={size} className="text-emerald-400" />;
  if (mime.startsWith('text/')) return <FileCode size={size} className="text-cyan-400" />;
  return <File size={size} className="text-slate-400" />;
}

function formatSize(b) {
  if (!b) return '–';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function getDueUrgency(due_date, paid) {
  if (!due_date) return null;
  if (paid) return { level: 'paid', label: 'Bezahlt', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: '#22c55e' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(due_date);
  const diffDays = Math.ceil((due - today) / 86400000);
  if (diffDays < 0)   return { level: 'overdue',  label: `Überfällig (${Math.abs(diffDays)}T)`, color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: '#ef4444' };
  if (diffDays === 0) return { level: 'today',    label: 'Heute fällig!',                color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: '#f97316' };
  if (diffDays <= 7)  return { level: 'soon',     label: `Fällig in ${diffDays}T`,       color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: '#f97316' };
  if (diffDays <= 30) return { level: 'upcoming', label: `Fällig in ${diffDays}T`,       color: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: '#eab308' };
  return { level: 'ok', label: format(due, 'd. MMM yyyy', { locale: de }), color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'transparent' };
}

/* ════════════════════════════════════════════════════════════════════════
   STAT-CARD (oben)
   ════════════════════════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: '120px',
        background: active ? `${color}15` : '#141414',
        border: `1px solid ${active ? `${color}55` : '#1e1e1e'}`,
        borderRadius: '14px', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s', textAlign: 'left',
      }}
      onMouseEnter={e => { if (onClick && !active) e.currentTarget.style.borderColor = `${color}66`; }}
      onMouseLeave={e => { if (onClick && !active) e.currentTarget.style.borderColor = '#1e1e1e'; }}
    >
      <div style={{
        width: '38px', height: '38px', borderRadius: '10px',
        background: `${color}1a`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '20px', color: '#fff', fontWeight: 700, margin: '2px 0 0', lineHeight: 1.1 }}>{value}</p>
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CATEGORY-CARD
   ════════════════════════════════════════════════════════════════════════ */
function CategoryCard({ icon: Icon, label, color, count, active, onClick, onDelete }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={onClick}
        style={{
          minWidth: '130px',
          background: active ? `${color}1a` : '#141414',
          border: `1px solid ${active ? color : '#1e1e1e'}`,
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: '10px',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = `${color}66`; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#1e1e1e'; }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '9px',
          background: `${color}22`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={15} color={color} />
        </div>
        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', color: active ? '#fff' : '#cbd5e1', fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>{label}</p>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0' }}>{count} Dok.</p>
        </div>
      </button>
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%',
            background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#ef4444',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <X size={10} />
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DOKUMENT-DETAIL-MODAL (mit Anhängen)
   ════════════════════════════════════════════════════════════════════════ */
function DetailModal({ open, doc, onClose, onEdit, onDelete, onLinkContract, onLinkLoan, onUnlink }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', doc?.id],
    queryFn: () => api.get(`/documents/${doc.id}/attachments`),
    enabled: !!doc?.id && open,
  });

  const { data: friendsData = { accepted: [] } } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends'),
    enabled: open,
  });

  const { data: shareAccess = [] } = useQuery({
    queryKey: ['share-access', 'document', doc?.id],
    queryFn: () => api.get(`/friends/share/access/document/${doc.id}`),
    enabled: !!doc?.id && open,
  });

  const shareMut = useMutation({
    mutationFn: friend_id => api.post('/friends/share', { friend_id, resource_type: 'document', resource_id: doc.id }),
    onSuccess: () => qc.invalidateQueries(['share-access', 'document', doc.id]),
  });

  const unshareMut = useMutation({
    mutationFn: friend_id => api.delete('/friends/share', { data: { friend_id, resource_type: 'document', resource_id: doc.id } }),
    onSuccess: () => qc.invalidateQueries(['share-access', 'document', doc.id]),
  });

  const addAttachMut = useMutation({
    mutationFn: (files) => {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      return api.post(`/documents/${doc.id}/attachments`, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries(['attachments', doc.id]);
      qc.invalidateQueries(['documents']);
      setUploading(false);
    },
    onError: () => setUploading(false),
  });

  const delAttachMut = useMutation({
    mutationFn: (id) => api.delete(`/documents/attachments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['attachments', doc.id]);
      qc.invalidateQueries(['documents']);
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
  const cat = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.other;
  const CatIcon = cat.icon;
  const urg = getDueUrgency(doc.due_date, doc.paid);
  const imp = doc.importance || 'normal';
  const impCfg = IMPORTANCE[imp] || IMPORTANCE.normal;

  return (
    <Modal open={open} onClose={onClose} title={null} size="lg">
      <div style={{ marginTop: '-8px' }}>
        {/* Hero-Header */}
        <div style={{
          background: `linear-gradient(135deg, ${cat.color}1a, ${cat.color}05)`,
          border: `1px solid ${cat.color}33`,
          borderRadius: '14px', padding: '16px 18px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '50px', height: '50px', borderRadius: '12px',
            background: `${cat.color}33`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CatIcon size={22} color={cat.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', color: cat.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {cat.label}{doc.subcategory ? ` › ${doc.subcategory}` : ''}
            </p>
            <p style={{ fontSize: '18px', color: '#fff', fontWeight: 700, margin: '3px 0', lineHeight: 1.2, wordBreak: 'break-word' }}>
              {doc.title}
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {urg && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: urg.bg, color: urg.color, border: `1px solid ${urg.border}66` }}>
                  {doc.paid ? <CheckCircle2 size={11} /> : <Calendar size={11} />} {urg.label}
                </span>
              )}
              {imp !== 'normal' && (
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: impCfg.bg, color: impCfg.color, border: `1px solid ${impCfg.border}` }}>
                  {impCfg.label}
                </span>
              )}
              {doc.starred ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}>
                  <Star size={10} fill="#f59e0b" /> Favorit
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Beschreibung */}
        {doc.description && (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Beschreibung</p>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{doc.description}</p>
          </div>
        )}

        {/* Betrag + Verknüpfung */}
        {(doc.amount || doc.linked_type) && (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
            {doc.amount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: doc.linked_type ? '10px' : 0 }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Betrag</span>
                <span style={{ fontSize: '15px', color: '#f97316', fontWeight: 700 }}>{Number(doc.amount).toFixed(2)} €</span>
              </div>
            )}
            {doc.linked_type && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: '9px' }}>
                <Link2 size={13} color="#60a5fa" />
                <span style={{ flex: 1, fontSize: '12px', color: '#cbd5e1' }}>
                  Verknüpft mit: <strong style={{ color: '#60a5fa' }}>{doc.linked_type === 'contract' ? 'Vertrag' : 'Ratenzahlung'} #{doc.linked_id}</strong>
                </span>
                <button onClick={() => { if (confirm('Verknüpfung lösen? Der Vertrag/die Ratenzahlung bleibt erhalten.')) onUnlink(doc.id); }}
                  style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #1e1e1e', borderRadius: '6px', color: '#64748b', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Unlink size={11} /> Lösen
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cross-Linking-Buttons (nur wenn nicht schon verknüpft) */}
        {!doc.linked_type && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button onClick={() => onLinkContract(doc)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', color: '#60a5fa', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              <FileSignature size={13} /> Als Vertrag erstellen
            </button>
            <button onClick={() => onLinkLoan(doc)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '10px', color: '#fb7185', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              <CreditCard size={13} /> Als Schulden/Rate
            </button>
          </div>
        )}

        {/* Hauptdatei */}
        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Hauptdatei</p>
        <div style={{
          background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px',
          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px',
        }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {fileIcon(doc.mimetype, 18)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', color: '#fff', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
              {formatSize(doc.size)} · {format(new Date(doc.created_at), 'd. MMM yyyy', { locale: de })}
            </p>
          </div>
          <a href={doc.filepath} download target="_blank" rel="noreferrer"
            style={{ padding: '7px 12px', background: '#1e1e1e', color: '#cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
            <Download size={13} /> Download
          </a>
        </div>

        {/* Anhänge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Paperclip size={12} /> Anhänge {attachments.length > 0 && <span style={{ background: '#f97316', color: '#fff', borderRadius: '8px', padding: '1px 7px', fontSize: '10px' }}>{attachments.length}</span>}
          </p>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Datei{uploading ? ' wird hochgeladen…' : ' hinzufügen'}
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
              <div key={att.id} style={{
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px',
                borderTop: idx > 0 ? '1px solid #1e1e1e' : 'none',
              }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {fileIcon(att.mimetype, 16)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</p>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0' }}>{formatSize(att.size)} · {format(new Date(att.created_at), 'd. MMM yyyy', { locale: de })}</p>
                </div>
                <a href={att.filepath} download target="_blank" rel="noreferrer"
                  style={{ padding: '6px', color: '#64748b', borderRadius: '6px', display: 'flex' }}><Download size={13} /></a>
                <button onClick={() => { if (confirm('Anhang löschen?')) delAttachMut.mutate(att.id); }}
                  style={{ padding: '6px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', display: 'flex' }}><Trash2 size={13} /></button>
              </div>
            ))
          )}
        </div>

        {/* Mit Freunden teilen */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Heart size={12} /> Mit Freunden geteilt {shareAccess.length > 0 && <span style={{ background: '#f43f5e', color: '#fff', borderRadius: '8px', padding: '1px 7px', fontSize: '10px' }}>{shareAccess.length}</span>}
          </p>
          <button onClick={() => setShowShare(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(244,63,94,0.1)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
            <Share2 size={12} /> {showShare ? 'Schließen' : 'Verwalten'}
          </button>
        </div>

        {showShare && (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '10px', marginBottom: '14px', maxHeight: '180px', overflowY: 'auto' }}>
            {friendsData.accepted.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', margin: '12px 0' }}>
                Noch keine Freunde — gehe zu <a href="/friends" style={{ color: '#fb7185' }}>Freunde</a> um welche hinzuzufügen
              </p>
            ) : (
              friendsData.accepted.map(f => {
                const shared = shareAccess.find(s => s.user_id === f.user_id);
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '8px' }}>
                    {f.avatar
                      ? <img src={f.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#f43f5e,#fb7185)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff' }}>{f.username[0].toUpperCase()}</div>
                    }
                    <span style={{ flex: 1, fontSize: '13px', color: '#cbd5e1' }}>{f.username}</span>
                    {shared ? (
                      <button onClick={() => unshareMut.mutate(f.user_id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', background: '#22c55e22', border: '1px solid #22c55e55', borderRadius: '7px', color: '#22c55e', fontSize: '11px', cursor: 'pointer' }}>
                        ✓ Geteilt
                      </button>
                    ) : (
                      <button onClick={() => shareMut.mutate(f.user_id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '7px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
                        Teilen
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Aktionen */}
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

/* ════════════════════════════════════════════════════════════════════════
   LINK-MODAL — erstellt Vertrag / Ratenzahlung aus Dokument
   ════════════════════════════════════════════════════════════════════════ */
function LinkModal({ open, doc, type, onClose, onSubmit, loading }) {
  const isContract = type === 'contract';
  const [form, setForm] = useState({});
  if (!doc) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title: form.title || doc.title,
      ...(isContract ? {
        company: form.company,
        contract_type: form.contract_type || 'other',
        contract_number: form.contract_number,
        customer_number: form.customer_number,
        amount: form.amount || doc.amount,
        billing_cycle: form.billing_cycle || 'monthly',
        start_date: form.start_date,
        end_date: form.end_date,
        cancel_notice_months: form.cancel_notice_months || 1,
        cancel_until: form.cancel_until,
        auto_renew: form.auto_renew,
        status: 'active',
        notes: form.notes,
      } : {
        lender: form.lender,
        type: form.type || 'loan',
        total_amount: form.total_amount || doc.amount,
        remaining_amount: form.remaining_amount,
        monthly_rate: form.monthly_rate,
        interest_rate: form.interest_rate,
        reference_number: form.reference_number,
        customer_number: form.customer_number,
        purpose: form.purpose,
        start_date: form.start_date,
        end_date: form.end_date,
        status: 'active',
        notes: form.notes,
      })
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={isContract ? 'Vertrag aus Dokument erstellen' : 'Schulden/Ratenzahlung aus Dokument erstellen'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link2 size={14} color="#60a5fa" />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Wird mit Dokument <strong style={{ color: '#fff' }}>"{doc.title}"</strong> verknüpft</span>
        </div>

        <div><label className="block text-sm text-slate-400 mb-1.5">Bezeichnung</label>
          <input className="w-full px-3.5 py-2.5 text-sm" defaultValue={doc.title} onChange={e => set('title', e.target.value)} /></div>

        {isContract ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-slate-400 mb-1.5">Anbieter</label>
                <input className="w-full px-3.5 py-2.5 text-sm" placeholder="z.B. O2, Telekom" onChange={e => set('company', e.target.value)} /></div>
              <div><label className="block text-sm text-slate-400 mb-1.5">Vertragstyp</label>
                <select className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('contract_type', e.target.value)} defaultValue="other">
                  <option value="mobile">Handy</option><option value="internet">Internet</option>
                  <option value="electricity">Strom</option><option value="gas">Gas</option>
                  <option value="streaming">Streaming</option><option value="insurance">Versicherung</option>
                  <option value="rent">Miete</option><option value="other">Sonstiges</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-slate-400 mb-1.5">Betrag (€)</label>
                <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" defaultValue={doc.amount || ''} onChange={e => set('amount', e.target.value)} /></div>
              <div><label className="block text-sm text-slate-400 mb-1.5">Intervall</label>
                <select className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('billing_cycle', e.target.value)} defaultValue="monthly">
                  <option value="monthly">Monatlich</option><option value="quarterly">Vierteljährlich</option>
                  <option value="biannual">Halbjährlich</option><option value="yearly">Jährlich</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-slate-400 mb-1.5">Startdatum</label>
                <input type="date" className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('start_date', e.target.value)} /></div>
              <div><label className="block text-sm text-slate-400 mb-1.5">Laufzeit bis</label>
                <input type="date" className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('end_date', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-slate-400 mb-1.5">Kundennummer</label>
                <input className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('customer_number', e.target.value)} /></div>
              <div><label className="block text-sm text-slate-400 mb-1.5">Vertragsnr.</label>
                <input className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('contract_number', e.target.value)} /></div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-slate-400 mb-1.5">Kreditgeber</label>
                <input className="w-full px-3.5 py-2.5 text-sm" placeholder="z.B. Bank, Saturn" onChange={e => set('lender', e.target.value)} /></div>
              <div><label className="block text-sm text-slate-400 mb-1.5">Typ</label>
                <select className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('type', e.target.value)} defaultValue="loan">
                  <option value="loan">Kredit</option><option value="installment">Ratenkauf</option>
                  <option value="debt">Schuld</option><option value="lease">Leasing</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-slate-400 mb-1.5">Gesamtbetrag (€)</label>
                <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" defaultValue={doc.amount || ''} onChange={e => set('total_amount', e.target.value)} /></div>
              <div><label className="block text-sm text-slate-400 mb-1.5">Restschuld (€)</label>
                <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" placeholder="Falls offen" onChange={e => set('remaining_amount', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-slate-400 mb-1.5">Monatsrate (€)</label>
                <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('monthly_rate', e.target.value)} /></div>
              <div><label className="block text-sm text-slate-400 mb-1.5">Zins (%)</label>
                <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('interest_rate', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-slate-400 mb-1.5">Startdatum</label>
                <input type="date" className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('start_date', e.target.value)} /></div>
              <div><label className="block text-sm text-slate-400 mb-1.5">Letzte Rate</label>
                <input type="date" className="w-full px-3.5 py-2.5 text-sm" onChange={e => set('end_date', e.target.value)} /></div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Erstellen & verknüpfen
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   HAUPTKOMPONENTE
   ════════════════════════════════════════════════════════════════════════ */
export default function Documents() {
  const qc = useQueryClient();
  const fileRef = useRef();

  // Filter / View
  const [search, setSearch]               = useState('');
  const [catFilter, setCatFilter]         = useState('');
  const [subFilter, setSubFilter]         = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [sortBy, setSortBy]               = useState('importance');
  const [importanceFilter, setImpFilter]  = useState('');
  const [dueFilter, setDueFilter]         = useState('');
  const [viewMode, setViewMode]           = useState('list'); // 'list' | 'grid'

  // Modals
  const [showUpload, setShowUpload]   = useState(false);
  const [showEdit, setShowEdit]       = useState(false);
  const [editDoc, setEditDoc]         = useState(null);
  const [detailDoc, setDetailDoc]     = useState(null);

  // Formulare
  const [uploadForm, setUploadForm]   = useState({ title: '', category: 'invoice', subcategory: '', description: '', due_date: '', paid: false, importance: 'normal', amount: '' });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editForm, setEditForm]       = useState({ title: '', category: '', subcategory: '', description: '', importance: 'normal', starred: 0, due_date: '', paid: false, amount: '' });
  const [uploadError, setUploadError] = useState('');

  // Cross-Linking Modal
  const [linkModal, setLinkModal]     = useState(null); // null | { docId, type: 'contract'|'loan' }

  // Inline-Eingaben für Kategorie/Unterkategorie
  const [showNewCat, setShowNewCat]   = useState(false);
  const [newCatName, setNewCatName]   = useState('');
  const [showNewSub, setShowNewSub]   = useState(false);
  const [newSubName, setNewSubName]   = useState('');
  const [showModalSub, setShowModalSub] = useState(false);
  const [modalSubName, setModalSubName] = useState('');

  // Multi-Auswahl
  const [selectedDocs, setSelectedDocs]       = useState(new Set());
  const [showCopyModal, setShowCopyModal]     = useState(false);
  const [copyTargetGroup, setCopyTargetGroup] = useState('');
  const [copyResult, setCopyResult]           = useState(null);

  /* ── Daten ──────────────────────────────────────────────────────────── */
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', catFilter],
    queryFn: () => api.get('/documents' + (catFilter ? `?category=${catFilter}` : '')),
  });

  const { data: customCats = [] } = useQuery({
    queryKey: ['doc-categories'],
    queryFn: () => api.get('/documents/categories'),
  });

  const { data: filterSubs = [] } = useQuery({
    queryKey: ['doc-subcategories-filter', catFilter],
    queryFn: () => catFilter ? api.get(`/documents/subcategories?parent_category=${encodeURIComponent(catFilter)}`) : Promise.resolve([]),
    enabled: !!catFilter,
  });

  const { data: uploadSubs = [] } = useQuery({
    queryKey: ['doc-subcategories-upload', uploadForm.category],
    queryFn: () => api.get(`/documents/subcategories?parent_category=${encodeURIComponent(uploadForm.category)}`),
    enabled: !!uploadForm.category,
  });

  const { data: editSubs = [] } = useQuery({
    queryKey: ['doc-subcategories-edit', editForm.category],
    queryFn: () => editForm.category ? api.get(`/documents/subcategories?parent_category=${encodeURIComponent(editForm.category)}`) : Promise.resolve([]),
    enabled: !!editForm.category,
  });

  const { data: userGroups = [] } = useQuery({ queryKey: ['groups'], queryFn: () => api.get('/groups') });

  /* ── Mutationen ─────────────────────────────────────────────────────── */
  const addCatMut = useMutation({ mutationFn: name => api.post('/documents/categories', { name }), onSuccess: () => { qc.invalidateQueries(['doc-categories']); setNewCatName(''); setShowNewCat(false); } });
  const delCatMut = useMutation({ mutationFn: id => api.delete(`/documents/categories/${id}`), onSuccess: () => { qc.invalidateQueries(['doc-categories']); if (catFilter) setCatFilter(''); } });

  const addSubMut = useMutation({
    mutationFn: ({ name, parent }) => api.post('/documents/subcategories', { name, parent_category: parent }),
    onSuccess: (_, { parent }) => {
      qc.invalidateQueries(['doc-subcategories-filter', parent]);
      qc.invalidateQueries(['doc-subcategories-upload', parent]);
      setNewSubName(''); setShowNewSub(false);
      setModalSubName(''); setShowModalSub(false);
    },
  });
  const delSubMut = useMutation({ mutationFn: id => api.delete(`/documents/subcategories/${id}`), onSuccess: () => { qc.invalidateQueries(['doc-subcategories-filter', catFilter]); qc.invalidateQueries(['doc-subcategories-upload', uploadForm.category]); if (subFilter) setSubFilter(''); } });

  const uploadMut = useMutation({
    mutationFn: async () => {
      // Erste Datei = Hauptdokument
      const fd = new FormData();
      fd.append('file', selectedFiles[0]);
      fd.append('title', uploadForm.title || selectedFiles[0].name);
      fd.append('category', uploadForm.category);
      fd.append('subcategory', uploadForm.subcategory || '');
      fd.append('description', uploadForm.description);
      if (uploadForm.due_date) fd.append('due_date', uploadForm.due_date);
      fd.append('paid', uploadForm.paid ? '1' : '0');
      if (uploadForm.amount) fd.append('amount', uploadForm.amount);
      const main = await api.post('/documents/upload', fd);
      // Importance setzen wenn != normal
      if (uploadForm.importance && uploadForm.importance !== 'normal') {
        await api.put(`/documents/${main.id}`, { ...main, importance: uploadForm.importance });
      }
      // Restliche Dateien als Anhänge
      if (selectedFiles.length > 1) {
        const fd2 = new FormData();
        for (let i = 1; i < selectedFiles.length; i++) fd2.append('files', selectedFiles[i]);
        await api.post(`/documents/${main.id}/attachments`, fd2);
      }
      return main;
    },
    onSuccess: () => {
      qc.invalidateQueries(['documents']);
      setShowUpload(false); setSelectedFiles([]);
      setUploadForm({ title: '', category: 'invoice', subcategory: '', description: '', due_date: '', paid: false, importance: 'normal', amount: '' });
      setUploadError('');
    },
    onError: err => setUploadError(err?.error || err?.message || 'Upload fehlgeschlagen'),
  });

  const editMut = useMutation({ mutationFn: ({ id, data }) => api.put(`/documents/${id}`, data), onSuccess: () => { qc.invalidateQueries(['documents']); setShowEdit(false); } });
  const delMut  = useMutation({ mutationFn: id => api.delete(`/documents/${id}`), onSuccess: () => { qc.invalidateQueries(['documents']); setDetailDoc(null); } });
  const copyMut = useMutation({
    mutationFn: ({ doc_ids, group_id }) => api.post('/documents/copy-to-group', { doc_ids, group_id }),
    onSuccess: (data) => {
      const total = data.copied?.length ?? 0;
      const skipped = data.copied?.filter(c => c.skipped).length ?? 0;
      setCopyResult({ total, skipped, copied: total - skipped });
      setSelectedDocs(new Set());
      qc.invalidateQueries(['documents']);
    },
  });
  const starMut = useMutation({ mutationFn: id => api.patch(`/documents/${id}/star`, {}), onSuccess: () => qc.invalidateQueries(['documents']) });
  const paidMut = useMutation({ mutationFn: id => api.patch(`/documents/${id}/paid`, {}), onSuccess: () => qc.invalidateQueries(['documents']) });

  /* ── Berechnungen ────────────────────────────────────────────────────── */
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const overdueDocs = useMemo(() => docs.filter(d => d.due_date && !d.paid && new Date(d.due_date) < today), [docs, today]);
  const soonDocs    = useMemo(() => docs.filter(d => d.due_date && !d.paid && new Date(d.due_date) >= today && Math.ceil((new Date(d.due_date) - today) / 86400000) <= 7), [docs, today]);
  const pendingDocs = useMemo(() => docs.filter(d => d.due_date && !d.paid), [docs]);
  const paidCount   = useMemo(() => docs.filter(d => d.paid).length, [docs]);

  // Kategorie-Counts (für Cards)
  const catCounts = useMemo(() => {
    const counts = {};
    for (const k of CAT_KEYS) counts[k] = 0;
    for (const c of customCats) counts[c.name] = 0;
    for (const d of docs) counts[d.category] = (counts[d.category] || 0) + 1;
    return counts;
  }, [docs, customCats]);

  const filtered = docs.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && !matchesMime(d.mimetype, typeFilter)) return false;
    if (subFilter && d.subcategory !== subFilter) return false;
    if (dueFilter === 'overdue')  return d.due_date && !d.paid && new Date(d.due_date) < today;
    if (dueFilter === 'pending')  return d.due_date && !d.paid;
    if (dueFilter === 'paid')     return d.paid;
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

  /* ── Helpers ────────────────────────────────────────────────────────── */
  const selectCat = val => { setCatFilter(val); setSubFilter(''); setShowNewSub(false); setSelectedDocs(new Set()); };
  const toggleDoc = id => setSelectedDocs(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => selectedDocs.size === sortedFiltered.length ? setSelectedDocs(new Set()) : setSelectedDocs(new Set(sortedFiltered.map(d => d.id)));

  const openEditFromDetail = (doc) => {
    setDetailDoc(null);
    setEditDoc(doc);
    setEditForm({ title: doc.title, category: doc.category || 'other', subcategory: doc.subcategory || '', description: doc.description || '', importance: doc.importance || 'normal', starred: doc.starred || 0, due_date: doc.due_date || '', paid: !!doc.paid, amount: doc.amount || '' });
    setShowEdit(true);
  };

  // Verknüpfung erstellen / lösen
  const linkContractMut = useMutation({
    mutationFn: ({ docId, data }) => api.post(`/documents/${docId}/link-contract`, data),
    onSuccess: () => {
      qc.invalidateQueries(['documents']); qc.invalidateQueries(['contracts']);
      setLinkModal(null);
    },
  });
  const linkLoanMut = useMutation({
    mutationFn: ({ docId, data }) => api.post(`/documents/${docId}/link-loan`, data),
    onSuccess: () => {
      qc.invalidateQueries(['documents']); qc.invalidateQueries(['loans']);
      setLinkModal(null);
    },
  });
  const unlinkMut = useMutation({
    mutationFn: id => api.delete(`/documents/${id}/link`),
    onSuccess: () => qc.invalidateQueries(['documents']),
  });

  /* ════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">

      {/* ═══ KOPFZEILE ═══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderOpen size={22} className="text-orange-500" /> Dokumente
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{docs.length} {docs.length === 1 ? 'Eintrag' : 'Einträge'} gespeichert · verschlüsselt</p>
        </div>
        <button onClick={() => { setUploadError(''); setShowUpload(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
          <Upload size={16} /> Hochladen
        </button>
      </div>

      {/* ═══ STATS ═══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <StatCard icon={FolderOpen}      label="Gesamt"     value={docs.length}        color="#f97316" onClick={() => setDueFilter('')} active={!dueFilter} />
        <StatCard icon={AlertTriangle}   label="Überfällig" value={overdueDocs.length} color="#ef4444" onClick={() => setDueFilter(dueFilter === 'overdue' ? '' : 'overdue')} active={dueFilter === 'overdue'} />
        <StatCard icon={Calendar}        label="Ausstehend" value={pendingDocs.length} color="#f97316" onClick={() => setDueFilter(dueFilter === 'pending' ? '' : 'pending')} active={dueFilter === 'pending'} />
        <StatCard icon={CheckCircle2}    label="Bezahlt"    value={paidCount}          color="#22c55e" onClick={() => setDueFilter(dueFilter === 'paid' ? '' : 'paid')}       active={dueFilter === 'paid'} />
      </div>

      {/* ═══ FÄLLIGKEITS-WARNUNG ═══════════════════════════════════════ */}
      {(overdueDocs.length > 0 || soonDocs.length > 0) && (
        <div onClick={() => setDueFilter(overdueDocs.length > 0 ? 'overdue' : 'pending')}
          style={{
            background: overdueDocs.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.08)',
            border: `1px solid ${overdueDocs.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`,
            borderRadius: '12px', padding: '11px 14px',
            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
          }}>
          <BellRing size={15} color={overdueDocs.length > 0 ? '#ef4444' : '#f97316'} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '13px', color: '#e2e8f0' }}>
            {overdueDocs.length > 0 && <span style={{ color: '#ef4444', fontWeight: 700 }}>{overdueDocs.length} überfällig</span>}
            {overdueDocs.length > 0 && soonDocs.length > 0 && <span style={{ color: '#475569' }}> · </span>}
            {soonDocs.length > 0 && <span style={{ color: '#f97316', fontWeight: 600 }}>{soonDocs.length} fällig in 7 Tagen</span>}
          </span>
          <span style={{ fontSize: '11px', color: '#475569' }}>→</span>
        </div>
      )}

      {/* ═══ KATEGORIE-CARDS ════════════════════════════════════════════ */}
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
          {/* Alle */}
          <button onClick={() => selectCat('')} style={{
            minWidth: '100px', flexShrink: 0,
            background: !catFilter ? 'rgba(249,115,22,0.15)' : '#141414',
            border: `1px solid ${!catFilter ? '#f97316' : '#1e1e1e'}`,
            borderRadius: '12px', padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FolderOpen size={15} color="#f97316" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '13px', color: !catFilter ? '#fff' : '#cbd5e1', fontWeight: 600, margin: 0 }}>Alle</p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0' }}>{docs.length} Dok.</p>
            </div>
          </button>

          {/* Standard-Kategorien */}
          {CAT_KEYS.map(key => {
            const cfg = CATEGORY_CONFIG[key];
            return (
              <CategoryCard key={key} icon={cfg.icon} label={cfg.label} color={cfg.color}
                count={catCounts[key] || 0} active={catFilter === key} onClick={() => selectCat(key)} />
            );
          })}

          {/* Custom-Kategorien */}
          {customCats.map(cat => (
            <CategoryCard key={cat.id} icon={Folder} label={cat.name} color={cat.color || '#f97316'}
              count={catCounts[cat.name] || 0} active={catFilter === cat.name} onClick={() => selectCat(cat.name)}
              onDelete={() => delCatMut.mutate(cat.id)} />
          ))}

          {/* Neue Kategorie inline */}
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

      {/* ═══ UNTERORDNER ═══════════════════════════════════════════════ */}
      {catFilter && (
        <div className="tab-scroll" style={{ gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginRight: '4px', flexShrink: 0 }}>UNTERORDNER:</span>
          <button onClick={() => setSubFilter('')} style={{
            padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap',
            cursor: 'pointer', flexShrink: 0,
            background: !subFilter ? '#f97316' : 'transparent',
            color: !subFilter ? '#fff' : '#94a3b8',
            border: !subFilter ? '1px solid #f97316' : '1px solid #2a2a2a',
          }}>Alle</button>
          {filterSubs.map(sub => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              <button onClick={() => setSubFilter(sub.name)} style={{
                padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
                background: subFilter === sub.name ? '#f97316' : 'transparent',
                color: subFilter === sub.name ? '#fff' : '#94a3b8',
                border: subFilter === sub.name ? '1px solid #f97316' : '1px solid #2a2a2a',
              }}>{sub.name}</button>
              <button onClick={() => delSubMut.mutate(sub.id)} style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><X size={11} /></button>
            </div>
          ))}
          {showNewSub ? (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
              <input autoFocus placeholder="z.B. Handyvertrag O2..." value={newSubName} onChange={e => setNewSubName(e.target.value)}
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

      {/* ═══ SUCH- & SMART-BAR ═══════════════════════════════════════════ */}
      <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Suchzeile */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input className="w-full pl-9 pr-3 py-2 text-sm rounded-lg" placeholder="Dokument suchen..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }} />
          </div>
          <div style={{ display: 'flex', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '2px' }}>
            <button onClick={() => setViewMode('list')} style={{
              padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center',
              background: viewMode === 'list' ? '#1e1e1e' : 'transparent',
              color: viewMode === 'list' ? '#f97316' : '#64748b',
              border: 'none', cursor: 'pointer',
            }}><ListIcon size={14} /></button>
            <button onClick={() => setViewMode('grid')} style={{
              padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center',
              background: viewMode === 'grid' ? '#1e1e1e' : 'transparent',
              color: viewMode === 'grid' ? '#f97316' : '#64748b',
              border: 'none', cursor: 'pointer',
            }}><LayoutGrid size={14} /></button>
          </div>
        </div>

        {/* Filter-Zeile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '12px' }}>
          {/* Sortierung */}
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

          {/* Dateityp */}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#cbd5e1', padding: '5px 8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
            {FILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <div style={{ width: '1px', height: '14px', background: '#1e1e1e' }} />

          {/* Wichtigkeit-Chips */}
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

      {/* ═══ AUSWAHL-AKTIONSBAR ═══════════════════════════════════════════ */}
      {selectedDocs.size > 0 && (
        <div style={{
          position: 'sticky', top: '12px', zIndex: 40,
          background: '#1a1a1a', border: '1px solid #f97316',
          borderRadius: '12px', padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 4px 24px rgba(249,115,22,0.2)',
        }}>
          <span style={{ fontSize: '13px', color: '#f97316', fontWeight: 600, flex: 1 }}>
            {selectedDocs.size} ausgewählt
          </span>
          <button onClick={() => setSelectedDocs(new Set())} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
            Abwählen
          </button>
          <button onClick={() => { setCopyResult(null); setCopyTargetGroup(userGroups[0]?.id?.toString() || ''); setShowCopyModal(true); }}
            disabled={userGroups.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: userGroups.length === 0 ? 'not-allowed' : 'pointer', opacity: userGroups.length === 0 ? 0.5 : 1 }}>
            <Users size={13} /> In Gruppe
          </button>
        </div>
      )}

      {/* ═══ DOKUMENT-LISTE ═══════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
      ) : sortedFiltered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
          <FilePlus size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Keine Dokumente gefunden</p>
          <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-orange-400 hover:text-orange-500">Erstes Dokument hochladen →</button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID-VIEW ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {sortedFiltered.map(doc => {
            const cat = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.other;
            const CatIcon = cat.icon;
            const urg = getDueUrgency(doc.due_date, doc.paid);
            const imp = doc.importance || 'normal';
            const impCfg = IMPORTANCE[imp] || IMPORTANCE.normal;
            return (
              <div key={doc.id} onClick={() => setDetailDoc(doc)}
                style={{
                  background: '#141414', border: `1px solid ${impCfg.border === 'transparent' ? '#1e1e1e' : impCfg.border}55`,
                  borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.15s',
                  position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px',
                  opacity: imp === 'archiv' ? 0.6 : 1,
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
                  {urg && (
                    <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, background: urg.bg, color: urg.color, border: `1px solid ${urg.border}66` }}>{urg.label}</span>
                  )}
                  {imp !== 'normal' && (
                    <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, background: impCfg.bg, color: impCfg.color, border: `1px solid ${impCfg.border}` }}>{impCfg.label}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#475569', borderTop: '1px solid #1e1e1e', paddingTop: '8px' }}>
                  <span>{formatSize(doc.size)}</span>
                  {doc.attachment_count > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Paperclip size={10} /> {doc.attachment_count}</span>
                  )}
                  <span>{format(new Date(doc.created_at), 'd. MMM', { locale: de })}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST-VIEW ── */
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Listen-Kopf */}
          <div style={{ padding: '8px 16px 6px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedDocs.size === sortedFiltered.length && sortedFiltered.length > 0 ? '#f97316' : '#475569', display: 'flex', padding: 0 }}>
              {selectedDocs.size === sortedFiltered.length && sortedFiltered.length > 0 ? <CheckSquare size={15} /> : <Square size={15} />}
            </button>
            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, userSelect: 'none' }}>
              {selectedDocs.size > 0 ? `${selectedDocs.size} / ${sortedFiltered.length} ausgewählt` : `${sortedFiltered.length} Dokument${sortedFiltered.length !== 1 ? 'e' : ''}`}
            </span>
          </div>
          <div className="divide-y divide-border">
            {sortedFiltered.map(doc => {
              const isSelected = selectedDocs.has(doc.id);
              const cat = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.other;
              const CatIcon = cat.icon;
              const imp = doc.importance || 'normal';
              const impCfg = IMPORTANCE[imp] || IMPORTANCE.normal;
              const urg = getDueUrgency(doc.due_date, doc.paid);
              return (
                <div key={doc.id}
                  className="group"
                  onClick={() => setDetailDoc(doc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    borderLeft: `3px solid ${impCfg.border}`,
                    background: isSelected ? 'rgba(249,115,22,0.05)' : (imp === 'archiv' ? 'rgba(15,23,42,0.5)' : undefined),
                    opacity: imp === 'archiv' ? 0.6 : 1,
                    padding: '12px 14px 12px 12px', cursor: 'pointer', transition: 'background 0.15s',
                  }}>
                  {/* Checkbox */}
                  <button onClick={(e) => { e.stopPropagation(); toggleDoc(doc.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? '#f97316' : '#334155', display: 'flex', flexShrink: 0, padding: '4px' }}>
                    {isSelected ? <CheckSquare size={15} /> : <Square size={15} className="opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 0.15s' }} />}
                  </button>
                  {/* Kategorie-Icon */}
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${cat.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CatIcon size={16} color={cat.color} />
                  </div>
                  {/* Titel + Meta */}
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
                      <span className="hidden sm:inline"> · {formatSize(doc.size)}</span>
                      <span className="hidden md:inline"> · {format(new Date(doc.created_at), 'd. MMM yyyy', { locale: de })}</span>
                    </p>
                  </div>
                  {/* Fälligkeits-Badge */}
                  {urg && (
                    <button onClick={(e) => { e.stopPropagation(); paidMut.mutate(doc.id); }}
                      title={doc.paid ? 'Als unbezahlt markieren' : 'Als bezahlt markieren'}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: urg.bg, color: urg.color, border: `1px solid ${urg.border}66`, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {doc.paid ? <CheckCircle2 size={11} /> : <Calendar size={11} />} {urg.label}
                    </button>
                  )}
                  {/* Wichtigkeit-Badge */}
                  {imp !== 'normal' && (
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: impCfg.bg, color: impCfg.color, border: `1px solid ${impCfg.border}`, flexShrink: 0 }}>
                      {impCfg.label}
                    </span>
                  )}
                  {/* Stern */}
                  <button onClick={(e) => { e.stopPropagation(); starMut.mutate(doc.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: doc.starred ? '#f59e0b' : '#334155', display: 'flex', padding: '4px', flexShrink: 0 }}>
                    <Star size={14} fill={doc.starred ? '#f59e0b' : 'none'} />
                  </button>
                  {/* Aktionen */}
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

      {/* ═══ DETAIL-MODAL ════════════════════════════════════════════════ */}
      <DetailModal
        open={!!detailDoc}
        doc={detailDoc}
        onClose={() => setDetailDoc(null)}
        onEdit={openEditFromDetail}
        onDelete={(id) => { if (confirm('Dokument und alle Anhänge löschen?')) delMut.mutate(id); }}
        onLinkContract={(d) => { setDetailDoc(null); setLinkModal({ docId: d.id, doc: d, type: 'contract' }); }}
        onLinkLoan={(d) => { setDetailDoc(null); setLinkModal({ docId: d.id, doc: d, type: 'loan' }); }}
        onUnlink={(id) => unlinkMut.mutate(id)}
      />

      {/* ═══ LINK-MODAL ════════════════════════════════════════════════ */}
      <LinkModal
        open={!!linkModal}
        doc={linkModal?.doc}
        type={linkModal?.type}
        onClose={() => setLinkModal(null)}
        loading={linkContractMut.isPending || linkLoanMut.isPending}
        onSubmit={(data) => {
          if (linkModal.type === 'contract') linkContractMut.mutate({ docId: linkModal.docId, data });
          else linkLoanMut.mutate({ docId: linkModal.docId, data });
        }}
      />

      {/* ═══ UPLOAD-MODAL (Multi-File) ═════════════════════════════════ */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Dokument hochladen" size="md">
        <div className="space-y-4">
          {/* Datei-Auswahl */}
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

          {/* Dateiliste-Vorschau */}
          {selectedFiles.length > 0 && (
            <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '8px', maxHeight: '120px', overflowY: 'auto' }}>
              {selectedFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', fontSize: '12px' }}>
                  {fileIcon(f.type, 14)}
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
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.category}
                onChange={e => setUploadForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}>
                {CAT_KEYS.map(k => <option key={k} value={k}>{CATEGORY_CONFIG[k].label}</option>)}
                {customCats.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Wichtigkeit</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={uploadForm.importance}
                onChange={e => setUploadForm(f => ({ ...f, importance: e.target.value }))}>
                {Object.entries(IMPORTANCE).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
              </select>
            </div>
          </div>

          {/* Unterordner */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="text-sm text-slate-400">Unterordner <span className="text-slate-600 text-xs">(optional)</span></label>
              <button onClick={() => setShowModalSub(v => !v)} style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer', background: 'none', border: 'none' }}>
                + Neuer Unterordner
              </button>
            </div>
            {showModalSub && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input autoFocus placeholder={`Unterordner für ${CATEGORY_CONFIG[uploadForm.category]?.label || uploadForm.category}...`}
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

          {/* Betrag + Fälligkeit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Euro size={13} /> Betrag <span className="text-slate-600 text-xs">(optional)</span>
              </label>
              <input type="number" step="0.01" min="0" className="w-full px-3.5 py-2.5 text-sm"
                placeholder="0.00"
                value={uploadForm.amount}
                onChange={e => setUploadForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} /> Fällig am
              </label>
              <input type="date" className="w-full px-3.5 py-2.5 text-sm"
                value={uploadForm.due_date}
                onChange={e => setUploadForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={uploadForm.paid} onChange={e => setUploadForm(f => ({ ...f, paid: e.target.checked }))}
              style={{ accentColor: '#22c55e', width: '15px', height: '15px' }} />
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Bereits bezahlt</span>
          </label>

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

      {/* ═══ EDIT-MODAL ════════════════════════════════════════════════ */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Dokument bearbeiten" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={editForm.category}
                onChange={e => setEditForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}>
                {CAT_KEYS.map(k => <option key={k} value={k}>{CATEGORY_CONFIG[k].label}</option>)}
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
              {Object.entries(IMPORTANCE).map(([key, cfg]) => (
                <button key={key} onClick={() => setEditForm(f => ({ ...f, importance: key }))}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Euro size={13} /> Betrag
              </label>
              <input type="number" step="0.01" min="0" className="w-full px-3.5 py-2.5 text-sm" placeholder="0.00"
                value={editForm.amount}
                onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} /> Fällig am
              </label>
              <input type="date" className="w-full px-3.5 py-2.5 text-sm"
                value={editForm.due_date}
                onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={editForm.paid} onChange={e => setEditForm(f => ({ ...f, paid: e.target.checked }))}
              style={{ accentColor: '#22c55e', width: '15px', height: '15px' }} />
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Bezahlt</span>
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => editMut.mutate({ id: editDoc.id, data: editForm })} disabled={editMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {editMut.isPending && <Loader2 size={14} className="animate-spin" />} Speichern
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ COPY-TO-GROUP-MODAL ═══════════════════════════════════════ */}
      <Modal open={showCopyModal} onClose={() => { setShowCopyModal(false); setCopyResult(null); }} title="In Gruppe kopieren" size="sm">
        <div className="space-y-4">
          {copyResult ? (
            <div className="space-y-3">
              <div style={{ background: '#16a34a1a', border: '1px solid #16a34a44', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  ✓ {copyResult.copied} Dokument{copyResult.copied !== 1 ? 'e' : ''} kopiert
                </p>
                {copyResult.skipped > 0 && (
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>{copyResult.skipped} bereits vorhanden (übersprungen)</p>
                )}
              </div>
              <div className="flex justify-end">
                <button onClick={() => { setShowCopyModal(false); setCopyResult(null); }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium">Fertig</button>
              </div>
            </div>
          ) : (
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
                  {copyMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Kopieren
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
