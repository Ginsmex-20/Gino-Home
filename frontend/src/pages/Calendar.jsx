import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit, Calendar as CalIcon, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import Modal from '../components/Modal';
import api from '../api/client';

const COLORS = ['#f97316', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#db2777', '#0891b2'];
const emptyForm = { title: '', description: '', start_date: '', end_date: '', all_day: true, color: '#f97316', group_id: '' };

export default function Calendar() {
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedDay, setSelectedDay] = useState(null);

  const from = format(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const to = format(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: events = [] } = useQuery({ queryKey: ['calendar', from, to], queryFn: () => api.get(`/calendar?from=${from}&to=${to}T23:59:59`) });
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: () => api.get('/groups') });

  const saveMutation = useMutation({
    mutationFn: d => editing ? api.put(`/calendar/${editing.id}`, d) : api.post('/calendar', d),
    onSuccess: () => { qc.invalidateQueries(['calendar']); setShowModal(false); setEditing(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/calendar/${id}`),
    onSuccess: () => qc.invalidateQueries(['calendar'])
  });

  const openCreate = (day) => {
    setEditing(null);
    const dateStr = format(day || new Date(), 'yyyy-MM-dd');
    setForm({ ...emptyForm, start_date: dateStr, end_date: dateStr });
    setShowModal(true);
  };

  const openEdit = ev => {
    setEditing(ev);
    setForm({ title: ev.title, description: ev.description || '', start_date: ev.start_date?.split('T')[0] || ev.start_date, end_date: ev.end_date?.split('T')[0] || ev.start_date, all_day: ev.all_day, color: ev.color, group_id: ev.group_id || '' });
    setShowModal(true);
  };

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) });

  const getEventsForDay = day => events.filter(e => isSameDay(new Date(e.start_date), day));
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Kalender</h1>
        <button onClick={() => openCreate(new Date())} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Termin
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 hover:bg-bg-hover rounded-lg transition-colors text-slate-400 hover:text-white">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-semibold text-white text-lg">{format(currentDate, 'MMMM yyyy', { locale: de })}</h2>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 hover:bg-bg-hover rounded-lg transition-colors text-slate-400 hover:text-white">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-500 py-2.5">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);
            return (
              <div key={i} onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                className={`min-h-[80px] p-1.5 border-r border-b border-border cursor-pointer transition-colors ${!isCurrentMonth ? 'opacity-30' : ''} ${isSelected ? 'bg-orange-500/10' : 'hover:bg-bg-hover'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${today ? 'bg-orange-500 text-white' : 'text-slate-300'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map(e => (
                    <div key={e.id} className="text-xs px-1 py-0.5 rounded truncate font-medium" style={{ backgroundColor: e.color + '25', color: e.color }}>
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && <div className="text-xs text-slate-500 px-1">+{dayEvents.length - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">{format(selectedDay, 'EEEE, d. MMMM yyyy', { locale: de })}</h3>
            <button onClick={() => openCreate(selectedDay)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs transition-colors">
              <Plus size={12} /> Termin
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Termine an diesem Tag</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-bg rounded-xl group">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{e.title}</p>
                    {e.description && <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>}
                    {!e.all_day && e.start_date && <p className="text-xs text-slate-500">{format(new Date(e.start_date), 'HH:mm')} {e.end_date ? `– ${format(new Date(e.end_date), 'HH:mm')}` : ''}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(e)} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"><Edit size={13} /></button>
                    <button onClick={() => deleteMutation.mutate(e.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Termin bearbeiten' : 'Neuer Termin'}>
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">Titel *</label><input className="w-full px-3.5 py-2.5 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Beschreibung</label><textarea className="w-full px-3.5 py-2.5 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1.5">Startdatum *</label><input type={form.all_day ? 'date' : 'datetime-local'} className="w-full px-3.5 py-2.5 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Enddatum</label><input type={form.all_day ? 'date' : 'datetime-local'} className="w-full px-3.5 py-2.5 text-sm" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.all_day} onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-300">Ganztägig</span>
            </label>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Farbe</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-bg-card scale-110' : ''}`}
                  style={{ backgroundColor: c, '--tw-ring-color': c }} />
              ))}
            </div>
          </div>
          <div><label className="block text-sm text-slate-400 mb-1.5">Gruppe</label>
            <select className="w-full px-3.5 py-2.5 text-sm" value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}>
              <option value="">Keine Gruppe</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowModal(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
            <button onClick={() => saveMutation.mutate(form)} disabled={!form.title || !form.start_date || saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50">
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null} {editing ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
