import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './stores/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import Tasks from './pages/Tasks';
import Finance from './pages/Finance';
import Documents from './pages/Documents';
import Vault from './pages/Vault';
import Calendar from './pages/Calendar';
import GroupView from './pages/GroupView';
import Groceries from './pages/Groceries';
import Notizen from './pages/Notizen';

/* ── Force Password Change Modal ─────────────────────────────────────── */
function ForcePasswordChange() {
  const { setInitialPassword, logout } = useAuth();
  const [pw, setPw]         = useState('');
  const [pw2, setPw2]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (pw.length < 6) return setError('Mindestens 6 Zeichen');
    if (pw !== pw2)    return setError('Passwörter stimmen nicht überein');
    setLoading(true);
    try {
      await setInitialPassword(pw);
    } catch (err) {
      setError(err.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#1e1e1e', borderRadius: '20px',
        padding: '32px', border: '1px solid #2a2a2a',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: '#f97316', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px',
          }}>🔑</div>
          <h2 style={{ margin: '0 0 6px', color: '#fff', fontSize: '20px' }}>Passwort festlegen</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Bitte wähle ein eigenes Passwort für deinen Account.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', fontSize: '13px', marginBottom: '16px',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
              Neues Passwort
            </label>
            <input
              type="password" placeholder="Mindestens 6 Zeichen"
              value={pw} onChange={e => setPw(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', boxSizing: 'border-box' }}
              required
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
              Passwort bestätigen
            </label>
            <input
              type="password" placeholder="Nochmal eingeben"
              value={pw2} onChange={e => setPw2(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', boxSizing: 'border-box' }}
              required
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px',
            background: '#f97316', color: '#fff', border: 'none',
            borderRadius: '10px', fontWeight: 600, fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Speichern...' : 'Passwort festlegen'}
          </button>
        </form>

        <button onClick={logout} style={{
          width: '100%', marginTop: '12px', padding: '10px',
          background: 'transparent', color: '#64748b', border: '1px solid #2a2a2a',
          borderRadius: '10px', cursor: 'pointer', fontSize: '13px',
        }}>
          Abmelden
        </button>
      </div>
    </div>
  );
}

/* ── Protected Route ─────────────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { token, isLoading, mustChangePassword } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-[#161616]">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (mustChangePassword) return <ForcePasswordChange />;
  return children;
}

/* ── App ─────────────────────────────────────────────────────────────── */
export default function App() {
  const { loadUser, token } = useAuth();

  useEffect(() => {
    if (token) loadUser();
  }, []);

  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="profile"   element={<Profile />} />
        <Route path="groups"    element={<Groups />} />
        <Route path="tasks"     element={<Tasks />} />
        <Route path="finance"   element={<Finance />} />
        <Route path="documents" element={<Documents />} />
        <Route path="vault"     element={<Vault />} />
        <Route path="calendar"  element={<Calendar />} />
        <Route path="groceries" element={<Groceries />} />
        <Route path="notizen"   element={<Notizen />} />
        <Route path="groups/:groupId"      element={<GroupView />} />
        <Route path="groups/:groupId/:tab" element={<GroupView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
