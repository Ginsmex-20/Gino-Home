import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Camera, Save, Lock, Loader2, UserPlus, Trash2, ShieldCheck, ToggleLeft, ToggleRight, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/client';
import useAuth from '../stores/auth';

/* ── Benutzer-Verwaltung (nur für Owner) ─────────────────────────────── */
function UserManagement() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ username: '', email: '' });
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/auth/users'),
  });

  const inviteMutation = useMutation({
    mutationFn: data => api.post('/auth/invite', data),
    onSuccess: data => {
      setResult(data);
      setForm({ username: '', email: '' });
      setError('');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: err => setError(err.error || 'Fehler beim Einladen'),
  });

  const toggleMutation = useMutation({
    mutationFn: id => api.patch(`/auth/users/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/auth/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const handleInvite = e => {
    e.preventDefault();
    setResult(null); setError('');
    inviteMutation.mutate(form);
  };

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '24px' }}>
      <h2 style={{ margin: '0 0 20px', color: '#fff', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={16} color="#f97316" /> Benutzerverwaltung
      </h2>

      {/* Einladungsformular */}
      <div style={{ background: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #222' }}>
        <p style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>
          Neuen Benutzer einladen
        </p>
        {error  && <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        {result && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontSize: '13px', marginBottom: '12px' }}>
            ✅ {result.message}
            {result.temp_code && (
              <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '16px', letterSpacing: '4px', color: '#f97316' }}>
                Code: {result.temp_code}
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            placeholder="Benutzername"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            style={{ padding: '9px 12px', borderRadius: '8px', fontSize: '14px' }}
            required
          />
          <input
            type="email" placeholder="E-Mail-Adresse"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={{ padding: '9px 12px', borderRadius: '8px', fontSize: '14px' }}
            required
          />
          <button type="submit" disabled={inviteMutation.isPending} style={{
            padding: '9px 16px', background: '#f97316', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
            cursor: inviteMutation.isPending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', opacity: inviteMutation.isPending ? 0.7 : 1,
          }}>
            {inviteMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />}
            Einladung senden
          </button>
        </form>
      </div>

      {/* Benutzerliste */}
      <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Alle Benutzer ({users.length})
      </p>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>Laden...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {users.map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '10px',
              background: '#0f0f0f', border: '1px solid #1e1e1e',
              opacity: u.is_active === 0 ? 0.5 : 1,
            }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#f97316,#ea580c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: '#fff',
              }}>
                {(u.username || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>{u.username}</div>
                <div style={{ color: '#64748b', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                {u.force_password_change ? (
                  <div style={{ color: '#f59e0b', fontSize: '10px', marginTop: '2px' }}>⏳ Noch kein eigenes Passwort</div>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => toggleMutation.mutate(u.id)}
                  disabled={toggleMutation.isPending}
                  title={u.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  style={{
                    padding: '6px', background: 'transparent',
                    border: '1px solid #2a2a2a', borderRadius: '8px',
                    cursor: 'pointer', color: u.is_active ? '#4ade80' : '#64748b',
                  }}
                >
                  {u.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                </button>
                <button
                  onClick={() => { if (confirm(`${u.username} löschen?`)) deleteMutation.mutate(u.id); }}
                  disabled={deleteMutation.isPending}
                  title="Löschen"
                  style={{
                    padding: '6px', background: 'transparent',
                    border: '1px solid #2a2a2a', borderRadius: '8px',
                    cursor: 'pointer', color: '#ef4444',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Profile Page ────────────────────────────────────────────────────── */
export default function Profile() {
  const { user, updateUser, isOwner } = useAuth();
  const fileRef = useRef();
  const [profile, setProfile]       = useState({ username: user?.username || '', bio: user?.bio || '', phone: user?.phone || '' });
  const [passwords, setPasswords]   = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError]       = useState('');
  const [pwSuccess, setPwSuccess]   = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const saveMutation = useMutation({
    mutationFn: data => api.put('/auth/profile', data),
    onSuccess: u => { updateUser(u); setProfileSuccess(true); setTimeout(() => setProfileSuccess(false), 3000); }
  });

  const pwMutation = useMutation({
    mutationFn: data => api.put('/auth/password', data),
    onSuccess: () => { setPwSuccess(true); setPasswords({ currentPassword: '', newPassword: '', confirm: '' }); setTimeout(() => setPwSuccess(false), 3000); },
    onError: err => setPwError(err.error || 'Fehler')
  });

  const avatarMutation = useMutation({
    mutationFn: formData => api.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: data => updateUser({ ...user, avatar: data.avatar })
  });

  const handlePwSubmit = e => {
    e.preventDefault(); setPwError('');
    if (passwords.newPassword !== passwords.confirm) return setPwError('Passwörter stimmen nicht überein');
    pwMutation.mutate({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
  };

  const handleAvatarChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('avatar', file);
    avatarMutation.mutate(fd);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Mein Profil</h1>

      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-5 flex items-center gap-2"><User size={16} className="text-orange-400" /> Profildaten</h2>
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-500/40" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-orange-500/20 flex items-center justify-center border-2 border-orange-500/40">
                <User size={32} className="text-orange-400" />
              </div>
            )}
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-orange-500 hover:bg-orange-600 rounded-lg flex items-center justify-center transition-colors shadow-lg">
              {avatarMutation.isPending ? <Loader2 size={13} className="animate-spin text-white" /> : <Camera size={13} className="text-white" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="font-semibold text-white text-lg">{user?.username}</p>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <p className="text-slate-500 text-xs mt-0.5">Mitglied seit {user?.created_at ? format(new Date(user.created_at), 'd. MMMM yyyy', { locale: de }) : ''}</p>
          </div>
        </div>

        {profileSuccess && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">Profil gespeichert!</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Benutzername</label>
            <input className="w-full px-3.5 py-2.5 text-sm" value={profile.username} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Telefon</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="+49 123 456789" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Bio</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={3} placeholder="Über dich..." value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
          </div>
          <button onClick={() => saveMutation.mutate(profile)} disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Speichern
          </button>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-5 flex items-center gap-2"><Lock size={16} className="text-orange-400" /> Passwort ändern</h2>
        {pwError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{pwError}</div>}
        {pwSuccess && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">Passwort geändert!</div>}
        <form onSubmit={handlePwSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Aktuelles Passwort</label>
            <input type="password" className="w-full px-3.5 py-2.5 text-sm" value={passwords.currentPassword} onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Neues Passwort</label>
            <input type="password" className="w-full px-3.5 py-2.5 text-sm" value={passwords.newPassword} onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Passwort bestätigen</label>
            <input type="password" className="w-full px-3.5 py-2.5 text-sm" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required />
          </div>
          <button type="submit" disabled={pwMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {pwMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
            Passwort ändern
          </button>
        </form>
      </div>

      {/* Benutzerverwaltung — nur für Owner sichtbar */}
      {isOwner() && <UserManagement />}
    </div>
  );
}
