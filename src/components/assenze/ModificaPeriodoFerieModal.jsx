import React, { useState } from "react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { Loader2 } from "lucide-react";

export default function ModificaPeriodoFerieModal({ request, onClose, onSave, isSaving }) {
  const [dataInizio, setDataInizio] = useState(request.data_inizio || '');
  const [dataFine, setDataFine] = useState(request.data_fine || '');

  const handleSave = () => {
    if (!dataInizio || !dataFine) {
      alert('Inserisci entrambe le date');
      return;
    }
    if (dataFine < dataInizio) {
      alert('La data di fine non può essere precedente alla data di inizio');
      return;
    }
    onSave({ data_inizio: dataInizio, data_fine: dataFine });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Modifica Periodo Ferie</h3>
          <p className="text-sm text-slate-600 mb-4">
            Modifica le date delle ferie di <strong>{request.dipendente_nome}</strong>. I turni esistenti non verranno modificati.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Data Inizio</label>
              <input
                type="date"
                value={dataInizio}
                onChange={(e) => setDataInizio(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Data Fine</label>
              <input
                type="date"
                value={dataFine}
                onChange={(e) => setDataFine(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none" />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-slate-600 hover:text-slate-800 neumorphic-flat rounded-xl">
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salva
              </button>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </>
  );
}