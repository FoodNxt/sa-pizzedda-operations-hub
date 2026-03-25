import React from "react";
import { ArrowRightLeft, X, Check, CheckCircle, Users, Clock, MapPin } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

export default function ScambiView({
  scambiDaMePending,
  scambiPerMe,
  turniFuturi,
  getStoreName,
  cancellaScambioMutation,
  rispondiScambioMutation
}) {
  return (
    <div className="space-y-4">
      {/* Sezione 1: Scambi richiesti DA ME */}
      <NeumorphicCard className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-500" />
          Scambi Richiesti da Me
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Richieste di scambio che hai inviato ai tuoi colleghi
        </p>

        {scambiDaMePending.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Nessuna richiesta in corso</p>
        ) : (
          <div className="space-y-3">
            {scambiDaMePending.map((mioTurno) => {
              const scambio = mioTurno.richiesta_scambio;
              const suoTurnoId = scambio?.suo_turno_id;
              const statoScambio = scambio?.stato;
              const suoTurno = turniFuturi.find((t) => t.id === suoTurnoId);

              return (
                <div key={mioTurno.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                        <span className="font-bold text-slate-800">{scambio.richiesto_da_nome}</span>
                        <span className="text-slate-500">↔</span>
                        <span className="font-bold text-slate-800">{scambio.richiesto_a_nome}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-red-50 rounded-lg border-2 border-red-200">
                          <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1"><X className="w-3 h-3" />Cedi questo:</p>
                          <p className="font-medium text-slate-700 text-sm">{moment(mioTurno.data).format('ddd DD/MM')}</p>
                          <div className="text-xs text-slate-600 mt-1">🕐 {mioTurno.ora_inizio} - {mioTurno.ora_fine}</div>
                          <div className="text-xs text-slate-600">👤 {mioTurno.ruolo}</div>
                          <div className="text-xs text-slate-500">📍 {getStoreName(mioTurno.store_id)}</div>
                        </div>
                        {suoTurno && (
                          <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
                            <p className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1"><Check className="w-3 h-3" />Prendi questo:</p>
                            <p className="font-medium text-slate-700 text-sm">{moment(suoTurno.data).format('ddd DD/MM')}</p>
                            <div className="text-xs text-slate-600 mt-1">🕐 {suoTurno.ora_inizio} - {suoTurno.ora_fine}</div>
                            <div className="text-xs text-slate-600">👤 {suoTurno.ruolo}</div>
                            <div className="text-xs text-slate-500">📍 {getStoreName(suoTurno.store_id)}</div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Richiesto il {scambio.data_richiesta && moment(scambio.data_richiesta).isValid() ? moment(scambio.data_richiesta).format('DD/MM/YYYY HH:mm') : 'N/A'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 ml-3">
                      {statoScambio === 'pending' ? (
                        <>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium text-center">In attesa collega</span>
                          <button
                            onClick={() => cancellaScambioMutation.mutate({ mioTurnoId: mioTurno.id, suoTurnoId })}
                            disabled={cancellaScambioMutation.isPending}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Cancella
                          </button>
                        </>
                      ) : (
                        <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium text-center">
                          <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                          Accettato<br /><span className="text-[10px]">In attesa manager</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </NeumorphicCard>

      {/* Sezione 2: Scambi richiesti A ME */}
      <NeumorphicCard className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          Richieste Ricevute
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Colleghi che vogliono scambiare il loro turno con te
        </p>

        {scambiPerMe.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Nessuna richiesta ricevuta</p>
        ) : (
          <div className="space-y-3">
            {scambiPerMe.map((turno) => {
              const scambio = turno.richiesta_scambio;
              const mioTurnoId = scambio?.mio_turno_id;
              const mioTurno = turniFuturi.find((t) => t.id === mioTurnoId);
              const statoScambio = scambio?.stato;

              return (
                <div key={turno.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                        <span className="font-bold text-slate-800">{scambio.richiesto_da_nome}</span>
                        <span className="text-slate-500">↔</span>
                        <span className="font-bold text-slate-800">Tu</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mioTurno && (
                          <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
                            <p className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1"><Check className="w-3 h-3" />Prendi questo:</p>
                            <p className="font-medium text-slate-700 text-sm">{moment(mioTurno.data).format('ddd DD/MM')}</p>
                            <div className="text-xs text-slate-600 mt-1">🕐 {mioTurno.ora_inizio} - {mioTurno.ora_fine}</div>
                            <div className="text-xs text-slate-600">👤 {mioTurno.ruolo}</div>
                            <div className="text-xs text-slate-500">📍 {getStoreName(mioTurno.store_id)}</div>
                          </div>
                        )}
                        <div className="p-3 bg-red-50 rounded-lg border-2 border-red-200">
                          <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1"><X className="w-3 h-3" />Cedi questo:</p>
                          <p className="font-medium text-slate-700 text-sm">{moment(turno.data).format('ddd DD/MM')}</p>
                          <div className="text-xs text-slate-600 mt-1">🕐 {turno.ora_inizio} - {turno.ora_fine}</div>
                          <div className="text-xs text-slate-600">👤 {turno.ruolo}</div>
                          <div className="text-xs text-slate-500">📍 {getStoreName(turno.store_id)}</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Richiesto il {scambio.data_richiesta && moment(scambio.data_richiesta).isValid() ? moment(scambio.data_richiesta).format('DD/MM/YYYY HH:mm') : 'N/A'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 ml-3">
                      {statoScambio === 'pending' ? (
                        <>
                          <button
                            onClick={() => rispondiScambioMutation.mutate({ suoTurnoId: turno.id, accetta: true })}
                            disabled={rispondiScambioMutation.isPending}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Accetta
                          </button>
                          <button
                            onClick={() => rispondiScambioMutation.mutate({ suoTurnoId: turno.id, accetta: false })}
                            disabled={rispondiScambioMutation.isPending}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Rifiuta
                          </button>
                        </>
                      ) : (
                        <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium text-center">
                          <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                          Accettato<br /><span className="text-[10px]">In attesa approvazione Store Manager</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}