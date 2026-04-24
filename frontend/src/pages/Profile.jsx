import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Camera, Save, Lock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/client';
import useAuth from '../stores/auth';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef();
  const [profile, setProfile] = useState({ username: user?.username || '', bio: user?.bio || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
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
    </div>
  );
}
