import { useState, useEffect } from 'react';
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

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.04c-.03-3.05 2.49-4.51 2.6-4.58-1.42-2.07-3.62-2.36-4.4-2.39-1.87-.19-3.66 1.1-4.61 1.1-.97 0-2.42-1.08-3.99-1.05-2.03.03-3.93 1.19-4.97 3-2.13 3.69-.54 9.13 1.51 12.13 1.01 1.47 2.21 3.11 3.78 3.05 1.52-.06 2.09-.98 3.93-.98s2.36.98 3.97.95c1.64-.03 2.68-1.49 3.69-2.97 1.16-1.7 1.64-3.36 1.66-3.45-.04-.02-3.18-1.22-3.21-4.81zM14.05 3.31c.84-1.02 1.41-2.43 1.25-3.84-1.21.05-2.68.81-3.55 1.82-.78.91-1.46 2.36-1.28 3.74 1.35.1 2.73-.69 3.58-1.72z"/>
    </svg>
  );
}

const isNativeIOS = () =>
  typeof window !== 'undefined' &&
  !!window.GinoHomeNative &&
  window.GinoHomeNative.platform === 'ios';

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [aLoading, setALoading] = useState(false);
  const [native, setNative]     = useState(isNativeIOS());
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const navigate = useNavigate();

  // Bridge wird per WKUserScript bei document-start injiziert — kann
  // bei einer SPA-Navigation aber kurz nach dem ersten Render verfügbar werden.
  useEffect(() => {
    if (native) return;
    const t = setInterval(() => {
      if (isNativeIOS()) { setNative(true); clearInterval(t); }
    }, 200);
    return () => clearInterval(t);
  }, [native]);

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

  const webGoogleLogin = useGoogleLogin({
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

  const handleGoogle = async () => {
    setError('');
    if (native) {
      setGLoading(true);
      try {
        const res = await window.GinoHomeNative.signIn('google');
        if (!res?.accessToken) throw new Error('Kein Token erhalten');
        await loginWithGoogle(res.accessToken);
        navigate('/');
      } catch (err) {
        if (err?.message !== 'cancelled') {
          setError(err?.error || err?.message || 'Google-Anmeldung fehlgeschlagen');
        }
      } finally { setGLoading(false); }
    } else {
      webGoogleLogin();
    }
  };

  const handleApple = async () => {
    if (!native) {
      setError('Apple-Anmeldung ist aktuell nur in der iOS-App verfügbar.');
      return;
    }
    setError(''); setALoading(true);
    try {
      const res = await window.GinoHomeNative.signIn('apple');
      if (!res?.identityToken) throw new Error('Kein Apple-Token erhalten');
      await loginWithApple(res.identityToken, res.user);
      navigate('/');
    } catch (err) {
      if (err?.message !== 'cancelled') {
        setError(err?.error || err?.message || 'Apple-Anmeldung fehlgeschlagen');
      }
    } finally { setALoading(false); }
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100dvh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', overflow: 'hidden',
    }}>
      {/* Ambient Blobs */}
      <div aria-hidden style={{
        position: 'absolute', top: '-160px', left: '-120px',
        width: '460px', height: '460px', borderRadius: '50%',
        background: 'rgba(249,115,22,0.30)', filter: 'blur(120px)',
        pointerEvents: 'none',
      }} className="animate-blob" />
      <div aria-hidden style={{
        position: 'absolute', bottom: '-180px', right: '-140px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'rgba(234,88,12,0.22)', filter: 'blur(140px)',
        pointerEvents: 'none', animationDelay: '-6s',
      }} className="animate-blob" />
      <div aria-hidden className="grid-pattern" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.svg" alt="Gino-Home" style={{ width: '76px', height: '76px', margin: '0 auto 14px', display: 'block', filter: 'drop-shadow(0 0 24px rgba(249,115,22,0.55))' }} />
          <h1
            className="text-gradient-brand"
            style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}
          >
            Gino-Home
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Willkommen zurück</p>
        </div>

        {/* Glass-Card */}
        <div className="glass-card" style={{
          borderRadius: '24px', padding: '26px',
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
            onClick={handleGoogle}
            disabled={gLoading || aLoading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', padding: '11px', marginBottom: '10px',
              background: '#fff', color: '#1f1f1f', border: 'none',
              borderRadius: '12px', fontWeight: 600, fontSize: '14px',
              cursor: (gLoading || aLoading) ? 'not-allowed' : 'pointer',
              opacity: (gLoading || aLoading) ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            {gLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <GoogleLogo />}
            Mit Google anmelden
          </button>

          {/* Apple Button — nur in der iOS-App sichtbar */}
          {native && (
            <button
              onClick={handleApple}
              disabled={gLoading || aLoading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '10px', padding: '11px', marginBottom: '16px',
                background: '#000', color: '#fff', border: '1px solid #2a2a2a',
                borderRadius: '12px', fontWeight: 600, fontSize: '14px',
                cursor: (gLoading || aLoading) ? 'not-allowed' : 'pointer',
                opacity: (gLoading || aLoading) ? 0.7 : 1,
              }}
            >
              {aLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <AppleLogo />}
              Mit Apple anmelden
            </button>
          )}

          {!native && <div style={{ height: '6px' }} />}

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
