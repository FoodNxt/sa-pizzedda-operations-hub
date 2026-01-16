import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');
  const preselectedStoreId = urlParams.get('store_id');
  
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
      
      // Preselezione store da URL parameter
      if (preselectedStoreId) {
        setSelectedStore(preselectedStoreId);
      }
    };
    fetchUser();
  }, [preselectedStoreId]);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['materie-prime-negozio'],
    queryFn: async () => {
      const allProducts = await base44.entities.MateriePrime.filter({ attivo: true });
      return allProducts.filter(p => !p.posizione || p.posizione === 'negozio');
    },
  });

  // Filter products by selected store - only show products "in uso" and one per nome_interno
  const products = React.useMemo(() => {
    if (!selectedStore) return allProducts;
    
    // First filter by store and in_uso status
    const filteredByStore = allProducts.filter(p => {
      // Check if product is "in uso" for this specific store
      if (p.in_uso_per_store && p.in_uso_per_store[selectedStore] === false) {
        return false;
      }
      
      // If assigned_stores is defined and not empty, check if store is included
      if (p.assigned_stores && p.assigned_stores.length > 0) {
        return p.assigned_stores.includes(selectedStore);
      }
      
      return true;
    });
    
    // Then keep only one product per nome_interno (prioritize products with in_uso_per_store[selectedStore] = true)
    const uniqueProducts = filteredByStore.reduce((acc, product) => {
      const existing = acc.find(p => p.nome_interno === product.nome_interno);
      if (!existing) {
        acc.push(product);
      } else {
        // If exists, prioritize the one with in_uso_per_store[selectedStore] = true
        if (product.in_uso_per_store?.[selectedStore] === true && existing.in_uso_per_store?.[selectedStore] !== true) {
          const index = acc.indexOf(existing);
          acc[index] = product;
        }
      }
      return acc;
    }, []);
    
    return uniqueProducts;
  }, [allProducts, selectedStore]);

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
      
      console.log('=== INIZIO SUBMIT INVENTARIO ===');
      
      const rilevazioni = [];
      for (const [productId, qty] of Object.entries(quantities)) {
        if (qty === '' || qty === null || qty === undefined) continue;
        
        const product = products.find(p => p.id === productId);
        if (!product) continue;
        
        const quantitaRilevata = parseFloat(qty);
        const rilevazione = {
          store_name: store.name,
          store_id: store.id,
          data_rilevazione: now,
          rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email || 'Operatore',
          prodotto_id: productId,
          nome_prodotto: product.nome_prodotto,
          quantita_rilevata: quantitaRilevata,
          unita_misura: product.unita_misura,
          quantita_minima: product.quantita_minima,
          sotto_minimo: quantitaRilevata < product.quantita_minima
        };
        
        if (product.note) rilevazione.note = product.note;
        rilevazioni.push(rilevazione);
      }
      
      console.log(`Rilevazioni da salvare: ${rilevazioni.length}`);

      await base44.entities.RilevazioneInventario.bulkCreate(rilevazioni);

      setSaveSuccess(true);
      
      queryClient.invalidateQueries({ queryKey: ['rilevazioni-inventario'] });

      // Segna attività come completata - SOLO SE NON ESISTE GIÀ con stesso nome + ora
      if (turnoId && attivitaNome) {
        const oraAttivita = urlParams.get('ora_attivita');
        
        const filter = {
          turno_id: turnoId,
          attivita_nome: decodeURIComponent(attivitaNome)
        };
        if (oraAttivita) filter.ora_attivita = oraAttivita;
        
        const esistente = await base44.entities.AttivitaCompletata.filter(filter);
        
        if (esistente.length === 0) {
          const attivitaData = {
            dipendente_id: currentUser.id,
            dipendente_nome: currentUser.nome_cognome || currentUser.full_name || 'Dipendente',
            turno_id: turnoId,
            turno_data: new Date().toISOString().split('T')[0],
            store_id: selectedStore,
            attivita_nome: decodeURIComponent(attivitaNome),
            form_page: 'FormInventario',
            completato_at: new Date().toISOString()
          };
          
          if (oraAttivita) attivitaData.ora_attivita = oraAttivita;
          
          console.log('Salvataggio attività FormInventario:', attivitaData);
          await base44.entities.AttivitaCompletata.create(attivitaData);
        }
      }
      
      console.log('=== SUBMIT INVENTARIO COMPLETATO ===');

      // Redirect dopo un breve delay
      setTimeout(() => {
        if (redirectTo) {
          navigate(createPageUrl(redirectTo));
        } else {
          setSaveSuccess(false);
          setQuantities({});
        }
      }, 1500);
    } catch (error) {
      console.error('=== ERRORE SUBMIT INVENTARIO ===', error);
      alert(`Errore: ${error.message || 'Errore sconosciuto'}`);
      setSaving(false);
    }
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
          <h2 className="text-lg font-bold text-slate-800 mb-4">Seleziona Locale</h2>
          
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
                    // I dipendenti possono sempre vedere tutti i locali
                    return true;
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

        {!selectedStore && (
          <NeumorphicCard className="p-8 text-center bg-blue-50 border-2 border-blue-300">
            <Store className="w-16 h-16 text-blue-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Seleziona un Locale</h3>
            <p className="text-slate-600">
              Scegli prima il locale per visualizzare i prodotti specifici
            </p>
          </NeumorphicCard>
        )}

        {selectedStore && Object.entries(productsByCategory).map(([categoria, categoryProducts]) => (
          <NeumorphicCard key={categoria} className="p-4 lg:p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {categoriaLabels[categoria] || categoria}
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {categoryProducts.map((product) => {
                return (
                  <div 
                    key={product.id} 
                    className="neumorphic-pressed p-3 rounded-xl"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 text-base">{product.nome_interno || product.nome_prodotto}</h3>
                          <p className="text-sm text-slate-500">
                            {product.unita_misura === 'confezioni' || product.unita_misura === 'pacchi' 
                              ? `${product.unita_misura} chiuse` 
                              : product.unita_misura}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Quantità ({product.unita_misura === 'confezioni' || product.unita_misura === 'pacchi' 
                            ? `${product.unita_misura} chiuse` 
                            : product.unita_misura})
                        </label>
                        <input
                          type="number"
                          inputMode={['kg', 'litri', 'grammi', 'ml'].includes(product.unita_misura) ? 'decimal' : 'numeric'}
                          step={['kg', 'litri', 'grammi', 'ml'].includes(product.unita_misura) ? '0.01' : '1'}
                          min="0"
                          value={quantities[product.id] || ''}
                          onChange={(e) => {
                            let value = e.target.value;
                            if (!['kg', 'litri', 'grammi', 'ml'].includes(product.unita_misura) && value !== '') {
                              value = Math.floor(parseFloat(value) || 0).toString();
                            }
                            handleQuantityChange(product.id, value);
                          }}
                          placeholder="0"
                          className="w-full neumorphic-pressed px-4 py-4 rounded-xl outline-none text-xl font-bold text-slate-700 text-center"
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
          {(() => {
            const compiled = Object.keys(quantities).filter(k => quantities[k] !== '' && quantities[k] !== null).length;
            const total = products.length;
            const missing = total - compiled;
            
            if (missing > 0) {
              return (
                <div className="neumorphic-pressed p-4 rounded-xl mb-4 bg-orange-50 border-2 border-orange-300">
                  <p className="text-sm text-orange-800 font-bold text-center">
                    ⚠️ Mancano {missing} prodotti da inventariare ({compiled}/{total})
                  </p>
                </div>
              );
            }
          })()}
          
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