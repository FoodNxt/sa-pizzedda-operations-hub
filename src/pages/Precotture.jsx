import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import VoiceButton from "../components/VoiceButton";
import { Pizza, Clock, AlertCircle, CheckCircle } from "lucide-react";

const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

export default function Precotture() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const turnoId = urlParams.get('turno_id');
  const attivitaId = urlParams.get('attivita_id');
  const attivitaNome = urlParams.get('attivita');
  const preselectedStoreId = urlParams.get('store_id');
  
  const [selectedStore, setSelectedStore] = useState('');
  const [rossePresenti, setRossePresenti] = useState('');
  const [confermato, setConfermato] = useState(false);
  const [mostraRisultato, setMostraRisultato] = useState(false);

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Preselezione store da URL
  useEffect(() => {
    if (preselectedStoreId && !selectedStore) {
      setSelectedStore(preselectedStoreId);
    }
  }, [preselectedStoreId, selectedStore]);

  const confermaMutation = useMutation({
    mutationFn: async (data) => {
      const store = stores.find(s => s.id === selectedStore);
      
      if (!store) {
        throw new Error('Store non trovato');
      }
      
      if (!data || data.error) {
        throw new Error('Risultato del calcolo non valido');
      }
      
      // Estrai parametri URL PRIMA del return
      const urlParams = new URLSearchParams(window.location.search);
      const posizioneTurno = urlParams.get('posizione_turno');
      const oraAttivita = urlParams.get('ora_attivita');
      
      return { 
        rosseDaFare: data.rosseDaFare, 
        rossePresenti: data.rossePresenti,
        rosseRichieste: data.rosseRichieste,
        turno: data.turno, 
        store,
        posizioneTurno,
        oraAttivita
      };
    },
    onSuccess: async (result) => {
       // Salva SEMPRE in PrecottureForm per lo storico compilazioni
       try {
         const precottureFormData = {
           store_id: result.store.id,
           store_name: result.store.name,
           dipendente_id: user.id,
           dipendente_nome: user.nome_cognome || user.full_name,
           data_compilazione: new Date().toISOString(),
           turno: result.turno,
           rosse_presenti: result.rossePresenti,
           rosse_richieste: result.rosseRichieste,
           rosse_da_fare: result.rosseDaFare
         };
         
         console.log('Salvando PrecottureForm:', precottureFormData);
         await base44.entities.PrecottureForm.create(precottureFormData);
       } catch (error) {
         console.error('Errore salvataggio PrecottureForm:', error);
       }

       // Segna SOLO l'attività specifica come completata (usando attivita_id)
       if (attivitaId && user) {
         const attivitaData = {
           attivita_id: attivitaId,
           dipendente_id: user.id,
           dipendente_nome: user.nome_cognome || user.full_name,
           turno_id: turnoId || null,
           turno_data: new Date().toISOString().split('T')[0],
           store_id: result.store.id,
           store_name: result.store.name,
           attivita_nome: decodeURIComponent(attivitaNome) || 'Precotture',
           form_page: 'Precotture',
           completato_at: new Date().toISOString(),
           rosse_da_fare: result.rosseDaFare,
           turno_precotture: result.turno,
           rosse_presenti: result.rossePresenti,
           rosse_richieste: result.rosseRichieste,
           turno: result.turno
         };

         const urlParams = new URLSearchParams(window.location.search);
         const oraAttivita = urlParams.get('ora_attivita');
         if (oraAttivita) attivitaData.ora_attivita = oraAttivita;

         console.log('Salvando attività Precotture:', attivitaData);
         await base44.entities.AttivitaCompletata.create(attivitaData);
       }
      
      setConfermato(true);
      setMostraRisultato(true);
      
      // Invalida le query per forzare il reload
      queryClient.invalidateQueries({ queryKey: ['attivita-completate'] });
      queryClient.invalidateQueries({ queryKey: ['all-form-data-dipendente'] });
      
      // Redirect dopo un delay per permettere il salvataggio
      if (redirectTo) {
        setTimeout(() => {
          navigate(createPageUrl(redirectTo));
        }, 2500);
      }
    },
    onError: (error) => {
      alert('Errore nel salvataggio: ' + error.message);
      console.error('Errore precotture:', error);
    }
  });

  const { data: impasti = [] } = useQuery({
    queryKey: ['gestione-impasti'],
    queryFn: () => base44.entities.GestioneImpasti.list(),
  });

  const { data: configTeglieData = [] } = useQuery({
    queryKey: ['config-teglie'],
    queryFn: () => base44.entities.ConfigurazioneTeglieCalcolo.list()
  });

  const risultato = useMemo(() => {
    if (!selectedStore || rossePresenti === '') return null;

    const ora = new Date().getHours();
    const minuti = new Date().getMinutes();
    const oraDecimale = ora + minuti / 60;
    
    let turno;
    if (oraDecimale >= 9.5 && oraDecimale <= 13) {
      turno = 'pranzo';
    } else if (oraDecimale > 13 && oraDecimale <= 16.5) {
      turno = 'pomeriggio';
    } else if (oraDecimale > 16.5 && oraDecimale <= 22) {
      turno = 'cena';
    } else {
      return { error: 'Fuori orario (le precotture si calcolano dalle 9:30 alle 22:00)' };
    }

    const oggi = new Date().getDay();
    const giornoNome = giorni[oggi];
    
    const storeImpasti = impasti.filter(i => i.store_id === selectedStore || i.store_name === selectedStore);
    const datiOggi = storeImpasti.find(imp => imp.giorno_settimana === giornoNome);

    if (!datiOggi) {
      return { error: 'Nessuna configurazione trovata per oggi' };
    }

    let rosseRichieste = 0;

    if (turno === 'pranzo') {
      rosseRichieste = datiOggi.pranzo_rosse || 0;
    } else if (turno === 'pomeriggio') {
      rosseRichieste = datiOggi.pomeriggio_rosse || 0;
    } else if (turno === 'cena') {
      rosseRichieste = datiOggi.cena_rosse || 0;
    }

    const rosseDaFare = rosseRichieste;

    return {
      turno,
      rosseRichieste,
      rossePresenti: parseInt(rossePresenti),
      rosseDaFare
    };
  }, [selectedStore, rossePresenti, impasti]);

  const getTurnoLabel = (turno) => {
    if (turno === 'pranzo') return 'Pranzo (9:30 - 13:00)';
    if (turno === 'pomeriggio') return 'Pomeriggio (13:01 - 16:30)';
    if (turno === 'cena') return 'Cena (16:31 - 22:00)';
    return '';
  };

  return (
    <ProtectedPage pageName="Precotture">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Calcolo Precotture
          </h1>
          <p className="text-slate-500 mt-1">Calcola quante precotture preparare</p>
        </div>

        <NeumorphicCard className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Seleziona Negozio
            </label>
            <div className="flex flex-wrap gap-2">
              {stores
                .filter(store => {
                  if (user?.user_type === 'admin' || user?.user_type === 'manager') return true;
                  if (!user?.assigned_stores || user.assigned_stores.length === 0) return false;
                  return user.assigned_stores.includes(store.id);
                })
                .map(store => (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => setSelectedStore(store.id)}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      selectedStore === store.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'neumorphic-flat text-slate-700 hover:shadow-md'
                    }`}
                  >
                    {store.name}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Precotture Rosse Presenti
              </label>
              <VoiceButton text="Inserisci il numero di precotture rosse presenti" />
            </div>
            <input
              type="number"
              min="0"
              value={rossePresenti}
              onChange={(e) => setRossePresenti(e.target.value)}
              placeholder="0"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
            />
          </div>

          {selectedStore && rossePresenti !== '' && risultato && !risultato.error && !confermato && (
           <NeumorphicButton
             onClick={() => {
               setMostraRisultato(true);
               confermaMutation.mutate(risultato);
             }}
              variant="primary"
              className="w-full flex items-center justify-center gap-2 mt-4"
              disabled={confermaMutation.isPending}
            >
              {confermaMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Salva e Conferma
                </>
              )}
            </NeumorphicButton>
          )}
        </NeumorphicCard>

        {mostraRisultato && confermato && risultato && (
          <>
            {risultato.error ? (
              <NeumorphicCard className="p-6 bg-orange-50 border-2 border-orange-400">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                  <p className="text-orange-800 font-medium">{risultato.error}</p>
                </div>
              </NeumorphicCard>
            ) : (
              <NeumorphicCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Turno Attuale</h2>
                    <p className="text-sm text-slate-500">{getTurnoLabel(risultato.turno)}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="neumorphic-pressed p-4 rounded-xl bg-red-50">
                    <p className="text-xs text-slate-500 mb-1">Richieste Rosse</p>
                    <p className="text-2xl font-bold text-red-700">{risultato.rosseRichieste}</p>
                  </div>

                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Già presenti Rosse</p>
                    <p className="text-xl font-bold text-slate-700">{risultato.rossePresenti}</p>
                  </div>
                </div>

                <div className="neumorphic-card p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400">
                  <div className="flex items-center gap-3 mb-3">
                    <Pizza className="w-6 h-6 text-green-700" />
                    <p className="text-sm font-medium text-green-700">Prepara Precotture Rosse</p>
                  </div>
                  
                  <p className="text-4xl font-bold text-green-800">{risultato.rosseDaFare}</p>
                  <p className="text-xs text-green-600 mt-2">Prepara questa quantità totale</p>
                </div>
              </NeumorphicCard>
            )}
          </>
        )}

        <NeumorphicCard className="p-4 bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">⏰ Orari Turni</p>
              <ul className="text-xs space-y-1">
                <li>• Pranzo: 9:30 - 13:00</li>
                <li>• Pomeriggio: 13:01 - 16:30</li>
                <li>• Cena: 16:31 - 22:00</li>
              </ul>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}