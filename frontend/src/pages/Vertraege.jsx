import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Edit2, Trash2, Loader2, X,
  Phone, Wifi, Zap, Flame, Play, Shield, Home,
  BookOpen, Monitor, Activity, RefreshCw, AlertTriangle,
  CreditCard, ChevronDown, PenLine,
} from 'lucide-react';
import { format, differenceInDays, parseISO, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import KuendigungModal from '../components/KuendigungModal';

/* ── Konstanten ─────────────────────────────────────────────────────── */
const CONTRACT_TYPES = [
  { value: 'mobile',     label: 'Handy / Mobilfunk', Icon: Phone    },
  { value: 'internet',   label: 'Internet / DSL',     Icon: Wifi     },
  { value: 'electricity',label: 'Strom',              Icon: Zap      },
  { value: 'gas',        label: 'Gas / Heizung',      Icon: Flame    },
  { value: 'streaming',  label: 'Streaming / Abo',    Icon: Play     },
  { value: 'insurance',  label: 'Versicherung',       Icon: Shield   },
  { value: 'rent',       label: 'Miete / Wohnen',     Icon: Home     },
  { value: 'magazine',   label: 'Zeitschrift',        Icon: BookOpen },
  { value: 'software',   label: 'Software / SaaS',    Icon: Monitor  },
  { value: 'fitness',    label: 'Fitness',            Icon: Activity },
  { value: 'other',      label: 'Sonstiges',          Icon: FileText },
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
  { value: 'active',    label: 'Aktiv',       color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { value: 'completed', label: 'Abgeschlossen',color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  { value: 'overdue',   label: 'Überfällig',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
];

const cycleMonths = { monthly: 1, quarterly: 3, biannual: 6, yearly: 12 };

/* ── Hilfsfunktionen ────────────────────────────────────────────────── */
function getTypeInfo(value) {
  return CONTRACT_TYPES.find(t => t.value === value) || CONTRACT_TYPES.at(-1);
}

function getStatusInfo(value, list) {
  return list.find(s => s.value === value) || list[0];
}

function monthlyAmount(amount, cycle) {
  const m = cycleMonths[cycle] || 1;
  return amount / m;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  try { return differenceInDays(parseISO(dateStr), new Date()); } catch { return null; }
}

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd. MMM yyyy', { locale: de }); } catch { return d; }
}

function fmtMoney(n) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

/* ── Shared styled components ───────────────────────────────────────── */
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
      <select style={{ ...inputSt(f), appearance: 'none', cursor: 'pointer', paddingRight: '32px', ...style }}
        onFocus={() => setF(true)} onBlur={() => setF(false)} {...p}>
        {children}
      </select>
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
      <datalist id={id}>
        {suggestions.map(s => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}

function FormRow({ label, children, half }) {
  return (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Status-Badge ───────────────────────────────────────────────────── */
function StatusBadge({ value, list }) {
  const s = getStatusInfo(value, list);
  return (
    <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

/* ── Vertrag-Karte ──────────────────────────────────────────────────── */
function ContractCard({ c, onEdit, onDelete, onKuendigung }) {
  const { Icon } = getTypeInfo(c.contract_type);
  const monthly = monthlyAmount(c.amount, c.billing_cycle);
  const endDays = daysUntil(c.end_date);
  const cancelDays = daysUntil(c.cancel_until);
  const urgentCancel = cancelDays !== null && cancelDays <= 30 && cancelDays >= 0;
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#161616', border: '1px solid #232323', borderRadius: '18px',
        padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        borderColor: hov ? '#333' : '#232323',
        boxShadow: hov ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
          background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color="#f97316" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.title}
          </p>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.company || '—'}{c.customer_number ? ` · Kd-Nr: ${c.customer_number}` : ''}
          </p>
        </div>
        <StatusBadge value={c.status} list={CONTRACT_STATUSES} />
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: '#0f0f0f', borderRadius: '10px', padding: '10px 12px' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monatlich</p>
          <p style={{ margin: '3px 0 0', color: '#f97316', fontWeight: 700, fontSize: '16px' }}>{fmtMoney(monthly)}</p>
        </div>
        <div style={{ background: '#0f0f0f', borderRadius: '10px', padding: '10px 12px' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Laufzeit bis</p>
          <p style={{ margin: '3px 0 0', color: endDays !== null && endDays < 60 ? '#f59e0b' : '#e2e8f0', fontWeight: 600, fontSize: '13px' }}>
            {fmtDate(c.end_date)}
          </p>
        </div>
      </div>

      {/* Cancellation warning */}
      {c.cancel_until && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
          borderRadius: '10px',
          background: urgentCancel ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${urgentCancel ? 'rgba(239,68,68,0.25)' : '#1e1e1e'}`,
        }}>
          {urgentCancel && <AlertTriangle size={13} color="#ef4444" style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: '12px', color: urgentCancel ? '#f87171' : '#64748b' }}>
            Kündigung bis: <strong>{fmtDate(c.cancel_until)}</strong>
            {cancelDays !== null && cancelDays >= 0 && ` (noch ${cancelDays} Tage)`}
          </span>
          {c.auto_renew ? <RefreshCw size={12} color="#64748b" title="Verlängert sich automatisch" style={{ marginLeft: 'auto' }} /> : null}
        </div>
      )}

      {/* Additional info */}
      {(c.contract_number || c.purpose) && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {c.contract_number && (
            <span style={{ fontSize: '11px', color: '#475569' }}>
              <span style={{ color: '#374151' }}>Vertrags-Nr:</span> {c.contract_number}
            </span>
          )}
          {c.purpose && (
            <span style={{ fontSize: '11px', color: '#475569' }}>
              <span style={{ color: '#374151' }}>Zweck:</span> {c.purpose}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', opacity: hov ? 1 : 0, transition: 'opacity 0.15s', flexWrap: 'wrap' }}>
        <button onClick={() => onKuendigung(c)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
          <PenLine size={12} /> Kündigung
        </button>
        <button onClick={() => onEdit(c)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>
          <Edit2 size={12} /> Bearbeiten
        </button>
        <button onClick={() => onDelete(c.id, c.title)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

/* ── Raten-Karte ────────────────────────────────────────────────────── */
function LoanCard({ loan, onEdit, onDelete }) {
  const paid = loan.total_amount - (loan.remaining_amount ?? loan.total_amount);
  const pct = loan.total_amount > 0 ? Math.min(100, (paid / loan.total_amount) * 100) : 0;
  const endDays = daysUntil(loan.end_date);
  const [hov, setHov] = useState(false);
  const typeLabel = LOAN_TYPES.find(t => t.value === loan.type)?.label || 'Kredit';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#161616', border: '1px solid #232323', borderRadius: '18px',
        padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        borderColor: hov ? '#333' : '#232323',
        boxShadow: hov ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
          background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CreditCard size={18} color="#60a5fa" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {loan.title}
          </p>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px' }}>
            {typeLabel}{loan.lender ? ` · ${loan.lender}` : ''}
          </p>
        </div>
        <StatusBadge value={loan.status} list={LOAN_STATUSES} />
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Bezahlt: {fmtMoney(paid)}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{pct.toFixed(0)}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: '#1e1e1e', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct >= 100 ? '#22c55e' : '#60a5fa', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { label: 'Restschuld', value: fmtMoney(loan.remaining_amount), color: '#f87171' },
          { label: 'Rate/Monat', value: fmtMoney(loan.monthly_rate),     color: '#e2e8f0' },
          { label: 'Letzte Rate', value: fmtDate(loan.end_date),          color: endDays !== null && endDays < 60 ? '#f59e0b' : '#e2e8f0' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0f0f0f', borderRadius: '10px', padding: '8px 10px' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
            <p style={{ margin: '3px 0 0', color, fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Meta */}
      {(loan.reference_number || loan.customer_number || loan.purpose || loan.interest_rate) && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {loan.interest_rate > 0   && <span style={{ fontSize: '11px', color: '#475569' }}><span style={{ color: '#374151' }}>Zins:</span> {loan.interest_rate}%</span>}
          {loan.reference_number    && <span style={{ fontSize: '11px', color: '#475569' }}><span style={{ color: '#374151' }}>Ref:</span> {loan.reference_number}</span>}
          {loan.customer_number     && <span style={{ fontSize: '11px', color: '#475569' }}><span style={{ color: '#374151' }}>Kd-Nr:</span> {loan.customer_number}</span>}
          {loan.purpose             && <span style={{ fontSize: '11px', color: '#475569' }}><span style={{ color: '#374151' }}>Zweck:</span> {loan.purpose}</span>}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', opacity: hov ? 1 : 0, transition: 'opacity 0.15s' }}>
        <button onClick={() => onEdit(loan)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>
          <Edit2 size={12} /> Bearbeiten
        </button>
        <button onClick={() => onDelete(loan.id, loan.title)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

/* ── Vertrag-Modal ──────────────────────────────────────────────────── */
const EMPTY_CONTRACT = { title: '', company: '', contract_type: 'other', contract_number: '', customer_number: '', purpose: '', phone_number: '', amount: '', billing_cycle: 'monthly', start_date: '', end_date: '', cancel_notice_months: 1, cancel_until: '', auto_renew: false, status: 'active', notes: '' };
const EMPTY_LOAN     = { title: '', lender: '', creditor: '', type: 'loan', total_amount: '', remaining_amount: '', monthly_rate: '', interest_rate: '', reference_number: '', customer_number: '', purpose: '', start_date: '', end_date: '', status: 'active', notes: '' };

function ContractModal({ item, onClose, onSave, loading, suggestions = {} }) {
  const [form, setForm] = useState(() => item ? { ...EMPTY_CONTRACT, ...item, auto_renew: !!item.auto_renew } : { ...EMPTY_CONTRACT });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-berechne Kündigungsdatum wenn end_date + cancel_notice_months bekannt
  const autoCalcCancel = () => {
    if (!form.end_date || !form.cancel_notice_months) return;
    try {
      const cancelDate = subMonths(parseISO(form.end_date), Number(form.cancel_notice_months));
      set('cancel_until', format(cancelDate, 'yyyy-MM-dd'));
    } catch {}
  };

  const handleSubmit = e => { e.preventDefault(); onSave(form); };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 8001, width: 'min(600px, calc(100vw - 24px))',
        maxHeight: 'calc(100dvh - 40px)', overflow: 'hidden',
        background: '#161616', border: '1px solid #2a2a2a', borderRadius: '22px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
        animation: 'dialogIn 0.18s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
          <FileText size={16} color="#f97316" style={{ marginRight: 10 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', flex: 1 }}>
            {item ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '20px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

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

            <FormRow label="Bezeichnung / Titel">
              <SInput value={form.title} onChange={e => set('title', e.target.value)} required placeholder="z.B. O2 Handyvertrag" />
            </FormRow>

            <FormRow label="Unternehmen / Anbieter" half>
              <SInput value={form.company} onChange={e => set('company', e.target.value)} placeholder="z.B. O2, Telekom" />
            </FormRow>

            <FormRow label="Kundennummer" half>
              <SInputWithSuggestions
                id="sug-customer-no"
                suggestions={suggestions.customerNumbers || []}
                value={form.customer_number}
                onChange={e => set('customer_number', e.target.value)}
                placeholder="Kundennr."
              />
            </FormRow>

            <FormRow label="Vertragsnummer" half>
              <SInputWithSuggestions
                id="sug-contract-no"
                suggestions={suggestions.contractNumbers || []}
                value={form.contract_number}
                onChange={e => set('contract_number', e.target.value)}
                placeholder="Vertragsnr."
              />
            </FormRow>

            <FormRow label="Verwendungszweck">
              <SInputWithSuggestions
                id="sug-purpose"
                suggestions={suggestions.purposes || []}
                value={form.purpose}
                onChange={e => set('purpose', e.target.value)}
                placeholder="z.B. Privatnutzung"
              />
            </FormRow>

            {/* Handynummer — nur für Mobilfunk */}
            {form.contract_type === 'mobile' && (
              <FormRow label="Handynummer" half>
                <SInput
                  type="tel"
                  value={form.phone_number}
                  onChange={e => set('phone_number', e.target.value)}
                  placeholder="+49 123 456789"
                />
              </FormRow>
            )}

            <FormRow label="Betrag (€)" half>
              <SInput type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
            </FormRow>

            <FormRow label="Abrechnungsintervall" half>
              <SSelect value={form.billing_cycle} onChange={e => set('billing_cycle', e.target.value)}>
                {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </SSelect>
            </FormRow>

            <FormRow label="Startdatum" half>
              <SInput type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </FormRow>

            <FormRow label="Laufzeit bis" half>
              <SInput type="date" value={form.end_date} onChange={e => { set('end_date', e.target.value); }} />
            </FormRow>

            <FormRow label="Kündigungsfrist (Monate)" half>
              <div style={{ display: 'flex', gap: '8px' }}>
                <SInput type="number" min="0" value={form.cancel_notice_months} onChange={e => set('cancel_notice_months', e.target.value)} style={{ flex: 1 }} />
                <button type="button" onClick={autoCalcCancel} style={{ padding: '9px 12px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '10px', color: '#f97316', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  Auto
                </button>
              </div>
            </FormRow>

            <FormRow label="Kündigung bis" half>
              <SInput type="date" value={form.cancel_until} onChange={e => set('cancel_until', e.target.value)} />
            </FormRow>

            <FormRow label="">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={form.auto_renew} onChange={e => set('auto_renew', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer' }} />
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Verlängert sich automatisch</span>
              </label>
            </FormRow>

            <FormRow label="Notizen">
              <STextarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Weitere Infos..." />
            </FormRow>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>
              Abbrechen
            </button>
            <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#f97316', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {item ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ── Raten-Modal ────────────────────────────────────────────────────── */
function LoanModal({ item, onClose, onSave, loading }) {
  const [form, setForm] = useState(() => item ? { ...EMPTY_LOAN, ...item } : { ...EMPTY_LOAN });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); onSave(form); };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 8001, width: 'min(600px, calc(100vw - 24px))',
        maxHeight: 'calc(100dvh - 40px)', overflow: 'hidden',
        background: '#161616', border: '1px solid #2a2a2a', borderRadius: '22px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
        animation: 'dialogIn 0.18s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
          <CreditCard size={16} color="#60a5fa" style={{ marginRight: 10 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', flex: 1 }}>
            {item ? 'Ratenzahlung bearbeiten' : 'Neue Ratenzahlung'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '20px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

            <FormRow label="Typ" half>
              <SSelect value={form.type} onChange={e => set('type', e.target.value)}>
                {LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SSelect>
            </FormRow>

            <FormRow label="Status" half>
              <SSelect value={form.status} onChange={e => set('status', e.target.value)}>
                {LOAN_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SSelect>
            </FormRow>

            <FormRow label="Bezeichnung">
              <SInput value={form.title} onChange={e => set('title', e.target.value)} required placeholder="z.B. iPhone Ratenkauf" />
            </FormRow>

            <FormRow label="Kreditgeber / Anbieter" half>
              <SInput value={form.lender} onChange={e => set('lender', e.target.value)} placeholder="z.B. Bank, Saturn" />
            </FormRow>

            <FormRow label="Schuldner / Kreditnehmer" half>
              <SInput value={form.creditor} onChange={e => set('creditor', e.target.value)} placeholder="Name" />
            </FormRow>

            <FormRow label="Kundennummer" half>
              <SInput value={form.customer_number} onChange={e => set('customer_number', e.target.value)} placeholder="Kd-Nr." />
            </FormRow>

            <FormRow label="Referenz- / Vertragsnummer" half>
              <SInput value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="Ref-Nr." />
            </FormRow>

            <FormRow label="Verwendungszweck">
              <SInput value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="z.B. Handykauf" />
            </FormRow>

            <FormRow label="Gesamtbetrag (€)" half>
              <SInput type="number" step="0.01" min="0" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} required placeholder="0.00" />
            </FormRow>

            <FormRow label="Restschuld (€)" half>
              <SInput type="number" step="0.01" min="0" value={form.remaining_amount} onChange={e => set('remaining_amount', e.target.value)} placeholder="0.00" />
            </FormRow>

            <FormRow label="Monatliche Rate (€)" half>
              <SInput type="number" step="0.01" min="0" value={form.monthly_rate} onChange={e => set('monthly_rate', e.target.value)} placeholder="0.00" />
            </FormRow>

            <FormRow label="Zinssatz (%)" half>
              <SInput type="number" step="0.01" min="0" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="0.00" />
            </FormRow>

            <FormRow label="Startdatum" half>
              <SInput type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </FormRow>

            <FormRow label="Letzte Rate / Ende" half>
              <SInput type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </FormRow>

            <FormRow label="Notizen">
              <STextarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Weitere Infos..." />
            </FormRow>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>
              Abbrechen
            </button>
            <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#60a5fa', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {item ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ── Haupt-Seite ────────────────────────────────────────────────────── */
export default function Vertraege() {
  const qc = useQueryClient();
  const [tab, setTab]               = useState('contracts');
  const [statusFilter, setFilter]   = useState('all');
  const [modal, setModal]           = useState(null);   // null | { type: 'contract'|'loan', item: obj|null }
  const [confirm, setConfirm]       = useState({ open: false, id: null, title: '', type: '' });
  const [kuendigungContract, setKuendigungContract] = useState(null);

  /* Queries */
  const { data: contracts = [], isLoading: cLoading } = useQuery({ queryKey: ['contracts'], queryFn: () => api.get('/finance/contracts') });
  const { data: loans     = [], isLoading: lLoading } = useQuery({ queryKey: ['loans'],     queryFn: () => api.get('/finance/loans')     });

  /* Mutations */
  const saveContract = useMutation({
    mutationFn: d => d.id ? api.put(`/finance/contracts/${d.id}`, d) : api.post('/finance/contracts', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); qc.invalidateQueries({ queryKey: ['finance-summary'] }); setModal(null); },
  });
  const delContract = useMutation({
    mutationFn: id => api.delete(`/finance/contracts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); qc.invalidateQueries({ queryKey: ['finance-summary'] }); setConfirm(c => ({ ...c, open: false })); },
  });
  const saveLoan = useMutation({
    mutationFn: d => d.id ? api.put(`/finance/loans/${d.id}`, d) : api.post('/finance/loans', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['finance-summary'] }); setModal(null); },
  });
  const delLoan = useMutation({
    mutationFn: id => api.delete(`/finance/loans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['finance-summary'] }); setConfirm(c => ({ ...c, open: false })); },
  });

  /* Autocomplete suggestions from existing contracts */
  const suggestions = useMemo(() => ({
    customerNumbers: [...new Set(contracts.map(c => c.customer_number).filter(Boolean))],
    contractNumbers: [...new Set(contracts.map(c => c.contract_number).filter(Boolean))],
    purposes:        [...new Set(contracts.map(c => c.purpose).filter(Boolean))],
    companies:       [...new Set(contracts.map(c => c.company).filter(Boolean))],
  }), [contracts]);

  /* Filtered lists */
  const filteredContracts = useMemo(() =>
    statusFilter === 'all' ? contracts : contracts.filter(c => c.status === statusFilter),
    [contracts, statusFilter]);

  const filteredLoans = useMemo(() =>
    statusFilter === 'all' ? loans : loans.filter(l => l.status === statusFilter),
    [loans, statusFilter]);

  /* Handlers */
  const openDelete = (id, title, type) => setConfirm({ open: true, id, title, type });
  const confirmDelete = () => {
    if (confirm.type === 'contract') delContract.mutate(confirm.id);
    else delLoan.mutate(confirm.id);
  };

  /* Summary stats */
  const activeContracts = contracts.filter(c => c.status === 'active');
  const activeLoans     = loans.filter(l => l.status === 'active');
  const monthlyContracts = activeContracts.reduce((s, c) => s + monthlyAmount(Number(c.amount) || 0, c.billing_cycle), 0);
  const monthlyLoans     = activeLoans.reduce((s, l) => s + (Number(l.monthly_rate) || 0), 0);
  const urgentContracts  = contracts.filter(c => { const d = daysUntil(c.cancel_until); return d !== null && d >= 0 && d <= 30; });

  const isLoading = tab === 'contracts' ? cLoading : lLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>

      {/* ── Summary bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div style={{ background: '#161616', border: '1px solid #232323', borderRadius: '16px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: '11px', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={17} color="#f97316" />
          </div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verträge/Monat</p>
            <p style={{ margin: '2px 0 0', color: '#f97316', fontWeight: 700, fontSize: '18px' }}>{fmtMoney(monthlyContracts)}</p>
          </div>
        </div>
        <div style={{ background: '#161616', border: '1px solid #232323', borderRadius: '16px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: '11px', background: 'rgba(96,165,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={17} color="#60a5fa" />
          </div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Raten/Monat</p>
            <p style={{ margin: '2px 0 0', color: '#60a5fa', fontWeight: 700, fontSize: '18px' }}>{fmtMoney(monthlyLoans)}</p>
          </div>
        </div>
      </div>

      {/* ── Urgent cancellation warning ──────────────────────────────── */}
      {urgentContracts.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ margin: 0, color: '#f87171', fontWeight: 600, fontSize: '13px' }}>Kündigung bald fällig!</p>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>
              {urgentContracts.map(c => c.title).join(', ')} — bitte rechtzeitig kündigen.
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs + Actions ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Tab pills */}
        <div style={{ display: 'flex', gap: '4px', background: '#111', borderRadius: '12px', padding: '4px', border: '1px solid #1e1e1e' }}>
          {[
            { key: 'contracts', label: 'Verträge',      count: contracts.length },
            { key: 'loans',     label: 'Ratenzahlungen',count: loans.length     },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => { setTab(key); setFilter('all'); }} style={{
              padding: '7px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: 500,
              background: tab === key ? '#f97316' : 'transparent',
              color: tab === key ? '#fff' : '#64748b',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {label}
              <span style={{ fontSize: '11px', background: tab === key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1px 6px' }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: '4px', flex: 1, flexWrap: 'wrap' }}>
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

        {/* Add button */}
        <button
          onClick={() => setModal({ type: tab === 'contracts' ? 'contract' : 'loan', item: null })}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f97316', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)', whiteSpace: 'nowrap' }}
        >
          <Plus size={15} /> {tab === 'contracts' ? 'Vertrag' : 'Ratenzahlung'}
        </button>
      </div>

      {/* ── List ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={28} color="#f97316" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : tab === 'contracts' ? (
        filteredContracts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#374151' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>Keine Verträge gefunden</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
            {filteredContracts.map(c => (
              <ContractCard
                key={c.id} c={c}
                onEdit={item => setModal({ type: 'contract', item })}
                onDelete={(id, title) => openDelete(id, title, 'contract')}
                onKuendigung={setKuendigungContract}
              />
            ))}
          </div>
        )
      ) : (
        filteredLoans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#374151' }}>
            <CreditCard size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>Keine Ratenzahlungen gefunden</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
            {filteredLoans.map(l => (
              <LoanCard
                key={l.id} loan={l}
                onEdit={item => setModal({ type: 'loan', item })}
                onDelete={(id, title) => openDelete(id, title, 'loan')}
              />
            ))}
          </div>
        )
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {modal?.type === 'contract' && (
        <ContractModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={d => saveContract.mutate(d)}
          loading={saveContract.isPending}
          suggestions={suggestions}
        />
      )}
      {modal?.type === 'loan' && (
        <LoanModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={d => saveLoan.mutate(d)}
          loading={saveLoan.isPending}
        />
      )}

      {kuendigungContract && (
        <KuendigungModal
          contract={kuendigungContract}
          onClose={() => setKuendigungContract(null)}
        />
      )}

      <ConfirmDialog
        open={confirm.open}
        title={`${confirm.type === 'contract' ? 'Vertrag' : 'Ratenzahlung'} löschen?`}
        message={`„${confirm.title}" wird dauerhaft gelöscht.`}
        confirmLabel="Löschen"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dialogIn { from { opacity: 0; transform: translate(-50%,-48%) scale(0.97); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
      `}</style>
    </div>
  );
}
