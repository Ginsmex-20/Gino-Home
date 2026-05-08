import { useNavigate } from 'react-router-dom';
import {
  Users, ShoppingCart, ReceiptText, FileText,
  KeyRound, BookOpen, User, Sparkles, LogOut, ChevronRight,
} from 'lucide-react';
import useAuth from '../stores/auth';

const SECTIONS = [
  {
    title: 'Familie & Inhalte',
    items: [
      { to: '/groups',    icon: Users,        label: 'Gruppen',   color: '#60a5fa' },
      { to: '/groceries', icon: ShoppingCart, label: 'Einkäufe',  color: '#4ade80' },
      { to: '/vertraege', icon: ReceiptText,  label: 'Verträge',  color: '#f59e0b' },
      { to: '/documents', icon: FileText,     label: 'Dokumente', color: '#a78bfa' },
      { to: '/vault',     icon: KeyRound,     label: 'Tresor',    color: '#f43f5e' },
      { to: '/notizen',   icon: BookOpen,     label: 'Notizbuch', color: '#22d3ee' },
    ],
  },
  {
    title: 'App',
    items: [
      { to: '/profile',  icon: User,     label: 'Profil',  color: '#f97316' },
      { to: '/updates',  icon: Sparkles, label: 'Updates', color: '#f97316' },
    ],
  },
];

export default function Mehr() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>

      {/* Profil-Karte oben */}
      <button
        onClick={() => navigate('/profile')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', marginBottom: 24,
          background: '#1e1e1e', border: '1px solid #2a2a2a',
          borderRadius: 16, cursor: 'pointer', textAlign: 'left',
        }}
      >
        {user?.avatar
          ? <img src={user.avatar} alt="" style={{
              width: 52, height: 52, borderRadius: '50%', objectFit: 'cover',
              border: '2px solid #f97316', flexShrink: 0,
            }} />
          : <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#f97316,#ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: '#fff',
            }}>
              {(user?.username || user?.email || 'G')[0].toUpperCase()}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
            {user?.username || 'Gast'}
          </div>
          <div style={{ color: '#64748b', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
        </div>
        <ChevronRight size={18} color="#475569" />
      </button>

      {/* Sektionen */}
      {SECTIONS.map(section => (
        <div key={section.title} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#475569',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '0 4px 8px',
          }}>
            {section.title}
          </div>
          <div style={{
            background: '#1e1e1e', border: '1px solid #2a2a2a',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {section.items.map((item, i) => (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderTop: i === 0 ? 'none' : '1px solid #2a2a2a',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${item.color}26`,
                }}>
                  <item.icon size={19} color={item.color} />
                </div>
                <span style={{ flex: 1, color: '#e2e8f0', fontSize: 15, fontWeight: 500 }}>
                  {item.label}
                </span>
                <ChevronRight size={17} color="#475569" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <button
        onClick={() => { logout(); navigate('/login'); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '14px 16px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16,
          color: '#f87171', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <LogOut size={18} />
        Abmelden
      </button>

      {/* Kleiner Footer */}
      <div style={{ textAlign: 'center', color: '#374151', fontSize: 11, marginTop: 24, paddingBottom: 16 }}>
        Gino-Home
      </div>
    </div>
  );
}
