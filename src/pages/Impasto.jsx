import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { ChefHat, Calculator, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

export default function Impasto() {
  const [selectedStore, setSelectedStore] = useState('');
  const [barelleInFrigo, setBarelleInFrigo] = useState('');
  const [calcoloConfermato, setCalcoloConfermato] = useState(false);
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: impasti = [] } = useQuery({
    queryKey: ['gestione-impasti'],
    queryFn: () => base44.entities.GestioneImpasti.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: ricettaIngredienti = [] } = useQuery({
    queryKey: ['ricetta-impasto'],
    queryFn: () => base44.entities.RicettaImpasto.list(),
  });

  const sortedIngredienti = [...ricettaIngredienti].filter(i => i.attivo !== false).sort((a, b) => (a.ordine || 0) - (b.ordine || 0));

  const logMutation = useMutation({
    mutationFn: (data) => base44.entities.CalcoloImpastoLog.create(data),
    onSuccess: () => {
      setCalcoloConfermato(true);
    },
  });

  const risultato = useMemo(() => {
    if (!selectedStore || !barelleInFrigo) return null;

    const oggi = new Date().getDay();
    const storeImpasti = impasti.filter(i => i.store_id === selectedStore || i.store_name === selectedStore);

    let totaleProssimi3Giorni = 0;
    for (let i = 0; i < 3; i++) {
      const giornoIdx = (oggi + i) % 7;
      const giornoNome = giorni[giornoIdx];
      const data = storeImpasti.find(imp => imp.giorno_settimana === giornoNome);
      
      if (data) {
        totaleProssimi3Giorni += 
          (data.pranzo_bianche || 0) + (data.pranzo_rosse || 0) +
          (data.pomeriggio_bianche || 0) + (data.pomeriggio_rosse || 0) +
          (data.cena_bianche || 0) + (data.cena_rosse || 0);
      }
    }

    const pallinePresenti = parseInt(barelleInFrigo) * 6;
    const impastoNecessario = totaleProssimi3Giorni - pallinePresenti;
    
    // Calcola ingredienti necessari
    const ingredientiNecessari = sortedIngredienti.map(ing => ({
      ...ing,
      quantita_totale: ing.quantita_per_pallina * Math.max(0, impastoNecessario)
    }));

    return {
      totaleProssimi3Giorni,
      barelleInFrigo: parseInt(barelleInFrigo),
      pallinePresenti,
      impastoNecessario: Math.max(0, impastoNecessario),
      ingredientiNecessari
    };
  }, [selectedStore, barelleInFrigo, impasti, sortedIngredienti]);

  const handleCalcolaImpasto = async () => {
    if (!risultato) return;
    
    const store = stores.find(s => s.id === selectedStore);
    await logMutation.mutateAsync({
      store_id: selectedStore,
      store_name: store?.name || '',
      data_calcolo: new Date().toISOString(),
      operatore: user?.full_name || user?.email || '',
      barelle_in_frigo: risultato.barelleInFrigo,
      palline_presenti: risultato.pallinePresenti,
      fabbisogno_3_giorni: risultato.totaleProssimi3Giorni,
      impasto_suggerito: risultato.impastoNecessario
    });
  };

  // Reset conferma quando cambiano i dati
  const handleStoreChange = (storeId) => {
    setSelectedStore(storeId);
    setCalcoloConfermato(false);
  };

  const handleBarelleChange = (value) => {
    setBarelleInFrigo(value);
    setCalcoloConfermato(false);
  };

  return (
    <ProtectedPage pageName="Impasto">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Calcolo Impasto
          </h1>
          <p className="text-slate-500 mt-1">Calcola quanto impasto preparare</p>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Numero Barelle in frigo
            </label>
            <input
              type="number"
              min="0"
              value={barelleInFrigo}
              onChange={(e) => setBarelleInFrigo(e.target.value)}
              placeholder="Inserisci numero barelle"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">Ogni barella contiene 6 palline</p>
          </div>
        </NeumorphicCard>

        {risultato && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Risultato</h2>
            </div>

            <div className="space-y-3">
              <div className="neumorphic-pressed p-4 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">Fabbisogno prossimi 3 giorni</p>
                <p className="text-2xl font-bold text-slate-800">{risultato.totaleProssimi3Giorni} palline</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">Barelle in frigo</p>
                <p className="text-2xl font-bold text-slate-800">{risultato.barelleInFrigo} barelle</p>
                <p className="text-sm text-slate-500 mt-1">= {risultato.pallinePresenti} palline</p>
              </div>

              <div className="neumorphic-card p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400">
                <div className="flex items-center gap-3 mb-2">
                  <ChefHat className="w-6 h-6 text-green-700" />
                  <p className="text-sm font-medium text-green-700">Impasto da preparare</p>
                </div>
                <p className="text-4xl font-bold text-green-800">{risultato.impastoNecessario}</p>
                <p className="text-sm text-green-600 mt-1">palline di impasto</p>
              </div>
            </div>
          </NeumorphicCard>
        )}

        <NeumorphicCard className="p-4 bg-orange-50 border-2 border-orange-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-bold mb-1">⚠️ IMPORTANTE</p>
              <p className="text-xs mb-2">
                Il numero di barelle deve essere contato <strong>DOPO</strong> aver spallinato l'impasto presente in frigo.
              </p>
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4 bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ℹ️ Come funziona</p>
              <p className="text-xs">
                Il sistema calcola automaticamente quanto impasto serve per i prossimi 3 giorni
                e sottrae le palline già presenti in negozio (6 palline per barella).
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}