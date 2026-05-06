import { create } from 'zustand';

const useUpdate = create((set) => ({
  hasUpdate: false,
  updateInfo: null,
  setUpdate: (info) => set({ hasUpdate: true, updateInfo: info }),
  clearUpdate: () => set({ hasUpdate: false, updateInfo: null }),
}));

export default useUpdate;
