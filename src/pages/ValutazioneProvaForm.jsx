import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { ClipboardList, Save, CheckCircle, User, Calendar, Store, Loader2, AlertCircle } from "lucide-react";
import moment from "moment";

export default function ValutazioneProvaForm() {
  const [selectedCandidato, setSelectedCandidato] = useState(null);
  const [risposte, setRisposte] = useState({});
  const [noteAggiuntive, setNoteAggiuntive] = useState('');
  const [consiglioAssunzione, setConsiglioAssunzione] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: valutazioniConfig = [] } = useQuery({
    queryKey: ['valutazioni-config'],
    queryFn: () => base44.entities.ValutazioneProvaConfig.list(),
  });

  const { data: candidati = [] } = useQuery({
    queryKey: ['candidati-prova'],
    queryFn: () => base44.entities.Candidato.filter({ stato: 'prova_programmata' }),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: valutazioniEsistenti = [] } = useQuery({
    queryKey: ['mie-valutazioni', user?.id],
    queryFn: () => base44.entities.ValutazioneProva.filter({ dipendente_id: user?.id }),
    enabled: !!user?.id,
  });

  const activeConfig = valutazioniConfig.find(c => c.attivo) || { domande: [] };

  // Filter candidati that have prova managed by this user and prova is passed
  const mieiCandidati = candidati.filter(c => {
    if (c.prova_dipendente_id !== user?.id) return false;
    if (!c.prova_data) return false;
    // Check if prova date is passed
    return moment(c.prova_data).isBefore(moment(), 'day');
  });

  // Filter out already evaluated candidates
  const candidatiDaValutare = mieiCandidati.filter(c => 
    !valutazioniEsistenti.some(v => v.candidato_id === c.id)
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ValutazioneProva.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mie-valutazioni'] });
      queryClient.invalidateQueries({ queryKey: ['candidati-prova'] });
      setSubmitted(true);
      // Reset form
      setSelectedCandidato(null);
      setRisposte({});
      setNoteAggiuntive('');
      setConsiglioAssunzione('');
    },
  });

  const handleSubmit = () => {
    if (!selectedCandidato || !consiglioAssunzione) {
      alert('Seleziona un candidato e indica il tuo consiglio');
      return;
    }

    // Check required questions
    const missingRequired = activeConfig.domande
      .filter(d => d.obbligatoria)
      .some(d => !risposte[d.testo]);

    if (missingRequired) {
      alert('Rispondi a tutte le domande obbligatorie');
      return;
    }

    const risposteArray = activeConfig.domande.map(d => ({
      domanda: d.testo,
      risposta: risposte[d.testo] || ''
    }));

    createMutation.mutate({
      candidato_id: selectedCandidato.id,
      candidato_nome: `${selectedCandidato.nome} ${selectedCandidato.cognome}`,
      dipendente_id: user.id,
      dipendente_nome: user.nome_cognome || user.full_name,
      prova_data: selectedCandidato.prova_data,
      store_id: selectedCandidato.prova_store_id,
      risposte: risposteArray,
      note_aggiuntive: noteAggiuntive,
      consiglio_assunzione: consiglioAssunzione
    });
  };

  const getStoreName = (storeId) => stores.find(s => s.id === storeId)?.name || '';

  if (!user?.abilitato_prove) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <NeumorphicCard className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Non abilitato</h2>
          <p className="text-slate-600">Non sei abilitato a valutare i candidati delle prove.</p>
        </NeumorphicCard>
      </div>
    );
  }

  if (submitted) {
    setTimeout(() => setSubmitted(false), 2000);
    return (
      <div className="max-w-2xl mx-auto p-6">
        <NeumorphicCard className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Valutazione Inviata!</h2>
          <p className="text-slate-600">Grazie per aver compilato la valutazione.</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          Valutazione Prova
        </h1>
        <p className="text-sm text-slate-500">Valuta i candidati che hanno fatto la prova con te</p>
      </div>

      {candidatiDaValutare.length === 0 ? (
        <NeumorphicCard className="p-8 text-center">
          <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Nessuna valutazione da fare</h2>
          <p className="text-slate-500">Non hai candidati da valutare al momento.</p>
          {valutazioniEsistenti.length > 0 && (
            <p className="text-sm text-slate-400 mt-4">
              Hai già compilato {valutazioniEsistenti.length} valutazion{valutazioniEsistenti.length === 1 ? 'e' : 'i'}.
            </p>
          )}
        </NeumorphicCard>
      ) : (
        <>
          {/* Select Candidato */}
          <NeumorphicCard className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              Seleziona Candidato
            </h2>
            <div className="space-y-2">
              {candidatiDaValutare.map(candidato => (
                <div
                  key={candidato.id}
                  onClick={() => setSelectedCandidato(candidato)}
                  className={`neumorphic-pressed p-4 rounded-xl cursor-pointer transition-all ${
                    selectedCandidato?.id === candidato.id ? 'bg-purple-50 border-2 border-purple-400' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{candidato.nome} {candidato.cognome}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {moment(candidato.prova_data).format('DD/MM/YYYY')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {getStoreName(candidato.prova_store_id)}
                        </span>
                      </div>
                    </div>
                    {selectedCandidato?.id === candidato.id && (
                      <CheckCircle className="w-6 h-6 text-purple-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>

          {/* Questions */}
          {selectedCandidato && activeConfig.domande?.length > 0 && (
            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                Domande di Valutazione
              </h2>
              <div className="space-y-6">
                {activeConfig.domande.map((domanda, index) => (
                  <div key={index} className="neumorphic-flat p-4 rounded-xl">
                    <p className="font-medium text-slate-800 mb-3">
                      {index + 1}. {domanda.testo}
                      {domanda.obbligatoria && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <div className="space-y-2">
                      {domanda.opzioni.map((opzione, i) => (
                        <label
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            risposte[domanda.testo] === opzione
                              ? 'bg-blue-100 border-2 border-blue-400'
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`domanda-${index}`}
                            value={opzione}
                            checked={risposte[domanda.testo] === opzione}
                            onChange={() => setRisposte({ ...risposte, [domanda.testo]: opzione })}
                            className="w-4 h-4"
                          />
                          <span className="text-slate-700">{opzione}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </NeumorphicCard>
          )}

          {/* Final recommendation */}
          {selectedCandidato && (
            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Consiglio Finale</h2>
              
              <div className="mb-4">
                <p className="text-sm text-slate-700 mb-2">Consiglieresti di assumere questo candidato? <span className="text-red-500">*</span></p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConsiglioAssunzione('si')}
                    className={`flex-1 p-3 rounded-xl font-medium transition-all ${
                      consiglioAssunzione === 'si'
                        ? 'bg-green-500 text-white'
                        : 'neumorphic-flat text-slate-700 hover:bg-green-50'
                    }`}
                  >
                    ✓ Sì
                  </button>
                  <button
                    onClick={() => setConsiglioAssunzione('forse')}
                    className={`flex-1 p-3 rounded-xl font-medium transition-all ${
                      consiglioAssunzione === 'forse'
                        ? 'bg-yellow-500 text-white'
                        : 'neumorphic-flat text-slate-700 hover:bg-yellow-50'
                    }`}
                  >
                    ? Forse
                  </button>
                  <button
                    onClick={() => setConsiglioAssunzione('no')}
                    className={`flex-1 p-3 rounded-xl font-medium transition-all ${
                      consiglioAssunzione === 'no'
                        ? 'bg-red-500 text-white'
                        : 'neumorphic-flat text-slate-700 hover:bg-red-50'
                    }`}
                  >
                    ✗ No
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Note aggiuntive (opzionale)</label>
                <textarea
                  value={noteAggiuntive}
                  onChange={(e) => setNoteAggiuntive(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-24 resize-none"
                  placeholder="Aggiungi eventuali note o osservazioni..."
                />
              </div>

              <NeumorphicButton
                onClick={handleSubmit}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Invia Valutazione
              </NeumorphicButton>
            </NeumorphicCard>
          )}
        </>
      )}
    </div>
  );
}