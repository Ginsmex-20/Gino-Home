import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, FileText, FileSignature, CreditCard, CheckSquare, Wallet, Calendar,
  KeyRound, Heart, Folder, Receipt, Shield, Banknote, Download, Eye, Star, Paperclip,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/client';
import { PageHeader, EmptyState } from '../components/ui';

const CATEGORIES = [
  { key: 'document',       label: 'Dokumente',     icon: FileText,      color: '#f97316' },
  { key: 'task',           label: 'Aufgaben',      icon: CheckSquare,   color: '#3b82f6' },
  { key: 'contract',       label: 'Verträge',      icon: FileSignature, color: '#a78bfa' },
  { key: 'loan',           label: 'Schulden/Raten',icon: CreditCard,    color: '#f43f5e' },
  { key: 'finance_item',   label: 'Finanzen',      icon: Wallet,        color: '#22c55e' },
  { key: 'calendar_event', label: 'Termine',       icon: Calendar,      color: '#60a5fa' },
  { key: 'vault_entry',    label: 'Tresor',        icon: KeyRound,      color: '#06b6d4' },
];

function formatSize(b) {
  if (!b) return '–';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function StatusPill({ status }) {
  const styles = {
    todo:        { label: 'To-do',      bg: 'rgba(148,163,184,.1)',  color: '#94a3b8' },
    in_progress: { label: 'In Arbeit',  bg: 'rgba(245,158,11,.12)',  color: '#f59e0b' },
    done:        { label: 'Erledigt',   bg: 'rgba(34,197,94,.12)',   color: '#22c55e' },
    archiv:      { label: 'Archiv',     bg: 'rgba(100,116,139,.1)',  color: '#64748b' },
    active:      { label: 'Aktiv',      bg: 'rgba(34,197,94,.12)',   color: '#22c55e' },
    cancelled:   { label: 'Gekündigt',  bg: 'rgba(249,115,22,.12)',  color: '#f97316' },
  };
  const s = styles[status] || styles.todo;
  return <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
}

function OwnerBadge({ side, ownerName, color }) {
  const isMe = side === 'me';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 600,
      background: isMe ? 'rgba(249,115,22,0.12)' : 'rgba(244,63,94,0.12)',
      color: isMe ? '#f97316' : '#fb7185',
      border: `1px solid ${isMe ? 'rgba(249,115,22,0.3)' : 'rgba(244,63,94,0.3)'}`,
    }}>
      {isMe ? '👤 Du' : `❤ ${ownerName}`}
    </span>
  );
}

