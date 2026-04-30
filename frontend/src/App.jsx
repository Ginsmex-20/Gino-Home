import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './stores/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
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

function ProtectedRoute({ children }) {
  const { token, isLoading } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-[#161616]">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return children;
}

export default function App() {
  const { loadUser, token } = useAuth();

  useEffect(() => {
    if (token) loadUser();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />

        {/* Persönlich */}
        <Route path="groups" element={<Groups />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="finance" element={<Finance />} />
        <Route path="documents" element={<Documents />} />
        <Route path="vault" element={<Vault />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="groceries" element={<Groceries />} />

        {/* Gruppen — direkter Tab-Zugriff aus der Sidebar */}
        <Route path="groups/:groupId" element={<GroupView />} />
        <Route path="groups/:groupId/:tab" element={<GroupView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
