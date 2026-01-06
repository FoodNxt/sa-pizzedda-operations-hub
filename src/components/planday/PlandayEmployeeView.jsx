import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, User, X, Save, Trash2 } from "lucide-react";
import moment from "moment";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

const DEFAULT_COLORI_TIPO = {
  'Normale': '#94a3b8', 'Straordinario': '#ef4444', 'Formazione': '#22c55e',
  'Affiancamento': '#f59e0b', 'Apertura': '#3b82f6', 'Chiusura': '#8b5cf6'
};

const DEFAULT_COLORI_RUOLO = {
  "Pizzaiolo": "#f97316", "Cassiere": "#3b82f6", "Store Manager": "#a855f7"
};

export default function PlandayEmployeeView({ 
  selectedDipendente, setSelectedDipendente, turniDipendente, users, stores, isLoading,
  onEditTurno, onSaveTurno, onDeleteTurno, getStoreName,
  coloriTipoTurno = DEFAULT_COLORI_TIPO, coloriRuolo = DEFAULT_COLORI_RUOLO,
  formTrackerConfigs = [],
  struttureTurno = [],
  getFormDovutiPerTurno = () => [],
  getAttivitaTurno = () => [],
  getTurnoSequenceFromMomento = () => 'first',
  candidati = [],
  tutteDisponibilita = []
}) {
  const [viewMode, setViewMode] = useState('settimana');
  const [currentDate, setCurrentDate] = useState(moment());
  const [quickPopup, setQuickPopup] = useState(null);
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [quickForm, setQuickForm] = useState({ ruolo: 'Pizzaiolo', ora_inizio: '09:00', ora_fine: '17:00', tipo_turno: 'Normale', store_id: '', is_prova: false, candidato_id: '' });

  const dipendenti = useMemo(() => users.filter(u => u.ruoli_dipendente?.length > 0), [users]);
  const weekDays = useMemo(() => {
    const start = currentDate.clone().startOf('isoWeek');
    return Array.from({ length: 7 }, (_, i) => start.clone().add(i, 'days'));
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const start = currentDate.clone().startOf('month').startOf('isoWeek');
    const end = currentDate.clone().endOf('month').endOf('isoWeek');
    const days = [];
    let current = start.clone();
    while (current.isSameOrBefore(end)) { days.push(current.clone()); current.add(1, 'day'); }
    return days;
  }, [currentDate]);

  const turniByDate = useMemo(() => {
    const grouped = {};
    (turniDipendente || []).forEach(t => { if (!grouped[t.data]) grouped[t.data] = []; grouped[t.data].push(t); });
    return grouped;
  }, [turniDipendente]);

  const stats = useMemo(() => {
    const t = turniDipendente || [];
    return {
      totaleTurni: t.length,
      totaleOre: t.reduce((acc, x) => {
        const [sH, sM] = x.ora_inizio.split(':').map(Number);
        const [eH, eM] = x.ora_fine.split(':').map(Number);
        return acc + (eH - sH) + (eM - sM) / 60;
      }, 0)
    };
  }, [turniDipendente]);

  const selectedUser = users.find(u => u.id === selectedDipendente);
  const getTipoColor = (tipo) => coloriTipoTurno[tipo] || '#94a3b8';
  const getRuoloStyle = (ruolo) => ({ backgroundColor: coloriRuolo[ruolo] || '#94a3b8', borderColor: coloriRuolo[ruolo] || '#94a3b8' });

  const handleDragStart = (e, turno) => { e.dataTransfer.setData('turno', JSON.stringify(turno)); };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, day) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('turno');
    if (data && onSaveTurno) {
      const turno = JSON.parse(data);
      onSaveTurno({ ...turno, data: day.format('YYYY-MM-DD') }, turno.id);
    }
  };

  const handleTurnoClick = (turno) => {
    setSelectedTurno(turno);
    setQuickPopup({ day: turno.data });
    setQuickForm({ 
      ruolo: turno.ruolo, 
      ora_inizio: turno.ora_inizio, 
      ora_fine: turno.ora_fine, 
      tipo_turno: turno.tipo_turno || 'Normale', 
      store_id: turno.store_id,
      is_prova: turno.is_prova || false,
      candidato_id: turno.candidato_id || ''
    });
  };

  const handleQuickSave = () => {
    if (onSaveTurno && quickPopup) {
      // Verifica disponibilità prima di salvare
      if (!quickForm.is_prova && selectedDipendente) {
        const dayOfWeek = moment(quickPopup.day).day();
        const dispApplicabili = tutteDisponibilita.filter(d => {
          if (d.dipendente_id !== selectedDipendente) return false;
          if (d.ricorrente) {
            return d.giorno_settimana === dayOfWeek;
          } else {
            return d.data_specifica === quickPopup.day;
          }
        });

        const [newStartH, newStartM] = quickForm.ora_inizio.split(':').map(Number);
        const [newEndH, newEndM] = quickForm.ora_fine.split(':').map(Number);
        const newStart = newStartH * 60 + newStartM;
        const newEnd = newEndH * 60 + newEndM;

        const nonDisponibile = dispApplicabili.some(d => {
          if (d.tipo !== 'non_disponibile') return false;
          const [dStartH, dStartM] = d.ora_inizio.split(':').map(Number);
          const [dEndH, dEndM] = d.ora_fine.split(':').map(Number);
          const dStart = dStartH * 60 + dStartM;
          const dEnd = dEndH * 60 + dEndM;
          return (newStart < dEnd && newEnd > dStart);
        });

        if (nonDisponibile) {
          if (!confirm('⚠️ ATTENZIONE: Il dipendente ha segnalato NON DISPONIBILITÀ in questo orario!\n\nVuoi procedere comunque?')) {
            return;
          }
        }
      }

      const candidato = candidati.find(c => c.id === quickForm.candidato_id);
      onSaveTurno({
        store_id: quickForm.store_id || stores[0]?.id,
        data: quickPopup.day,
        dipendente_id: quickForm.is_prova ? '' : selectedDipendente,
        dipendente_nome: quickForm.is_prova && candidato 
          ? `${candidato.nome} ${candidato.cognome} (PROVA)`
          : (selectedUser?.nome_cognome || selectedUser?.full_name || ''),
        ruolo: quickForm.ruolo,
        ora_inizio: quickForm.ora_inizio,
        ora_fine: quickForm.ora_fine,
        tipo_turno: quickForm.tipo_turno,
        is_prova: quickForm.is_prova,
        candidato_id: quickForm.is_prova ? quickForm.candidato_id : ''
      }, selectedTurno?.id);
    }
    setQuickPopup(null); setSelectedTurno(null);
  };

  const handleDelete = () => {
    if (selectedTurno && onDeleteTurno && confirm('Eliminare questo turno?')) {
      onDeleteTurno(selectedTurno.id);
      setQuickPopup(null); setSelectedTurno(null);
    }
  };

  const navigatePrev = () => setCurrentDate(currentDate.clone().subtract(1, viewMode === 'settimana' ? 'week' : 'month'));
  const navigateNext = () => setCurrentDate(currentDate.clone().add(1, viewMode === 'settimana' ? 'week' : 'month'));

  return (
    <NeumorphicCard className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <select value={selectedDipendente || ''} onChange={(e) => setSelectedDipendente(e.target.value)} className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none">
            <option value="">Seleziona dipendente</option>
            {dipendenti.map(d => <option key={d.id} value={d.id}>{d.nome_cognome || d.full_name}</option>)}
          </select>
          {selectedUser && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                {(selectedUser.nome_cognome || selectedUser.full_name || '?').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-slate-800">{selectedUser.nome_cognome || selectedUser.full_name}</div>
                <div className="text-xs text-slate-500">{(selectedUser.ruoli_dipendente || []).join(', ')}</div>
              </div>
            </div>
          )}
        </div>
        <div className="flex rounded-xl overflow-hidden neumorphic-pressed">
          <button onClick={() => setViewMode('settimana')} className={`px-4 py-2 text-sm font-medium ${viewMode === 'settimana' ? 'bg-blue-500 text-white' : 'text-slate-700'}`}>Settimana</button>
          <button onClick={() => setViewMode('mese')} className={`px-4 py-2 text-sm font-medium ${viewMode === 'mese' ? 'bg-blue-500 text-white' : 'text-slate-700'}`}>Mese</button>
        </div>
      </div>

      {selectedDipendente ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <NeumorphicButton onClick={navigatePrev}><ChevronLeft className="w-4 h-4" /></NeumorphicButton>
              <span className="px-4 py-2 font-medium text-slate-700 min-w-[200px] text-center">
                {viewMode === 'settimana' ? `${weekDays[0].format('DD MMM')} - ${weekDays[6].format('DD MMM YYYY')}` : currentDate.format('MMMM YYYY')}
              </span>
              <NeumorphicButton onClick={navigateNext}><ChevronRight className="w-4 h-4" /></NeumorphicButton>
              <NeumorphicButton onClick={() => setCurrentDate(moment())}>Oggi</NeumorphicButton>
            </div>
            <div className="flex gap-4">
              <div className="neumorphic-pressed px-4 py-2 rounded-xl"><div className="text-xs text-slate-500">Turni</div><div className="text-lg font-bold text-slate-800">{stats.totaleTurni}</div></div>
              <div className="neumorphic-pressed px-4 py-2 rounded-xl"><div className="text-xs text-slate-500">Ore</div><div className="text-lg font-bold text-slate-800">{stats.totaleOre.toFixed(1)}h</div></div>
            </div>
          </div>

          {viewMode === 'settimana' && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const dayKey = day.format('YYYY-MM-DD');
                const dayTurni = turniByDate[dayKey] || [];
                const isToday = day.isSame(moment(), 'day');
                return (
                  <div 
                    key={dayKey} 
                    className={`neumorphic-pressed p-3 rounded-xl min-h-[150px] cursor-pointer hover:bg-slate-50 ${isToday ? 'ring-2 ring-blue-400' : ''}`} 
                    onDragOver={handleDragOver} 
                    onDrop={(e) => handleDrop(e, day)}
                    onClick={() => {
                      if (dayTurni.length === 0) {
                        setQuickPopup({ day: day.format('YYYY-MM-DD') });
                        setSelectedTurno(null);
                        setQuickForm({ ruolo: 'Pizzaiolo', ora_inizio: '09:00', ora_fine: '17:00', tipo_turno: 'Normale', store_id: stores[0]?.id || '', is_prova: false, candidato_id: '' });
                      }
                    }}
                  >
                    <div className={`text-center mb-2 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                      <div className="font-medium">{day.format('ddd')}</div>
                      <div className="text-xl font-bold">{day.format('DD')}</div>
                    </div>
                    <div className="space-y-1">
                    {dayTurni.map(turno => (
                      <div 
                        key={turno.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, turno)} 
                        className="p-2 rounded-lg cursor-grab text-xs relative text-white" 
                        style={getRuoloStyle(turno.ruolo)} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTurnoClick(turno);
                        }}
                      >
                       {turno.is_prova && (
                         <div className="absolute top-0 left-0 px-1 py-0.5 text-[7px] font-bold text-white rounded-br bg-purple-600">
                           🧪
                         </div>
                       )}
                       {turno.tipo_turno && turno.tipo_turno !== 'Normale' && <div className="absolute top-0 right-0 w-0 h-0 border-t-[10px] border-l-[10px] border-l-transparent" style={{ borderTopColor: getTipoColor(turno.tipo_turno) }} />}
                       <div className="font-bold">{turno.ora_inizio} - {turno.ora_fine}</div>
                       <div className="opacity-80">{turno.ruolo}</div>
                       {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                         <div className="text-[9px] font-bold">{turno.tipo_turno}</div>
                       )}
                       <div className="opacity-80 text-[10px]">{getStoreName(turno.store_id)}</div>
                        {/* Form + Attività */}
                        {(() => {
                          const formDovuti = getFormDovutiPerTurno(turno, turniDipendente || []);
                          const attivita = getAttivitaTurno(turno);
                          const total = formDovuti.length + attivita.length;
                          if (total > 0) {
                            return (
                              <div className="text-[8px] mt-1 px-1 bg-white bg-opacity-30 rounded">
                                📋 {formDovuti.length} • ✓ {attivita.length}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'mese' && (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d} className="text-center text-sm font-medium text-slate-500 py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map(day => {
                  const dayKey = day.format('YYYY-MM-DD');
                  const dayTurni = turniByDate[dayKey] || [];
                  const isToday = day.isSame(moment(), 'day');
                  const isCurrentMonth = day.month() === currentDate.month();
                  return (
                    <div key={dayKey} className={`p-1 rounded-lg min-h-[80px] ${isToday ? 'bg-blue-100 ring-2 ring-blue-400' : isCurrentMonth ? 'bg-slate-50' : 'bg-slate-100 opacity-50'}`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, day)}>
                      <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>{day.format('DD')}</div>
                      <div className="space-y-0.5">
                        {dayTurni.slice(0, 2).map(turno => (
                          <div key={turno.id} draggable onDragStart={(e) => handleDragStart(e, turno)} className="px-1 py-0.5 rounded text-[9px] cursor-grab truncate text-white" style={getRuoloStyle(turno.ruolo)} onClick={() => handleTurnoClick(turno)}>
                            {turno.ora_inizio}-{turno.ora_fine}
                            {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                              <span className="text-[7px] ml-0.5">({turno.tipo_turno})</span>
                            )}
                            {turno.is_prova && (
                              <span className="text-[7px] ml-0.5 bg-purple-500 bg-opacity-60 px-0.5 rounded">🧪</span>
                            )}
                          </div>
                        ))}
                        {dayTurni.length > 2 && <div className="text-[9px] text-slate-500">+{dayTurni.length - 2}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-slate-500"><User className="w-16 h-16 mx-auto mb-4 opacity-30" /><p>Seleziona un dipendente</p></div>
      )}

      {quickPopup && (
        <div className="fixed z-50 bg-white shadow-xl rounded-xl p-4 border border-slate-200" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', minWidth: '300px' }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800">{selectedTurno ? 'Modifica Turno' : 'Nuovo Turno'}</h4>
            <button onClick={() => { setQuickPopup(null); setSelectedTurno(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="text-xs text-slate-500 mb-3">{moment(quickPopup.day).format('dddd DD MMMM')}</div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={quickForm.ora_inizio} onChange={(e) => setQuickForm({ ...quickForm, ora_inizio: e.target.value })} className="neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none" />
              <input type="time" value={quickForm.ora_fine} onChange={(e) => setQuickForm({ ...quickForm, ora_fine: e.target.value })} className="neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none" />
            </div>
            <select value={quickForm.ruolo} onChange={(e) => setQuickForm({ ...quickForm, ruolo: e.target.value })} className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none">
              <option value="Pizzaiolo">Pizzaiolo</option><option value="Cassiere">Cassiere</option><option value="Store Manager">Store Manager</option>
            </select>
            <select value={quickForm.store_id} onChange={(e) => setQuickForm({ ...quickForm, store_id: e.target.value })} className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none">
              <option value="">Seleziona store</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            {/* Turno di Prova */}
            <div className="neumorphic-flat p-2 rounded-lg bg-purple-50">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={quickForm.is_prova}
                  onChange={(e) => setQuickForm({ 
                    ...quickForm, 
                    is_prova: e.target.checked,
                    candidato_id: ''
                  })}
                  className="w-4 h-4"
                />
                <span className="font-medium text-purple-800">🧪 Turno di Prova</span>
              </label>
              {quickForm.is_prova && (
                <select
                  value={quickForm.candidato_id}
                  onChange={(e) => setQuickForm({ ...quickForm, candidato_id: e.target.value })}
                  className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-xs outline-none mt-2"
                >
                  <option value="">Seleziona candidato...</option>
                  {candidati.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.cognome} - {c.telefono}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              {selectedTurno && <button onClick={handleDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"><Trash2 className="w-3 h-3" /> Elimina</button>}
              <div className="flex-1" />
              <button onClick={() => { setQuickPopup(null); setSelectedTurno(null); }} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annulla</button>
              <button onClick={handleQuickSave} className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1"><Save className="w-3 h-3" /> Salva</button>
            </div>
          </div>
        </div>
      )}
      {quickPopup && <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={() => { setQuickPopup(null); setSelectedTurno(null); }} />}
    </NeumorphicCard>
  );
}