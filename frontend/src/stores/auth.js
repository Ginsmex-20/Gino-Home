import { create } from 'zustand';
import api from '../api/client';

const OWNER_EMAIL = 'lpirmus2002@gmail.com';

const useAuth = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  mustChangePassword: false,

  login: async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token, mustChangePassword: !!data.must_change_password });
    return data;
  },

  loginWithGoogle: async (accessToken) => {
    const data = await api.post('/auth/google', { accessToken });
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token, mustChangePassword: !!data.must_change_password });
    return data;
  },

  loginWithApple: async (identityToken, user) => {
    const data = await api.post('/auth/apple', { identityToken, user });
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token, mustChangePassword: false });
    return data;
  },

  setInitialPassword: async (password) => {
    const data = await api.post('/auth/set-password', { password });
    set({ mustChangePassword: false, user: data.user });
    return data;
  },

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      set({ isLoading: true });
      const user = await api.get('/auth/me');
      set({ user, isLoading: false, mustChangePassword: !!user.force_password_change });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  updateUser: (user) => set({ user }),

  isOwner: () => get().user?.email === OWNER_EMAIL,

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, mustChangePassword: false });
  }
}));

export default useAuth;
