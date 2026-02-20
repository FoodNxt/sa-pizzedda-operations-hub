import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle2 as CheckCircle,
  Send,
  AlertTriangle,
  X,
  Edit,
  Building2,
  Truck,
  Mail,
  Loader2,
  BarChart3,
  Calendar,
  Trash2,
  ChevronDown,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  Plus,
  Search,
  Volume2,
  Upload,
  Save,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Store,
  Download } from
'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function OrdiniAdmin() {
  const [activeTab, setActiveTab] = useState('suggeriti');
  const [viewMode, setViewMode] = useState('per_locale'); // 'per_locale' | 'per_fornitore'
  const [selectedStore, setSelectedStore] = useState('all');
  const [editingOrder, setEditingOrder] = useState(null);
  const [sendingEmail, setSendingEmail] = useState({});
  const [emailSent, setEmailSent] = useState({});
  const [customizingEmail, setCustomizingEmail] = useState(null);
  const [emailTemplate, setEmailTemplate] = useState({
    subject: '',
    body: '',
    prodotti: []
  });
  const [timeRange, setTimeRange] = useState('all'); // 'week', 'month', '3months', '6months', 'year', 'all'
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [expandedStoresSuggeriti, setExpandedStoresSuggeriti] = useState({});
  const [expandedStoresCompletati, setExpandedStoresCompletati] = useState({});
  const [expandedFornitori, setExpandedFornitori] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedInCorso, setCollapsedInCorso] = useState({});
  const [collapsedArrivati, setCollapsedArrivati] = useState({});
  const [searchTermModal, setSearchTermModal] = useState('');
  const [showRegoleForm, setShowRegoleForm] = useState(false);
  const [editingRegola, setEditingRegola] = useState(null);
  const [addProductModal, setAddProductModal] = useState({ open: false, availableProducts: [] });
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [productQuantity, setProductQuantity] = useState(0);
  const [addProductEmailModal, setAddProductEmailModal] = useState({ open: false, availableProducts: [] });
  const [selectedProductToAddEmail, setSelectedProductToAddEmail] = useState('');
  const [productQuantityEmail, setProductQuantityEmail] = useState(0);
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [confirmedProducts, setConfirmedProducts] = useState({});
  const [ddtPhotos, setDdtPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [editingInviatoOrder, setEditingInviatoOrder] = useState(null);
  const [selectedNomeInterno, setSelectedNomeInterno] = useState('all');
  const [selectedCategoryListini, setSelectedCategoryListini] = useState('all');
  const [selectedStoreListini, setSelectedStoreListini] = useState('all');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadCategories, setDownloadCategories] = useState([]);
  const [downloadFornitori, setDownloadFornitori] = useState([]);

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['rilevazione-inventario'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 500)
  });

  const { data: inventoryCantina = [] } = useQuery({
    queryKey: ['rilevazione-inventario-cantina'],
    queryFn: () => base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione', 500)
  });

  const { data: products = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list()
  });

  const { data: fornitori = [] } = useQuery({
    queryKey: ['fornitori'],
    queryFn: () => base44.entities.Fornitore.filter({ attivo: true })
  });

  const { data: ordiniInviati = [] } = useQuery({
    queryKey: ['ordini-inviati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'inviato' })
  });

  const { data: ordiniCompletati = [] } = useQuery({
    queryKey: ['ordini-completati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'completato' })
  });

  const { data: regoleOrdini = [] } = useQuery({
    queryKey: ['regole-ordini'],
    queryFn: () => base44.entities.RegolaOrdine.filter({ attivo: true })
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list()
  });

  const createOrderMutation = useMutation({
    mutationFn: (order) => base44.entities.OrdineFornitore.create(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      queryClient.invalidateQueries({ queryKey: ['ordini-completati'] });
      setEditingOrder(null);
      alert('✅ Ordine segnato come inviato!');
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId) => base44.entities.OrdineFornitore.delete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      queryClient.invalidateQueries({ queryKey: ['ordini-completati'] });
      alert('✅ Ordine eliminato!');
    }
  });

  const createRegolaMutation = useMutation({
    mutationFn: (regola) => base44.entities.RegolaOrdine.create(regola),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regole-ordini'] });
      setShowRegoleForm(false);
      setEditingRegola(null);
    }
  });

  const updateRegolaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RegolaOrdine.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regole-ordini'] });
      setShowRegoleForm(false);
      setEditingRegola(null);
    }
  });

  const deleteRegolaMutation = useMutation({
    mutationFn: (regolaId) => base44.entities.RegolaOrdine.delete(regolaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regole-ordini'] });
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OrdineFornitore.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-completati'] });
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      setEditingInviatoOrder(null);
    }
  });

  const completeOrderMutation = useMutation({
    mutationFn: ({ orderId, data }) => base44.entities.OrdineFornitore.update(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      queryClient.invalidateQueries({ queryKey: ['ordini-completati'] });
      setConfirmingOrder(null);
      setReceivedQuantities({});
      setConfirmedProducts({});
      setDdtPhotos([]);
      alert('✅ Ordine completato!');
    }
  });

  // Calculate orders needed
  const ordersNeeded = React.useMemo(() => {
    const orders = [];
    const allInventory = [...inventory, ...inventoryCantina];
    const latestByProduct = {};
    
    console.log('🔍 DEBUG ORDINI - Starting calculation');

    allInventory.forEach((item) => {
      const key = `${item.store_id}-${item.prodotto_id}`;
      if (!latestByProduct[key] || new Date(item.data_rilevazione) > new Date(latestByProduct[key].data_rilevazione)) {
        latestByProduct[key] = item;
      }
    });

    // Build aggregated quantities: direct readings + semilavorati contributions
    const aggregatedQuantities = {};
    
    // STEP 1: Initialize with direct readings
    Object.values(latestByProduct).forEach((reading) => {
      const key = `${reading.store_id}-${reading.prodotto_id}`;
      aggregatedQuantities[key] = reading.quantita_rilevata || 0;
    });

    // STEP 2: Add semilavorati contributions to their raw materials
    Object.values(latestByProduct).forEach((reading) => {
      const ricetta = ricette.find((r) =>
        r.nome_prodotto?.toLowerCase() === reading.nome_prodotto?.toLowerCase() &&
        r.somma_a_materia_prima_id
      );

      if (!ricetta?.somma_a_materia_prima_id || !ricetta?.somma_ingrediente_id) return;

      // Find the proportion ingredient
      let ingrediente;
      if (ricetta.somma_ingrediente_id.startsWith('ing_')) {
        const ingredienteIndex = parseInt(ricetta.somma_ingrediente_id.replace('ing_', ''));
        ingrediente = ricetta.ingredienti?.[ingredienteIndex];
      } else {
        ingrediente = ricetta.ingredienti?.find((ing) => 
          ing.materia_prima_id === ricetta.somma_ingrediente_id
        );
      }

      if (!ingrediente || !ricetta.quantita_prodotta || ricetta.quantita_prodotta <= 0) {
        console.warn(`⚠️ Missing ingredient for ${reading.nome_prodotto}`);
        return;
      }

      const materiaPrimaTarget = products.find((p) => p.id === ricetta.somma_a_materia_prima_id);
      if (!materiaPrimaTarget) {
        console.warn(`⚠️ Target material not found for ${reading.nome_prodotto}`);
        return;
      }
      
      // Convert semilavorato quantity to grams
      let qtyGrams = reading.quantita_rilevata || 0;
      if (reading.unita_misura === 'kg' || reading.unita_misura === 'litri') qtyGrams *= 1000;
      
      // Convert ingredient quantity to grams
      let ingredientGrams = ingrediente.quantita || 0;
      if (ingrediente.unita_misura === 'kg' || ingrediente.unita_misura === 'litri') ingredientGrams *= 1000;
      
      // Convert produced quantity to grams
      let producedGrams = ricetta.quantita_prodotta || 0;
      if (ricetta.unita_misura_prodotta === 'kg' || ricetta.unita_misura_prodotta === 'litri') producedGrams *= 1000;
      
      // Calculate raw material needed in grams
      const ratio = ingredientGrams / producedGrams;
      const rawMaterialNeededGrams = qtyGrams * ratio;
      
      // Convert to target unit
      let qtyToAdd = rawMaterialNeededGrams;
      
      if (materiaPrimaTarget.unita_misura === 'sacchi' && materiaPrimaTarget.peso_dimensione_unita) {
        qtyToAdd = rawMaterialNeededGrams / (materiaPrimaTarget.peso_dimensione_unita * 1000);
      } else if (materiaPrimaTarget.unita_misura === 'kg' || materiaPrimaTarget.unita_misura === 'litri') {
        qtyToAdd = rawMaterialNeededGrams / 1000;
      }

      const targetKey = `${reading.store_id}-${ricetta.somma_a_materia_prima_id}`;
      const before = aggregatedQuantities[targetKey] || 0;
      aggregatedQuantities[targetKey] = before + qtyToAdd;
      
      console.log(`✅ ${reading.nome_prodotto} (${reading.store_id.slice(-4)}) → ${ricetta.somma_a_materia_prima_nome}:`, {
        semilavorato_qty: reading.quantita_rilevata,
        semilavorato_unit: reading.unita_misura,
        ratio: ratio.toFixed(4),
        raw_needed_grams: rawMaterialNeededGrams.toFixed(2),
        qty_to_add: qtyToAdd.toFixed(4),
        target_unit: materiaPrimaTarget.unita_misura,
        before: before.toFixed(4),
        after: aggregatedQuantities[targetKey].toFixed(4)
      });
    });

    // PHASE 1: Check all products from inventory readings and apply aggregation
    Object.values(latestByProduct).forEach((reading) => {
      const product = products.find((p) => p.id === reading.prodotto_id);
      if (!product || product.attivo === false) return;

      const store = stores.find((s) => s.id === reading.store_id);
      if (!store) return;

      const isAssignedToStore = !product.assigned_stores || product.assigned_stores.length === 0 || product.assigned_stores.includes(reading.store_id);
      if (!isAssignedToStore) return;

      const isInUsoForStore = product.in_uso_per_store?.[reading.store_id] === true || (!product.in_uso_per_store?.[reading.store_id] && product.in_uso === true);
      if (!isInUsoForStore) return;

      const key = `${reading.store_id}-${reading.prodotto_id}`;
      const quantitaEffettiva = aggregatedQuantities[key] || (reading.quantita_rilevata || 0);

      const quantitaCritica = product.store_specific_quantita_critica?.[reading.store_id] || product.quantita_critica || product.quantita_minima || 0;
      const quantitaOrdine = product.store_specific_quantita_ordine?.[reading.store_id] || product.quantita_ordine || 0;

      if (quantitaEffettiva <= quantitaCritica && quantitaOrdine > 0) {
        orders.push({
          ...reading,
          quantita_rilevata: quantitaEffettiva,
          quantita_aggregata: quantitaEffettiva,
          product,
          store,
          quantita_critica: quantitaCritica,
          quantita_ordine: quantitaOrdine,
          fornitore: product.fornitore || 'Non specificato'
        });
      }
    });

    // PHASE 2: Check raw materials that received contributions from semilavorati but weren't directly measured
    Object.entries(aggregatedQuantities).forEach(([key, quantitaAggregata]) => {
      if (latestByProduct[key]) return; // Already checked in PHASE 1
      
      const [storeId, prodottoId] = key.split('-');
      const product = products.find((p) => p.id === prodottoId);
      if (!product || product.attivo === false) return;

      const store = stores.find((s) => s.id === storeId);
      if (!store) return;

      const isAssignedToStore = !product.assigned_stores || product.assigned_stores.length === 0 || product.assigned_stores.includes(storeId);
      if (!isAssignedToStore) return;

      const isInUsoForStore = product.in_uso_per_store?.[storeId] === true || (!product.in_uso_per_store?.[storeId] && product.in_uso === true);
      if (!isInUsoForStore) return;

      const quantitaCritica = product.store_specific_quantita_critica?.[storeId] || product.quantita_critica || product.quantita_minima || 0;
      const quantitaOrdine = product.store_specific_quantita_ordine?.[storeId] || product.quantita_ordine || 0;

      console.log(`✅ PHASE 2 - ${product.nome_prodotto} (${store.name}):`, {
        qty: quantitaAggregata.toFixed(4),
        critical: quantitaCritica,
        order_qty: quantitaOrdine,
        needs_order: quantitaAggregata <= quantitaCritica
      });

      if (quantitaAggregata <= quantitaCritica && quantitaOrdine > 0) {
        orders.push({
          store_id: storeId,
          prodotto_id: prodottoId,
          nome_prodotto: product.nome_prodotto,
          quantita_rilevata: quantitaAggregata,
          quantita_aggregata: quantitaAggregata,
          unita_misura: product.unita_misura,
          data_rilevazione: new Date().toISOString(),
          product,
          store,
          quantita_critica: quantitaCritica,
          quantita_ordine: quantitaOrdine,
          fornitore: product.fornitore || 'Non specificato',
          is_from_semilavorato: true
        });
      }
    });

    return orders;
  }, [inventory, inventoryCantina, products, stores, ricette]);

  // Group orders by store and supplier
  const ordersByStoreAndSupplier = React.useMemo(() => {
    const grouped = {};

    ordersNeeded.forEach((order) => {
      const storeKey = order.store_id;
      const supplierKey = order.fornitore;

      if (!grouped[storeKey]) {
        grouped[storeKey] = {
          store: order.store,
          suppliers: {}
        };
      }

      if (!grouped[storeKey].suppliers[supplierKey]) {
        grouped[storeKey].suppliers[supplierKey] = [];
      }

      grouped[storeKey].suppliers[supplierKey].push(order);
    });

    return grouped;
  }, [ordersNeeded]);

  // Group orders by supplier (for per_fornitore view)
  const ordersBySupplier = React.useMemo(() => {
    const grouped = {};

    ordersNeeded.forEach((order) => {
      const supplierKey = order.fornitore;

      if (!grouped[supplierKey]) {
        grouped[supplierKey] = {
          stores: {}
        };
      }

      const storeKey = order.store_id;
      if (!grouped[supplierKey].stores[storeKey]) {
        grouped[supplierKey].stores[storeKey] = {
          store: order.store,
          orders: []
        };
      }

      grouped[supplierKey].stores[storeKey].orders.push(order);
    });

    return grouped;
  }, [ordersNeeded]);

  const getFornitoreByName = (name) => {
    return fornitori.find((f) =>
    f.ragione_sociale?.toLowerCase() === name?.toLowerCase() ||
    f.ragione_sociale?.toLowerCase().includes(name?.toLowerCase()) ||
    name?.toLowerCase().includes(f.ragione_sociale?.toLowerCase())
    );
  };

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const openConfirmOrder = (ordine) => {
    setConfirmingOrder(ordine);
    const initialQuantities = {};
    const initialConfirmed = {};
    ordine.prodotti.forEach((prod) => {
      initialQuantities[prod.prodotto_id] = prod.quantita_ordinata;
      initialConfirmed[prod.prodotto_id] = false;
    });
    setReceivedQuantities(initialQuantities);
    setConfirmedProducts(initialConfirmed);
    setDdtPhotos([]);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setDdtPhotos((prev) => [...prev, ...uploadedUrls]);
    } catch (error) {
      alert('Errore nel caricamento delle foto: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index) => {
    setDdtPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompleteOrder = async () => {
    if (!confirmingOrder) return;

    const allMatch = confirmingOrder.prodotti.every((prod) =>
      receivedQuantities[prod.prodotto_id] === prod.quantita_ordinata
    );

    if (!allMatch) {
      alert('ATTENZIONE: Le quantità ricevute non corrispondono a quelle ordinate.');
    }

    const updatedProdotti = confirmingOrder.prodotti.map((prod) => ({
      ...prod,
      quantita_ricevuta: receivedQuantities[prod.prodotto_id] || 0
    }));

    // Ricalcola il totale basandosi sulle quantità RICEVUTE
    const totaleNettoRicevuto = updatedProdotti.reduce((sum, p) => {
      return sum + (p.prezzo_unitario || 0) * (p.quantita_ricevuta || 0);
    }, 0);

    const totaleConIVARicevuto = updatedProdotti.reduce((sum, p) => {
      const prezzoConIVA = (p.prezzo_unitario || 0) * (1 + (p.iva_percentuale ?? 22) / 100);
      return sum + prezzoConIVA * (p.quantita_ricevuta || 0);
    }, 0);

    await completeOrderMutation.mutateAsync({
      orderId: confirmingOrder.id,
      data: {
        status: 'completato',
        data_completamento: new Date().toISOString(),
        completato_da: currentUser.email,
        prodotti: updatedProdotti,
        totale_ordine: totaleNettoRicevuto,
        totale_ordine_con_iva: totaleConIVARicevuto,
        foto_ddt: ddtPhotos
      }
    });
  };

  const speakProductName = async (productName) => {
    if (!productName) return;

    setPlayingAudio(productName);
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(productName);
        utterance.lang = 'it-IT';
        utterance.rate = 0.9;
        utterance.onend = () => setPlayingAudio(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error speaking:', error);
      setPlayingAudio(null);
    }
  };

  const allProductsConfirmed = confirmingOrder ?
    confirmingOrder.prodotti
      .filter((p) => p.quantita_ordinata > 0)
      .every((prod) => confirmedProducts[prod.prodotto_id]) :
    false;

  const openOrderEditor = (storeName, storeId, supplierName, orders) => {
    const fornitore = getFornitoreByName(supplierName);

    // Filter out products that already have a pending order OR arrived today OR are inactive
    const prodottiSenzaOrdineInCorso = orders.filter((order) => {
      // Escludi prodotti non attivi
      if (order.product.attivo === false) return false;

      const hasPendingOrder = ordiniInviati.some((o) =>
      o.store_id === storeId &&
      o.prodotti.some((p) => p.prodotto_id === order.product.id)
      );

      const hasArrivedToday = ordiniCompletati.some((o) => {
        const completedToday = o.data_completamento &&
        new Date(o.data_completamento).toDateString() === new Date().toDateString();
        return completedToday &&
        o.store_id === storeId &&
        o.prodotti.some((p) => p.prodotto_id === order.product.id);
      });

      return !hasPendingOrder && !hasArrivedToday;
    });

    const prodotti = prodottiSenzaOrdineInCorso.map((order) => ({
      prodotto_id: order.product.id,
      nome_prodotto: order.nome_prodotto,
      quantita_ordinata: order.quantita_ordine,
      quantita_ricevuta: 0,
      unita_misura: order.unita_misura,
      prezzo_unitario: order.product.prezzo_unitario || 0,
      iva_percentuale: order.product.iva_percentuale ?? 22
    }));

    const totaleOrdineNettoIVA = prodotti.reduce((sum, p) => sum + p.prezzo_unitario * p.quantita_ordinata, 0);
    const totaleOrdineConIVA = prodotti.reduce((sum, p) => {
      const prezzoConIVA = p.prezzo_unitario * (1 + p.iva_percentuale / 100);
      return sum + prezzoConIVA * p.quantita_ordinata;
    }, 0);

    setEditingOrder({
      store_id: storeId,
      store_name: storeName,
      fornitore: supplierName,
      fornitore_email: fornitore?.contatto_email || '',
      prodotti,
      totale_ordine: totaleOrdineNettoIVA,
      totale_ordine_con_iva: totaleOrdineConIVA,
      note: ''
    });
  };

  const saveOrderAsSent = async () => {
    if (!editingOrder) return;

    // Filter out products with quantity 0
    const prodottiFiltrati = editingOrder.prodotti.filter((p) => p.quantita_ordinata > 0);

    if (prodottiFiltrati.length === 0) {
      alert('Aggiungi almeno un prodotto con quantità > 0');
      return;
    }

    // Recalculate totals with filtered products
    const totaleNettoFiltrato = prodottiFiltrati.reduce((sum, p) => sum + p.prezzo_unitario * p.quantita_ordinata, 0);
    const totaleConIVAFiltrato = prodottiFiltrati.reduce((sum, p) => {
      const prezzoConIVA = p.prezzo_unitario * (1 + p.iva_percentuale / 100);
      return sum + prezzoConIVA * p.quantita_ordinata;
    }, 0);

    const orderData = {
      ...editingOrder,
      prodotti: prodottiFiltrati,
      totale_ordine: totaleNettoFiltrato,
      totale_ordine_con_iva: totaleConIVAFiltrato,
      status: 'inviato',
      data_invio: new Date().toISOString()
    };

    await createOrderMutation.mutateAsync(orderData);
  };

  const openEmailCustomization = (storeName, storeId, supplierName, orders) => {
    const fornitore = getFornitoreByName(supplierName);
    const prodotti = orders.map((order) => ({
      prodotto_id: order.product.id,
      nome_prodotto: order.nome_prodotto,
      quantita_ordinata: order.quantita_ordine,
      unita_misura: order.unita_misura,
      prezzo_unitario: order.product.prezzo_unitario || 0,
      iva_percentuale: order.product.iva_percentuale ?? 22
    }));

    const productList = prodotti.map((p) =>
    `• ${p.nome_prodotto}: ${p.quantita_ordinata} ${p.unita_misura}`
    ).join('\n');

    setEmailTemplate({
      subject: `Ordine Sa Pizzedda - ${storeName}`,
      body: `Gentile ${fornitore?.referente_nome || fornitore?.ragione_sociale || supplierName},

Vi inviamo il seguente ordine per il locale ${storeName}:

${productList}

Grazie per la collaborazione.

Cordiali saluti,
Sa Pizzedda`,
      prodotti
    });

    setCustomizingEmail({ storeName, storeId, supplierName, orders, fornitore });
  };

  const sendOrderEmail = async () => {
    const { storeName, storeId, supplierName, fornitore } = customizingEmail;

    if (!fornitore?.contatto_email) {
      alert(`Email non trovata per il fornitore "${supplierName}". Aggiungi l'email del fornitore nella sezione Fornitori.`);
      return;
    }

    const emailKey = `${storeName}-${supplierName}`;
    setSendingEmail((prev) => ({ ...prev, [emailKey]: true }));

    try {
      await base44.functions.invoke('inviaEmailOrdineFornitore', {
        to: fornitore.contatto_email,
        subject: emailTemplate.subject,
        body: emailTemplate.body,
        from_name: 'Sa Pizzedda'
      });

      // Salva ordine come inviato
      const totaleOrdineNettoIVA = emailTemplate.prodotti.reduce((sum, p) => sum + p.prezzo_unitario * p.quantita_ordinata, 0);
      const totaleOrdineConIVA = emailTemplate.prodotti.reduce((sum, p) => {
        const prezzoConIVA = p.prezzo_unitario * (1 + (p.iva_percentuale ?? 22) / 100);
        return sum + prezzoConIVA * p.quantita_ordinata;
      }, 0);

      await createOrderMutation.mutateAsync({
        store_id: storeId,
        store_name: storeName,
        fornitore: supplierName,
        fornitore_email: fornitore.contatto_email,
        prodotti: emailTemplate.prodotti.map((p) => ({
          ...p,
          quantita_ricevuta: 0
        })),
        totale_ordine: totaleOrdineNettoIVA,
        totale_ordine_con_iva: totaleOrdineConIVA,
        status: 'inviato',
        data_invio: new Date().toISOString(),
        note: ''
      });

      setEmailSent((prev) => ({ ...prev, [emailKey]: true }));
      setTimeout(() => {
        setEmailSent((prev) => ({ ...prev, [emailKey]: false }));
      }, 5000);

      setCustomizingEmail(null);

    } catch (error) {
      console.error('Errore invio email:', error);
      alert(`Errore nell'invio dell'email: ${error.message}`);
    } finally {
      setSendingEmail((prev) => ({ ...prev, [emailKey]: false }));
    }
  };

  const tabs = [
  { id: 'suggeriti', label: 'Ordini Suggeriti', icon: Package },
  { id: 'inviati', label: 'Ordini Inviati', icon: Send },
  { id: 'completati', label: 'Ordini Arrivati', icon: CheckCircle },
  { id: 'regole', label: 'Regole Ordini', icon: Calendar },
  { id: 'analisi', label: 'Analisi Ordini', icon: BarChart3 },
  { id: 'confronto', label: 'Confronto Listini', icon: DollarSign }];


  return (
    <ProtectedPage pageName="Inventory">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold" style={{ color: '#000000' }}>📦 Gestione Ordini Fornitori</h1>
          <p style={{ color: '#000000' }}>Ordini suggeriti, inviati e completati</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) =>
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === tab.id ?
            'neumorphic-pressed bg-blue-50 text-blue-700' :
            'neumorphic-flat text-slate-600 hover:text-slate-800'}`
            }>

              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'suggeriti' && ordersNeeded.length > 0 &&
            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
                  {ordersNeeded.length}
                </span>
            }
              {tab.id === 'inviati' && ordiniInviati.length > 0 &&
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500 text-white">
                  {ordiniInviati.length}
                </span>
            }
              {tab.id === 'completati' && (() => {
                const ordiniConDifferenze = ordiniCompletati.filter(o => 
                  !o.differenza_verificata && o.prodotti?.some(p => p.quantita_ricevuta !== p.quantita_ordinata)
                );
                return ordiniConDifferenze.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
                    {ordiniConDifferenze.length}
                  </span>
                );
              })()}
            </button>
          )}
        </div>

        {/* Filters */}
        {activeTab === 'suggeriti' && (
          <NeumorphicCard className="p-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('per_locale')}
                  className={`flex-1 lg:flex-initial px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'per_locale' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Per Locale
                </button>
                <button
                  onClick={() => setViewMode('per_fornitore')}
                  className={`flex-1 lg:flex-initial px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'per_fornitore' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Truck className="w-4 h-4 inline mr-2" />
                  Per Fornitore
                </button>
              </div>
              
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm flex-1 lg:flex-initial">
                <option value="all">Tutti i Locali</option>
                {stores.map((store) =>
                  <option key={store.id} value={store.id}>{store.name}</option>
                )}
              </select>
            </div>
          </NeumorphicCard>
        )}

        {activeTab !== 'suggeriti' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm flex-1 lg:flex-initial">
              <option value="all">Tutti i Locali</option>
              {stores.map((store) =>
                <option key={store.id} value={store.id}>{store.name}</option>
              )}
            </select>
          </div>
        )}

        {/* Ordini Suggeriti Tab */}
        {activeTab === 'suggeriti' &&
        <div className="space-y-6">
            {ordersNeeded.length === 0 ?
          <NeumorphicCard className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun ordine necessario</h3>
                <p className="text-slate-500">Tutte le scorte sono sopra il livello critico</p>
              </NeumorphicCard> :

          viewMode === 'per_locale' ? (
          Object.entries(ordersByStoreAndSupplier).
          filter(([storeId]) => selectedStore === 'all' || storeId === selectedStore).
          map(([storeId, storeData]) => {
            const isExpanded = expandedStoresSuggeriti[storeId];
            const totalOrdersForStore = Object.values(storeData.suppliers).reduce((sum, orders) => sum + orders.length, 0);

            return (
              <NeumorphicCard key={storeId} className="overflow-hidden">
                    <button
                  onClick={() => setExpandedStoresSuggeriti((prev) => ({ ...prev, [storeId]: !prev[storeId] }))}
                  className="w-full p-6 text-left hover:bg-slate-50 transition-colors">

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-slate-800">{storeData.store.name}</h2>
                            <p className="text-xs text-slate-500">{totalOrdersForStore} prodotti da ordinare</p>
                            {(() => {
                          const lastInventario = inventory.filter((i) => i.store_id === storeId).sort((a, b) => new Date(b.data_rilevazione) - new Date(a.data_rilevazione))[0];
                          const lastCantina = inventoryCantina.filter((i) => i.store_id === storeId).sort((a, b) => new Date(b.data_rilevazione) - new Date(a.data_rilevazione))[0];
                          return (
                            <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                                  {lastInventario &&
                              <div>Ultimo inventario: {format(parseISO(lastInventario.data_rilevazione), 'dd/MM/yyyy HH:mm', { locale: it })}</div>
                              }
                                  {lastCantina &&
                              <div>Ultima cantina: {format(parseISO(lastCantina.data_rilevazione), 'dd/MM/yyyy HH:mm', { locale: it })}</div>
                              }
                                </div>);

                        })()}
                          </div>
                        </div>
                        {isExpanded ?
                    <ChevronDown className="w-5 h-5 text-slate-600" /> :

                    <ChevronRight className="w-5 h-5 text-slate-600" />
                    }
                      </div>
                    </button>
                    
                    {isExpanded &&
                <div className="p-6 pt-0 space-y-4">
                        {Object.entries(storeData.suppliers).map(([supplier, orders]) => {
                    const fornitore = getFornitoreByName(supplier);
                    const emailKey = `${storeData.store.name}-${supplier}`;
                    const isSending = sendingEmail[emailKey];
                    const wasSent = emailSent[emailKey];

                    // Filter out products with pending orders or arrived today for totals
                    const ordersForTotal = orders.filter((order) => {
                      const hasPendingOrder = ordiniInviati.some((o) =>
                      o.store_id === storeId &&
                      o.prodotti.some((p) => p.prodotto_id === order.product.id)
                      );

                      const hasArrivedToday = ordiniCompletati.some((o) => {
                        const completedToday = o.data_completamento &&
                        new Date(o.data_completamento).toDateString() === new Date().toDateString();
                        return completedToday &&
                        o.store_id === storeId &&
                        o.prodotti.some((p) => p.prodotto_id === order.product.id);
                      });

                      return !hasPendingOrder && !hasArrivedToday;
                    });

                    const totaleOrdineNettoIVA = ordersForTotal.reduce((sum, order) => {
                      return sum + (order.product.prezzo_unitario || 0) * order.quantita_ordine;
                    }, 0);
                    const totaleOrdineConIVA = ordersForTotal.reduce((sum, order) => {
                      const prezzoUnitario = order.product.prezzo_unitario || 0;
                      const ivaPerc = order.product.iva_percentuale ?? 22;
                      const prezzoConIVA = prezzoUnitario * (1 + ivaPerc / 100);
                      return sum + prezzoConIVA * order.quantita_ordine;
                    }, 0);
                    const ordineMinimo = fornitore?.ordine_minimo || 0;
                    const superaMinimo = totaleOrdineConIVA >= ordineMinimo;

                    return (
                      <div key={supplier} className="neumorphic-pressed p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Truck className="w-5 h-5 text-slate-600" />
                                <h3 className="font-bold text-slate-700">{supplier}</h3>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                                  {orders.length} prodotti
                                </span>
                                {fornitore?.contatto_email &&
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {fornitore.contatto_email}
                                  </span>
                            }
                              </div>
                              
                              <div className="flex gap-2">
                               <button
                              onClick={() => openOrderEditor(storeData.store.name, storeId, supplier, orders)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all">

                                 <Send className="w-4 h-4" />
                                 Segna Inviato
                               </button>

                               {fornitore?.contatto_email &&
                            <button
                              onClick={() => openEmailCustomization(storeData.store.name, storeId, supplier, orders)}
                              disabled={isSending || wasSent}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              wasSent ?
                              'bg-green-100 text-green-700' :
                              'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'} disabled:opacity-50`
                              }>

                                   {isSending ?
                              <>
                                       <Loader2 className="w-4 h-4 animate-spin" />
                                       Invio...
                                     </> :
                              wasSent ?
                              <>
                                       <CheckCircle className="w-4 h-4" />
                                       Inviata!
                                     </> :

                              <>
                                       <Mail className="w-4 h-4" />
                                       Invia Email
                                     </>
                              }
                                 </button>
                            }
                              </div>
                              </div>

                              {/* Check if order was already sent */}
                              {(() => {
                          const alreadySent = ordiniInviati.find((o) =>
                          o.store_id === storeId &&
                          o.fornitore === supplier &&
                          o.prodotti.length === orders.length
                          );
                          if (alreadySent) {
                            return (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                   <CheckCircle className="w-4 h-4 text-green-600" />
                                   <span className="text-xs text-green-700">
                                     Ordine già inviato il {format(parseISO(alreadySent.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                                   </span>
                                 </div>);

                          }
                        })()}

                            <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-500">Netto IVA:</span>
                                    <span className="text-sm font-bold text-slate-700">€{totaleOrdineNettoIVA.toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-500">Con IVA:</span>
                                    <span className="text-lg font-bold text-blue-600">€{totaleOrdineConIVA.toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-700">Min. Fornitore:</span>
                                  <span className="text-lg font-bold text-slate-600">€{ordineMinimo.toFixed(2)}</span>
                                </div>
                                {ordineMinimo > 0 &&
                            <div className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 ${
                            superaMinimo ?
                            'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'}`
                            }>
                                    {superaMinimo ?
                              <>
                                        <CheckCircle className="w-4 h-4" />
                                        Supera minimo
                                      </> :

                              <>
                                        <AlertTriangle className="w-4 h-4" />
                                        Sotto minimo (€{(ordineMinimo - totaleOrdineConIVA).toFixed(2)})
                                      </>
                              }
                                  </div>
                            }
                              </div>
                            </div>

                            {(() => {
                          // Separate products into categories
                          const prodottiInCorso = [];
                          const prodottiArrivatiOggi = [];
                          const prodottiNormali = [];

                          orders.forEach((order) => {
                            // Check if there's already an order for this product FROM THIS SUPPLIER with quantity > 0
                            const hasPendingOrder = ordiniInviati.some((o) =>
                            o.store_id === storeId &&
                            o.fornitore === supplier &&
                            o.prodotti.some((p) => p.prodotto_id === order.product.id && p.quantita_ordinata > 0)
                            );

                            const hasArrivedToday = ordiniCompletati.some((o) => {
                              const completedToday = o.data_completamento &&
                              new Date(o.data_completamento).toDateString() === new Date().toDateString();
                              return completedToday &&
                              o.store_id === storeId &&
                              o.fornitore === supplier &&
                              o.prodotti.some((p) => p.prodotto_id === order.product.id && p.quantita_ordinata > 0);
                            });

                            // Priority: arrived today > in progress > normal
                            if (hasArrivedToday) {
                              prodottiArrivatiOggi.push(order);
                            } else if (hasPendingOrder) {
                              prodottiInCorso.push(order);
                            } else {
                              prodottiNormali.push(order);
                            }
                          });

                          const collapseKey = `${storeId}-${supplier}`;
                          const isInCorsoCollapsed = collapsedInCorso[collapseKey] !== false;
                          const isArrivatiCollapsed = collapsedArrivati[collapseKey] !== false;

                          return (
                            <div className="space-y-3">
                                  {/* Prodotti da ordinare (normali) */}
                                  {prodottiNormali.length > 0 &&
                              <div className="overflow-x-auto">
                                      <table className="w-full min-w-[500px]">
                                        <thead>
                                          <tr className="border-b border-slate-300">
                                            <th className="text-left p-2 text-slate-600 font-medium text-xs">Prodotto</th>
                                            <th className="text-right p-2 text-slate-600 font-medium text-xs">Attuale</th>
                                            <th className="text-right p-2 text-slate-600 font-medium text-xs">Critica</th>
                                            <th className="text-right p-2 text-slate-600 font-medium text-xs">Da Ordinare</th>
                                            <th className="text-right p-2 text-slate-600 font-medium text-xs">IVA</th>
                                            <th className="text-right p-2 text-slate-600 font-medium text-xs">Prezzo Unit.</th>
                                            <th className="text-right p-2 text-slate-600 font-medium text-xs">Totale+IVA</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                         {prodottiNormali.sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto)).map((order, idx) => {
                                      const prezzoUnitario = order.product.prezzo_unitario || 0;
                                      const ivaPerc = order.product.iva_percentuale ?? 22;
                                      const prezzoUnitarioConIVA = prezzoUnitario * (1 + ivaPerc / 100);
                                      const totaleRiga = prezzoUnitario * order.quantita_ordine;
                                      const totaleRigaConIVA = prezzoUnitarioConIVA * order.quantita_ordine;

                                      return (
                                        <tr key={idx} className="border-b border-slate-200">
                                                <td className="p-2 text-sm text-slate-700">
                                                  {order.nome_prodotto}
                                                  {(() => {
                                                    // Trova semilavorati collegati a questa materia prima
                                                    const semilavoratiCollegati = ricette.filter((r) => 
                                                     r.somma_a_materia_prima_id === order.product.id &&
                                                     r.is_semilavorato
                                                    );

                                                    if (semilavoratiCollegati.length === 0) return null;

                                                    const allInventoryCombined = [...inventory, ...inventoryCantina];

                                                    const dettagli = semilavoratiCollegati.map((ricetta) => {
                                                     // Trova l'ultimo inventario per questo semilavorato
                                                     const latestSemilavorato = allInventoryCombined
                                                       .filter((i) => 
                                                         i.store_id === order.store_id &&
                                                         i.nome_prodotto?.toLowerCase() === ricetta.nome_prodotto?.toLowerCase()
                                                       )
                                                       .sort((a, b) => new Date(b.data_rilevazione) - new Date(a.data_rilevazione))[0];

                                                     if (!latestSemilavorato) return null;

                                                     return {
                                                       nome: ricetta.nome_prodotto,
                                                       quantita: latestSemilavorato.quantita_rilevata,
                                                       unita: latestSemilavorato.unita_misura
                                                     };
                                                    }).filter(Boolean);

                                                    if (dettagli.length === 0) return null;

                                                    return (
                                                     <div className="mt-1 text-xs text-blue-600">
                                                       {dettagli.map((d, i) => (
                                                         <div key={i}>
                                                           ↳ {d.nome}: {d.quantita} {d.unita}
                                                         </div>
                                                       ))}
                                                     </div>
                                                    );
                                                    })()}
                                                </td>
                                                <td className="p-2 text-sm text-right text-red-600 font-bold">
                                                  {(order.quantita_aggregata ?? order.quantita_rilevata).toFixed(1)} {order.unita_misura}
                                                </td>
                                                <td className="p-2 text-sm text-right text-slate-500">
                                                  {order.quantita_critica} {order.unita_misura}
                                                </td>
                                                <td className="p-2 text-sm text-right font-bold text-green-600">
                                                  {order.quantita_ordine} {order.unita_misura}
                                                </td>
                                                <td className="p-2 text-sm text-right text-slate-500">
                                                  {ivaPerc}%
                                                </td>
                                                <td className="p-2 text-sm text-right text-slate-600">
                                                  {prezzoUnitario > 0 ? `€${prezzoUnitario.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="p-2 text-sm text-right font-bold text-blue-600">
                                                  {totaleRigaConIVA > 0 ? `€${totaleRigaConIVA.toFixed(2)}` : '-'}
                                                </td>
                                              </tr>);

                                    })}
                                        </tbody>
                                      </table>
                                    </div>
                              }
                                  
                                  {/* Prodotti con ordine in corso (collapsible) */}
                                  {prodottiInCorso.length > 0 &&
                              <div className="mt-4">
                                      <button
                                  onClick={() => setCollapsedInCorso((prev) => ({ ...prev, [collapseKey]: !prev[collapseKey] }))}
                                  className="w-full flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200">

                                        <div className="flex items-center gap-2">
                                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                                          <span className="text-sm font-medium text-orange-700">
                                            Ordine in corso ({prodottiInCorso.length})
                                          </span>
                                        </div>
                                        {isInCorsoCollapsed ?
                                  <ChevronRight className="w-4 h-4 text-orange-600" /> :

                                  <ChevronDown className="w-4 h-4 text-orange-600" />
                                  }
                                      </button>
                                      {!isInCorsoCollapsed &&
                                <div className="mt-2 space-y-1">
                                          {prodottiInCorso.map((order, idx) =>
                                  <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-700">{order.nome_prodotto}</span>
                                                <span className="text-sm font-bold text-orange-600">
                                                  {order.quantita_ordine} {order.unita_misura}
                                                </span>
                                              </div>
                                            </div>
                                  )}
                                        </div>
                                }
                                    </div>
                              }
                                  
                                  {/* Prodotti arrivati oggi (collapsible) */}
                                  {prodottiArrivatiOggi.length > 0 &&
                              <div className="mt-4">
                                      <button
                                  onClick={() => setCollapsedArrivati((prev) => ({ ...prev, [collapseKey]: !prev[collapseKey] }))}
                                  className="w-full flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200">

                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                          <span className="text-sm font-medium text-green-700">
                                            Arrivato oggi ({prodottiArrivatiOggi.length})
                                          </span>
                                        </div>
                                        {isArrivatiCollapsed ?
                                  <ChevronRight className="w-4 h-4 text-green-600" /> :

                                  <ChevronDown className="w-4 h-4 text-green-600" />
                                  }
                                      </button>
                                      {!isArrivatiCollapsed &&
                                <div className="mt-2 space-y-1">
                                          {prodottiArrivatiOggi.map((order, idx) =>
                                  <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-700">{order.nome_prodotto}</span>
                                                <span className="text-sm font-bold text-green-600">
                                                  {order.quantita_ordine} {order.unita_misura}
                                                </span>
                                              </div>
                                            </div>
                                  )}
                                        </div>
                                }
                                    </div>
                              }
                                </div>);

                        })()}
                          </div>);

                  })}
                      </div>
                }
                  </NeumorphicCard>);

          })
          ) : (
          // Vista Per Fornitore
          Object.entries(ordersBySupplier).map(([fornitore, supplierData]) => {
            const isExpanded = expandedFornitori[fornitore];
            const totalOrdersForSupplier = Object.values(supplierData.stores).reduce((sum, storeData) => sum + storeData.orders.length, 0);
            
            // Calculate totals across all stores for this supplier
            let totalNettoIVA = 0;
            let totalConIVA = 0;
            Object.values(supplierData.stores).forEach(storeData => {
              storeData.orders.forEach(order => {
                const hasPendingOrder = ordiniInviati.some((o) =>
                  o.store_id === storeData.store.id &&
                  o.fornitore === fornitore &&
                  o.prodotti.some((p) => p.prodotto_id === order.product.id)
                );
                const hasArrivedToday = ordiniCompletati.some((o) => {
                  const completedToday = o.data_completamento &&
                    new Date(o.data_completamento).toDateString() === new Date().toDateString();
                  return completedToday &&
                    o.store_id === storeData.store.id &&
                    o.fornitore === fornitore &&
                    o.prodotti.some((p) => p.prodotto_id === order.product.id);
                });
                
                if (!hasPendingOrder && !hasArrivedToday) {
                  const prezzoUnitario = order.product.prezzo_unitario || 0;
                  const ivaPerc = order.product.iva_percentuale ?? 22;
                  const prezzoConIVA = prezzoUnitario * (1 + ivaPerc / 100);
                  totalNettoIVA += prezzoUnitario * order.quantita_ordine;
                  totalConIVA += prezzoConIVA * order.quantita_ordine;
                }
              });
            });

            const fornitoreEntity = getFornitoreByName(fornitore);
            const ordineMinimo = fornitoreEntity?.ordine_minimo || 0;
            const superaMinimo = totalConIVA >= ordineMinimo;

            return (
              <NeumorphicCard key={fornitore} className="overflow-hidden">
                <button
                  onClick={() => setExpandedFornitori((prev) => ({ ...prev, [fornitore]: !prev[fornitore] }))}
                  className="w-full p-6 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">{fornitore}</h2>
                        <p className="text-xs text-slate-500">
                          {totalOrdersForSupplier} prodotti • {Object.keys(supplierData.stores).length} locali
                        </p>
                        {fornitoreEntity?.contatto_email && (
                          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {fornitoreEntity.contatto_email}
                          </p>
                        )}
                      </div>
                    </div>
                    {isExpanded ? 
                      <ChevronDown className="w-5 h-5 text-slate-600" /> : 
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    }
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-6 pt-0 space-y-4">
                    <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Netto IVA:</span>
                            <span className="text-sm font-bold text-slate-700">€{totalNettoIVA.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Con IVA:</span>
                            <span className="text-lg font-bold text-blue-600">€{totalConIVA.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">Min. Fornitore:</span>
                          <span className="text-lg font-bold text-slate-600">€{ordineMinimo.toFixed(2)}</span>
                        </div>
                        {ordineMinimo > 0 && (
                          <div className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 ${
                            superaMinimo 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {superaMinimo ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Supera minimo
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4" />
                                Sotto minimo (€{(ordineMinimo - totalConIVA).toFixed(2)})
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {Object.entries(supplierData.stores)
                      .filter(([storeId]) => selectedStore === 'all' || storeId === selectedStore)
                      .map(([storeId, storeData]) => {
                        const ordersForStore = storeData.orders;

                        // Separate products
                        const prodottiInCorso = [];
                        const prodottiArrivatiOggi = [];
                        const prodottiNormali = [];

                        ordersForStore.forEach((order) => {
                          const hasPendingOrder = ordiniInviati.some((o) =>
                            o.store_id === storeId &&
                            o.fornitore === fornitore &&
                            o.prodotti.some((p) => p.prodotto_id === order.product.id && p.quantita_ordinata > 0)
                          );

                          const hasArrivedToday = ordiniCompletati.some((o) => {
                            const completedToday = o.data_completamento &&
                              new Date(o.data_completamento).toDateString() === new Date().toDateString();
                            return completedToday &&
                              o.store_id === storeId &&
                              o.fornitore === fornitore &&
                              o.prodotti.some((p) => p.prodotto_id === order.product.id && p.quantita_ordinata > 0);
                          });

                          if (hasArrivedToday) {
                            prodottiArrivatiOggi.push(order);
                          } else if (hasPendingOrder) {
                            prodottiInCorso.push(order);
                          } else {
                            prodottiNormali.push(order);
                          }
                        });

                        const collapseKey = `${storeId}-${fornitore}`;
                        const isInCorsoCollapsed = collapsedInCorso[collapseKey] !== false;
                        const isArrivatiCollapsed = collapsedArrivati[collapseKey] !== false;

                        return (
                          <div key={storeId} className="neumorphic-pressed p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-slate-700">{storeData.store.name}</h3>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                                  {ordersForStore.length} prodotti
                                </span>
                              </div>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openOrderEditor(storeData.store.name, storeId, fornitore, ordersForStore)}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all">
                                  <Send className="w-3 h-3" />
                                  Segna Inviato
                                </button>
                                {fornitoreEntity?.contatto_email && (
                                  <button
                                    onClick={() => openEmailCustomization(storeData.store.name, storeId, fornitore, ordersForStore)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all">
                                    <Mail className="w-3 h-3" />
                                    Invia Email
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Products table */}
                            {prodottiNormali.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[500px]">
                                  <thead>
                                    <tr className="border-b border-slate-300">
                                      <th className="text-left p-2 text-slate-600 font-medium text-xs">Prodotto</th>
                                      <th className="text-right p-2 text-slate-600 font-medium text-xs">Attuale</th>
                                      <th className="text-right p-2 text-slate-600 font-medium text-xs">Critica</th>
                                      <th className="text-right p-2 text-slate-600 font-medium text-xs">Da Ordinare</th>
                                      <th className="text-right p-2 text-slate-600 font-medium text-xs">IVA</th>
                                      <th className="text-right p-2 text-slate-600 font-medium text-xs">Prezzo Unit.</th>
                                      <th className="text-right p-2 text-slate-600 font-medium text-xs">Totale+IVA</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {prodottiNormali.sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto)).map((order, idx) => {
                                      const prezzoUnitario = order.product.prezzo_unitario || 0;
                                      const ivaPerc = order.product.iva_percentuale ?? 22;
                                      const prezzoUnitarioConIVA = prezzoUnitario * (1 + ivaPerc / 100);
                                      const totaleRigaConIVA = prezzoUnitarioConIVA * order.quantita_ordine;

                                      return (
                                        <tr key={idx} className="border-b border-slate-200">
                                          <td className="p-2 text-sm text-slate-700">{order.nome_prodotto}</td>
                                          <td className="p-2 text-sm text-right text-red-600 font-bold">
                                            {(order.quantita_aggregata ?? order.quantita_rilevata).toFixed(1)} {order.unita_misura}
                                          </td>
                                          <td className="p-2 text-sm text-right text-slate-500">
                                            {order.quantita_critica} {order.unita_misura}
                                          </td>
                                          <td className="p-2 text-sm text-right font-bold text-green-600">
                                            {order.quantita_ordine} {order.unita_misura}
                                          </td>
                                          <td className="p-2 text-sm text-right text-slate-500">
                                            {ivaPerc}%
                                          </td>
                                          <td className="p-2 text-sm text-right text-slate-600">
                                            {prezzoUnitario > 0 ? `€${prezzoUnitario.toFixed(2)}` : '-'}
                                          </td>
                                          <td className="p-2 text-sm text-right font-bold text-blue-600">
                                            {totaleRigaConIVA > 0 ? `€${totaleRigaConIVA.toFixed(2)}` : '-'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* In corso / Arrivati sections */}
                            {prodottiInCorso.length > 0 && (
                              <div className="mt-4">
                                <button
                                  onClick={() => setCollapsedInCorso((prev) => ({ ...prev, [collapseKey]: !prev[collapseKey] }))}
                                  className="w-full flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                                    <span className="text-sm font-medium text-orange-700">
                                      Ordine in corso ({prodottiInCorso.length})
                                    </span>
                                  </div>
                                  {isInCorsoCollapsed ? 
                                    <ChevronRight className="w-4 h-4 text-orange-600" /> : 
                                    <ChevronDown className="w-4 h-4 text-orange-600" />
                                  }
                                </button>
                                {!isInCorsoCollapsed && (
                                  <div className="mt-2 space-y-1">
                                    {prodottiInCorso.map((order, idx) => (
                                      <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm text-slate-700">{order.nome_prodotto}</span>
                                          <span className="text-sm font-bold text-orange-600">
                                            {order.quantita_ordine} {order.unita_misura}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {prodottiArrivatiOggi.length > 0 && (
                              <div className="mt-4">
                                <button
                                  onClick={() => setCollapsedArrivati((prev) => ({ ...prev, [collapseKey]: !prev[collapseKey] }))}
                                  className="w-full flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">
                                      Arrivato oggi ({prodottiArrivatiOggi.length})
                                    </span>
                                  </div>
                                  {isArrivatiCollapsed ? 
                                    <ChevronRight className="w-4 h-4 text-green-600" /> : 
                                    <ChevronDown className="w-4 h-4 text-green-600" />
                                  }
                                </button>
                                {!isArrivatiCollapsed && (
                                  <div className="mt-2 space-y-1">
                                    {prodottiArrivatiOggi.map((order, idx) => (
                                      <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm text-slate-700">{order.nome_prodotto}</span>
                                          <span className="text-sm font-bold text-green-600">
                                            {order.quantita_ordine} {order.unita_misura}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </NeumorphicCard>
            );
          })
          )
          }
          </div>
        }

        {/* Ordini Inviati Tab */}
        {activeTab === 'inviati' &&
        <div className="space-y-4">
            {ordiniInviati.length === 0 ?
          <NeumorphicCard className="p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun ordine inviato</h3>
                <p className="text-slate-500">Gli ordini inviati appariranno qui</p>
              </NeumorphicCard> :

          (() => {
            // Calculate average delivery times per supplier from completed orders
            const avgDeliveryTimes = {};
            ordiniCompletati.forEach((ordine) => {
              if (ordine.data_invio && ordine.data_completamento) {
                const giorni = Math.ceil((new Date(ordine.data_completamento) - new Date(ordine.data_invio)) / (1000 * 60 * 60 * 24));
                if (!avgDeliveryTimes[ordine.fornitore]) {
                  avgDeliveryTimes[ordine.fornitore] = { total: 0, count: 0 };
                }
                avgDeliveryTimes[ordine.fornitore].total += giorni;
                avgDeliveryTimes[ordine.fornitore].count++;
              }
            });

            const avgDeliveryDays = {};
            Object.entries(avgDeliveryTimes).forEach(([fornitore, data]) => {
              avgDeliveryDays[fornitore] = Math.round(data.total / data.count);
            });

            // Group orders by supplier
            const ordersBySupplier = {};
            ordiniInviati.
            filter((o) => selectedStore === 'all' || o.store_id === selectedStore).
            forEach((ordine) => {
              if (!ordersBySupplier[ordine.fornitore]) {
                ordersBySupplier[ordine.fornitore] = [];
              }
              ordersBySupplier[ordine.fornitore].push(ordine);
            });

            return Object.entries(ordersBySupplier).map(([fornitore, ordini]) => {
              const isExpanded = expandedFornitori[fornitore];
              const totalOrders = ordini.length;
              const totalValue = ordini.reduce((sum, o) => sum + o.totale_ordine, 0);

              return (
                <NeumorphicCard key={fornitore} className="overflow-hidden">
                      <button
                    onClick={() => setExpandedFornitori((prev) => ({ ...prev, [fornitore]: !prev[fornitore] }))}
                    className="w-full p-6 text-left hover:bg-slate-50 transition-colors">

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <Truck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-slate-800">{fornitore}</h2>
                              <p className="text-xs text-slate-500">
                                {totalOrders} ordini • €{totalValue.toFixed(2)}
                                {avgDeliveryDays[fornitore] && ` • Media: ${avgDeliveryDays[fornitore]}gg`}
                              </p>
                            </div>
                          </div>
                          {isExpanded ?
                      <ChevronDown className="w-5 h-5 text-slate-600" /> :

                      <ChevronRight className="w-5 h-5 text-slate-600" />
                      }
                        </div>
                      </button>

                      {isExpanded &&
                  <div className="p-6 pt-0 space-y-3">
                          {ordini.map((ordine) => {
                            const giorniTrascorsi = Math.ceil((new Date() - new Date(ordine.data_invio)) / (1000 * 60 * 60 * 24));
                            const tempoMedio = avgDeliveryDays[ordine.fornitore] || null;
                            const isInRitardo = tempoMedio && giorniTrascorsi > tempoMedio;

                            return (
                    <div key={ordine.id} className={`neumorphic-pressed p-4 rounded-xl ${isInRitardo ? 'border-2 border-red-400' : ''}`}>
                              {isInRitardo &&
                                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                  <div>
                                    <p className="font-bold text-red-800 text-sm">⚠️ Ritardo nella consegna</p>
                                    <p className="text-xs text-red-700">
                                      Tempo medio: {tempoMedio}gg • Trascorsi: {giorniTrascorsi}gg
                                    </p>
                                  </div>
                                </div>
                              }
                              
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
                                <div className="flex-1">
                                  <h3 className="font-bold text-slate-800">{ordine.store_name}</h3>
                                  <p className="text-xs text-slate-400">
                                    Inviato: {format(parseISO(ordine.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    Giorni trascorsi: {giorniTrascorsi}
                                  </p>
                                  {(() => {
                              const totaleCalcolato = ordine.prodotti.
                              filter((p) => p.quantita_ordinata > 0).
                              reduce((sum, p) => {
                                const currentProduct = products.find((prod) => prod.id === p.prodotto_id);
                                const ivaCorrente = currentProduct?.iva_percentuale ?? p.iva_percentuale ?? 22;
                                const prezzoConIVA = (p.prezzo_unitario || 0) * (1 + ivaCorrente / 100);
                                return sum + prezzoConIVA * p.quantita_ordinata;
                              }, 0);
                              return (
                                <div className="mt-2">
                                          <p className="text-sm text-slate-500 line-through">€{ordine.totale_ordine.toFixed(2)}</p>
                                          <p className="text-xl font-bold text-blue-600">€{totaleCalcolato.toFixed(2)}</p>
                                          <p className="text-xs text-green-700 font-medium">IVA inclusa</p>
                                          <p className="text-xs text-slate-500 mt-1">{ordine.prodotti.filter((p) => p.quantita_ordinata > 0).length} prodotti</p>
                                        </div>);

                              })()}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                   <button
                              onClick={(e) => {
                              e.stopPropagation();
                              setEditingInviatoOrder(ordine);
                              }}
                              className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-1 shadow-md">

                                     <Edit className="w-4 h-4" />
                                     <span className="text-sm font-medium">Modifica</span>
                                   </button>
                                   <button
                              onClick={(e) => {
                              e.stopPropagation();
                              openConfirmOrder(ordine);
                              }}
                              className="px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-1 shadow-md">

                                     <CheckCircle className="w-4 h-4" />
                                     <span className="text-sm font-medium">Conferma</span>
                                   </button>
                                   <button
                              onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Eliminare questo ordine?')) {
                                deleteOrderMutation.mutate(ordine.id);
                              }
                              }}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors border border-red-200">

                                     <Trash2 className="w-4 h-4 text-red-600" />
                                   </button>
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-300">
                                      <th className="text-left p-2 text-slate-600 font-medium text-xs">Prodotto</th>
                                      <th className="text-right p-2 text-slate-600 font-medium text-xs">Quantità</th>
                                      <th className="text-right p-2 text-slate-600 font-medium text-xs">Prezzo Unit.</th>
                                      <th className="text-right p-2 text-slate-600 font-medium text-xs">Totale</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ordine.prodotti.filter((prod) => prod.quantita_ordinata > 0).map((prod, idx) => {
                              // Get current IVA from products
                              const currentProduct = products.find((p) => p.id === prod.prodotto_id);
                              const ivaCorrente = currentProduct?.iva_percentuale ?? prod.iva_percentuale ?? 22;
                              const prezzoUnitarioConIVA = (prod.prezzo_unitario || 0) * (1 + ivaCorrente / 100);
                              const totaleConIVA = prezzoUnitarioConIVA * prod.quantita_ordinata;

                              return (
                                <tr key={idx} className="border-b border-slate-200">
                                        <td className="p-2 text-slate-700">
                                          {prod.nome_prodotto}
                                          <span className="text-xs text-slate-400 ml-1">(IVA {ivaCorrente}%)</span>
                                        </td>
                                        <td className="p-2 text-right text-slate-700">
                                          {prod.quantita_ordinata} {prod.unita_misura}
                                        </td>
                                        <td className="p-2 text-right text-slate-600">
                                          €{prezzoUnitarioConIVA.toFixed(2)}
                                        </td>
                                        <td className="p-2 text-right font-bold text-blue-600">
                                          €{totaleConIVA.toFixed(2)}
                                        </td>
                                      </tr>);

                            })}
                                  </tbody>
                                </table>
                              </div>
                            </div>);
                          })}
                        </div>
                  }
                    </NeumorphicCard>);

            });
          })()
          }
          </div>
        }

        {/* Regole Ordini Tab */}
        {activeTab === 'regole' &&
        <div className="space-y-4">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Regole Ordini Prodotti</h2>
                  <p className="text-sm text-slate-500 mt-1">Definisci in quali giorni della settimana ogni prodotto può essere ordinato</p>
                </div>
                <NeumorphicButton
                onClick={() => {
                  setEditingRegola({
                    prodotto_id: '',
                    giorni_settimana: [],
                    note: '',
                    attivo: true
                  });
                  setShowRegoleForm(true);
                }}
                variant="primary"
                className="flex items-center gap-2">

                  <Plus className="w-4 h-4" />
                  Nuova Regola
                </NeumorphicButton>
              </div>

              {regoleOrdini.length === 0 ?
            <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessuna regola configurata</p>
                </div> :

            <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-blue-600">
                        <th className="text-left p-3 text-slate-600 font-medium">Prodotto</th>
                        <th className="text-left p-3 text-slate-600 font-medium">Giorni Ordinabili</th>
                        <th className="text-left p-3 text-slate-600 font-medium">Note</th>
                        <th className="text-right p-3 text-slate-600 font-medium">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regoleOrdini.map((regola) => {
                    const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
                    const giorniLabel = regola.giorni_settimana.
                    sort((a, b) => a - b).
                    map((g) => giorni[g]).
                    join(', ');

                    return (
                      <tr key={regola.id} className="border-b border-slate-200">
                            <td className="p-3 text-slate-800 font-medium">{regola.nome_prodotto}</td>
                            <td className="p-3 text-slate-700">{giorniLabel}</td>
                            <td className="p-3 text-slate-600 text-sm">{regola.note || '-'}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                              onClick={() => {
                                setEditingRegola(regola);
                                setShowRegoleForm(true);
                              }}
                              className="nav-button p-2 rounded-lg hover:bg-blue-50">

                                  <Edit className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                              onClick={() => {
                                if (confirm('Eliminare questa regola?')) {
                                  deleteRegolaMutation.mutate(regola.id);
                                }
                              }}
                              className="nav-button p-2 rounded-lg hover:bg-red-50">

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
            </NeumorphicCard>
          </div>
        }

        {/* Ordini Completati Tab */}
        {activeTab === 'completati' &&
        <div className="space-y-4">
            {ordiniCompletati.length === 0 ?
          <NeumorphicCard className="p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun ordine completato</h3>
                <p className="text-slate-500">Gli ordini completati appariranno qui</p>
              </NeumorphicCard> :

          (() => {
            // Group orders by store
            const ordersByStore = {};
            ordiniCompletati.
            filter((o) => selectedStore === 'all' || o.store_id === selectedStore).
            forEach((ordine) => {
              if (!ordersByStore[ordine.store_id]) {
                ordersByStore[ordine.store_id] = {
                  store_name: ordine.store_name,
                  ordini: []
                };
              }
              ordersByStore[ordine.store_id].ordini.push(ordine);
            });

            return Object.entries(ordersByStore).map(([storeId, storeData]) => {
              const isExpanded = expandedStoresCompletati[storeId];
              const hasDiscrepancies = storeData.ordini.some((ordine) =>
              !ordine.differenza_verificata && ordine.prodotti.some((prod) => prod.quantita_ricevuta !== prod.quantita_ordinata)
              );

              return (
                <NeumorphicCard key={storeId} className="overflow-hidden">
                      <button
                    onClick={() => setExpandedStoresCompletati((prev) => ({ ...prev, [storeId]: !prev[storeId] }))}
                    className="w-full p-6 text-left hover:bg-slate-50 transition-colors">

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-slate-800">{storeData.store_name}</h2>
                              <p className="text-xs text-slate-500">{storeData.ordini.length} ordini completati</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {hasDiscrepancies &&
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-100">
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                                <span className="text-xs font-bold text-orange-700">Differenze</span>
                              </div>
                        }
                            {isExpanded ?
                        <ChevronDown className="w-5 h-5 text-slate-600" /> :

                        <ChevronRight className="w-5 h-5 text-slate-600" />
                        }
                          </div>
                        </div>
                      </button>
                      
                      {isExpanded &&
                  <div className="p-6 pt-0 space-y-3">
                          {storeData.ordini.map((ordine) => {
                      const hasDifferences = ordine.prodotti.some((prod) => prod.quantita_ricevuta !== prod.quantita_ordinata);

                      return (
                        <div key={ordine.id} className="neumorphic-pressed p-4 rounded-xl border-2 border-green-200">
                                {hasDifferences &&
                          <div className={`mb-3 p-2 border rounded-lg flex items-center justify-between ${
                          ordine.differenza_verificata ?
                          'bg-blue-50 border-blue-200' :
                          'bg-orange-50 border-orange-200'}`
                          }>
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className={`w-4 h-4 ${ordine.differenza_verificata ? 'text-blue-600' : 'text-orange-600'}`} />
                                      <span className={`text-xs font-medium ${ordine.differenza_verificata ? 'text-blue-700' : 'text-orange-700'}`}>
                                        {ordine.differenza_verificata ?
                                '✓ Differenza verificata con fornitore' :
                                '⚠️ Quantità ricevute diverse da quelle ordinate'}
                                      </span>
                                    </div>
                                    {!ordine.differenza_verificata &&
                            <NeumorphicButton
                              onClick={() => updateOrderMutation.mutate({
                                id: ordine.id,
                                data: { differenza_verificata: true }
                              })}
                              className="flex items-center gap-1 text-xs">

                                        <CheckCircle className="w-3 h-3" />
                                        Segna Verificato
                                      </NeumorphicButton>
                            }
                                  </div>
                          }
                                
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-500">{ordine.fornitore}</p>
                                    <p className="text-xs text-slate-400">
                                      Inviato: {format(parseISO(ordine.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      Completato: {format(parseISO(ordine.data_completamento), 'dd/MM/yyyy HH:mm', { locale: it })}
                                    </p>
                                    <p className="text-xs text-slate-400">Da: {ordine.completato_da}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="text-xl font-bold text-green-600">€{ordine.totale_ordine.toFixed(2)}</p>
                                      <p className="text-xs text-slate-500">{ordine.prodotti.length} prodotti</p>
                                    </div>
                                    <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Eliminare questo ordine completato?')) {
                                    deleteOrderMutation.mutate(ordine.id);
                                  }
                                }}
                                className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors">

                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-300">
                                        <th className="text-left p-2 text-slate-600 font-medium text-xs">Prodotto</th>
                                        <th className="text-right p-2 text-slate-600 font-medium text-xs">Ordinato</th>
                                        <th className="text-right p-2 text-slate-600 font-medium text-xs">Ricevuto</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {ordine.prodotti.filter((prod) => prod.quantita_ordinata > 0).map((prod, idx) => {
                                  const isDifferent = prod.quantita_ricevuta !== prod.quantita_ordinata;
                                  return (
                                    <tr key={idx} className={`border-b border-slate-200 ${isDifferent ? 'bg-orange-50' : ''}`}>
                                            <td className="p-2 text-slate-700">{prod.nome_prodotto}</td>
                                            <td className="p-2 text-right text-slate-700">
                                              {prod.quantita_ordinata} {prod.unita_misura}
                                            </td>
                                            <td className={`p-2 text-right font-bold ${
                                      prod.quantita_ricevuta === prod.quantita_ordinata ?
                                      'text-green-600' :
                                      'text-orange-600'}`
                                      }>
                                              {prod.quantita_ricevuta} {prod.unita_misura}
                                              {isDifferent &&
                                        <span className="ml-2 text-xs">
                                                  ({prod.quantita_ricevuta > prod.quantita_ordinata ? '+' : ''}{(prod.quantita_ricevuta - prod.quantita_ordinata).toFixed(1)})
                                                </span>
                                        }
                                            </td>
                                          </tr>);

                                })}
                                    </tbody>
                                  </table>
                                </div>
                                {ordine.note &&
                          <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
                                   <p className="text-xs text-slate-600"><strong>Note:</strong> {ordine.note}</p>
                                 </div>
                          }

                                {ordine.foto_ddt && ordine.foto_ddt.length > 0 &&
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                   <div className="flex items-center gap-2 mb-2">
                                     <Camera className="w-4 h-4 text-blue-600" />
                                     <p className="text-xs font-bold text-blue-800">Foto DDT ({ordine.foto_ddt.length})</p>
                                   </div>
                                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                     {ordine.foto_ddt.map((url, idx) =>
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="neumorphic-flat rounded-lg overflow-hidden hover:shadow-lg transition-shadow group">

                                         <div className="relative">
                                           <img src={url} alt={`DDT ${idx + 1}`} className="w-full h-24 object-cover" />
                                           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                             <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                           </div>
                                         </div>
                                       </a>
                              )}
                                   </div>
                                 </div>
                          }
                                </div>);

                    })}
                                </div>
                  }
                                </NeumorphicCard>);

            });
          })()
          }
                                </div>
        }

        {/* Order Editor Modal */}
        {editingOrder &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Conferma Ordine - {editingOrder.store_name}</h2>
                <button onClick={() => setEditingOrder(null)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="neumorphic-flat p-4 rounded-xl space-y-1">
                  <p className="text-sm text-slate-600"><strong>Fornitore:</strong> {editingOrder.fornitore}</p>
                  <p className="text-sm text-slate-600"><strong>Totale Netto IVA:</strong> €{editingOrder.totale_ordine.toFixed(2)}</p>
                  <p className="text-sm text-slate-800 font-bold"><strong>Totale con IVA:</strong> €{editingOrder.totale_ordine_con_iva.toFixed(2)}</p>
                </div>

                <div>
                  {/* Search Bar */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                      type="text"
                      placeholder="Cerca prodotto..."
                      value={searchTermModal}
                      onChange={(e) => setSearchTermModal(e.target.value)}
                      className="w-full neumorphic-pressed pl-10 pr-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800">Prodotti Ordinati</h3>
                    <NeumorphicButton
                    onClick={() => {
                      // Get available products from this supplier
                      const prodottiDisponibili = products.filter((p) =>
                      p.fornitore === editingOrder.fornitore &&
                      p.attivo !== false &&
                      !editingOrder.prodotti.some((ep) => ep.prodotto_id === p.id)
                      );

                      if (prodottiDisponibili.length === 0) {
                        alert('Nessun altro prodotto disponibile per questo fornitore');
                        return;
                      }

                      // Show modal to select product and quantity
                      setAddProductModal({
                        open: true,
                        availableProducts: prodottiDisponibili
                      });
                    }}
                    className="flex items-center gap-2 text-sm">

                      <Plus className="w-4 h-4" />
                      Aggiungi Prodotto
                    </NeumorphicButton>
                  </div>
                  
                  {searchTermModal && editingOrder.prodotti.filter((prod) => prod.nome_prodotto.toLowerCase().includes(searchTermModal.toLowerCase())).length === 0 &&
                <div className="text-center py-4 text-slate-500 text-sm">
                      Nessun prodotto trovato
                    </div>
                }
                  
                  <div className="space-y-2">
                    {editingOrder.prodotti.
                  filter((prod) => !searchTermModal || prod.nome_prodotto.toLowerCase().includes(searchTermModal.toLowerCase())).
                  map((prod, idx) => {
                    const prezzoConIVA = prod.prezzo_unitario * (1 + (prod.iva_percentuale ?? 22) / 100);
                    const totaleNetto = prod.prezzo_unitario * prod.quantita_ordinata;
                    const totaleConIVA = prezzoConIVA * prod.quantita_ordinata;

                    return (
                      <div key={idx} className={`neumorphic-pressed p-3 rounded-xl ${prod.isExtra ? 'border-2 border-purple-300' : ''}`}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{prod.nome_prodotto}</p>
                            <p className="text-xs text-slate-500">IVA {prod.iva_percentuale ?? 22}%</p>
                            {prod.isExtra &&
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 mt-1 inline-block">
                                Extra
                              </span>
                            }
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Quantità</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={prod.quantita_ordinata}
                              onChange={(e) => {
                                const newProdotti = [...editingOrder.prodotti];
                                const actualIdx = editingOrder.prodotti.findIndex((p) => p.prodotto_id === prod.prodotto_id);
                                newProdotti[actualIdx].quantita_ordinata = parseFloat(e.target.value) || 0;
                                const newTotaleNetto = newProdotti.reduce((sum, p) => sum + p.prezzo_unitario * p.quantita_ordinata, 0);
                                const newTotaleConIVA = newProdotti.reduce((sum, p) => {
                                  const pIVA = p.prezzo_unitario * (1 + (p.iva_percentuale ?? 22) / 100);
                                  return sum + pIVA * p.quantita_ordinata;
                                }, 0);
                                setEditingOrder({ ...editingOrder, prodotti: newProdotti, totale_ordine: newTotaleNetto, totale_ordine_con_iva: newTotaleConIVA });
                              }}
                              className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm text-slate-700 outline-none" />

                            <p className="text-xs text-slate-500">{prod.unita_misura}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Prezzo Unitario</p>
                            <p className="text-sm font-medium text-slate-700">€{prod.prezzo_unitario.toFixed(2)}</p>
                            <p className="text-xs text-slate-400">(netto IVA)</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Totale Netto</p>
                            <p className="text-sm font-bold text-slate-700">€{totaleNetto.toFixed(2)}</p>
                            <p className="text-xs text-slate-500 mt-1">Totale +IVA</p>
                            <p className="text-base font-bold text-blue-600">€{totaleConIVA.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>);

                  })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Note (opzionale)</label>
                  <textarea
                  value={editingOrder.note}
                  onChange={(e) => setEditingOrder({ ...editingOrder, note: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none h-20 resize-none"
                  placeholder="Aggiungi note sull'ordine..." />

                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={() => setEditingOrder(null)} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                  onClick={saveOrderAsSent}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2">

                    <Send className="w-5 h-5" />
                    Segna Come Inviato
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        }

        {/* Analisi Ordini Tab */}
        {activeTab === 'analisi' &&
        <div className="space-y-6">
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6">📊 Analisi Ordini</h2>
              
              {/* Time Range and Product Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Periodo Temporale
                  </label>
                  <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none">

                    <option value="week">Ultima Settimana</option>
                    <option value="month">Ultimo Mese</option>
                    <option value="3months">Ultimi 3 Mesi</option>
                    <option value="6months">Ultimi 6 Mesi</option>
                    <option value="year">Ultimo Anno</option>
                    <option value="all">Tutto il Periodo</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Prodotto Specifico
                  </label>
                  <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none">

                    <option value="all">Tutti i Prodotti</option>
                    {(() => {
                    const allOrders = [...ordiniInviati, ...ordiniCompletati];
                    const productNames = new Set();
                    allOrders.forEach((order) => {
                      order.prodotti.forEach((prod) => productNames.add(prod.nome_prodotto));
                    });
                    return Array.from(productNames).sort().map((name) =>
                    <option key={name} value={name}>{name}</option>
                    );
                  })()}
                  </select>
                </div>
              </div>
              
              {(() => {
              const now = new Date();
              let startDate = new Date(0); // Default: all time

              switch (timeRange) {
                case 'week':
                  startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  break;
                case 'month':
                  startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  break;
                case '3months':
                  startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                  break;
                case '6months':
                  startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                  break;
                case 'year':
                  startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                  break;
              }

              const allOrders = [...ordiniInviati, ...ordiniCompletati];
              let filteredOrders = allOrders.filter((o) => {
                const orderDate = new Date(o.data_invio || o.created_date);
                return orderDate >= startDate;
              });

              if (selectedStore !== 'all') {
                filteredOrders = filteredOrders.filter((o) => o.store_id === selectedStore);
              }

              if (filteredOrders.length === 0) {
                return <p className="text-center text-slate-500 py-8">Nessun ordine trovato</p>;
              }

              // Group by store
              const byStore = {};
              filteredOrders.forEach((order) => {
                if (!byStore[order.store_name]) {
                  byStore[order.store_name] = {
                    count: 0,
                    total: 0,
                    inviati: 0,
                    completati: 0
                  };
                }
                byStore[order.store_name].count++;
                byStore[order.store_name].total += order.totale_ordine;
                if (order.status === 'inviato') byStore[order.store_name].inviati++;
                if (order.status === 'completato') byStore[order.store_name].completati++;
              });

              // Group by product
              const byProduct = {};
              filteredOrders.forEach((order) => {
                order.prodotti.forEach((prod) => {
                  if (!byProduct[prod.nome_prodotto]) {
                    byProduct[prod.nome_prodotto] = {
                      count: 0,
                      totalQuantity: 0,
                      totalCost: 0,
                      unit: prod.unita_misura
                    };
                  }
                  byProduct[prod.nome_prodotto].count++;
                  byProduct[prod.nome_prodotto].totalQuantity += prod.quantita_ordinata;
                  byProduct[prod.nome_prodotto].totalCost += prod.prezzo_unitario * prod.quantita_ordinata;
                });
              });

              // Group by supplier
              const bySupplier = {};
              filteredOrders.forEach((order) => {
                if (!bySupplier[order.fornitore]) {
                  bySupplier[order.fornitore] = {
                    count: 0,
                    total: 0
                  };
                }
                bySupplier[order.fornitore].count++;
                bySupplier[order.fornitore].total += order.totale_ordine;
              });

              // Group by month for table
              const byMonth = {};
              filteredOrders.forEach((order) => {
                const date = order.data_invio || order.created_date;
                const month = format(parseISO(date), 'MMM yyyy', { locale: it });
                if (!byMonth[month]) {
                  byMonth[month] = {
                    count: 0,
                    total: 0
                  };
                }
                byMonth[month].count++;
                byMonth[month].total += order.totale_ordine;
              });

              // Group by date for timeline
              const byDate = {};
              filteredOrders.forEach((order) => {
                const date = order.data_invio || order.created_date;
                const dateKey = format(parseISO(date), 'dd MMM', { locale: it });
                if (!byDate[dateKey]) {
                  byDate[dateKey] = {
                    date: dateKey,
                    count: 0,
                    total: 0,
                    timestamp: new Date(date).getTime()
                  };
                }
                byDate[dateKey].count++;
                byDate[dateKey].total += order.totale_ordine;
              });

              const timelineData = Object.values(byDate).
              sort((a, b) => a.timestamp - b.timestamp).
              map(({ date, count, total }) => ({ date, count, total }));

              // Product timeline (for selected product or top 5)
              const productTimeline = {};
              let productsToTrack = [];

              if (selectedProduct === 'all') {
                // Get top 5 products by total quantity
                const productTotals = {};
                filteredOrders.forEach((order) => {
                  order.prodotti.forEach((prod) => {
                    if (!productTotals[prod.nome_prodotto]) {
                      productTotals[prod.nome_prodotto] = 0;
                    }
                    productTotals[prod.nome_prodotto] += prod.quantita_ordinata;
                  });
                });
                productsToTrack = Object.entries(productTotals).
                sort((a, b) => b[1] - a[1]).
                slice(0, 5).
                map(([name]) => name);
              } else {
                productsToTrack = [selectedProduct];
              }

              filteredOrders.forEach((order) => {
                const date = order.data_invio || order.created_date;
                const dateKey = format(parseISO(date), 'dd MMM', { locale: it });

                if (!productTimeline[dateKey]) {
                  productTimeline[dateKey] = {
                    date: dateKey,
                    timestamp: new Date(date).getTime()
                  };
                  productsToTrack.forEach((p) => {
                    productTimeline[dateKey][p] = 0;
                  });
                }

                order.prodotti.forEach((prod) => {
                  if (productsToTrack.includes(prod.nome_prodotto)) {
                    productTimeline[dateKey][prod.nome_prodotto] += prod.quantita_ordinata;
                  }
                });
              });

              const productTimelineData = Object.values(productTimeline).
              sort((a, b) => a.timestamp - b.timestamp).
              map(({ timestamp, ...rest }) => rest);

              // Supplier distribution for pie chart
              const supplierData = Object.entries(bySupplier).map(([name, data]) => ({
                name,
                value: data.total
              }));

              const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

              return (
                <div className="space-y-6">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="neumorphic-pressed p-4 rounded-xl text-center">
                        <p className="text-sm text-slate-500 mb-1">Ordini Totali</p>
                        <p className="text-3xl font-bold text-blue-600">{filteredOrders.length}</p>
                      </div>
                      <div className="neumorphic-pressed p-4 rounded-xl text-center">
                        <p className="text-sm text-slate-500 mb-1">Valore Totale</p>
                        <p className="text-3xl font-bold text-green-600">
                          €{filteredOrders.reduce((sum, o) => sum + o.totale_ordine, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="neumorphic-pressed p-4 rounded-xl text-center">
                        <p className="text-sm text-slate-500 mb-1">Ordini Inviati</p>
                        <p className="text-3xl font-bold text-orange-600">
                          {filteredOrders.filter((o) => o.status === 'inviato').length}
                        </p>
                      </div>
                      <div className="neumorphic-pressed p-4 rounded-xl text-center">
                        <p className="text-sm text-slate-500 mb-1">Ordini Completati</p>
                        <p className="text-3xl font-bold text-green-600">
                          {filteredOrders.filter((o) => o.status === 'completato').length}
                        </p>
                      </div>
                      <div className="neumorphic-pressed p-4 rounded-xl text-center">
                        <p className="text-sm text-slate-500 mb-1">Tempo Medio Consegna</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {(() => {
                            const completedWithDates = filteredOrders.filter(o => o.status === 'completato' && o.data_invio && o.data_completamento);
                            if (completedWithDates.length === 0) return '-';
                            const totalDays = completedWithDates.reduce((sum, o) => {
                              return sum + Math.ceil((new Date(o.data_completamento) - new Date(o.data_invio)) / (1000 * 60 * 60 * 24));
                            }, 0);
                            return Math.round(totalDays / completedWithDates.length);
                          })()}
                        </p>
                        <p className="text-xs text-slate-500">giorni</p>
                      </div>
                    </div>

                    {/* Timeline Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Orders Over Time */}
                      <div className="neumorphic-flat p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Andamento Ordini nel Tempo</h3>
                        {timelineData.length > 0 ?
                      <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timelineData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                            dataKey="date"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            style={{ fontSize: '12px' }} />

                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Numero Ordini"
                            dot={{ r: 4 }} />

                            </LineChart>
                          </ResponsiveContainer> :

                      <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                      }
                      </div>

                      {/* Revenue Over Time */}
                      <div className="neumorphic-flat p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Valore Ordini nel Tempo</h3>
                        {timelineData.length > 0 ?
                      <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timelineData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                            dataKey="date"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            style={{ fontSize: '12px' }} />

                              <YAxis />
                              <Tooltip
                            formatter={(value) => `€${value.toFixed(2)}`} />

                              <Legend />
                              <Line
                            type="monotone"
                            dataKey="total"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Valore Totale (€)"
                            dot={{ r: 4 }} />

                            </LineChart>
                          </ResponsiveContainer> :

                      <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                      }
                      </div>
                    </div>

                    {/* Product Timeline */}
                    <div className="neumorphic-flat p-6 rounded-xl">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">
                        {selectedProduct === 'all' ?
                      'Andamento Top 5 Prodotti nel Tempo' :
                      `Andamento ${selectedProduct} nel Tempo`}
                      </h3>
                      {productTimelineData.length > 0 ?
                    <ResponsiveContainer width="100%" height={350}>
                          <LineChart data={productTimelineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                          dataKey="date"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          style={{ fontSize: '12px' }} />

                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {productsToTrack.map((product, idx) =>
                        <Line
                          key={product}
                          type="monotone"
                          dataKey={product}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }} />

                        )}
                          </LineChart>
                        </ResponsiveContainer> :

                    <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                    }
                    </div>

                    {/* Supplier Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="neumorphic-flat p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuzione Spesa per Fornitore</h3>
                        {supplierData.length > 0 ?
                      <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                            data={supplierData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value">

                                {supplierData.map((entry, index) =>
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            )}
                              </Pie>
                              <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                            </PieChart>
                          </ResponsiveContainer> :

                      <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                      }
                      </div>

                      {/* Top Products Bar Chart */}
                      <div className="neumorphic-flat p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Top 10 Prodotti per Valore</h3>
                        {Object.keys(byProduct).length > 0 ?
                      <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                          data={Object.entries(byProduct).
                          sort((a, b) => b[1].totalCost - a[1].totalCost).
                          slice(0, 10).
                          map(([name, data]) => ({
                            name: name.length > 20 ? name.substring(0, 20) + '...' : name,
                            value: data.totalCost
                          }))}>

                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            style={{ fontSize: '10px' }} />

                              <YAxis />
                              <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                              <Bar dataKey="value" fill="#8b5cf6" name="Valore Totale (€)" />
                            </BarChart>
                          </ResponsiveContainer> :

                      <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                      }
                      </div>
                    </div>

                    {/* By Store */}
                    <div className="neumorphic-flat p-6 rounded-xl">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Per Negozio</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-blue-600">
                              <th className="text-left p-3 text-slate-600 font-medium">Negozio</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Ordini</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Inviati</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Completati</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Totale</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(byStore).
                          sort((a, b) => b[1].total - a[1].total).
                          map(([store, data]) =>
                          <tr key={store} className="border-b border-slate-200">
                                  <td className="p-3 text-slate-800 font-medium">{store}</td>
                                  <td className="p-3 text-right text-slate-700">{data.count}</td>
                                  <td className="p-3 text-right text-orange-600">{data.inviati}</td>
                                  <td className="p-3 text-right text-green-600">{data.completati}</td>
                                  <td className="p-3 text-right font-bold text-blue-600">
                                    €{data.total.toFixed(2)}
                                  </td>
                                </tr>
                          )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* By Product */}
                    <div className="neumorphic-flat p-6 rounded-xl">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Per Prodotto (Top 20)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-purple-600">
                              <th className="text-left p-3 text-slate-600 font-medium">Prodotto</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Ordini</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Quantità Totale</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Costo Totale</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(byProduct).
                          sort((a, b) => b[1].totalCost - a[1].totalCost).
                          slice(0, 20).
                          map(([product, data]) =>
                          <tr key={product} className="border-b border-slate-200">
                                  <td className="p-3 text-slate-800 font-medium">{product}</td>
                                  <td className="p-3 text-right text-slate-700">{data.count}</td>
                                  <td className="p-3 text-right text-purple-600">
                                    {data.totalQuantity.toFixed(2)} {data.unit}
                                  </td>
                                  <td className="p-3 text-right font-bold text-blue-600">
                                    €{data.totalCost.toFixed(2)}
                                  </td>
                                </tr>
                          )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* By Supplier */}
                    <div className="neumorphic-flat p-6 rounded-xl">
                     <h3 className="text-lg font-bold text-slate-800 mb-4">Per Fornitore</h3>
                     <div className="overflow-x-auto">
                       <table className="w-full">
                         <thead>
                           <tr className="border-b-2 border-green-600">
                             <th className="text-left p-3 text-slate-600 font-medium">Fornitore</th>
                             <th className="text-right p-3 text-slate-600 font-medium">Ordini</th>
                             <th className="text-right p-3 text-slate-600 font-medium">Tempo Medio</th>
                             <th className="text-right p-3 text-slate-600 font-medium">Totale Speso</th>
                           </tr>
                         </thead>
                         <tbody>
                           {Object.entries(bySupplier).
                         sort((a, b) => b[1].total - a[1].total).
                         map(([supplier, data]) => {
                           // Calculate average delivery time for this supplier
                           const completedOrders = filteredOrders.filter(o => 
                             o.fornitore === supplier && 
                             o.status === 'completato' && 
                             o.data_invio && 
                             o.data_completamento
                           );
                           const avgDays = completedOrders.length > 0 
                             ? Math.round(completedOrders.reduce((sum, o) => {
                                 return sum + Math.ceil((new Date(o.data_completamento) - new Date(o.data_invio)) / (1000 * 60 * 60 * 24));
                               }, 0) / completedOrders.length)
                             : null;

                           return (
                         <tr key={supplier} className="border-b border-slate-200">
                                 <td className="p-3 text-slate-800 font-medium">{supplier}</td>
                                 <td className="p-3 text-right text-slate-700">{data.count}</td>
                                 <td className="p-3 text-right text-purple-600 font-medium">
                                   {avgDays ? `${avgDays}gg` : '-'}
                                 </td>
                                 <td className="p-3 text-right font-bold text-green-600">
                                   €{data.total.toFixed(2)}
                                 </td>
                               </tr>
                           );
                         })}
                         </tbody>
                       </table>
                     </div>
                    </div>

                    {/* By Month */}
                    <div className="neumorphic-flat p-6 rounded-xl">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Per Mese</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-orange-600">
                              <th className="text-left p-3 text-slate-600 font-medium">Mese</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Ordini</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Totale</th>
                              <th className="text-right p-3 text-slate-600 font-medium">Media per Ordine</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(byMonth).
                          sort((a, b) => new Date(b[0]) - new Date(a[0])).
                          map(([month, data]) =>
                          <tr key={month} className="border-b border-slate-200">
                                  <td className="p-3 text-slate-800 font-medium">{month}</td>
                                  <td className="p-3 text-right text-slate-700">{data.count}</td>
                                  <td className="p-3 text-right font-bold text-orange-600">
                                    €{data.total.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-right text-blue-600">
                                    €{(data.total / data.count).toFixed(2)}
                                  </td>
                                </tr>
                          )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>);

            })()}
            </NeumorphicCard>
          </div>
        }

        {/* Email Customization Modal */}
        {customizingEmail &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Personalizza Email Ordine</h2>
                <button onClick={() => setCustomizingEmail(null)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Prodotti con modifica quantità */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700">Prodotti da Ordinare</h3>
                    <NeumorphicButton
                    onClick={() => {
                      // Get available products from this supplier
                      const prodottiDisponibili = products.filter((p) =>
                      p.fornitore === customizingEmail.supplierName &&
                      p.attivo !== false &&
                      !emailTemplate.prodotti.some((ep) => ep.prodotto_id === p.id)
                      );

                      if (prodottiDisponibili.length === 0) {
                        alert('Nessun altro prodotto disponibile per questo fornitore');
                        return;
                      }

                      setAddProductEmailModal({
                        open: true,
                        availableProducts: prodottiDisponibili
                      });
                    }}
                    className="flex items-center gap-2 text-sm">

                      <Plus className="w-4 h-4" />
                      Aggiungi Prodotto
                    </NeumorphicButton>
                  </div>
                  <div className="space-y-2">
                    {emailTemplate.prodotti.map((prod, idx) => {
                    const prezzoConIVA = prod.prezzo_unitario * (1 + (prod.iva_percentuale ?? 22) / 100);
                    return (
                      <div key={idx} className="neumorphic-pressed p-3 rounded-xl grid grid-cols-3 gap-2 items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{prod.nome_prodotto}</p>
                          <p className="text-xs text-slate-500">IVA {prod.iva_percentuale ?? 22}%</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Quantità</label>
                          <input
                            type="number"
                            value={prod.quantita_ordinata}
                            onChange={(e) => {
                              const newProdotti = [...emailTemplate.prodotti];
                              newProdotti[idx].quantita_ordinata = parseFloat(e.target.value) || 0;

                              // Update email body automatically
                              const productList = newProdotti.map((p) =>
                              `• ${p.nome_prodotto}: ${p.quantita_ordinata} ${p.unita_misura}`
                              ).join('\n');

                              const newBody = emailTemplate.body.replace(
                                /Vi inviamo il seguente ordine.*:\n\n([\s\S]*?)\n\nGrazie/,
                                `Vi inviamo il seguente ordine per il locale ${customizingEmail.storeName}:\n\n${productList}\n\nGrazie`
                              );

                              setEmailTemplate({
                                ...emailTemplate,
                                prodotti: newProdotti,
                                body: newBody
                              });
                            }}
                            className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm text-slate-700 outline-none" />

                          <p className="text-xs text-slate-500">{prod.unita_misura}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">€{prod.prezzo_unitario.toFixed(2)}/u (netto)</p>
                          <p className="text-xs text-slate-500">€{prezzoConIVA.toFixed(2)}/u (+IVA)</p>
                          <p className="text-sm font-bold text-blue-600">
                            €{(prezzoConIVA * prod.quantita_ordinata).toFixed(2)}
                          </p>
                        </div>
                      </div>);

                  })}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-1">
                    <p className="text-xs text-slate-600">
                      Totale Netto IVA: €{emailTemplate.prodotti.reduce((sum, p) => sum + (p.prezzo_unitario || 0) * p.quantita_ordinata, 0).toFixed(2)}
                    </p>
                    <p className="text-sm font-bold text-blue-700">
                      Totale con IVA: €{emailTemplate.prodotti.reduce((sum, p) => {
                      const prezzoConIVA = (p.prezzo_unitario || 0) * (1 + (p.iva_percentuale ?? 22) / 100);
                      return sum + prezzoConIVA * p.quantita_ordinata;
                    }, 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Oggetto Email</label>
                  <input
                  type="text"
                  value={emailTemplate.subject}
                  onChange={(e) => setEmailTemplate({ ...emailTemplate, subject: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none" />

                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Corpo Email</label>
                  <textarea
                  value={emailTemplate.body}
                  onChange={(e) => setEmailTemplate({ ...emailTemplate, body: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none h-64 resize-none font-mono text-sm" />

                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={() => setCustomizingEmail(null)} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                  onClick={sendOrderEmail}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2">

                    <Send className="w-5 h-5" />
                    Invia Email e Segna Inviato
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        }

        {/* Modal Aggiungi Prodotto (Segna Inviato) */}
        {addProductModal.open &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Aggiungi Prodotto</h2>
                <button onClick={() => {setAddProductModal({ open: false, availableProducts: [] });setSelectedProductToAdd('');setProductQuantity(0);}} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Seleziona Prodotto</label>
                  <select
                  value={selectedProductToAdd}
                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none">

                    <option value="">-- Seleziona un prodotto --</option>
                    {addProductModal.availableProducts.map((p) =>
                  <option key={p.id} value={p.id}>
                        {p.nome_prodotto} - €{p.prezzo_unitario?.toFixed(2) || '0.00'}/u
                      </option>
                  )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Quantità</label>
                  <div className="flex items-center gap-2">
                    <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={productQuantity}
                    onChange={(e) => setProductQuantity(parseFloat(e.target.value) || 0)}
                    className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="0" />

                    <span className="text-sm text-slate-600">
                      {selectedProductToAdd && addProductModal.availableProducts.find((p) => p.id === selectedProductToAdd)?.unita_misura}
                    </span>
                  </div>
                </div>

                {selectedProductToAdd &&
              <div className="neumorphic-flat p-4 rounded-xl space-y-1">
                    {(() => {
                  const product = addProductModal.availableProducts.find((p) => p.id === selectedProductToAdd);
                  const prezzoConIVA = (product?.prezzo_unitario || 0) * (1 + (product?.iva_percentuale ?? 22) / 100);
                  const totale = prezzoConIVA * productQuantity;
                  return (
                    <>
                          <p className="text-sm text-slate-600">
                            <strong>Prezzo Unitario:</strong> €{(product?.prezzo_unitario || 0).toFixed(2)} (netto)
                          </p>
                          <p className="text-sm text-slate-600">
                            <strong>Con IVA ({product?.iva_percentuale ?? 22}%):</strong> €{prezzoConIVA.toFixed(2)}/u
                          </p>
                          <p className="text-base font-bold text-blue-600">
                            Totale: €{totale.toFixed(2)}
                          </p>
                        </>);

                })()}
                  </div>
              }

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={() => {setAddProductModal({ open: false, availableProducts: [] });setSelectedProductToAdd('');setProductQuantity(0);}} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                  onClick={() => {
                    if (!selectedProductToAdd || productQuantity <= 0) {
                      alert('Seleziona un prodotto e inserisci una quantità');
                      return;
                    }

                    const product = addProductModal.availableProducts.find((p) => p.id === selectedProductToAdd);
                    const newProduct = {
                      prodotto_id: product.id,
                      nome_prodotto: product.nome_prodotto,
                      quantita_ordinata: productQuantity,
                      quantita_ricevuta: 0,
                      unita_misura: product.unita_misura,
                      prezzo_unitario: product.prezzo_unitario || 0,
                      iva_percentuale: product.iva_percentuale ?? 22,
                      isExtra: true
                    };

                    const newProdotti = [...(editingOrder?.prodotti || editingInviatoOrder?.prodotti || []), newProduct];
                    const newTotaleNetto = newProdotti.reduce((sum, p) => sum + p.prezzo_unitario * p.quantita_ordinata, 0);
                    const newTotaleConIVA = newProdotti.reduce((sum, p) => {
                     const pIVA = p.prezzo_unitario * (1 + (p.iva_percentuale ?? 22) / 100);
                     return sum + pIVA * p.quantita_ordinata;
                    }, 0);

                    if (editingOrder) {
                     setEditingOrder({
                       ...editingOrder,
                       prodotti: newProdotti,
                       totale_ordine: newTotaleNetto,
                       totale_ordine_con_iva: newTotaleConIVA
                     });
                    } else if (editingInviatoOrder) {
                     setEditingInviatoOrder({
                       ...editingInviatoOrder,
                       prodotti: newProdotti,
                       totale_ordine: newTotaleNetto,
                       totale_ordine_con_iva: newTotaleConIVA
                     });
                    }

                    setAddProductModal({ open: false, availableProducts: [] });
                    setSelectedProductToAdd('');
                    setProductQuantity(0);
                    }}
                  variant="primary"
                  className="flex-1">

                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        }

        {/* Modal Regola Ordine */}
        {showRegoleForm && editingRegola &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingRegola.id ? 'Modifica Regola' : 'Nuova Regola Ordine'}
                </h2>
                <button onClick={() => {setShowRegoleForm(false);setEditingRegola(null);}} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Prodotto</label>
                  <select
                  value={editingRegola.prodotto_id}
                  onChange={(e) => {
                    const prodId = e.target.value;
                    const prod = products.find((p) => p.id === prodId);
                    setEditingRegola({
                      ...editingRegola,
                      prodotto_id: prodId,
                      nome_prodotto: prod?.nome_prodotto || ''
                    });
                  }}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  disabled={!!editingRegola.id}>

                    <option value="">Seleziona un prodotto</option>
                    {products.
                  filter((p) => p.attivo !== false && !regoleOrdini.some((r) => r.prodotto_id === p.id && r.id !== editingRegola.id)).
                  sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto)).
                  map((prod) =>
                  <option key={prod.id} value={prod.id}>{prod.nome_prodotto}</option>
                  )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Giorni in cui può essere ordinato</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'].map((giorno, idx) => {
                    const isSelected = editingRegola.giorni_settimana?.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          const newGiorni = isSelected ?
                          editingRegola.giorni_settimana.filter((g) => g !== idx) :
                          [...(editingRegola.giorni_settimana || []), idx];
                          setEditingRegola({ ...editingRegola, giorni_settimana: newGiorni });
                        }}
                        className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        isSelected ?
                        'neumorphic-pressed bg-blue-50 text-blue-700 border-2 border-blue-300' :
                        'neumorphic-flat text-slate-600 hover:bg-slate-50'}`
                        }>

                          {giorno.substring(0, 3)}
                        </button>);

                  })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Seleziona i giorni in cui questo prodotto può essere ordinato
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Note (opzionale)</label>
                  <textarea
                  value={editingRegola.note || ''}
                  onChange={(e) => setEditingRegola({ ...editingRegola, note: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none h-20 resize-none"
                  placeholder="Es: Consegna solo il martedì e venerdì" />

                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton
                  onClick={() => {setShowRegoleForm(false);setEditingRegola(null);}}
                  className="flex-1">

                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                  onClick={() => {
                    if (!editingRegola.prodotto_id || !editingRegola.giorni_settimana?.length) {
                      alert('Seleziona un prodotto e almeno un giorno');
                      return;
                    }

                    if (editingRegola.id) {
                      updateRegolaMutation.mutate({
                        id: editingRegola.id,
                        data: editingRegola
                      });
                    } else {
                      createRegolaMutation.mutate(editingRegola);
                    }
                  }}
                  variant="primary"
                  className="flex-1"
                  disabled={createRegolaMutation.isPending || updateRegolaMutation.isPending}>

                    {editingRegola.id ? 'Salva Modifiche' : 'Crea Regola'}
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        }

        {/* Modal Aggiungi Prodotto (Invia Email) */}
        {addProductEmailModal.open &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Aggiungi Prodotto</h2>
                <button onClick={() => {setAddProductEmailModal({ open: false, availableProducts: [] });setSelectedProductToAddEmail('');setProductQuantityEmail(0);}} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Seleziona Prodotto</label>
                  <select
                  value={selectedProductToAddEmail}
                  onChange={(e) => setSelectedProductToAddEmail(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none">

                    <option value="">-- Seleziona un prodotto --</option>
                    {addProductEmailModal.availableProducts.map((p) =>
                  <option key={p.id} value={p.id}>
                        {p.nome_prodotto} - €{p.prezzo_unitario?.toFixed(2) || '0.00'}/u
                      </option>
                  )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Quantità</label>
                  <div className="flex items-center gap-2">
                    <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={productQuantityEmail}
                    onChange={(e) => setProductQuantityEmail(parseFloat(e.target.value) || 0)}
                    className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="0" />

                    <span className="text-sm text-slate-600">
                      {selectedProductToAddEmail && addProductEmailModal.availableProducts.find((p) => p.id === selectedProductToAddEmail)?.unita_misura}
                    </span>
                  </div>
                </div>

                {selectedProductToAddEmail &&
              <div className="neumorphic-flat p-4 rounded-xl space-y-1">
                    {(() => {
                  const product = addProductEmailModal.availableProducts.find((p) => p.id === selectedProductToAddEmail);
                  const prezzoConIVA = (product?.prezzo_unitario || 0) * (1 + (product?.iva_percentuale ?? 22) / 100);
                  const totale = prezzoConIVA * productQuantityEmail;
                  return (
                    <>
                          <p className="text-sm text-slate-600">
                            <strong>Prezzo Unitario:</strong> €{(product?.prezzo_unitario || 0).toFixed(2)} (netto)
                          </p>
                          <p className="text-sm text-slate-600">
                            <strong>Con IVA ({product?.iva_percentuale ?? 22}%):</strong> €{prezzoConIVA.toFixed(2)}/u
                          </p>
                          <p className="text-base font-bold text-blue-600">
                            Totale: €{totale.toFixed(2)}
                          </p>
                        </>);

                })()}
                  </div>
              }

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={() => {setAddProductEmailModal({ open: false, availableProducts: [] });setSelectedProductToAddEmail('');setProductQuantityEmail(0);}} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                  onClick={() => {
                    if (!selectedProductToAddEmail || productQuantityEmail <= 0) {
                      alert('Seleziona un prodotto e inserisci una quantità');
                      return;
                    }

                    const product = addProductEmailModal.availableProducts.find((p) => p.id === selectedProductToAddEmail);
                    const newProduct = {
                      prodotto_id: product.id,
                      nome_prodotto: product.nome_prodotto,
                      quantita_ordinata: productQuantityEmail,
                      unita_misura: product.unita_misura,
                      prezzo_unitario: product.prezzo_unitario || 0,
                      iva_percentuale: product.iva_percentuale ?? 22
                    };

                    const newProdotti = [...emailTemplate.prodotti, newProduct];

                    // Update email body with new product list
                    const productList = newProdotti.map((p) =>
                    `• ${p.nome_prodotto}: ${p.quantita_ordinata} ${p.unita_misura}`
                    ).join('\n');

                    const newBody = emailTemplate.body.replace(
                      /Vi inviamo il seguente ordine.*:\n\n([\s\S]*?)\n\nGrazie/,
                      `Vi inviamo il seguente ordine per il locale ${customizingEmail.storeName}:\n\n${productList}\n\nGrazie`
                    );

                    setEmailTemplate({
                      ...emailTemplate,
                      prodotti: newProdotti,
                      body: newBody
                    });

                    setAddProductEmailModal({ open: false, availableProducts: [] });
                    setSelectedProductToAddEmail('');
                    setProductQuantityEmail(0);
                  }}
                  variant="primary"
                  className="flex-1">

                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        }

        {/* Modal Aggiungi Prodotto (Invia Email) */}
        {addProductEmailModal.open &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Aggiungi Prodotto</h2>
                <button onClick={() => {setAddProductEmailModal({ open: false, availableProducts: [] });setSelectedProductToAddEmail('');setProductQuantityEmail(0);}} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Seleziona Prodotto</label>
                  <select
                  value={selectedProductToAddEmail}
                  onChange={(e) => setSelectedProductToAddEmail(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none">

                    <option value="">-- Seleziona un prodotto --</option>
                    {addProductEmailModal.availableProducts.map((p) =>
                  <option key={p.id} value={p.id}>
                        {p.nome_prodotto} - €{p.prezzo_unitario?.toFixed(2) || '0.00'}/u
                      </option>
                  )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Quantità</label>
                  <div className="flex items-center gap-2">
                    <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={productQuantityEmail}
                    onChange={(e) => setProductQuantityEmail(parseFloat(e.target.value) || 0)}
                    className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="0" />

                    <span className="text-sm text-slate-600">
                      {selectedProductToAddEmail && addProductEmailModal.availableProducts.find((p) => p.id === selectedProductToAddEmail)?.unita_misura}
                    </span>
                  </div>
                </div>

                {selectedProductToAddEmail &&
              <div className="neumorphic-flat p-4 rounded-xl space-y-1">
                    {(() => {
                  const product = addProductEmailModal.availableProducts.find((p) => p.id === selectedProductToAddEmail);
                  const prezzoConIVA = (product?.prezzo_unitario || 0) * (1 + (product?.iva_percentuale ?? 22) / 100);
                  const totale = prezzoConIVA * productQuantityEmail;
                  return (
                    <>
                          <p className="text-sm text-slate-600">
                            <strong>Prezzo Unitario:</strong> €{(product?.prezzo_unitario || 0).toFixed(2)} (netto)
                          </p>
                          <p className="text-sm text-slate-600">
                            <strong>Con IVA ({product?.iva_percentuale ?? 22}%):</strong> €{prezzoConIVA.toFixed(2)}/u
                          </p>
                          <p className="text-base font-bold text-blue-600">
                            Totale: €{totale.toFixed(2)}
                          </p>
                        </>);

                })()}
                  </div>
              }

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={() => {setAddProductEmailModal({ open: false, availableProducts: [] });setSelectedProductToAddEmail('');setProductQuantityEmail(0);}} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                  onClick={() => {
                    if (!selectedProductToAddEmail || productQuantityEmail <= 0) {
                      alert('Seleziona un prodotto e inserisci una quantità');
                      return;
                    }

                    const product = addProductEmailModal.availableProducts.find((p) => p.id === selectedProductToAddEmail);
                    const newProduct = {
                      prodotto_id: product.id,
                      nome_prodotto: product.nome_prodotto,
                      quantita_ordinata: productQuantityEmail,
                      unita_misura: product.unita_misura,
                      prezzo_unitario: product.prezzo_unitario || 0,
                      iva_percentuale: product.iva_percentuale ?? 22
                    };

                    const newProdotti = [...emailTemplate.prodotti, newProduct];

                    // Update email body with new product list
                    const productList = newProdotti.map((p) =>
                    `• ${p.nome_prodotto}: ${p.quantita_ordinata} ${p.unita_misura}`
                    ).join('\n');

                    const newBody = emailTemplate.body.replace(
                      /Vi inviamo il seguente ordine.*:\n\n([\s\S]*?)\n\nGrazie/,
                      `Vi inviamo il seguente ordine per il locale ${customizingEmail.storeName}:\n\n${productList}\n\nGrazie`
                    );

                    setEmailTemplate({
                      ...emailTemplate,
                      prodotti: newProdotti,
                      body: newBody
                    });

                    setAddProductEmailModal({ open: false, availableProducts: [] });
                    setSelectedProductToAddEmail('');
                    setProductQuantityEmail(0);
                  }}
                  variant="primary"
                  className="flex-1">

                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        }

        {/* Modal Modifica Ordine Inviato */}
        {editingInviatoOrder &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Modifica Ordine Inviato</h2>
                <button onClick={() => setEditingInviatoOrder(null)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="neumorphic-flat p-4 rounded-xl space-y-1">
                  <p className="text-sm text-slate-600"><strong>Locale:</strong> {editingInviatoOrder.store_name}</p>
                  <p className="text-sm text-slate-600"><strong>Fornitore:</strong> {editingInviatoOrder.fornitore}</p>
                  <p className="text-xs text-slate-400">
                    Inviato: {format(parseISO(editingInviatoOrder.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800">Prodotti</h3>
                    <NeumorphicButton
                    onClick={() => {
                      const prodottiDisponibili = products.filter((p) =>
                        p.fornitore === editingInviatoOrder.fornitore &&
                        p.attivo !== false &&
                        !editingInviatoOrder.prodotti.some((ep) => ep.prodotto_id === p.id)
                      );

                      if (prodottiDisponibili.length === 0) {
                        alert('Nessun altro prodotto disponibile per questo fornitore');
                        return;
                      }

                      setAddProductModal({
                        open: true,
                        availableProducts: prodottiDisponibili
                      });
                    }}
                    className="flex items-center gap-2 text-sm">
                      <Plus className="w-4 h-4" />
                      Aggiungi Prodotto
                    </NeumorphicButton>
                  </div>

                  <div className="space-y-2">
                    {editingInviatoOrder.prodotti.map((prod, idx) => {
                      const prezzoUnitario = prod.prezzo_unitario || 0;
                      const prezzoConIVA = prezzoUnitario * (1 + (prod.iva_percentuale ?? 22) / 100);
                      const totaleNetto = prezzoUnitario * prod.quantita_ordinata;
                      const totaleConIVA = prezzoConIVA * prod.quantita_ordinata;

                      return (
                        <div key={idx} className="neumorphic-pressed p-3 rounded-xl">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{prod.nome_prodotto}</p>
                              <p className="text-xs text-slate-500">IVA {prod.iva_percentuale ?? 22}%</p>
                            </div>
                            <div>
                              <label className="text-xs text-slate-500">Quantità</label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={prod.quantita_ordinata}
                                onChange={(e) => {
                                  const newProdotti = [...editingInviatoOrder.prodotti];
                                  newProdotti[idx].quantita_ordinata = parseFloat(e.target.value) || 0;
                                  const newTotaleNetto = newProdotti.reduce((sum, p) => sum + p.prezzo_unitario * p.quantita_ordinata, 0);
                                  const newTotaleConIVA = newProdotti.reduce((sum, p) => {
                                    const pIVA = p.prezzo_unitario * (1 + (p.iva_percentuale ?? 22) / 100);
                                    return sum + pIVA * p.quantita_ordinata;
                                  }, 0);
                                  setEditingInviatoOrder({ 
                                    ...editingInviatoOrder, 
                                    prodotti: newProdotti,
                                    totale_ordine: newTotaleNetto,
                                    totale_ordine_con_iva: newTotaleConIVA
                                  });
                                }}
                                className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm text-slate-700 outline-none" />
                              <p className="text-xs text-slate-500">{prod.unita_misura}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Prezzo Unitario</p>
                              <p className="text-sm font-medium text-slate-700">€{(prod.prezzo_unitario || 0).toFixed(2)}</p>
                              <p className="text-xs text-slate-400">(netto IVA)</p>
                            </div>
                            <div className="flex items-end justify-between">
                              <div className="text-right flex-1">
                                <p className="text-xs text-slate-500">Totale Netto</p>
                                <p className="text-sm font-bold text-slate-700">€{totaleNetto.toFixed(2)}</p>
                                <p className="text-xs text-slate-500 mt-1">Totale +IVA</p>
                                <p className="text-base font-bold text-blue-600">€{totaleConIVA.toFixed(2)}</p>
                              </div>
                              <button
                                onClick={() => {
                                  if (confirm(`Rimuovere ${prod.nome_prodotto} dall'ordine?`)) {
                                    const newProdotti = editingInviatoOrder.prodotti.filter((_, i) => i !== idx);
                                    const newTotaleNetto = newProdotti.reduce((sum, p) => sum + p.prezzo_unitario * p.quantita_ordinata, 0);
                                    const newTotaleConIVA = newProdotti.reduce((sum, p) => {
                                      const pIVA = p.prezzo_unitario * (1 + (p.iva_percentuale ?? 22) / 100);
                                      return sum + pIVA * p.quantita_ordinata;
                                    }, 0);
                                    setEditingInviatoOrder({ 
                                      ...editingInviatoOrder, 
                                      prodotti: newProdotti,
                                      totale_ordine: newTotaleNetto,
                                      totale_ordine_con_iva: newTotaleConIVA
                                    });
                                  }
                                }}
                                className="nav-button p-2 rounded-lg hover:bg-red-50 ml-2">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="neumorphic-flat p-4 rounded-xl space-y-1">
                  <p className="text-sm text-slate-600">
                    <strong>Totale Netto IVA:</strong> €{(editingInviatoOrder.totale_ordine || 0).toFixed(2)}
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    <strong>Totale con IVA:</strong> €{(editingInviatoOrder.totale_ordine_con_iva || 0).toFixed(2)}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={() => setEditingInviatoOrder(null)} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                    onClick={() => {
                      const prodottiFiltrati = editingInviatoOrder.prodotti.filter((p) => p.quantita_ordinata > 0);

                      if (prodottiFiltrati.length === 0) {
                        alert('Devi avere almeno un prodotto con quantità > 0');
                        return;
                      }

                      const totaleNettoFiltrato = prodottiFiltrati.reduce((sum, p) => sum + p.prezzo_unitario * p.quantita_ordinata, 0);
                      const totaleConIVAFiltrato = prodottiFiltrati.reduce((sum, p) => {
                        const pIVA = p.prezzo_unitario * (1 + (p.iva_percentuale ?? 22) / 100);
                        return sum + pIVA * p.quantita_ordinata;
                      }, 0);

                      updateOrderMutation.mutate({
                        id: editingInviatoOrder.id,
                        data: {
                          prodotti: prodottiFiltrati,
                          totale_ordine: totaleNettoFiltrato,
                          totale_ordine_con_iva: totaleConIVAFiltrato
                        }
                      });
                    }}
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    Salva Modifiche
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        }

        {/* Confronto Listini Tab */}
        {activeTab === 'confronto' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <NeumorphicCard className="px-4 py-2">
                <select
                  value={selectedNomeInterno}
                  onChange={(e) => setSelectedNomeInterno(e.target.value)}
                  className="bg-transparent text-slate-600 outline-none">
                  <option value="all">Tutti i Prodotti</option>
                  {(() => {
                    const nomiInterni = [...new Set(products.map((p) => p.nome_interno).filter(Boolean))].sort();
                    return nomiInterni.map((nome) => (
                      <option key={nome} value={nome}>{nome}</option>
                    ));
                  })()}
                </select>
              </NeumorphicCard>

              <NeumorphicCard className="px-4 py-2">
                <select
                  value={selectedCategoryListini}
                  onChange={(e) => setSelectedCategoryListini(e.target.value)}
                  className="bg-transparent text-slate-600 outline-none">
                  <option value="all">Tutte le Categorie</option>
                  {["Angolo di Sardegna", "Bevande", "Consumabili", "Dolci", "Ingredienti base", "Ingredienti pronti", "Ortofrutta", "Packaging", "Pulizia"].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </NeumorphicCard>

              <NeumorphicCard className="px-4 py-2">
                <select
                  value={selectedStoreListini}
                  onChange={(e) => setSelectedStoreListini(e.target.value)}
                  className="bg-transparent text-slate-600 outline-none">
                  <option value="all">Tutti i Negozi</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </NeumorphicCard>

              <button
                onClick={() => setShowDownloadModal(true)}
                className="neumorphic-flat px-4 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-slate-700 font-medium">
                <Download className="w-5 h-5" />
                <span className="hidden md:inline">Scarica Listino</span>
              </button>
            </div>

            {(() => {
              // Group products by nome_interno
              const productsGrouped = products.
                filter((p) => p.nome_interno && p.prezzo_unitario).
                reduce((acc, product) => {
                  const key = product.nome_interno;
                  if (!acc[key]) {
                    acc[key] = [];
                  }
                  acc[key].push(product);
                  return acc;
                }, {});

              // Filter grouped products
              const filteredGrouped = Object.entries(productsGrouped).
                filter(([nomeInterno, prods]) => {
                  if (selectedNomeInterno !== 'all' && nomeInterno !== selectedNomeInterno) return false;
                  if (selectedCategoryListini !== 'all' && !prods.some((p) => p.categoria === selectedCategoryListini)) return false;
                  return true;
                }).
                sort(([a], [b]) => a.localeCompare(b));

              // Helper functions
              const getDisplayUnit = (unitaMisuraPeso) => {
                if (['kg', 'g'].includes(unitaMisuraPeso)) return 'kg';
                if (['litri', 'ml'].includes(unitaMisuraPeso)) return 'litri';
                return unitaMisuraPeso;
              };

              const normalizeToBaseUnit = (product) => {
                if (!product.peso_dimensione_unita || !product.unita_misura_peso) {
                  if (product.unita_per_confezione && product.peso_unita_interna && product.unita_misura_interna) {
                    const unitWeight = ['kg', 'litri'].includes(product.unita_misura_interna) ?
                      product.peso_unita_interna :
                      product.peso_unita_interna / 1000;
                    return product.unita_per_confezione * unitWeight;
                  }
                  return null;
                }

                if (['kg', 'litri'].includes(product.unita_misura_peso)) {
                  return product.peso_dimensione_unita;
                } else if (['g', 'ml'].includes(product.unita_misura_peso)) {
                  return product.peso_dimensione_unita / 1000;
                }

                return null;
              };

              const getNormalizedPrice = (product) => {
                const weight = normalizeToBaseUnit(product);
                if (!weight || !product.prezzo_unitario) return null;
                return product.prezzo_unitario / weight;
              };

              const getBestPrice = (prods) => {
                const prices = prods.map((p) => getNormalizedPrice(p)).filter((p) => p !== null);
                return prices.length > 0 ? Math.min(...prices) : 0;
              };

              const getWorstPrice = (prods) => {
                const prices = prods.map((p) => getNormalizedPrice(p)).filter((p) => p !== null);
                return prices.length > 0 ? Math.max(...prices) : 0;
              };

              const getSavingsPercentage = (prods) => {
                const best = getBestPrice(prods);
                const worst = getWorstPrice(prods);
                return worst > 0 ? ((worst - best) / worst * 100).toFixed(1) : 0;
              };

              // Find products in use that are not the best price
              const getProductsNotOptimal = () => {
                const issues = [];

                filteredGrouped.forEach(([nomeInterno, prods]) => {
                  const bestPriceProduct = prods.reduce((best, p) => {
                    const currentPrice = getNormalizedPrice(p);
                    const bestPrice = getNormalizedPrice(best);
                    if (!currentPrice) return best;
                    if (!bestPrice) return p;
                    return currentPrice < bestPrice ? p : best;
                  }, prods[0]);

                  const bestPrice = getNormalizedPrice(bestPriceProduct);

                  prods.forEach((product) => {
                    const productPrice = getNormalizedPrice(product);
                    if (!productPrice || !bestPrice) return;

                    const inUsoPerStore = product.in_uso_per_store || {};

                    if (selectedStoreListini === 'all') {
                      stores.forEach((store) => {
                        if (inUsoPerStore[store.id] && productPrice > bestPrice) {
                          issues.push({
                            store: store.name,
                            storeId: store.id,
                            nomeInterno,
                            productInUse: product,
                            bestProduct: bestPriceProduct,
                            priceDiff: productPrice - bestPrice
                          });
                        }
                      });
                    } else {
                      if (inUsoPerStore[selectedStoreListini] && productPrice > bestPrice) {
                        const store = stores.find((s) => s.id === selectedStoreListini);
                        issues.push({
                          store: store?.name || 'N/D',
                          storeId: selectedStoreListini,
                          nomeInterno,
                          productInUse: product,
                          bestProduct: bestPriceProduct,
                          priceDiff: productPrice - bestPrice
                        });
                      }
                    }
                  });
                });

                return issues;
              };

              const notOptimalProducts = getProductsNotOptimal();

              const totalPotentialSavings = filteredGrouped.reduce((sum, [nomeInterno, prods]) => {
                if (prods.length <= 1) return sum;

                const bestPrice = getBestPrice(prods);

                let savingsForThisProduct = 0;
                prods.forEach((product) => {
                  const productPrice = getNormalizedPrice(product);
                  if (!productPrice || productPrice === bestPrice) return;

                  const inUsoPerStore = product.in_uso_per_store || {};
                  const isInUse = Object.values(inUsoPerStore).some((v) => v);

                  if (isInUse && productPrice > bestPrice) {
                    savingsForThisProduct = Math.max(savingsForThisProduct, productPrice - bestPrice);
                  }
                });

                return sum + savingsForThisProduct;
              }, 0);

              return (
                <div className="space-y-6">
                  {/* Alert for non-optimal products */}
                  {notOptimalProducts.length > 0 && (
                    <NeumorphicCard className="p-6 bg-orange-50 border-2 border-orange-200">
                      <div className="flex items-start gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                        <div>
                          <h3 className="font-bold text-orange-800 mb-1">
                            ⚠️ Prodotti in uso non ottimali ({notOptimalProducts.length})
                          </h3>
                          <p className="text-sm text-orange-700">
                            {selectedStoreListini === 'all' ?
                              'Ci sono prodotti in uso che non hanno il miglior prezzo disponibile' :
                              `Nel negozio selezionato ci sono prodotti in uso che non hanno il miglior prezzo`
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {notOptimalProducts.map((issue, idx) => (
                          <div key={idx} className="neumorphic-pressed p-3 rounded-lg bg-white">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-slate-700 text-sm">{issue.nomeInterno}</p>
                                <p className="text-xs text-slate-500">
                                  <Store className="w-3 h-3 inline mr-1" />
                                  {issue.store}
                                </p>
                                <p className="text-xs text-orange-600 mt-1">
                                  In uso: <strong>{issue.productInUse.nome_prodotto}</strong> ({issue.productInUse.fornitore || 'N/D'})
                                </p>
                                <p className="text-xs text-green-600">
                                  Miglior prezzo: <strong>{issue.bestProduct.nome_prodotto}</strong> ({issue.bestProduct.fornitore || 'N/D'})
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-red-600 font-bold text-sm">
                                  +€{issue.priceDiff.toFixed(2)}/kg
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </NeumorphicCard>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <NeumorphicCard className="p-6 text-center">
                      <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Package className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-slate-700 mb-1">{filteredGrouped.length}</h3>
                      <p className="text-sm text-slate-500">Prodotti Confrontati</p>
                    </NeumorphicCard>

                    <NeumorphicCard className="p-6 text-center">
                      <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-blue-600 mb-1">
                        {[...new Set(products.map((p) => p.fornitore).filter(Boolean))].length}
                      </h3>
                      <p className="text-sm text-slate-500">Fornitori Attivi</p>
                    </NeumorphicCard>

                    <NeumorphicCard className="p-6 text-center">
                      <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <TrendingDown className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-green-600 mb-1">€{totalPotentialSavings.toFixed(2)}</h3>
                      <p className="text-sm text-slate-500">Risparmio Potenziale</p>
                    </NeumorphicCard>
                  </div>

                  {/* Comparison Table */}
                  <NeumorphicCard className="p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">Confronto Prezzi</h2>
                    
                    {filteredGrouped.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-500">Nessun prodotto con più fornitori trovato</p>
                        <p className="text-xs text-slate-400 mt-2">
                          Assicurati di usare lo stesso "Nome Interno" per prodotti equivalenti
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {filteredGrouped.map(([nomeInterno, prods]) => {
                          const sortedByPrice = [...prods].sort((a, b) => (a.prezzo_unitario || 0) - (b.prezzo_unitario || 0));
                          const savingsPercent = getSavingsPercentage(prods);

                          return (
                            <div key={nomeInterno} className="neumorphic-pressed p-5 rounded-xl">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="font-bold text-lg text-slate-800">{nomeInterno}</h3>
                                  <p className="text-sm text-slate-500">
                                    {prods[0].categoria} • {prods.length} {prods.length === 1 ? 'fornitore' : 'fornitori'}
                                  </p>
                                </div>
                                {prods.length > 1 && (
                                  <div className="text-right">
                                    <div className="flex items-center gap-2 text-green-600 font-bold">
                                      <TrendingDown className="w-5 h-5" />
                                      <span>-{savingsPercent}%</span>
                                    </div>
                                    <p className="text-xs text-slate-400">risparmio max</p>
                                  </div>
                                )}
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-300">
                                      <th className="text-left p-3 text-slate-600 font-medium">Fornitore</th>
                                      <th className="text-left p-3 text-slate-600 font-medium">Prodotto</th>
                                      <th className="text-left p-3 text-slate-600 font-medium">Marca</th>
                                      <th className="text-right p-3 text-slate-600 font-medium">Prezzo/Unità</th>
                                      <th className="text-center p-3 text-slate-600 font-medium">Convenienza</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedByPrice.map((product, idx) => {
                                      const normalizedPrice = getNormalizedPrice(product);
                                      const normalizedBest = getBestPrice(prods);
                                      const priceDiff = normalizedPrice && normalizedBest ? normalizedPrice - normalizedBest : 0;
                                      const isBest = normalizedPrice === normalizedBest && prods.length > 1;
                                      const weight = normalizeToBaseUnit(product);
                                      const inUso = product.in_uso_per_store && Object.entries(product.in_uso_per_store).some(([storeId, inUso]) => {
                                        if (!inUso) return false;
                                        if (selectedStoreListini !== 'all' && storeId !== selectedStoreListini) return false;
                                        return true;
                                      });

                                      return (
                                        <tr key={product.id} className={`border-b border-slate-200 ${isBest ? 'bg-green-50' : ''}`}>
                                          <td className="p-3">
                                            <span className="font-medium text-slate-700">
                                              {product.fornitore || 'N/D'}
                                            </span>
                                          </td>
                                          <td className="p-3">
                                            <div>
                                              <span className="text-sm text-slate-700">
                                                {product.nome_prodotto}
                                              </span>
                                              {weight && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                  {weight >= 1 ? `${weight.toFixed(2)} kg/L` : `${(weight * 1000).toFixed(0)} g/ml`} per unità
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          <td className="p-3">
                                            <span className="text-sm text-slate-500">
                                              {product.marca || '-'}
                                            </span>
                                          </td>
                                          <td className="p-3 text-right">
                                            <div>
                                              <span className={`font-bold ${isBest ? 'text-green-600 text-lg' : 'text-slate-700'}`}>
                                                €{product.prezzo_unitario?.toFixed(2)}
                                              </span>
                                              <span className="text-xs text-slate-500 ml-1">
                                                / {product.unita_misura}
                                              </span>
                                            </div>
                                            {normalizedPrice && product.unita_misura_peso && (
                                              <div className="text-xs font-bold text-blue-600 mt-1">
                                                €{normalizedPrice.toFixed(2)}/{getDisplayUnit(product.unita_misura_peso)}
                                              </div>
                                            )}
                                          </td>
                                          <td className="p-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                              {prods.length === 1 ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                                  Unico Fornitore
                                                </span>
                                              ) : isBest ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                  <TrendingDown className="w-3 h-3" />
                                                  Miglior Prezzo
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                                  <TrendingUp className="w-3 h-3" />
                                                  +€{priceDiff.toFixed(2)}/{product.unita_misura_peso ? getDisplayUnit(product.unita_misura_peso) : 'kg'}
                                                </span>
                                              )}
                                              {inUso && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                                  isBest ? 'bg-green-50 text-green-600' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                  ✓ In uso
                                                  {!isBest && <AlertTriangle className="w-3 h-3" />}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </NeumorphicCard>
                </div>
              );
            })()}
          </div>
        )}

        {/* Download Modal */}
        {showDownloadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Scarica Listino</h2>
                <button onClick={() => {setShowDownloadModal(false); setDownloadCategories([]); setDownloadFornitori([]);}} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
                {/* Categorie */}
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-3">Categorie:</p>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const allCategories = ["Angolo di Sardegna", "Bevande", "Consumabili", "Dolci", "Ingredienti base", "Ingredienti pronti", "Ortofrutta", "Packaging", "Pulizia"];
                        setDownloadCategories(downloadCategories.length === allCategories.length ? [] : allCategories);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                      {downloadCategories.length === 9 ? '✓ Deseleziona Tutto' : '☐ Seleziona Tutto'}
                    </button>
                    {["Angolo di Sardegna", "Bevande", "Consumabili", "Dolci", "Ingredienti base", "Ingredienti pronti", "Ortofrutta", "Packaging", "Pulizia"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setDownloadCategories(prev => 
                            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                          );
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                          downloadCategories.includes(cat) 
                            ? 'bg-blue-100 text-blue-700 font-medium' 
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}>
                        {downloadCategories.includes(cat) ? '✓' : '☐'} {cat}
                      </button>
                    ))}
                  </div>

                  {downloadCategories.length === 0 && (
                    <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg">
                      Nessuna categoria = tutte
                    </p>
                  )}
                </div>

                {/* Fornitori */}
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-3">Fornitori:</p>
                  
                  <div className="space-y-2">
                    {(() => {
                      const allFornitori = [...new Set(products.map(p => p.fornitore).filter(Boolean))].sort();
                      return (
                        <>
                          <button
                            onClick={() => setDownloadFornitori(downloadFornitori.length === allFornitori.length ? [] : allFornitori)}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-green-600 hover:bg-green-50 transition-colors">
                            {downloadFornitori.length === allFornitori.length ? '✓ Deseleziona Tutto' : '☐ Seleziona Tutto'}
                          </button>
                          {allFornitori.map(fornitore => (
                            <button
                              key={fornitore}
                              onClick={() => {
                                setDownloadFornitori(prev => 
                                  prev.includes(fornitore) ? prev.filter(f => f !== fornitore) : [...prev, fornitore]
                                );
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                                downloadFornitori.includes(fornitore) 
                                  ? 'bg-green-100 text-green-700 font-medium' 
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}>
                              {downloadFornitori.includes(fornitore) ? '✓' : '☐'} {fornitore}
                            </button>
                          ))}
                        </>
                      );
                    })()}
                  </div>

                  {downloadFornitori.length === 0 && (
                    <p className="text-xs text-green-600 mt-2 bg-green-50 p-2 rounded-lg">
                      Nessun fornitore = tutti
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {setShowDownloadModal(false); setDownloadCategories([]); setDownloadFornitori([]);}}
                  className="flex-1 neumorphic-flat px-4 py-3 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-colors">
                  Annulla
                </button>
                <button
                  onClick={() => {
                    const prodottiDaEsportare = products.filter(p => {
                      if (!p.attivo) return false;
                      if (downloadCategories.length > 0 && !downloadCategories.includes(p.categoria)) return false;
                      if (downloadFornitori.length > 0 && !downloadFornitori.includes(p.fornitore)) return false;
                      return true;
                    });

                    const headers = ['Nome Prodotto', 'Nome Interno', 'Categoria', 'Fornitore', 'Marca', 'Prezzo Unitario (€)', 'Unità di Misura', 'Peso/Dimensione', 'Unità Misura Peso'];
                    const rows = prodottiDaEsportare.map(p => [
                      p.nome_prodotto || '',
                      p.nome_interno || '',
                      p.categoria || '',
                      p.fornitore || '',
                      p.marca || '',
                      p.prezzo_unitario?.toFixed(2) || '0.00',
                      p.unita_misura || '',
                      p.peso_dimensione_unita || '',
                      p.unita_misura_peso || ''
                    ]);

                    const csvContent = [
                      headers.join(','),
                      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    const filters = [];
                    if (downloadCategories.length > 0) filters.push(downloadCategories.join('_'));
                    if (downloadFornitori.length > 0) filters.push(downloadFornitori.join('_'));
                    link.download = `listino_${filters.length > 0 ? filters.join('_') : 'completo'}_${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);

                    setShowDownloadModal(false);
                    setDownloadCategories([]);
                    setDownloadFornitori([]);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Scarica CSV
                </button>
              </div>
            </NeumorphicCard>
          </div>
        )}

        {/* Modal Conferma Ricezione Ordine */}
        {confirmingOrder &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Conferma Ricezione</h2>
                  <p className="text-sm text-slate-500">{confirmingOrder.store_name} - {confirmingOrder.fornitore}</p>
                </div>
                <button onClick={() => {
                  setConfirmingOrder(null);
                  setReceivedQuantities({});
                  setConfirmedProducts({});
                  setDdtPhotos([]);
                }} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-yellow-800 text-sm">Importante!</p>
                    <p className="text-xs text-yellow-700">
                      Verifica che le quantità ricevute corrispondano a quelle ordinate prima di completare.
                    </p>
                  </div>
                </div>
              </div>

              {/* Totali Unità */}
              <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-bold text-blue-800 text-sm mb-3">📊 Riepilogo Unità Totali</h3>
                <div className="space-y-2">
                  {confirmingOrder.prodotti
                    .filter((p) => p.quantita_ordinata > 0)
                    .map((prod) => {
                      const materiaPrima = products.find((m) => m.id === prod.prodotto_id);
                      const unitaPerConfezione = materiaPrima?.unita_per_confezione || null;
                      const totalUnits = unitaPerConfezione ? prod.quantita_ordinata * unitaPerConfezione : null;
                      
                      return (
                        <div key={prod.prodotto_id} className="flex items-center justify-between text-xs">
                          <span className="text-blue-700">{prod.nome_prodotto}</span>
                          <span className="font-bold text-blue-800">
                            {totalUnits ? `${Math.round(totalUnits)} unità` : `${prod.quantita_ordinata} ${prod.unita_misura}`}
                          </span>
                        </div>
                      );
                    })}
                  <div className="border-t border-blue-300 pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-800">Totale Unità:</span>
                      <span className="text-lg font-bold text-blue-800">
                        {confirmingOrder.prodotti
                          .filter((p) => p.quantita_ordinata > 0)
                          .reduce((sum, prod) => {
                            const materiaPrima = products.find((m) => m.id === prod.prodotto_id);
                            const unitaPerConfezione = materiaPrima?.unita_per_confezione || 0;
                            return sum + (unitaPerConfezione > 0 ? prod.quantita_ordinata * unitaPerConfezione : 0);
                          }, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DDT Photo Upload */}
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Foto DDT (opzionale)
                </label>
                <div className="space-y-3">
                  <label className="neumorphic-pressed p-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 transition-colors">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">
                      {uploadingPhoto ? 'Caricamento...' : 'Carica Foto DDT'}
                    </span>
                    <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden" />
                  </label>

                  {ddtPhotos.length > 0 &&
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {ddtPhotos.map((url, idx) =>
                      <div key={idx} className="relative neumorphic-flat rounded-xl overflow-hidden group">
                          <img src={url} alt={`DDT ${idx + 1}`} className="w-full h-32 object-cover" />
                          <button
                          onClick={() => removePhoto(idx)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  }
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {confirmingOrder.prodotti.filter((p) => p.quantita_ordinata > 0).map((prod) => {
                  const receivedQty = receivedQuantities[prod.prodotto_id] || 0;
                  const isMatch = receivedQty === prod.quantita_ordinata;
                  const isConfirmed = confirmedProducts[prod.prodotto_id];
                  const materiaPrima = products.find((m) => m.id === prod.prodotto_id);

                  return (
                    <div key={prod.prodotto_id} className={`neumorphic-pressed p-4 rounded-xl transition-all ${
                      isConfirmed ? 'border-2 border-green-500' : ''}`}>
                      {materiaPrima?.foto_url &&
                        <div className="mb-3">
                          <img
                            src={materiaPrima.foto_url}
                            alt={prod.nome_prodotto}
                            className="w-full h-32 object-cover rounded-lg" />
                        </div>
                      }
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800">{prod.nome_prodotto}</p>
                            <button
                              type="button"
                              onClick={() => speakProductName(prod.nome_prodotto)}
                              disabled={playingAudio === prod.nome_prodotto}
                              className="nav-button p-1.5 rounded-lg hover:bg-blue-50"
                              title="Ascolta il nome">
                              <Volume2 className={`w-4 h-4 ${playingAudio === prod.nome_prodotto ? 'text-blue-600 animate-pulse' : 'text-slate-600'}`} />
                            </button>
                          </div>
                          <p className="text-sm text-slate-500">
                            Ordinato: {prod.quantita_ordinata} {prod.unita_misura}
                          </p>
                        </div>
                        {isMatch ?
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" /> :
                          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        }
                      </div>
                      
                      <div className="mb-3">
                        <label className="text-xs text-slate-500 mb-1 block">Quantità Ricevuta</label>
                        <input
                          type="number"
                          step="0.1"
                          value={receivedQty}
                          onChange={(e) => setReceivedQuantities({
                            ...receivedQuantities,
                            [prod.prodotto_id]: parseFloat(e.target.value) || 0
                          })}
                          className={`w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none ${
                            !isMatch ? 'border-2 border-orange-300' : ''}`} />
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={isConfirmed}
                          onChange={(e) => setConfirmedProducts({
                            ...confirmedProducts,
                            [prod.prodotto_id]: e.target.checked
                          })}
                          className="w-5 h-5" />
                        <label className="text-sm font-medium text-blue-800 cursor-pointer">
                          Ho verificato questo prodotto
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <NeumorphicButton onClick={() => {
                  setConfirmingOrder(null);
                  setReceivedQuantities({});
                  setConfirmedProducts({});
                  setDdtPhotos([]);
                }} className="flex-1">
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleCompleteOrder}
                  variant="primary"
                  disabled={!allProductsConfirmed}
                  className="flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <CheckCircle className="w-5 h-5" />
                  Completa Ordine
                </NeumorphicButton>
              </div>
              {!allProductsConfirmed &&
                <p className="text-center text-sm text-orange-600 mt-2">
                  ⚠️ Devi confermare tutti i prodotti prima di completare l'ordine
                </p>
              }
            </NeumorphicCard>
          </div>
        }
      </div>
    </ProtectedPage>);

}