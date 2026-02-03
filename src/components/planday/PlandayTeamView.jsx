import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import moment from 'moment';
import NeumorphicCard from '../neumorphic/NeumorphicCard';
import NeumorphicButton from '../neumorphic/NeumorphicButton';

export default function PlandayTeamView({
  turni,
  users,
  stores,
  weekStart,
  setWeekStart,
  onEditTurno,
  onDeleteTurno,
  getStoreName,
  coloriRuolo
}) {
  const [selectedTurnoDetail, setSelectedTurnoDetail] = useState(null);
  const [expandedDays, setExpandedDays] = useState({});

  // Genera giorni della settimana
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.clone().add(i, 'days'));
    }
    return days;
  }, [weekStart]);

  // Ore della giornata (per colonne)
  const hourRange = useMemo(() => {
    const hours = [];
    for (let h = 8; h <= 22; h++) {
      hours.push(h);
    }
    return hours;
  }, []);

  // Raggruppa turni per giorno
  const turniByDay = useMemo(() => {
    const grouped = {};
    weekDays.forEach(day => {
      const dayKey = day.format('YYYY-MM-DD');
      grouped[dayKey] = turni.filter(t => t.data === dayKey).sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
    });
    return grouped;
  }, [turni, weekDays]);

  // Ottieni dipendenti unici per il giorno selezionato
  const getDipendentiForDay = (dayKey) => {
    const dayTurni = turniByDay[dayKey] || [];
    const dipendenteIds = [...new Set(dayTurni.map(t => t.dipendente_id).filter(Boolean))];
    return dipendenteIds.map(id => users.find(u => u.id === id)).filter(Boolean);
  };

  // Controlla se dipendente ha turno in quell'ora
  const getTurnoForHour = (dipendente, dayKey, hour) => {
    const dayTurni = turniByDay[dayKey] || [];
    return dayTurni.find(t => {
      if (t.dipendente_id !== dipendente.id) return false;
      const [startH] = t.ora_inizio.split(':').map(Number);
      const [endH] = t.ora_fine.split(':').map(Number);
      return hour >= startH && hour < endH;
    });
  };

  const getRuoloStyle = (ruolo) => {
    const color = coloriRuolo[ruolo] || '#94a3b8';
    return {
      backgroundColor: color,
      borderColor: color,
      color: '#fff'
    };
  };

  return (
    <div className="space-y-4">
      {/* Controlli settimana */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
            <NeumorphicButton onClick={() => setWeekStart(moment().startOf('isoWeek'))}>
              Oggi
            </NeumorphicButton>
          </div>
        </div>
      </NeumorphicCard>

      {/* Vista per giorno */}
      {weekDays.map(day => {
        const dayKey = day.format('YYYY-MM-DD');
        const dayTurni = turniByDay[dayKey] || [];
        const dipendenti = getDipendentiForDay(dayKey);
        const isExpanded = expandedDays[dayKey];
        const dayLabel = day.format('dddd DD MMMM').charAt(0).toUpperCase() + day.format('dddd DD MMMM').slice(1);
        const turniCount = dayTurni.length;

        return (
          <NeumorphicCard key={dayKey} className={`p-6 border-l-4 transition-all ${
            day.isSame(moment(), 'day') ? 'border-l-blue-600 bg-blue-50' : 'border-l-slate-300'
          }`}>
            {/* Header giorno */}
            <button
              onClick={() => setExpandedDays(prev => ({...prev, [dayKey]: !isExpanded}))}
              className="w-full flex items-center justify-between hover:opacity-70 transition-opacity mb-4"
            >
              <div className="flex items-center gap-4">
                <div>
                  <h3 className={`text-xl font-bold ${day.isSame(moment(), 'day') ? 'text-blue-700' : 'text-slate-800'}`}>
                    {dayLabel}
                  </h3>
                  <p className={`text-sm ${day.isSame(moment(), 'day') ? 'text-blue-600' : 'text-slate-500'}`}>
                    {turniCount} turni programmati
                  </p>
                </div>
              </div>
              <div className={`text-3xl font-bold transition-transform ${isExpanded ? 'rotate-180' : ''} text-slate-600`}>
                ▼
              </div>
            </button>

            {isExpanded && (
              <>
                {dipendenti.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>Nessun turno programmato per questo giorno</p>
                  </div>
                ) : (
                  // Tabella squadra oraria
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="text-left p-2 font-medium text-slate-700 min-w-max">Dipendente</th>
                          {hourRange.map(hour => (
                            <th key={hour} className="text-center p-1 font-medium text-slate-600 text-xs min-w-12">
                              {hour}:00
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dipendenti.map(dipendente => (
                          <tr key={dipendente.id} className="border-b border-slate-100 hover:bg-slate-50">
                            {/* Nome dipendente */}
                            <td className="p-2 font-medium text-slate-800 min-w-max">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="px-2 py-1 rounded text-xs text-white font-bold"
                                  style={getRuoloStyle(dipendente.ruoli_dipendente?.[0] || 'Pizzaiolo')}
                                >
                                  {dipendente.ruoli_dipendente?.[0]?.slice(0, 3).toUpperCase() || 'N/A'}
                                </div>
                                <span className="truncate">{dipendente.nome_cognome || dipendente.full_name}</span>
                              </div>
                            </td>

                            {/* Celle orarie */}
                            {hourRange.map(hour => {
                              const turno = getTurnoForHour(dipendente, dayKey, hour);
                              return (
                                <td key={hour} className="p-1 text-center">
                                  {turno ? (
                                    <button
                                      onClick={() => setSelectedTurnoDetail(turno)}
                                      className="mx-auto px-1.5 py-1 rounded text-xs font-bold text-white transition-all hover:shadow-lg"
                                      style={getRuoloStyle(turno.ruolo)}
                                      title={`${turno.ora_inizio}-${turno.ora_fine}`}
                                    >
                                      ✓
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 text-xs">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </NeumorphicCard>
        );
      })}

      {/* Modal dettagli turno */}
      {selectedTurnoDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Dettagli Turno</h2>
              <button 
                onClick={() => setSelectedTurnoDetail(null)}
                className="nav-button p-2 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Dipendente</p>
                <p className="font-bold text-slate-800">{selectedTurnoDetail.dipendente_nome}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Orario</p>
                  <p className="font-bold text-slate-800">{selectedTurnoDetail.ora_inizio}-{selectedTurnoDetail.ora_fine}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Ruolo</p>
                  <p className="font-bold text-slate-800">{selectedTurnoDetail.ruolo}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Store</p>
                <p className="font-bold text-slate-800">{getStoreName(selectedTurnoDetail.store_id)}</p>
              </div>

              {selectedTurnoDetail.tipo_turno && selectedTurnoDetail.tipo_turno !== 'Normale' && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Tipo Turno</p>
                  <p className="font-bold text-blue-800">{selectedTurnoDetail.tipo_turno}</p>
                </div>
              )}

              {selectedTurnoDetail.is_prova && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600">🧪 Turno di Prova</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  onEditTurno(selectedTurnoDetail);
                  setSelectedTurnoDetail(null);
                }}
                className="flex-1 nav-button px-4 py-2 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifica
              </button>
              <button
                onClick={() => {
                  if (confirm('Eliminare questo turno?')) {
                    onDeleteTurno(selectedTurnoDetail.id);
                    setSelectedTurnoDetail(null);
                  }
                }}
                className="flex-1 nav-button px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Elimina
              </button>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}