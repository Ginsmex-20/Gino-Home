import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, UserPlus, UserMinus, Check, X, Mail, Loader2, Heart,
  FileText, FileSignature, CreditCard, CheckSquare, Wallet, Calendar, KeyRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { StatCard, PageHeader, EmptyState } from '../components/ui';

const RESOURCE_LABELS = {
  document: { label: 'Dokumente', icon: FileText, color: '#f97316' },
  task: { label: 'Aufgaben', icon: CheckSquare, color: '#3b82f6' },
  contract: { label: 'Verträge', icon: FileSignature, color: '#a78bfa' },
  loan: { label: 'Schulden/Raten', icon: CreditCard, color: '#f43f5e' },
  finance_item: { label: 'Finanzen', icon: Wallet, color: '#22c55e' },
  calendar_event: { label: 'Termine', icon: Calendar, color: '#60a5fa' },
  vault_entry: { label: 'Tresor', icon: KeyRound, color: '#06b6d4' },
};

export default function Friends() {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('friends'); // 'friends' | 'incoming' | 'shared'

  const { data: friendsData = { accepted: [], incoming: [], outgoing: [] }, isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends'),
  });

  const { data: sharedSummary = {} } = useQuery({
    queryKey: ['friends-shared-summary'],
    queryFn: () => api.get('/friends/shared-with-me'),
  });

  const requestMut = useMutation({
    mutationFn: q => api.post('/friends/request', { query: q }),
    onSuccess: () => { qc.invalidateQueries(['friends']); setQuery(''); setError(''); },
    onError: err => setError(err?.error || 'Fehler'),
  });

  const acceptMut = useMutation({
    mutationFn: id => api.post(`/friends/${id}/accept`),
    onSuccess: () => qc.invalidateQueries(['friends']),
  });

  const removeMut = useMutation({
    mutationFn: id => api.delete(`/friends/${id}`),
    onSuccess: () => { qc.invalidateQueries(['friends']); qc.invalidateQueries(['friends-shared-summary']); },
  });

  const { accepted, incoming, outgoing } = friendsData;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Heart}
        title="Freunde"
        subtitle="Teile einzelne Einträge mit Freunden — du behältst die Kontrolle"
        iconColor="#f43f5e"
      />

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <StatCard icon={Users}     label="Freunde"         value={accepted.length} color="#f43f5e"
          onClick={() => setTab('friends')} active={tab === 'friends'} />
        <StatCard icon={Mail}      label="Anfragen"        value={incoming.length}  color="#f97316"
          onClick={() => setTab('incoming')} active={tab === 'incoming'} hint={outgoing.length > 0 ? `+ ${outgoing.length} ausgehend` : null} />
        <StatCard icon={FileText}  label="Mit mir geteilt" value={(sharedSummary.summary || []).reduce((s, x) => s + x.count, 0)} color="#22c55e"
          onClick={() => setTab('shared')} active={tab === 'shared'} />
      </div>

      {/* Anfrage senden */}
      <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '14px 16px' }}>
        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Freund hinzufügen</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            placeholder="E-Mail oder Username"
            value={query}
            onChange={e => { setQuery(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) requestMut.mutate(query.trim()); }}
            style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}
          />
          <button onClick={() => query.trim() && requestMut.mutate(query.trim())}
            disabled={!query.trim() || requestMut.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: '#f43f5e', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: requestMut.isPending ? 0.7 : 1 }}>
            {requestMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Anfragen
          </button>
        </div>
        {error && <p style={{ marginTop: '8px', fontSize: '12px', color: '#f87171' }}>{error}</p>}
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
      ) : tab === 'friends' ? (
        accepted.length === 0 ? (
          <EmptyState icon={Users} title="Noch keine Freunde"
            message="Sende eine Anfrage per E-Mail oder Username oben." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accepted.map(f => (
              <div key={f.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {f.avatar
                  ? <img src={f.avatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#f43f5e,#fb7185)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{f.username[0].toUpperCase()}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.username}</p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.email}</p>
                </div>
                <button onClick={() => { if (confirm(`${f.username} aus Freundesliste entfernen? Alle Freigaben werden ebenfalls gelöscht.`)) removeMut.mutate(f.id); }}
                  style={{ padding: '7px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer' }}>
                  <UserMinus size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      ) : tab === 'incoming' ? (
        <div className="space-y-4">
          {incoming.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Eingehende Anfragen</p>
              <div className="space-y-2">
                {incoming.map(r => (
                  <div key={r.id} style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {r.avatar
                      ? <img src={r.avatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#f97316' }}>{r.username[0].toUpperCase()}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', color: '#fff', fontWeight: 500, margin: 0 }}>{r.username}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0' }}>möchte mit dir befreundet sein</p>
                    </div>
                    <button onClick={() => acceptMut.mutate(r.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      <Check size={12} /> Annehmen
                    </button>
                    <button onClick={() => removeMut.mutate(r.id)}
                      style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Gesendete Anfragen</p>
              <div className="space-y-2">
                {outgoing.map(r => (
                  <div key={r.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {r.avatar
                      ? <img src={r.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#64748b' }}>{r.username[0].toUpperCase()}</div>
                    }
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{r.username}</p>
                      <p style={{ fontSize: '11px', color: '#475569', margin: '1px 0 0' }}>wartet auf Bestätigung</p>
                    </div>
                    <button onClick={() => removeMut.mutate(r.id)}
                      style={{ padding: '5px 9px', background: 'transparent', border: '1px solid #1e1e1e', borderRadius: '7px', color: '#64748b', fontSize: '11px', cursor: 'pointer' }}>
                      Zurückziehen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {incoming.length === 0 && outgoing.length === 0 && (
            <EmptyState icon={Mail} title="Keine Anfragen" message="Aktuell sind keine Freundschaftsanfragen offen." />
          )}
        </div>
      ) : tab === 'shared' && (
        <div>
          {(sharedSummary.summary || []).length === 0 ? (
            <EmptyState icon={FileText} title="Nichts geteilt"
              message="Deine Freunde haben dir noch keine Einträge freigegeben." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(sharedSummary.summary || []).map(s => {
                const cfg = RESOURCE_LABELS[s.resource_type] || { label: s.resource_type, icon: FileText, color: '#64748b' };
                const Icon = cfg.icon;
                return (
                  <Link key={s.resource_type} to={`/shared/${s.resource_type}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#141414', border: `1px solid ${cfg.color}33`, borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = cfg.color}
                      onMouseLeave={e => e.currentTarget.style.borderColor = `${cfg.color}33`}>
                      <div style={{ width: 44, height: 44, borderRadius: '11px', background: `${cfg.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600, margin: 0 }}>{cfg.label}</p>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{s.count} {s.count === 1 ? 'Eintrag' : 'Einträge'} geteilt</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
