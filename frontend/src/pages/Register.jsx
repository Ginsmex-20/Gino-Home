import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Loader2 } from 'lucide-react';
import useAuth from '../stores/auth';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwörter stimmen nicht überein');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.error || 'Registrierung fehlgeschlagen');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <Home size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gino-Home</h1>
          <p className="text-slate-400 mt-1 text-sm">Konto erstellen</p>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-xl">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Benutzername</label>
              <input type="text" placeholder="dein_name" className="w-full px-3.5 py-2.5 text-sm"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">E-Mail</label>
              <input type="email" placeholder="deine@email.de" className="w-full px-3.5 py-2.5 text-sm"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Passwort</label>
              <input type="password" placeholder="Mindestens 6 Zeichen" className="w-full px-3.5 py-2.5 text-sm"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Passwort bestätigen</label>
              <input type="password" placeholder="••••••••" className="w-full px-3.5 py-2.5 text-sm"
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Registrieren...</> : 'Konto erstellen'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            Bereits registriert?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-500 transition-colors">Anmelden</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
