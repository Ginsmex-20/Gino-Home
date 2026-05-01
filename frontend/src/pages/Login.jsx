import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import useAuth from '../stores/auth';

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.error || 'Anmeldung fehlgeschlagen');
    } finally { setLoading(false); }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async tokenResponse => {
      setGLoading(true); setError('');
      try {
        await loginWithGoogle(tokenResponse.access_token);
        navigate('/');
      } catch (err) {
        setError(err.error || 'Google-Anmeldung fehlgeschlagen');
      } finally { setGLoading(false); }
    },
    onError: () => setError('Google-Anmeldung fehlgeschlagen'),
  });

  return (
    <div style={{
      minHeight: '100dvh', background: '#161616',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.svg" alt="Gino-Home" style={{ width: '72px', height: '72px', margin: '0 auto 12px', display: 'block', filter: 'drop-shadow(0 0 16px rgba(249,115,22,0.5))' }} />
          <h1 style={{ margin: '0 0 4px', color: '#fff', fontSize: '22px', fontWeight: 700 }}>Gino-Home</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Willkommen zurück</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#1e1e1e', border: '1px solid #2a2a2a',
          borderRadius: '20px', padding: '24px',
        }}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '13px',
            }}>{error}</div>
          )}

          {/* Google Button */}
          <button
            onClick={() => googleLogin()}
            disabled={gLoading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', padding: '11px', marginBottom: '16px',
              background: '#fff', color: '#1f1f1f', border: 'none',
              borderRadius: '12px', fontWeight: 600, fontSize: '14px',
              cursor: gLoading ? 'not-allowed' : 'pointer',
              opacity: gLoading ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            {gLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <GoogleLogo />}
            Mit Google anmelden
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
            <span style={{ color: '#4b5563', fontSize: '12px' }}>oder mit E-Mail</span>
            <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
          </div>

          {/* E-Mail Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>E-Mail</label>
              <input
                type="email" placeholder="deine@email.de"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px' }}
                required
              />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Passwort</label>
              <input
                type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px' }}
                required
              />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px',
              background: '#f97316', color: '#fff', border: 'none',
              borderRadius: '12px', fontWeight: 600, fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Anmelden...</> : 'Anmelden'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#374151', marginTop: '16px', marginBottom: 0 }}>
            Zugang nur auf Einladung
          </p>
        </div>
      </div>
    </div>
  );
}
