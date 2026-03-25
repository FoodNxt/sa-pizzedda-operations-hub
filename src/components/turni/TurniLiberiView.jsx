import React from "react";
import { Users, Clock, MapPin } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import moment from "moment";

export default function TurniLiberiView({
  currentUser, turniLiberi, mieRichiesteTurni,
  getStoreName, richiediTurnoLiberoMutation
}) {
  return (
    <NeumorphicCard className="p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-green-500" /> Turni Liberi Disponibili
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Questi turni corrispondono ai tuoi ruoli ({currentUser?.ruoli_dipendente?.join(', ')}) e sono disponibili.
      </p>
      {turniLiberi.length === 0 ? (
        <p className="text-slate-500 text-center py-8">Nessun turno libero disponibile per i tuoi ruoli</p>
      ) : (
        <div className="space-y-3">
          {turniLiberi.sort((a, b) => a.data.localeCompare(b.data)).map((turno) => {
            const giaRichiesto = mieRichiesteTurni.some((r) => r.turno_id === turno.id && r.stato === 'in_attesa');
            return (
              <div key={turno.id} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 capitalize">{moment(turno.data).locale('it').format('dddd DD MMMM')}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>{turno.ora_inizio} - {turno.ora_fine}</span><span>•</span><span>{turno.ruolo}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3 h-3" />{getStoreName(turno.store_id)}
                      {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{turno.tipo_turno}</span>
                      )}
                    </div>
                  </div>
                  {giaRichiesto ? (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Richiesto</span>
                  ) : (
                    <NeumorphicButton onClick={() => richiediTurnoLiberoMutation.mutate(turno)} variant="primary" className="text-sm" disabled={richiediTurnoLiberoMutation.isPending}>Richiedi</NeumorphicButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {mieRichiesteTurni.filter((r) => r.stato === 'in_attesa').length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="font-bold text-slate-700 mb-3">Le tue richieste in attesa</h3>
          <div className="space-y-2">
            {mieRichiesteTurni.filter((r) => r.stato === 'in_attesa').map((richiesta) => (
              <div key={richiesta.id} className="p-3 bg-yellow-50 rounded-xl text-sm">
                <span className="font-medium">{moment(richiesta.data_turno).format('DD/MM/YYYY')}</span>
                <span className="text-slate-500"> • {richiesta.ora_inizio}-{richiesta.ora_fine}</span>
                <span className="text-slate-500"> • {richiesta.store_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </NeumorphicCard>
  );
}