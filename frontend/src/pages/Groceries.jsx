import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ShoppingCart, ChevronDown, ChevronUp, Euro, Calendar, Store, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';

const MERCHANTS = ['REWE', 'Aldi', 'Lidl', 'Edeka', 'Penny', 'Netto', 'Kaufland', 'dm', 'Rossmann', 'Sonstiges'];

const emptyForm  = { merchant: 'REWE', date: new Date().toISOString().split('T')[0], total_amount: '', notes: '' };
const emptyItem  = { name: '', price: '', quantity: '1' };

export default function Groceries() {
  const qc = useQueryClient();
  const [showModal,   setShowModal]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(emptyForm);
  const [items,       setItems]       = useState([]);
  const [expandedId,  setExpandedId]  = useState(null);
  const [loadedItems, setLoadedItems] = useState({});   // receiptId → items[]
  const [filterMonth, setFilterMonth] = useState('');

  /* ── Queries ── */
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['grocery'],
    queryFn: () => api.get('/grocery'),
  });
  const { data: monthly = [] } = useQuery({
    queryKey: ['grocery-monthly'],
    queryFn: () => api.get('/grocery/stats/monthly'),
  });

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: data => editing
      ? api.put(`/grocery/${editing.id}`, data)
      : api.post('/grocery', data),
    onSuccess: () => {
      qc.invalidateQueries(['grocery']);
      qc.invalidateQueries(['grocery-monthly']);
      qc.invalidateQueries(['finance-items']);
      qc.invalidateQueries(['finance-summary']);
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/grocery/${id}`),
    onSuccess: () => { qc.invalidateQueries(['grocery']); qc.invalidateQueries(['grocery-monthly']); },
  });

  const deleteItemMutation = useMutation({
    mutationFn: id => api.delete(`/grocery/items/${id}`),
    onSuccess: (_, id) => {
      setLoadedItems(prev => {
        const updated = {};
        for (const [k, list] of Object.entries(prev)) {
          updated[k] = list.filter(it => it.id !== id);
        }
        return updated;
      });
    },
  });

  /* ── Handlers ── */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setItems([]); setShowModal(true); };
  const openEdit   = r => {
    setEditing(r);
    setForm({ merchant: r.merchant, date: r.date, total_amount: String(r.total_amount), notes: r.notes || '' });
    setItems([]);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const addItem    = () => setItems(prev => [...prev, { ...emptyItem, _id: Date.now() }]);
  const removeItem = idx => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const sumItems = items.reduce((s, it) => s + (parseFloat(it.price) || 0) * (parseFloat(it.quantity) || 1), 0);

  const submit = () => {
    const payload = {
      merchant:     form.merchant,
      date:         form.date,
      total_amount: form.total_amount || sumItems,
      notes:        form.notes,
      items:        items.filter(it => it.name),
    };
    saveMutation.mutate(payload);
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!loadedItems[id]) {
      const its = await api.get(`/grocery/${id}/items`);
      setLoadedItems(prev => ({ ...prev, [id]: its }));
    }
  };

  /* ── Filter & Stats ── */
  const thisMonth = format(new Date(), 'yyyy-MM');
  const thisMonthStat = monthly.find(m => m.month === thisMonth);
  const lastMonthStat = monthly.find(m => m.month !== thisMonth);

  const filtered = filterMonth
    ? receipts.filter(r => r.date?.startsWith(filterMonth))
    : receipts;

  /* ── Render ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>Einkäufe</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Lebensmittel &amp; Belege verwalten</p>
        </div>
        <button
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} /> Einkauf
        </button>
      </div>

      {/* ── Monats-Karten ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px' }}>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Diesen Monat</p>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#f97316', margin: 0 }}>
            {(thisMonthStat?.total || 0).toFixed(2)} €
          </p>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
            {thisMonthStat?.count || 0} Einkäufe
          </p>
        </div>
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px' }}>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Letzter Monat</p>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#94a3b8', margin: 0 }}>
            {(lastMonthStat?.total || 0).toFixed(2)} €
          </p>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
            {lastMonthStat?.count || 0} Einkäufe
          </p>
        </div>
      </div>

      {/* ── Monatsfilter ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '14px', flex: 1, minWidth: '160px' }}
        />
        {filterMonth && (
          <button onClick={() => setFilterMonth('')} style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
            Alle
          </button>
        )}
      </div>

      {/* ── Belegliste ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 size={24} color="#f97316" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '48px 24px', textAlign: 'center' }}>
          <ShoppingCart size={40} color="#374151" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 500 }}>Noch keine Einkäufe</p>
          <p style={{ color: '#374151', fontSize: '13px', margin: '4px 0 16px' }}>Füge deinen ersten Einkauf hinzu</p>
          <button onClick={openCreate} style={{ padding: '8px 20px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', cursor: 'pointer' }}>
            Einkauf hinzufügen
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(r => {
            const isExpanded = expandedId === r.id;
            const its = loadedItems[r.id] || [];
            return (
              <div key={r.id} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>

                {/* Beleg-Zeile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                  {/* Händler-Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Store size={18} color="#f97316" />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>{r.merchant}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} />
                      {r.date ? format(new Date(r.date), 'd. MMM yyyy', { locale: de }) : ''}
                      {r.item_count > 0 && <span style={{ marginLeft: '6px' }}>· {r.item_count} Artikel</span>}
                    </p>
                  </div>

                  {/* Betrag */}
                  <p style={{ fontSize: '17px', fontWeight: 800, color: '#f97316', margin: 0, flexShrink: 0 }}>
                    {parseFloat(r.total_amount).toFixed(2)} €
                  </p>

                  {/* Aktionen */}
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button onClick={() => toggleExpand(r.id)} style={{ padding: '6px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', lineHeight: 0 }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => openEdit(r)} style={{ padding: '6px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', lineHeight: 0 }}>
                      <Euro size={14} />
                    </button>
                    <button onClick={() => deleteMutation.mutate(r.id)} style={{ padding: '6px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', lineHeight: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Notiz */}
                {r.notes && !isExpanded && (
                  <p style={{ fontSize: '12px', color: '#64748b', padding: '0 16px 12px', margin: 0 }}>{r.notes}</p>
                )}

                {/* Ausgeklappte Artikel */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px' }}>
                    {its.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#4b5563', textAlign: 'center', padding: '8px 0' }}>Keine Einzelposten erfasst</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {its.map(it => (
                          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                            <span style={{ flex: 1, fontSize: '13px', color: '#e2e8f0' }}>{it.name}</span>
                            {it.quantity !== 1 && (
                              <span style={{ fontSize: '12px', color: '#64748b' }}>×{it.quantity}</span>
                            )}
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', minWidth: '60px', textAlign: 'right' }}>
                              {(parseFloat(it.price) * parseFloat(it.quantity)).toFixed(2)} €
                            </span>
                            <button onClick={() => deleteItemMutation.mutate(it.id)} style={{ padding: '4px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>Summe Artikel</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f97316' }}>
                            {its.reduce((s, it) => s + parseFloat(it.price) * parseFloat(it.quantity), 0).toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    )}
                    {r.notes && (
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {r.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      <Modal open={showModal} onClose={closeModal} title={editing ? 'Einkauf bearbeiten' : 'Neuer Einkauf'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Händler */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Händler *</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {MERCHANTS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, merchant: m }))}
                  style={{
                    padding: '6px 12px', borderRadius: '10px', fontSize: '13px', border: 'none', cursor: 'pointer',
                    background: form.merchant === m ? '#f97316' : 'rgba(255,255,255,0.06)',
                    color: form.merchant === m ? '#fff' : '#94a3b8',
                    fontWeight: form.merchant === m ? 600 : 400,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              placeholder="Oder eigenen Namen eingeben..."
              value={MERCHANTS.includes(form.merchant) ? '' : form.merchant}
              onChange={e => setForm(f => ({ ...f, merchant: e.target.value || f.merchant }))}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Datum *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', padding: '10px 14px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Gesamtbetrag (€) {items.length > 0 && <span style={{ color: '#64748b' }}>oder auto</span>}
              </label>
              <input
                type="number" step="0.01" placeholder={items.length > 0 ? `${sumItems.toFixed(2)} (aus Artikeln)` : '0.00'}
                value={form.total_amount}
                onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Notizen</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ width: '100%', padding: '10px 14px', resize: 'none' }} />
          </div>

          {/* Einzelposten */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', color: '#94a3b8' }}>Einzelposten (optional)</label>
              <button type="button" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(249,115,22,0.1)', color: '#f97316', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <Plus size={12} /> Artikel
              </button>
            </div>
            {items.map((it, idx) => (
              <div key={it._id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 60px 32px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                <input
                  placeholder="Artikel Name"
                  value={it.name}
                  onChange={e => updateItem(idx, 'name', e.target.value)}
                  style={{ padding: '8px 10px' }}
                />
                <input
                  type="number" step="0.01" placeholder="Preis"
                  value={it.price}
                  onChange={e => updateItem(idx, 'price', e.target.value)}
                  style={{ padding: '8px 10px' }}
                />
                <input
                  type="number" step="0.1" placeholder="Menge" min="0.1"
                  value={it.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                  style={{ padding: '8px 10px' }}
                />
                <button type="button" onClick={() => removeItem(idx)} style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', lineHeight: 0 }}>
                  <X size={13} />
                </button>
              </div>
            ))}
            {items.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '13px', color: '#94a3b8', padding: '4px 0' }}>
                Summe: <strong style={{ color: '#f97316', marginLeft: '6px' }}>{sumItems.toFixed(2)} €</strong>
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={closeModal} style={{ padding: '9px 16px', fontSize: '14px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
              Abbrechen
            </button>
            <button
              onClick={submit}
              disabled={!form.merchant || !form.date || (!form.total_amount && sumItems === 0) || saveMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: (!form.merchant || !form.date || (!form.total_amount && sumItems === 0) || saveMutation.isPending) ? 0.5 : 1 }}
            >
              {saveMutation.isPending && <Loader2 size={14} />}
              {editing ? 'Speichern' : 'Einkauf hinzufügen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
