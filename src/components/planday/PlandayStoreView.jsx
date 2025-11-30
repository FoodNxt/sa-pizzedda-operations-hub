import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Save, Store as StoreIcon } from "lucide-react";
import moment from "moment";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

const COLORI_RUOLO = {
  "Pizzaiolo": "bg-orange-500 border-orange-600 text-white",
  "Cassiere": "bg-blue-500 border-blue-600 text-white",
  "Store Manager": "bg-purple-500 border-purple-600 text-white"
};

export default function PlandayStoreView({ 
  turni, 
  users, 
  stores,
  selectedStore,
  setSelectedStore,
  weekStart, 
  setWeekStart, 
  onEditTurno, 
  onAddTurno,
  onSaveTurno,
  getStoreName,
  tipiTurno = [],
  coloriTipoTurno = {}
}) {
  const [quickAddPopup, setQuickAddPopup] = useState(null);
  const [quickForm, setQuickForm] = useState({
    ruolo: 'Pizzaiolo',
    ora_inizio: '09:00',
    ora_fine: '17:00',
    tipo_turno: 'Normale'
  });

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.clone().add(i, 'days'));
    }
    return days;
  }, [weekStart]);

  const dipendentiConTurni = useMemo(() => {
    const allDipendenti = users.filter(u => u.ruoli_dipendente && u.ruoli_dipendente.length > 0);
    return allDipendenti.map(u => ({
      ...u,
      turniSettimana: turni.filter(t => t.dipendente_id === u.id)
    }));
  }, [turni, users]);

  const turniByDipendente = useMemo(() => {
    const grouped = {};
    turni.forEach(turno => {
      const dipId = turno.dipendente_id || 'non_assegnato';
      if (!grouped[dipId]) grouped[dipId] = {};
      const dayKey = turno.data;
      if (!grouped[dipId][dayKey]) grouped[dipId][dayKey] = [];
      grouped[dipId][dayKey].push(turno);
    });
    return grouped;
  }, [turni]);

  const turniNonAssegnati = turni.filter(t => !t.dipendente_id);

  const handleQuickAdd = (day, dipendenteId) => {
    setQuickAddPopup({ day: day.format('YYYY-MM-DD'), dipendenteId });
    const dipendente = users.find(u => u.id === dipendenteId);
    setQuickForm({
      ruolo: dipendente?.ruoli_dipendente?.[0] || 'Pizzaiolo',
      ora_inizio: '09:00',
      ora_fine: '17:00',
      tipo_turno: 'Normale'
    });
  };

  const handleQuickSave = () => {
    if (quickAddPopup && onSaveTurno) {
      onSaveTurno({
        store_id: selectedStore || stores[0]?.id,
        data: quickAddPopup.day,
        dipendente_id: quickAddPopup.dipendenteId,
        ...quickForm
      });
    }
    setQuickAddPopup(null);
  };

  // Drag and drop
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

  const getTipoTurnoColor = (tipoTurno) => {
    return coloriTipoTurno[tipoTurno] || '#94a3b8';
  };

  return (
    <NeumorphicCard className="p-4 overflow-x-auto">
      {/* Header con selezione store prominente */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800">Vista per Store</h3>
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
        </div>
      </div>

      <div className="min-w-[1000px]">
        {/* Header giorni */}
        <div className="grid grid-cols-8 gap-1 mb-2 border-b border-slate-200 pb-2">
          <div className="p-2 text-left font-medium text-slate-500 text-sm">Dipendente</div>
          {weekDays.map(day => (
            <div 
              key={day.format('YYYY-MM-DD')} 
              className={`p-2 text-center rounded-lg ${day.isSame(moment(), 'day') ? 'bg-blue-100' : ''}`}
            >
              <div className="font-medium text-slate-700">{day.format('ddd DD MMM')}</div>
              <div className="text-xs text-slate-500">
                {turni.filter(t => t.data === day.format('YYYY-MM-DD')).length} turni
              </div>
            </div>
          ))}
        </div>

        {/* Turni liberi */}
        {turniNonAssegnati.length > 0 && (
          <div className="grid grid-cols-8 gap-1 border-b border-slate-100 py-2">
            <div className="p-2 flex items-center gap-2">
              <div className="text-sm font-medium text-slate-600">Turni liberi</div>
              <div className="text-xs text-slate-400">{turniNonAssegnati.length}</div>
            </div>
            {weekDays.map(day => {
              const dayKey = day.format('YYYY-MM-DD');
              const dayTurni = turniNonAssegnati.filter(t => t.data === dayKey);
              
              return (
                <div 
                  key={dayKey} 
                  className="p-1 min-h-[60px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day, null)}
                >
                  {dayTurni.map(turno => (
                    <div 
                      key={turno.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, turno)}
                      className={`p-2 rounded-lg mb-1 cursor-grab text-xs relative ${COLORI_RUOLO[turno.ruolo]} opacity-70`}
                      onClick={() => onEditTurno(turno)}
                    >
                      {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                        <div 
                          className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-l-[12px] border-l-transparent"
                          style={{ borderTopColor: getTipoTurnoColor(turno.tipo_turno) }}
                        />
                      )}
                      <div className="font-bold">{turno.ruolo}</div>
                      <div>{turno.ora_inizio} - {turno.ora_fine}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Righe dipendenti */}
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
                <div className="text-sm font-medium text-slate-800 truncate">
                  {dipendente.nome_cognome || dipendente.full_name}
                </div>
                <div className="text-xs text-slate-400">
                  {totaleOre.toFixed(0)}h / {totaleTurni} turni
                </div>
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
                    {dayTurni.map(turno => (
                      <div 
                        key={turno.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, turno)}
                        className={`p-2 rounded-lg mb-1 cursor-grab text-xs relative ${COLORI_RUOLO[turno.ruolo]}`}
                        onClick={(e) => { e.stopPropagation(); onEditTurno(turno); }}
                      >
                        {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                          <div 
                            className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-l-[12px] border-l-transparent"
                            style={{ borderTopColor: getTipoTurnoColor(turno.tipo_turno) }}
                          />
                        )}
                        <div className="font-bold">{turno.ruolo}</div>
                        <div>{turno.ora_inizio} - {turno.ora_fine}</div>
                        {!selectedStore && turno.store_id && (
                          <div className="opacity-80 text-[10px]">{getStoreName(turno.store_id)}</div>
                        )}
                      </div>
                    ))}
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

        {dipendentiConTurni.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Nessun dipendente trovato
          </div>
        )}
      </div>

      {/* Quick Add Popup */}
      {quickAddPopup && (
        <div 
          className="fixed z-50 bg-white shadow-xl rounded-xl p-4 border border-slate-200"
          style={{ 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            minWidth: '280px'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800">Nuovo Turno</h4>
            <button onClick={() => setQuickAddPopup(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-slate-500 mb-3">
            {moment(quickAddPopup.day).format('dddd DD MMMM')} - {users.find(u => u.id === quickAddPopup.dipendenteId)?.nome_cognome}
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={quickForm.ora_inizio}
                onChange={(e) => setQuickForm({ ...quickForm, ora_inizio: e.target.value })}
                className="neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none"
              />
              <input
                type="time"
                value={quickForm.ora_fine}
                onChange={(e) => setQuickForm({ ...quickForm, ora_fine: e.target.value })}
                className="neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none"
              />
            </div>
            <select
              value={quickForm.ruolo}
              onChange={(e) => setQuickForm({ ...quickForm, ruolo: e.target.value })}
              className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none"
            >
              <option value="Pizzaiolo">Pizzaiolo</option>
              <option value="Cassiere">Cassiere</option>
              <option value="Store Manager">Store Manager</option>
            </select>
            <select
              value={quickForm.tipo_turno}
              onChange={(e) => setQuickForm({ ...quickForm, tipo_turno: e.target.value })}
              className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm outline-none"
            >
              {(tipiTurno.length > 0 ? tipiTurno : ['Normale']).map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setQuickAddPopup(null)}
                className="flex-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={handleQuickSave}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1"
              >
                <Save className="w-3 h-3" /> Salva
              </button>
            </div>
          </div>
        </div>
      )}
      {quickAddPopup && <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={() => setQuickAddPopup(null)} />}
    </NeumorphicCard>
  );
}