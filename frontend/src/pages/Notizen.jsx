import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Edit, ChevronRight, ChevronDown,
  FileText, Link, FolderOpen, Folder, Save, X, ExternalLink, Loader2
} from 'lucide-react';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';

const COLORS = ['#f97316','#2563eb','#16a34a','#dc2626','#d97706','#db2777','#0891b2','#7c3aed'];

/* ── Inline-Eingabe ──────────────────────────────────────────────────────── */
function InlineInput({ placeholder, onSave, onCancel, defaultValue = '' }) {
  const [val, setVal] = useState(defaultValue);
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input
        autoFocus value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) onSave(val.trim()); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder}
        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', fontSize: '13px', background: '#1e1e1e', border: '1px solid #f97316', color: '#fff', outline: 'none' }}
      />
      <button onClick={() => val.trim() && onSave(val.trim())} style={{ padding: '6px 10px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>✓</button>
      <button onClick={onCancel} style={{ padding: '6px 8px', background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: '13px' }}>✕</button>
    </div>
  );
}

/* ── Section-Zeile (einzelne Ordner-Zeile mit Hover-Buttons) ─────────────── */
function SectionRow({ s, isActive, depth, children, hasChildren, isOpen, onToggle, onSelect, onAdd, onDelete, onRename }) {
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => { onSelect(s.id); if (hasChildren) onToggle(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: `6px 8px 6px ${8 + depth * 14}px`,
          borderRadius: '10px', cursor: 'pointer',
          background: isActive ? 'rgba(249,115,22,0.15)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
          border: isActive ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent',
          transition: 'background 0.12s',
        }}
      >
        {hasChildren
          ? <button onClick={e => { e.stopPropagation(); onToggle(); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          : <span style={{ width: 12, flexShrink: 0 }} />}

        <Folder size={13} style={{ color: isActive ? '#f97316' : '#475569', flexShrink: 0 }} />

        {renaming ? (
          <InlineInput
            defaultValue={s.title}
            placeholder="Name..."
            onSave={title => { onRename(s.id, title); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? '#f97316' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.title}
            </span>

            {/* Hover-Aktionen */}
            <div style={{ display: 'flex', gap: '2px', opacity: hovered || isActive ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
              <button onClick={e => { e.stopPropagation(); setRenaming(true); }}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '3px', borderRadius: '5px' }} title="Umbenennen">
                <Edit size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); onAdd(s.id); }}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '3px', borderRadius: '5px' }} title="Unterordner">
                <FolderOpen size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(s.id, s.title); }}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '3px', borderRadius: '5px' }} title="Löschen">
                <Trash2 size={11} />
              </button>
            </div>
          </>
        )}
      </div>
      {isOpen && children}
    </div>
  );
}

/* ── Section-Baum (rekursiv) ─────────────────────────────────────────────── */
function SectionTree({ sections, activeId, onSelect, onAdd, onDelete, onRename, depth = 0 }) {
  const [openMap, setOpenMap] = useState({});
  const toggle = id => setOpenMap(m => ({ ...m, [id]: !m[id] }));
  const list = depth === 0 ? sections.filter(s => !s.parent_id) : sections;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {list.map(s => {
        const children = sections.filter(c => c.parent_id === s.id);
        return (
          <SectionRow
            key={s.id} s={s} depth={depth}
            isActive={activeId === s.id}
            hasChildren={children.length > 0}
            isOpen={!!openMap[s.id]}
            onToggle={() => toggle(s.id)}
            onSelect={onSelect}
            onAdd={onAdd}
            onDelete={onDelete}
            onRename={onRename}
          >
            {children.length > 0 && openMap[s.id] && (
              <SectionTree
                sections={children}
                activeId={activeId}
                onSelect={onSelect}
                onAdd={onAdd}
                onDelete={onDelete}
                onRename={onRename}
                depth={depth + 1}
              />
            )}
          </SectionRow>
        );
      })}
    </div>
  );
}

