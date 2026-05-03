import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Camera, Save, Lock, Loader2, UserPlus, Trash2,
  ShieldCheck, ToggleLeft, ToggleRight, Phone, FileText,
  Calendar, AtSign, KeyRound, CheckCircle2, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/client';
import useAuth from '../stores/auth';
import ConfirmDialog from '../components/ConfirmDialog';

/* ── Kleine Hilfskomponenten ──────────────────────────────────────────── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#161616',
      border: '1px solid #232323',
      borderRadius: '20px',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, accent = '#f97316' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '18px 22px 14px',
      borderBottom: '1px solid #1e1e1e',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '10px',
        background: `${accent}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={15} color={accent} />
      </div>
      <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{title}</span>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        color: '#64748b', fontSize: '12px', fontWeight: 500,
        marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {Icon && <Icon size={11} />}{label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: '#0f0f0f', border: '1px solid #2a2a2a',
  borderRadius: '12px', color: '#e2e8f0', fontSize: '14px',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

function StyledInput({ type = 'text', ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      style={{ ...inputStyle, borderColor: focused ? '#f97316' : '#2a2a2a' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

function StyledTextarea({ ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      style={{ ...inputStyle, borderColor: focused ? '#f97316' : '#2a2a2a', resize: 'none' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

function PrimaryBtn({ loading, icon: Icon, children, ...props }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        padding: '10px 18px', background: hov ? '#ea580c' : '#f97316',
        color: '#fff', border: 'none', borderRadius: '12px',
        fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1, transition: 'background 0.15s',
        boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={loading}
      {...props}
    >
      {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={14} />}
      {children}
    </button>
  );
}

function Alert({ type, children }) {
  const cfg = {
    success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', color: '#4ade80', Icon: CheckCircle2 },
    error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#f87171', Icon: XCircle   },
  }[type];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      padding: '10px 14px', borderRadius: '12px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontSize: '13px', marginBottom: '16px',
    }}>
      <cfg.Icon size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
      <span>{children}</span>
    </div>
  );
}

/* ── Benutzer-Verwaltung (nur Owner) ─────────────────────────────────── */
function UserManagement() {
  const qc = useQueryClient();
  const [form, setForm]     = useState({ username: '', email: '' });
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');
  const [delConfirm, setDelConfirm] = useState({ open: false, userId: null, name: '' });

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setDelConfirm({ open: false, userId: null, name: '' });
    },
  });

  const handleInvite = e => {
    e.preventDefault();
    setResult(null); setError('');
    inviteMutation.mutate(form);
  };

  return (
    <>
      <ConfirmDialog
        open={delConfirm.open}
        title="Benutzer löschen?"
        message={`„${delConfirm.name}" wird dauerhaft gelöscht und kann sich nicht mehr anmelden.`}
        confirmLabel="Löschen"
        danger
        onConfirm={() => deleteMutation.mutate(delConfirm.userId)}
        onCancel={() => setDelConfirm({ open: false, userId: null, name: '' })}
      />

      <Card>
        <CardHeader icon={ShieldCheck} title="Benutzerverwaltung" accent="#a78bfa" />
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Invite */}
          <div style={{ background: '#0f0f0f', borderRadius: '14px', padding: '16px', border: '1px solid #1e1e1e' }}>
            <p style={{ margin: '0 0 14px', color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>
              Neuen Benutzer einladen
            </p>
            {error  && <Alert type="error">{error}</Alert>}
            {result && (
              <Alert type="success">
                {result.message}
                {result.temp_code && (
                  <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '18px', letterSpacing: '4px', color: '#f97316' }}>
                    {result.temp_code}
                  </div>
                )}
              </Alert>
            )}
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <StyledInput placeholder="Benutzername" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
              <StyledInput type="email" placeholder="E-Mail-Adresse" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              <div>
                <PrimaryBtn type="submit" loading={inviteMutation.isPending} icon={UserPlus}>
                  Einladung senden
                </PrimaryBtn>
              </div>
            </form>
          </div>

          {/* User list */}
          <div>
            <p style={{ margin: '0 0 10px', color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alle Benutzer ({users.length})
            </p>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#4b5563' }}>Laden...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {users.map(u => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '14px',
                    background: '#0f0f0f', border: '1px solid #1e1e1e',
                    opacity: u.is_active === 0 ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#f97316,#ea580c)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700, color: '#fff',
                    }}>
                      {(u.username || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>{u.username}</div>
                      <div style={{ color: '#475569', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </div>
                      {u.force_password_change && (
                        <div style={{ color: '#f59e0b', fontSize: '10px', marginTop: '1px' }}>Kein eigenes Passwort</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => toggleMutation.mutate(u.id)}
                        disabled={toggleMutation.isPending}
                        title={u.is_active ? 'Deaktivieren' : 'Aktivieren'}
                        style={{ padding: '7px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '10px', cursor: 'pointer', color: u.is_active ? '#4ade80' : '#374151', display: 'flex' }}
                      >
                        {u.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </button>
                      <button
                        onClick={() => setDelConfirm({ open: true, userId: u.id, name: u.username })}
                        disabled={deleteMutation.isPending}
                        title="Löschen"
                        style={{ padding: '7px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '10px', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

/* ── Profile Page ────────────────────────────────────────────────────── */
export default function Profile() {
  const { user, updateUser, isOwner } = useAuth();
  const fileRef = useRef();
  const [profile, setProfile]   = useState({ username: user?.username || '', bio: user?.bio || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const saveMutation = useMutation({
    mutationFn: data => api.put('/auth/profile', data),
    onSuccess: u => { updateUser(u); setProfileSuccess(true); setTimeout(() => setProfileSuccess(false), 3000); },
  });

  const pwMutation = useMutation({
    mutationFn: data => api.put('/auth/password', data),
    onSuccess: () => {
      setPwSuccess(true);
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => setPwSuccess(false), 3000);
    },
    onError: err => setPwError(err.error || 'Fehler'),
  });

  const avatarMutation = useMutation({
    mutationFn: formData => api.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: data => updateUser({ ...user, avatar: data.avatar }),
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

  // Initialbuchstaben-Avatar
  const initials = (user?.username || '?')[0].toUpperCase();
  const memberSince = user?.created_at
    ? format(new Date(user.created_at), 'd. MMMM yyyy', { locale: de })
    : '';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

      {/* ── Hero Card ─────────────────────────────────────────────────── */}
      <Card>
        {/* Gradient Banner */}
        <div style={{
          height: '110px',
          background: 'linear-gradient(135deg, #1a0a00 0%, #2d1200 40%, #1a0500 70%, #0f0f0f 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative glow */}
          <div style={{
            position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)',
            width: '200px', height: '100px',
            background: 'radial-gradient(ellipse, rgba(249,115,22,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '24px', position: 'relative' }}>
          <div style={{ position: 'relative', marginTop: '-44px', marginBottom: '14px' }}>
            {user?.avatar ? (
              <img
                src={user.avatar} alt=""
                style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #f97316', boxShadow: '0 0 0 3px #161616' }}
              />
            ) : (
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316, #c2410c)',
                border: '3px solid #161616',
                boxShadow: '0 0 0 3px rgba(249,115,22,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: 800, color: '#fff',
              }}>
                {initials}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28,
                background: '#f97316', border: '2px solid #161616',
                borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {avatarMutation.isPending
                ? <Loader2 size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                : <Camera size={12} color="#fff" />
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          {/* Name + role */}
          <p style={{ margin: '0 0 4px', color: '#fff', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.3px' }}>
            {user?.username}
          </p>
          <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '13px' }}>{user?.email}</p>

          {/* Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {isOwner() && (
              <span style={{
                padding: '3px 10px', borderRadius: '20px',
                background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)',
                color: '#a78bfa', fontSize: '11px', fontWeight: 600,
              }}>
                Owner
              </span>
            )}
            {memberSince && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '3px 10px', borderRadius: '20px',
                background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)',
                color: '#64748b', fontSize: '11px',
              }}>
                <Calendar size={10} /> Seit {memberSince}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── Profil bearbeiten ─────────────────────────────────────────── */}
      <Card>
        <CardHeader icon={User} title="Profil bearbeiten" />
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {profileSuccess && <Alert type="success">Profil erfolgreich gespeichert!</Alert>}

          <Field label="Benutzername" icon={AtSign}>
            <StyledInput value={profile.username} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} />
          </Field>
          <Field label="Telefon" icon={Phone}>
            <StyledInput placeholder="+49 123 456789" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </Field>
          <Field label="Bio" icon={FileText}>
            <StyledTextarea rows={3} placeholder="Ein paar Worte über dich…" value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
          </Field>

          <div>
            <PrimaryBtn loading={saveMutation.isPending} icon={Save} onClick={() => saveMutation.mutate(profile)}>
              Speichern
            </PrimaryBtn>
          </div>
        </div>
      </Card>

      {/* ── Passwort ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader icon={KeyRound} title="Passwort ändern" accent="#60a5fa" />
        <div style={{ padding: '20px 22px' }}>
          {pwError   && <Alert type="error">{pwError}</Alert>}
          {pwSuccess && <Alert type="success">Passwort erfolgreich geändert!</Alert>}
          <form onSubmit={handlePwSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field label="Aktuelles Passwort" icon={Lock}>
              <StyledInput type="password" value={passwords.currentPassword} onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} required />
            </Field>
            <Field label="Neues Passwort" icon={Lock}>
              <StyledInput type="password" value={passwords.newPassword} onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} required />
            </Field>
            <Field label="Passwort bestätigen" icon={Lock}>
              <StyledInput type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required />
            </Field>
            <div>
              <PrimaryBtn type="submit" loading={pwMutation.isPending} icon={Lock}>
                Passwort ändern
              </PrimaryBtn>
            </div>
          </form>
        </div>
      </Card>

      {/* ── Owner: Benutzerverwaltung ─────────────────────────────────── */}
      {isOwner() && <UserManagement />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
