import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Package, TrendingUp, TrendingDown, Filter, Calendar, X, AlertTriangle, CheckCircle } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, isAfter, isBefore } from 'date-fns';

export default function Inventory() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: inventoryRecords = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.list('-data', 1000),
  });

  // Product categories
  const productCategories = {
    ingredienti: {
      label: 'Ingredienti Base',
      products: ['farina_semola_sacchi', 'farina_verde', 'lievito_pacchi', 'sugo_latte', 'mozzarella_confezioni', 'sale_pacchi_1kg']
    },
    condimenti: {
      label: 'Condimenti',
      products: ['origano_barattoli', 'capperi_barattoli', 'alici_barattoli', 'olive_barattoli', 'stracciatella_250g', 'nduja_barattoli', 'pistacchio_barattoli', 'nutella_barattoli']
    },
    verdure: {
      label: 'Verdure e Salse',
      products: ['patate_grammi', 'crema_gorgonzola_grammi', 'salsiccia_grammi', 'crema_pecorino_grammi', 'friarielli_barattoli', 'cipolle_barattoli', 'radicchio_barattoli', 'pomodorini_barattoli']
    },
    latticini: {
      label: 'Latticini',
      products: ['mascarpone_500g', 'besciamella_500g', 'sugo_linea_grammi', 'mozzarella_linea_grammi']
    },
    dolci: {
      label: 'Dolci',
      products: ['pesca_gianduia', 'pabassinos_anice', 'pabassinos_noci']
    },
    bevande: {
      label: 'Bevande',
      products: ['coca_cola', 'coca_cola_zero', 'acqua_naturale_50cl', 'acqua_frizzante_50cl', 'fanta', 'the_limone', 'ichnusa_classica', 'ichnusa_non_filtrata']
    },
    pulizia: {
      label: 'Pulizia',
      products: ['detersivo_piatti', 'buste_spazzatura_gialle', 'buste_spazzatura_umido', 'rotoli_scottex']
    }
  };

  // Product labels
  const productLabels = {
    farina_semola_sacchi: 'Farina Semola',
    farina_verde: 'Farina Verde',
    lievito_pacchi: 'Lievito',
    sugo_latte: 'Sugo',
    mozzarella_confezioni: 'Mozzarella',
    sale_pacchi_1kg: 'Sale',
    origano_barattoli: 'Origano',
    capperi_barattoli: 'Capperi',
    alici_barattoli: 'Alici',
    olive_barattoli: 'Olive',
    stracciatella_250g: 'Stracciatella',
    nduja_barattoli: 'Nduja',
    pistacchio_barattoli: 'Pistacchio',
    nutella_barattoli: 'Nutella',
    patate_grammi: 'Patate',
    crema_gorgonzola_grammi: 'Crema Gorgonzola',
    salsiccia_grammi: 'Salsiccia',
    crema_pecorino_grammi: 'Crema Pecorino',
    friarielli_barattoli: 'Friarielli',
    cipolle_barattoli: 'Cipolle',
    radicchio_barattoli: 'Radicchio',
    pomodorini_barattoli: 'Pomodorini',
    mascarpone_500g: 'Mascarpone',
    besciamella_500g: 'Besciamella',
    sugo_linea_grammi: 'Sugo Linea',
    mozzarella_linea_grammi: 'Mozzarella Linea',
    pesca_gianduia: 'Pesca Gianduia',
    pabassinos_anice: 'Pabassinos Anice',
    pabassinos_noci: 'Pabassinos Noci',
    detersivo_piatti: 'Detersivo',
    buste_spazzatura_gialle: 'Buste Gialle',
    buste_spazzatura_umido: 'Buste Umido',
    rotoli_scottex: 'Scottex',
    coca_cola: 'Coca Cola',
    coca_cola_zero: 'Coca Zero',
    acqua_naturale_50cl: 'Acqua Naturale',
    acqua_frizzante_50cl: 'Acqua Frizzante',
    fanta: 'Fanta',
    the_limone: 'Thè Limone',
    ichnusa_classica: 'Ichnusa Classica',
    ichnusa_non_filtrata: 'Ichnusa Non Filtrata'
  };

  // Filter data
  const filteredRecords = useMemo(() => {
    return inventoryRecords.filter(record => {
      // Store filter
      if (selectedStore !== 'all' && record.store_id !== selectedStore) return false;

      // Date filter
      if (startDate || endDate) {
        if (!record.data) return false;
        const recordDate = parseISO(record.data);
        const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
        const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

        if (start && end) {
          return !isBefore(recordDate, start) && !isAfter(recordDate, end);
        } else if (start) {
          return !isBefore(recordDate, start);
        } else if (end) {
          return !isAfter(recordDate, end);
        }
      }

      return true;
    });
  }, [inventoryRecords, selectedStore, startDate, endDate]);

  // Get products to display based on category
  const displayProducts = useMemo(() => {
    if (selectedCategory === 'all') {
      return Object.values(productCategories).flatMap(cat => cat.products);
    }
    return productCategories[selectedCategory]?.products || [];
  }, [selectedCategory]);

  // Calculate trends
  const productTrends = useMemo(() => {
    const trends = {};
    
    displayProducts.forEach(product => {
      const recordsWithProduct = filteredRecords
        .filter(r => r[product] !== null && r[product] !== undefined)
        .sort((a, b) => new Date(a.data) - new Date(b.data));

      if (recordsWithProduct.length > 0) {
        const latest = recordsWithProduct[recordsWithProduct.length - 1];
        const previous = recordsWithProduct.length > 1 ? recordsWithProduct[recordsWithProduct.length - 2] : null;
        
        const latestValue = latest[product] || 0;
        const previousValue = previous ? (previous[product] || 0) : latestValue;
        
        const change = latestValue - previousValue;
        const percentChange = previousValue !== 0 ? ((change / previousValue) * 100) : 0;

        // Calculate average
        const avg = recordsWithProduct.reduce((sum, r) => sum + (r[product] || 0), 0) / recordsWithProduct.length;

        // Determine status
        let status = 'normal';
        if (latestValue < avg * 0.3) status = 'critical';
        else if (latestValue < avg * 0.5) status = 'warning';
        else if (latestValue > avg * 1.5) status = 'high';

        trends[product] = {
          current: latestValue,
          previous: previousValue,
          change,
          percentChange,
          average: avg,
          status,
          recordCount: recordsWithProduct.length,
          history: recordsWithProduct.map(r => ({
            date: format(parseISO(r.data), 'dd/MM'),
            value: r[product] || 0
          }))
        };
      }
    });

    return trends;
  }, [filteredRecords, displayProducts]);

  // Calculate store comparison
  const storeComparison = useMemo(() => {
    const comparison = {};
    
    stores.forEach(store => {
      const storeRecords = filteredRecords.filter(r => r.store_id === store.id);
      if (storeRecords.length === 0) return;

      const latestRecord = storeRecords.sort((a, b) => new Date(b.data) - new Date(a.data))[0];
      
      displayProducts.forEach(product => {
        if (!comparison[product]) comparison[product] = [];
        comparison[product].push({
          store: store.name,
          value: latestRecord[product] || 0
        });
      });
    });

    return comparison;
  }, [filteredRecords, stores, displayProducts]);

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'high': return 'text-blue-600';
      default: return 'text-green-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const COLORS = ['#8b7355', '#a68a6a', '#c1a07f', '#dcb794'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Dashboard Inventario</h1>
        <p className="text-[#9b9b9b]">Monitora le giacenze e i trend dei prodotti</p>
      </div>

      {/* Filters */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Filtri</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Locale</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="all">Tutti i Locali</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="all">Tutte le Categorie</option>
              {Object.entries(productCategories).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Inizio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Fine
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              />
              {(startDate || endDate) && (
                <button
                  onClick={clearCustomDates}
                  className="neumorphic-flat px-3 rounded-xl text-[#9b9b9b] hover:text-red-600 transition-colors"
                  title="Cancella date"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{filteredRecords.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Rilevazioni Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">
            {Object.values(productTrends).filter(t => t.status === 'critical').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Prodotti in Esaurimento</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-3xl font-bold text-yellow-600 mb-1">
            {Object.values(productTrends).filter(t => t.status === 'warning').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Prodotti Attenzione</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            {Object.values(productTrends).filter(t => t.status === 'normal' || t.status === 'high').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Prodotti OK</p>
        </NeumorphicCard>
      </div>

      {/* Product Status Grid */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">
          Stato Prodotti - {selectedCategory === 'all' ? 'Tutti' : productCategories[selectedCategory]?.label}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayProducts.map(product => {
            const trend = productTrends[product];
            if (!trend) return null;

            return (
              <div key={product} className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-[#6b6b6b]">{productLabels[product]}</h3>
                    <p className="text-xs text-[#9b9b9b]">{trend.recordCount} rilevazioni</p>
                  </div>
                  {getStatusIcon(trend.status)}
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-[#9b9b9b]">Quantità Attuale</p>
                    <p className={`text-2xl font-bold ${getStatusColor(trend.status)}`}>
                      {trend.current.toFixed(0)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9b9b9b]">vs Precedente:</span>
                    <div className="flex items-center gap-1">
                      {trend.change > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : trend.change < 0 ? (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      ) : null}
                      <span className={trend.change > 0 ? 'text-green-600' : trend.change < 0 ? 'text-red-600' : 'text-[#6b6b6b]'}>
                        {trend.change > 0 ? '+' : ''}{trend.change.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  <div className="neumorphic-pressed p-2 rounded-lg">
                    <p className="text-xs text-[#9b9b9b] mb-1">Media: {trend.average.toFixed(0)}</p>
                    <div className="h-1 neumorphic-pressed rounded-full overflow-hidden">
                      <div
                        className={`h-full ${trend.status === 'critical' ? 'bg-red-600' : trend.status === 'warning' ? 'bg-yellow-600' : 'bg-green-600'}`}
                        style={{ width: `${Math.min((trend.current / trend.average) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </NeumorphicCard>

      {/* Trend Charts - Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayProducts.slice(0, 4).map(product => {
          const trend = productTrends[product];
          if (!trend || trend.history.length < 2) return null;

          return (
            <NeumorphicCard key={product} className="p-6">
              <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">
                Trend {productLabels[product]}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trend.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
                  <XAxis dataKey="date" stroke="#9b9b9b" />
                  <YAxis stroke="#9b9b9b" />
                  <Tooltip
                    contentStyle={{
                      background: '#e0e5ec',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8b7355"
                    strokeWidth={3}
                    dot={{ fill: '#8b7355', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </NeumorphicCard>
          );
        })}
      </div>

      {/* Store Comparison */}
      {selectedStore === 'all' && stores.length > 1 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Confronto tra Locali</h2>
          <div className="space-y-6">
            {displayProducts.slice(0, 6).map(product => {
              const comparison = storeComparison[product];
              if (!comparison || comparison.length === 0) return null;

              return (
                <div key={product}>
                  <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">{productLabels[product]}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={comparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
                      <XAxis dataKey="store" stroke="#9b9b9b" />
                      <YAxis stroke="#9b9b9b" />
                      <Tooltip
                        contentStyle={{
                          background: '#e0e5ec',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                        }}
                      />
                      <Bar dataKey="value" fill="#8b7355" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </NeumorphicCard>
      )}

      {/* Latest Records Table */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Ultime Rilevazioni</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#8b7355]">
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Prodotti Registrati</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.slice(0, 10).map((record, index) => {
                const productsCount = displayProducts.filter(p => record[p] !== null && record[p] !== undefined).length;
                
                return (
                  <tr key={index} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3 text-[#6b6b6b]">
                      {format(parseISO(record.data), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-3 text-[#6b6b6b] font-medium">
                      {record.store_name}
                    </td>
                    <td className="p-3 text-right text-[#6b6b6b]">
                      {productsCount} / {displayProducts.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </NeumorphicCard>
    </div>
  );
}