/* Tab-Komponente: zeigt Items einer Kategorie aus BEIDEN Richtungen */
function CategoryItems({ ownerId, type, category }) {
  const { data: response = { items: [], permissions: {} }, isLoading } = useQuery({
    queryKey: ['joint', ownerId, type],
    queryFn: () => api.get(`/friends/joint/${ownerId}/${type}`),
  });
  const items = response.items || [];

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>;
  if (items.length === 0) return <EmptyState icon={category.icon} title="Nichts gemeinsam" message="Hier landen Einträge sobald einer von euch beiden was teilt." />;

  // Item-Render je nach Typ
  if (type === 'document') {
    return (
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        {items.map(d => (
          <div key={`${d.side}-${d.id}`} style={{ padding: '12px 16px', borderTop: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: `${category.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} color={category.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</p>
                <OwnerBadge side={d.side} ownerName={d.owner_name} />
                {d.attachment_count > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', background: 'rgba(249,115,22,0.12)', color: '#f97316', borderRadius: '5px', fontSize: '10px', fontWeight: 600 }}><Paperclip size={9} /> {d.attachment_count}</span>}
                {d.starred ? <Star size={12} fill="#f59e0b" color="#f59e0b" /> : null}
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                {d.category} · {formatSize(d.size)} · {format(new Date(d.created_at), 'd. MMM yyyy', { locale: de })}
              </p>
            </div>
            <a href={d.filepath} download target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-green-400 rounded-lg"><Download size={14} /></a>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'task') {
    return (
      <div className="space-y-2">
        {items.map(t => (
          <div key={`${t.side}-${t.id}`} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <p style={{ flex: 1, color: '#fff', fontSize: '14px', fontWeight: 500, margin: 0 }}>{t.title}</p>
              <OwnerBadge side={t.side} ownerName={t.owner_name} />
              <StatusPill status={t.status} />
            </div>
            {t.description && <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0' }}>{t.description}</p>}
            {t.due_date && <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>Fällig: {format(new Date(t.due_date), 'd. MMM yyyy', { locale: de })}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'contract') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(c => (
          <div key={c.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: 38, height: 38, borderRadius: '10px', background: `${category.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSignature size={16} color={category.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{c.company || '–'}</p>
              </div>
              <StatusPill status={c.status} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#64748b' }}>Betrag</span>
              <span style={{ color: category.color, fontWeight: 700 }}>{Number(c.amount || 0).toFixed(2)} €</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'loan') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(l => (
          <div key={l.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: 38, height: 38, borderRadius: '10px', background: `${category.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={16} color={category.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{l.title}</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{l.lender || '–'}</p>
              </div>
              <StatusPill status={l.status} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#64748b' }}>Restschuld</span>
              <span style={{ color: '#f87171', fontWeight: 700 }}>{Number(l.remaining_amount || 0).toFixed(2)} €</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'finance_item') {
    return (
      <div className="space-y-2">
        {items.map(f => (
          <div key={f.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.type === 'income' ? '#22c55e' : '#ef4444' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', color: '#fff', fontWeight: 500, margin: 0 }}>{f.title}</p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{f.category} · {format(new Date(f.date), 'd. MMM yyyy', { locale: de })}</p>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: f.type === 'income' ? '#22c55e' : '#ef4444' }}>
              {f.type === 'income' ? '+' : '-'}{parseFloat(f.amount).toFixed(2)} €
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'calendar_event') {
    return (
      <div className="space-y-2">
        {items.map(e => (
          <div key={e.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color || '#60a5fa' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', color: '#fff', fontWeight: 500, margin: 0 }}>{e.title}</p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{format(new Date(e.start_date), 'EEEE, d. MMM yyyy', { locale: de })}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'vault_entry') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(v => (
          <div key={v.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: 38, height: 38, borderRadius: '10px', background: `${category.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={16} color={category.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{v.title}</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{v.category}</p>
              </div>
            </div>
            {v.email && <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0 }}>📧 {v.email}</p>}
            {v.username && <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0 0' }}>👤 {v.username}</p>}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

/* ════════════════════════════════════════════════════════════════════
   HAUPTKOMPONENTE: Persönliches von [Freund]
   ════════════════════════════════════════════════════════════════════ */
export default function SharedFromFriend() {
  const { ownerId, tab } = useParams();
  const navigate = useNavigate();

  const { data: sharers = [], isLoading } = useQuery({
    queryKey: ['joint-list'],
    queryFn: () => api.get('/friends/joint/list'),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>;

  const owner = sharers.find(s => String(s.user_id) === String(ownerId));
  if (!owner) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Diese Person teilt nichts mit dir</p>
        <Link to="/friends" className="text-orange-500 text-sm mt-2 inline-block">← Zurück zu Freunde</Link>
      </div>
    );
  }

  const accessibleCats = CATEGORIES.filter(c => owner.categories.includes(c.key));
  const activeTab = tab || (accessibleCats[0]?.key || 'document');
  const activeCat = CATEGORIES.find(c => c.key === activeTab);

  return (
    <div className="space-y-5">
      {/* Hero-Header */}
      <div style={{
        background: `linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))`,
        border: '1px solid rgba(244,63,94,0.3)',
        borderRadius: '16px', padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <button onClick={() => navigate('/friends')}
          style={{ padding: '8px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowLeft size={16} />
        </button>
        {owner.avatar
          ? <img src={owner.avatar} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(244,63,94,0.5)' }} />
          : <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#f43f5e,#fb7185)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: '#fff' }}>{owner.username[0].toUpperCase()}</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '11px', color: '#fb7185', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Heart size={11} /> Gemeinsam mit
          </p>
          <h1 style={{ fontSize: '20px', color: '#fff', fontWeight: 700, margin: '3px 0 2px' }}>{owner.username}</h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{accessibleCats.length} {accessibleCats.length === 1 ? 'Kategorie' : 'Kategorien'} verbunden — Einträge aus beiden Richtungen</p>
        </div>
      </div>

      {/* Tab-Bar */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#141414', padding: '4px', borderRadius: '14px', minWidth: 'max-content', border: '1px solid #1e1e1e' }}>
          {accessibleCats.map(c => {
            const Icon = c.icon;
            const isActive = activeTab === c.key;
            return (
              <button key={c.key} onClick={() => navigate(`/shared/${ownerId}/${c.key}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: isActive ? c.color : 'transparent',
                  color: isActive ? '#fff' : '#64748b',
                  whiteSpace: 'nowrap',
                }}>
                <Icon size={13} /> {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeCat ? (
        <CategoryItems ownerId={ownerId} type={activeTab} category={activeCat} />
      ) : (
        <EmptyState icon={Heart} title="Keine Freigaben" message={`${owner.username} teilt aktuell nichts mit dir.`} />
      )}
    </div>
  );
}
