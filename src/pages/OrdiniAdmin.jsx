import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
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
  Search
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function OrdiniAdmin() {
  const [activeTab, setActiveTab] = useState('suggeriti');
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

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['rilevazione-inventario'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 500),
  });

  const { data: inventoryCantina = [] } = useQuery({
    queryKey: ['rilevazione-inventario-cantina'],
    queryFn: () => base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione', 500),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const { data: fornitori = [] } = useQuery({
    queryKey: ['fornitori'],
    queryFn: () => base44.entities.Fornitore.filter({ attivo: true }),
  });

  const { data: ordiniInviati = [] } = useQuery({
    queryKey: ['ordini-inviati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'inviato' }),
  });

  const { data: ordiniCompletati = [] } = useQuery({
    queryKey: ['ordini-completati'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ status: 'completato' }),
  });

  const { data: regoleOrdini = [] } = useQuery({
    queryKey: ['regole-ordini'],
    queryFn: () => base44.entities.RegolaOrdine.filter({ attivo: true }),
  });

  const createOrderMutation = useMutation({
    mutationFn: (order) => base44.entities.OrdineFornitore.create(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      queryClient.invalidateQueries({ queryKey: ['ordini-completati'] });
      setEditingOrder(null);
      alert('✅ Ordine segnato come inviato!');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId) => base44.entities.OrdineFornitore.delete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      queryClient.invalidateQueries({ queryKey: ['ordini-completati'] });
      alert('✅ Ordine eliminato!');
    },
  });

  const createRegolaMutation = useMutation({
    mutationFn: (regola) => base44.entities.RegolaOrdine.create(regola),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regole-ordini'] });
      setShowRegoleForm(false);
      setEditingRegola(null);
    },
  });

  const updateRegolaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RegolaOrdine.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regole-ordini'] });
      setShowRegoleForm(false);
      setEditingRegola(null);
    },
  });

  const deleteRegolaMutation = useMutation({
    mutationFn: (regolaId) => base44.entities.RegolaOrdine.delete(regolaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regole-ordini'] });
    },
  });

  // Calculate orders needed
  const ordersNeeded = React.useMemo(() => {
    const orders = [];
    const allInventory = [...inventory, ...inventoryCantina];
    const latestByProduct = {};
    
    allInventory.forEach(item => {
      const key = `${item.store_id}-${item.prodotto_id}`;
      if (!latestByProduct[key] || new Date(item.data_rilevazione) > new Date(latestByProduct[key].data_rilevazione)) {
        latestByProduct[key] = item;
      }
    });
    
    Object.values(latestByProduct).forEach(reading => {
      const product = products.find(p => p.id === reading.prodotto_id);
      if (!product) return;
      
      const store = stores.find(s => s.id === reading.store_id);
      if (!store) return;
      
      // Verifica se il prodotto è assegnato a questo store
      const isAssignedToStore = !product.assigned_stores || 
                                 product.assigned_stores.length === 0 || 
                                 product.assigned_stores.includes(reading.store_id);
      if (!isAssignedToStore) return;
      
      // Verifica se il prodotto è in uso per questo store
      const isInUsoForStore = product.in_uso_per_store?.[reading.store_id] === true || 
                              (!product.in_uso_per_store?.[reading.store_id] && product.in_uso === true);
      if (!isInUsoForStore) return;
      
      const quantitaCritica = product.store_specific_quantita_critica?.[reading.store_id] || product.quantita_critica || product.quantita_minima || 0;
      const quantitaOrdine = product.store_specific_quantita_ordine?.[reading.store_id] || product.quantita_ordine || 0;
      
      if (reading.quantita_rilevata <= quantitaCritica && quantitaOrdine > 0) {
        orders.push({
          ...reading,
          product,
          store,
          quantita_critica: quantitaCritica,
          quantita_ordine: quantitaOrdine,
          fornitore: product.fornitore || 'Non specificato'
        });
      }
    });
    
    return orders;
  }, [inventory, inventoryCantina, products, stores]);

  // Group orders by store and supplier
  const ordersByStoreAndSupplier = React.useMemo(() => {
    const grouped = {};
    
    ordersNeeded.forEach(order => {
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

  const getFornitoreByName = (name) => {
    return fornitori.find(f => 
      f.ragione_sociale?.toLowerCase() === name?.toLowerCase() ||
      f.ragione_sociale?.toLowerCase().includes(name?.toLowerCase()) ||
      name?.toLowerCase().includes(f.ragione_sociale?.toLowerCase())
    );
  };

  const openOrderEditor = (storeName, storeId, supplierName, orders) => {
    const fornitore = getFornitoreByName(supplierName);
    
    // Filter out products that already have a pending order OR arrived today
    const prodottiSenzaOrdineInCorso = orders.filter(order => {
      const hasPendingOrder = ordiniInviati.some(o => 
        o.store_id === storeId &&
        o.prodotti.some(p => p.prodotto_id === order.product.id)
      );
      
      const hasArrivedToday = ordiniCompletati.some(o => {
        const completedToday = o.data_completamento && 
          new Date(o.data_completamento).toDateString() === new Date().toDateString();
        return completedToday &&
          o.store_id === storeId &&
          o.prodotti.some(p => p.prodotto_id === order.product.id);
      });
      
      return !hasPendingOrder && !hasArrivedToday;
    });

    const prodotti = prodottiSenzaOrdineInCorso.map(order => ({
      prodotto_id: order.product.id,
      nome_prodotto: order.nome_prodotto,
      quantita_ordinata: order.quantita_ordine,
      quantita_ricevuta: 0,
      unita_misura: order.unita_misura,
      prezzo_unitario: order.product.prezzo_unitario || 0,
      iva_percentuale: order.product.iva_percentuale ?? 22
    }));

    const totaleOrdineNettoIVA = prodotti.reduce((sum, p) => sum + (p.prezzo_unitario * p.quantita_ordinata), 0);
    const totaleOrdineConIVA = prodotti.reduce((sum, p) => {
      const prezzoConIVA = p.prezzo_unitario * (1 + (p.iva_percentuale / 100));
      return sum + (prezzoConIVA * p.quantita_ordinata);
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
    const prodottiFiltrati = editingOrder.prodotti.filter(p => p.quantita_ordinata > 0);
    
    if (prodottiFiltrati.length === 0) {
      alert('Aggiungi almeno un prodotto con quantità > 0');
      return;
    }

    // Recalculate totals with filtered products
    const totaleNettoFiltrato = prodottiFiltrati.reduce((sum, p) => sum + (p.prezzo_unitario * p.quantita_ordinata), 0);
    const totaleConIVAFiltrato = prodottiFiltrati.reduce((sum, p) => {
      const prezzoConIVA = p.prezzo_unitario * (1 + (p.iva_percentuale / 100));
      return sum + (prezzoConIVA * p.quantita_ordinata);
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
    const prodotti = orders.map(order => ({
      prodotto_id: order.product.id,
      nome_prodotto: order.nome_prodotto,
      quantita_ordinata: order.quantita_ordine,
      unita_misura: order.unita_misura,
      prezzo_unitario: order.product.prezzo_unitario || 0,
      iva_percentuale: order.product.iva_percentuale ?? 22
    }));

    const productList = prodotti.map(p => 
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
    setSendingEmail(prev => ({ ...prev, [emailKey]: true }));

    try {
      await base44.integrations.Core.SendEmail({
        to: fornitore.contatto_email,
        subject: emailTemplate.subject,
        body: emailTemplate.body,
        from_name: 'Sa Pizzedda'
      });

      // Salva ordine come inviato
      const totaleOrdineNettoIVA = emailTemplate.prodotti.reduce((sum, p) => sum + (p.prezzo_unitario * p.quantita_ordinata), 0);
      const totaleOrdineConIVA = emailTemplate.prodotti.reduce((sum, p) => {
        const prezzoConIVA = p.prezzo_unitario * (1 + ((p.iva_percentuale ?? 22) / 100));
        return sum + (prezzoConIVA * p.quantita_ordinata);
      }, 0);
      
      await createOrderMutation.mutateAsync({
        store_id: storeId,
        store_name: storeName,
        fornitore: supplierName,
        fornitore_email: fornitore.contatto_email,
        prodotti: emailTemplate.prodotti.map(p => ({
          ...p,
          quantita_ricevuta: 0
        })),
        totale_ordine: totaleOrdineNettoIVA,
        totale_ordine_con_iva: totaleOrdineConIVA,
        status: 'inviato',
        data_invio: new Date().toISOString(),
        note: ''
      });

      setEmailSent(prev => ({ ...prev, [emailKey]: true }));
      setTimeout(() => {
        setEmailSent(prev => ({ ...prev, [emailKey]: false }));
      }, 5000);
      
      setCustomizingEmail(null);

    } catch (error) {
      console.error('Errore invio email:', error);
      alert(`Errore nell'invio dell'email: ${error.message}`);
    } finally {
      setSendingEmail(prev => ({ ...prev, [emailKey]: false }));
    }
  };

  const tabs = [
    { id: 'suggeriti', label: 'Ordini Suggeriti', icon: Package },
    { id: 'inviati', label: 'Ordini Inviati', icon: Send },
    { id: 'completati', label: 'Ordini Arrivati', icon: CheckCircle },
    { id: 'regole', label: 'Regole Ordini', icon: Calendar },
    { id: 'analisi', label: 'Analisi Ordini', icon: BarChart3 }
  ];

  return (
    <ProtectedPage pageName="Inventory">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📦 Gestione Ordini Fornitori</h1>
          <p className="text-[#9b9b9b]">Ordini suggeriti, inviati e completati</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'neumorphic-pressed bg-blue-50 text-blue-700'
                  : 'neumorphic-flat text-slate-600 hover:text-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'suggeriti' && ordersNeeded.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
                  {ordersNeeded.length}
                </span>
              )}
              {tab.id === 'inviati' && ordiniInviati.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500 text-white">
                  {ordiniInviati.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm flex-1 lg:flex-initial"
          >
            <option value="all">Tutti i Locali</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>

        {/* Ordini Suggeriti Tab */}
        {activeTab === 'suggeriti' && (
          <div className="space-y-6">
            {ordersNeeded.length === 0 ? (
              <NeumorphicCard className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun ordine necessario</h3>
                <p className="text-slate-500">Tutte le scorte sono sopra il livello critico</p>
              </NeumorphicCard>
            ) : (
              Object.entries(ordersByStoreAndSupplier)
                .filter(([storeId]) => selectedStore === 'all' || storeId === selectedStore)
                .map(([storeId, storeData]) => {
                  const isExpanded = expandedStoresSuggeriti[storeId];
                  const totalOrdersForStore = Object.values(storeData.suppliers).reduce((sum, orders) => sum + orders.length, 0);
                  
                  return (
                  <NeumorphicCard key={storeId} className="overflow-hidden">
                    <button
                      onClick={() => setExpandedStoresSuggeriti(prev => ({ ...prev, [storeId]: !prev[storeId] }))}
                      className="w-full p-6 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-slate-800">{storeData.store.name}</h2>
                            <p className="text-xs text-slate-500">{totalOrdersForStore} prodotti da ordinare</p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-6 pt-0 space-y-4">
                        {Object.entries(storeData.suppliers).map(([supplier, orders]) => {
                        const fornitore = getFornitoreByName(supplier);
                        const emailKey = `${storeData.store.name}-${supplier}`;
                        const isSending = sendingEmail[emailKey];
                        const wasSent = emailSent[emailKey];
                        
                        // Filter out products with pending orders or arrived today for totals
                        const ordersForTotal = orders.filter(order => {
                          const hasPendingOrder = ordiniInviati.some(o => 
                            o.store_id === storeId &&
                            o.prodotti.some(p => p.prodotto_id === order.product.id)
                          );

                          const hasArrivedToday = ordiniCompletati.some(o => {
                            const completedToday = o.data_completamento && 
                              new Date(o.data_completamento).toDateString() === new Date().toDateString();
                            return completedToday &&
                              o.store_id === storeId &&
                              o.prodotti.some(p => p.prodotto_id === order.product.id);
                          });

                          return !hasPendingOrder && !hasArrivedToday;
                        });

                        const totaleOrdineNettoIVA = ordersForTotal.reduce((sum, order) => {
                          return sum + (order.product.prezzo_unitario || 0) * order.quantita_ordine;
                        }, 0);
                        const totaleOrdineConIVA = ordersForTotal.reduce((sum, order) => {
                          const prezzoUnitario = order.product.prezzo_unitario || 0;
                          const ivaPerc = order.product.iva_percentuale ?? 22;
                          const prezzoConIVA = prezzoUnitario * (1 + (ivaPerc / 100));
                          return sum + (prezzoConIVA * order.quantita_ordine);
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
                                {fornitore?.contatto_email && (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {fornitore.contatto_email}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex gap-2">
                               <button
                                 onClick={() => openOrderEditor(storeData.store.name, storeId, supplier, orders)}
                                 className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all"
                               >
                                 <Send className="w-4 h-4" />
                                 Segna Inviato
                               </button>

                               {fornitore?.contatto_email && (
                                 <button
                                   onClick={() => openEmailCustomization(storeData.store.name, storeId, supplier, orders)}
                                   disabled={isSending || wasSent}
                                   className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                     wasSent
                                       ? 'bg-green-100 text-green-700'
                                       : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                                   } disabled:opacity-50`}
                                 >
                                   {isSending ? (
                                     <>
                                       <Loader2 className="w-4 h-4 animate-spin" />
                                       Invio...
                                     </>
                                   ) : wasSent ? (
                                     <>
                                       <CheckCircle className="w-4 h-4" />
                                       Inviata!
                                     </>
                                   ) : (
                                     <>
                                       <Mail className="w-4 h-4" />
                                       Invia Email
                                     </>
                                   )}
                                 </button>
                               )}
                              </div>
                              </div>

                              {/* Check if order was already sent */}
                              {(() => {
                              const alreadySent = ordiniInviati.find(o => 
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
                                 </div>
                               );
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
                                        Sotto minimo (€{(ordineMinimo - totaleOrdineConIVA).toFixed(2)})
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Search Bar */}
                            <div className="mb-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Cerca prodotto..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full neumorphic-pressed pl-10 pr-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                                />
                              </div>
                            </div>

                            {(() => {
                              // Separate products into categories
                              const prodottiInCorso = [];
                              const prodottiArrivatiOggi = [];
                              const prodottiNormali = [];
                              
                              orders.forEach(order => {
                                // Check if there's already an order for this product
                                const hasPendingOrder = ordiniInviati.some(o => 
                                  o.store_id === storeId &&
                                  o.prodotti.some(p => p.prodotto_id === order.product.id)
                                );
                                
                                const hasArrivedToday = ordiniCompletati.some(o => {
                                  const completedToday = o.data_completamento && 
                                    new Date(o.data_completamento).toDateString() === new Date().toDateString();
                                  return completedToday &&
                                    o.store_id === storeId &&
                                    o.prodotti.some(p => p.prodotto_id === order.product.id);
                                });
                                
                                // Apply search filter
                                const matchesSearch = !searchTerm || 
                                  order.nome_prodotto.toLowerCase().includes(searchTerm.toLowerCase());
                                
                                if (!matchesSearch) return;
                                
                                if (hasPendingOrder) {
                                  prodottiInCorso.push(order);
                                } else if (hasArrivedToday) {
                                  prodottiArrivatiOggi.push(order);
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
                                          {prodottiNormali.map((order, idx) => {
                                            const prezzoUnitario = order.product.prezzo_unitario || 0;
                                            const ivaPerc = order.product.iva_percentuale ?? 22;
                                            const prezzoUnitarioConIVA = prezzoUnitario * (1 + (ivaPerc / 100));
                                            const totaleRiga = prezzoUnitario * order.quantita_ordine;
                                            const totaleRigaConIVA = prezzoUnitarioConIVA * order.quantita_ordine;

                                            return (
                                              <tr key={idx} className="border-b border-slate-200">
                                                <td className="p-2 text-sm text-slate-700">{order.nome_prodotto}</td>
                                                <td className="p-2 text-sm text-right text-red-600 font-bold">
                                                  {order.quantita_rilevata} {order.unita_misura}
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
                                  
                                  {/* Prodotti con ordine in corso (collapsible) */}
                                  {prodottiInCorso.length > 0 && (
                                    <div className="mt-4">
                                      <button
                                        onClick={() => setCollapsedInCorso(prev => ({ ...prev, [collapseKey]: !prev[collapseKey] }))}
                                        className="w-full flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200"
                                      >
                                        <div className="flex items-center gap-2">
                                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                                          <span className="text-sm font-medium text-orange-700">
                                            Ordine in corso ({prodottiInCorso.length})
                                          </span>
                                        </div>
                                        {isInCorsoCollapsed ? (
                                          <ChevronRight className="w-4 h-4 text-orange-600" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 text-orange-600" />
                                        )}
                                      </button>
                                      {!isInCorsoCollapsed && (
                                        <div className="mt-2 overflow-x-auto">
                                          <table className="w-full min-w-[500px]">
                                            <tbody>
                                              {prodottiInCorso.map((order, idx) => {
                                                const prezzoUnitario = order.product.prezzo_unitario || 0;
                                                const ivaPerc = order.product.iva_percentuale ?? 22;
                                                const prezzoUnitarioConIVA = prezzoUnitario * (1 + (ivaPerc / 100));
                                                const totaleRigaConIVA = prezzoUnitarioConIVA * order.quantita_ordine;

                                                return (
                                                  <tr key={idx} className="border-b border-slate-200 bg-yellow-50">
                                                    <td className="p-2 text-sm text-slate-700">
                                                      {order.nome_prodotto}
                                                      <div className="flex items-center gap-1 mt-1">
                                                        <AlertTriangle className="w-3 h-3 text-orange-600" />
                                                        <span className="text-xs text-orange-600 font-medium">Ordine in corso</span>
                                                      </div>
                                                    </td>
                                                    <td className="p-2 text-sm text-right text-red-600 font-bold">
                                                      {order.quantita_rilevata} {order.unita_misura}
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
                                    </div>
                                  )}
                                  
                                  {/* Prodotti arrivati oggi (collapsible) */}
                                  {prodottiArrivatiOggi.length > 0 && (
                                    <div className="mt-4">
                                      <button
                                        onClick={() => setCollapsedArrivati(prev => ({ ...prev, [collapseKey]: !prev[collapseKey] }))}
                                        className="w-full flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                                      >
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                          <span className="text-sm font-medium text-green-700">
                                            Arrivato oggi ({prodottiArrivatiOggi.length})
                                          </span>
                                        </div>
                                        {isArrivatiCollapsed ? (
                                          <ChevronRight className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 text-green-600" />
                                        )}
                                      </button>
                                      {!isArrivatiCollapsed && (
                                        <div className="mt-2 overflow-x-auto">
                                          <table className="w-full min-w-[500px]">
                                            <tbody>
                                              {prodottiArrivatiOggi.map((order, idx) => {
                                                const prezzoUnitario = order.product.prezzo_unitario || 0;
                                                const ivaPerc = order.product.iva_percentuale ?? 22;
                                                const prezzoUnitarioConIVA = prezzoUnitario * (1 + (ivaPerc / 100));
                                                const totaleRigaConIVA = prezzoUnitarioConIVA * order.quantita_ordine;

                                                return (
                                                  <tr key={idx} className="border-b border-slate-200 bg-green-50">
                                                    <td className="p-2 text-sm text-slate-700">
                                                      {order.nome_prodotto}
                                                      <div className="flex items-center gap-1 mt-1">
                                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                                        <span className="text-xs text-green-600 font-medium">Arrivato oggi</span>
                                                      </div>
                                                    </td>
                                                    <td className="p-2 text-sm text-right text-red-600 font-bold">
                                                      {order.quantita_rilevata} {order.unita_misura}
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
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </NeumorphicCard>
                  );
                })
            )}
          </div>
        )}

        {/* Ordini Inviati Tab */}
        {activeTab === 'inviati' && (
          <div className="space-y-4">
            {ordiniInviati.length === 0 ? (
              <NeumorphicCard className="p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun ordine inviato</h3>
                <p className="text-slate-500">Gli ordini inviati appariranno qui</p>
              </NeumorphicCard>
            ) : (
              (() => {
                // Group orders by supplier
                const ordersBySupplier = {};
                ordiniInviati
                  .filter(o => selectedStore === 'all' || o.store_id === selectedStore)
                  .forEach(ordine => {
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
                        onClick={() => setExpandedFornitori(prev => ({ ...prev, [fornitore]: !prev[fornitore] }))}
                        className="w-full p-6 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <Truck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-slate-800">{fornitore}</h2>
                              <p className="text-xs text-slate-500">{totalOrders} ordini • €{totalValue.toFixed(2)}</p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-6 pt-0 space-y-3">
                          {ordini.map(ordine => (
                            <div key={ordine.id} className="neumorphic-pressed p-4 rounded-xl">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="font-bold text-slate-800">{ordine.store_name}</h3>
                                  <p className="text-xs text-slate-400">
                                    Inviato: {format(parseISO(ordine.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    {(() => {
                                      const totaleCalcolato = ordine.prodotti
                                        .filter(p => p.quantita_ordinata > 0)
                                        .reduce((sum, p) => {
                                          const currentProduct = products.find(prod => prod.id === p.prodotto_id);
                                          const ivaCorrente = currentProduct?.iva_percentuale ?? p.iva_percentuale ?? 22;
                                          const prezzoConIVA = (p.prezzo_unitario || 0) * (1 + (ivaCorrente / 100));
                                          return sum + (prezzoConIVA * p.quantita_ordinata);
                                        }, 0);
                                      return (
                                        <>
                                          <p className="text-sm text-slate-500 line-through">€{ordine.totale_ordine.toFixed(2)}</p>
                                          <p className="text-xl font-bold text-blue-600">€{totaleCalcolato.toFixed(2)}</p>
                                          <p className="text-xs text-green-700 font-medium">IVA inclusa</p>
                                          <p className="text-xs text-slate-500 mt-1">{ordine.prodotti.filter(p => p.quantita_ordinata > 0).length} prodotti</p>
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Eliminare questo ordine?')) {
                                        deleteOrderMutation.mutate(ordine.id);
                                      }
                                    }}
                                    className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                                  >
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
                                    {ordine.prodotti.filter(prod => prod.quantita_ordinata > 0).map((prod, idx) => {
                                      // Get current IVA from products
                                      const currentProduct = products.find(p => p.id === prod.prodotto_id);
                                      const ivaCorrente = currentProduct?.iva_percentuale ?? prod.iva_percentuale ?? 22;
                                      const prezzoUnitarioConIVA = (prod.prezzo_unitario || 0) * (1 + (ivaCorrente / 100));
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
                                      </tr>
                                    );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </NeumorphicCard>
                  );
                });
              })()
            )}
          </div>
        )}

        {/* Regole Ordini Tab */}
        {activeTab === 'regole' && (
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
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuova Regola
                </NeumorphicButton>
              </div>

              {regoleOrdini.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessuna regola configurata</p>
                </div>
              ) : (
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
                      {regoleOrdini.map(regola => {
                        const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
                        const giorniLabel = regola.giorni_settimana
                          .sort((a, b) => a - b)
                          .map(g => giorni[g])
                          .join(', ');
                        
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
                                  className="nav-button p-2 rounded-lg hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Eliminare questa regola?')) {
                                      deleteRegolaMutation.mutate(regola.id);
                                    }
                                  }}
                                  className="nav-button p-2 rounded-lg hover:bg-red-50"
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
              )}
            </NeumorphicCard>
          </div>
        )}

        {/* Ordini Completati Tab */}
        {activeTab === 'completati' && (
          <div className="space-y-4">
            {ordiniCompletati.length === 0 ? (
              <NeumorphicCard className="p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun ordine completato</h3>
                <p className="text-slate-500">Gli ordini completati appariranno qui</p>
              </NeumorphicCard>
            ) : (
              (() => {
                // Group orders by store
                const ordersByStore = {};
                ordiniCompletati
                  .filter(o => selectedStore === 'all' || o.store_id === selectedStore)
                  .forEach(ordine => {
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
                  const hasDiscrepancies = storeData.ordini.some(ordine =>
                    ordine.prodotti.some(prod => prod.quantita_ricevuta !== prod.quantita_ordinata)
                  );

                  return (
                    <NeumorphicCard key={storeId} className="overflow-hidden">
                      <button
                        onClick={() => setExpandedStoresCompletati(prev => ({ ...prev, [storeId]: !prev[storeId] }))}
                        className="w-full p-6 text-left hover:bg-slate-50 transition-colors"
                      >
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
                            {hasDiscrepancies && (
                              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-100">
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                                <span className="text-xs font-bold text-orange-700">Differenze</span>
                              </div>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="p-6 pt-0 space-y-3">
                          {storeData.ordini.map(ordine => {
                            const hasDifferences = ordine.prodotti.some(prod => prod.quantita_ricevuta !== prod.quantita_ordinata);
                            
                            return (
                              <div key={ordine.id} className="neumorphic-pressed p-4 rounded-xl border-2 border-green-200">
                                {hasDifferences && (
                                  <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                                    <span className="text-xs font-medium text-orange-700">
                                      ⚠️ Quantità ricevute diverse da quelle ordinate
                                    </span>
                                  </div>
                                )}
                                
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
                                      className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors"
                                    >
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
                                      {ordine.prodotti.filter(prod => prod.quantita_ordinata > 0).map((prod, idx) => {
                                        const isDifferent = prod.quantita_ricevuta !== prod.quantita_ordinata;
                                        return (
                                          <tr key={idx} className={`border-b border-slate-200 ${isDifferent ? 'bg-orange-50' : ''}`}>
                                            <td className="p-2 text-slate-700">{prod.nome_prodotto}</td>
                                            <td className="p-2 text-right text-slate-700">
                                              {prod.quantita_ordinata} {prod.unita_misura}
                                            </td>
                                            <td className={`p-2 text-right font-bold ${
                                              prod.quantita_ricevuta === prod.quantita_ordinata 
                                                ? 'text-green-600' 
                                                : 'text-orange-600'
                                            }`}>
                                              {prod.quantita_ricevuta} {prod.unita_misura}
                                              {isDifferent && (
                                                <span className="ml-2 text-xs">
                                                  ({prod.quantita_ricevuta > prod.quantita_ordinata ? '+' : ''}{(prod.quantita_ricevuta - prod.quantita_ordinata).toFixed(1)})
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                {ordine.note && (
                                 <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
                                   <p className="text-xs text-slate-600"><strong>Note:</strong> {ordine.note}</p>
                                 </div>
                                )}

                                {ordine.foto_ddt && ordine.foto_ddt.length > 0 && (
                                 <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                   <div className="flex items-center gap-2 mb-2">
                                     <Camera className="w-4 h-4 text-blue-600" />
                                     <p className="text-xs font-bold text-blue-800">Foto DDT ({ordine.foto_ddt.length})</p>
                                   </div>
                                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                     {ordine.foto_ddt.map((url, idx) => (
                                       <a 
                                         key={idx} 
                                         href={url} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="neumorphic-flat rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
                                       >
                                         <div className="relative">
                                           <img src={url} alt={`DDT ${idx + 1}`} className="w-full h-24 object-cover" />
                                           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                             <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                           </div>
                                         </div>
                                       </a>
                                     ))}
                                   </div>
                                 </div>
                                )}
                                </div>
                                );
                                })}
                                </div>
                                )}
                                </NeumorphicCard>
                                );
                                });
                                })()
                                )}
                                </div>
                                )}

        {/* Order Editor Modal */}
        {editingOrder && (
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
                        className="w-full neumorphic-pressed pl-10 pr-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800">Prodotti Ordinati</h3>
                    <NeumorphicButton
                      onClick={() => {
                        // Get all products from this supplier
                        const prodottiDelFornitore = products.filter(p => 
                          p.fornitore === editingOrder.fornitore && 
                          !editingOrder.prodotti.some(ep => ep.prodotto_id === p.id)
                        );
                        
                        if (prodottiDelFornitore.length === 0) {
                          alert('Nessun altro prodotto disponibile per questo fornitore');
                          return;
                        }

                        const nuoviProdotti = prodottiDelFornitore.map(p => ({
                          prodotto_id: p.id,
                          nome_prodotto: p.nome_prodotto,
                          quantita_ordinata: 0,
                          quantita_ricevuta: 0,
                          unita_misura: p.unita_misura,
                          prezzo_unitario: p.prezzo_unitario || 0,
                          iva_percentuale: p.iva_percentuale ?? 22,
                          isExtra: true
                        }));

                        setEditingOrder({
                          ...editingOrder,
                          prodotti: [...editingOrder.prodotti, ...nuoviProdotti]
                        });
                      }}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Aggiungi Prodotti
                    </NeumorphicButton>
                  </div>
                  
                  {searchTermModal && editingOrder.prodotti.filter(prod => prod.nome_prodotto.toLowerCase().includes(searchTermModal.toLowerCase())).length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      Nessun prodotto trovato
                    </div>
                  )}
                  </div>
                  <div className="space-y-2">
                    {editingOrder.prodotti
                      .filter(prod => !searchTermModal || prod.nome_prodotto.toLowerCase().includes(searchTermModal.toLowerCase()))
                      .map((prod, idx) => {
                      const prezzoConIVA = prod.prezzo_unitario * (1 + ((prod.iva_percentuale ?? 22) / 100));
                      const totaleNetto = prod.prezzo_unitario * prod.quantita_ordinata;
                      const totaleConIVA = prezzoConIVA * prod.quantita_ordinata;

                      return (
                     <div key={idx} className={`neumorphic-pressed p-3 rounded-xl ${prod.isExtra ? 'border-2 border-purple-300' : ''}`}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{prod.nome_prodotto}</p>
                            <p className="text-xs text-slate-500">IVA {prod.iva_percentuale ?? 22}%</p>
                            {prod.isExtra && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 mt-1 inline-block">
                                Extra
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Quantità</label>
                            <input
                              type="number"
                              value={prod.quantita_ordinata}
                              onChange={(e) => {
                                const newProdotti = [...editingOrder.prodotti];
                                const actualIdx = editingOrder.prodotti.findIndex(p => p.prodotto_id === prod.prodotto_id);
                                newProdotti[actualIdx].quantita_ordinata = parseFloat(e.target.value) || 0;
                                const newTotaleNetto = newProdotti.reduce((sum, p) => sum + (p.prezzo_unitario * p.quantita_ordinata), 0);
                                const newTotaleConIVA = newProdotti.reduce((sum, p) => {
                                  const pIVA = p.prezzo_unitario * (1 + ((p.iva_percentuale ?? 22) / 100));
                                  return sum + (pIVA * p.quantita_ordinata);
                                }, 0);
                                setEditingOrder({ ...editingOrder, prodotti: newProdotti, totale_ordine: newTotaleNetto, totale_ordine_con_iva: newTotaleConIVA });
                              }}
                              className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm text-slate-700 outline-none"
                            />
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
                      </div>
                    );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Note (opzionale)</label>
                  <textarea
                    value={editingOrder.note}
                    onChange={(e) => setEditingOrder({ ...editingOrder, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none h-20 resize-none"
                    placeholder="Aggiungi note sull'ordine..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={() => setEditingOrder(null)} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                    onClick={saveOrderAsSent}
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Segna Come Inviato
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}

        {/* Analisi Ordini Tab */}
        {activeTab === 'analisi' && (
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
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
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
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="all">Tutti i Prodotti</option>
                    {(() => {
                      const allOrders = [...ordiniInviati, ...ordiniCompletati];
                      const productNames = new Set();
                      allOrders.forEach(order => {
                        order.prodotti.forEach(prod => productNames.add(prod.nome_prodotto));
                      });
                      return Array.from(productNames).sort().map(name => (
                        <option key={name} value={name}>{name}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>
              
              {(() => {
                const now = new Date();
                let startDate = new Date(0); // Default: all time
                
                switch(timeRange) {
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
                let filteredOrders = allOrders.filter(o => {
                  const orderDate = new Date(o.data_invio || o.created_date);
                  return orderDate >= startDate;
                });
                
                if (selectedStore !== 'all') {
                  filteredOrders = filteredOrders.filter(o => o.store_id === selectedStore);
                }

                if (filteredOrders.length === 0) {
                  return <p className="text-center text-slate-500 py-8">Nessun ordine trovato</p>;
                }

                // Group by store
                const byStore = {};
                filteredOrders.forEach(order => {
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
                filteredOrders.forEach(order => {
                  order.prodotti.forEach(prod => {
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
                filteredOrders.forEach(order => {
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
                filteredOrders.forEach(order => {
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
                filteredOrders.forEach(order => {
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

                const timelineData = Object.values(byDate)
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map(({ date, count, total }) => ({ date, count, total }));

                // Product timeline (for selected product or top 5)
                const productTimeline = {};
                let productsToTrack = [];
                
                if (selectedProduct === 'all') {
                  // Get top 5 products by total quantity
                  const productTotals = {};
                  filteredOrders.forEach(order => {
                    order.prodotti.forEach(prod => {
                      if (!productTotals[prod.nome_prodotto]) {
                        productTotals[prod.nome_prodotto] = 0;
                      }
                      productTotals[prod.nome_prodotto] += prod.quantita_ordinata;
                    });
                  });
                  productsToTrack = Object.entries(productTotals)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name]) => name);
                } else {
                  productsToTrack = [selectedProduct];
                }

                filteredOrders.forEach(order => {
                  const date = order.data_invio || order.created_date;
                  const dateKey = format(parseISO(date), 'dd MMM', { locale: it });
                  
                  if (!productTimeline[dateKey]) {
                    productTimeline[dateKey] = {
                      date: dateKey,
                      timestamp: new Date(date).getTime()
                    };
                    productsToTrack.forEach(p => {
                      productTimeline[dateKey][p] = 0;
                    });
                  }
                  
                  order.prodotti.forEach(prod => {
                    if (productsToTrack.includes(prod.nome_prodotto)) {
                      productTimeline[dateKey][prod.nome_prodotto] += prod.quantita_ordinata;
                    }
                  });
                });

                const productTimelineData = Object.values(productTimeline)
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map(({ timestamp, ...rest }) => rest);

                // Supplier distribution for pie chart
                const supplierData = Object.entries(bySupplier).map(([name, data]) => ({
                  name,
                  value: data.total
                }));

                const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

                return (
                  <div className="space-y-6">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                          {filteredOrders.filter(o => o.status === 'inviato').length}
                        </p>
                      </div>
                      <div className="neumorphic-pressed p-4 rounded-xl text-center">
                        <p className="text-sm text-slate-500 mb-1">Ordini Completati</p>
                        <p className="text-3xl font-bold text-green-600">
                          {filteredOrders.filter(o => o.status === 'completato').length}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Orders Over Time */}
                      <div className="neumorphic-flat p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Andamento Ordini nel Tempo</h3>
                        {timelineData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timelineData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="date" 
                                angle={-45} 
                                textAnchor="end" 
                                height={80}
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="count" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                name="Numero Ordini"
                                dot={{ r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                        )}
                      </div>

                      {/* Revenue Over Time */}
                      <div className="neumorphic-flat p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Valore Ordini nel Tempo</h3>
                        {timelineData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timelineData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="date" 
                                angle={-45} 
                                textAnchor="end" 
                                height={80}
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis />
                              <Tooltip 
                                formatter={(value) => `€${value.toFixed(2)}`}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="total" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                name="Valore Totale (€)"
                                dot={{ r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                        )}
                      </div>
                    </div>

                    {/* Product Timeline */}
                    <div className="neumorphic-flat p-6 rounded-xl">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">
                        {selectedProduct === 'all' 
                          ? 'Andamento Top 5 Prodotti nel Tempo' 
                          : `Andamento ${selectedProduct} nel Tempo`}
                      </h3>
                      {productTimelineData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart data={productTimelineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              angle={-45} 
                              textAnchor="end" 
                              height={80}
                              style={{ fontSize: '12px' }}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {productsToTrack.map((product, idx) => (
                              <Line 
                                key={product}
                                type="monotone" 
                                dataKey={product} 
                                stroke={COLORS[idx % COLORS.length]} 
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                      )}
                    </div>

                    {/* Supplier Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="neumorphic-flat p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuzione Spesa per Fornitore</h3>
                        {supplierData.length > 0 ? (
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
                                dataKey="value"
                              >
                                {supplierData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                        )}
                      </div>

                      {/* Top Products Bar Chart */}
                      <div className="neumorphic-flat p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Top 10 Prodotti per Valore</h3>
                        {Object.keys(byProduct).length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart 
                              data={Object.entries(byProduct)
                                .sort((a, b) => b[1].totalCost - a[1].totalCost)
                                .slice(0, 10)
                                .map(([name, data]) => ({
                                  name: name.length > 20 ? name.substring(0, 20) + '...' : name,
                                  value: data.totalCost
                                }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="name" 
                                angle={-45} 
                                textAnchor="end" 
                                height={100}
                                style={{ fontSize: '10px' }}
                              />
                              <YAxis />
                              <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                              <Bar dataKey="value" fill="#8b5cf6" name="Valore Totale (€)" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-center text-slate-500 py-8">Nessun dato disponibile</p>
                        )}
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
                            {Object.entries(byStore)
                              .sort((a, b) => b[1].total - a[1].total)
                              .map(([store, data]) => (
                                <tr key={store} className="border-b border-slate-200">
                                  <td className="p-3 text-slate-800 font-medium">{store}</td>
                                  <td className="p-3 text-right text-slate-700">{data.count}</td>
                                  <td className="p-3 text-right text-orange-600">{data.inviati}</td>
                                  <td className="p-3 text-right text-green-600">{data.completati}</td>
                                  <td className="p-3 text-right font-bold text-blue-600">
                                    €{data.total.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
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
                            {Object.entries(byProduct)
                              .sort((a, b) => b[1].totalCost - a[1].totalCost)
                              .slice(0, 20)
                              .map(([product, data]) => (
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
                              ))}
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
                              <th className="text-right p-3 text-slate-600 font-medium">Totale Speso</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(bySupplier)
                              .sort((a, b) => b[1].total - a[1].total)
                              .map(([supplier, data]) => (
                                <tr key={supplier} className="border-b border-slate-200">
                                  <td className="p-3 text-slate-800 font-medium">{supplier}</td>
                                  <td className="p-3 text-right text-slate-700">{data.count}</td>
                                  <td className="p-3 text-right font-bold text-green-600">
                                    €{data.total.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
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
                            {Object.entries(byMonth)
                              .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                              .map(([month, data]) => (
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
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </NeumorphicCard>
          </div>
        )}

        {/* Email Customization Modal */}
        {customizingEmail && (
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
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Prodotti da Ordinare</h3>
                  <div className="space-y-2">
                    {emailTemplate.prodotti.map((prod, idx) => {
                      const prezzoConIVA = prod.prezzo_unitario * (1 + ((prod.iva_percentuale ?? 22) / 100));
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
                              const productList = newProdotti.map(p => 
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
                            className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm text-slate-700 outline-none"
                          />
                          <p className="text-xs text-slate-500">{prod.unita_misura}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">€{prod.prezzo_unitario.toFixed(2)}/u (netto)</p>
                          <p className="text-xs text-slate-500">€{prezzoConIVA.toFixed(2)}/u (+IVA)</p>
                          <p className="text-sm font-bold text-blue-600">
                            €{(prezzoConIVA * prod.quantita_ordinata).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-1">
                    <p className="text-xs text-slate-600">
                      Totale Netto IVA: €{emailTemplate.prodotti.reduce((sum, p) => sum + (p.prezzo_unitario * p.quantita_ordinata), 0).toFixed(2)}
                    </p>
                    <p className="text-sm font-bold text-blue-700">
                      Totale con IVA: €{emailTemplate.prodotti.reduce((sum, p) => {
                      const prezzoConIVA = p.prezzo_unitario * (1 + ((p.iva_percentuale ?? 22) / 100));
                        return sum + (prezzoConIVA * p.quantita_ordinata);
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
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Corpo Email</label>
                  <textarea
                    value={emailTemplate.body}
                    onChange={(e) => setEmailTemplate({ ...emailTemplate, body: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none h-64 resize-none font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={() => setCustomizingEmail(null)} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                    onClick={sendOrderEmail}
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Invia Email e Segna Inviato
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}

        {/* Modal Regola Ordine */}
        {showRegoleForm && editingRegola && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingRegola.id ? 'Modifica Regola' : 'Nuova Regola Ordine'}
                </h2>
                <button onClick={() => { setShowRegoleForm(false); setEditingRegola(null); }} className="nav-button p-2 rounded-lg">
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
                      const prod = products.find(p => p.id === prodId);
                      setEditingRegola({ 
                        ...editingRegola, 
                        prodotto_id: prodId,
                        nome_prodotto: prod?.nome_prodotto || ''
                      });
                    }}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    disabled={!!editingRegola.id}
                  >
                    <option value="">Seleziona un prodotto</option>
                    {products
                      .filter(p => !regoleOrdini.some(r => r.prodotto_id === p.id && r.id !== editingRegola.id))
                      .sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto))
                      .map(prod => (
                        <option key={prod.id} value={prod.id}>{prod.nome_prodotto}</option>
                      ))}
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
                            const newGiorni = isSelected
                              ? editingRegola.giorni_settimana.filter(g => g !== idx)
                              : [...(editingRegola.giorni_settimana || []), idx];
                            setEditingRegola({ ...editingRegola, giorni_settimana: newGiorni });
                          }}
                          className={`p-3 rounded-xl text-sm font-medium transition-all ${
                            isSelected
                              ? 'neumorphic-pressed bg-blue-50 text-blue-700 border-2 border-blue-300'
                              : 'neumorphic-flat text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {giorno.substring(0, 3)}
                        </button>
                      );
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
                    placeholder="Es: Consegna solo il martedì e venerdì"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton 
                    onClick={() => { setShowRegoleForm(false); setEditingRegola(null); }} 
                    className="flex-1"
                  >
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
                    disabled={createRegolaMutation.isPending || updateRegolaMutation.isPending}
                  >
                    {editingRegola.id ? 'Salva Modifiche' : 'Crea Regola'}
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}