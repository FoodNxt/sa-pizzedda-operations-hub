import React from "react";
import { AlertCircle } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import moment from "moment";

export function usePreContractReadOnly(currentUser) {
  if (!currentUser?.data_inizio_contratto) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(currentUser.data_inizio_contratto);
  startDate.setHours(0, 0, 0, 0);
  return startDate > today;
}

export default function PreContractBanner({ currentUser }) {
  return (
    <NeumorphicCard className="p-4 bg-blue-50 border-2 border-blue-300">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-900">Modalità visualizzazione</p>
          <p className="text-xs text-blue-800 mt-1">
            Puoi consultare i tuoi turni assegnati. Le azioni (timbratura, scambi, richieste) saranno disponibili dalla data di inizio contratto ({moment(currentUser.data_inizio_contratto).format('DD/MM/YYYY')}).
          </p>
        </div>
      </div>
    </NeumorphicCard>
  );
}