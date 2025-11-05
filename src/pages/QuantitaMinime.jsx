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

export default function QuantitaMinime() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStoreQuantities, setShowStoreQuantities] = useState(false);
  const [storeQuantities, setStoreQuantities] = useState({});
  const [formData, setFormData] = useState({
    nome_prodotto: '',
    unita_misura: 'pezzi',
    quantita_minima: '',
    prezzo_unitario: '',
    fornitore: '',
    categoria: 'altro',
    note: '',
    attivo: true,
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
      unita_misura: 'pezzi',
      quantita_minima: '',
      prezzo_unitario: '',
      fornitore: '',
      categoria: 'altro',
      note: '',
      attivo: true,
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
      unita_misura: product.unita_misura,
      quantita_minima: product.quantita_minima,
      prezzo_unitario: product.prezzo_unitario || '',
      fornitore: product.fornitore || '',
      categoria: product.categoria || 'altro',
      note: product.note || '',
      attivo: product.attivo !== false,
      assigned_stores: product.assigned_stores || []
    });
    setStoreQuantities(product.store_specific_min_quantities || {});
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      quantita_minima: parseFloat(formData.quantita_minima),
      prezzo_unitario: formData.prezzo_unitario ? parseFloat(formData.prezzo_unitario) : null,
      store_specific_min_quantities: storeQuantities,
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

  const getMinQuantityForStore = (product, storeId) => {
    if (product.store_specific_min_quantities && product.store_specific_min_quantities[storeId]) {
      return product.store_specific_min_quantities[storeId];
    }
    return product.quantita_minima;
  };

  const isProductAssignedToStore = (product, storeId) => {
    if (!product.assigned_stores || product.assigned_stores.length === 0) {
      return true; // Se array vuoto = tutti i locali
    }
    return product.assigned_stores.includes(storeId);
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-10 h-10 text-[#8b7355]" />
              <h1 className="text-3xl font-bold text-[#6b6b6b]">Quantità Minime</h1>
            </div>
            <p className="text-[#9b9b9b]">Gestisci le materie prime e le scorte minime</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Aggiungi Prodotto
          </NeumorphicButton>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{products.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Prodotti Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            {products.filter(p => p.attivo !== false).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Prodotti Attivi</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-3xl font-bold text-yellow-600 mb-1">
            {Object.keys(productsByCategory).length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Categorie</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Store className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">
            {stores.length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Locali</p>
        </NeumorphicCard>
      </div>

      {/* Search */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-[#9b9b9b]" />
          <input
            type="text"
            placeholder="Cerca prodotto, fornitore o categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          />
        </div>
      </NeumorphicCard>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <NeumorphicCard className="max-w-3xl w-full my-8 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#6b6b6b]">
                {editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
              </h2>
              <button
                onClick={resetForm}
                className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-5 h-5 text-[#9b9b9b]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Nome Prodotto <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nome_prodotto}
                    onChange={(e) => setFormData({ ...formData, nome_prodotto: e.target.value })}
                    placeholder="es. Farina di Semola"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Unità di Misura <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.unita_misura}
                      onChange={(e) => setFormData({ ...formData, unita_misura: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      required
                    >
                      <option value="kg">Chilogrammi (kg)</option>
                      <option value="grammi">Grammi (g)</option>
                      <option value="litri">Litri (L)</option>
                      <option value="ml">Millilitri (ml)</option>
                      <option value="pezzi">Pezzi</option>
                      <option value="sacchi">Sacchi</option>
                      <option value="confezioni">Confezioni</option>
                      <option value="barattoli">Barattoli</option>
                      <option value="bottiglie">Bottiglie</option>
                      <option value="rotoli">Rotoli</option>
                      <option value="casse">Casse</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Qtà Minima Generale <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantita_minima}
                      onChange={(e) => setFormData({ ...formData, quantita_minima: e.target.value })}
                      placeholder="es. 10"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                      <Euro className="w-4 h-4" />
                      Prezzo Unitario (no IVA)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.prezzo_unitario}
                      onChange={(e) => setFormData({ ...formData, prezzo_unitario: e.target.value })}
                      placeholder="es. 15.50"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Fornitore
                    </label>
                    <input
                      type="text"
                      value={formData.fornitore}
                      onChange={(e) => setFormData({ ...formData, fornitore: e.target.value })}
                      placeholder="es. Molino Rossi"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Categoria
                    </label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    >
                      <option value="ingredienti">Ingredienti Base</option>
                      <option value="condimenti">Condimenti</option>
                      <option value="verdure">Verdure e Salse</option>
                      <option value="latticini">Latticini</option>
                      <option value="dolci">Dolci</option>
                      <option value="bevande">Bevande</option>
                      <option value="pulizia">Pulizia</option>
                      <option value="altro">Altro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Note
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Note aggiuntive..."
                    rows={2}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none resize-none"
                  />
                </div>
              </div>

              {/* Assegnazione Locali */}
              <div className="neumorphic-flat p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Store className="w-5 h-5 text-[#8b7355]" />
                  <h3 className="font-bold text-[#6b6b6b]">Assegnazione Locali</h3>
                </div>
                <p className="text-sm text-[#9b9b9b] mb-4">
                  {formData.assigned_stores.length === 0 
                    ? '✓ Prodotto disponibile in TUTTI i locali' 
                    : `Prodotto disponibile in ${formData.assigned_stores.length} locale/i`}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stores.map(store => (
                    <div key={store.id} className="neumorphic-pressed p-3 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.assigned_stores.length === 0 || formData.assigned_stores.includes(store.id)}
                          onChange={() => handleStoreToggle(store.id)}
                          className="w-5 h-5 rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-[#6b6b6b]">{store.name}</p>
                          <p className="text-xs text-[#9b9b9b]">{store.address}</p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                {formData.assigned_stores.length > 0 && formData.assigned_stores.length < stores.length && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, assigned_stores: [] })}
                    className="mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Assegna a tutti i locali
                  </button>
                )}
              </div>

              {/* Quantità Minime per Locale */}
              <div className="neumorphic-flat p-5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setShowStoreQuantities(!showStoreQuantities)}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-[#8b7355]" />
                    <h3 className="font-bold text-[#6b6b6b]">Quantità Minime per Locale (Opzionale)</h3>
                  </div>
                  {showStoreQuantities ? (
                    <ChevronUp className="w-5 h-5 text-[#9b9b9b]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#9b9b9b]" />
                  )}
                </button>

                {showStoreQuantities && (
                  <>
                    <p className="text-sm text-[#9b9b9b] mb-4">
                      Se non specifichi, verrà usata la quantità minima generale ({formData.quantita_minima || '0'})
                    </p>
                    <div className="space-y-3">
                      {stores
                        .filter(store => formData.assigned_stores.length === 0 || formData.assigned_stores.includes(store.id))
                        .map(store => (
                          <div key={store.id} className="neumorphic-pressed p-4 rounded-lg">
                            <label className="block mb-2">
                              <span className="font-medium text-[#6b6b6b]">{store.name}</span>
                              <span className="text-xs text-[#9b9b9b] ml-2">
                                (Default: {formData.quantita_minima || '0'})
                              </span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={storeQuantities[store.id] || ''}
                              onChange={(e) => handleStoreQuantityChange(store.id, e.target.value)}
                              placeholder={`Quantità minima per ${store.name}`}
                              className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-[#6b6b6b] outline-none"
                            />
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="attivo"
                  checked={formData.attivo}
                  onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="attivo" className="text-sm font-medium text-[#6b6b6b]">
                  Prodotto attivo (visibile nei form di rilevazione)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#c1c1c1]">
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
                  {editingProduct ? 'Aggiorna' : 'Salva'}
                </NeumorphicButton>
              </div>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {/* Products List by Category */}
      {isLoading ? (
        <NeumorphicCard className="p-12 text-center">
          <p className="text-[#9b9b9b]">Caricamento...</p>
        </NeumorphicCard>
      ) : filteredProducts.length === 0 ? (
        <NeumorphicCard className="p-12 text-center">
          <Package className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">
            {searchTerm ? 'Nessun prodotto trovato' : 'Nessun prodotto'}
          </h3>
          <p className="text-[#9b9b9b] mb-4">
            {searchTerm ? 'Prova a modificare i criteri di ricerca' : 'Inizia aggiungendo il primo prodotto'}
          </p>
        </NeumorphicCard>
      ) : (
        Object.entries(productsByCategory).map(([categoria, categoryProducts]) => (
          <NeumorphicCard key={categoria} className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">
              {categoriaLabels[categoria] || categoria}
              <span className="ml-2 text-sm font-normal text-[#9b9b9b]">
                ({categoryProducts.length} prodotti)
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Prodotto</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Unità</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Qtà Min</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Prezzo</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Locali</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Fornitore</th>
                    <th className="text-center p-3 text-[#9b9b9b] font-medium">Stato</th>
                    <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryProducts.map((product) => {
                    const hasStoreSpecific = product.store_specific_min_quantities && 
                      Object.keys(product.store_specific_min_quantities).length > 0;
                    const assignedStoresCount = !product.assigned_stores || product.assigned_stores.length === 0 
                      ? stores.length 
                      : product.assigned_stores.length;

                    return (
                      <tr key={product.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-[#6b6b6b]">{product.nome_prodotto}</p>
                            {product.note && (
                              <p className="text-xs text-[#9b9b9b] mt-1">{product.note}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-[#6b6b6b]">{product.unita_misura}</td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-[#8b7355]">
                            {product.quantita_minima}
                          </span>
                          {hasStoreSpecific && (
                            <span className="block text-xs text-blue-600">
                              (variabile)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-[#6b6b6b]">
                          {product.prezzo_unitario ? `€${product.prezzo_unitario.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-[#6b6b6b]">
                            {assignedStoresCount === stores.length 
                              ? 'Tutti' 
                              : `${assignedStoresCount}/${stores.length}`}
                          </span>
                        </td>
                        <td className="p-3 text-[#6b6b6b]">{product.fornitore || '-'}</td>
                        <td className="p-3">
                          <div className="flex justify-center">
                            {product.attivo !== false ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                ATTIVO
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                INATTIVO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Modifica"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
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
  );
}