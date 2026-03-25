import React from "react";
import { X, Check, CheckCircle, Clock, MapPin, AlertTriangle, Users } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import moment from "moment";

export default function ScambioTurnoModal({
  selectedTurnoScambio,
  colleghiPerScambio,
  selectedCollegaScambio,
  setSelectedCollegaScambio,
  selectedTurnoCollegaScambio,
  setSelectedTurnoCollegaScambio,
  turniFuturiCollega,
  allUsersData,
  getStoreName,
  richiestaScambioMutation,
  onClose
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <NeumorphicCard className="p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Richiedi Scambio Turno</h2>
          <button onClick={onClose} className="nav-button p-2 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-xl">
          <div className="font-medium text-blue-800 capitalize">
            {moment(selectedTurnoScambio.data).locale('it').format('dddd DD MMMM YYYY')}
          </div>
          <div className="text-sm text-blue-700">
            {selectedTurnoScambio.ora_inizio} - {selectedTurnoScambio.ora_fine} • {selectedTurnoScambio.ruolo}
          </div>
          <div className="text-sm text-blue-600">
            {getStoreName(selectedTurnoScambio.store_id)}
          </div>
        </div>

        <h3 className="font-medium text-slate-700 mb-3">Seleziona un collega:</h3>

        {colleghiPerScambio.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-slate-500 mb-2">
              Nessun collega disponibile con il ruolo {selectedTurnoScambio.ruolo}
            </p>
            <p className="text-xs text-slate-400">
              Totale utenti: {allUsersData.length} | Apri console (F12) per debug
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {colleghiPerScambio.map((collega) => {
              const isSelected = selectedCollegaScambio?.id === collega.id;
              return (
                <div
                  key={collega.id}
                  className={`p-4 rounded-xl border transition-all ${
                    collega.haConflitti ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-60' :
                    isSelected ? 'border-blue-500 bg-blue-100' :
                    'border-green-300 bg-green-50 cursor-pointer hover:bg-green-100'
                  }`}
                  onClick={() => {
                    if (!collega.haConflitti) {
                      setSelectedCollegaScambio(collega);
                      setSelectedTurnoCollegaScambio(null);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {(collega.nome_cognome || collega.full_name || '?').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{collega.nome_cognome || collega.full_name}</div>
                        <div className="text-xs text-slate-500">{(collega.ruoli_dipendente || []).join(', ')}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {collega.haConflitti ? (
                        <span className="flex items-center gap-1 text-xs text-red-700 bg-red-200 px-2 py-1 rounded-full font-medium">
                          <X className="w-3 h-3" /> Conflitto orario
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-200 px-2 py-1 rounded-full font-medium">
                          <Check className="w-3 h-3" /> Disponibile
                        </span>
                      )}
                    </div>
                  </div>

                  {collega.tuttiTurniGiorno.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">Turni del collega in questo giorno:</p>
                      <div className="space-y-1">
                        {collega.tuttiTurniGiorno.map((turno) => {
                          const isSovrapposto = collega.turniSovrapposti.some((t) => t.id === turno.id);
                          return (
                            <div
                              key={turno.id}
                              className={`text-xs p-2 rounded-lg flex items-center justify-between ${
                                isSovrapposto ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                <span>{turno.ora_inizio} - {turno.ora_fine}</span>
                                <span>•</span>
                                <span>{getStoreName(turno.store_id)}</span>
                              </div>
                              {isSovrapposto && (
                                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                  <AlertTriangle className="w-3 h-3" /> Sovrapposto
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {collega.tuttiTurniGiorno.length === 0 && !collega.haConflitti && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Nessun altro turno in questo giorno - completamente libero
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedCollegaScambio && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-3">
              Seleziona il turno di {selectedCollegaScambio.nome_cognome || selectedCollegaScambio.full_name} da scambiare:
            </h3>
            {turniFuturiCollega.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Nessun turno futuro disponibile per questo collega
              </p>
            ) : (
              <div className="space-y-2">
                {turniFuturiCollega.map((turnoC) => {
                  const isSelectedTurno = selectedTurnoCollegaScambio?.id === turnoC.id;
                  return (
                    <div
                      key={turnoC.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelectedTurno ? 'border-blue-500 bg-blue-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedTurnoCollegaScambio(turnoC)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800 capitalize">
                            {moment(turnoC.data).locale('it').format('dddd DD MMMM YYYY')}
                          </p>
                          <div className="text-sm text-slate-600 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>{turnoC.ora_inizio} - {turnoC.ora_fine}</span>
                            <span>•</span>
                            <span>{turnoC.ruolo}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {getStoreName(turnoC.store_id)}
                          </div>
                        </div>
                        {isSelectedTurno && <Check className="w-5 h-5 text-blue-600" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <NeumorphicButton onClick={onClose} className="flex-1">
            Annulla
          </NeumorphicButton>
          {selectedCollegaScambio && selectedTurnoCollegaScambio && (
            <NeumorphicButton
              onClick={() => {
                richiestaScambioMutation.mutate({
                  mioTurnoId: selectedTurnoScambio.id,
                  suoTurnoId: selectedTurnoCollegaScambio.id,
                  richiestoA: selectedCollegaScambio.id
                });
              }}
              disabled={richiestaScambioMutation.isPending}
              variant="primary"
              className="flex-1"
            >
              {richiestaScambioMutation.isPending ? 'Invio...' : 'Conferma Scambio'}
            </NeumorphicButton>
          )}
        </div>
      </NeumorphicCard>
    </div>
  );
}