import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Package, TrendingUp, TrendingDown, Filter, Calendar, X, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, isAfter, isBefore, subDays } from 'date-fns';

export default function Inventory() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    critical: true,
    warning: true,
    ok: true
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: rilevazioniNegozio = [] } = useQuery({
    queryKey: ['rilevazioni-inventario'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 1000),
  });

  const { data: rilevazioniCantina = [] } = useQuery({
    queryKey: ['rilevazioni-inventario-cantina'],
    queryFn: () => base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione', 1000),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.filter({ attivo: true }),
  });

  const allRilevazioni = useMemo(() => {
    return [...rilevazioniNegozio, ...rilevazioniCantina];
  }, [rilevazioniNegozio, rilevazioniCantina]);

  const filteredRilevazioni = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    if (startDate || endDate) {
      cutoffDate = startDate ? parseISO(startDate + 'T00:00:00') : new Date(0);
      endFilterDate = endDate ? parseISO(endDate + 'T23:59:59') : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }
    
    return allRilevazioni.filter(r => {
      if (r.data_rilevazione) {
        const itemDate = parseISO(r.data_rilevazione);
        if (isBefore(itemDate, cutoffDate) || isAfter(itemDate, endFilterDate)) return false;
      }
      if (selectedStore !== 'all' && r.store_id !== selectedStore) return false;
      return true;
    });
  }, [allRilevazioni, selectedStore, dateRange, startDate, endDate]);

  const productTrends = useMemo(() => {
    const trends = {};
    
    products.forEach(product => {
      if (selectedCategory !== 'all' && product.categoria !== selectedCategory) return;

      const productRilevazioni = filteredRilevazioni
        .filter(r => r.prodotto_id === product.id)
        .sort((a, b) => new Date(a.data_rilevazione) - new Date(b.data_rilevazione));

      if (productRilevazioni.length > 0) {
        const latest = productRilevazioni[productRilevazioni.length - 1];
        const previous = productRilevazioni.length > 1 ? productRilevazioni[productRilevazioni.length - 2] : null;
        
        const latestValue = latest.quantita_rilevata || 0;
        const previousValue = previous ? (previous.quantita_rilevata || 0) : latestValue;
        
        const change = latestValue - previousValue;
        const avg = productRilevazioni.reduce((sum, r) => sum + (r.quantita_rilevata || 0), 0) / productRilevazioni.length;

        let status = 'normal';
        if (latest.sotto_minimo) status = 'critical';
        else if (latestValue < avg * 0.5) status = 'warning';

        trends[product.id] = {
          product,
          current: latestValue,
          previous: previousValue,
          change,
          average: avg,
          status,
          recordCount: productRilevazioni.length,
          history: productRilevazioni.map(r => ({
            date: format(parseISO(r.data_rilevazione), 'dd/MM'),
            value: r.quantita_rilevata || 0
          }))
        };
      }
    });

    return trends;
  }, [filteredRilevazioni, products, selectedCategory]);

  const productsByStatus = useMemo(() => {
    const critical = [];
    const warning = [];
    const ok = [];

    Object.values(productTrends).forEach(trend => {
      if (trend.status === 'critical') {
        critical.push(trend);
      } else if (trend.status === 'warning') {
        warning.push(trend);
      } else {
        ok.push(trend);
      }
    });

    return { critical, warning, ok };
  }, [productTrends]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30');
  };

  return (
    <ProtectedPage pageName="Inventory">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Dashboard Inventario
          </h1>
          <p className="text-sm text-slate-500">Monitora le giacenze e i trend dei prodotti</p>
        </div>

        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Locale</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="all">Tutti i Locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-2 block">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="all">Tutte</option>
                <option value="ingredienti">Ingredienti</option>
                <option value="condimenti">Condimenti</option>
                <option value="verdure">Verdure</option>
                <option value="latticini">Latticini</option>
                <option value="dolci">Dolci</option>
                <option value="bevande">Bevande</option>
                <option value="pulizia">Pulizia</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-2 block">Periodo</label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  if (e.target.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="7">Ultimi 7 giorni</option>
                <option value="30">Ultimi 30 giorni</option>
                <option value="90">Ultimi 90 giorni</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  placeholder="Inizio"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  placeholder="Fine"
                />
              </div>
            )}
          </div>
        </NeumorphicCard>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">{filteredRilevazioni.length}</h3>
              <p className="text-xs text-slate-500">Rilevazioni</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-red-600 mb-1">{productsByStatus.critical.length}</h3>
              <p className="text-xs text-slate-500">Critici</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-yellow-600 mb-1">{productsByStatus.warning.length}</h3>
              <p className="text-xs text-slate-500">Attenzione</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-green-600 mb-1">{productsByStatus.ok.length}</h3>
              <p className="text-xs text-slate-500">OK</p>
            </div>
          </NeumorphicCard>
        </div>

        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            Stato Prodotti
          </h2>

          <div className="space-y-4">
            {/* Prodotti Critici */}
            <div className="neumorphic-flat rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('critical')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-700 text-sm lg:text-base">
                    Critici ({productsByStatus.critical.length})
                  </h3>
                </div>
                {expandedSections.critical ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>

              {expandedSections.critical && (
                <div className="p-4 border-t border-slate-200">
                  {productsByStatus.critical.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {productsByStatus.critical.map(({ product, current, change, average }) => (
                        <div 
                          key={product.id} 
                          className="neumorphic-pressed p-3 lg:p-4 rounded-xl border-2 border-red-200 cursor-pointer hover:border-red-400 transition-all"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-slate-800 text-sm">{product.nome_prodotto}</h3>
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-slate-500">Attuale</p>
                              <p className="text-xl font-bold text-red-600">{current.toFixed(0)}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {change > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : change < 0 ? (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              ) : null}
                              <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-600'}>
                                {change > 0 ? '+' : ''}{change.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-4 text-sm">Nessun prodotto critico 🎉</p>
                  )}
                </div>
              )}
            </div>

            {/* Prodotti Attenzione */}
            <div className="neumorphic-flat rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('warning')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-bold text-yellow-700 text-sm lg:text-base">
                    Attenzione ({productsByStatus.warning.length})
                  </h3>
                </div>
                {expandedSections.warning ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>

              {expandedSections.warning && (
                <div className="p-4 border-t border-slate-200">
                  {productsByStatus.warning.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {productsByStatus.warning.map(({ product, current, change }) => (
                        <div 
                          key={product.id} 
                          className="neumorphic-pressed p-3 lg:p-4 rounded-xl border-2 border-yellow-200 cursor-pointer hover:border-yellow-400 transition-all"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-slate-800 text-sm">{product.nome_prodotto}</h3>
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-slate-500">Attuale</p>
                              <p className="text-xl font-bold text-yellow-600">{current.toFixed(0)}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {change > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : change < 0 ? (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              ) : null}
                              <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-600'}>
                                {change > 0 ? '+' : ''}{change.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-4 text-sm">Nessun prodotto in attenzione</p>
                  )}
                </div>
              )}
            </div>

            {/* Prodotti OK */}
            <div className="neumorphic-flat rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('ok')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-green-700 text-sm lg:text-base">
                    OK ({productsByStatus.ok.length})
                  </h3>
                </div>
                {expandedSections.ok ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>

              {expandedSections.ok && (
                <div className="p-4 border-t border-slate-200">
                  {productsByStatus.ok.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {productsByStatus.ok.map(({ product, current, change }) => (
                        <div 
                          key={product.id} 
                          className="neumorphic-pressed p-3 lg:p-4 rounded-xl border-2 border-green-200 cursor-pointer hover:border-green-400 transition-all"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-slate-800 text-sm">{product.nome_prodotto}</h3>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-slate-500">Attuale</p>
                              <p className="text-xl font-bold text-green-600">{current.toFixed(0)}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {change > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : change < 0 ? (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              ) : null}
                              <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-600'}>
                                {change > 0 ? '+' : ''}{change.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-4 text-sm">Nessun prodotto OK</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </NeumorphicCard>

        {selectedProduct && productTrends[selectedProduct.id] && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
            <NeumorphicCard className="w-full lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
              <div className="flex items-start justify-between mb-4 sticky top-0 bg-gradient-to-br from-slate-50 to-slate-100 pb-4 -mt-4 pt-4 -mx-4 px-4 z-10">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
                  {selectedProduct.nome_prodotto}
                </h2>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="nav-button p-2 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              <div className="neumorphic-flat p-4 lg:p-6 rounded-xl">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={productTrends[selectedProduct.id].history}>
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
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      name="Quantità"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}