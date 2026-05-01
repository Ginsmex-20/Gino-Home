import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Loader2 } from 'lucide-react';
import useAuth from '../stores/auth';

const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID;
const APPLE_REDIRECT   = import.meta.env.VITE_APPLE_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : '');

function AppleLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46.7 790.4 0 663 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  );
}

export default function Login() {
  const [form, setForm]           = useState({ email: '', password: '' });
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { login, loginWithApple } = useAuth();
  const navigate = useNavigate();

  // Apple JS-SDK laden (nur wenn konfiguriert)
  useEffect(() => {
    if (!APPLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.onload = () => {
      window.AppleID?.auth.init({
        clientId:    APPLE_CLIENT_ID,
        scope:       'name email',
        redirectURI: APPLE_REDIRECT,
        usePopup:    true,
      });
      setAppleReady(true);
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

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

  const handleAppleLogin = async () => {
    if (!window.AppleID) return;
    setAppleLoading(true); setError('');
    try {
      const response = await window.AppleID.auth.signIn();
      await loginWithApple(response.authorization.id_token, response.user || null);
      navigate('/');
    } catch (err) {
      if (err?.error !== 'popup_closed_by_user') {
        setError('Apple-Anmeldung fehlgeschlagen');
      }
    } finally { setAppleLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#161616] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <Home size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gino-Home</h1>
          <p className="text-slate-400 mt-1 text-sm">Willkommen zurück</p>
        </div>

        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

          {/* Apple Sign In — nur wenn konfiguriert */}
          {APPLE_CLIENT_ID && (
            <>
              <button onClick={handleAppleLogin} disabled={!appleReady || appleLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-white hover:bg-gray-100 active:bg-gray-200 text-black rounded-xl font-medium text-sm transition-colors disabled:opacity-50 mb-4">
                {appleLoading ? <Loader2 size={15} className="animate-spin" /> : <AppleLogo />}
                Mit Apple anmelden
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[#2a2a2a]" />
                <span className="text-xs text-slate-500">oder mit E-Mail</span>
                <div className="flex-1 h-px bg-[#2a2a2a]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">E-Mail</label>
              <input type="email" placeholder="deine@email.de" className="w-full px-3.5 py-2.5 text-sm"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Passwort</label>
              <input type="password" placeholder="••••••••" className="w-full px-3.5 py-2.5 text-sm"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-orange-500/20">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Anmelden...</> : 'Anmelden'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-600 mt-4">
            Zugang nur auf Einladung
          </p>
        </div>
      </div>
    </div>
  );
}
