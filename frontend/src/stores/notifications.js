import { create } from 'zustand';

let _idCounter = 0;
const nextId = () => ++_idCounter;

const useNotifications = create((set, get) => ({
  notifications: [],   // Alle Benachrichtigungen (max 50)
  unread: 0,           // Anzahl ungelesener
  panelOpen: false,    // Benachrichtigungs-Panel offen?
  toasts: [],          // Kurze Toast-Popups (max 3)

  // Eine neue Benachrichtigung hinzufügen
  addNotification: (notif) => {
    const item = { ...notif, id: nextId(), seen: false, receivedAt: new Date().toISOString() };
    set(s => ({
      notifications: [item, ...s.notifications].slice(0, 50),
      unread: s.unread + 1,
      // Toast nur wenn Panel geschlossen
      toasts: s.panelOpen ? s.toasts : [...s.toasts, { ...item, toastId: nextId() }].slice(-3),
    }));
  },

  // Mehrere auf einmal (bei Verbindungsaufbau)
  addBatch: (notifs) => {
    const items = notifs.map(n => ({ ...n, id: nextId(), seen: false, receivedAt: new Date().toISOString() }));
    set(s => ({
      notifications: [...items, ...s.notifications].slice(0, 50),
      unread: s.unread + items.length,
    }));
  },

  // Panel öffnen/schließen
  togglePanel: () => set(s => {
    const panelOpen = !s.panelOpen;
    if (panelOpen) {
      // Alle als gelesen markieren wenn Panel geöffnet wird
      return {
        panelOpen,
        notifications: s.notifications.map(n => ({ ...n, seen: true })),
        unread: 0,
      };
    }
    return { panelOpen };
  }),

  closePanel: () => set({ panelOpen: false }),

  markAllRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, seen: true })),
    unread: 0,
  })),

  clearAll: () => set({ notifications: [], unread: 0 }),

  // Toast entfernen
  removeToast: (toastId) => set(s => ({
    toasts: s.toasts.filter(t => t.toastId !== toastId),
  })),
}));

export default useNotifications;