/* ── Item-Karte (Notiz oder Link) ────────────────────────────────────────── */
function ItemCard({ item, onDelete, onEdit }) {
  const [editing, setEditing]   = useState(false);
  const [hovered, setHovered]   = useState(false);
  const [form, setForm]         = useState({ title: item.title, content: item.content || '', url: item.url || '' });

  if (editing) {
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid #f97316', borderRadius: '14px', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titel..."
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#fff', fontSize: '14px', fontWeight: 600, outline: 'none' }} />
          {item.type === 'link'
            ? <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..."
                style={{ padding: '8px 12px', borderRadius: '8px', background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#60a5fa', fontSize: '13px', outline: 'none' }} />
            : <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Notiz schreiben..." rows={4}
                style={{ padding: '8px 12px', borderRadius: '8px', background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#e2e8f0', fontSize: '13px', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} style={{ padding: '7px 14px', background: 'transparent', color: '#64748b', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
            <button onClick={() => { onEdit(item.id, form); setEditing(false); }}
              style={{ padding: '7px 14px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={13} /> Speichern
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: '#1a1a1a', border: `1px solid ${hovered ? '#2a2a2a' : '#1e1e1e'}`, borderRadius: '14px', padding: '14px 16px', position: 'relative', transition: 'border-color 0.15s' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        {item.type === 'link'
          ? <Link size={14} style={{ color: '#60a5fa', marginTop: '2px', flexShrink: 0 }} />
          : <FileText size={14} style={{ color: '#94a3b8', marginTop: '2px', flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{item.title}</p>
            {item.author && <span style={{ fontSize: '11px', color: '#475569' }}>von {item.author}</span>}
          </div>
          {item.type === 'link' && item.url && (
            <a href={item.url} target="_blank" rel="noreferrer"
              style={{ fontSize: '13px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              {item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url}
              <ExternalLink size={11} />
            </a>
          )}
          {item.type === 'note' && item.content && (
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.content}</p>
          )}
        </div>
        {/* Aktionen — sichtbar bei Hover */}
        <div style={{ display: 'flex', gap: '4px', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
          <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', borderRadius: '6px' }} title="Bearbeiten"><Edit size={13} /></button>
          <button onClick={() => onDelete(item.id, item.title)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', borderRadius: '6px' }} title="Löschen"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

/* ── Haupt-Komponente ────────────────────────────────────────────────────── */
export default function Notizen({ groupId = null }) {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState(null);
  const [addingSection, setAddingSection]  = useState(false);
  const [addingSubOf, setAddingSubOf]      = useState(null);
  const [addingItem, setAddingItem]        = useState(null);
  const [newItemForm, setNewItemForm]      = useState({ title: '', content: '', url: '' });

  /* Bestätigungs-Dialog */
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });
  const askConfirm = (title, message, onConfirm) => setConfirm({ open: true, title, message, onConfirm });
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  const qKey = ['workspace-sections', groupId];
  const { data: sections = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => api.get('/workspace/sections' + (groupId ? `?group_id=${groupId}` : '')),
  });

  const activeData = sections.find(s => s.id === activeSection);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['workspace-items', activeSection],
    queryFn: () => api.get(`/workspace/sections/${activeSection}/items`),
    enabled: !!activeSection,
  });

  const addSection = useMutation({
    mutationFn: ({ title, parent_id }) => api.post('/workspace/sections', { title, parent_id: parent_id || null, group_id: groupId }),
    onSuccess: () => { qc.invalidateQueries(qKey); setAddingSection(false); setAddingSubOf(null); },
  });

  const delSection = useMutation({
    mutationFn: id => api.delete(`/workspace/sections/${id}`),
    onSuccess: () => { qc.invalidateQueries(qKey); setActiveSection(null); },
  });

  const renameSection = useMutation({
    mutationFn: ({ id, title }) => api.put(`/workspace/sections/${id}`, { title, color: '#f97316' }),
    onSuccess: () => qc.invalidateQueries(qKey),
  });

  const addItem = useMutation({
    mutationFn: data => api.post(`/workspace/sections/${activeSection}/items`, data),
    onSuccess: () => { qc.invalidateQueries(['workspace-items', activeSection]); setAddingItem(null); setNewItemForm({ title: '', content: '', url: '' }); },
  });

  const editItem = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/workspace/items/${id}`, data),
    onSuccess: () => qc.invalidateQueries(['workspace-items', activeSection]),
  });

  const delItem = useMutation({
    mutationFn: id => api.delete(`/workspace/items/${id}`),
    onSuccess: () => qc.invalidateQueries(['workspace-items', activeSection]),
  });

  const handleDeleteSection = (id, title) => {
    askConfirm(
      'Ordner löschen?',
      `„${title}" und alle darin enthaltenen Inhalte werden dauerhaft gelöscht.`,
      () => { delSection.mutate(id); closeConfirm(); }
    );
  };

  const handleDeleteItem = (id, title) => {
    askConfirm(
      'Eintrag löschen?',
      `„${title}" wird dauerhaft gelöscht.`,
      () => { delItem.mutate(id); closeConfirm(); }
    );
  };

  const handleAddItem = () => {
    if (!newItemForm.title.trim()) return;
    addItem.mutate({ type: addingItem, title: newItemForm.title.trim(), content: newItemForm.content, url: newItemForm.url });
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '16px', minHeight: '500px' }}>

      {/* ── Linke Sidebar ────────────────────────────────────────────────────── */}
      <div style={{ width: '220px', flexShrink: 0, background: '#111', borderRadius: '16px', border: '1px solid #1e1e1e', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Ordner</p>
          <button onClick={() => setAddingSection(true)}
            style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', borderRadius: '7px', padding: '3px 7px', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}
            title="Neuer Ordner">+</button>
        </div>

        {addingSection && (
          <InlineInput placeholder="Ordner-Name..." onSave={title => addSection.mutate({ title })} onCancel={() => setAddingSection(false)} />
        )}

        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}><Loader2 size={18} className="animate-spin text-orange-500" /></div>
          : sections.length === 0
            ? <p style={{ fontSize: '12px', color: '#334155', textAlign: 'center', padding: '20px 0' }}>Noch keine Ordner.<br />Klicke auf + um zu starten.</p>
            : (
              <SectionTree
                sections={sections}
                activeId={activeSection}
                onSelect={setActiveSection}
                onAdd={parentId => setAddingSubOf(parentId)}
                onDelete={handleDeleteSection}
                onRename={(id, title) => renameSection.mutate({ id, title })}
              />
            )
        }

        {addingSubOf && (
          <InlineInput
            placeholder="Unterordner-Name..."
            onSave={title => addSection.mutate({ title, parent_id: addingSubOf })}
            onCancel={() => setAddingSubOf(null)}
          />
        )}
      </div>

      {/* ── Rechter Inhaltsbereich ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        {!activeSection ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#334155', textAlign: 'center', gap: '12px' }}>
            <FolderOpen size={48} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '15px' }}>Wähle einen Ordner aus<br /><span style={{ fontSize: '13px', color: '#1e3a5f' }}>oder erstelle einen neuen mit +</span></p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={20} style={{ color: '#f97316' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>{activeData?.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setAddingItem('note'); setNewItemForm({ title: '', content: '', url: '' }); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#cbd5e1', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <FileText size={13} /> Notiz
                </button>
                <button onClick={() => { setAddingItem('link'); setNewItemForm({ title: '', content: '', url: '' }); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#cbd5e1', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <Link size={13} /> Link
                </button>
                <button onClick={() => setAddingSubOf(activeSection)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#cbd5e1', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <FolderOpen size={13} /> Unterordner
                </button>
              </div>
            </div>

            {/* Neues-Item-Formular */}
            {addingItem && (
              <div style={{ background: '#1a1a1a', border: '1px solid #f97316', borderRadius: '14px', padding: '16px' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {addingItem === 'note' ? <FileText size={13} /> : <Link size={13} />}
                  {addingItem === 'note' ? 'Neue Notiz' : 'Neuer Link'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input value={newItemForm.title} onChange={e => setNewItemForm(f => ({ ...f, title: e.target.value }))} placeholder="Titel..."
                    style={{ padding: '8px 12px', borderRadius: '8px', background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#fff', fontSize: '14px', fontWeight: 600, outline: 'none' }} />
                  {addingItem === 'link'
                    ? <input value={newItemForm.url} onChange={e => setNewItemForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..."
                        onKeyDown={e => { if (e.key === 'Enter') handleAddItem(); }}
                        style={{ padding: '8px 12px', borderRadius: '8px', background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#60a5fa', fontSize: '13px', outline: 'none' }} />
                    : <textarea value={newItemForm.content} onChange={e => setNewItemForm(f => ({ ...f, content: e.target.value }))} placeholder="Notiz schreiben..." rows={4}
                        style={{ padding: '8px 12px', borderRadius: '8px', background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#e2e8f0', fontSize: '13px', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setAddingItem(null)} style={{ padding: '7px 14px', background: 'transparent', color: '#64748b', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
                    <button onClick={handleAddItem} disabled={!newItemForm.title.trim() || addItem.isPending}
                      style={{ padding: '7px 14px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: !newItemForm.title.trim() ? 0.5 : 1 }}>
                      {addItem.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Item-Liste */}
            {itemsLoading
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin text-orange-500" /></div>
              : items.length === 0 && !addingItem
                ? <div style={{ textAlign: 'center', color: '#334155', padding: '60px 0' }}>
                    <p style={{ fontSize: '14px' }}>Dieser Ordner ist noch leer.</p>
                    <p style={{ fontSize: '13px', color: '#1e3a5f' }}>Füge eine Notiz oder einen Link hinzu.</p>
                  </div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map(item => (
                      <ItemCard key={item.id} item={item}
                        onDelete={handleDeleteItem}
                        onEdit={(id, data) => editItem.mutate({ id, ...data })}
                      />
                    ))}
                  </div>
            }
          </>
        )}
      </div>

      {/* Bestätigungs-Dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel="Löschen"
        danger
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
