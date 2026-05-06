import { useQuery } from '@tanstack/react-query';
import { Sparkles, RefreshCw, Check, Zap } from 'lucide-react';
import api from '../api/client';
import useUpdate from '../stores/update';

export default function Updates() {
  const { data: versionInfo, isLoading } = useQuery({
    queryKey: ['app-version'],
    queryFn: () => api.get('/version'),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { hasUpdate, updateInfo, clearUpdate } = useUpdate();

  const isElectron = typeof window !== 'undefined' &&
    (window.navigator.userAgent.includes('Gino-Home') || !!window.__ELECTRON__);

  const handleReload = () => {
    clearUpdate();
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Titel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '12px',
          background: 'rgba(249,115,22,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Zap size={20} color="#f97316" />
        </div>
        <div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: 700 }}>Updates</h1>
          <p style={{ margin: 0, color: '#475569', fontSize: '13px' }}>Versionshistorie und Neuigkeiten</p>
        </div>
      </div>

      {/* Update-Banner wenn neues Update vorhanden */}
      {hasUpdate && (
        <div style={{
          padding: '14px 18px', borderRadius: '16px',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.3)',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        }}>
          <span className="update-dot" style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#22c55e', flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, color: '#4ade80', fontWeight: 600, fontSize: '14px' }}>
              Gino-Home {updateInfo?.version} ist verfügbar
            </p>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px' }}>
              Ein neues Update wurde auf dem Server eingespielt.
            </p>
          </div>
          <button
            onClick={handleReload}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', background: '#22c55e',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              flexShrink: 0,
            }}>
            <RefreshCw size={13} /> Jetzt aktualisieren
          </button>
        </div>
      )}

      {/* Aktuelle Version */}
      <div style={{
        background: '#161616', border: '1px solid #232323', borderRadius: '20px', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '18px 22px 14px', borderBottom: '1px solid #1e1e1e',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '10px',
            background: 'rgba(249,115,22,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Sparkles size={15} color="#f97316" />
          </div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>Aktuelle Version</span>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: '#0f0f0f',
            borderRadius: '14px', border: '1px solid #1e1e1e', gap: '12px', flexWrap: 'wrap',
          }}>
            <div>
              {isLoading
                ? <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>Lädt…</p>
                : <>
                    <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '16px' }}>
                      Gino-Home {versionInfo?.version}
                    </p>
                    <p style={{ margin: '3px 0 0', color: '#475569', fontSize: '12px' }}>
                      {versionInfo?.deployedAt
                        ? `Deployed: ${new Date(versionInfo.deployedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}`
                        : '–'}
                    </p>
                  </>
              }
            </div>
            <button
              onClick={handleReload}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', background: '#f97316',
                color: '#fff', border: 'none', borderRadius: '10px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(249,115,22,0.3)', flexShrink: 0,
              }}>
              <RefreshCw size={13} /> Seite neu laden
            </button>
          </div>

          {isElectron && (
            <div style={{
              padding: '10px 14px', background: 'rgba(249,115,22,0.06)',
              border: '1px solid rgba(249,115,22,0.2)', borderRadius: '12px',
              fontSize: '12px', color: '#94a3b8',
            }}>
              <strong style={{ color: '#f97316' }}>Desktop App:</strong>{' '}
              Neue App-Versionen erscheinen automatisch als Benachrichtigung.
            </div>
          )}
        </div>
      </div>

      {/* Changelog */}
      {!isLoading && versionInfo?.changelog?.length > 0 && (
        <div style={{
          background: '#161616', border: '1px solid #232323', borderRadius: '20px', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '18px 22px 14px', borderBottom: '1px solid #1e1e1e',
          }}>
            <span style={{ color: '#374151', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Was ist neu
            </span>
          </div>

          <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {versionInfo.changelog.map((entry, i) => (
              <div key={entry.version} style={{
                padding: '16px 18px', borderRadius: '14px',
                background: i === 0 ? 'rgba(249,115,22,0.05)' : '#0f0f0f',
                border: `1px solid ${i === 0 ? 'rgba(249,115,22,0.25)' : '#1e1e1e'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '7px',
                    background: i === 0 ? '#f97316' : '#1e1e1e',
                    color: i === 0 ? '#fff' : '#64748b',
                    fontSize: '12px', fontWeight: 700,
                  }}>v{entry.version}</span>
                  <span style={{ color: i === 0 ? '#e2e8f0' : '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                    {entry.title}
                  </span>
                  <span style={{ marginLeft: 'auto', color: '#334155', fontSize: '11px' }}>{entry.date}</span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {entry.items.map((item, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '13px', color: '#94a3b8' }}>
                      <Check size={13} style={{ color: '#f97316', flexShrink: 0, marginTop: '1px' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
