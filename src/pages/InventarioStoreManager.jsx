import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Save, MapPin, Search, AlertCircle, Info } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function InventarioStoreManager() {
  const [selectedStore, setSelectedStore] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState({});
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const filteredStores = currentUser?.assigned_stores?.length > 0
    ? stores.filter(s => currentUser.assigned_stores.includes(s.id))
    : stores;

  const prodottiStore = materiePrime.filter(p => {
    if (!selectedStore) return false;
    if (p.assigned_stores && p.assigned_stores.length > 0) {
      return p.assigned_stores.includes(selectedStore);
    }
    return true;
  });

  const prodottiFiltrati = prodottiStore.filter(p =>
    p.nome_prodotto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const prodottiNegozio = prodottiFiltrati.filter(p => {
    const posizione = p.store_specific_positions?.[selectedStore] || p.posizione || 'negozio';
    return posizione === 'negozio';
  });

  const prodottiCantina = prodottiFiltrati.filter(p => {
    const posizione = p.store_specific_positions?.[selectedStore] || p.posizione || 'negozio';
    return posizione === 'cantina';
  });

  const handleQuantityChange = (prodottoId, value) => {
    setQuantities(prev => ({
      ...prev,
      [prodottoId]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedStore) {
      alert('Seleziona un locale');
      return;
    }

    setSaving(true);

    try {
      const user = await base44.auth.me();
      const store = stores.find(s => s.id === selectedStore);

      for (const [prodottoId, quantita] of Object.entries(quantities)) {
        if (quantita !== undefined && quantita !== '') {
          const prodotto = materiePrime.find(p => p.id === prodottoId);
          const posizione = prodotto.store_specific_positions?.[selectedStore] || prodotto.posizione || 'negozio';
          const quantitaMinima = prodotto.store_specific_min_quantities?.[selectedStore] || prodotto.quantita_minima || 0;

          if (posizione === 'negozio') {
            await base44.entities.RilevazioneInventario.create({
              store_name: store.name,
              store_id: selectedStore,
              data_rilevazione: new Date().toISOString(),
              rilevato_da: user.nome_cognome || user.full_name || user.email,
              prodotto_id: prodottoId,
              nome_prodotto: prodotto.nome_prodotto,
              quantita_rilevata: parseFloat(quantita),
              unita_misura: prodotto.unita_misura,
              quantita_minima: quantitaMinima,
              sotto_minimo: parseFloat(quantita) < quantitaMinima
            });
          } else {
            await base44.entities.RilevazioneInventarioCantina.create({
              store_name: store.name,
              store_id: selectedStore,
              data_rilevazione: new Date().toISOString(),
              rilevato_da: user.nome_cognome || user.full_name || user.email,
              prodotto_id: prodottoId,
              nome_prodotto: prodotto.nome_prodotto,
              quantita_rilevata: parseFloat(quantita),
              unita_misura: prodotto.unita_misura,
              quantita_minima: quantitaMinima,
              sotto_minimo: parseFloat(quantita) < quantitaMinima
            });
          }
        }
      }

      alert('Inventario salvato con successo!');
      setQuantities({});
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
    } catch (error) {
      console.error('Error saving inventory:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          Inventario Store Manager
        </h1>
        <p className="text-sm text-slate-500">Inventario preciso - Negozio e Cantina</p>
      </div>

      <NeumorphicCard className="p-4 bg-orange-50 border-2 border-orange-300 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            <p className="font-bold mb-1">⚠️ IMPORTANTE - Inventario Preciso</p>
            <p className="text-xs">
              Conta le <strong>singole unità</strong> di ogni prodotto, NON le confezioni/casse intere.
            </p>
            <p className="text-xs mt-1">
              Esempio: se hai 2 casse da 6 bottiglie ciascuna, inserisci <strong>12</strong> (non 2).
            </p>
          </div>
        </div>
      </NeumorphicCard>

      <NeumorphicCard className="p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Seleziona Locale
            </label>
            <select
              value={selectedStore}
              onChange={(e) => {
                setSelectedStore(e.target.value);
                setQuantities({});
              }}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
            >
              <option value="">-- Seleziona Locale --</option>
              {filteredStores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          {selectedStore && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Cerca Prodotto
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca per nome..."
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                />
              </div>

              {prodottiNegozio.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Prodotti Negozio ({prodottiNegozio.length})
                  </h3>
                  <div className="space-y-2">
                    {prodottiNegozio.map(prodotto => (
                      <div key={prodotto.id} className="neumorphic-flat p-3 rounded-lg">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{prodotto.nome_prodotto}</p>
                            <p className="text-xs text-slate-500">
                              Min: {prodotto.store_specific_min_quantities?.[selectedStore] || prodotto.quantita_minima} {prodotto.unita_misura}
                            </p>
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              step="0.01"
                              value={quantities[prodotto.id] || ''}
                              onChange={(e) => handleQuantityChange(prodotto.id, e.target.value)}
                              placeholder="Qtà"
                              className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {prodottiCantina.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 mt-6">
                    <Package className="w-5 h-5 text-purple-600" />
                    Prodotti Cantina ({prodottiCantina.length})
                  </h3>
                  <div className="space-y-2">
                    {prodottiCantina.map(prodotto => (
                      <div key={prodotto.id} className="neumorphic-flat p-3 rounded-lg">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{prodotto.nome_prodotto}</p>
                            <p className="text-xs text-slate-500">
                              Min: {prodotto.store_specific_min_quantities?.[selectedStore] || prodotto.quantita_minima} {prodotto.unita_misura}
                            </p>
                            {prodotto.unita_per_confezione && (
                              <p className="text-xs text-blue-600 mt-1">
                                <Info className="w-3 h-3 inline mr-1" />
                                Conta singole unità (1 conf = {prodotto.unita_per_confezione} unità)
                              </p>
                            )}
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              step={['kg', 'litri', 'grammi', 'ml'].includes(prodotto.unita_misura) ? '0.01' : '1'}
                              min="0"
                              value={quantities[prodotto.id] || ''}
                              onChange={(e) => handleQuantityChange(prodotto.id, e.target.value)}
                              placeholder="Unità"
                              className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <NeumorphicButton
                  onClick={handleSave}
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={saving || Object.keys(quantities).length === 0}
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salva Inventario
                    </>
                  )}
                </NeumorphicButton>
              </div>
            </>
          )}
        </div>
      </NeumorphicCard>

      {selectedStore && (prodottiNegozio.length === 0 && prodottiCantina.length === 0) && (
        <NeumorphicCard className="p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun prodotto trovato per questo locale</p>
        </NeumorphicCard>
      )}
    </div>
  );
}