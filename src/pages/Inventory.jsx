import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  X,
  ShoppingCart,
  History,
  Building2,
  Truck,
  Mail,
  Loader2,
  Send,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, subDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProtectedPage from "../components/ProtectedPage";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [selectedFormCompletion, setSelectedFormCompletion] = useState(null);
  const [expandedStores, setExpandedStores] = useState({});
  
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RilevazioneInventario.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rilevazione-inventario'] });
      alert('✅ Form inventario eliminato');
    },
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['rilevazione-inventario'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 500),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const { data: fornitori = [] } = useQuery({
    queryKey: ['fornitori'],
    queryFn: () => base44.entities.Fornitore.filter({ attivo: true }),
  });



  const { data: inventoryCantina = [] } = useQuery({
    queryKey: ['rilevazione-inventario-cantina'],
    queryFn: () => base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione', 500),
  });

  // Filter inventory by store
  const filteredInventory = useMemo(() => {
    if (selectedStore === 'all') return inventory;
    return inventory.filter(item => item.store_id === selectedStore);
  }, [inventory, selectedStore]);

  // Get latest reading per product per store
  const latestReadings = useMemo(() => {
    const readings = {};
    
    filteredInventory.forEach(item => {
      const key = `${item.store_id}-${item.prodotto_id}`;
      if (!readings[key] || new Date(item.data_rilevazione) > new Date(readings[key].data_rilevazione)) {
        readings[key] = item;
      }
    });
    
    return Object.values(readings);
  }, [filteredInventory]);

  // Calculate stats
  const stats = useMemo(() => {
    const critical = latestReadings.filter(r => r.sotto_minimo).length;
    const warning = latestReadings.filter(r => {
      const usage = (r.quantita_minima - r.quantita_rilevata) / r.quantita_minima;
      return !r.sotto_minimo && usage > 0.7;
    }).length;
    const ok = latestReadings.length - critical - warning;

    return { critical, warning, ok, total: latestReadings.length };
  }, [latestReadings]);

  // Group by status
  const criticalProducts = latestReadings.filter(r => r.sotto_minimo);
  const warningProducts = latestReadings.filter(r => {
    const usage = (r.quantita_minima - r.quantita_rilevata) / r.quantita_minima;
    return !r.sotto_minimo && usage > 0.7;
  });
  const okProducts = latestReadings.filter(r => {
    const usage = (r.quantita_minima - r.quantita_rilevata) / r.quantita_minima;
    return !r.sotto_minimo && usage <= 0.7;
  });

  // Group products by store
  const productsByStore = useMemo(() => {
    const grouped = {};
    
    latestReadings.forEach(reading => {
      const storeId = reading.store_id;
      const storeName = reading.store_name || stores.find(s => s.id === storeId)?.name || 'N/D';
      
      if (!grouped[storeId]) {
        grouped[storeId] = {
          storeId,
          storeName,
          critical: [],
          warning: [],
          ok: []
        };
      }
      
      if (reading.sotto_minimo) {
        grouped[storeId].critical.push(reading);
      } else {
        const usage = (reading.quantita_minima - reading.quantita_rilevata) / reading.quantita_minima;
        if (usage > 0.7) {
          grouped[storeId].warning.push(reading);
        } else {
          grouped[storeId].ok.push(reading);
        }
      }
    });
    
    return Object.values(grouped).sort((a, b) => a.storeName.localeCompare(b.storeName));
  }, [latestReadings, stores]);

  const toggleStoreExpansion = (storeId) => {
    setExpandedStores(prev => ({
      ...prev,
      [storeId]: !prev[storeId]
    }));
  };

  // Calculate orders needed - products below critical quantity
  const ordersNeeded = useMemo(() => {
    const orders = [];
    
    // Combine negozio and cantina inventory
    const allInventory = [...inventory, ...inventoryCantina];
    
    // Get latest reading per product per store
    const latestByProduct = {};
    allInventory.forEach(item => {
      const key = `${item.store_id}-${item.prodotto_id}`;
      if (!latestByProduct[key] || new Date(item.data_rilevazione) > new Date(latestByProduct[key].data_rilevazione)) {
        latestByProduct[key] = item;
      }
    });
    
    // Check each product against critical levels
    Object.values(latestByProduct).forEach(reading => {
      const product = products.find(p => p.id === reading.prodotto_id);
      if (!product) return;
      
      const store = stores.find(s => s.id === reading.store_id);
      if (!store) return;
      
      // Get store-specific or default quantities
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
  const ordersByStoreAndSupplier = useMemo(() => {
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

  // Get fornitore info by name
  const getFornitoreByName = (name) => {
    return fornitori.find(f => 
      f.ragione_sociale?.toLowerCase() === name?.toLowerCase() ||
      f.ragione_sociale?.toLowerCase().includes(name?.toLowerCase()) ||
      name?.toLowerCase().includes(f.ragione_sociale?.toLowerCase())
    );
  };



  // Get all inventory history for a specific product
  const getFullProductHistory = (productId) => {
    const allInventory = [...inventory, ...inventoryCantina];
    let filtered = allInventory.filter(item => item.prodotto_id === productId);
    
    // Apply store filter if set
    if (selectedStore !== 'all') {
      filtered = filtered.filter(item => item.store_id === selectedStore);
    }
    
    return filtered.sort((a, b) => new Date(b.data_rilevazione) - new Date(a.data_rilevazione));
  };

  // Calculate product trends
  const getProductTrend = (productId, storeId) => {
    const last30Days = subDays(new Date(), 30);
    const productReadings = inventory
      .filter(item => 
        item.prodotto_id === productId && 
        item.store_id === storeId &&
        new Date(item.data_rilevazione) >= last30Days
      )
      .sort((a, b) => new Date(a.data_rilevazione) - new Date(b.data_rilevazione));

    if (productReadings.length < 2) return 'stable';

    const firstReading = productReadings[0];
    const lastReading = productReadings[productReadings.length - 1];

    if (lastReading.quantita_rilevata < firstReading.quantita_rilevata) {
      return 'down';
    } else if (lastReading.quantita_rilevata > firstReading.quantita_rilevata) {
      return 'up';
    }
    return 'stable';
  };

  const getProductHistory = (productId, storeId) => {
    const last30Days = subDays(new Date(), 30);
    return inventory
      .filter(item => 
        item.prodotto_id === productId && 
        item.store_id === storeId &&
        new Date(item.data_rilevazione) >= last30Days
      )
      .sort((a, b) => new Date(a.data_rilevazione) - new Date(b.data_rilevazione))
      .map(item => ({
        date: format(parseISO(item.data_rilevazione), 'dd/MM'),
        quantita: item.quantita_rilevata,
        minimo: item.quantita_minima
      }));
  };

  const ProductCard = ({ item, status }) => {
    const trend = getProductTrend(item.prodotto_id, item.store_id);
    const product = products.find(p => p.id === item.prodotto_id);
    
    return (
      <div
        onClick={() => setSelectedProduct(item)}
        className={`neumorphic-pressed p-4 rounded-xl cursor-pointer hover:shadow-xl transition-all ${
          status === 'critical' ? 'border-2 border-red-300' :
          status === 'warning' ? 'border-2 border-yellow-300' : ''
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 text-sm lg:text-base truncate">{item.nome_prodotto}</h3>
            <p className="text-xs text-slate-500">{item.store_name}</p>
          </div>
          {trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0" />}
          {trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0" />}
          {trend === 'stable' && <Minus className="w-5 h-5 text-slate-400 flex-shrink-0" />}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="neumorphic-flat p-2 rounded-lg">
            <p className="text-xs text-slate-500">Attuale</p>
            <p className={`text-sm lg:text-base font-bold ${
              status === 'critical' ? 'text-red-600' :
              status === 'warning' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {item.quantita_rilevata} {item.unita_misura}
            </p>
          </div>
          <div className="neumorphic-flat p-2 rounded-lg">
            <p className="text-xs text-slate-500">Qtà Critica</p>
            <p className="text-sm lg:text-base font-bold text-slate-700">
              {(() => {
                const quantitaCritica = product?.store_specific_quantita_critica?.[item.store_id] || product?.quantita_critica || item.quantita_minima;
                return `${quantitaCritica} ${item.unita_misura}`;
              })()}
            </p>
          </div>
        </div>

        {product?.fornitore && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Package className="w-3 h-3" />
            <span className="truncate">{product.fornitore}</span>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            {format(parseISO(item.data_rilevazione), "dd/MM/yyyy HH:mm")}
          </p>
        </div>
      </div>
    );
  };

  // Open order editor
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

  // Save order as sent
  const saveOrderAsSent = async () => {
    if (!editingOrder) return;

    const orderData = {
      ...editingOrder,
      status: 'inviato',
      data_invio: new Date().toISOString()
    };

    await createOrderMutation.mutateAsync(orderData);
  };

  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: Package },
    { id: 'history', label: 'Storico', icon: History }
  ];

  return (
    <ProtectedPage pageName="Inventory">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
                Analisi Inventario
              </h1>
              <p className="text-sm text-slate-500">Monitora lo stato delle scorte in tempo reale</p>
            </div>
          </div>
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
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-500" />
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <NeumorphicCard className="p-4">
                <div className="text-center">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-red-600 mb-1">{stats.critical}</h3>
                  <p className="text-xs text-slate-500">Critici</p>
                </div>
              </NeumorphicCard>

              <NeumorphicCard className="p-4">
                <div className="text-center">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-yellow-600 mb-1">{stats.warning}</h3>
                  <p className="text-xs text-slate-500">Warning</p>
                </div>
              </NeumorphicCard>

              <NeumorphicCard className="p-4">
                <div className="text-center">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-green-600 mb-1">{stats.ok}</h3>
                  <p className="text-xs text-slate-500">OK</p>
                </div>
              </NeumorphicCard>

              <NeumorphicCard className="p-4">
                <div className="text-center">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                    <Package className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-blue-600 mb-1">{stats.total}</h3>
                  <p className="text-xs text-slate-500">Totale</p>
                </div>
              </NeumorphicCard>
            </div>

            {/* Stores sections */}
            <div className="space-y-4">
              {productsByStore.map(storeGroup => {
                const isExpanded = expandedStores[storeGroup.storeId];
                const totalProducts = storeGroup.critical.length + storeGroup.warning.length + storeGroup.ok.length;
                
                return (
                  <NeumorphicCard key={storeGroup.storeId} className="overflow-hidden">
                    {/* Collapsed header */}
                    <button
                      onClick={() => toggleStoreExpansion(storeGroup.storeId)}
                      className="w-full p-4 lg:p-6 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{storeGroup.storeName}</h3>
                            <p className="text-xs text-slate-500">{totalProducts} prodotti</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3">
                            {storeGroup.critical.length > 0 && (
                              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-100">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-bold text-red-700">{storeGroup.critical.length}</span>
                              </div>
                            )}
                            {storeGroup.warning.length > 0 && (
                              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-100">
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-bold text-yellow-700">{storeGroup.warning.length}</span>
                              </div>
                            )}
                            {storeGroup.ok.length > 0 && (
                              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-bold text-green-700">{storeGroup.ok.length}</span>
                              </div>
                            )}
                          </div>
                          
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="p-4 lg:p-6 pt-0 space-y-6">
                        {storeGroup.critical.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                              <h4 className="font-bold text-slate-800">Critici ({storeGroup.critical.length})</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {storeGroup.critical.map(item => (
                                <ProductCard key={`${item.store_id}-${item.prodotto_id}`} item={item} status="critical" />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {storeGroup.warning.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-5 h-5 text-yellow-600" />
                              <h4 className="font-bold text-slate-800">Warning ({storeGroup.warning.length})</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {storeGroup.warning.map(item => (
                                <ProductCard key={`${item.store_id}-${item.prodotto_id}`} item={item} status="warning" />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {storeGroup.ok.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <h4 className="font-bold text-slate-800">OK ({storeGroup.ok.length})</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {storeGroup.ok.map(item => (
                                <ProductCard key={`${item.store_id}-${item.prodotto_id}`} item={item} status="ok" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </NeumorphicCard>
                );
              })}
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Product History */}
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Storico per Prodotto
              </h2>
              
              {/* Product selector for history */}
              <div className="mb-4">
                <select
                  value={historyProduct || ''}
                  onChange={(e) => setHistoryProduct(e.target.value || null)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                >
                  <option value="">Seleziona un prodotto per vedere lo storico...</option>
                  {products.filter(p => p.attivo !== false).map(p => (
                    <option key={p.id} value={p.id}>{p.nome_prodotto} ({p.fornitore || 'N/D'})</option>
                  ))}
                </select>
              </div>

              {historyProduct && (
                <div className="space-y-4">
                  {/* Chart */}
                  <div className="neumorphic-flat p-4 rounded-xl">
                    <h3 className="font-bold text-slate-800 mb-4">Andamento Quantità</h3>
                    <div className="w-full overflow-x-auto">
                      <div style={{ minWidth: '300px' }}>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={getFullProductHistory(historyProduct).slice(0, 30).reverse().map(item => ({
                            date: format(parseISO(item.data_rilevazione), 'dd/MM', { locale: it }),
                            quantita: item.quantita_rilevata,
                            store: stores.find(s => s.id === item.store_id)?.name || 'N/D'
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                            <Tooltip 
                              contentStyle={{ 
                                background: 'rgba(248, 250, 252, 0.95)', 
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                fontSize: '11px'
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Line 
                              type="monotone" 
                              dataKey="quantita" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              name="Quantità"
                              dot={{ fill: '#3b82f6', r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* History table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="border-b-2 border-blue-600">
                          <th className="text-left p-3 text-slate-600 font-medium text-sm">Data</th>
                          <th className="text-left p-3 text-slate-600 font-medium text-sm">Locale</th>
                          <th className="text-right p-3 text-slate-600 font-medium text-sm">Quantità</th>
                          <th className="text-left p-3 text-slate-600 font-medium text-sm">Rilevato da</th>
                          <th className="text-left p-3 text-slate-600 font-medium text-sm">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFullProductHistory(historyProduct).slice(0, 50).map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-3 text-sm text-slate-700">
                              {format(parseISO(item.data_rilevazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                            </td>
                            <td className="p-3 text-sm text-slate-700">
                              {stores.find(s => s.id === item.store_id)?.name || item.store_name || 'N/D'}
                            </td>
                            <td className="p-3 text-sm text-right font-bold text-blue-600">
                              {item.quantita_rilevata} {item.unita_misura}
                            </td>
                            <td className="p-3 text-sm text-slate-700">
                              {item.rilevato_da || 'N/D'}
                            </td>
                            <td className="p-3 text-sm text-slate-500">
                              {item.note || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!historyProduct && (
                <div className="text-center py-8 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Seleziona un prodotto per visualizzare lo storico</p>
                </div>
              )}
            </NeumorphicCard>

            {/* All Form Completions */}
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Form Inventario Completati
              </h2>
              
              {(() => {
                // Group all inventory by date/user/store to show form completions
                const allInventory = [...inventory, ...inventoryCantina];
                const formCompletions = {};
                
                allInventory.forEach(item => {
                  // Group by date (rounded to minute), store, and user
                  const dateKey = format(parseISO(item.data_rilevazione), 'yyyy-MM-dd HH:mm');
                  const key = `${dateKey}-${item.store_id}-${item.rilevato_da}`;
                  
                  if (!formCompletions[key]) {
                    formCompletions[key] = {
                      data: item.data_rilevazione,
                      store_id: item.store_id,
                      store_name: item.store_name || stores.find(s => s.id === item.store_id)?.name || 'N/D',
                      rilevato_da: item.rilevato_da || 'N/D',
                      prodotti: [],
                      isCantina: inventoryCantina.some(c => c.id === item.id)
                    };
                  }
                  formCompletions[key].prodotti.push(item);
                });
                
                const sortedCompletions = Object.values(formCompletions)
                  .sort((a, b) => new Date(b.data) - new Date(a.data))
                  .filter(fc => selectedStore === 'all' || fc.store_id === selectedStore)
                  .slice(0, 50);
                
                if (sortedCompletions.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nessun form inventario completato</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                     {sortedCompletions.map((completion, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedFormCompletion(completion)}
                        className="neumorphic-pressed p-4 rounded-xl hover:shadow-xl transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{completion.store_name}</span>
                              {completion.isCantina && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">Cantina</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              {format(parseISO(completion.data), 'dd/MM/yyyy HH:mm', { locale: it })}
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-700">{completion.rilevato_da}</p>
                              <p className="text-xs text-slate-500">{completion.prodotti.length} prodotti</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Eliminare questo form con ${completion.prodotti.length} prodotti?`)) {
                                  completion.prodotti.forEach(p => deleteMutation.mutate(p.id));
                                }
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {completion.prodotti.slice(0, 5).map((prod, pIdx) => (
                            <span key={pIdx} className="px-2 py-1 rounded-lg text-xs bg-slate-100 text-slate-600">
                              {prod.nome_prodotto}: {prod.quantita_rilevata}
                            </span>
                          ))}
                          {completion.prodotti.length > 5 && (
                            <span className="px-2 py-1 rounded-lg text-xs bg-blue-100 text-blue-700">
                              +{completion.prodotti.length - 5} altri
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </NeumorphicCard>
          </div>
        )}

        {/* History Tab - Continued */}
        {activeTab === 'history-old-remove-this' && (
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
                  <NeumorphicCard key={storeId} className="p-4 lg:p-6">
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
                        
                        // Calcola totale ordine in €
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
                              
                              {!fornitore?.contatto_email && (
                                <span className="text-xs text-orange-600 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Email non configurata
                                </span>
                              )}
                            </div>

                            {/* Totale ordine vs ordine minimo */}
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




        {/* Form Completion Detail Modal */}
        {selectedFormCompletion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
            <NeumorphicCard className="w-full lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Dettaglio Form Inventario</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedFormCompletion.store_name} - {format(parseISO(selectedFormCompletion.data), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFormCompletion(null)}
                  className="neumorphic-flat p-2 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Locale</p>
                      <p className="font-bold text-slate-800">{selectedFormCompletion.store_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Compilato da</p>
                      <p className="font-bold text-slate-800">{selectedFormCompletion.rilevato_da}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Data</p>
                      <p className="font-bold text-slate-800">
                        {format(parseISO(selectedFormCompletion.data), 'dd/MM/yyyy HH:mm', { locale: it })}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Prodotti</p>
                      <p className="font-bold text-slate-800">{selectedFormCompletion.prodotti.length}</p>
                    </div>
                  </div>
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-800 mb-3">Prodotti Inventariati</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-blue-600">
                          <th className="text-left p-3 text-slate-600 font-medium text-sm">Prodotto</th>
                          <th className="text-right p-3 text-slate-600 font-medium text-sm">Quantità</th>
                          <th className="text-right p-3 text-slate-600 font-medium text-sm">Critica / Ordine</th>
                          <th className="text-left p-3 text-slate-600 font-medium text-sm">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFormCompletion.prodotti
                          .sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto))
                          .map((prod, idx) => {
                            const product = products.find(p => p.id === prod.prodotto_id);
                            const quantitaCritica = product?.store_specific_quantita_critica?.[prod.store_id] || product?.quantita_critica || '-';
                            const quantitaOrdine = product?.store_specific_quantita_ordine?.[prod.store_id] || product?.quantita_ordine || '-';
                            
                            return (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-3 text-sm text-slate-700">{prod.nome_prodotto}</td>
                            <td className="p-3 text-sm text-right font-bold text-blue-600">
                              {prod.quantita_rilevata} {prod.unita_misura}
                            </td>
                            <td className="p-3 text-sm text-right text-slate-600">
                              {quantitaCritica} / {quantitaOrdine}
                            </td>
                            <td className="p-3 text-sm text-slate-500">{prod.note || '-'}</td>
                          </tr>
                            );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}

        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
            <NeumorphicCard className="w-full lg:max-w-3xl max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800">{selectedProduct.nome_prodotto}</h2>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="neumorphic-flat p-2 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="neumorphic-pressed p-4 rounded-xl text-center">
                    <p className="text-sm text-slate-500 mb-2">Quantità Attuale</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {selectedProduct.quantita_rilevata}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">{selectedProduct.unita_misura}</p>
                  </div>

                  <div className="neumorphic-pressed p-4 rounded-xl text-center">
                    <p className="text-sm text-slate-500 mb-2">Qtà Critica</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {(() => {
                        const product = products.find(p => p.id === selectedProduct.prodotto_id);
                        const quantitaCritica = product?.store_specific_quantita_critica?.[selectedProduct.store_id] || product?.quantita_critica || selectedProduct.quantita_minima;
                        return quantitaCritica;
                      })()}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">{selectedProduct.unita_misura}</p>
                  </div>
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-800 mb-4">Storico (30 giorni)</h3>
                  <div className="w-full overflow-x-auto">
                    <div style={{ minWidth: '300px' }}>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={getProductHistory(selectedProduct.prodotto_id, selectedProduct.store_id)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis 
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'rgba(248, 250, 252, 0.95)', 
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              fontSize: '11px'
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Line 
                            type="monotone" 
                            dataKey="quantita" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            name="Quantità"
                            dot={{ fill: '#3b82f6', r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="minimo" 
                            stroke="#ef4444" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Minimo"
                            dot={{ fill: '#ef4444', r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <h3 className="font-bold text-slate-800 mb-3">Dettagli</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Locale:</span>
                      <span className="font-medium text-slate-800">{selectedProduct.store_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ultima Rilevazione:</span>
                      <span className="font-medium text-slate-800">
                        {format(parseISO(selectedProduct.data_rilevazione), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rilevato da:</span>
                      <span className="font-medium text-slate-800">{selectedProduct.rilevato_da || 'N/A'}</span>
                    </div>
                    {selectedProduct.note && (
                      <div>
                        <p className="text-slate-500 mb-1">Note:</p>
                        <p className="font-medium text-slate-800">{selectedProduct.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}