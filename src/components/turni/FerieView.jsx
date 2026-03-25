import React from "react";
import { Palmtree, Loader2 } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import moment from "moment";

export default function FerieView({
  ferieForm, setFerieForm,
  turniFuturi, currentUser,
  richiestaFerieMutation,
  mieFerie,
  getStatoColor, getStatoLabel
}) {
  return (
    <div className="space-y-4">
      <NeumorphicCard className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Palmtree className="w-5 h-5 text-blue-500" />
          Richiedi Nuove Ferie
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Inizio</label>
            <input type="date" value={ferieForm.data_inizio}
              onChange={(e) => setFerieForm({ ...ferieForm, data_inizio: e.target.value })}
              min={moment().format('YYYY-MM-DD')}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Fine</label>
            <input type="date" value={ferieForm.data_fine}
              onChange={(e) => {
                const nuovaDataFine = e.target.value;
                if (ferieForm.data_inizio && nuovaDataFine < ferieForm.data_inizio) {
                  alert('La data di fine non può essere antecedente alla data di inizio');
                  return;
                }
                setFerieForm({ ...ferieForm, data_fine: nuovaDataFine });
              }}
              min={ferieForm.data_inizio || moment().format('YYYY-MM-DD')}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (opz.)</label>
            <input type="text" value={ferieForm.motivo}
              onChange={(e) => setFerieForm({ ...ferieForm, motivo: e.target.value })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
              placeholder="Vacanza, motivi personali..." />
          </div>
        </div>
        {ferieForm.data_inizio && ferieForm.data_fine && (
          <p className="text-sm text-blue-600 mt-2">
            Turni coinvolti: {turniFuturi.filter((t) => t.data >= ferieForm.data_inizio && t.data <= ferieForm.data_fine).length}
          </p>
        )}
        <NeumorphicButton
          onClick={() => richiestaFerieMutation.mutate(ferieForm)}
          variant="primary" className="mt-4"
          disabled={!ferieForm.data_inizio || !ferieForm.data_fine || richiestaFerieMutation.isPending}>
          {richiestaFerieMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia Richiesta Ferie'}
        </NeumorphicButton>
      </NeumorphicCard>

      <NeumorphicCard className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Le Mie Richieste Ferie</h2>
        {mieFerie.length === 0 ? (
          <p className="text-slate-500 text-center py-4">Nessuna richiesta di ferie</p>
        ) : (
          <div className="space-y-3">
            {mieFerie.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((ferie) => (
              <div key={ferie.id} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">
                      {ferie.data_inizio && moment(ferie.data_inizio).isValid() ? moment(ferie.data_inizio).format('DD/MM/YYYY') : 'N/A'} - {ferie.data_fine && moment(ferie.data_fine).isValid() ? moment(ferie.data_fine).format('DD/MM/YYYY') : 'N/A'}
                    </p>
                    {ferie.motivo && <p className="text-sm text-slate-500">{ferie.motivo}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatoColor(ferie.stato)}`}>
                    {getStatoLabel(ferie.stato)}
                  </span>
                </div>
                {ferie.note_admin && <p className="text-xs text-slate-500 mt-2 italic">Note: {ferie.note_admin}</p>}
              </div>
            ))}
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}