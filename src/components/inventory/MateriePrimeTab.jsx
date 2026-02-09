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
  Euro,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  Camera
} from 'lucide-react';
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import ProgressBar from "../neumorphic/ProgressBar";

export default function MateriePrimeTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStoreQuantities, setShowStoreQuantities] = useState(false);
  const [storeQuantities, setStoreQuantities] = useState({});
  const [showStorePositions, setShowStorePositions] = useState(false);
  const [storePositions, setStorePositions] = useState({});

  const CATEGORIE = [
    'Angolo di Sardegna',
    'Bevande',
    'Consumabili',
    'Dolci',
    'Ingredienti base',
    'Ingredienti pronti',
    'Ortofrutta',
    'Packaging',
    'Pulizia'
  ];

  const [formData, setFormData] = useState({
    nome_prodotto: '',
    nome_interno: '',
    marca: '',
    codice_fornitore: '',
    unita_misura: 'pezzi',
    peso_dimensione_unita: '',
    unita_misura_peso: 'kg',
    unita_per_confezione: '',
    peso_unita_interna: '',
    unita_misura_interna: 'kg',
    quantita_critica: '',
    quantita_ordine: '',
    prezzo_unitario: '',
    iva_percentuale: 22,
    fornitore: '',
    categoria: 'Ingredienti base',
    note: '',
    attivo: true,
    posizione: 'negozio',
    assigned_stores: [],
    in_uso: false,
    in_uso_per_store: {},
    foto_url: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inUsoPerStore, setInUsoPerStore] = useState({});
  const [storeQuantitaCritica, setStoreQuantitaCritica] = useState({});
  const [storeQuantitaOrdine, setStoreQuantitaOrdine] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const initial = {};
    CATEGORIE.forEach((cat) => {
      initial[cat] = true;
    });
    return initial;
  });

  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['fornitori'],
    queryFn: () => base44.entities.Fornitore.filter({ attivo: true })
  });

  const { data: prodottiVenduti = [] } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MateriePrime.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materie-prime'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MateriePrime.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materie-prime'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MateriePrime.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materie-prime'] });
    }
  });

  const resetForm = () => {
    setFormData({
      nome_prodotto: '',
      nome_interno: '',
      marca: '',
      codice_fornitore: '',
      unita_misura: 'pezzi',
      peso_dimensione_unita: '',
      unita_misura_peso: 'kg',
      unita_per_confezione: '',
      peso_unita_interna: '',
      unita_misura_interna: 'kg',
      quantita_critica: '',
      quantita_ordine: '',
      prezzo_unitario: '',
      iva_percentuale: 22,
      fornitore: '',
      categoria: 'Ingredienti base',
      note: '',
      attivo: true,
      posizione: 'negozio',
      assigned_stores: [],
      in_uso: false,
      in_uso_per_store: {},
      trasportabile: false,
      foto_url: ''
    });
    setStoreQuantities({});
    setShowStoreQuantities(false);
    setStorePositions({});
    setShowStorePositions(false);
    setInUsoPerStore({});
    setStoreQuantitaCritica({});
    setStoreQuantitaOrdine({});
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleCopyTemplate = (product) => {
    setFormData({
      nome_prodotto: '',
      nome_interno: product.nome_interno || '',
      marca: product.marca || '',
      codice_fornitore: '',
      unita_misura: product.unita_misura,
      peso_dimensione_unita: product.peso_dimensione_unita || '',
      unita_misura_peso: product.unita_misura_peso || 'kg',
      unita_per_confezione: product.unita_per_confezione || '',
      peso_unita_interna: product.peso_unita_interna || '',
      unita_misura_interna: product.unita_misura_interna || 'kg',
      quantita_critica: product.quantita_critica || '',
      quantita_ordine: product.quantita_ordine || '',
      prezzo_unitario: '',
      fornitore: '',
      categoria: product.categoria || 'Ingredienti base',
      note: '',
      attivo: true,
      posizione: product.posizione || 'negozio',
      assigned_stores: product.assigned_stores || [],
      in_uso: false,
      in_uso_per_store: {},
      trasportabile: product.trasportabile || false
    });
    setStoreQuantities(product.store_specific_min_quantities || {});
    setStorePositions(product.store_specific_positions || {});
    setInUsoPerStore({});
    setStoreQuantitaCritica(product.store_specific_quantita_critica || {});
    setStoreQuantitaOrdine(product.store_specific_quantita_ordine || {});
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      nome_prodotto: product.nome_prodotto,
      nome_interno: product.nome_interno || '',
      marca: product.marca || '',
      codice_fornitore: product.codice_fornitore || '',
      unita_misura: product.unita_misura,
      peso_dimensione_unita: product.peso_dimensione_unita || '',
      unita_misura_peso: product.unita_misura_peso || 'kg',
      unita_per_confezione: product.unita_per_confezione || '',
      peso_unita_interna: product.peso_unita_interna || '',
      unita_misura_interna: product.unita_misura_interna || 'kg',
      quantita_critica: product.quantita_critica || product.quantita_minima || '',
      quantita_ordine: product.quantita_ordine || '',
      prezzo_unitario: product.prezzo_unitario || '',
      iva_percentuale: product.iva_percentuale || 22,
      fornitore: product.fornitore || '',
      categoria: product.categoria === 'Condimenti' ? 'Ingredienti pronti' : product.categoria || 'Ingredienti base',
      note: product.note || '',
      attivo: product.attivo !== false,
      posizione: product.posizione || 'negozio',
      assigned_stores: product.assigned_stores || [],
      in_uso: product.in_uso || false,
      in_uso_per_store: product.in_uso_per_store || {},
      trasportabile: product.trasportabile || false,
      foto_url: product.foto_url || ''
    });
    setStoreQuantities(product.store_specific_min_quantities || {});
    setStorePositions(product.store_specific_positions || {});
    setInUsoPerStore(product.in_uso_per_store || {});
    setStoreQuantitaCritica(product.store_specific_quantita_critica || {});
    setStoreQuantitaOrdine(product.store_specific_quantita_ordine || {});
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const cleanedStoreQuantities = {};
    Object.keys(storeQuantities).forEach((storeId) => {
      if (storeQuantities[storeId] !== null && storeQuantities[storeId] !== undefined && storeQuantities[storeId] !== '') {
        cleanedStoreQuantities[storeId] = parseFloat(storeQuantities[storeId]);
      }
    });

    const cleanedStorePositions = {};
    Object.keys(storePositions).forEach((storeId) => {
      if (storePositions[storeId]) {
        cleanedStorePositions[storeId] = storePositions[storeId];
      }
    });

    const cleanedStoreQuantitaCritica = {};
    Object.keys(storeQuantitaCritica).forEach((storeId) => {
      if (storeQuantitaCritica[storeId] !== null && storeQuantitaCritica[storeId] !== undefined && storeQuantitaCritica[storeId] !== '') {
        cleanedStoreQuantitaCritica[storeId] = Math.round(parseFloat(storeQuantitaCritica[storeId]));
      }
    });

    const cleanedStoreQuantitaOrdine = {};
    Object.keys(storeQuantitaOrdine).forEach((storeId) => {
      if (storeQuantitaOrdine[storeId] !== null && storeQuantitaOrdine[storeId] !== undefined && storeQuantitaOrdine[storeId] !== '') {
        cleanedStoreQuantitaOrdine[storeId] = Math.round(parseFloat(storeQuantitaOrdine[storeId]));
      }
    });

    const data = {
      ...formData,
      quantita_critica: parseFloat(parseFloat(formData.quantita_critica).toFixed(2)),
      quantita_ordine: parseFloat(parseFloat(formData.quantita_ordine).toFixed(2)),
      prezzo_unitario: formData.prezzo_unitario ? parseFloat(parseFloat(formData.prezzo_unitario).toFixed(2)) : null,
      iva_percentuale: formData.iva_percentuale ? parseFloat(formData.iva_percentuale) : null,
      peso_dimensione_unita: formData.peso_dimensione_unita ? parseFloat(parseFloat(formData.peso_dimensione_unita).toFixed(2)) : null,
      unita_misura_peso: formData.peso_dimensione_unita ? formData.unita_misura_peso : null,
      unita_per_confezione: formData.unita_per_confezione ? parseFloat(parseFloat(formData.unita_per_confezione).toFixed(2)) : null,
      peso_unita_interna: formData.peso_unita_interna ? parseFloat(parseFloat(formData.peso_unita_interna).toFixed(2)) : null,
      unita_misura_interna: formData.peso_unita_interna ? formData.unita_misura_interna : null,
      store_specific_min_quantities: cleanedStoreQuantities,
      store_specific_positions: cleanedStorePositions,
      store_specific_quantita_critica: cleanedStoreQuantitaCritica,
      store_specific_quantita_ordine: cleanedStoreQuantitaOrdine,
      assigned_stores: formData.assigned_stores.length > 0 ? formData.assigned_stores : [],
      in_uso_per_store: inUsoPerStore
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
    setFormData((prev) => {
      const assigned = prev.assigned_stores.includes(storeId) ?
        prev.assigned_stores.filter((id) => id !== storeId) :
        [...prev.assigned_stores, storeId];
      return { ...prev, assigned_stores: assigned };
    });
  };

  const handleStoreQuantityChange = (storeId, value) => {
    setStoreQuantities((prev) => ({
      ...prev,
      [storeId]: value ? parseFloat(value) : null
    }));
  };

  const filteredProducts = products.filter((p) =>
    p.nome_prodotto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fornitore?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const nomiInterniUnici = [
    ...new Set([
      ...products.map((p) => p.nome_interno).filter(Boolean),
      ...prodottiVenduti.map((p) => p.flavor).filter(Boolean)
    ])
  ].sort((a, b) => a.localeCompare(b, 'it'));

  const suppliersOrdered = [...suppliers].sort((a, b) => (a.ragione_sociale || '').localeCompare(b.ragione_sociale || '', 'it'));

  const productsByCategory = filteredProducts.reduce((acc, product) => {
    let cat = product.categoria || 'altro';
    if (cat === 'Condimenti') cat = 'Ingredienti pronti';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  const sortedCategories = Object.keys(productsByCategory).sort((a, b) => a.localeCompare(b, 'it'));

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    return sortConfig.direction === 'asc' ?
      <ArrowUp className="w-3 h-3 text-blue-600" /> :
      <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const toggleCategory = (categoria) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  const sortProducts = (products) => {
    if (!sortConfig.key) return products;

    return [...products].sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'nome_prodotto':
          aVal = (a.nome_prodotto || '').toLowerCase();
          bVal = (b.nome_prodotto || '').toLowerCase();
          break;
        case 'fornitore':
          aVal = (a.fornitore || '').toLowerCase();
          bVal = (b.fornitore || '').toLowerCase();
          break;
        case 'unita_misura':
          aVal = (a.unita_misura || '').toLowerCase();
          bVal = (b.unita_misura || '').toLowerCase();
          break;
        case 'quantita_critica':
          aVal = a.quantita_critica || 0;
          bVal = b.quantita_critica || 0;
          break;
        case 'quantita_ordine':
          aVal = a.quantita_ordine || 0;
          bVal = b.quantita_ordine || 0;
          break;
        case 'prezzo_unitario':
          aVal = a.prezzo_unitario || 0;
          bVal = b.prezzo_unitario || 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal, 'it');
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  return (
    <>
      {/* Stats */}
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
              {products.filter((p) => p.attivo !== false).length}
            </h3>
            <p className="text-xs text-slate-500">Attivi</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
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

      {/* Search + Add */}
      <div className="flex gap-3">
        <NeumorphicCard className="flex-1 p-4">
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
        <NeumorphicButton
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2 px-6"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Aggiungi</span>
        </NeumorphicButton>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <NeumorphicCard className="w-full lg:max-w-3xl max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-gradient-to-br from-slate-50 to-slate-100 pb-4 -mt-4 pt-4 -mx-4 px-4 z-10">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
                {editingProduct ? 'Modifica' : 'Nuovo'}
              </h2>
              <button onClick={resetForm} className="nav-button p-2 rounded-lg">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ... rest of form from MateriePrime.js lines 522-1167 ... */}
            </form>
          </NeumorphicCard>
        </div>
      )}

      {/* Products List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <NeumorphicCard key={idx} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
                <div className="space-y-2">
                  <div className="h-12 bg-slate-200 rounded" />
                  <div className="h-12 bg-slate-200 rounded" />
                  <div className="h-12 bg-slate-200 rounded" />
                </div>
              </div>
            </NeumorphicCard>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <NeumorphicCard className="p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm ? 'Nessun prodotto trovato' : 'Nessun prodotto'}
          </h3>
        </NeumorphicCard>
      ) : (
        sortedCategories.map((categoria) => {
          const categoryProducts = productsByCategory[categoria];
          const isCollapsed = collapsedCategories[categoria];
          return (
            <NeumorphicCard key={categoria} className="p-4 lg:p-6">
              <button
                onClick={() => toggleCategory(categoria)}
                className="w-full flex items-center justify-between text-left"
              >
                <h2 className="text-lg font-bold text-slate-800">
                  {categoria}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({categoryProducts.length})
                  </span>
                </h2>
                {isCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-slate-500" />
                )}
              </button>

              {!isCollapsed && (
                <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 mt-4">
                  {/* ... rest of table from MateriePrime.js lines 1219-1364 ... */}
                </div>
              )}
            </NeumorphicCard>
          );
        })
      )}
    </>
  );
}