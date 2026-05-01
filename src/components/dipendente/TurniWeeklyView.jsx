import React from "react";
import { Clock, MapPin, ChevronLeft, ChevronRight, Loader2, AlertCircle, ArrowRightLeft } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import moment from "moment";

const COLORI_RUOLO = {
  "Pizzaiolo": "bg-orange-100 border-orange-300 text-orange-800",
  "Cassiere": "bg-blue-100 border-blue-300 text-blue-800",
  "Store Manager": "bg-purple-100 border-purple-300 text-purple-800"
};

export default function TurniWeeklyView({
  weekStart, setWeekStart, turni, isLoading, getStoreName, currentUser, openScambioModal, isPreContractReadOnly
}) {
  const weekDays = React.useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) days.push(weekStart.clone().add(i, 'days'));
    return days;
  }, [weekStart]);

  const turniByDay = React.useMemo(() => {
    const grouped = {};
    turni.forEach((turno) => {
      if (!grouped[turno.data]) grouped[turno.data] = [];
      grouped[turno.data].push(turno);
    });
    return grouped;
  }, [turni]);

  return (
    <>
      <NeumorphicCard className="p-4">
        <div className="flex items-center justify-between">
          <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().subtract(1, 'week'))}>
            <ChevronLeft className="w-4 h-4" />
          </NeumorphicButton>
          <span className="font-medium text-slate-700 capitalize">
            {weekStart.locale('it').format('DD MMM')} - {weekStart.clone().add(6, 'days').locale('it').format('DD MMM YYYY')}
          </span>
          <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().add(1, 'week'))}>
            <ChevronRight className="w-4 h-4" />
          </NeumorphicButton>
        </div>
      </NeumorphicCard>

      <div className="space-y-3">
        {isLoading ? (
          <NeumorphicCard className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          </NeumorphicCard>
        ) : (
          weekDays.map((day) => {
            const dayKey = day.format('YYYY-MM-DD');
            const dayTurni = turniByDay[dayKey] || [];
            const isToday = day.isSame(moment(), 'day');

            return (
              <NeumorphicCard key={dayKey} className={`p-4 ${isToday ? 'border-2 border-blue-400' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${isToday ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {day.format('DD')}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 capitalize">{day.locale('it').format('dddd')}</div>
                    <div className="text-sm text-slate-500 capitalize">{day.locale('it').format('MMMM YYYY')}</div>
                  </div>
                </div>
                {dayTurni.length === 0 ? (
                  <p className="text-slate-500 text-sm italic ml-13">Nessun turno</p>
                ) : (
                  <div className="space-y-2 ml-13">
                    {dayTurni.map((turno) => {
                      const turnoStart = moment(`${turno.data} ${turno.ora_inizio}`);
                      const turnoNonIniziato = turnoStart.isAfter(moment());
                      const canScambio = !isPreContractReadOnly && turnoNonIniziato && !turno.timbratura_entrata && (
                        !turno.richiesta_scambio || !['pending', 'accepted_by_colleague'].includes(turno.richiesta_scambio?.stato));

                      return (
                        <div key={turno.id} className={`p-3 rounded-lg border ${COLORI_RUOLO[turno.ruolo] || ''} ${turno.is_prova ? 'ring-2 ring-purple-500' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{turno.ora_inizio} - {turno.ora_fine}</span>
                              {turno.is_prova && <span className="px-2 py-0.5 bg-purple-500 text-white rounded-full text-[10px] font-bold">🧪 PROVA</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{turno.ruolo}</span>
                              {canScambio && (
                                <button onClick={() => openScambioModal(turno)} className="p-1 bg-white bg-opacity-50 rounded hover:bg-opacity-80" title="Richiedi scambio">
                                  <ArrowRightLeft className="w-3 h-3" />
                                </button>
                              )}
                              {turno.richiesta_scambio?.stato === 'pending' && (
                                <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {turno.richiesta_scambio?.richiesto_da === currentUser?.id ? 'Richiesto' : 'Da rispondere'}
                                </span>
                              )}
                              {turno.richiesta_scambio?.stato === 'accepted_by_colleague' && <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full text-xs">Da approvare</span>}
                              {turno.richiesta_scambio?.stato === 'approved_by_manager' && <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs">Approvato</span>}
                              {turno.richiesta_scambio?.stato === 'rejected_by_colleague' && <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs">Rifiutato</span>}
                              {turno.richiesta_scambio?.stato === 'rejected_by_manager' && <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs">Negato</span>}
                            </div>
                          </div>
                          <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {getStoreName(turno.store_id)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </NeumorphicCard>
            );
          })
        )}
      </div>
    </>
  );
}