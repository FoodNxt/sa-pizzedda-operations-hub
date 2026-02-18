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
  Camera,
  ChefHat,
  Truck,
  Wheat,
  Loader2,
  RefreshCw,
  Download,
  Check } from
'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import ProgressBar from "../components/neumorphic/ProgressBar";
import RicetteContent from "../components/inventory/RicetteContent";
import FornitoriContent from "../components/inventory/FornitoriContent";

export default function MateriePrime() {
  const [activeTab, setActiveTab] = useState('materie_prime'); // materie_prime | ricette | fornitori | nomi_interni
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
  'Pulizia'];


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
    // Default: tutte le categorie collassate
    const initial = {};
    CATEGORIE.forEach((cat) => {
      initial[cat] = true;
    });
    return initial;
  });
  const [analyzingAllergeni, setAnalyzingAllergeni] = useState(false);
  const [allergeniProgress, setAllergeniProgress] = useState({ current: 0, total: 0 });
  const [selectedRicette, setSelectedRicette] = useState([]);
  const [editingAllergeni, setEditingAllergeni] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showLogoConfig, setShowLogoConfig] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);

  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
    staleTime: 5 * 60 * 1000, // 5 minuti
    refetchOnWindowFocus: false
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
    staleTime: 5 * 60 * 1000, // 5 minuti
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

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list(),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'allergeni'
  });

  const { data: allergeniConfigs = [] } = useQuery({
    queryKey: ['allergeni-config'],
    queryFn: () => base44.entities.AllergeniConfig.list(),
    enabled: activeTab === 'allergeni'
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

    // Pulisci store_specific_min_quantities rimuovendo valori null/undefined
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

    // Clean store-specific quantities
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

  // Nomi interni unici e ordinati (da MateriePrime + flavor da ProdottiVenduti)
  const nomiInterniUnici = [
  ...new Set([
  ...products.map((p) => p.nome_interno).filter(Boolean),
  ...prodottiVenduti.map((p) => p.flavor).filter(Boolean)]
  )].
  sort((a, b) => a.localeCompare(b, 'it'));

  // Fornitori ordinati alfabeticamente
  const suppliersOrdered = [...suppliers].sort((a, b) => (a.ragione_sociale || '').localeCompare(b.ragione_sociale || '', 'it'));

  const productsByCategory = filteredProducts.reduce((acc, product) => {
    // Map old "Condimenti" to "Ingredienti pronti"
    let cat = product.categoria || 'altro';
    if (cat === 'Condimenti') cat = 'Ingredienti pronti';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  // Ordina le categorie alfabeticamente
  const sortedCategories = Object.keys(productsByCategory).sort((a, b) => a.localeCompare(b, 'it'));

  // Funzione per ordinare i prodotti
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

  const analizzaTuttiAllergeni = async () => {
    if (!confirm('Vuoi analizzare automaticamente gli allergeni di tutte le ricette? Questa operazione può richiedere alcuni minuti.')) {
      return;
    }

    setAnalyzingAllergeni(true);
    const ricetteDaAnalizzare = ricette.filter(r => r.attivo !== false);
    setAllergeniProgress({ current: 0, total: ricetteDaAnalizzare.length });

    for (let i = 0; i < ricetteDaAnalizzare.length; i++) {
      try {
        await base44.functions.invoke('analizzaAllergeni', { ricetta_id: ricetteDaAnalizzare[i].id });
        setAllergeniProgress({ current: i + 1, total: ricetteDaAnalizzare.length });
      } catch (error) {
        console.error('Error analyzing ricetta:', ricetteDaAnalizzare[i].nome_prodotto, error);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['ricette'] });
    setAnalyzingAllergeni(false);
    alert('Analisi completata!');
  };

  const scaricaPDFAllergeni = async () => {
    if (selectedRicette.length === 0) {
      alert('Seleziona almeno un prodotto da scaricare');
      return;
    }

    try {
      const activeConfig = allergeniConfigs.find(c => c.is_active);
      const response = await base44.functions.invoke('scaricaPDFAllergeni', {
        ricette_ids: selectedRicette,
        logo_url: activeConfig?.logo_url || null
      });

      console.log('Response:', response);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (!response.data?.success || !response.data?.pdf) {
        throw new Error('PDF non disponibile nella risposta');
      }

      // Decode base64 PDF
      const pdfData = atob(response.data.pdf);
      const bytes = new Uint8Array(pdfData.length);
      for (let i = 0; i < pdfData.length; i++) {
        bytes[i] = pdfData.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename || 'allergeni.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Errore PDF:', error);
      alert('❌ Errore: ' + (error.message || 'Errore nella generazione del PDF'));
    }
  };

  const anteprimaPDFAllergeni = async () => {
    if (selectedRicette.length === 0) {
      alert('Seleziona almeno un prodotto per l\'anteprima');
      return;
    }

    try {
      const activeConfig = allergeniConfigs.find(c => c.is_active);
      const response = await base44.functions.invoke('scaricaPDFAllergeni', {
        ricette_ids: selectedRicette,
        logo_url: activeConfig?.logo_url || null
      });

      console.log('Response anteprima:', response);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (!response.data?.success || !response.data?.pdf) {
        throw new Error('PDF non disponibile nella risposta');
      }

      // Decode base64 PDF
      const pdfData = atob(response.data.pdf);
      const bytes = new Uint8Array(pdfData.length);
      for (let i = 0; i < pdfData.length; i++) {
        bytes[i] = pdfData.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (error) {
      console.error('Errore anteprima:', error);
      alert('❌ Errore: ' + (error.message || 'Errore nella generazione dell\'anteprima'));
    }
  };

  const toggleRicettaSelection = (ricettaId) => {
    setSelectedRicette(prev => 
      prev.includes(ricettaId) 
        ? prev.filter(id => id !== ricettaId)
        : [...prev, ricettaId]
    );
  };

  const toggleAllRicette = () => {
    const ricetteAttive = ricette.filter(r => r.attivo !== false);
    if (selectedRicette.length === ricetteAttive.length) {
      setSelectedRicette([]);
    } else {
      setSelectedRicette(ricetteAttive.map(r => r.id));
    }
  };

  const saveAllergeniMutation = useMutation({
    mutationFn: ({ ricettaId, allergeni }) => 
      base44.entities.Ricetta.update(ricettaId, { allergeni }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricette'] });
      setEditingAllergeni(null);
    }
  });

  const saveLogoMutation = useMutation({
    mutationFn: (logoUrl) => {
      const activeConfig = allergeniConfigs.find(c => c.is_active);
      if (activeConfig) {
        return base44.entities.AllergeniConfig.update(activeConfig.id, { logo_url: logoUrl });
      }
      return base44.entities.AllergeniConfig.create({ logo_url: logoUrl, is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allergeni-config'] });
      setShowLogoConfig(false);
    }
  });

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
    <ProtectedPage pageName="MateriePrime">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-1 text-2xl font-bold lg:text-3xl" style={{ color: '#000000' }}>Gestione Inventario
              </h1>
              <p className="text-sm" style={{ color: '#000000' }}>Gestisci materie prime, ricette e fornitori</p>
            </div>
            {activeTab === 'materie_prime' && (
              <NeumorphicButton
                onClick={() => setShowForm(true)}
                variant="primary"
                className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Aggiungi</span>
              </NeumorphicButton>
            )}
          </div>
        </div>

        {/* Tabs */}
        <NeumorphicCard className="p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('materie_prime')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'materie_prime'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Materie Prime</span>
            </button>
            <button
              onClick={() => setActiveTab('ricette')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'ricette'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span className="hidden sm:inline">Ricette</span>
            </button>
            <button
              onClick={() => setActiveTab('fornitori')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'fornitori'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Fornitori</span>
            </button>
            <button
              onClick={() => setActiveTab('allergeni')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'allergeni'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wheat className="w-4 h-4" />
              <span className="hidden sm:inline">Allergeni</span>
            </button>
            <button
              onClick={() => setActiveTab('nomi_interni')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'nomi_interni'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Nomi Interni</span>
            </button>
          </div>
        </NeumorphicCard>

        {activeTab === 'nomi_interni' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              📋 Nomi Interni - Gestione
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Elenco di tutti i nomi interni utilizzati nelle materie prime
            </p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-3 text-slate-600 font-medium">Nome Interno</th>
                    <th className="text-center p-3 text-slate-600 font-medium">N° Prodotti</th>
                    <th className="text-center p-3 text-slate-600 font-medium">In Uso</th>
                    <th className="text-center p-3 text-slate-600 font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Raggruppa per nome_interno
                    const nomiInterniStats = {};
                    products.forEach(p => {
                      if (!p.nome_interno) return;
                      if (!nomiInterniStats[p.nome_interno]) {
                        nomiInterniStats[p.nome_interno] = {
                          count: 0,
                          inUso: false,
                          products: []
                        };
                      }
                      nomiInterniStats[p.nome_interno].count++;
                      nomiInterniStats[p.nome_interno].products.push(p);
                      if (p.in_uso_per_store && Object.values(p.in_uso_per_store).some(v => v)) {
                        nomiInterniStats[p.nome_interno].inUso = true;
                      }
                    });

                    const sorted = Object.entries(nomiInterniStats).sort(([a], [b]) => 
                      a.localeCompare(b, 'it')
                    );

                    return sorted.map(([nomeInterno, stats]) => (
                      <tr key={nomeInterno} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-medium text-slate-800">{nomeInterno}</p>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                            {stats.count}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {stats.inUso ? (
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold text-xs">
                              ✓ Sì
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs">
                              No
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!stats.inUso && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Vuoi cancellare il nome interno "${nomeInterno}"?\n\nQuesto rimuoverà il nome interno da ${stats.count} prodotti.`)) {
                                  return;
                                }
                                
                                try {
                                  // Update all products with this nome_interno
                                  for (const product of stats.products) {
                                    await base44.entities.MateriePrime.update(product.id, {
                                      nome_interno: ''
                                    });
                                  }
                                  
                                  queryClient.invalidateQueries({ queryKey: ['materie-prime'] });
                                  alert('✓ Nome interno rimosso con successo');
                                } catch (error) {
                                  alert('Errore: ' + error.message);
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                              title="Rimuovi nome interno"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
        )}

        {activeTab === 'ricette' && <RicetteContent />}
        {activeTab === 'fornitori' && <FornitoriContent />}
        {activeTab === 'allergeni' && (
          <>
            {/* Logo Configuration Card */}
            <NeumorphicCard className="p-4 lg:p-6 bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Logo Aziendale</h3>
                  <p className="text-xs text-slate-600 mt-1">Logo da includere nel PDF allergeni</p>
                </div>
                {(() => {
                  const activeConfig = allergeniConfigs.find(c => c.is_active);
                  return activeConfig?.logo_url ? (
                    <div className="flex items-center gap-3">
                      <img 
                        src={activeConfig.logo_url} 
                        alt="Logo" 
                        className="h-12 object-contain rounded"
                      />
                      <button
                        onClick={() => setShowLogoConfig(true)}
                        className="p-2 rounded-lg hover:bg-blue-100 text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <NeumorphicButton
                      onClick={() => setShowLogoConfig(true)}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Carica Logo
                    </NeumorphicButton>
                  );
                })()}
              </div>
            </NeumorphicCard>

            <NeumorphicCard className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Wheat className="w-6 h-6 text-amber-600" />
                  Tabella Allergeni
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Prodotti venduti con ricetta e relativi allergeni
                </p>
              </div>
              <div className="flex gap-2">
                <NeumorphicButton
                  onClick={analizzaTuttiAllergeni}
                  disabled={analyzingAllergeni}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  {analyzingAllergeni ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {allergeniProgress.current}/{allergeniProgress.total}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Analizza
                    </>
                  )}
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={anteprimaPDFAllergeni}
                  disabled={selectedRicette.length === 0}
                  className="flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Anteprima ({selectedRicette.length})
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={scaricaPDFAllergeni}
                  disabled={selectedRicette.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF ({selectedRicette.length})
                </NeumorphicButton>
              </div>
            </div>

            {ricette.length === 0 ? (
              <div className="text-center py-12">
                <Wheat className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessuna ricetta disponibile</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b-2 border-amber-600">
                      <th className="text-center p-3 text-slate-600 font-medium text-sm w-12">
                        <input
                          type="checkbox"
                          checked={selectedRicette.length === ricette.filter(r => r.attivo !== false).length}
                          onChange={toggleAllRicette}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="text-left p-3 text-slate-600 font-medium text-sm">Prodotto</th>
                      <th className="text-left p-3 text-slate-600 font-medium text-sm">Categoria</th>
                      <th className="text-left p-3 text-slate-600 font-medium text-sm">Allergeni</th>
                      <th className="text-center p-3 text-slate-600 font-medium text-sm">Venduto</th>
                      <th className="text-center p-3 text-slate-600 font-medium text-sm">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ricette
                      .filter(r => r.attivo !== false)
                      .sort((a, b) => (a.nome_prodotto || '').localeCompare(b.nome_prodotto || '', 'it'))
                      .map((ricetta) => (
                        <tr key={ricetta.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedRicette.includes(ricetta.id)}
                              onChange={() => toggleRicettaSelection(ricetta.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-slate-800">{ricetta.nome_prodotto}</p>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {ricetta.categoria}
                            </span>
                          </td>
                          <td className="p-3">
                          {editingAllergeni?.id === ricetta.id ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {['Glutine', 'Crostacei', 'Uova', 'Pesce', 'Arachidi', 'Soia', 'Latte', 'Frutta a guscio', 'Sedano', 'Senape', 'Semi di sesamo', 'Anidride solforosa e solfiti', 'Lupini', 'Molluschi'].map(allergene => (
                                  <button
                                    key={allergene}
                                    type="button"
                                    onClick={() => {
                                      const current = editingAllergeni.allergeni || [];
                                      const updated = current.includes(allergene)
                                        ? current.filter(a => a !== allergene)
                                        : [...current, allergene];
                                      setEditingAllergeni({ ...editingAllergeni, allergeni: updated });
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                      (editingAllergeni.allergeni || []).includes(allergene)
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    }`}
                                  >
                                    {allergene}
                                  </button>
                                ))}
                              </div>
                               <div className="flex gap-2">
                                 <button
                                   onClick={() => {
                                     saveAllergeniMutation.mutate({
                                       ricettaId: ricetta.id,
                                       allergeni: editingAllergeni.allergeni
                                     });
                                   }}
                                   disabled={saveAllergeniMutation.isPending}
                                   className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 flex items-center gap-1"
                                 >
                                   <Save className="w-3 h-3" /> Salva
                                 </button>
                                 <button
                                   onClick={() => setEditingAllergeni(null)}
                                   className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300"
                                 >
                                   Annulla
                                 </button>
                               </div>
                             </div>
                           ) : (
                             ricetta.allergeni && ricetta.allergeni.length > 0 ? (
                               <div className="flex flex-wrap gap-2">
                                 {ricetta.allergeni.map((allergene, idx) => (
                                   <span key={idx} className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                     {allergene}
                                   </span>
                                 ))}
                               </div>
                             ) : (
                               <span className="text-xs text-slate-400 italic">Nessun allergene specificato</span>
                             )
                           )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col items-center gap-1">
                              {ricetta.venduto_online && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                  Online
                                </span>
                              )}
                              {ricetta.venduto_offline && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                                  Negozio
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              {editingAllergeni?.id !== ricetta.id && (
                                <button
                                  onClick={() => setEditingAllergeni({ id: ricetta.id, allergeni: ricetta.allergeni || [] })}
                                  className="nav-button p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                  title="Modifica allergeni"
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </NeumorphicCard>

          {/* PDF Preview Modal */}
          {previewPdfUrl && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <NeumorphicCard className="max-w-6xl w-full h-[90vh] p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">Anteprima PDF Allergeni</h2>
                  <button 
                    onClick={() => {
                      window.URL.revokeObjectURL(previewPdfUrl);
                      setPreviewPdfUrl(null);
                    }} 
                    className="p-2 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <iframe
                  src={previewPdfUrl}
                  className="flex-1 w-full rounded-xl border border-slate-200"
                  title="Anteprima PDF"
                />
              </NeumorphicCard>
            </div>
          )}

          {/* Logo Upload Modal */}
          {showLogoConfig && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <NeumorphicCard className="max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">Carica Logo</h2>
                  <button onClick={() => setShowLogoConfig(false)} className="p-2 rounded-lg hover:bg-slate-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const activeConfig = allergeniConfigs.find(c => c.is_active);
                    return activeConfig?.logo_url && (
                      <div className="relative">
                        <img 
                          src={activeConfig.logo_url} 
                          alt="Logo attuale" 
                          className="w-full h-32 object-contain rounded-xl bg-slate-50 p-4"
                        />
                        <button
                          onClick={() => saveLogoMutation.mutate(null)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}

                  <label className="neumorphic-pressed p-4 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-blue-50 transition-colors">
                    <Upload className="w-8 h-8 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">
                      {uploadingLogo ? 'Caricamento...' : 'Seleziona Logo'}
                    </span>
                    <p className="text-xs text-slate-500 text-center">
                      Formato consigliato: PNG o JPG con sfondo trasparente
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingLogo(true);
                          try {
                            const { file_url } = await base44.integrations.Core.UploadFile({ file });
                            saveLogoMutation.mutate(file_url);
                          } catch (error) {
                            alert('Errore nel caricamento: ' + error.message);
                          } finally {
                            setUploadingLogo(false);
                          }
                        }
                      }}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                </div>
              </NeumorphicCard>
            </div>
          )}
          </>
        )}

        {activeTab === 'materie_prime' && (
          <>
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
              className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

          </div>
        </NeumorphicCard>

        {showForm &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
            <NeumorphicCard className="w-full lg:max-w-3xl max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-gradient-to-br from-slate-50 to-slate-100 pb-4 -mt-4 pt-4 -mx-4 px-4 z-10">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
                  {editingProduct ? 'Modifica' : 'Nuovo'}
                </h2>
                <button
                onClick={resetForm}
                className="nav-button p-2 rounded-lg">

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
                      required />

                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Nome Interno <span className="text-red-600">*</span>
                      </label>
                      <select
                      value={nomiInterniUnici.includes(formData.nome_interno) ? formData.nome_interno : '__custom__'}
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') {
                          setFormData({ ...formData, nome_interno: e.target.value });
                        }
                      }}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm mb-2">

                        <option value="__custom__">-- Nuovo nome interno --</option>
                        {nomiInterniUnici.map((nome) =>
                      <option key={nome} value={nome}>{nome}</option>
                      )}
                      </select>
                      <input
                      type="text"
                      value={formData.nome_interno}
                      onChange={(e) => setFormData({ ...formData, nome_interno: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      placeholder="es. Farina Tipo 00"
                      required />

                      <p className="text-xs text-slate-500 mt-1">
                        💡 Seleziona un nome esistente o inseriscine uno nuovo
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Marca
                        </label>
                        <input
                        type="text"
                        value={formData.marca}
                        onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                        placeholder="es. Mulino Bianco" />

                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Categoria <span className="text-red-600">*</span>
                        </label>
                        <select
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                        required>

                          {CATEGORIE.map((cat) =>
                        <option key={cat} value={cat}>{cat}</option>
                        )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Fornitore
                        </label>
                        <select
                        value={formData.fornitore}
                        onChange={(e) => setFormData({ ...formData, fornitore: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                          <option value="">-- Seleziona fornitore --</option>
                          {suppliersOrdered.map((supplier) =>
                        <option key={supplier.id} value={supplier.ragione_sociale}>
                              {supplier.ragione_sociale}
                            </option>
                        )}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Codice Fornitore
                        </label>
                        <input
                        type="text"
                        value={formData.codice_fornitore}
                        onChange={(e) => setFormData({ ...formData, codice_fornitore: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                        placeholder="es. SKU-12345" />

                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Foto Prodotto
                      </label>
                      {formData.foto_url &&
                    <div className="mb-3 relative">
                          <img
                        src={formData.foto_url}
                        alt={formData.nome_prodotto}
                        className="w-full h-40 object-cover rounded-xl" />

                          <button
                        type="button"
                        onClick={() => setFormData({ ...formData, foto_url: '' })}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600">

                            <X className="w-4 h-4" />
                          </button>
                        </div>
                    }
                      {uploadingPhoto && (
                        <ProgressBar 
                          progress={uploadProgress} 
                          label="Caricamento foto..." 
                          className="mb-3"
                        />
                      )}
                      <label className="neumorphic-pressed p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 transition-colors">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">
                          {uploadingPhoto ? 'Caricamento...' : formData.foto_url ? 'Cambia Foto' : 'Carica Foto'}
                        </span>
                        <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadingPhoto(true);
                            setUploadProgress(0);
                            
                            // Simula progress per upload
                            const progressInterval = setInterval(() => {
                              setUploadProgress(prev => {
                                if (prev >= 90) return prev;
                                return prev + 10;
                              });
                            }, 100);
                            
                            try {
                              const { file_url } = await base44.integrations.Core.UploadFile({ file });
                              setUploadProgress(100);
                              setFormData({ ...formData, foto_url: file_url });
                              clearInterval(progressInterval);
                              setTimeout(() => {
                                setUploadingPhoto(false);
                                setUploadProgress(0);
                              }, 500);
                            } catch (error) {
                              clearInterval(progressInterval);
                              alert('Errore nel caricamento: ' + error.message);
                              setUploadingPhoto(false);
                              setUploadProgress(0);
                            }
                          }
                        }}
                        disabled={uploadingPhoto}
                        className="hidden" />

                      </label>
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
                      required>

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

                    {['kg', 'grammi', 'litri', 'ml'].includes(formData.unita_misura) &&
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
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                              <select
                        value={formData.unita_misura_peso}
                        onChange={(e) => setFormData({ ...formData, unita_misura_peso: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="litri">litri</option>
                                <option value="ml">ml</option>
                              </select>
                            </div>
                          </div>
                  }

                        {['casse', 'confezioni'].includes(formData.unita_misura) &&
                  <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Quante unità per {formData.unita_misura === 'casse' ? 'cassa' : 'confezione'}?
                              </label>
                              <input
                        type="number"
                        step="1"
                        value={formData.unita_per_confezione}
                        onChange={(e) => setFormData({ ...formData, unita_per_confezione: e.target.value })}
                        placeholder="es. 24 (bottiglie) o 8 (rotoli)"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                              <p className="text-xs text-slate-500 mt-1">
                                💡 Es: Cassa di 24 bottiglie = 24, Confezione di 8 rotoli = 8
                              </p>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Peso/Dimensione per ogni unità interna (opzionale)
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <input
                          type="number"
                          step="0.01"
                          value={formData.peso_unita_interna}
                          onChange={(e) => setFormData({ ...formData, peso_unita_interna: e.target.value })}
                          placeholder="Lascia vuoto se non applicabile"
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                                <select
                          value={formData.unita_misura_interna}
                          onChange={(e) => setFormData({ ...formData, unita_misura_interna: e.target.value })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                                  <option value="kg">kg</option>
                                  <option value="g">g</option>
                                  <option value="litri">litri</option>
                                  <option value="ml">ml</option>
                                </select>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                💡 Lascia vuoto per prodotti senza peso (es. Scottex, tovaglioli)
                              </p>
                            </div>
                          </div>
                  }

                        {!['kg', 'grammi', 'litri', 'ml', 'casse', 'confezioni'].includes(formData.unita_misura) &&
                  <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                              Peso per {formData.unita_misura === 'sacchi' ? 'Sacco' : 'Unità'} (opzionale)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                        type="number"
                        step="0.01"
                        value={formData.peso_dimensione_unita}
                        onChange={(e) => setFormData({ ...formData, peso_dimensione_unita: e.target.value })}
                        placeholder="Lascia vuoto se non applicabile"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                              <select
                        value={formData.unita_misura_peso}
                        onChange={(e) => setFormData({ ...formData, unita_misura_peso: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="litri">litri</option>
                                <option value="ml">ml</option>
                              </select>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              💡 Lascia vuoto per prodotti venduti a pezzo senza peso
                            </p>
                          </div>
                  }
                  </div>
                </div>

                {/* Quantità e Prezzo */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm">💰 Quantità e Prezzo</h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Qtà Critica <span className="text-red-600">*</span>
                      </label>
                      <input
                      type="number"
                      step="1"
                      value={formData.quantita_critica}
                      onChange={(e) => setFormData({ ...formData, quantita_critica: e.target.value })}
                      placeholder="5"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      required />

                      <p className="text-xs text-slate-500 mt-1">
                        💡 Sotto questa soglia: ordinare
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Qtà Ordine <span className="text-red-600">*</span>
                      </label>
                      <input
                      type="number"
                      step="1"
                      value={formData.quantita_ordine}
                      onChange={(e) => setFormData({ ...formData, quantita_ordine: e.target.value })}
                      placeholder="10"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      required />

                      <p className="text-xs text-slate-500 mt-1">
                        💡 Quantità da ordinare
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                        <Euro className="w-4 h-4" />
                        Prezzo netto IVA
                      </label>
                      <input
                      type="number"
                      step="0.01"
                      value={formData.prezzo_unitario}
                      onChange={(e) => setFormData({ ...formData, prezzo_unitario: e.target.value })}
                      placeholder="15.50"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                      <p className="text-xs text-slate-500 mt-1">
                        💡 Per confezione/cassa
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        IVA
                      </label>
                      <select
                      value={[4, 10, 22].includes(formData.iva_percentuale) ? formData.iva_percentuale : 'custom'}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setFormData({ ...formData, iva_percentuale: '' });
                        } else {
                          setFormData({ ...formData, iva_percentuale: parseFloat(e.target.value) });
                        }
                      }}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                        <option value="4">4%</option>
                        <option value="10">10%</option>
                        <option value="22">22%</option>
                        <option value="custom">Altro...</option>
                      </select>
                    </div>
                    
                    {![4, 10, 22].includes(formData.iva_percentuale) &&
                  <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          IVA Custom (%)
                        </label>
                        <input
                      type="number"
                      step="0.01"
                      value={formData.iva_percentuale}
                      onChange={(e) => setFormData({ ...formData, iva_percentuale: parseFloat(e.target.value) || 0 })}
                      placeholder="es. 5"
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                      </div>
                  }
                  </div>

                  <button
                  type="button"
                  onClick={() => setShowStoreQuantities(!showStoreQuantities)}
                  className="mt-3 w-full neumorphic-flat px-4 py-3 rounded-xl text-sm font-medium text-slate-700 flex items-center justify-between">

                    <span>⚙️ Quantità Specifiche per Negozio</span>
                    {showStoreQuantities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showStoreQuantities &&
                <div className="mt-3 space-y-2">
                      {stores.map((store) =>
                  <div key={store.id} className="neumorphic-pressed p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">{store.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-slate-500">Qtà Critica</label>
                              <input
                          type="number"
                          step="1"
                          value={storeQuantitaCritica[store.id] || ''}
                          onChange={(e) => setStoreQuantitaCritica((prev) => ({ ...prev, [store.id]: e.target.value }))}
                          placeholder={`Default: ${formData.quantita_critica || '0'}`}
                          className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm" />

                            </div>
                            <div>
                              <label className="text-xs text-slate-500">Qtà Ordine</label>
                              <input
                          type="number"
                          step="1"
                          value={storeQuantitaOrdine[store.id] || ''}
                          onChange={(e) => setStoreQuantitaOrdine((prev) => ({ ...prev, [store.id]: e.target.value }))}
                          placeholder={`Default: ${formData.quantita_ordine || '0'}`}
                          className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm" />

                            </div>
                          </div>
                        </div>
                  )}
                      <p className="text-xs text-slate-500 mt-2">
                        ℹ️ Lascia vuoto per usare i valori di default
                      </p>
                    </div>
                }
                </div>

                {/* Posizione e Note */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm">📍 Posizione e Note</h3>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <button
                    type="button"
                    onClick={() => setFormData({ ...formData, posizione: 'negozio' })}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                    formData.posizione === 'negozio' ?
                    'neumorphic-pressed text-blue-600' :
                    'neumorphic-flat text-slate-500'}`
                    }>

                      🏪 Negozio
                    </button>
                    <button
                    type="button"
                    onClick={() => setFormData({ ...formData, posizione: 'cantina' })}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                    formData.posizione === 'cantina' ?
                    'neumorphic-pressed text-purple-600' :
                    'neumorphic-flat text-slate-500'}`
                    }>

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
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm h-20 resize-none" />

                  </div>

                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center gap-2">
                      <input
                      type="checkbox"
                      id="attivo"
                      checked={formData.attivo}
                      onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                      className="w-4 h-4" />

                      <label htmlFor="attivo" className="text-sm font-medium text-slate-700">
                        Prodotto Attivo
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                      type="checkbox"
                      id="trasportabile"
                      checked={formData.trasportabile}
                      onChange={(e) => setFormData({ ...formData, trasportabile: e.target.checked })}
                      className="w-4 h-4" />

                      <label htmlFor="trasportabile" className="text-sm font-medium text-slate-700">
                        Trasportabile tra Negozi
                      </label>
                    </div>
                  </div>
                </div>

                {/* In Uso per Store */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm">✅ Prodotto In Uso (per Locale)</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Seleziona i locali in cui questo prodotto è attualmente in uso. Solo un prodotto con lo stesso nome interno può essere "in uso" per locale.
                  </p>
                  
                  {/* Seleziona/Deseleziona Tutti */}
                  <div className="flex gap-2 mb-3">
                    <button
                    type="button"
                    onClick={() => {
                      const allStoreIds = {};
                      stores.forEach((store) => {
                        const otherProductInUse = products.find((p) =>
                        p.id !== editingProduct?.id &&
                        p.nome_interno === formData.nome_interno &&
                        p.in_uso_per_store?.[store.id] === true
                        );
                        if (!otherProductInUse) {
                          allStoreIds[store.id] = true;
                        }
                      });
                      setInUsoPerStore(allStoreIds);
                    }}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200">

                      ✓ Seleziona Tutti
                    </button>
                    <button
                    type="button"
                    onClick={() => setInUsoPerStore({})}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">

                      ✗ Deseleziona Tutti
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {stores.map((store) => {
                    // Check if another product with same nome_interno is already in use for this store
                    const otherProductInUse = products.find((p) =>
                    p.id !== editingProduct?.id &&
                    p.nome_interno === formData.nome_interno &&
                    p.in_uso_per_store?.[store.id] === true
                    );

                    return (
                      <div key={store.id} className="neumorphic-pressed p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                              type="checkbox"
                              id={`in-uso-${store.id}`}
                              checked={inUsoPerStore[store.id] || false}
                              onChange={(e) => {
                                setInUsoPerStore((prev) => ({
                                  ...prev,
                                  [store.id]: e.target.checked
                                }));
                              }}
                              disabled={otherProductInUse && !inUsoPerStore[store.id]}
                              className="w-4 h-4" />

                              <label htmlFor={`in-uso-${store.id}`} className="text-sm text-slate-700">
                                {store.name}
                              </label>
                            </div>
                            {otherProductInUse && !inUsoPerStore[store.id] &&
                          <span className="text-xs text-orange-600">
                                In uso: {otherProductInUse.fornitore || otherProductInUse.nome_prodotto}
                              </span>
                          }
                          </div>
                        </div>);

                  })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <NeumorphicButton
                  type="button"
                  onClick={resetForm}
                  className="flex-1">

                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                  type="submit"
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={createMutation.isPending || updateMutation.isPending}>

                    <Save className="w-5 h-5" />
                    Salva
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        }

        {isLoading ?
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
        </div> :
        filteredProducts.length === 0 ?
        <NeumorphicCard className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {searchTerm ? 'Nessun prodotto trovato' : 'Nessun prodotto'}
            </h3>
          </NeumorphicCard> :

        sortedCategories.map((categoria) => {
          const categoryProducts = productsByCategory[categoria];
          const isCollapsed = collapsedCategories[categoria];
          return (
            <NeumorphicCard key={categoria} className="p-4 lg:p-6">
              <button
                onClick={() => toggleCategory(categoria)}
                className="w-full flex items-center justify-between text-left">

                <h2 className="text-lg font-bold text-slate-800">
                  {categoria}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({categoryProducts.length})
                  </span>
                </h2>
                {isCollapsed ?
                <ChevronDown className="w-5 h-5 text-slate-500" /> :

                <ChevronUp className="w-5 h-5 text-slate-500" />
                }
              </button>

              {!isCollapsed &&
              <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 mt-4">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b-2 border-blue-600">
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm cursor-pointer hover:bg-slate-100 rounded" onClick={() => handleSort('nome_prodotto')}>
                        <div className="flex items-center gap-1">
                          Prodotto {getSortIcon('nome_prodotto')}
                        </div>
                      </th>
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm cursor-pointer hover:bg-slate-100 rounded" onClick={() => handleSort('fornitore')}>
                        <div className="flex items-center gap-1">
                          Fornitore {getSortIcon('fornitore')}
                        </div>
                      </th>
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm cursor-pointer hover:bg-slate-100 rounded" onClick={() => handleSort('unita_misura')}>
                        <div className="flex items-center gap-1">
                          Unità {getSortIcon('unita_misura')}
                        </div>
                      </th>
                      <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Posizione</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm cursor-pointer hover:bg-slate-100 rounded" onClick={() => handleSort('quantita_critica')}>
                        <div className="flex items-center gap-1 justify-end">
                          Qtà Critica {getSortIcon('quantita_critica')}
                        </div>
                      </th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm cursor-pointer hover:bg-slate-100 rounded" onClick={() => handleSort('quantita_ordine')}>
                        <div className="flex items-center gap-1 justify-end">
                          Qtà Ordine {getSortIcon('quantita_ordine')}
                        </div>
                      </th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm cursor-pointer hover:bg-slate-100 rounded" onClick={() => handleSort('prezzo_unitario')}>
                        <div className="flex items-center gap-1 justify-end">
                          Prezzo {getSortIcon('prezzo_unitario')}
                        </div>
                      </th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">IVA</th>
                      <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">€/Unità</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Stato</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">In Uso</th>
                      <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortProducts(categoryProducts).map((product) => {
                      const assignedStoresCount = !product.assigned_stores || product.assigned_stores.length === 0 ?
                      stores.length :
                      product.assigned_stores.length;

                      return (
                        <tr key={product.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="p-2 lg:p-3">
                            <p className="font-medium text-slate-700 text-sm">{product.nome_prodotto}</p>
                            {product.note &&
                            <p className="text-xs text-slate-500 mt-1 truncate">{product.note}</p>
                            }
                          </td>
                          <td className="p-2 lg:p-3 text-slate-700 text-sm">{product.fornitore || '-'}</td>
                          <td className="p-2 lg:p-3 text-slate-700 text-sm">{product.unita_misura}</td>
                          <td className="p-2 lg:p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            product.posizione === 'cantina' ?
                            'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'}`
                            }>
                              {product.posizione === 'cantina' ? '📦' : '🏪'}
                            </span>
                          </td>
                          <td className="p-2 lg:p-3 text-right font-bold text-red-600 text-sm">
                            {product.quantita_critica || product.quantita_minima || '-'}
                          </td>
                          <td className="p-2 lg:p-3 text-right font-bold text-blue-600 text-sm">
                            {product.quantita_ordine || '-'}
                          </td>
                          <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                            {product.prezzo_unitario ? `€${parseFloat(product.prezzo_unitario).toFixed(2)}` : '-'}
                          </td>
                          <td className="p-2 lg:p-3 text-center text-slate-700 text-sm">
                            {product.iva_percentuale ? `${product.iva_percentuale}%` : '22%'}
                          </td>
                          <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                            {(() => {
                              if (!product.prezzo_unitario) return '-';
                              // Per casse/confezioni: prezzo / unità per confezione
                              if (['casse', 'confezioni'].includes(product.unita_misura) && product.unita_per_confezione > 0) {
                                const prezzoPerUnita = product.prezzo_unitario / product.unita_per_confezione;
                                return `€${prezzoPerUnita.toFixed(2)}/pz`;
                              }
                              // Per kg/litri/sacchi con peso: prezzo / peso
                              if (product.peso_dimensione_unita > 0) {
                                const prezzoPerUnita = product.prezzo_unitario / product.peso_dimensione_unita;
                                return `€${prezzoPerUnita.toFixed(2)}/${product.unita_misura_peso || 'kg'}`;
                              }
                              // Per prodotti venduti a pezzo senza peso
                              return '-';
                            })()}
                          </td>
                          <td className="p-2 lg:p-3">
                            <div className="flex justify-center">
                              {product.attivo !== false ?
                              <CheckCircle className="w-5 h-5 text-green-600" /> :

                              <X className="w-5 h-5 text-gray-400" />
                              }
                            </div>
                          </td>
                          <td className="p-2 lg:p-3">
                            <div className="flex justify-center">
                              {product.in_uso_per_store && Object.values(product.in_uso_per_store).some((v) => v) ?
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                  ✓ In uso
                                </span> :

                              <span className="text-xs text-slate-400">-</span>
                              }
                            </div>
                          </td>
                          <td className="p-2 lg:p-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleCopyTemplate(product)}
                                className="nav-button p-2 rounded-lg hover:bg-green-50 transition-colors"
                                title="Copia come template">

                                <Copy className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => handleEdit(product)}
                                className="nav-button p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Modifica">

                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                                title="Elimina">

                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>);

                    })}
                  </tbody>
                </table>
              </div>
              }
            </NeumorphicCard>);

        })
        }
          </>
        )}
      </div>
    </ProtectedPage>);

}