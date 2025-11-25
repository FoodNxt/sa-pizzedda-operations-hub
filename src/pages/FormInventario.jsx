import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Save,
  AlertTriangle,
  Store,
  User
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function FormInventario() {
  const [selectedStore, setSelectedStore] = useState('');
  const [quantities, setQuantities] = useState({});
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['materie-prime-negozio'],
    queryFn: async () => {
      const allProducts = await base44.entities.MateriePrime.filter({ attivo: true });
      return allProducts.filter(p => !p.posizione || p.posizione === 'negozio');
    },
  });

  const handleQuantityChange = (productId, value) => {
    setQuantities(prev => ({
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
      
      const rilevazioni = Object.entries(quantities)
        .filter(([_, qty]) => qty !== '' && qty !== null && qty !== undefined)
        .map(([productId, qty]) => {
          const product = products.find(p => p.id === productId);
          const quantitaRilevata = parseFloat(qty);
          
          return {
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
            note: ''
          };
        });

      await base44.entities.RilevazioneInventario.bulkCreate(rilevazioni);

      setSaveSuccess(true);
      setQuantities({});
      
      
      queryClient.invalidateQueries({ queryKey: ['rilevazioni-inventario'] });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving inventory:', error);
      alert('Errore durante il salvataggio: ' + error.message);
    }

    setSaving(false);
  };

  const productsByCategory = products.reduce((acc, product) => {
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

  

  if (products.length === 0 && !productsLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-4">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Form Inventario
          </h1>
          <p className="text-sm text-slate-500">Compila il questionario per registrare le giacenze</p>
        </div>

        <NeumorphicCard className="p-12 text-center border-2 border-yellow-300">
          <AlertTriangle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Nessun Prodotto Configurato</h2>
          <p className="text-slate-500 mb-4">
            Prima di compilare l'inventario, devi configurare i prodotti nella sezione "Materie Prime"
          </p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          Form Inventario
        </h1>
        <p className="text-sm text-slate-500">Compila il questionario per registrare le giacenze</p>
      </div>

      <NeumorphicCard className="p-4 bg-blue-50 border-2 border-blue-400">
        <p className="text-sm text-blue-800 font-medium">
          📝 Il form deve essere compilato dal cassiere ogni giorno a fine servizio
        </p>
      </NeumorphicCard>

      {saveSuccess && (
        <NeumorphicCard className="p-4 bg-green-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <Save className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Rilevazione salvata con successo! ✅
            </p>
          </div>
        </NeumorphicCard>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Informazioni</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <Store className="w-4 h-4" />
                Locale <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {stores
                  .filter(store => {
                    if (currentUser?.user_type === 'admin' || currentUser?.user_type === 'manager') return true;
                    if (!currentUser?.assigned_stores || currentUser.assigned_stores.length === 0) return false;
                    return currentUser.assigned_stores.includes(store.id);
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
                  ))
                }
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <User className="w-4 h-4" />
                Compilato da
              </label>
              <div className="neumorphic-pressed px-4 py-3 rounded-xl">
                <p className="text-slate-700">
                  {currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'Caricamento...'}
                </p>
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {Object.entries(productsByCategory).map(([categoria, categoryProducts]) => (
          <NeumorphicCard key={categoria} className="p-4 lg:p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {categoriaLabels[categoria] || categoria}
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {categoryProducts.map((product) => {
                return (
                  <div 
                    key={product.id} 
                    className="neumorphic-pressed p-3 lg:p-4 rounded-xl transition-all"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                      <div className="md:col-span-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 text-sm lg:text-base truncate">{product.nome_prodotto}</h3>
                            <p className="text-xs lg:text-sm text-slate-500">
                              {product.unita_misura}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs lg:text-sm font-medium text-slate-700 mb-2 block">
                          Quantità ({product.unita_misura})
                        </label>
                        <input
                          type="number"
                          step={['kg', 'litri', 'grammi', 'ml'].includes(product.unita_misura) ? '0.01' : '1'}
                          min="0"
                          value={quantities[product.id] || ''}
                          onChange={(e) => {
                            let value = e.target.value;
                            // For non-weight units, force integer
                            if (!['kg', 'litri', 'grammi', 'ml'].includes(product.unita_misura) && value !== '') {
                              value = Math.floor(parseFloat(value) || 0).toString();
                            }
                            handleQuantityChange(product.id, value);
                          }}
                          placeholder="0"
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none text-sm lg:text-base text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </NeumorphicCard>
        ))}

        <NeumorphicCard className="p-4 lg:p-6">
          <NeumorphicButton
            type="submit"
            variant="primary"
            className="w-full py-3 lg:py-4 text-base lg:text-lg font-bold flex items-center justify-center gap-3"
            disabled={saving || !selectedStore}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 lg:w-6 lg:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 lg:w-6 lg:h-6" />
                Salva Rilevazione
              </>
            )}
          </NeumorphicButton>


        </NeumorphicCard>
      </form>
    </div>
  );
}