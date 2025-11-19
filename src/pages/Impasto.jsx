import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { ChefHat, Calculator, AlertCircle } from "lucide-react";

const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

export default function Impasto() {
  const [selectedStore, setSelectedStore] = useState('');
  const [pallinePresenti, setPallinePresenti] = useState('');

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

  const risultato = useMemo(() => {
    if (!selectedStore || !pallinePresenti) return null;

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

    const impastoNecessario = totaleProssimi3Giorni - parseInt(pallinePresenti);
    return {
      totaleProssimi3Giorni,
      pallinePresenti: parseInt(pallinePresenti),
      impastoNecessario: Math.max(0, impastoNecessario)
    };
  }, [selectedStore, pallinePresenti, impasti]);

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
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
            >
              <option value="">-- Seleziona --</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Numero Palline Presenti
            </label>
            <input
              type="number"
              min="0"
              value={pallinePresenti}
              onChange={(e) => setPallinePresenti(e.target.value)}
              placeholder="Inserisci numero palline"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
            />
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
                <p className="text-sm text-slate-500 mb-1">Palline già presenti</p>
                <p className="text-2xl font-bold text-slate-800">{risultato.pallinePresenti} palline</p>
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

        <NeumorphicCard className="p-4 bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ℹ️ Come funziona</p>
              <p className="text-xs">
                Il sistema calcola automaticamente quanto impasto serve per i prossimi 3 giorni
                e sottrae le palline già presenti in negozio.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}