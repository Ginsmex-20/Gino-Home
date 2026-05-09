import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Edit2, Trash2, Loader2, X,
  Phone, Wifi, Zap, Flame, Play, Shield, Home,
  BookOpen, Monitor, Activity, RefreshCw, AlertTriangle,
  CreditCard, ChevronDown, PenLine, Wallet,
} from 'lucide-react';
import { format, differenceInDays, parseISO, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import KuendigungModal from '../components/KuendigungModal';
import { StatCard, CategoryCard, PageHeader, WarningBanner, EmptyState, ShareButton } from '../components/ui';

/* ════════════════════════════════════════════════════════════════════
   KONSTANTEN
   ════════════════════════════════════════════════════════════════════ */
const CONTRACT_TYPES = [
  { value: 'mobile',     label: 'Handy',       Icon: Phone,    color: '#3b82f6' },
  { value: 'internet',   label: 'Internet',    Icon: Wifi,     color: '#06b6d4' },
  { value: 'electricity',label: 'Strom',       Icon: Zap,      color: '#eab308' },
  { value: 'gas',        label: 'Gas',         Icon: Flame,    color: '#f97316' },
  { value: 'streaming',  label: 'Streaming',   Icon: Play,     color: '#a855f7' },
  { value: 'insurance',  label: 'Versicherung',Icon: Shield,   color: '#10b981' },
  { value: 'rent',       label: 'Miete',       Icon: Home,     color: '#ef4444' },
  { value: 'magazine',   label: 'Zeitschrift', Icon: BookOpen, color: '#84cc16' },
  { value: 'software',   label: 'Software',    Icon: Monitor,  color: '#6366f1' },
  { value: 'fitness',    label: 'Fitness',     Icon: Activity, color: '#f43f5e' },
  { value: 'other',      label: 'Sonstiges',   Icon: FileText, color: '#64748b' },
];

const LOAN_TYPES = [
  { value: 'loan',        label: 'Kredit'      },
  { value: 'installment', label: 'Ratenkauf'   },
  { value: 'debt',        label: 'Schuld'      },
  { value: 'lease',       label: 'Leasing'     },
];

const BILLING_CYCLES = [
  { value: 'monthly',     label: 'Monatlich'      },
  { value: 'quarterly',   label: 'Vierteljährlich' },
  { value: 'biannual',    label: 'Halbjährlich'    },
  { value: 'yearly',      label: 'Jährlich'        },
];

const CONTRACT_STATUSES = [
  { value: 'active',    label: 'Aktiv',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  { value: 'cancelled', label: 'Gekündigt',  color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  { value: 'expired',   label: 'Abgelaufen', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  { value: 'paused',    label: 'Pausiert',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
];

const LOAN_STATUSES = [
  { value: 'active',    label: 'Aktiv',         color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { value: 'completed', label: 'Abgeschlossen', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  { value: 'overdue',   label: 'Überfällig',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
];

const cycleMonths = { monthly: 1, quarterly: 3, biannual: 6, yearly: 12 };

/* ════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════ */
function getTypeInfo(value) { return CONTRACT_TYPES.find(t => t.value === value) || CONTRACT_TYPES.at(-1); }
function getStatusInfo(value, list) { return list.find(s => s.value === value) || list[0]; }
function monthlyAmount(amount, cycle) { return amount / (cycleMonths[cycle] || 1); }
function daysUntil(d) { if (!d) return null; try { return differenceInDays(parseISO(d), new Date()); } catch { return null; } }
function fmtDate(d) { if (!d) return '—'; try { return format(parseISO(d), 'd. MMM yyyy', { locale: de }); } catch { return d; } }
function fmtMoney(n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0); }

/* ════════════════════════════════════════════════════════════════════
   FORM-INPUTS
   ════════════════════════════════════════════════════════════════════ */
const inputSt = (focused) => ({
  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
  background: '#0f0f0f', border: `1px solid ${focused ? '#f97316' : '#2a2a2a'}`,
  borderRadius: '10px', color: '#e2e8f0', fontSize: '13px', outline: 'none',
  transition: 'border-color 0.15s',
});
function SInput({ type = 'text', style = {}, ...p }) {
  const [f, setF] = useState(false);
  return <input type={type} style={{ ...inputSt(f), ...style }} onFocus={() => setF(true)} onBlur={() => setF(false)} {...p} />;
}
function SSelect({ style = {}, children, ...p }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <select style={{ ...inputSt(f), appearance: 'none', cursor: 'pointer', paddingRight: '32px', ...style }} onFocus={() => setF(true)} onBlur={() => setF(false)} {...p}>{children}</select>
      <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}
function STextarea({ style = {}, ...p }) {
  const [f, setF] = useState(false);
  return <textarea style={{ ...inputSt(f), resize: 'none', ...style }} onFocus={() => setF(true)} onBlur={() => setF(false)} {...p} />;
}
function SInputWithSuggestions({ id, suggestions = [], style = {}, ...p }) {
  const [f, setF] = useState(false);
  return (
    <div>
      <input list={id} style={{ ...inputSt(f), ...style }} onFocus={() => setF(true)} onBlur={() => setF(false)} {...p} />
      <datalist id={id}>{suggestions.map(s => <option key={s} value={s} />)}</datalist>
    </div>
  );
}
function FormRow({ label, children, half }) {
  return (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ value, list }) {
  const s = getStatusInfo(value, list);
  return <span style={{ padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: s.color, background: s.bg }}>{s.label}</span>;
}

/* ════════════════════════════════════════════════════════════════════
   VERTRAGS-KARTE
   ════════════════════════════════════════════════════════════════════ */
function ContractCard({ c, onEdit, onDelete, onKuendigung }) {
  const typeInfo = getTypeInfo(c.contract_type);
  const Icon = typeInfo.Icon;
  const monthly = monthlyAmount(c.amount, c.billing_cycle);
  const endDays = daysUntil(c.end_date);
  const cancelDays = daysUntil(c.cancel_until);
  const urgentCancel = cancelDays !== null && cancelDays <= 30 && cancelDays >= 0;
  const [hov, setHov] = useState(false);

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#141414', border: `1px solid ${hov ? typeInfo.color + '55' : '#1e1e1e'}`,
        borderRadius: '14px', padding: '14px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        transition: 'all 0.15s',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '11px', flexShrink: 0,
          background: `${typeInfo.color}1a`, border: `1px solid ${typeInfo.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={typeInfo.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.company || typeInfo.label}{c.customer_number ? ` · Kd-Nr: ${c.customer_number}` : ''}
          </p>
        </div>
        <StatusBadge value={c.status} list={CONTRACT_STATUSES} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: '#0a0a0a', borderRadius: '10px', padding: '9px 11px' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monatlich</p>
          <p style={{ margin: '3px 0 0', color: typeInfo.color, fontWeight: 700, fontSize: '15px' }}>{fmtMoney(monthly)}</p>
        </div>
        <div style={{ background: '#0a0a0a', borderRadius: '10px', padding: '9px 11px' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bis</p>
          <p style={{ margin: '3px 0 0', color: endDays !== null && endDays < 60 ? '#f59e0b' : '#e2e8f0', fontWeight: 600, fontSize: '12px' }}>{fmtDate(c.end_date)}</p>
        </div>
      </div>

      {c.cancel_until && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 11px', borderRadius: '9px',
          background: urgentCancel ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.025)',
          border: `1px solid ${urgentCancel ? 'rgba(239,68,68,0.25)' : '#1e1e1e'}`,
        }}>
          {urgentCancel && <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: '11px', color: urgentCancel ? '#f87171' : '#64748b' }}>
            Kündigung bis: <strong>{fmtDate(c.cancel_until)}</strong>
            {cancelDays !== null && cancelDays >= 0 && ` (${cancelDays}T)`}
          </span>
          {c.auto_renew ? <RefreshCw size={11} color="#64748b" title="Verlängert sich automatisch" style={{ marginLeft: 'auto' }} /> : null}
        </div>
      )}

      {/* Mit Freunden teilen */}
      <ShareButton resourceType="contract" resourceId={c.id} />

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', opacity: hov ? 1 : 0, transition: 'opacity 0.15s', flexWrap: 'wrap' }}>
        <button onClick={() => onKuendigung(c)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}>
          <PenLine size={11} /> Kündigung
        </button>
        <button onClick={() => onEdit(c)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2a', borderRadius: '7px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
          <Edit2 size={11} /> Bearbeiten
        </button>
        <button onClick={() => onDelete(c.id, c.title)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 9px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '7px', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   RATEN-KARTE
   ════════════════════════════════════════════════════════════════════ */
function LoanCard({ loan, onEdit, onDelete }) {
  const paid = loan.total_amount - (loan.remaining_amount ?? loan.total_amount);
  const pct = loan.total_amount > 0 ? Math.min(100, (paid / loan.total_amount) * 100) : 0;
  const endDays = daysUntil(loan.end_date);
  const [hov, setHov] = useState(false);
  const typeLabel = LOAN_TYPES.find(t => t.value === loan.type)?.label || 'Kredit';

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#141414', border: `1px solid ${hov ? 'rgba(96,165,250,0.4)' : '#1e1e1e'}`,
        borderRadius: '14px', padding: '14px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        transition: 'all 0.15s',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '11px', flexShrink: 0,
          background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CreditCard size={18} color="#60a5fa" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loan.title}</p>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '11px' }}>{typeLabel}{loan.lender ? ` · ${loan.lender}` : ''}</p>
        </div>
        <StatusBadge value={loan.status} list={LOAN_STATUSES} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{fmtMoney(paid)} / {fmtMoney(loan.total_amount)}</span>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: '#1e1e1e', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct >= 100 ? '#22c55e' : '#60a5fa', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {[
          { label: 'Rest',  value: fmtMoney(loan.remaining_amount), color: '#f87171' },
          { label: 'Rate',  value: fmtMoney(loan.monthly_rate),     color: '#e2e8f0' },
          { label: 'Ende',  value: fmtDate(loan.end_date),          color: endDays !== null && endDays < 60 ? '#f59e0b' : '#e2e8f0' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0a0a0a', borderRadius: '9px', padding: '7px 9px' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
            <p style={{ margin: '2px 0 0', color, fontWeight: 600, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mit Freunden teilen */}
      <ShareButton resourceType="loan" resourceId={loan.id} />

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', opacity: hov ? 1 : 0, transition: 'opacity 0.15s' }}>
        <button onClick={() => onEdit(loan)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2a', borderRadius: '7px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
          <Edit2 size={11} /> Bearbeiten
        </button>
        <button onClick={() => onDelete(loan.id, loan.title)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MODALS
   ════════════════════════════════════════════════════════════════════ */
const EMPTY_CONTRACT = { title: '', company: '', contract_type: 'other', contract_number: '', customer_number: '', purpose: '', phone_number: '', amount: '', billing_cycle: 'monthly', start_date: '', end_date: '', cancel_notice_months: 1, cancel_until: '', auto_renew: false, status: 'active', notes: '' };
const EMPTY_LOAN     = { title: '', lender: '', creditor: '', type: 'loan', total_amount: '', remaining_amount: '', monthly_rate: '', interest_rate: '', reference_number: '', customer_number: '', purpose: '', start_date: '', end_date: '', status: 'active', notes: '' };

function ContractModal({ item, onClose, onSave, loading, suggestions = {} }) {
  const [form, setForm] = useState(() => item ? { ...EMPTY_CONTRACT, ...item, auto_renew: !!item.auto_renew } : { ...EMPTY_CONTRACT });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const autoCalcCancel = () => {
    if (!form.end_date || !form.cancel_notice_months) return;
    try { set('cancel_until', format(subMonths(parseISO(form.end_date), Number(form.cancel_notice_months)), 'yyyy-MM-dd')); } catch {}
  };
  const handleSubmit = e => { e.preventDefault(); onSave(form); };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 8001, width: 'min(600px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 40px)', overflow: 'hidden',
        background: '#141414', border: '1px solid #2a2a2a', borderRadius: '18px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
          <FileText size={16} color="#f97316" style={{ marginRight: 10 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', flex: 1 }}>{item ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '4px' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '18px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormRow label="Vertragstyp">
              <SSelect value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
                {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SSelect>
            </FormRow>
            <FormRow label="Status" half>
              <SSelect value={form.status} onChange={e => set('status', e.target.value)}>
                {CONTRACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SSelect>
            </FormRow>
            <FormRow label="Bezeichnung">
              <SInput value={form.title} onChange={e => set('title', e.target.value)} required placeholder="z.B. O2 Handyvertrag" />
            </FormRow>
            <FormRow label="Anbieter" half>
              <SInput value={form.company} onChange={e => set('company', e.target.value)} placeholder="z.B. O2, Telekom" />
            </FormRow>
            <FormRow label="Kundennummer" half>
              <SInputWithSuggestions id="sug-customer-no" suggestions={suggestions.customerNumbers || []} value={form.customer_number} onChange={e => set('customer_number', e.target.value)} placeholder="Kd-Nr." />
            </FormRow>
            <FormRow label="Vertragsnummer" half>
              <SInputWithSuggestions id="sug-contract-no" suggestions={suggestions.contractNumbers || []} value={form.contract_number} onChange={e => set('contract_number', e.target.value)} placeholder="V-Nr." />
            </FormRow>
            <FormRow label="Verwendungszweck">
              <SInputWithSuggestions id="sug-purpose" suggestions={suggestions.purposes || []} value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="z.B. Privatnutzung" />
            </FormRow>
            {form.contract_type === 'mobile' && (
              <FormRow label="Handynummer" half>
                <SInput type="tel" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="+49 123 456789" />
              </FormRow>
            )}
            <FormRow label="Betrag (€)" half>
              <SInput type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
            </FormRow>
            <FormRow label="Intervall" half>
              <SSelect value={form.billing_cycle} onChange={e => set('billing_cycle', e.target.value)}>
                {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </SSelect>
            </FormRow>
            <FormRow label="Start" half>
              <SInput type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </FormRow>
            <FormRow label="Laufzeit bis" half>
              <SInput type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </FormRow>
            <FormRow label="Kündigungsfrist (Mon.)" half>
              <div style={{ display: 'flex', gap: '8px' }}>
                <SInput type="number" min="0" value={form.cancel_notice_months} onChange={e => set('cancel_notice_months', e.target.value)} style={{ flex: 1 }} />
                <button type="button" onClick={autoCalcCancel} style={{ padding: '8px 11px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '9px', color: '#f97316', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>Auto</button>
              </div>
            </FormRow>
            <FormRow label="Kündigung bis" half>
              <SInput type="date" value={form.cancel_until} onChange={e => set('cancel_until', e.target.value)} />
            </FormRow>
            <FormRow label="">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={form.auto_renew} onChange={e => set('auto_renew', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer' }} />
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Verlängert sich automatisch</span>
              </label>
            </FormRow>
            <FormRow label="Notizen">
              <STextarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Weitere Infos..." />
            </FormRow>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '18px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 16px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '11px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
            <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#f97316', border: 'none', borderRadius: '11px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              {item ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function LoanModal({ item, onClose, onSave, loading }) {
  const [form, setForm] = useState(() => item ? { ...EMPTY_LOAN, ...item } : { ...EMPTY_LOAN });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); onSave(form); };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 8001, width: 'min(600px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 40px)', overflow: 'hidden',
        background: '#141414', border: '1px solid #2a2a2a', borderRadius: '18px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
          <CreditCard size={16} color="#60a5fa" style={{ marginRight: 10 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', flex: 1 }}>{item ? 'Ratenzahlung bearbeiten' : 'Neue Ratenzahlung'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '4px' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '18px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormRow label="Typ" half><SSelect value={form.type} onChange={e => set('type', e.target.value)}>{LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</SSelect></FormRow>
            <FormRow label="Status" half><SSelect value={form.status} onChange={e => set('status', e.target.value)}>{LOAN_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</SSelect></FormRow>
            <FormRow label="Bezeichnung"><SInput value={form.title} onChange={e => set('title', e.target.value)} required placeholder="z.B. iPhone Ratenkauf" /></FormRow>
            <FormRow label="Kreditgeber" half><SInput value={form.lender} onChange={e => set('lender', e.target.value)} placeholder="z.B. Bank, Saturn" /></FormRow>
            <FormRow label="Schuldner" half><SInput value={form.creditor} onChange={e => set('creditor', e.target.value)} placeholder="Name" /></FormRow>
            <FormRow label="Kundennummer" half><SInput value={form.customer_number} onChange={e => set('customer_number', e.target.value)} placeholder="Kd-Nr." /></FormRow>
            <FormRow label="Referenz-Nr." half><SInput value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="Ref-Nr." /></FormRow>
            <FormRow label="Verwendungszweck"><SInput value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="z.B. Handykauf" /></FormRow>
            <FormRow label="Gesamtbetrag (€)" half><SInput type="number" step="0.01" min="0" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} required placeholder="0.00" /></FormRow>
            <FormRow label="Restschuld (€)" half><SInput type="number" step="0.01" min="0" value={form.remaining_amount} onChange={e => set('remaining_amount', e.target.value)} placeholder="0.00" /></FormRow>
            <FormRow label="Monatliche Rate (€)" half><SInput type="number" step="0.01" min="0" value={form.monthly_rate} onChange={e => set('monthly_rate', e.target.value)} placeholder="0.00" /></FormRow>
            <FormRow label="Zins (%)" half><SInput type="number" step="0.01" min="0" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="0.00" /></FormRow>
            <FormRow label="Startdatum" half><SInput type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></FormRow>
            <FormRow label="Letzte Rate" half><SInput type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></FormRow>
            <FormRow label="Notizen"><STextarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Weitere Infos..." /></FormRow>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '18px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 16px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '11px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>Abbrechen</button>
            <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#60a5fa', border: 'none', borderRadius: '11px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              {item ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HAUPTSEITE
   ════════════════════════════════════════════════════════════════════ */
export default function Vertraege() {
  const qc = useQueryClient();
  const [tab, setTab]               = useState('contracts');
  const [statusFilter, setFilter]   = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal]           = useState(null);
  const [confirm, setConfirm]       = useState({ open: false, id: null, title: '', type: '' });
  const [kuendigungContract, setKuendigungContract] = useState(null);

  const { data: contracts = [], isLoading: cLoading } = useQuery({ queryKey: ['contracts'], queryFn: () => api.get('/finance/contracts') });
  const { data: loans     = [], isLoading: lLoading } = useQuery({ queryKey: ['loans'],     queryFn: () => api.get('/finance/loans')     });

  const saveContract = useMutation({ mutationFn: d => d.id ? api.put(`/finance/contracts/${d.id}`, d) : api.post('/finance/contracts', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); qc.invalidateQueries({ queryKey: ['finance-summary'] }); setModal(null); } });
  const delContract  = useMutation({ mutationFn: id => api.delete(`/finance/contracts/${id}`),                       onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); qc.invalidateQueries({ queryKey: ['finance-summary'] }); setConfirm(c => ({ ...c, open: false })); } });
  const saveLoan     = useMutation({ mutationFn: d => d.id ? api.put(`/finance/loans/${d.id}`, d) : api.post('/finance/loans', d),         onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] });     qc.invalidateQueries({ queryKey: ['finance-summary'] }); setModal(null); } });
  const delLoan      = useMutation({ mutationFn: id => api.delete(`/finance/loans/${id}`),                           onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] });     qc.invalidateQueries({ queryKey: ['finance-summary'] }); setConfirm(c => ({ ...c, open: false })); } });

  const suggestions = useMemo(() => ({
    customerNumbers: [...new Set(contracts.map(c => c.customer_number).filter(Boolean))],
    contractNumbers: [...new Set(contracts.map(c => c.contract_number).filter(Boolean))],
    purposes:        [...new Set(contracts.map(c => c.purpose).filter(Boolean))],
  }), [contracts]);

  const typeCounts = useMemo(() => {
    const m = {};
    for (const t of CONTRACT_TYPES) m[t.value] = 0;
    for (const c of contracts) m[c.contract_type] = (m[c.contract_type] || 0) + 1;
    return m;
  }, [contracts]);

  const filteredContracts = useMemo(() => contracts
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => !typeFilter || c.contract_type === typeFilter), [contracts, statusFilter, typeFilter]);

  const filteredLoans = useMemo(() => loans.filter(l => statusFilter === 'all' || l.status === statusFilter), [loans, statusFilter]);

  const openDelete = (id, title, type) => setConfirm({ open: true, id, title, type });
  const confirmDelete = () => { confirm.type === 'contract' ? delContract.mutate(confirm.id) : delLoan.mutate(confirm.id); };

  const activeContracts  = contracts.filter(c => c.status === 'active');
  const activeLoans      = loans.filter(l => l.status === 'active');
  const monthlyContracts = activeContracts.reduce((s, c) => s + monthlyAmount(Number(c.amount) || 0, c.billing_cycle), 0);
  const monthlyLoans     = activeLoans.reduce((s, l) => s + (Number(l.monthly_rate) || 0), 0);
  const totalRest        = activeLoans.reduce((s, l) => s + (Number(l.remaining_amount) || 0), 0);
  const urgentContracts  = contracts.filter(c => { const d = daysUntil(c.cancel_until); return d !== null && d >= 0 && d <= 30; });

  const isLoading = tab === 'contracts' ? cLoading : lLoading;

  return (
    <div className="space-y-5">
      {/* ═══ Kopfzeile ═══ */}
      <PageHeader
        icon={Wallet}
        title="Verträge & Raten"
        subtitle="Laufende Verträge und Ratenzahlungen im Überblick"
        action={
          <button onClick={() => setModal({ type: tab === 'contracts' ? 'contract' : 'loan', item: null })}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-orange-500/20">
            <Plus size={16} /> {tab === 'contracts' ? 'Vertrag' : 'Ratenzahlung'}
          </button>
        }
      />

      {/* ═══ Stats ═══ */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <StatCard icon={FileText}    label="Verträge/Monat" value={fmtMoney(monthlyContracts)} color="#f97316" hint={`${activeContracts.length} aktiv`} />
        <StatCard icon={CreditCard}  label="Raten/Monat"    value={fmtMoney(monthlyLoans)}     color="#60a5fa" hint={`${activeLoans.length} laufend`} />
        <StatCard icon={Wallet}      label="Restschuld"     value={fmtMoney(totalRest)}        color="#f43f5e" />
        <StatCard icon={AlertTriangle} label="Bald zu kündigen" value={urgentContracts.length} color="#ef4444"
          onClick={() => urgentContracts.length > 0 && setFilter('active')} />
      </div>

      {/* ═══ Warnung ═══ */}
      {urgentContracts.length > 0 && (
        <WarningBanner icon={AlertTriangle} severity="critical">
          <strong style={{ color: '#ef4444' }}>{urgentContracts.length} Vertrag{urgentContracts.length !== 1 ? 'e' : ''}</strong>
          <span> müssen in den nächsten 30 Tagen gekündigt werden: </span>
          <span style={{ color: '#94a3b8' }}>{urgentContracts.map(c => c.title).join(', ')}</span>
        </WarningBanner>
      )}

      {/* ═══ Tabs ═══ */}
      <div style={{ display: 'flex', gap: '4px', background: '#141414', borderRadius: '12px', padding: '4px', border: '1px solid #1e1e1e', width: 'fit-content' }}>
        {[
          { key: 'contracts', label: 'Verträge',       count: contracts.length },
          { key: 'loans',     label: 'Ratenzahlungen', count: loans.length     },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => { setTab(key); setFilter('all'); setTypeFilter(''); }} style={{
            padding: '7px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: 500,
            background: tab === key ? '#f97316' : 'transparent',
            color: tab === key ? '#fff' : '#64748b',
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {label}
            <span style={{ fontSize: '11px', background: tab === key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1px 6px' }}>{count}</span>
          </button>
        ))}
      </div>

      {/* ═══ Vertragstypen-Cards (nur Verträge) ═══ */}
      {tab === 'contracts' && (
        <div>
          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Vertragsart</p>
          <div className="tab-scroll" style={{ gap: '8px' }}>
            <CategoryCard icon={FileText} label="Alle" color="#f97316" count={contracts.length}
              active={!typeFilter} onClick={() => setTypeFilter('')} />
            {CONTRACT_TYPES.filter(t => typeCounts[t.value] > 0 || typeFilter === t.value).map(t => (
              <CategoryCard key={t.value} icon={t.Icon} label={t.label} color={t.color}
                count={typeCounts[t.value] || 0} active={typeFilter === t.value}
                onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Status-Filter ═══ */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>Status:</span>
        {['all', ...(tab === 'contracts' ? CONTRACT_STATUSES : LOAN_STATUSES).map(s => s.value)].map(v => {
          const info = (tab === 'contracts' ? CONTRACT_STATUSES : LOAN_STATUSES).find(s => s.value === v);
          return (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding: '5px 11px', borderRadius: '8px', fontSize: '11px', fontWeight: 500,
              background: statusFilter === v ? (info?.bg || 'rgba(249,115,22,0.12)') : 'transparent',
              color: statusFilter === v ? (info?.color || '#f97316') : '#475569',
              border: `1px solid ${statusFilter === v ? (info?.color || '#f97316') + '40' : '#1e1e1e'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {v === 'all' ? 'Alle' : info?.label}
            </button>
          );
        })}
      </div>

      {/* ═══ Liste ═══ */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Loader2 size={28} color="#f97316" className="animate-spin" /></div>
      ) : tab === 'contracts' ? (
        filteredContracts.length === 0 ? (
          <EmptyState icon={FileText} title="Keine Verträge"
            message={typeFilter ? 'Keine Verträge in dieser Art' : 'Lege deinen ersten Vertrag an'}
            actionLabel="Vertrag anlegen" onAction={() => setModal({ type: 'contract', item: null })} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
            {filteredContracts.map(c => (
              <ContractCard key={c.id} c={c}
                onEdit={item => setModal({ type: 'contract', item })}
                onDelete={(id, title) => openDelete(id, title, 'contract')}
                onKuendigung={setKuendigungContract} />
            ))}
          </div>
        )
      ) : (
        filteredLoans.length === 0 ? (
          <EmptyState icon={CreditCard} title="Keine Ratenzahlungen"
            message="Lege deine erste Ratenzahlung an" actionLabel="Ratenzahlung anlegen"
            onAction={() => setModal({ type: 'loan', item: null })} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
            {filteredLoans.map(l => (
              <LoanCard key={l.id} loan={l}
                onEdit={item => setModal({ type: 'loan', item })}
                onDelete={(id, title) => openDelete(id, title, 'loan')} />
            ))}
          </div>
        )
      )}

      {/* ═══ Modals ═══ */}
      {modal?.type === 'contract' && (<ContractModal item={modal.item} onClose={() => setModal(null)} onSave={d => saveContract.mutate(d)} loading={saveContract.isPending} suggestions={suggestions} />)}
      {modal?.type === 'loan' && (<LoanModal item={modal.item} onClose={() => setModal(null)} onSave={d => saveLoan.mutate(d)} loading={saveLoan.isPending} />)}
      {kuendigungContract && (<KuendigungModal contract={kuendigungContract} onClose={() => setKuendigungContract(null)} />)}
      <ConfirmDialog open={confirm.open} title={`${confirm.type === 'contract' ? 'Vertrag' : 'Ratenzahlung'} löschen?`}
        message={`„${confirm.title}" wird dauerhaft gelöscht.`} confirmLabel="Löschen" danger
        onConfirm={confirmDelete} onCancel={() => setConfirm(c => ({ ...c, open: false }))} />
    </div>
  );
}
