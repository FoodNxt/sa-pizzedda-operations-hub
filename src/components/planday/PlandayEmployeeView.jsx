import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, User } from "lucide-react";
import moment from "moment";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

const COLORI_RUOLO = {
  "Pizzaiolo": "bg-orange-500 border-orange-600 text-white",
  "Cassiere": "bg-blue-500 border-blue-600 text-white",
  "Store Manager": "bg-purple-500 border-purple-600 text-white"
};

export default function PlandayEmployeeView({ 
  selectedDipendente,
  setSelectedDipendente,
  turniDipendente,
  users,
  stores,
  isLoading,
  onEditTurno,
  getStoreName
}) {
  const [viewMode, setViewMode] = useState('settimana'); // settimana o mese
  const [currentDate, setCurrentDate] = useState(moment());

  const dipendenti = useMemo(() => {
    return users.filter(u => u.ruoli_dipendente && u.ruoli_dipendente.length > 0);
  }, [users]);

  const weekDays = useMemo(() => {
    const start = currentDate.clone().startOf('isoWeek');
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(start.clone().add(i, 'days'));
    }
    return days;
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const start = currentDate.clone().startOf('month').startOf('isoWeek');
    const end = currentDate.clone().endOf('month').endOf('isoWeek');
    const days = [];
    let current = start.clone();
    while (current.isSameOrBefore(end)) {
      days.push(current.clone());
      current.add(1, 'day');
    }
    return days;
  }, [currentDate]);

  const turniByDate = useMemo(() => {
    const grouped = {};
    (turniDipendente || []).forEach(t => {
      if (!grouped[t.data]) grouped[t.data] = [];
      grouped[t.data].push(t);
    });
    return grouped;
  }, [turniDipendente]);

  // Statistiche
  const stats = useMemo(() => {
    const turniPeriodo = turniDipendente || [];
    const totaleTurni = turniPeriodo.length;
    const totaleOre = turniPeriodo.reduce((acc, t) => {
      const [startH, startM] = t.ora_inizio.split(':').map(Number);
      const [endH, endM] = t.ora_fine.split(':').map(Number);
      return acc + (endH - startH) + (endM - startM) / 60;
    }, 0);
    return { totaleTurni, totaleOre };
  }, [turniDipendente]);

  const navigatePrev = () => {
    if (viewMode === 'settimana') {
      setCurrentDate(currentDate.clone().subtract(1, 'week'));
    } else {
      setCurrentDate(currentDate.clone().subtract(1, 'month'));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'settimana') {
      setCurrentDate(currentDate.clone().add(1, 'week'));
    } else {
      setCurrentDate(currentDate.clone().add(1, 'month'));
    }
  };

  const selectedUser = users.find(u => u.id === selectedDipendente);

  return (
    <NeumorphicCard className="p-4">
      {/* Selezione dipendente */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <select
            value={selectedDipendente || ''}
            onChange={(e) => setSelectedDipendente(e.target.value)}
            className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
          >
            <option value="">Seleziona dipendente</option>
            {dipendenti.map(d => (
              <option key={d.id} value={d.id}>{d.nome_cognome || d.full_name}</option>
            ))}
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

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden neumorphic-pressed">
            <button
              onClick={() => setViewMode('settimana')}
              className={`px-4 py-2 text-sm font-medium ${viewMode === 'settimana' ? 'bg-blue-500 text-white' : 'text-slate-700'}`}
            >
              Settimana
            </button>
            <button
              onClick={() => setViewMode('mese')}
              className={`px-4 py-2 text-sm font-medium ${viewMode === 'mese' ? 'bg-blue-500 text-white' : 'text-slate-700'}`}
            >
              Mese
            </button>
          </div>
        </div>
      </div>

      {selectedDipendente ? (
        <>
          {/* Navigazione e Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <NeumorphicButton onClick={navigatePrev}>
                <ChevronLeft className="w-4 h-4" />
              </NeumorphicButton>
              <span className="px-4 py-2 font-medium text-slate-700 min-w-[200px] text-center">
                {viewMode === 'settimana' 
                  ? `${weekDays[0].format('DD MMM')} - ${weekDays[6].format('DD MMM YYYY')}`
                  : currentDate.format('MMMM YYYY')
                }
              </span>
              <NeumorphicButton onClick={navigateNext}>
                <ChevronRight className="w-4 h-4" />
              </NeumorphicButton>
              <NeumorphicButton onClick={() => setCurrentDate(moment())}>
                Oggi
              </NeumorphicButton>
            </div>

            <div className="flex gap-4">
              <div className="neumorphic-pressed px-4 py-2 rounded-xl">
                <div className="text-xs text-slate-500">Turni</div>
                <div className="text-lg font-bold text-slate-800">{stats.totaleTurni}</div>
              </div>
              <div className="neumorphic-pressed px-4 py-2 rounded-xl">
                <div className="text-xs text-slate-500">Ore</div>
                <div className="text-lg font-bold text-slate-800">{stats.totaleOre.toFixed(1)}h</div>
              </div>
            </div>
          </div>

          {/* Vista Settimana */}
          {viewMode === 'settimana' && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const dayKey = day.format('YYYY-MM-DD');
                const dayTurni = turniByDate[dayKey] || [];
                const isToday = day.isSame(moment(), 'day');

                return (
                  <div 
                    key={dayKey} 
                    className={`neumorphic-pressed p-3 rounded-xl min-h-[150px] ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    <div className={`text-center mb-2 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                      <div className="font-medium">{day.format('ddd')}</div>
                      <div className="text-xl font-bold">{day.format('DD')}</div>
                    </div>
                    <div className="space-y-1">
                      {dayTurni.map(turno => (
                        <div 
                          key={turno.id}
                          className={`p-2 rounded-lg cursor-pointer text-xs ${COLORI_RUOLO[turno.ruolo]}`}
                          onClick={() => onEditTurno(turno)}
                        >
                          <div className="font-bold">{turno.ora_inizio} - {turno.ora_fine}</div>
                          <div className="opacity-80">{turno.ruolo}</div>
                          <div className="opacity-80 text-[10px]">{getStoreName(turno.store_id)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Vista Mese */}
          {viewMode === 'mese' && (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
                  <div key={d} className="text-center text-sm font-medium text-slate-500 py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map(day => {
                  const dayKey = day.format('YYYY-MM-DD');
                  const dayTurni = turniByDate[dayKey] || [];
                  const isToday = day.isSame(moment(), 'day');
                  const isCurrentMonth = day.month() === currentDate.month();

                  return (
                    <div 
                      key={dayKey} 
                      className={`p-1 rounded-lg min-h-[80px] ${
                        isToday ? 'bg-blue-100 ring-2 ring-blue-400' : 
                        isCurrentMonth ? 'bg-slate-50' : 'bg-slate-100 opacity-50'
                      }`}
                    >
                      <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                        {day.format('DD')}
                      </div>
                      <div className="space-y-0.5">
                        {dayTurni.slice(0, 2).map(turno => (
                          <div 
                            key={turno.id}
                            className={`px-1 py-0.5 rounded text-[9px] cursor-pointer truncate ${COLORI_RUOLO[turno.ruolo]}`}
                            onClick={() => onEditTurno(turno)}
                          >
                            {turno.ora_inizio}-{turno.ora_fine}
                          </div>
                        ))}
                        {dayTurni.length > 2 && (
                          <div className="text-[9px] text-slate-500">+{dayTurni.length - 2} altri</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-slate-500">
          <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Seleziona un dipendente per vedere i suoi turni</p>
        </div>
      )}
    </NeumorphicCard>
  );
}