import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Save,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Store,
  Calendar,
  User
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function InventarioAdmin() {
  const [selectedStore, setSelectedStore] = useState('');
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const { data: latestRilevazioni = [] } = useQuery({
    queryKey: ['latest-rilevazioni', selectedStore],
    queryFn: async () => {
      if (!selectedStore) return [];
      const ril = await base44.entities.RilevazioneInventario.list('-data_rilevazione', 100);
      return ril.filter(r => r.store_id === selectedStore);
    },
    enabled: !!selectedStore
  });

  const { data: latestRilevazioniCantina = [] } = useQuery({
    queryKey: ['latest-rilevazioni-cantina', selectedStore],
    queryFn: async () => {
      if (!selectedStore) return [];
      const ril = await base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione', 100);
      return ril.filter(r => r.store_id === selectedStore);
    },
    enabled: !!selectedStore
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Pre-fill form with latest values
    const initialData = {};
    
    materiePrime.forEach(mp => {
      const latestRil = latestRilevazioni.find(r => r.prodotto_id === mp.id);
      const latestRilCantina = latestRilevazioniCantina.find(r => r.prodotto_id === mp.id);
      
      if (mp.posizione === 'negozio' && latestRil) {
        initialData[mp.id] = latestRil.quantita_rilevata;
      } else if (mp.posizione === 'cantina' && latestRilCantina) {
        initialData[mp.id] = latestRilCantina.quantita_rilevata;
      } else {
        initialData[mp.id] = '';
      }
    });
    
    setFormData(initialData);
  }, [materiePrime, latestRilevazioni, latestRilevazioniCantina, selectedStore]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedStore) {
      alert('Seleziona un negozio');
      return;
    }

    setSaving(true);
    setSuccess('');

    try {
      const now = new Date().toISOString();
      const userName = currentUser?.nome_cognome || currentUser?.full_name || 'Amministratore';

      // Save to both entities based on posizione
      for (const [prodottoId, quantita] of Object.entries(formData)) {
        if (quantita === '' || quantita === null) continue;

        const materiaPrima = materiePrime.find(mp => mp.id === prodottoId);
        if (!materiaPrima) continue;

        // Skip if not assigned to this store
        if (materiaPrima.assigned_stores && materiaPrima.assigned_stores.length > 0) {
          if (!materiaPrima.assigned_stores.includes(selectedStore)) continue;
        }

        const minQuantity = materiaPrima.store_specific_min_quantities?.[selectedStore] || materiaPrima.quantita_minima;

        const rilevazioneData = {
          store_name: stores.find(s => s.id === selectedStore)?.name || '',
          store_id: selectedStore,
          data_rilevazione: now,
          rilevato_da: userName,
          prodotto_id: materiaPrima.id,
          nome_prodotto: materiaPrima.nome_prodotto,
          quantita_rilevata: parseFloat(quantita),
          unita_misura: materiaPrima.unita_misura,
          quantita_minima: minQuantity,
          sotto_minimo: parseFloat(quantita) < minQuantity
        };

        // Save to appropriate entity
        if (materiaPrima.posizione === 'cantina') {
          await base44.entities.RilevazioneInventarioCantina.create(rilevazioneData);
        } else {
          await base44.entities.RilevazioneInventario.create(rilevazioneData);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['latest-rilevazioni'] });
      queryClient.invalidateQueries({ queryKey: ['latest-rilevazioni-cantina'] });

      setSuccess('✅ Inventario salvato con successo!');
      setTimeout(() => setSuccess(''), 5000);

    } catch (error) {
      console.error('Error saving:', error);
      alert('Errore nel salvataggio: ' + error.message);
    }

    setSaving(false);
  };

  const getMinQuantityForStore = (materiaPrima) => {
    if (!selectedStore) return materiaPrima.quantita_minima;
    return materiaPrima.store_specific_min_quantities?.[selectedStore] || materiaPrima.quantita_minima;
  };

  const negozioProducts = materiePrime
    .filter(mp => mp.attivo !== false && mp.posizione === 'negozio')
    .filter(mp => !mp.assigned_stores || mp.assigned_stores.length === 0 || mp.assigned_stores.includes(selectedStore));

  const cantinaProducts = materiePrime
    .filter(mp => mp.attivo !== false && mp.posizione === 'cantina')
    .filter(mp => !mp.assigned_stores || mp.assigned_stores.length === 0 || mp.assigned_stores.includes(selectedStore));

  const allProducts = [...negozioProducts, ...cantinaProducts];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Package className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Inventario Admin</h1>
        </div>
        <p className="text-[#9b9b9b]">
          Form completo che include prodotti da Negozio e Cantina
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        </NeumorphicCard>
      )}

      {/* Store Selection */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">Seleziona Negozio</h2>
        </div>
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          required
        >
          <option value="">-- Seleziona negozio --</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>
              {store.name} - {store.address}
            </option>
          ))}
        </select>
      </NeumorphicCard>

      {selectedStore && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Card */}
          <NeumorphicCard className="p-6 bg-blue-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Negozio selezionato:</strong> {stores.find(s => s.id === selectedStore)?.name}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Questo form include {negozioProducts.length} prodotti da Negozio e {cantinaProducts.length} prodotti da Cantina
                </p>
              </div>
            </div>
          </NeumorphicCard>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NeumorphicCard className="p-6 text-center">
              <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Package className="w-8 h-8 text-[#8b7355]" />
              </div>
              <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{allProducts.length}</h3>
              <p className="text-sm text-[#9b9b9b]">Prodotti Totali</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-6 text-center">
              <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold text-blue-600 mb-1">{negozioProducts.length}</h3>
              <p className="text-sm text-[#9b9b9b]">Prodotti Negozio</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-6 text-center">
              <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <TrendingDown className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-3xl font-bold text-purple-600 mb-1">{cantinaProducts.length}</h3>
              <p className="text-sm text-[#9b9b9b]">Prodotti Cantina</p>
            </NeumorphicCard>
          </div>

          {/* Negozio Section */}
          {negozioProducts.length > 0 && (
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-[#6b6b6b] mb-6 flex items-center gap-2">
                🏪 Prodotti Negozio ({negozioProducts.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {negozioProducts.map((mp) => {
                  const minQuantity = getMinQuantityForStore(mp);
                  const currentValue = parseFloat(formData[mp.id]) || 0;
                  const isUnderMin = currentValue > 0 && currentValue < minQuantity;

                  return (
                    <div key={mp.id} className={`neumorphic-pressed p-4 rounded-xl ${isUnderMin ? 'border-2 border-red-400' : ''}`}>
                      <label className="block mb-2">
                        <span className="font-medium text-[#6b6b6b]">{mp.nome_prodotto}</span>
                        <span className="text-xs text-[#9b9b9b] ml-2">
                          (Min: {minQuantity} {mp.unita_misura})
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={formData[mp.id] || ''}
                          onChange={(e) => setFormData({ ...formData, [mp.id]: e.target.value })}
                          placeholder="0"
                          className="flex-1 neumorphic-pressed px-4 py-2 rounded-lg text-[#6b6b6b] outline-none"
                        />
                        <span className="text-sm text-[#9b9b9b]">{mp.unita_misura}</span>
                      </div>
                      {isUnderMin && (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Sotto il minimo!
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </NeumorphicCard>
          )}

          {/* Cantina Section */}
          {cantinaProducts.length > 0 && (
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-[#6b6b6b] mb-6 flex items-center gap-2">
                📦 Prodotti Cantina ({cantinaProducts.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cantinaProducts.map((mp) => {
                  const minQuantity = getMinQuantityForStore(mp);
                  const currentValue = parseFloat(formData[mp.id]) || 0;
                  const isUnderMin = currentValue > 0 && currentValue < minQuantity;

                  return (
                    <div key={mp.id} className={`neumorphic-pressed p-4 rounded-xl ${isUnderMin ? 'border-2 border-red-400' : ''}`}>
                      <label className="block mb-2">
                        <span className="font-medium text-[#6b6b6b]">{mp.nome_prodotto}</span>
                        <span className="text-xs text-[#9b9b9b] ml-2">
                          (Min: {minQuantity} {mp.unita_misura})
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={formData[mp.id] || ''}
                          onChange={(e) => setFormData({ ...formData, [mp.id]: e.target.value })}
                          placeholder="0"
                          className="flex-1 neumorphic-pressed px-4 py-2 rounded-lg text-[#6b6b6b] outline-none"
                        />
                        <span className="text-sm text-[#9b9b9b]">{mp.unita_misura}</span>
                      </div>
                      {isUnderMin && (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Sotto il minimo!
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </NeumorphicCard>
          )}

          {/* Submit Button */}
          <NeumorphicButton
            type="submit"
            variant="primary"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salva Inventario Completo
              </>
            )}
          </NeumorphicButton>
        </form>
      )}

      {!selectedStore && (
        <NeumorphicCard className="p-12 text-center">
          <Store className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Seleziona un Negozio</h3>
          <p className="text-[#9b9b9b]">Scegli un negozio per iniziare la rilevazione inventario</p>
        </NeumorphicCard>
      )}
    </div>
  );
}