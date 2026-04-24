import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Trash2, UserPlus, UserMinus, Crown, Home, Briefcase, Star, Loader2, Copy, RefreshCw, Hash, LogIn } from 'lucide-react';
import Modal from '../components/Modal';
import api from '../api/client';
import useAuth from '../stores/auth';

const typeIcons = { household: Home, work: Briefcase, general: Star };
const typeLabels = { household: 'Haushalt', work: 'Arbeit', general: 'Allgemein' };
const typeBg = { household: 'bg-green-500/10 text-green-400', work: 'bg-blue-500/10 text-blue-400', general: 'bg-orange-500/10 text-orange-500' };

function GroupCard({ group, onSelect, isSelected }) {
  const Icon = typeIcons[group.type] || Star;
  return (
    <div onClick={() => onSelect(group)} className={`bg-bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:border-orange-500/40 ${isSelected ? 'border-orange-500 shadow-lg shadow-orange-500/10' : 'border-border'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${typeBg[group.type]?.split(' ')[0] || 'bg-orange-500/10'} flex items-center justify-center shrink-0`}>
          <Icon size={22} className={typeBg[group.type]?.split(' ')[1] || 'text-orange-500'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">{group.name}</p>
          {group.description && <p className="text-sm text-slate-400 mt-0.5 truncate">{group.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${typeBg[group.type] || 'bg-orange-500/10 text-orange-500'}`}>{typeLabels[group.type]}</span>
            <span className="text-xs text-slate-500 flex items-center gap-1"><Users size={11} />{group.member_count} Mitglieder</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Groups() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInviteEmail, setShowInviteEmail] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'general' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: groups = [], isLoading } = useQuery({ queryKey: ['groups'], queryFn: () => api.get('/groups') });
  const { data: members = [] } = useQuery({
    queryKey: ['group-members', selected?.id],
    queryFn: () => api.get(`/groups/${selected.id}/members`),
    enabled: !!selected?.id
  });

  const createMutation = useMutation({
    mutationFn: data => api.post('/groups', data),
    onSuccess: g => { qc.invalidateQueries(['groups']); setShowCreate(false); setForm({ name: '', description: '', type: 'general' }); setSelected(g); }
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
    onSuccess: ({ group }) => { qc.invalidateQueries(['groups']); setShowJoin(false); setJoinCode(''); setError(''); setSelected(group); },
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

  const copyCode = () => {
    navigator.clipboard.writeText(selected?.invite_code || '');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isAdmin = selected && members.find(m => m.id === user?.id)?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Gruppen</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowJoin(true); setError(''); setJoinCode(''); }}
            className="flex items-center gap-2 px-3 py-2 bg-bg-card border border-border hover:border-orange-500/40 text-slate-300 rounded-xl text-sm transition-colors">
            <LogIn size={14} /> Beitreten
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
            <Plus size={16} /> Neue Gruppe
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
          ) : groups.length === 0 ? (
            <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
              <Users size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Noch keine Gruppen vorhanden</p>
              <div className="flex gap-3 justify-center mt-3">
                <button onClick={() => setShowCreate(true)} className="text-sm text-orange-500 hover:text-orange-600">Gruppe erstellen →</button>
                <span className="text-slate-600">|</span>
                <button onClick={() => setShowJoin(true)} className="text-sm text-orange-500 hover:text-orange-600">Per Code beitreten →</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(g => <GroupCard key={g.id} group={g} onSelect={grp => setSelected(grp)} isSelected={selected?.id === g.id} />)}
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">{selected.name}</h2>
              <div className="flex gap-2">
                {isAdmin && (
                  <button onClick={() => { setShowInviteEmail(true); setError(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-xs transition-colors">
                    <UserPlus size={13} /> Per E-Mail
                  </button>
                )}
                {isAdmin && selected.created_by === user?.id && (
                  <button onClick={() => deleteMutation.mutate(selected.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors">
                    <Trash2 size={13} /> Löschen
                  </button>
                )}
              </div>
            </div>

            {/* Invite Code Section */}
            {selected.invite_code && (
              <div className="mb-4 p-3 bg-bg rounded-xl border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Hash size={11} /> Einladungscode</span>
                  {isAdmin && (
                    <button onClick={() => regenCodeMutation.mutate(selected.id)}
                      className="text-xs text-slate-500 hover:text-orange-500 flex items-center gap-1 transition-colors">
                      <RefreshCw size={11} className={regenCodeMutation.isPending ? 'animate-spin' : ''} /> Erneuern
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono font-bold text-orange-500 tracking-widest flex-1">{selected.invite_code}</code>
                  <button onClick={copyCode} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-xs transition-colors">
                    <Copy size={12} />{copiedCode ? 'Kopiert!' : 'Kopieren'}
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1">Teile diesen Code mit Personen, die beitreten sollen.</p>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-3">{members.length} Mitglieder</p>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-bg rounded-xl">
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center text-xs font-bold text-orange-500">
                      {m.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white flex items-center gap-1.5">
                      {m.username}
                      {m.role === 'admin' && <Crown size={11} className="text-amber-400" />}
                    </p>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </div>
                  {m.id !== user?.id && isAdmin && (
                    <button onClick={() => removeMutation.mutate({ groupId: selected.id, userId: m.id })}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Neue Gruppe erstellen">
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Name *</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="z.B. Familie Pirmus" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Typ</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="household">Haushalt</option>
              <option value="work">Arbeit</option>
              <option value="general">Allgemein</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 shadow-md shadow-orange-500/20">
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Erstellen
            </button>
          </div>
        </div>
      </Modal>

      {/* Join by Code Modal */}
      <Modal open={showJoin} onClose={() => { setShowJoin(false); setError(''); }} title="Gruppe beitreten" size="sm">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Einladungscode</label>
            <input className="w-full px-3.5 py-2.5 text-sm font-mono tracking-widest uppercase text-center text-lg" placeholder="z.B. AB12CD34"
              value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={8} />
            <p className="text-xs text-slate-500 mt-1.5">8-stelliger Code, den der Gruppenadmin mit dir geteilt hat.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowJoin(false); setError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => joinMutation.mutate(joinCode)} disabled={joinCode.length < 4 || joinMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 shadow-md shadow-orange-500/20">
              {joinMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />} Beitreten
            </button>
          </div>
        </div>
      </Modal>

      {/* Invite by Email Modal */}
      <Modal open={showInviteEmail} onClose={() => { setShowInviteEmail(false); setError(''); }} title="Per E-Mail einladen" size="sm">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">E-Mail-Adresse</label>
            <input type="email" className="w-full px-3.5 py-2.5 text-sm" placeholder="email@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1.5">Der Benutzer muss bereits ein Konto haben.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowInviteEmail(false); setError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => inviteEmailMutation.mutate({ id: selected?.id, email: inviteEmail })} disabled={!inviteEmail || inviteEmailMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 shadow-md shadow-orange-500/20">
              {inviteEmailMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Einladen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
