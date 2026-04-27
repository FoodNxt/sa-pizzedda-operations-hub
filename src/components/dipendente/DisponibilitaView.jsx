import React from "react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import DisponibilitaCalendar from "../disponibilita/DisponibilitaCalendar";
import DisponibilitaRicorrenti from "../disponibilita/DisponibilitaRicorrenti";

export default function DisponibilitaView({ currentUser, mieDisponibilita, setActiveView }) {
  return (
    <>
      <NeumorphicCard className="p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Disponibilità:</strong> Indica quando sei disponibile o non disponibile a lavorare.
          Gli amministratori riceveranno un avviso se cercano di assegnarti un turno in un momento in cui non sei disponibile.
        </p>
      </NeumorphicCard>

      <div className="flex gap-2">
        <NeumorphicButton
          onClick={() => setActiveView('disponibilita')}
          variant="primary"
          className="flex-1">
          Vista Calendario
        </NeumorphicButton>
      </div>

      <DisponibilitaCalendar dipendente={currentUser} disponibilita={mieDisponibilita} />

      <div className="mt-6">
        <DisponibilitaRicorrenti dipendente={currentUser} disponibilita={mieDisponibilita} />
      </div>
    </>
  );
}