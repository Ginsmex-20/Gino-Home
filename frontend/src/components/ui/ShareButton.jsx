import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Share2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

/* ──────────────────────────────────────────────────────────────────────
   ShareButton — Universeller "Mit Freunden teilen"-Button
   Gibt einem Eintrag (Dokument, Aufgabe, Vertrag, etc.) Freigabe-Verwaltung.

   Props:
     resourceType: 'document' | 'task' | 'contract' | 'loan' |
                   'finance_item' | 'calendar_event' | 'vault_entry'
     resourceId:   ID des Eintrags
     compact:      bool — nur Icon, keine Beschriftung
   ────────────────────────────────────────────────────────────────────── */
export default function ShareButton({ resourceType, resourceId, compact = false }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: friendsData = { accepted: [] } } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends'),
    enabled: open,
  });

  const { data: shareAccess = [] } = useQuery({
    queryKey: ['share-access', resourceType, resourceId],
    queryFn: () => api.get(`/friends/share/access/${resourceType}/${resourceId}`),
    enabled: !!resourceId && open,
  });

  const shareMut = useMutation({
    mutationFn: friend_id => api.post('/friends/share', { friend_id, resource_type: resourceType, resource_id: resourceId }),
    onSuccess: () => qc.invalidateQueries(['share-access', resourceType, resourceId]),
  });

  const unshareMut = useMutation({
    mutationFn: friend_id => api.delete('/friends/share', { data: { friend_id, resource_type: resourceType, resource_id: resourceId } }),
    onSuccess: () => qc.invalidateQueries(['share-access', resourceType, resourceId]),
  });

  // Anzahl-Badge ohne open zu sein (für die Anzeige am Button)
  const { data: shareAccessQuiet = [] } = useQuery({
    queryKey: ['share-access', resourceType, resourceId],
    queryFn: () => api.get(`/friends/share/access/${resourceType}/${resourceId}`),
    enabled: !!resourceId,
  });
  const sharedCount = (open ? shareAccess : shareAccessQuiet).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Heart size={12} /> Mit Freunden geteilt
          {sharedCount > 0 && (
            <span style={{ background: '#f43f5e', color: '#fff', borderRadius: '8px', padding: '1px 7px', fontSize: '10px' }}>
              {sharedCount}
            </span>
          )}
        </p>
        <button onClick={() => setOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(244,63,94,0.1)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
          <Share2 size={12} /> {compact ? '' : (open ? 'Schließen' : 'Verwalten')}
        </button>
      </div>

      {open && (
        <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '8px', maxHeight: '180px', overflowY: 'auto' }}>
          {friendsData.accepted.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', margin: '12px 0' }}>
              Noch keine Freunde — gehe zu <Link to="/friends" style={{ color: '#fb7185' }}>Freunde</Link> um welche hinzuzufügen
            </p>
          ) : (
            friendsData.accepted.map(f => {
              const shared = shareAccess.find(s => s.user_id === f.user_id);
              const busy = shareMut.isPending || unshareMut.isPending;
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '8px' }}>
                  {f.avatar
                    ? <img src={f.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#f43f5e,#fb7185)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff' }}>{f.username[0].toUpperCase()}</div>
                  }
                  <span style={{ flex: 1, fontSize: '13px', color: '#cbd5e1' }}>{f.username}</span>
                  {shared ? (
                    <button onClick={() => unshareMut.mutate(f.user_id)} disabled={busy}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', background: 'rgba(34,197,94,0.13)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '7px', color: '#22c55e', fontSize: '11px', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                      ✓ Geteilt
                    </button>
                  ) : (
                    <button onClick={() => shareMut.mutate(f.user_id)} disabled={busy}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '7px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                      {busy ? <Loader2 size={10} className="animate-spin" /> : null} Teilen
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
