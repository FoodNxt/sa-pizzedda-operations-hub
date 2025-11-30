import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
  weekStart, 
  setWeekStart, 
  onEditTurno, 
  onAddTurno,
  getStoreName 
}) {
  // Giorni della settimana
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.clone().add(i, 'days'));
    }
    return days;
  }, [weekStart]);

  // Dipendenti con turni in questa settimana
  const dipendentiConTurni = useMemo(() => {
    const dipendentiIds = new Set();
    turni.forEach(t => {
      if (t.dipendente_id) dipendentiIds.add(t.dipendente_id);
    });
    
    // Aggiungi anche dipendenti senza turni assegnati
    const allDipendenti = users.filter(u => u.ruoli_dipendente && u.ruoli_dipendente.length > 0);
    
    return allDipendenti.map(u => ({
      ...u,
      turniSettimana: turni.filter(t => t.dipendente_id === u.id)
    }));
  }, [turni, users]);

  // Raggruppa turni per dipendente e giorno
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

  // Turni non assegnati
  const turniNonAssegnati = turni.filter(t => !t.dipendente_id);

  return (
    <NeumorphicCard className="p-4 overflow-x-auto">
      {/* Navigazione settimana */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Vista per Dipendente</h3>
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
              className={`p-2 text-center rounded-lg ${
                day.isSame(moment(), 'day') ? 'bg-blue-100' : ''
              }`}
            >
              <div className="font-medium text-slate-700">{day.format('ddd DD MMM')}</div>
              <div className="text-xs text-slate-500">
                {turni.filter(t => t.data === day.format('YYYY-MM-DD')).length} turni
              </div>
            </div>
          ))}
        </div>

        {/* Turni liberi / non assegnati */}
        {turniNonAssegnati.length > 0 && (
          <div className="grid grid-cols-8 gap-1 border-b border-slate-100 py-2">
            <div className="p-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                ?
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600">Turni liberi</div>
                <div className="text-xs text-slate-400">{turniNonAssegnati.length} turni</div>
              </div>
            </div>
            {weekDays.map(day => {
              const dayKey = day.format('YYYY-MM-DD');
              const dayTurni = turniNonAssegnati.filter(t => t.data === dayKey);
              
              return (
                <div key={dayKey} className="p-1 min-h-[60px]">
                  {dayTurni.map(turno => (
                    <div 
                      key={turno.id}
                      className={`p-2 rounded-lg mb-1 cursor-pointer text-xs border-l-4 ${COLORI_RUOLO[turno.ruolo]} opacity-70`}
                      onClick={() => onEditTurno(turno)}
                    >
                      <div className="font-bold">{turno.ruolo}</div>
                      <div>{turno.ora_inizio} - {turno.ora_fine}</div>
                      {!selectedStore && turno.store_id && (
                        <div className="opacity-80 text-[10px]">{getStoreName(turno.store_id)}</div>
                      )}
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
              <div className="p-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {(dipendente.nome_cognome || dipendente.full_name || '?').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 truncate max-w-[120px]">
                    {dipendente.nome_cognome || dipendente.full_name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {totaleOre.toFixed(0)}h / {totaleTurni} turni
                  </div>
                </div>
              </div>
              {weekDays.map(day => {
                const dayKey = day.format('YYYY-MM-DD');
                const dayTurni = dipTurni[dayKey] || [];
                
                return (
                  <div 
                    key={dayKey} 
                    className="p-1 min-h-[60px] relative cursor-pointer hover:bg-slate-100 rounded"
                    onClick={() => dayTurni.length === 0 && onAddTurno(day, dipendente.id)}
                  >
                    {dayTurni.map(turno => (
                      <div 
                        key={turno.id}
                        className={`p-2 rounded-lg mb-1 cursor-pointer text-xs ${COLORI_RUOLO[turno.ruolo]}`}
                        onClick={(e) => { e.stopPropagation(); onEditTurno(turno); }}
                      >
                        <div className="font-bold">{turno.ruolo}</div>
                        <div>{turno.ora_inizio} - {turno.ora_fine}</div>
                        {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                          <div className="opacity-80 text-[10px]">{turno.tipo_turno}</div>
                        )}
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
    </NeumorphicCard>
  );
}