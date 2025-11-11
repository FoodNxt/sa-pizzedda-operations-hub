import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, subDays, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProtectedPage from "../components/ProtectedPage";

export default function Inventory() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['rilevazione-inventario'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 500),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
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
            <p className="text-xs text-slate-500">Minimo</p>
            <p className="text-sm lg:text-base font-bold text-slate-700">{item.quantita_minima} {item.unita_misura}</p>
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

        {criticalProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-slate-800">Prodotti Critici</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {criticalProducts.map(item => (
                <ProductCard key={`${item.store_id}-${item.prodotto_id}`} item={item} status="critical" />
              ))}
            </div>
          </div>
        )}

        {warningProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-bold text-slate-800">Prodotti in Warning</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {warningProducts.map(item => (
                <ProductCard key={`${item.store_id}-${item.prodotto_id}`} item={item} status="warning" />
              ))}
            </div>
          </div>
        )}

        {okProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-slate-800">Prodotti OK</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {okProducts.map(item => (
                <ProductCard key={`${item.store_id}-${item.prodotto_id}`} item={item} status="ok" />
              ))}
            </div>
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
                    <p className="text-sm text-slate-500 mb-2">Quantità Minima</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {selectedProduct.quantita_minima}
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