
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Save,
  AlertTriangle,
  CheckCircle,
  Store,
  User,
  Package,
  TrendingDown
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function InventarioAdmin() {
  const [selectedStore, setSelectedStore] = useState('');
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

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

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  // Load ALL products (both negozio and cantina)
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['materie-prime-all'],
    queryFn: async () => {
      const allProducts = await base44.entities.MateriePrime.filter({ attivo: true });
      return allProducts.sort((a, b) => {
        // Sort: negozio first, then cantina
        if (a.posizione === 'negozio' && b.posizione === 'cantina') return -1;
        if (a.posizione === 'cantina' && b.posizione === 'negozio') return 1;
        return 0;
      });
    },
  });

  const handleQuantityChange = (productId, value) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const handleNoteChange = (productId, value) => {
    setNotes(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStore) {
      alert('Seleziona un locale');
      return;
    }

    if (Object.keys(quantities).length === 0) {
      alert('Inserisci almeno una quantità');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const store = stores.find(s => s.id === selectedStore);
      const now = new Date().toISOString();
      
      const rilevazioniNegozio = [];
      const rilevazioniCantina = [];

      Object.entries(quantities)
        .filter(([_, qty]) => qty !== '' && qty !== null && qty !== undefined)
        .forEach(([productId, qty]) => {
          const product = products.find(p => p.id === productId);
          if (!product) return;

          const quantitaRilevata = parseFloat(qty);
          
          const rilevazione = {
            store_name: store.name,
            store_id: store.id,
            data_rilevazione: now,
            rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'N/A',
            prodotto_id: productId,
            nome_prodotto: product.nome_prodotto,
            quantita_rilevata: quantitaRilevata,
            unita_misura: product.unita_misura,
            quantita_minima: product.quantita_minima,
            sotto_minimo: quantitaRilevata < product.quantita_minima,
            note: notes[productId] || ''
          };

          if (product.posizione === 'cantina') {
            rilevazioniCantina.push(rilevazione);
          } else {
            rilevazioniNegozio.push(rilevazione);
          }
        });

      // Save to both entities
      if (rilevazioniNegozio.length > 0) {
        await base44.entities.RilevazioneInventario.bulkCreate(rilevazioniNegozio);
      }
      if (rilevazioniCantina.length > 0) {
        await base44.entities.RilevazioneInventarioCantina.bulkCreate(rilevazioniCantina);
      }

      setSaveSuccess(true);
      setQuantities({});
      setNotes({});
      
      queryClient.invalidateQueries({ queryKey: ['rilevazioni-inventario'] });
      queryClient.invalidateQueries({ queryKey: ['rilevazioni-inventario-cantina'] });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving inventory:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    }

    setSaving(false);
  };

  const productsByPosizione = products.reduce((acc, product) => {
    const pos = product.posizione || 'negozio';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(product);
    return acc;
  }, {});

  const getTotalProducts = () => products.length;
  const getCompletedProducts = () => 
    Object.values(quantities).filter(q => q !== '' && q !== null && q !== undefined).length;
  const getSottoMinimo = () => 
    Object.entries(quantities)
      .filter(([productId, qty]) => {
        const product = products.find(p => p.id === productId);
        return product && parseFloat(qty) < product.quantita_minima;
      }).length;

  if (products.length === 0 && !productsLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Inventario Admin</h1>
          <p className="text-[#9b9b9b]">Form completo per inventario negozio + cantina</p>
        </div>

        <NeumorphicCard className="p-12 text-center border-2 border-yellow-300">
          <AlertTriangle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessun Prodotto Configurato</h2>
          <p className="text-[#9b9b9b] mb-4">
            Prima di compilare l'inventario, devi configurare i prodotti nella sezione "Inventario"
          </p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          Inventario Admin
        </h1>
        <p className="text-sm text-slate-500">Form completo: negozio + cantina</p>
      </div>

      {saveSuccess && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Rilevazione salvata! ✅
            </p>
          </div>
        </NeumorphicCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
              {getCompletedProducts()} / {getTotalProducts()}
            </h3>
            <p className="text-xs text-slate-500">Compilati</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <TrendingDown className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-red-600 mb-1">
              {getSottoMinimo()}
            </h3>
            <p className="text-xs text-slate-500">Sotto Minimo</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-green-600 mb-1">
              {getCompletedProducts() - getSottoMinimo()}
            </h3>
            <p className="text-xs text-slate-500">Sopra Minimo</p>
          </div>
        </NeumorphicCard>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Informazioni Rilevazione</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Store className="w-4 h-4" />
                Locale <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                required
              >
                <option value="">Seleziona locale...</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <User className="w-4 h-4" />
                Rilevato da
              </label>
              <div className="neumorphic-pressed px-4 py-3 rounded-xl">
                <p className="text-[#6b6b6b]">
                  {currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'Caricamento...'}
                </p>
              </div>
            </div>
          </div>

          <div className="neumorphic-pressed p-3 rounded-xl mt-4 bg-blue-50">
            <p className="text-xs text-blue-800">
              ℹ️ Questo form include TUTTI i prodotti (negozio + cantina). La data e l'ora verranno registrate automaticamente.
            </p>
          </div>
        </NeumorphicCard>

        {/* Products by Position */}
        {Object.entries(productsByPosizione).map(([posizione, posizioneProducts]) => {
          // Group by category
          const byCategory = posizioneProducts.reduce((acc, product) => {
            const cat = product.categoria || 'altro';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(product);
            return acc;
          }, {});

          const categoriaLabels = {
            ingredienti: 'Ingredienti Base',
            condimenti: 'Condimenti',
            verdure: 'Verdure e Salse',
            latticini: 'Latticini',
            dolci: 'Dolci',
            bevande: 'Bevande',
            pulizia: 'Pulizia',
            altro: 'Altro'
          };

          return (
            <div key={posizione}>
              {/* Position Header */}
              <NeumorphicCard className="p-4 mb-4">
                <h2 className="text-2xl font-bold text-[#6b6b6b] flex items-center gap-3">
                  {posizione === 'cantina' ? '📦 Cantina' : '🏪 Negozio'}
                  <span className="text-sm font-normal text-[#9b9b9b]">
                    ({posizioneProducts.length} prodotti)
                  </span>
                </h2>
              </NeumorphicCard>

              {/* Products by Category */}
              {Object.entries(byCategory).map(([categoria, categoryProducts]) => (
                <NeumorphicCard key={categoria} className="p-6 mb-4">
                  <h3 className="text-xl font-bold text-[#6b6b6b] mb-6">
                    {categoriaLabels[categoria] || categoria}
                    <span className="ml-2 text-sm font-normal text-[#9b9b9b]">
                      ({categoryProducts.length} prodotti)
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    {categoryProducts.map((product) => {
                      const currentQty = parseFloat(quantities[product.id]);
                      const isUnderMinimum = !isNaN(currentQty) && currentQty < product.quantita_minima;
                      
                      return (
                        <div 
                          key={product.id} 
                          className={`neumorphic-pressed p-4 rounded-xl transition-all ${
                            isUnderMinimum ? 'border-2 border-red-300 bg-red-50' : ''
                          }`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-bold text-[#6b6b6b]">{product.nome_prodotto}</h4>
                                  <p className="text-sm text-[#9b9b9b]">
                                    Min: {product.quantita_minima} {product.unita_misura}
                                  </p>
                                </div>
                                {isUnderMinimum && (
                                  <AlertTriangle className="w-5 h-5 text-red-600 ml-2 flex-shrink-0" />
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                                Quantità Attuale ({product.unita_misura})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={quantities[product.id] || ''}
                                onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                placeholder="0"
                                className={`w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none ${
                                  isUnderMinimum ? 'text-red-600 font-bold' : 'text-[#6b6b6b]'
                                }`}
                              />
                              {isUnderMinimum && (
                                <p className="text-xs text-red-600 mt-1 font-medium">
                                  ⚠️ Sotto il minimo di {product.quantita_minima}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                                Note (opzionale)
                              </label>
                              <input
                                type="text"
                                value={notes[product.id] || ''}
                                onChange={(e) => handleNoteChange(product.id, e.target.value)}
                                placeholder="es. Da ordinare..."
                                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </NeumorphicCard>
              ))}
            </div>
          );
        })}

        <NeumorphicCard className="p-6">
          <NeumorphicButton
            type="submit"
            variant="primary"
            className="w-full py-4 text-lg font-bold flex items-center justify-center gap-3"
            disabled={saving || !selectedStore}
          >
            {saving ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvataggio in corso...
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                Salva Rilevazione Completa
              </>
            )}
          </NeumorphicButton>

          {getSottoMinimo() > 0 && (
            <div className="neumorphic-pressed p-4 rounded-xl mt-4 bg-yellow-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-bold mb-1">Attenzione!</p>
                  <p>
                    Hai {getSottoMinimo()} prodotti sotto la quantità minima. 
                    Considera di effettuare un ordine al più presto.
                  </p>
                </div>
              </div>
            </div>
          )}
        </NeumorphicCard>
      </form>
    </div>
  );
}
