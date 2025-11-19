
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Search,
  Store,
  ChevronDown,
  ChevronUp,
  Euro
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function MateriePrime() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStoreQuantities, setShowStoreQuantities] = useState(false);
  const [storeQuantities, setStoreQuantities] = useState({});
  const [formData, setFormData] = useState({
    nome_prodotto: '',
    codice_articolo: '',
    unita_misura: 'pezzi',
    peso_dimensione_unita: '',
    unita_misura_peso: 'kg',
    quantita_minima: '',
    prezzo_unitario: '',
    fornitore: '',
    categoria: 'altro',
    note: '',
    attivo: true,
    posizione: 'negozio',
    assigned_stores: []
  });

  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['fornitori'],
    queryFn: () => base44.entities.Fornitore.filter({ attivo: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MateriePrime.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materie-prime'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MateriePrime.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materie-prime'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MateriePrime.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materie-prime'] });
    },
  });

  const resetForm = () => {
    setFormData({
      nome_prodotto: '',
      codice_articolo: '',
      unita_misura: 'pezzi',
      peso_dimensione_unita: '',
      unita_misura_peso: 'kg',
      quantita_minima: '',
      prezzo_unitario: '',
      fornitore: '',
      categoria: 'altro',
      note: '',
      attivo: true,
      posizione: 'negozio',
      assigned_stores: []
    });
    setStoreQuantities({});
    setShowStoreQuantities(false);
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      nome_prodotto: product.nome_prodotto,
      codice_articolo: product.codice_articolo || '',
      unita_misura: product.unita_misura,
      peso_dimensione_unita: product.peso_dimensione_unita || '',
      unita_misura_peso: product.unita_misura_peso || 'kg',
      quantita_minima: product.quantita_minima,
      prezzo_unitario: product.prezzo_unitario || '',
      fornitore: product.fornitore || '',
      categoria: product.categoria || 'altro',
      note: product.note || '',
      attivo: product.attivo !== false,
      posizione: product.posizione || 'negozio',
      assigned_stores: product.assigned_stores || []
    });
    setStoreQuantities(product.store_specific_min_quantities || {});
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Pulisci store_specific_min_quantities rimuovendo valori null/undefined
    const cleanedStoreQuantities = {};
    Object.keys(storeQuantities).forEach(storeId => {
      if (storeQuantities[storeId] !== null && storeQuantities[storeId] !== undefined && storeQuantities[storeId] !== '') {
        cleanedStoreQuantities[storeId] = parseFloat(storeQuantities[storeId]);
      }
    });
    
    const data = {
      ...formData,
      quantita_minima: parseFloat(formData.quantita_minima),
      prezzo_unitario: formData.prezzo_unitario ? parseFloat(formData.prezzo_unitario) : null,
      peso_dimensione_unita: formData.peso_dimensione_unita ? parseFloat(formData.peso_dimensione_unita) : null,
      unita_misura_peso: formData.peso_dimensione_unita ? formData.unita_misura_peso : null,
      store_specific_min_quantities: cleanedStoreQuantities,
      assigned_stores: formData.assigned_stores.length > 0 ? formData.assigned_stores : []
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStoreToggle = (storeId) => {
    setFormData(prev => {
      const assigned = prev.assigned_stores.includes(storeId)
        ? prev.assigned_stores.filter(id => id !== storeId)
        : [...prev.assigned_stores, storeId];
      return { ...prev, assigned_stores: assigned };
    });
  };

  const handleStoreQuantityChange = (storeId, value) => {
    setStoreQuantities(prev => ({
      ...prev,
      [storeId]: value ? parseFloat(value) : null
    }));
  };

  const filteredProducts = products.filter(p =>
    p.nome_prodotto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fornitore?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const cat = product.categoria || 'altro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  return (
    <ProtectedPage pageName="MateriePrime">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
                Materie Prime
              </h1>
              <p className="text-sm text-slate-500">Gestisci le materie prime e le scorte minime</p>
            </div>
            <NeumorphicButton
              onClick={() => setShowForm(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Aggiungi</span>
            </NeumorphicButton>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">{products.length}</h3>
              <p className="text-xs text-slate-500">Prodotti</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-green-600 mb-1">
                {products.filter(p => p.attivo !== false).length}
              </h3>
              <p className="text-xs text-slate-500">Attivi</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 lg:w-7 lg://h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-yellow-600 mb-1">
                {Object.keys(productsByCategory).length}
              </h3>
              <p className="text-xs text-slate-500">Categorie</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <Store className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-purple-600 mb-1">
                {stores.length}
              </h3>
              <p className="text-xs text-slate-500">Locali</p>
            </div>
          </NeumorphicCard>
        </div>

        <NeumorphicCard className="p-4">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca prodotto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
            />
          </div>
        </NeumorphicCard>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
            <NeumorphicCard className="w-full lg:max-w-3xl max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-gradient-to-br from-slate-50 to-slate-100 pb-4 -mt-4 pt-4 -mx-4 px-4 z-10">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
                  {editingProduct ? 'Modifica' : 'Nuovo'}
                </h2>
                <button
                  onClick={resetForm}
                  className="nav-button p-2 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Dati Base Prodotto */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm">📦 Dati Prodotto</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Nome Prodotto <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nome_prodotto}
                        onChange={(e) => setFormData({ ...formData, nome_prodotto: e.target.value })}
                        placeholder="es. Farina di Semola"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Codice Articolo
                        </label>
                        <input
                          type="text"
                          value={formData.codice_articolo}
                          onChange={(e) => setFormData({ ...formData, codice_articolo: e.target.value })}
                          placeholder="es. FAR001"
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Categoria <span className="text-red-600">*</span>
                        </label>
                        <select
                          value={formData.categoria}
                          onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                          required
                        >
                          <option value="ingredienti">Ingredienti</option>
                          <option value="condimenti">Condimenti</option>
                          <option value="verdure">Verdure</option>
                          <option value="latticini">Latticini</option>
                          <option value="dolci">Dolci</option>
                          <option value="bevande">Bevande</option>
                          <option value="pulizia">Pulizia</option>
                          <option value="altro">Altro</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Fornitore
                      </label>
                      <select
                        value={formData.fornitore}
                        onChange={(e) => setFormData({ ...formData, fornitore: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      >
                        <option value="">-- Seleziona fornitore --</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.ragione_sociale}>
                            {supplier.ragione_sociale}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Unità di Misura e Peso */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm">⚖️ Unità di Misura</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Unità <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.unita_misura}
                        onChange={(e) => setFormData({ ...formData, unita_misura: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                        required
                      >
                        <option value="kg">Kg</option>
                        <option value="grammi">Grammi</option>
                        <option value="litri">Litri</option>
                        <option value="ml">ml</option>
                        <option value="unità">Unità</option>
                        <option value="pezzi">Pezzi</option>
                        <option value="sacchi">Sacchi</option>
                        <option value="confezioni">Confezioni</option>
                        <option value="barattoli">Barattoli</option>
                        <option value="bottiglie">Bottiglie</option>
                        <option value="rotoli">Rotoli</option>
                        <option value="casse">Casse</option>
                      </select>
                    </div>

                    {['kg', 'grammi', 'litri', 'ml'].includes(formData.unita_misura) && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Peso/Dimensione per Unità (es. 25 per 25kg)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            step="0.01"
                            value={formData.peso_dimensione_unita}
                            onChange={(e) => setFormData({ ...formData, peso_dimensione_unita: e.target.value })}
                            placeholder="25"
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                          />
                          <select
                            value={formData.unita_misura_peso}
                            onChange={(e) => setFormData({ ...formData, unita_misura_peso: e.target.value })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="litri">litri</option>
                            <option value="ml">ml</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {!['kg', 'grammi', 'litri', 'ml'].includes(formData.unita_misura) && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Peso/Dimensione Confezione (opzionale)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            step="0.01"
                            value={formData.peso_dimensione_unita}
                            onChange={(e) => setFormData({ ...formData, peso_dimensione_unita: e.target.value })}
                            placeholder="es. 5 (per 5kg)"
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                          />
                          <select
                            value={formData.unita_misura_peso}
                            onChange={(e) => setFormData({ ...formData, unita_misura_peso: e.target.value })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="litri">litri</option>
                            <option value="ml">ml</option>
                          </select>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Es: Se vendi "sacchi da 25kg", inserisci 25 kg
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantità e Prezzo */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm">💰 Quantità e Prezzo</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Qtà Minima Base <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.quantita_minima}
                        onChange={(e) => setFormData({ ...formData, quantita_minima: e.target.value })}
                        placeholder="10"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                        <Euro className="w-4 h-4" />
                        Prezzo Unitario
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.prezzo_unitario}
                        onChange={(e) => setFormData({ ...formData, prezzo_unitario: e.target.value })}
                        placeholder="15.50"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowStoreQuantities(!showStoreQuantities)}
                    className="mt-3 w-full neumorphic-flat px-4 py-3 rounded-xl text-sm font-medium text-slate-700 flex items-center justify-between"
                  >
                    <span>⚙️ Quantità Specifiche per Negozio</span>
                    {showStoreQuantities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showStoreQuantities && (
                    <div className="mt-3 space-y-2">
                      {stores.map(store => (
                        <div key={store.id} className="neumorphic-pressed p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">{store.name}</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            value={storeQuantities[store.id] || ''}
                            onChange={(e) => handleStoreQuantityChange(store.id, e.target.value)}
                            placeholder={`Default: ${formData.quantita_minima || '0'}`}
                            className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
                          />
                        </div>
                      ))}
                      <p className="text-xs text-slate-500 mt-2">
                        ℹ️ Lascia vuoto per usare la quantità base
                      </p>
                    </div>
                  )}
                </div>

                {/* Assegnazione Negozi */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm">🏪 Assegnazione Negozi</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="all-stores"
                        checked={formData.assigned_stores.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, assigned_stores: [] });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor="all-stores" className="text-sm font-medium text-slate-700">
                        Tutti i locali
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {stores.map(store => (
                        <div key={store.id} className="neumorphic-pressed p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`store-${store.id}`}
                              checked={formData.assigned_stores.length === 0 || formData.assigned_stores.includes(store.id)}
                              onChange={() => {
                                if (formData.assigned_stores.length === 0) {
                                  // Se erano tutti selezionati, deseleziona solo questo
                                  setFormData({ 
                                    ...formData, 
                                    assigned_stores: stores.filter(s => s.id !== store.id).map(s => s.id)
                                  });
                                } else {
                                  handleStoreToggle(store.id);
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <label htmlFor={`store-${store.id}`} className="text-sm text-slate-700 flex-1">
                              {store.name}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      ℹ️ Deseleziona un negozio per disattivare il prodotto in quel locale
                    </p>
                  </div>
                </div>

                {/* Posizione e Note */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm">📍 Posizione e Note</h3>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, posizione: 'negozio' })}
                      className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                        formData.posizione === 'negozio'
                          ? 'neumorphic-pressed text-blue-600'
                          : 'neumorphic-flat text-slate-500'
                      }`}
                    >
                      🏪 Negozio
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, posizione: 'cantina' })}
                      className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                        formData.posizione === 'cantina'
                          ? 'neumorphic-pressed text-purple-600'
                          : 'neumorphic-flat text-slate-500'
                      }`}
                    >
                      📦 Cantina
                    </button>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Note
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Note aggiuntive..."
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm h-20 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      id="attivo"
                      checked={formData.attivo}
                      onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="attivo" className="text-sm font-medium text-slate-700">
                      Prodotto Attivo
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <NeumorphicButton
                    type="button"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                    type="submit"
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="w-5 h-5" />
                    Salva
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        )}

        {isLoading ? (
          <NeumorphicCard className="p-12 text-center">
            <p className="text-slate-500">Caricamento...</p>
          </NeumorphicCard>
        ) : filteredProducts.length === 0 ? (
          <NeumorphicCard className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {searchTerm ? 'Nessun prodotto trovato' : 'Nessun prodotto'}
            </h3>
          </NeumorphicCard>
        ) : (
          Object.entries(productsByCategory).map(([categoria, categoryProducts]) => (
            <NeumorphicCard key={categoria} className="p-4 lg:p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                {categoriaLabels[categoria] || categoria}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({categoryProducts.length})
                </span>
              </h2>

              <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b-2 border-blue-600">
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Prodotto</th>
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Unità</th>
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Posizione</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Qtà Min</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Prezzo</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Stato</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryProducts.map((product) => {
                      const assignedStoresCount = !product.assigned_stores || product.assigned_stores.length === 0 
                        ? stores.length 
                        : product.assigned_stores.length;

                      return (
                        <tr key={product.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="p-2 lg:p-3">
                            <p className="font-medium text-slate-700 text-sm">{product.nome_prodotto}</p>
                            {product.note && (
                              <p className="text-xs text-slate-500 mt-1 truncate">{product.note}</p>
                            )}
                          </td>
                          <td className="p-2 lg:p-3 text-slate-700 text-sm">{product.unita_misura}</td>
                          <td className="p-2 lg:p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              product.posizione === 'cantina' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {product.posizione === 'cantina' ? '📦' : '🏪'}
                            </span>
                          </td>
                          <td className="p-2 lg:p-3 text-right font-bold text-blue-600 text-sm">
                            {product.quantita_minima}
                          </td>
                          <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                            {product.prezzo_unitario ? `€${product.prezzo_unitario.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-2 lg:p-3">
                            <div className="flex justify-center">
                              {product.attivo !== false ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <X className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="p-2 lg:p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="nav-button p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Modifica"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                                title="Elimina"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>
          ))
        )}
      </div>
    </ProtectedPage>
  );
}
