import React, { useState } from "react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import { Palmtree, Thermometer, Loader2, Upload, FileText, X, AlertTriangle } from "lucide-react";
import moment from "moment";

export function FerieView({ ferieForm, setFerieForm, richiestaFerieMutation, turniFuturi, mieFerie, getStatoColor, getStatoLabel }) {
  return (
    <div className="space-y-4">
      <NeumorphicCard className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Palmtree className="w-5 h-5 text-blue-500" /> Richiedi Nuove Ferie
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Inizio</label>
            <input type="date" value={ferieForm.data_inizio} onChange={(e) => setFerieForm({ ...ferieForm, data_inizio: e.target.value })} min={moment().format('YYYY-MM-DD')} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Fine</label>
            <input type="date" value={ferieForm.data_fine} onChange={(e) => { if (ferieForm.data_inizio && e.target.value < ferieForm.data_inizio) { alert('La data di fine non può essere antecedente alla data di inizio'); return; } setFerieForm({ ...ferieForm, data_fine: e.target.value }); }} min={ferieForm.data_inizio || moment().format('YYYY-MM-DD')} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (opz.)</label>
            <input type="text" value={ferieForm.motivo} onChange={(e) => setFerieForm({ ...ferieForm, motivo: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" placeholder="Vacanza, motivi personali..." />
          </div>
        </div>
        {ferieForm.data_inizio && ferieForm.data_fine && <p className="text-sm text-blue-600 mt-2">Turni coinvolti: {turniFuturi.filter((t) => t.data >= ferieForm.data_inizio && t.data <= ferieForm.data_fine).length}</p>}
        <NeumorphicButton onClick={() => richiestaFerieMutation.mutate(ferieForm)} variant="primary" className="mt-4" disabled={!ferieForm.data_inizio || !ferieForm.data_fine || richiestaFerieMutation.isPending}>
          {richiestaFerieMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia Richiesta Ferie'}
        </NeumorphicButton>
      </NeumorphicCard>
      <NeumorphicCard className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Le Mie Richieste Ferie</h2>
        {mieFerie.length === 0 ? <p className="text-slate-500 text-center py-4">Nessuna richiesta di ferie</p> :
          <div className="space-y-3">
            {mieFerie.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((ferie) => (
              <div key={ferie.id} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{ferie.data_inizio && moment(ferie.data_inizio).isValid() ? moment(ferie.data_inizio).format('DD/MM/YYYY') : 'N/A'} - {ferie.data_fine && moment(ferie.data_fine).isValid() ? moment(ferie.data_fine).format('DD/MM/YYYY') : 'N/A'}</p>
                    {ferie.motivo && <p className="text-sm text-slate-500">{ferie.motivo}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatoColor(ferie.stato)}`}>{getStatoLabel(ferie.stato)}</span>
                </div>
                {ferie.note_admin && <p className="text-xs text-slate-500 mt-2 italic">Note: {ferie.note_admin}</p>}
              </div>
            ))}
          </div>
        }
      </NeumorphicCard>
    </div>
  );
}

export function MalattiaView({ malattiaForm, setMalattiaForm, richiestaMalattiaMutation, turniFuturi, currentUser, mieMalattie, handleUploadCertificato, uploadingCertificato, uploadCertificatoMutation, uploadingCertificatoForId, setUploadingCertificatoForId, getStatoColor, getStatoLabel }) {
  return (
    <div className="space-y-4">
      <NeumorphicCard className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-red-500" /> Segnala Malattia
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Inizio</label>
            <input type="date" value={malattiaForm.data_inizio} onChange={(e) => setMalattiaForm({ ...malattiaForm, data_inizio: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Fine</label>
            <input type="date" value={malattiaForm.data_fine} onChange={(e) => setMalattiaForm({ ...malattiaForm, data_fine: e.target.value })} min={malattiaForm.data_inizio} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione (opz.)</label>
            <input type="text" value={malattiaForm.descrizione} onChange={(e) => setMalattiaForm({ ...malattiaForm, descrizione: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" placeholder="Descrivi brevemente..." />
          </div>
        </div>
        {malattiaForm.data_inizio && malattiaForm.data_fine && <p className="text-sm text-blue-600 mt-2">Turni coinvolti: {turniFuturi.filter((t) => t.dipendente_id === currentUser.id && t.data >= malattiaForm.data_inizio && t.data <= malattiaForm.data_fine).length}</p>}
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Certificato Medico (opzionale)</label>
          <div className="neumorphic-pressed p-4 rounded-xl">
            {malattiaForm.certificato_url ? (
              <div className="flex items-center gap-2 text-green-700">
                <FileText className="w-5 h-5" /><span className="text-sm">Certificato caricato</span>
                <button onClick={() => setMalattiaForm({ ...malattiaForm, certificato_url: null })} className="text-red-500 ml-auto"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <label className="flex items-center gap-3 cursor-pointer">
                {uploadingCertificato ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : <Upload className="w-6 h-6 text-slate-400" />}
                <span className="text-sm text-slate-500">Clicca per caricare</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleUploadCertificato(e.target.files[0])} />
              </label>
            )}
          </div>
        </div>
        <div className="p-3 bg-orange-50 rounded-xl mt-4 space-y-2">
          <p className="text-sm text-orange-700">⚠️ I tuoi turni verranno segnati come "Malattia (Non Certificata)" fino all'approvazione del certificato.</p>
          <p className="text-sm text-red-600 font-medium">📋 Hai 5 giorni dall'ultimo giorno di malattia per caricare il certificato medico.</p>
        </div>
        <NeumorphicButton onClick={() => richiestaMalattiaMutation.mutate(malattiaForm)} variant="primary" className="mt-4" disabled={!malattiaForm.data_inizio || !malattiaForm.data_fine || richiestaMalattiaMutation.isPending}>
          {richiestaMalattiaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia Segnalazione'}
        </NeumorphicButton>
      </NeumorphicCard>
      <NeumorphicCard className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Le Mie Malattie</h2>
        {mieMalattie.length === 0 ? <p className="text-slate-500 text-center py-4">Nessuna malattia registrata</p> :
          <div className="space-y-3">
            {mieMalattie.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((malattia) => {
              const dataFine = malattia.data_fine || malattia.data_inizio;
              const scadenzaCertificato = dataFine && moment(dataFine).isValid() ? moment(dataFine).add(5, 'days') : null;
              const giorniRimanenti = scadenzaCertificato ? scadenzaCertificato.diff(moment(), 'days') : 0;
              const isScaduto = giorniRimanenti < 0;
              const needsCertificato = !malattia.certificato_url && (malattia.stato === 'non_certificata' || malattia.stato === 'in_attesa_verifica');
              return (
                <div key={malattia.id} className={`neumorphic-pressed p-4 rounded-xl ${isScaduto && needsCertificato ? 'border-2 border-red-300 bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{malattia.data_inizio && moment(malattia.data_inizio).isValid() ? moment(malattia.data_inizio).format('DD/MM/YYYY') : 'N/A'}{malattia.data_fine && moment(malattia.data_fine).isValid() && ` - ${moment(malattia.data_fine).format('DD/MM/YYYY')}`}</p>
                      {malattia.descrizione && <p className="text-sm text-slate-500">{malattia.descrizione}</p>}
                      {malattia.certificato_url ? (
                        <a href={malattia.certificato_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1 mt-1"><FileText className="w-3 h-3" /> Vedi Certificato</a>
                      ) : needsCertificato && (
                        <div className="mt-2">
                          {isScaduto ? <div className="p-2 bg-red-100 rounded-lg mb-2"><p className="text-xs text-red-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Scadenza superata</p></div> : giorniRimanenti <= 5 && <div className="p-2 bg-orange-100 rounded-lg mb-2"><p className="text-xs text-orange-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{giorniRimanenti === 0 ? 'Scade oggi!' : `Scade tra ${giorniRimanenti} giorn${giorniRimanenti === 1 ? 'o' : 'i'}`}</p></div>}
                          {uploadingCertificatoForId === malattia.id ? <div className="flex items-center gap-2 text-blue-600"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Caricamento...</span></div> : (
                            <label className={`flex items-center gap-2 cursor-pointer text-xs px-3 py-2 rounded-lg ${isScaduto ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                              <Upload className="w-4 h-4" /><span>Carica certificato</span>
                              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files[0]) { setUploadingCertificatoForId(malattia.id); uploadCertificatoMutation.mutate({ malattiaId: malattia.id, file: e.target.files[0] }); }}} />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${isScaduto && needsCertificato ? 'bg-red-200 text-red-800' : getStatoColor(malattia.stato)}`}>{isScaduto && needsCertificato ? 'Non Giustificata' : getStatoLabel(malattia.stato)}</span>
                  </div>
                  {malattia.note_admin && <p className="text-xs text-slate-500 mt-2 italic">Note: {malattia.note_admin}</p>}
                </div>
              );
            })}
          </div>
        }
      </NeumorphicCard>
    </div>
  );
}