import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, TrendingUp, TrendingDown, Euro, FileText, Trash2, Edit, Loader2,
  Receipt, CreditCard, AlertCircle, CheckCircle2, Clock, ShoppingCart, Landmark, Wallet
} from 'lucide-react';
import { format, differenceInMonths, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';

const CATS = ['Miete', 'Lebensmittel', 'Transport', 'Gesundheit', 'Freizeit', 'Versicherung', 'Strom/Gas', 'Internet', 'Gehalt', 'Sonstiges'];
const CYCLES = [{ v: 'monthly', l: 'Monatlich' }, { v: 'quarterly', l: 'Quartalsweise' }, { v: 'yearly', l: 'Jährlich' }, { v: 'one-time', l: 'Einmalig' }];
const CONTRACT_CATS = ['Internet', 'Strom', 'Gas', 'Versicherung', 'Streaming', 'Fitness', 'Handy', 'Miete', 'Sonstiges'];
const LOAN_TYPES = [
  { v: 'loan', l: 'Bankkredit', icon: Landmark },
  { v: 'debt', l: 'Schuld (privat)', icon: Wallet },
  { v: 'installment', l: 'Ratenkauf', icon: ShoppingCart },
];

const emptyItem = { title: '', amount: '', type: 'expense', category: 'Sonstiges', date: new Date().toISOString().split('T')[0], description: '' };
const emptyContract = { title: '', company: '', amount: '', billing_cycle: 'monthly', start_date: '', end_date: '', category: 'Sonstiges', status: 'active', notes: '' };
const emptyLoan = { title: '', lender: '', type: 'loan', total_amount: '', remaining_amount: '', monthly_rate: '', interest_rate: '', start_date: '', end_date: '', status: 'active', notes: '' };

function ProgressBar({ value, max, color = 'orange' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, ((max - value) / max) * 100)) : 0;
  const colorMap = { orange: 'bg-orange-500', green: 'bg-green-500', red: 'bg-red-500', blue: 'bg-blue-500' };
  return (
    <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colorMap[color]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function LoanTypeIcon({ type, size = 14 }) {
  const t = LOAN_TYPES.find(l => l.v === type);
  const Icon = t?.icon || CreditCard;
  return <Icon size={size} />;
}

function LoanStatusBadge({ status }) {
  const map = {
    active: { cls: 'bg-orange-500/15 text-orange-400', label: 'Aktiv' },
    paid: { cls: 'bg-green-500/15 text-green-400', label: 'Abgezahlt' },
    overdue: { cls: 'bg-red-500/15 text-red-400', label: 'Überfällig' },
    paused: { cls: 'bg-slate-700 text-slate-400', label: 'Pausiert' },
  };
  const s = map[status] || map.active;
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${s.cls}`}>{s.label}</span>;
}

export default function Finance() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [showItem, setShowItem] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [showLoan, setShowLoan] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editContract, setEditContract] = useState(null);
  const [editLoan, setEditLoan] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [contractForm, setContractForm] = useState(emptyContract);
  const [loanForm, setLoanForm] = useState(emptyLoan);

  const { data: summary } = useQuery({ queryKey: ['finance-summary'], queryFn: () => api.get('/finance/summary') });
  const { data: items = [] } = useQuery({ queryKey: ['finance-items'], queryFn: () => api.get('/finance/items') });
  const { data: contracts = [] } = useQuery({ queryKey: ['contracts'], queryFn: () => api.get('/finance/contracts') });
  const { data: loans = [] } = useQuery({ queryKey: ['loans'], queryFn: () => api.get('/finance/loans') });

  const itemMutation = useMutation({
    mutationFn: d => editItem ? api.put(`/finance/items/${editItem.id}`, d) : api.post('/finance/items', d),
    onSuccess: () => { qc.invalidateQueries(['finance-items']); qc.invalidateQueries(['finance-summary']); setShowItem(false); setEditItem(null); }
  });
  const deleteItemMutation = useMutation({
    mutationFn: id => api.delete(`/finance/items/${id}`),
    onSuccess: () => { qc.invalidateQueries(['finance-items']); qc.invalidateQueries(['finance-summary']); }
  });
  const contractMutation = useMutation({
    mutationFn: d => editContract ? api.put(`/finance/contracts/${editContract.id}`, d) : api.post('/finance/contracts', d),
    onSuccess: () => { qc.invalidateQueries(['contracts']); qc.invalidateQueries(['finance-summary']); setShowContract(false); setEditContract(null); }
  });
  const deleteContractMutation = useMutation({
    mutationFn: id => api.delete(`/finance/contracts/${id}`),
    onSuccess: () => { qc.invalidateQueries(['contracts']); qc.invalidateQueries(['finance-summary']); }
  });
  const loanMutation = useMutation({
    mutationFn: d => editLoan ? api.put(`/finance/loans/${editLoan.id}`, d) : api.post('/finance/loans', d),
    onSuccess: () => { qc.invalidateQueries(['loans']); qc.invalidateQueries(['finance-summary']); setShowLoan(false); setEditLoan(null); }
  });
  const deleteLoanMutation = useMutation({
    mutationFn: id => api.delete(`/finance/loans/${id}`),
    onSuccess: () => { qc.invalidateQueries(['loans']); qc.invalidateQueries(['finance-summary']); }
  });

  const openEditItem = it => { setEditItem(it); setItemForm({ ...it }); setShowItem(true); };
  const openEditContract = c => { setEditContract(c); setContractForm({ ...c }); setShowContract(true); };
  const openEditLoan = l => { setEditLoan(l); setLoanForm({ ...l, total_amount: l.total_amount || '', remaining_amount: l.remaining_amount ?? '', monthly_rate: l.monthly_rate || '', interest_rate: l.interest_rate || '', start_date: l.start_date || '', end_date: l.end_date || '' }); setShowLoan(true); };

  const totalMonthly = (summary?.loans_monthly || 0) + (summary?.contracts_total || 0);

  const TABS = [
    ['overview', 'Transaktionen'],
    ['contracts', 'Verträge'],
    ['loans', 'Kredite & Schulden'],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Finanzen</h1>
          <p className="text-sm text-slate-500 mt-0.5">Budget, Verträge & Verbindlichkeiten</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setEditItem(null); setItemForm(emptyItem); setShowItem(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e1e1e] border border-[#2a2a2a] hover:border-orange-500/50 text-slate-300 rounded-xl text-sm transition-colors">
            <Plus size={14} /> <span className="hidden sm:inline">Eintrag</span>
          </button>
          <button onClick={() => { setEditContract(null); setContractForm(emptyContract); setShowContract(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e1e1e] border border-[#2a2a2a] hover:border-orange-500/50 text-slate-300 rounded-xl text-sm transition-colors">
            <Plus size={14} /> <span className="hidden sm:inline">Vertrag</span>
          </button>
          <button onClick={() => { setEditLoan(null); setLoanForm(emptyLoan); setShowLoan(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm transition-colors shadow-md shadow-orange-500/20">
            <Plus size={14} /> <span className="hidden sm:inline">Kredit/Schuld</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { icon: TrendingUp, label: 'Einnahmen', value: `${(summary?.income || 0).toFixed(2)} €`, cls: 'text-green-400', bg: 'bg-green-500/10' },
          { icon: TrendingDown, label: 'Ausgaben', value: `${(summary?.expense || 0).toFixed(2)} €`, cls: 'text-red-400', bg: 'bg-red-500/10' },
          { icon: Euro, label: 'Bilanz', value: `${(summary?.balance || 0).toFixed(2)} €`, cls: (summary?.balance || 0) >= 0 ? 'text-green-400' : 'text-red-400', bg: 'bg-orange-500/10' },
          { icon: Receipt, label: 'Verträge/Mo', value: `${(summary?.contracts_total || 0).toFixed(0)} €`, cls: 'text-amber-400', bg: 'bg-amber-500/10' },
          { icon: CreditCard, label: 'Restschuld', value: `${(summary?.loans_remaining || 0).toFixed(0)} €`, cls: 'text-rose-400', bg: 'bg-rose-500/10' },
          { icon: AlertCircle, label: 'Belastung/Mo', value: `${totalMonthly.toFixed(0)} €`, cls: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map(({ icon: Icon, label, value, cls, bg }) => (
          <div key={label} className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}><Icon size={16} className={cls} /></div>
            <p className={`text-lg font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs — scrollbar auf sehr kleinen Screens */}
      <div className="tab-scroll bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-1 w-fit max-w-full">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === v ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Transactions Tab */}
      {tab === 'overview' && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="font-semibold text-white">Transaktionen</h2>
            <span className="text-xs text-slate-500">{items.length} Einträge</span>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Euro size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Noch keine Einträge</p>
              <button onClick={() => { setEditItem(null); setItemForm(emptyItem); setShowItem(true); }} className="mt-2 text-sm text-orange-500 hover:text-orange-400">Ersten Eintrag erstellen →</button>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#262626] transition-colors group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {item.type === 'income' ? <TrendingUp size={14} className="text-green-400" /> : <TrendingDown size={14} className="text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.category} · {item.date ? format(new Date(item.date), 'd. MMM yyyy', { locale: de }) : ''}</p>
                  </div>
                  {item.description && <p className="text-xs text-slate-600 hidden xl:block truncate max-w-[200px]">{item.description}</p>}
                  <p className={`font-semibold text-sm shrink-0 ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {item.type === 'income' ? '+' : '-'}{parseFloat(item.amount).toFixed(2)} €
                  </p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEditItem(item)} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"><Edit size={13} /></button>
                    <button onClick={() => deleteItemMutation.mutate(item.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contracts Tab */}
      {tab === 'contracts' && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="font-semibold text-white">Verträge & Abos</h2>
            <span className="text-xs text-slate-500">{contracts.filter(c => c.status === 'active').length} aktiv</span>
          </div>
          {contracts.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Noch keine Verträge</p>
              <button onClick={() => { setEditContract(null); setContractForm(emptyContract); setShowContract(true); }} className="mt-2 text-sm text-orange-500 hover:text-orange-400">Ersten Vertrag anlegen →</button>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {contracts.map(c => {
                const cycleLabel = CYCLES.find(cy => cy.v === c.billing_cycle)?.l || c.billing_cycle;
                return (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#262626] transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <FileText size={15} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white">{c.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.status === 'active' ? 'bg-green-500/10 text-green-400' : c.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                          {c.status === 'active' ? 'Aktiv' : c.status === 'cancelled' ? 'Gekündigt' : 'Ausstehend'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.company && `${c.company} · `}{c.category} · {cycleLabel}
                        {c.start_date && ` · ab ${format(new Date(c.start_date), 'd. MMM yyyy', { locale: de })}`}
                        {c.end_date && ` bis ${format(new Date(c.end_date), 'd. MMM yyyy', { locale: de })}`}
                      </p>
                    </div>
                    <p className="font-semibold text-sm text-amber-400 shrink-0">{parseFloat(c.amount || 0).toFixed(2)} €</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditContract(c)} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"><Edit size={13} /></button>
                      <button onClick={() => deleteContractMutation.mutate(c.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Loans Tab */}
      {tab === 'loans' && (
        <div className="space-y-4">
          {/* Loan type groups */}
          {LOAN_TYPES.map(({ v, l, icon: LIcon }) => {
            const group = loans.filter(lo => lo.type === v);
            if (group.length === 0) return null;
            return (
              <div key={v} className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <LIcon size={14} className="text-orange-400" />
                  </div>
                  <h3 className="font-medium text-white text-sm">{l}</h3>
                  <span className="text-xs text-slate-500 ml-auto">{group.length} Einträge</span>
                </div>
                <div className="divide-y divide-[#2a2a2a]">
                  {group.map(loan => {
                    const total = parseFloat(loan.total_amount) || 0;
                    const remaining = parseFloat(loan.remaining_amount) ?? total;
                    const paid = total - remaining;
                    const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
                    const monthsLeft = loan.end_date ? differenceInMonths(new Date(loan.end_date), new Date()) : null;

                    return (
                      <div key={loan.id} className="px-4 py-4 hover:bg-[#262626] transition-colors group">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-sm font-medium text-white">{loan.title}</p>
                              <LoanStatusBadge status={loan.status} />
                            </div>
                            <p className="text-xs text-slate-500">
                              {loan.lender && `${loan.lender} · `}
                              {loan.interest_rate > 0 && `${loan.interest_rate}% p.a. · `}
                              {loan.start_date && `ab ${format(new Date(loan.start_date), 'd. MMM yyyy', { locale: de })}`}
                              {loan.end_date && ` bis ${format(new Date(loan.end_date), 'd. MMM yyyy', { locale: de })}`}
                              {monthsLeft !== null && monthsLeft > 0 && ` · noch ${monthsLeft} Monate`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold text-rose-400">{remaining.toFixed(2)} €</p>
                              <p className="text-xs text-slate-500">von {total.toFixed(2)} €</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditLoan(loan)} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"><Edit size={13} /></button>
                              <button onClick={() => deleteLoanMutation.mutate(loan.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-500">Abbezahlt</span>
                            <span className="text-xs text-green-400 font-medium">{paidPct}%</span>
                          </div>
                          <ProgressBar value={remaining} max={total} color={paidPct >= 75 ? 'green' : paidPct >= 40 ? 'orange' : 'red'} />
                        </div>

                        {/* Bottom stats */}
                        <div className="flex items-center gap-4 mt-2">
                          {loan.monthly_rate > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Clock size={11} className="text-orange-500" />
                              <span>{parseFloat(loan.monthly_rate).toFixed(2)} €/Monat</span>
                            </div>
                          )}
                          {paid > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <CheckCircle2 size={11} className="text-green-500" />
                              <span>{paid.toFixed(2)} € bezahlt</span>
                            </div>
                          )}
                          {loan.notes && <p className="text-xs text-slate-600 truncate flex-1">{loan.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {loans.length === 0 && (
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-12 text-center">
              <CreditCard size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Keine Einträge</p>
              <p className="text-slate-600 text-sm mt-1">Kredite, Schulden und Ratenkäufe hier verwalten</p>
              <button onClick={() => { setEditLoan(null); setLoanForm(emptyLoan); setShowLoan(true); }}
                className="mt-4 text-sm text-orange-500 hover:text-orange-400">Ersten Eintrag erstellen →</button>
            </div>
          )}

          {/* Loans Summary if any */}
          {loans.length > 0 && (
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Gesamtübersicht Verbindlichkeiten</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Gesamtrestschuld</p>
                  <p className="text-lg font-bold text-rose-400">{(summary?.loans_remaining || 0).toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Monatliche Raten</p>
                  <p className="text-lg font-bold text-orange-400">{(summary?.loans_monthly || 0).toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Aktive Einträge</p>
                  <p className="text-lg font-bold text-white">{summary?.active_loans || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === MODALS === */}

      {/* Transaction Modal */}
      <Modal open={showItem} onClose={() => { setShowItem(false); setEditItem(null); }} title={editItem ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}>
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel *</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="z.B. Miete, Gehalt..." value={itemForm.title} onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1.5">Betrag (€) *</label>
              <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" value={itemForm.amount} onChange={e => setItemForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Typ</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={itemForm.type} onChange={e => setItemForm(f => ({ ...f, type: e.target.value }))}>
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
              </select>
            </div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
              <select className="w-full px-3.5 py-2.5 text-sm" value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Datum</label>
              <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={itemForm.date} onChange={e => setItemForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowItem(false); setEditItem(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => itemMutation.mutate(itemForm)} disabled={!itemForm.title || !itemForm.amount || itemMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 shadow-md shadow-orange-500/20">
              {itemMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Speichern
            </button>
          </div>
        </div>
      </Modal>

      {/* Contract Modal */}
      <Modal open={showContract} onClose={() => { setShowContract(false); setEditContract(null); }} title={editContract ? 'Vertrag bearbeiten' : 'Neuer Vertrag'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2"><label className="block text-sm text-slate-400 mb-1.5">Titel *</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="z.B. Netflix, Stromvertrag..." value={contractForm.title} onChange={e => setContractForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Anbieter</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder="Firmenname" value={contractForm.company} onChange={e => setContractForm(f => ({ ...f, company: e.target.value }))} />
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Betrag (€)</label>
            <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" value={contractForm.amount} onChange={e => setContractForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Abrechnungszyklus</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={contractForm.billing_cycle} onChange={e => setContractForm(f => ({ ...f, billing_cycle: e.target.value }))}>
              {CYCLES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Kategorie</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={contractForm.category} onChange={e => setContractForm(f => ({ ...f, category: e.target.value }))}>
              {CONTRACT_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Startdatum</label>
            <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={contractForm.start_date} onChange={e => setContractForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Enddatum / Kündigung</label>
            <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={contractForm.end_date} onChange={e => setContractForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Status</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={contractForm.status} onChange={e => setContractForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Aktiv</option>
              <option value="cancelled">Gekündigt</option>
              <option value="pending">Ausstehend</option>
            </select>
          </div>
          <div className="col-span-1 sm:col-span-2"><label className="block text-sm text-slate-400 mb-1.5">Notizen</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={contractForm.notes} onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-1 border-t border-[#2a2a2a]">
          <button onClick={() => { setShowContract(false); setEditContract(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
          <button onClick={() => contractMutation.mutate(contractForm)} disabled={!contractForm.title || contractMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 shadow-md shadow-orange-500/20">
            {contractMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Speichern
          </button>
        </div>
      </Modal>

      {/* Loan Modal */}
      <Modal open={showLoan} onClose={() => { setShowLoan(false); setEditLoan(null); }} title={editLoan ? 'Eintrag bearbeiten' : 'Kredit / Schuld / Ratenkauf'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Type selector */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm text-slate-400 mb-2">Typ</label>
            <div className="grid grid-cols-3 gap-2">
              {LOAN_TYPES.map(({ v, l, icon: LIcon }) => (
                <button key={v} type="button" onClick={() => setLoanForm(f => ({ ...f, type: v }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${loanForm.type === v ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-[#262626] border-[#2a2a2a] text-slate-400 hover:border-orange-500/40 hover:text-white'}`}>
                  <LIcon size={14} /> {l}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2"><label className="block text-sm text-slate-400 mb-1.5">Bezeichnung *</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder={loanForm.type === 'loan' ? 'z.B. Autokredit, Studentenkredit...' : loanForm.type === 'debt' ? 'z.B. Schulden bei Max...' : 'z.B. iPhone 16 Ratenkauf...'} value={loanForm.title} onChange={e => setLoanForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">{loanForm.type === 'debt' ? 'Gläubiger (Person/Firma)' : 'Bank / Anbieter'}</label>
            <input className="w-full px-3.5 py-2.5 text-sm" placeholder={loanForm.type === 'loan' ? 'z.B. Deutsche Bank' : loanForm.type === 'debt' ? 'z.B. Familie Müller' : 'z.B. MediaMarkt'} value={loanForm.lender} onChange={e => setLoanForm(f => ({ ...f, lender: e.target.value }))} />
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Status</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={loanForm.status} onChange={e => setLoanForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Aktiv / Laufend</option>
              <option value="paid">Vollständig abbezahlt</option>
              <option value="overdue">Überfällig</option>
              <option value="paused">Pausiert</option>
            </select>
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Gesamtbetrag (€) *</label>
            <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" placeholder="0.00" value={loanForm.total_amount}
              onChange={e => {
                const v = e.target.value;
                setLoanForm(f => ({ ...f, total_amount: v, remaining_amount: f.remaining_amount === '' || f.remaining_amount === f.total_amount ? v : f.remaining_amount }));
              }} />
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Restschuld (€)</label>
            <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" placeholder="= Gesamtbetrag wenn neu" value={loanForm.remaining_amount} onChange={e => setLoanForm(f => ({ ...f, remaining_amount: e.target.value }))} />
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Monatliche Rate (€)</label>
            <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" placeholder="0.00" value={loanForm.monthly_rate} onChange={e => setLoanForm(f => ({ ...f, monthly_rate: e.target.value }))} />
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Zinssatz (% p.a.)</label>
            <input type="number" step="0.01" className="w-full px-3.5 py-2.5 text-sm" placeholder="0.00" value={loanForm.interest_rate} onChange={e => setLoanForm(f => ({ ...f, interest_rate: e.target.value }))} />
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Startdatum</label>
            <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={loanForm.start_date} onChange={e => setLoanForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>

          <div><label className="block text-sm text-slate-400 mb-1.5">Enddatum (letzte Rate)</label>
            <input type="date" className="w-full px-3.5 py-2.5 text-sm" value={loanForm.end_date} onChange={e => setLoanForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>

          <div className="col-span-1 sm:col-span-2"><label className="block text-sm text-slate-400 mb-1.5">Notizen</label>
            <textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} placeholder="Kontonummer, Vertragsnummer, Hinweise..." value={loanForm.notes} onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-1 border-t border-[#2a2a2a]">
          <button onClick={() => { setShowLoan(false); setEditLoan(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
          <button onClick={() => loanMutation.mutate(loanForm)} disabled={!loanForm.title || !loanForm.total_amount || loanMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 shadow-md shadow-orange-500/20">
            {loanMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Speichern
          </button>
        </div>
      </Modal>
    </div>
  );
}
