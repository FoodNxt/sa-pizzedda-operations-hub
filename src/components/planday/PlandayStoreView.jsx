import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Save, Store as StoreIcon, Trash2 } from "lucide-react";
import moment from "moment";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

const DEFAULT_COLORI_RUOLO = {
  "Pizzaiolo": "#f97316",
  "Cassiere": "#3b82f6",
  "Store Manager": "#a855f7"
};

export default function PlandayStoreView({ 
  turni, 
  allTurniWeek = [],
  users, 
  stores,
  selectedStore,
  setSelectedStore,
  weekStart, 
  setWeekStart, 
  onEditTurno, 
  onAddTurno,
  onSaveTurno,
  onDeleteTurno,
  onDeleteWeekTurni,
  getStoreName,
  tipiTurno = [],
  coloriTipoTurno = {},
  coloriRuolo = DEFAULT_COLORI_RUOLO,
  formTrackerConfigs = [],
  struttureTurno = [],
  getFormDovutiPerTurno = () => [],
  getAttivitaTurno = () => [],
  getTurnoSequenceFromMomento = () => 'first',
  candidati = []
}) {
  const [quickAddPopup, setQuickAddPopup] = useState(null);
  const [quickForm, setQuickForm] = useState({
    store_id: '',
    ruolo: 'Pizzaiolo',
    ora_inizio: '09:00',
    ora_fine: '17:00',
    tipo_turno: 'Normale',
    is_prova: false,
    candidato_id: ''
  });
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [viewMode, setViewMode] = useState('byemployee'); // 'byemployee' o 'byday'

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.clone().add(i, 'days'));
    }
    return days;
  }, [weekStart]);

  const dipendentiConTurni = useMemo(() => {
    // Raggruppa per nome dipendente (già salvato nel turno)
    const dipendentiMap = new Map();
    
    turni.forEach(turno => {
      if (turno.dipendente_nome) {
        const key = turno.dipendente_id || turno.dipendente_nome;
        if (!dipendentiMap.has(key)) {
          dipendentiMap.set(key, {
            id: turno.dipendente_id || turno.dipendente_nome,
            nome_cognome: turno.dipendente_nome,
            full_name: turno.dipendente_nome,
            turniSettimana: []
          });
        }
        dipendentiMap.get(key).turniSettimana.push(turno);
      }
    });
    
    // Aggiungi dipendenti dello store anche se non hanno turni
    if (selectedStore) {
      const storeName = stores.find(s => s.id === selectedStore)?.name;
      if (storeName) {
        users.filter(u => {
          const assigned = u.assigned_stores || [];
          return assigned.includes(storeName);
        }).forEach(u => {
          if (!dipendentiMap.has(u.id)) {
            dipendentiMap.set(u.id, {
              ...u,
              turniSettimana: []
            });
          }
        });
      }
    }
    
    return Array.from(dipendentiMap.values()).sort((a, b) => 
      (a.nome_cognome || '').localeCompare(b.nome_cognome || '')
    );
  }, [turni, users, selectedStore, stores]);

  const turniByDipendente = useMemo(() => {
    const grouped = {};
    turni.forEach(turno => {
      const dipKey = turno.dipendente_id || turno.dipendente_nome || 'non_assegnato';
      if (!grouped[dipKey]) grouped[dipKey] = {};
      const dayKey = turno.data;
      if (!grouped[dipKey][dayKey]) grouped[dipKey][dayKey] = [];
      grouped[dipKey][dayKey].push(turno);
    });
    return grouped;
  }, [turni]);

  const turniNonAssegnati = turni.filter(t => !t.dipendente_id);

  // Calcola totale ore per giorno
  const totaleOrePerGiorno = useMemo(() => {
    const totali = {};
    weekDays.forEach(day => {
      const dayKey = day.format('YYYY-MM-DD');
      const dayTurni = turni.filter(t => t.data === dayKey);
      const oreGiorno = dayTurni.reduce((acc, t) => {
        const [startH, startM] = t.ora_inizio.split(':').map(Number);
        const [endH, endM] = t.ora_fine.split(':').map(Number);
        return acc + (endH - startH) + (endM - startM) / 60;
      }, 0);
      totali[dayKey] = oreGiorno;
    });
    return totali;
  }, [turni, weekDays]);

  const handleQuickAdd = (day, dipendenteId) => {
    setQuickAddPopup({ day: day.format('YYYY-MM-DD'), dipendenteId });
    const dipendente = users.find(u => u.id === dipendenteId);
    setQuickForm({
      store_id: selectedStore || stores[0]?.id || '',
      ruolo: dipendente?.ruoli_dipendente?.[0] || 'Pizzaiolo',
      ora_inizio: '09:00',
      ora_fine: '17:00',
      tipo_turno: 'Normale',
      dipendente_id: dipendenteId || '',
      is_prova: false,
      candidato_id: ''
    });
    setSelectedTurno(null);
  };

  const handleTurnoClick = (e, turno) => {
    e.stopPropagation();
    setSelectedTurno(turno);
    
    // Trova il dipendente usando l'ID o il nome
    let dipendenteId = turno.dipendente_id || '';
    
    // Se non c'è ID ma c'è il nome, cerca per nome
    if (!dipendenteId && turno.dipendente_nome) {
      const nomeTurno = turno.dipendente_nome.trim().toLowerCase();
      const foundUser = users.find(u => {
        const nomeCognome = (u.nome_cognome || '').trim().toLowerCase();
        const fullName = (u.full_name || '').trim().toLowerCase();
        return nomeCognome === nomeTurno || fullName === nomeTurno;
      });
      if (foundUser) {
        dipendenteId = foundUser.id;
      }
    }
    
    setQuickAddPopup({ day: turno.data, dipendenteId });
    setQuickForm({
      store_id: turno.store_id,
      ruolo: turno.ruolo,
      ora_inizio: turno.ora_inizio,
      ora_fine: turno.ora_fine,
      tipo_turno: turno.tipo_turno || 'Normale',
      dipendente_id: dipendenteId,
      is_prova: turno.is_prova || false,
      candidato_id: turno.candidato_id || ''
    });
  };

  const handleQuickSave = () => {
    if (quickAddPopup && onSaveTurno) {
      if (!quickForm.store_id) {
        alert('Seleziona un locale');
        return;
      }
      const dipendente = users.find(u => u.id === quickForm.dipendente_id);
      const candidato = candidati.find(c => c.id === quickForm.candidato_id);
      onSaveTurno({
        store_id: quickForm.store_id,
        data: quickAddPopup.day,
        dipendente_id: quickForm.dipendente_id || '',
        dipendente_nome: quickForm.is_prova && candidato 
          ? `${candidato.nome} ${candidato.cognome} (PROVA)`
          : (dipendente?.nome_cognome || dipendente?.full_name || ''),
        ruolo: quickForm.ruolo,
        ora_inizio: quickForm.ora_inizio,
        ora_fine: quickForm.ora_fine,
        tipo_turno: quickForm.tipo_turno,
        is_prova: quickForm.is_prova,
        candidato_id: quickForm.is_prova ? quickForm.candidato_id : ''
      }, selectedTurno?.id);
    }
    setQuickAddPopup(null);
    setSelectedTurno(null);
  };

  const handleDelete = () => {
    if (selectedTurno && onDeleteTurno) {
      if (confirm('Eliminare questo turno?')) {
        onDeleteTurno(selectedTurno.id);
        setQuickAddPopup(null);
        setSelectedTurno(null);
      }
    }
  };

  const handleDragStart = (e, turno) => {
    e.dataTransfer.setData('turno', JSON.stringify(turno));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, day, dipendenteId) => {
    e.preventDefault();
    const turnoData = e.dataTransfer.getData('turno');
    if (turnoData) {
      const turno = JSON.parse(turnoData);
      const dipendente = users.find(u => u.id === dipendenteId);
      if (onSaveTurno) {
        onSaveTurno({
          ...turno,
          data: day.format('YYYY-MM-DD'),
          dipendente_id: dipendenteId,
          dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || ''
        }, turno.id);
      }
    }
  };

  const getTipoTurnoColor = (tipoTurno) => coloriTipoTurno[tipoTurno] || '#94a3b8';
  const getRuoloStyle = (ruolo) => ({
    backgroundColor: coloriRuolo[ruolo] || '#94a3b8',
    borderColor: coloriRuolo[ruolo] || '#94a3b8'
  });

  return (
    <NeumorphicCard className="p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800">Vista per Store</h3>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('byemployee')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'byemployee'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Per Dipendente
            </button>
            <button
              onClick={() => setViewMode('byday')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'byday'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Per Giorno
            </button>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-xl px-3 py-2">
            <StoreIcon className="w-5 h-5 text-blue-600" />
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-transparent text-blue-800 font-bold outline-none min-w-[150px]"
            >
              <option value="">Tutti i locali</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().subtract(1, 'week'))}>
            <ChevronLeft className="w-4 h-4" />
          </NeumorphicButton>
          <span className="px-4 py-2 font-medium text-slate-700">
            {weekStart.format('DD MMM')} - {weekStart.clone().add(6, 'days').format('DD MMM YYYY')}
          </span>
          <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().add(1, 'week'))}>
            <ChevronRight className="w-4 h-4" />
          </NeumorphicButton>
          {turni.length > 0 && onDeleteWeekTurni && (
            <NeumorphicButton 
              onClick={() => {
                if (confirm(`Eliminare tutti i ${turni.length} turni di questa settimana?`)) {
                  onDeleteWeekTurni(turni.map(t => t.id));
                }
              }}
              className="bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
            </NeumorphicButton>
          )}
        </div>
      </div>

      <div className="min-w-[1000px]">
        {viewMode === 'byemployee' ? (
          <>
            <div className="grid grid-cols-8 gap-1 mb-2 border-b border-slate-200 pb-2">
              <div className="p-2 text-left font-medium text-slate-500 text-sm">Dipendente</div>
              {weekDays.map(day => (
                <div key={day.format('YYYY-MM-DD')} className={`p-2 text-center rounded-lg ${day.isSame(moment(), 'day') ? 'bg-blue-100' : ''}`}>
                  <div className="font-medium text-slate-700">{day.format('ddd')}</div>
                  <div className="text-lg font-bold text-slate-800">{day.format('DD')}</div>
                  <div className="text-xs text-slate-500">{day.format('MMM')}</div>
                </div>
              ))}
            </div>

            {/* Riga Turni Non Assegnati - PRIMA */}
            {turniNonAssegnati.length > 0 && (
              <div className="grid grid-cols-8 gap-1 border-b-2 border-orange-200 py-2 bg-orange-50">
                <div className="p-2">
                  <div className="text-sm font-medium text-orange-800 truncate">⚠️ Non Assegnati</div>
                  <div className="text-xs text-orange-600">{turniNonAssegnati.length} turni</div>
                </div>
                {weekDays.map(day => {
                  const dayKey = day.format('YYYY-MM-DD');
                  const dayTurni = turniNonAssegnati.filter(t => t.data === dayKey);
                  return (
                    <div 
                      key={dayKey} 
                      className="p-1 min-h-[60px] relative"
                    >
                      <div className="space-y-1">
                        {dayTurni.map(turno => (
                          <div 
                            key={turno.id}
                            className="p-2 rounded-lg cursor-pointer text-xs relative bg-orange-300 text-orange-900"
                            onClick={(e) => handleTurnoClick(e, turno)}
                          >
                            <div className="font-bold">{turno.ora_inizio}-{turno.ora_fine}</div>
                            <div className="text-[10px] opacity-90">{turno.ruolo}</div>
                            {!selectedStore && turno.store_id && <div className="opacity-80 text-[10px]">{getStoreName(turno.store_id)}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {dipendentiConTurni.map(dipendente => {
              const dipTurni = turniByDipendente[dipendente.id] || {};
              const totaleTurni = Object.values(dipTurni).flat().length;
              const totaleOre = Object.values(dipTurni).flat().reduce((acc, t) => {
                const [startH, startM] = t.ora_inizio.split(':').map(Number);
                const [endH, endM] = t.ora_fine.split(':').map(Number);
                return acc + (endH - startH) + (endM - startM) / 60;
              }, 0);

              return (
                <div key={dipendente.id} className="grid grid-cols-8 gap-1 border-b border-slate-100 py-2 hover:bg-slate-50">
                  <div className="p-2">
                    <div className="text-sm font-medium text-slate-800 truncate">{dipendente.nome_cognome || dipendente.full_name}</div>
                    <div className="text-xs text-slate-400">{totaleOre.toFixed(0)}h / {totaleTurni} turni</div>
                  </div>
                  {weekDays.map(day => {
                    const dayKey = day.format('YYYY-MM-DD');
                    const dayTurni = dipTurni[dayKey] || [];
                    return (
                      <div 
                        key={dayKey} 
                        className="p-1 min-h-[60px] relative cursor-pointer hover:bg-slate-100 rounded"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day, dipendente.id)}
                        onClick={() => dayTurni.length === 0 && handleQuickAdd(day, dipendente.id)}
                      >
                        <div className="space-y-1">
                          {dayTurni.map(turno => (
                            <div 
                              key={turno.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, turno)}
                              className="p-2 rounded-lg cursor-grab text-xs relative text-white"
                              style={getRuoloStyle(turno.ruolo)}
                              onClick={(e) => handleTurnoClick(e, turno)}
                            >
                              {turno.is_prova && (
                                <div className="absolute top-0 left-0 px-1 py-0.5 text-[7px] font-bold text-white rounded-br bg-purple-600">
                                  🧪
                                </div>
                              )}
                              {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                                <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-l-[12px] border-l-transparent" style={{ borderTopColor: getTipoTurnoColor(turno.tipo_turno) }} />
                              )}
                              <div className="font-bold">{turno.ora_inizio}-{turno.ora_fine}</div>
                              <div className="text-[10px] opacity-90">{turno.ruolo}</div>
                              {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                                <div className="text-[9px] font-bold mt-0.5">{turno.tipo_turno}</div>
                              )}
                              {!selectedStore && turno.store_id && <div className="opacity-80 text-[10px]">{getStoreName(turno.store_id)}</div>}
                              {(() => {
                                const formDovuti = getFormDovutiPerTurno(turno, turni.filter(t => t.data === turno.data));
                                const attivita = getAttivitaTurno(turno);
                                const total = formDovuti.length + attivita.length;
                                if (total > 0) {
                                  return (
                                    <div className="text-[8px] mt-0.5 px-1 bg-white bg-opacity-30 rounded">
                                      📋 {formDovuti.length} • ✓ {attivita.length}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ))}
                        </div>
                        {dayTurni.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Riga totale ore */}
            <div className="grid grid-cols-8 gap-1 border-t-2 border-slate-300 pt-2 mt-2 bg-slate-50">
              <div className="p-2">
                <div className="text-sm font-bold text-slate-700">Totale Ore</div>
              </div>
              {weekDays.map(day => {
                const dayKey = day.format('YYYY-MM-DD');
                const totaleOre = totaleOrePerGiorno[dayKey] || 0;
                return (
                  <div key={dayKey} className="p-2 text-center">
                    <div className="font-bold text-blue-600 text-sm">
                      {totaleOre.toFixed(1)}h
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              {weekDays.map(day => {
                const dayKey = day.format('YYYY-MM-DD');
                const dayTurni = turni.filter(t => t.data === dayKey);
                return (
                  <div key={dayKey} className="neumorphic-flat p-4 rounded-xl">
                    <h4 className={`font-bold text-lg mb-3 ${day.isSame(moment(), 'day') ? 'text-blue-600' : 'text-slate-800'}`}>
                      {day.format('dddd DD MMMM')}
                    </h4>
                    {dayTurni.length === 0 ? (
                      <p className="text-slate-400 text-sm">Nessun turno</p>
                    ) : (
                      <div className="space-y-2">
                        {dayTurni.map(turno => {
                          return (
                            <div
                              key={turno.id}
                              className="p-3 rounded-lg text-white cursor-pointer transition-all hover:shadow-lg"
                              style={getRuoloStyle(turno.ruolo)}
                              onClick={(e) => handleTurnoClick(e, turno)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-bold">{turno.ora_inizio} - {turno.ora_fine}</div>
                                  <div className="text-sm opacity-90">{turno.dipendente_nome || 'Non assegnato'}</div>
                                  <div className="text-xs opacity-90 mt-1">{turno.ruolo}</div>
                                  {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                                    <div className="text-xs font-bold mt-1 px-2 py-0.5 bg-white bg-opacity-20 rounded w-fit">
                                      {turno.tipo_turno}
                                    </div>
                                  )}
                                </div>
                                {!selectedStore && turno.store_id && (
                                  <div className="text-xs opacity-80 text-right ml-2">{getStoreName(turno.store_id)}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {quickAddPopup && (
        <div className="fixed z-50 bg-white shadow-xl rounded-xl p-4 border border-slate-200" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', minWidth: '300px' }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800">{selectedTurno ? 'Modifica Turno' : 'Nuovo Turno'}</h4>
            <button onClick={() => { setQuickAddPopup(null); setSelectedTurno(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="text-xs text-slate-500 mb-3">
            {quickAddPopup.day && moment(quickAddPopup.day).isValid() ? moment(quickAddPopup.day).format('dddd DD MMMM') : 'Data non valida'} {quickAddPopup.dipendenteId ? `- ${users.find(u => u.id === quickAddPopup.dipendenteId)?.nome_cognome || ''}` : ''}
          </div>
          <div className="space-y-2">
            <select value={quickForm.store_id} onChange={(e) => setQuickForm({ ...quickForm, store_id: e.target.value })} className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none">
              <option value="">Seleziona locale...</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={quickForm.ora_inizio} onChange={(e) => setQuickForm({ ...quickForm, ora_inizio: e.target.value })} className="neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none" />
              <input type="time" value={quickForm.ora_fine} onChange={(e) => setQuickForm({ ...quickForm, ora_fine: e.target.value })} className="neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none" />
            </div>
            <select value={quickForm.ruolo} onChange={(e) => setQuickForm({ ...quickForm, ruolo: e.target.value, dipendente_id: '' })} className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none">
              <option value="Pizzaiolo">Pizzaiolo</option>
              <option value="Cassiere">Cassiere</option>
              <option value="Store Manager">Store Manager</option>
            </select>
            <select value={quickForm.tipo_turno} onChange={(e) => setQuickForm({ ...quickForm, tipo_turno: e.target.value })} className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none">
              {(tipiTurno.length > 0 ? tipiTurno : ['Normale']).map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
            <select 
              value={quickForm.dipendente_id || ''} 
              onChange={(e) => setQuickForm({ ...quickForm, dipendente_id: e.target.value })} 
              className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none"
              disabled={quickForm.is_prova}
            >
              <option value="">Non assegnato</option>
              {users
                .filter(u => {
                  const ruoli = u.ruoli_dipendente || [];
                  return ruoli.includes(quickForm.ruolo);
                })
                .map(u => {
                  // Controlla se il dipendente ha già un turno in quella data/orario (in TUTTI gli store)
                  const dayKey = quickAddPopup?.day;
                  const turniDaControllare = allTurniWeek.length > 0 ? allTurniWeek : turni;
                  const altriTurni = turniDaControllare.filter(t => {
                    const matchById = t.dipendente_id === u.id;
                    const nomeTurno = (t.dipendente_nome || '').trim().toLowerCase();
                    const nomeUtente = (u.nome_cognome || u.full_name || '').trim().toLowerCase();
                    const matchByName = nomeTurno && nomeUtente && nomeTurno === nomeUtente;
                    return (matchById || matchByName) && t.data === dayKey && t.id !== selectedTurno?.id;
                  });
                  
                  let hasConflict = false;
                  let conflittoStessoStore = false;
                  let storesConflitto = [];
                  
                  if (quickForm.ora_inizio && quickForm.ora_fine && altriTurni.length > 0) {
                    const [startH, startM] = quickForm.ora_inizio.split(':').map(Number);
                    const [endH, endM] = quickForm.ora_fine.split(':').map(Number);
                    const startMinutes = startH * 60 + startM;
                    const endMinutes = endH * 60 + endM;
                    
                    altriTurni.forEach(t => {
                      const [tStartH, tStartM] = t.ora_inizio.split(':').map(Number);
                      const [tEndH, tEndM] = t.ora_fine.split(':').map(Number);
                      const tStartMinutes = tStartH * 60 + tStartM;
                      const tEndMinutes = tEndH * 60 + tEndM;
                      
                      const hasOverlap = (
                        (startMinutes >= tStartMinutes && startMinutes < tEndMinutes) ||
                        (endMinutes > tStartMinutes && endMinutes <= tEndMinutes) ||
                        (startMinutes <= tStartMinutes && endMinutes >= tEndMinutes)
                      );
                      
                      if (hasOverlap) {
                        hasConflict = true;
                        const storeName = getStoreName(t.store_id);
                        if (!storesConflitto.includes(storeName)) {
                          storesConflitto.push(storeName);
                        }
                        if (t.store_id === quickForm.store_id) {
                          conflittoStessoStore = true;
                        }
                      }
                    });
                  }
                  
                  let label = u.nome_cognome || u.full_name;
                  if (hasConflict) {
                    const icon = conflittoStessoStore ? '⚠️' : '🔔';
                    label += ` ${icon} In turno: ${storesConflitto.join(', ')}`;
                  }
                  
                  return (
                    <option key={u.id} value={u.id} disabled={conflittoStessoStore}>
                      {label}
                    </option>
                  );
                })}
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
                    dipendente_id: e.target.checked ? '' : quickForm.dipendente_id,
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
              {selectedTurno && (
                <button onClick={handleDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Elimina
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => { setQuickAddPopup(null); setSelectedTurno(null); }} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annulla</button>
              <button onClick={handleQuickSave} className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1"><Save className="w-3 h-3" /> Salva</button>
            </div>
          </div>
        </div>
      )}
      {quickAddPopup && <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={() => { setQuickAddPopup(null); setSelectedTurno(null); }} />}
    </NeumorphicCard>
  );
}