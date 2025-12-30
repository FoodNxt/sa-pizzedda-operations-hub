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
  Calendar
} from 'lucide-react';
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
    body: ''
  });

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

  const createOrderMutation = useMutation({
    mutationFn: (order) => base44.entities.OrdineFornitore.create(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini-inviati'] });
      queryClient.invalidateQueries({ queryKey: ['ordini-completati'] });
      setEditingOrder(null);
      alert('✅ Ordine segnato come inviato!');
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
    const prodotti = orders.map(order => ({
      prodotto_id: order.product.id,
      nome_prodotto: order.nome_prodotto,
      quantita_ordinata: order.quantita_ordine,
      quantita_ricevuta: 0,
      unita_misura: order.unita_misura,
      prezzo_unitario: order.product.prezzo_unitario || 0
    }));

    const totaleOrdine = prodotti.reduce((sum, p) => sum + (p.prezzo_unitario * p.quantita_ordinata), 0);

    setEditingOrder({
      store_id: storeId,
      store_name: storeName,
      fornitore: supplierName,
      fornitore_email: fornitore?.contatto_email || '',
      prodotti,
      totale_ordine: totaleOrdine,
      note: ''
    });
  };

  const saveOrderAsSent = async () => {
    if (!editingOrder) return;

    const orderData = {
      ...editingOrder,
      status: 'inviato',
      data_invio: new Date().toISOString()
    };

    await createOrderMutation.mutateAsync(orderData);
  };

  const openEmailCustomization = (storeName, supplierName, orders) => {
    const fornitore = getFornitoreByName(supplierName);
    const productList = orders.map(order => 
      `• ${order.nome_prodotto}: ${order.quantita_ordine} ${order.unita_misura}`
    ).join('\n');

    setEmailTemplate({
      subject: `Ordine Sa Pizzedda - ${storeName}`,
      body: `Gentile ${fornitore?.referente_nome || fornitore?.ragione_sociale || supplierName},

Vi inviamo il seguente ordine per il locale ${storeName}:

${productList}

Grazie per la collaborazione.

Cordiali saluti,
Sa Pizzedda`
    });
    
    setCustomizingEmail({ storeName, supplierName, orders });
  };

  const sendOrderEmail = async () => {
    const { storeName, supplierName, orders } = customizingEmail;
    const fornitore = getFornitoreByName(supplierName);
    
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
                .map(([storeId, storeData]) => (
                  <NeumorphicCard key={storeId} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-800">{storeData.store.name}</h2>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(storeData.suppliers).map(([supplier, orders]) => {
                        const fornitore = getFornitoreByName(supplier);
                        const emailKey = `${storeData.store.name}-${supplier}`;
                        const isSending = sendingEmail[emailKey];
                        const wasSent = emailSent[emailKey];
                        
                        const totaleOrdine = orders.reduce((sum, order) => {
                          return sum + (order.product.prezzo_unitario || 0) * order.quantita_ordine;
                        }, 0);
                        const ordineMinimo = fornitore?.ordine_minimo || 0;
                        const superaMinimo = totaleOrdine >= ordineMinimo;
                        
                        return (
                          <div key={supplier} className="neumorphic-pressed p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Truck className="w-5 h-5 text-slate-600" />
                                <h3 className="font-bold text-slate-700">{supplier}</h3>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                                  {orders.length} prodotti
                                </span>

                                {/* Check if order was already sent */}
                                {(() => {
                                  const existingOrder = ordiniInviati.find(o => 
                                    o.store_id === storeId && 
                                    o.fornitore === supplier &&
                                    o.prodotti.every(op => orders.some(or => or.product.id === op.prodotto_id))
                                  );
                                  return existingOrder ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Inviato {format(parseISO(existingOrder.data_invio), 'dd/MM', { locale: it })}
                                    </span>
                                  ) : null;
                                })()}
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
                                    onClick={() => openEmailCustomization(storeData.store.name, supplier, orders)}
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

                            <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-700">Totale Ordine:</span>
                                  <span className="text-lg font-bold text-blue-600">€{totaleOrdine.toFixed(2)}</span>
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
                                        Sotto minimo (€{(ordineMinimo - totaleOrdine).toFixed(2)})
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[500px]">
                                <thead>
                                  <tr className="border-b border-slate-300">
                                    <th className="text-left p-2 text-slate-600 font-medium text-xs">Prodotto</th>
                                    <th className="text-right p-2 text-slate-600 font-medium text-xs">Attuale</th>
                                    <th className="text-right p-2 text-slate-600 font-medium text-xs">Critica</th>
                                    <th className="text-right p-2 text-slate-600 font-medium text-xs">Da Ordinare</th>
                                    <th className="text-right p-2 text-slate-600 font-medium text-xs">Prezzo Unit.</th>
                                    <th className="text-right p-2 text-slate-600 font-medium text-xs">Totale</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orders.map((order, idx) => {
                                    const prezzoUnitario = order.product.prezzo_unitario || 0;
                                    const totaleRiga = prezzoUnitario * order.quantita_ordine;
                                    return (
                                      <tr key={idx} className="border-b border-slate-200">
                                        <td className="p-2 text-sm text-slate-700">
                                          {order.nome_prodotto}
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
                                        <td className="p-2 text-sm text-right text-slate-600">
                                          {prezzoUnitario > 0 ? `€${prezzoUnitario.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-2 text-sm text-right font-bold text-blue-600">
                                          {totaleRiga > 0 ? `€${totaleRiga.toFixed(2)}` : '-'}
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
                  </NeumorphicCard>
                ))
            )}
          </div>
        )}

        {/* Ordini Inviati Tab */}
        {activeTab === 'inviati' && (
          <div className="space-y-4">
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Ordini Inviati ({ordiniInviati.length})</h2>
              {ordiniInviati.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nessun ordine inviato</p>
              ) : (
                <div className="space-y-3">
                  {ordiniInviati
                    .filter(o => selectedStore === 'all' || o.store_id === selectedStore)
                    .map(ordine => (
                      <div key={ordine.id} className="neumorphic-pressed p-4 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-slate-800">{ordine.store_name}</h3>
                            <p className="text-sm text-slate-500">{ordine.fornitore}</p>
                            <p className="text-xs text-slate-400">
                              Inviato: {format(parseISO(ordine.data_invio), 'dd/MM/yyyy HH:mm', { locale: it })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-blue-600">€{ordine.totale_ordine.toFixed(2)}</p>
                            <p className="text-xs text-slate-500">{ordine.prodotti.length} prodotti</p>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-300">
                                <th className="text-left p-2 text-slate-600 font-medium text-xs">Prodotto</th>
                                <th className="text-right p-2 text-slate-600 font-medium text-xs">Quantità</th>
                                <th className="text-right p-2 text-slate-600 font-medium text-xs">Prezzo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ordine.prodotti.map((prod, idx) => (
                                <tr key={idx} className="border-b border-slate-200">
                                  <td className="p-2 text-slate-700">{prod.nome_prodotto}</td>
                                  <td className="p-2 text-right text-slate-700">
                                    {prod.quantita_ordinata} {prod.unita_misura}
                                  </td>
                                  <td className="p-2 text-right text-slate-600">
                                    €{(prod.prezzo_unitario * prod.quantita_ordinata).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </NeumorphicCard>
          </div>
        )}

        {/* Analisi Ordini Tab */}
        {activeTab === 'analisi' && (
          <div className="space-y-6">
            {(() => {
              const allOrders = [...ordiniInviati, ...ordiniCompletati];
              
              // Analytics by store
              const byStore = {};
              allOrders.forEach(ord => {
                if (!byStore[ord.store_name]) {
                  byStore[ord.store_name] = {
                    totale: 0,
                    ordini: 0,
                    prodotti: new Set()
                  };
                }
                byStore[ord.store_name].totale += ord.totale_ordine;
                byStore[ord.store_name].ordini++;
                ord.prodotti.forEach(p => byStore[ord.store_name].prodotti.add(p.nome_prodotto));
              });
              
              // Analytics by product
              const byProduct = {};
              allOrders.forEach(ord => {
                ord.prodotti.forEach(p => {
                  if (!byProduct[p.nome_prodotto]) {
                    byProduct[p.nome_prodotto] = {
                      quantita: 0,
                      ordini: 0,
                      costo: 0,
                      unita: p.unita_misura
                    };
                  }
                  byProduct[p.nome_prodotto].quantita += p.quantita_ordinata;
                  byProduct[p.nome_prodotto].ordini++;
                  byProduct[p.nome_prodotto].costo += p.prezzo_unitario * p.quantita_ordinata;
                });
              });
              
              // Analytics by supplier
              const bySupplier = {};
              allOrders.forEach(ord => {
                if (!bySupplier[ord.fornitore]) {
                  bySupplier[ord.fornitore] = {
                    totale: 0,
                    ordini: 0
                  };
                }
                bySupplier[ord.fornitore].totale += ord.totale_ordine;
                bySupplier[ord.fornitore].ordini++;
              });
              
              // Timeline data
              const timeline = {};
              allOrders.forEach(ord => {
                const date = format(parseISO(ord.data_invio || ord.created_date), 'MMM yyyy', { locale: it });
                if (!timeline[date]) {
                  timeline[date] = { totale: 0, ordini: 0 };
                }
                timeline[date].totale += ord.totale_ordine;
                timeline[date].ordini++;
              });
              
              return (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <NeumorphicCard className="p-4 text-center">
                      <p className="text-sm text-slate-500 mb-1">Totale Ordini</p>
                      <p className="text-3xl font-bold text-blue-600">{allOrders.length}</p>
                    </NeumorphicCard>
                    <NeumorphicCard className="p-4 text-center">
                      <p className="text-sm text-slate-500 mb-1">Spesa Totale</p>
                      <p className="text-3xl font-bold text-green-600">
                        €{allOrders.reduce((sum, o) => sum + o.totale_ordine, 0).toFixed(0)}
                      </p>
                    </NeumorphicCard>
                    <NeumorphicCard className="p-4 text-center">
                      <p className="text-sm text-slate-500 mb-1">Fornitori</p>
                      <p className="text-3xl font-bold text-purple-600">{Object.keys(bySupplier).length}</p>
                    </NeumorphicCard>
                    <NeumorphicCard className="p-4 text-center">
                      <p className="text-sm text-slate-500 mb-1">Prodotti Diversi</p>
                      <p className="text-3xl font-bold text-orange-600">{Object.keys(byProduct).length}</p>
                    </NeumorphicCard>
                  </div>
                  
                  {/* By Store */}
                  <NeumorphicCard className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Per Negozio
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-blue-600">
                            <th className="text-left p-3 text-slate-600 font-medium">Negozio</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Ordini</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Prodotti Unici</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Spesa Totale</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Media Ordine</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(byStore)
                            .sort((a, b) => b[1].totale - a[1].totale)
                            .map(([store, data]) => (
                              <tr key={store} className="border-b border-slate-200">
                                <td className="p-3 font-medium text-slate-800">{store}</td>
                                <td className="p-3 text-right text-slate-700">{data.ordini}</td>
                                <td className="p-3 text-right text-slate-700">{data.prodotti.size}</td>
                                <td className="p-3 text-right font-bold text-blue-600">€{data.totale.toFixed(2)}</td>
                                <td className="p-3 text-right text-slate-600">€{(data.totale / data.ordini).toFixed(2)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </NeumorphicCard>
                  
                  {/* Top Products */}
                  <NeumorphicCard className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Top 10 Prodotti Ordinati
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-green-600">
                            <th className="text-left p-3 text-slate-600 font-medium">Prodotto</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Quantità Totale</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Ordini</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Costo Totale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(byProduct)
                            .sort((a, b) => b[1].quantita - a[1].quantita)
                            .slice(0, 10)
                            .map(([product, data]) => (
                              <tr key={product} className="border-b border-slate-200">
                                <td className="p-3 font-medium text-slate-800">{product}</td>
                                <td className="p-3 text-right text-slate-700">
                                  {data.quantita.toFixed(1)} {data.unita}
                                </td>
                                <td className="p-3 text-right text-slate-700">{data.ordini}</td>
                                <td className="p-3 text-right font-bold text-green-600">€{data.costo.toFixed(2)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </NeumorphicCard>
                  
                  {/* By Supplier */}
                  <NeumorphicCard className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Per Fornitore
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-purple-600">
                            <th className="text-left p-3 text-slate-600 font-medium">Fornitore</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Ordini</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Spesa Totale</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Media Ordine</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(bySupplier)
                            .sort((a, b) => b[1].totale - a[1].totale)
                            .map(([supplier, data]) => (
                              <tr key={supplier} className="border-b border-slate-200">
                                <td className="p-3 font-medium text-slate-800">{supplier}</td>
                                <td className="p-3 text-right text-slate-700">{data.ordini}</td>
                                <td className="p-3 text-right font-bold text-purple-600">€{data.totale.toFixed(2)}</td>
                                <td className="p-3 text-right text-slate-600">€{(data.totale / data.ordini).toFixed(2)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </NeumorphicCard>
                  
                  {/* Timeline */}
                  <NeumorphicCard className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Timeline Ordini
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-orange-600">
                            <th className="text-left p-3 text-slate-600 font-medium">Periodo</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Ordini</th>
                            <th className="text-right p-3 text-slate-600 font-medium">Spesa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(timeline)
                            .sort((a, b) => b[0].localeCompare(a[0]))
                            .map(([date, data]) => (
                              <tr key={date} className="border-b border-slate-200">
                                <td className="p-3 font-medium text-slate-800">{date}</td>
                                <td className="p-3 text-right text-slate-700">{data.ordini}</td>
                                <td className="p-3 text-right font-bold text-orange-600">€{data.totale.toFixed(2)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </NeumorphicCard>
                </>
              );
            })()}
          </div>
        )}

        {/* Ordini Completati Tab */}
        {activeTab === 'completati' && (
          <div className="space-y-4">
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Ordini Arrivati ({ordiniCompletati.length})</h2>
              {ordiniCompletati.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nessun ordine completato</p>
              ) : (
                <div className="space-y-3">
                  {ordiniCompletati
                    .filter(o => selectedStore === 'all' || o.store_id === selectedStore)
                    .map(ordine => (
                      <div key={ordine.id} className="neumorphic-pressed p-4 rounded-xl border-2 border-green-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-slate-800">{ordine.store_name}</h3>
                            <p className="text-sm text-slate-500">{ordine.fornitore}</p>
                            <p className="text-xs text-slate-400">
                              Completato: {format(parseISO(ordine.data_completamento), 'dd/MM/yyyy HH:mm', { locale: it })}
                            </p>
                            <p className="text-xs text-slate-400">Da: {ordine.completato_da}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">€{ordine.totale_ordine.toFixed(2)}</p>
                            <p className="text-xs text-slate-500">{ordine.prodotti.length} prodotti</p>
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
                              {ordine.prodotti.map((prod, idx) => (
                                <tr key={idx} className="border-b border-slate-200">
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
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {ordine.note && (
                          <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
                            <p className="text-xs text-slate-600"><strong>Note:</strong> {ordine.note}</p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </NeumorphicCard>
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
                <div className="neumorphic-flat p-4 rounded-xl">
                  <p className="text-sm text-slate-600"><strong>Fornitore:</strong> {editingOrder.fornitore}</p>
                  <p className="text-sm text-slate-600"><strong>Totale:</strong> €{editingOrder.totale_ordine.toFixed(2)}</p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 mb-2">Prodotti Ordinati</h3>
                  <div className="space-y-2">
                    {editingOrder.prodotti.map((prod, idx) => (
                      <div key={idx} className="neumorphic-pressed p-3 rounded-xl grid grid-cols-3 gap-2 items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{prod.nome_prodotto}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Quantità</label>
                          <input
                            type="number"
                            value={prod.quantita_ordinata}
                            onChange={(e) => {
                              const newProdotti = [...editingOrder.prodotti];
                              newProdotti[idx].quantita_ordinata = parseFloat(e.target.value) || 0;
                              const newTotale = newProdotti.reduce((sum, p) => sum + (p.prezzo_unitario * p.quantita_ordinata), 0);
                              setEditingOrder({ ...editingOrder, prodotti: newProdotti, totale_ordine: newTotale });
                            }}
                            className="w-full neumorphic-pressed px-2 py-1 rounded-lg text-sm text-slate-700 outline-none"
                          />
                          <p className="text-xs text-slate-500">{prod.unita_misura}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">€{prod.prezzo_unitario.toFixed(2)}/u</p>
                          <p className="text-sm font-bold text-blue-600">
                            €{(prod.prezzo_unitario * prod.quantita_ordinata).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
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

        {/* Email Customization Modal */}
        {customizingEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Personalizza Email Ordine</h2>
                <button onClick={() => setCustomizingEmail(null)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
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
                    Invia Email
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