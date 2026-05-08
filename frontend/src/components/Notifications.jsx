import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { connectSocket, disconnectSocket, getSocket } from '../api/socket';
import useNotifications from '../stores/notifications';
import useAuth from '../stores/auth';

// ── Kurzer Benachrichtigungs-Sound (Web Audio API) ───────────────────────────
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0,    ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    // Kontext schließen sobald der Ton fertig ist
    osc.onended = () => ctx.close();
  } catch (_) {}
}

// ── Socket-Manager: verbindet Socket.io und verarbeitet Events ───────────────
export function SocketManager() {
  const { token, user } = useAuth();
  const { addNotification, addBatch } = useNotifications();
  const location = useLocation();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    // Echtzeit-Chat-Nachricht
    socket.on('chat:message', ({ groupId, message }) => {
      // Keine Benachrichtigung für eigene Nachrichten
      if (message.user_id === userRef.current?.id) return;
      // Keine Benachrichtigung wenn wir gerade diesen Chat anschauen
      const isViewing = location.pathname.includes(`/groups/${groupId}`) &&
                        location.pathname.includes('chat');
      if (isViewing) return;
      // Wird via notification:new event behandelt — hier nichts tun
    });

    // Benachrichtigung vom Server (Chat, Kalender, Verträge etc.)
    socket.on('notification:new', (notif) => {
      // Nicht benachrichtigen wenn wir selbst der Sender sind
      if (notif.senderId && notif.senderId === userRef.current?.id) return;
      addNotification(notif);
      playNotifSound();
    });

    // Initiale Benachrichtigungen beim Verbindungsaufbau (Kalender, Verträge)
    socket.on('notifications:init', (notifs) => {
      addBatch(notifs);
    });

    return () => {
      disconnectSocket();
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── Benachrichtigungs-Panel (Dropdown) ───────────────────────────────────────
export function NotificationPanel() {
  const { notifications, panelOpen, closePanel, markAllRead, clearAll } = useNotifications();

  if (!panelOpen) return null;

  const typeColor = { chat: '#f97316', calendar: '#60a5fa', contract: '#fbbf24' };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closePanel}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)' }}
      />

      {/* Panel — auf Mobile (max 767px) zentriert ueber notification-panel-mobile,
          auf Desktop oben rechts (Default) */}
      <div className="notification-panel-mobile" style={{
        position: 'fixed',
        top: 'calc(16px + env(safe-area-inset-top))',
        right: '16px',
        width: 'min(340px, calc(100vw - 32px))',
        maxHeight: '520px',
        background: '#1e1e1e',
        border: '1px solid #2a2a2a',
        borderRadius: '16px',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}>
          <Bell size={16} style={{ color: '#f97316' }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px', flex: 1 }}>
            Benachrichtigungen
          </span>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              title="Alle löschen"
              style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex' }}
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={closePanel}
            style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Liste */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center' }}>
              <Bell size={32} style={{ color: '#2a2a2a', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}>
                Keine Benachrichtigungen
              </p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{
                padding: '12px 16px',
                borderBottom: '1px solid #1a1a1a',
                background: n.seen ? 'transparent' : 'rgba(249,115,22,0.04)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                borderLeft: n.seen ? 'none' : `3px solid ${typeColor[n.type] || '#f97316'}`,
              }}>
                <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>
                  {n.icon || '🔔'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                    {n.title}
                  </p>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', wordBreak: 'break-word' }}>
                    {n.body}
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#374151', fontSize: '11px' }}>
                    {n.time
                      ? format(new Date(n.time), 'EEEE, d. MMM · HH:mm', { locale: de })
                      : format(new Date(n.receivedAt), 'HH:mm', { locale: de })
                    }
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Toast-Benachrichtigungen (kurze Popups oben rechts) ──────────────────────
function Toast({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(onRemove, 5000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const borderColor = { chat: '#f97316', calendar: '#60a5fa', contract: '#fbbf24' }[toast.type] || '#f97316';

  return (
    <div style={{
      width: '300px',
      padding: '12px 14px',
      background: '#1e1e1e',
      border: '1px solid #2a2a2a',
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      animation: 'slideInRight 0.3s ease',
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{toast.icon || '🔔'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
          {toast.title}
        </p>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {toast.body}
        </p>
      </div>
      <button
        onClick={onRemove}
        style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, fontSize: '16px', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useNotifications();
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed',
      top: '16px', right: '16px',
      zIndex: 300,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.toastId} style={{ pointerEvents: 'auto' }}>
          <Toast toast={t} onRemove={() => removeToast(t.toastId)} />
        </div>
      ))}
    </div>
  );
}

// ── Glocken-Button (wird in Sidebar + Mobile-Header verwendet) ───────────────
export function NotificationBell({ style = {}, noClick = false }) {
  const { unread, togglePanel } = useNotifications();

  const bellContent = (
    <>
      <Bell size={18} />
      {unread > 0 && (
        <span style={{
          position: 'absolute',
          top: '2px', right: '2px',
          minWidth: '16px', height: '16px',
          background: '#ef4444',
          borderRadius: '10px',
          fontSize: '10px',
          fontWeight: 700,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 3px',
          border: '1.5px solid #111',
        }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </>
  );

  if (noClick) {
    return (
      <div style={{
        position: 'relative',
        padding: '6px',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}>
        {bellContent}
      </div>
    );
  }

  return (
    <button
      onClick={togglePanel}
      title="Benachrichtigungen"
      style={{
        position: 'relative',
        padding: '6px',
        borderRadius: '8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.15s',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#f97316'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
    >
      {bellContent}
    </button>
  );
}
