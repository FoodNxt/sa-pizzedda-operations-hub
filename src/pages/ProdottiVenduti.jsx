import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Store,
  BarChart3,
  Package,
  Search
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function ProdottiVenduti() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrendProduct, setSelectedTrendProduct] = useState(null);
  const [trendView, setTrendView] = useState('chart'); // 'chart' or 'table'
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareMode, setCompareMode] = useState('custom');
  const [compareStartDate, setCompareStartDate] = useState('');
  const [compareEndDate, setCompareEndDate] = useState('');
  const [performersPeriod, setPerformersPeriod] = useState(30);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: prodottiVenduti = [], isLoading } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list('-data_vendita', 10000),
  });

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = prodottiVenduti;

    // Store filter
    if (selectedStore !== 'all') {
      filtered = filtered.filter(p => p.store_id === selectedStore);
    }

    // Date filter
    if (dateRange === 'all') {
      return filtered;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      filtered = filtered.filter(p => {
        const dataStr = p.data_vendita?.split('T')[0] || p.data_vendita;
        return dataStr === todayStr;
      });
    } else if (dateRange === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      filtered = filtered.filter(p => {
        const dataStr = p.data_vendita?.split('T')[0] || p.data_vendita;
        return dataStr >= weekAgoStr;
      });
    } else if (dateRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      filtered = filtered.filter(p => {
        const dataStr = p.data_vendita?.split('T')[0] || p.data_vendita;
        return dataStr >= monthStartStr;
      });
    } else if (dateRange === 'custom' && startDate && endDate) {
      filtered = filtered.filter(p => {
        const dataStr = p.data_vendita?.split('T')[0] || p.data_vendita;
        return dataStr >= startDate && dataStr <= endDate;
      });
    }

    return filtered;
  }, [prodottiVenduti, selectedStore, dateRange, startDate, endDate]);

  // Comparison period data
  const comparisonData = useMemo(() => {
    if (!compareEnabled) return [];

    let compareStart, compareEnd;

    if (compareMode === 'previous') {
      // Calculate current period length
      let currentStart, currentEnd;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateRange === 'custom' && startDate && endDate) {
        currentStart = new Date(startDate);
        currentEnd = new Date(endDate);
      } else if (dateRange === 'month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = today;
      } else if (dateRange === 'week') {
        currentStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        currentEnd = today;
      } else {
        currentStart = today;
        currentEnd = today;
      }

      const daysDiff = Math.ceil((currentEnd - currentStart) / (1000 * 60 * 60 * 24));
      compareEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
      compareStart = new Date(compareEnd.getTime() - daysDiff * 24 * 60 * 60 * 1000);

      compareStart = compareStart.toISOString().split('T')[0];
      compareEnd = compareEnd.toISOString().split('T')[0];
    } else if (compareMode === 'lastmonth') {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      compareStart = lastMonth.toISOString().split('T')[0];
      compareEnd = lastMonthEnd.toISOString().split('T')[0];
    } else if (compareMode === 'lastyear') {
      let currentStart, currentEnd;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateRange === 'custom' && startDate && endDate) {
        currentStart = new Date(startDate);
        currentEnd = new Date(endDate);
      } else if (dateRange === 'month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = today;
      } else if (dateRange === 'week') {
        currentStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        currentEnd = today;
      } else {
        currentStart = today;
        currentEnd = today;
      }

      compareStart = new Date(currentStart.getFullYear() - 1, currentStart.getMonth(), currentStart.getDate()).toISOString().split('T')[0];
      compareEnd = new Date(currentEnd.getFullYear() - 1, currentEnd.getMonth(), currentEnd.getDate()).toISOString().split('T')[0];
    } else if (compareMode === 'custom') {
      if (!compareStartDate || !compareEndDate) return [];
      compareStart = compareStartDate;
      compareEnd = compareEndDate;
    } else {
      return [];
    }

    let filtered = prodottiVenduti;

    if (selectedStore !== 'all') {
      filtered = filtered.filter(p => p.store_id === selectedStore);
    }

    filtered = filtered.filter(p => {
      const dataStr = p.data_vendita?.split('T')[0] || p.data_vendita;
      return dataStr >= compareStart && dataStr <= compareEnd;
    });

    return filtered;
  }, [prodottiVenduti, selectedStore, compareEnabled, compareMode, compareStartDate, compareEndDate, dateRange, startDate, endDate]);

  // Calculate totals by product (aggregate by flavor)
  const productTotals = useMemo(() => {
    const totals = {};
    
    filteredData.forEach(record => {
      const flavor = record.flavor;
      if (!flavor) return;
      
      if (!totals[flavor]) {
        totals[flavor] = {
          name: flavor,
          total: 0,
          category: record.category || 'altro'
        };
      }
      totals[flavor].total += record.total_pizzas_sold || 0;
    });

    return Object.values(totals)
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Comparison period totals
  const comparisonTotals = useMemo(() => {
    if (!compareEnabled || comparisonData.length === 0) return {};
    
    const totals = {};
    
    comparisonData.forEach(record => {
      const flavor = record.flavor;
      if (!flavor) return;
      
      if (!totals[flavor]) {
        totals[flavor] = {
          name: flavor,
          total: 0,
          category: record.category || 'altro'
        };
      }
      totals[flavor].total += record.total_pizzas_sold || 0;
    });

    return totals;
  }, [comparisonData, compareEnabled]);

  // Category aggregations
  const categoryTotals = useMemo(() => {
    const totals = {};
    
    productTotals.forEach(product => {
      const cat = product.category || 'altro';
      if (!totals[cat]) {
        totals[cat] = { category: cat, total: 0, products: [] };
      }
      totals[cat].total += product.total;
      totals[cat].products.push(product.name);
    });

    return Object.values(totals).sort((a, b) => b.total - a.total);
  }, [productTotals]);

  // Comparison category totals
  const comparisonCategoryTotals = useMemo(() => {
    if (!compareEnabled) return {};
    
    const totals = {};
    
    Object.values(comparisonTotals).forEach(product => {
      const cat = product.category || 'altro';
      if (!totals[cat]) {
        totals[cat] = 0;
      }
      totals[cat] += product.total;
    });

    return totals;
  }, [comparisonTotals, compareEnabled]);

  // Top 10 products
  const top10Products = productTotals.slice(0, 10);

  // Daily trend for selected or top product
  const dailyTrend = useMemo(() => {
    if (productTotals.length === 0) return [];

    const productName = selectedTrendProduct || (top10Products.length > 0 ? top10Products[0].name : null);
    if (!productName) return [];

    const dailyData = {};

    filteredData.forEach(record => {
      if (record.flavor !== productName) return;
      
      const date = record.data_vendita;
      if (!dailyData[date]) {
        dailyData[date] = 0;
      }
      dailyData[date] += record.total_pizzas_sold || 0;
    });

    return Object.entries(dailyData)
      .map(([date, quantity]) => ({ date, quantity }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData, productTotals, selectedTrendProduct, top10Products]);

  // Search filtered products
  const searchFilteredProducts = useMemo(() => {
    if (!searchTerm) return productTotals;
    
    return productTotals.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productTotals, searchTerm]);

  // Get unique categories
  const availableCategories = useMemo(() => {
    const cats = new Set(productTotals.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [productTotals]);

  // Filter by selected categories
  const categoryFilteredProducts = useMemo(() => {
    if (selectedCategories.length === 0) return searchFilteredProducts;
    return searchFilteredProducts.filter(p => selectedCategories.includes(p.category));
  }, [searchFilteredProducts, selectedCategories]);

  // Recalculate total for category-filtered products
  const categoryFilteredTotal = categoryFilteredProducts.reduce((sum, p) => sum + p.total, 0);

  // Calculate top and worst performers
  const performers = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Current period
    const currentStart = new Date(today.getTime() - performersPeriod * 24 * 60 * 60 * 1000);
    const currentStartStr = currentStart.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    // Previous period (same length)
    const previousEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
    const previousStart = new Date(previousEnd.getTime() - performersPeriod * 24 * 60 * 60 * 1000);
    const previousStartStr = previousStart.toISOString().split('T')[0];
    const previousEndStr = previousEnd.toISOString().split('T')[0];
    
    // Filter for store
    let dataForStore = prodottiVenduti;
    if (selectedStore !== 'all') {
      dataForStore = dataForStore.filter(p => p.store_id === selectedStore);
    }
    
    // Current period totals
    const currentTotals = {};
    dataForStore
      .filter(p => {
        const dataStr = p.data_vendita?.split('T')[0] || p.data_vendita;
        return dataStr >= currentStartStr && dataStr <= todayStr;
      })
      .forEach(record => {
        const flavor = record.flavor;
        if (!flavor) return;
        if (!currentTotals[flavor]) {
          currentTotals[flavor] = { name: flavor, total: 0, category: record.category || 'altro' };
        }
        currentTotals[flavor].total += record.total_pizzas_sold || 0;
      });
    
    // Previous period totals
    const previousTotals = {};
    dataForStore
      .filter(p => {
        const dataStr = p.data_vendita?.split('T')[0] || p.data_vendita;
        return dataStr >= previousStartStr && dataStr <= previousEndStr;
      })
      .forEach(record => {
        const flavor = record.flavor;
        if (!flavor) return;
        if (!previousTotals[flavor]) {
          previousTotals[flavor] = { name: flavor, total: 0 };
        }
        previousTotals[flavor].total += record.total_pizzas_sold || 0;
      });
    
    // Calculate deltas
    const deltas = [];
    Object.keys(currentTotals).forEach(flavor => {
      const current = currentTotals[flavor].total;
      const previous = previousTotals[flavor]?.total || 0;
      const delta = current - previous;
      const percentChange = previous > 0 ? ((delta / previous) * 100) : (current > 0 ? 100 : 0);
      
      deltas.push({
        name: flavor,
        category: currentTotals[flavor].category,
        current,
        previous,
        delta,
        percentChange
      });
    });
    
    // Sort by absolute delta (volume change)
    deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    
    // Top performers (positive growth)
    const topPerformers = deltas
      .filter(d => d.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 10);
    
    // Worst performers (negative growth)
    const worstPerformers = deltas
      .filter(d => d.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 10);
    
    return { topPerformers, worstPerformers };
  }, [prodottiVenduti, performersPeriod, selectedStore]);

  // Calculate stats
  const totalSales = productTotals.reduce((sum, p) => sum + p.total, 0);
  const activeProducts = productTotals.filter(p => p.total > 0).length;
  const avgPerProduct = activeProducts > 0 ? (totalSales / activeProducts).toFixed(1) : 0;

  // Comparison stats
  const comparisonTotalSales = compareEnabled ? Object.values(comparisonTotals).reduce((sum, p) => sum + p.total, 0) : 0;
  const comparisonActiveProducts = compareEnabled ? Object.values(comparisonTotals).filter(p => p.total > 0).length : 0;
  const comparisonAvgPerProduct = compareEnabled && comparisonActiveProducts > 0 ? (comparisonTotalSales / comparisonActiveProducts).toFixed(1) : 0;

  // Deltas
  const deltaSales = compareEnabled ? totalSales - comparisonTotalSales : 0;
  const deltaActiveProducts = compareEnabled ? activeProducts - comparisonActiveProducts : 0;
  const deltaAvg = compareEnabled ? (parseFloat(avgPerProduct) - parseFloat(comparisonAvgPerProduct)).toFixed(1) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingCart className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Prodotti Venduti</h1>
        </div>
        <p className="text-[#9b9b9b]">Analisi vendite per prodotto</p>
      </div>

      {/* Filters */}
      <NeumorphicCard className="p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label className="text-xs text-[#9b9b9b] mb-1 block">Negozio</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="all">Tutti i Negozi</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[#9b9b9b] mb-1 block">Periodo</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="today">Oggi</option>
              <option value="week">Ultima Settimana</option>
              <option value="month">Questo Mese</option>
              <option value="all">Tutto</option>
              <option value="custom">Personalizzato</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <>
              <div>
                <label className="text-xs text-[#9b9b9b] mb-1 block">Da</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[#9b9b9b] mb-1 block">A</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Comparison Toggle */}
        <div className="border-t border-slate-200 pt-4">
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-[#6b6b6b]">Confronta con altro periodo</span>
          </label>

          {compareEnabled && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#9b9b9b] mb-1 block">Tipo Confronto</label>
                <select
                  value={compareMode}
                  onChange={(e) => setCompareMode(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
                >
                  <option value="previous">Periodo Precedente</option>
                  <option value="lastmonth">Mese Precedente</option>
                  <option value="lastyear">Anno Precedente</option>
                  <option value="custom">Personalizzato</option>
                </select>
              </div>

              {compareMode === 'custom' && (
                <div className="flex flex-wrap gap-3">
                  <div>
                    <label className="text-xs text-[#9b9b9b] mb-1 block">Periodo confronto - Da</label>
                    <input
                      type="date"
                      value={compareStartDate}
                      onChange={(e) => setCompareStartDate(e.target.value)}
                      className="neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#9b9b9b] mb-1 block">Periodo confronto - A</label>
                    <input
                      type="date"
                      value={compareEndDate}
                      onChange={(e) => setCompareEndDate(e.target.value)}
                      className="neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </NeumorphicCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{totalSales}</h3>
          <p className="text-sm text-[#9b9b9b]">Vendite Totali</p>
          {compareEnabled && comparisonTotalSales > 0 && (
            <div className="mt-2">
              <div className={`text-sm font-medium ${deltaSales >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {deltaSales >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                {deltaSales >= 0 ? '+' : ''}{deltaSales} ({((deltaSales / comparisonTotalSales) * 100).toFixed(1)}%)
              </div>
              <div className="text-xs text-slate-400">vs {comparisonTotalSales}</div>
            </div>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{activeProducts}</h3>
          <p className="text-sm text-[#9b9b9b]">Prodotti Venduti</p>
          {compareEnabled && comparisonActiveProducts > 0 && (
            <div className="mt-2">
              <div className={`text-sm font-medium ${deltaActiveProducts >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {deltaActiveProducts >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                {deltaActiveProducts >= 0 ? '+' : ''}{deltaActiveProducts}
              </div>
              <div className="text-xs text-slate-400">vs {comparisonActiveProducts}</div>
            </div>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{avgPerProduct}</h3>
          <p className="text-sm text-[#9b9b9b]">Media per Prodotto</p>
          {compareEnabled && comparisonAvgPerProduct > 0 && (
            <div className="mt-2">
              <div className={`text-sm font-medium ${deltaAvg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {deltaAvg >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                {deltaAvg >= 0 ? '+' : ''}{deltaAvg}
              </div>
              <div className="text-xs text-slate-400">vs {comparisonAvgPerProduct}</div>
            </div>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Store className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-3xl font-bold text-purple-600 mb-1">{filteredData.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Record Filtrati</p>
          <p className="text-xs text-slate-400 mt-1">({prodottiVenduti.length} totali caricati)</p>
          {compareEnabled && (
            <div className="mt-2">
              <div className="text-xs text-slate-400">vs {comparisonData.length} record</div>
            </div>
          )}
        </NeumorphicCard>
      </div>

      {/* Top 10 Chart */}
      {top10Products.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">🏆 Top 10 Prodotti</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={top10Products}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e5ec" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={120}
                tick={{ fill: '#6b6b6b', fontSize: 12 }}
              />
              <YAxis tick={{ fill: '#6b6b6b' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#e0e5ec', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                }}
              />
              <Bar dataKey="total" fill="#8b7355" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeumorphicCard>
      )}

      {/* Daily Trend */}
      {productTotals.length > 0 && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              📈 Trend Giornaliero
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={selectedTrendProduct || (top10Products.length > 0 ? top10Products[0].name : '')}
                onChange={(e) => setSelectedTrendProduct(e.target.value)}
                className="neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none text-sm"
              >
                {productTotals.slice(0, 20).map(product => (
                  <option key={product.name} value={product.name}>{product.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setTrendView('chart')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    trendView === 'chart' 
                      ? 'bg-[#8b7355] text-white' 
                      : 'bg-[#e0e5ec] text-[#6b6b6b]'
                  }`}
                >
                  📊 Grafico
                </button>
                <button
                  onClick={() => setTrendView('table')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    trendView === 'table' 
                      ? 'bg-[#8b7355] text-white' 
                      : 'bg-[#e0e5ec] text-[#6b6b6b]'
                  }`}
                >
                  📋 Tabella
                </button>
              </div>
            </div>
          </div>

          {trendView === 'chart' ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e5ec" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b6b6b', fontSize: 12 }}
                />
                <YAxis tick={{ fill: '#6b6b6b' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#e0e5ec', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="quantity" 
                  stroke="#8b7355" 
                  strokeWidth={2}
                  dot={{ fill: '#8b7355', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Quantità</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyTrend.map((item) => (
                    <tr key={item.date} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3 text-[#6b6b6b]">{item.date}</td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-[#8b7355]">{item.quantity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>
      )}

      {/* Category Breakdown */}
      {categoryTotals.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">📊 Vendite per Categoria</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Categoria</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Quantità</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">% del Totale</th>
                  {compareEnabled && comparisonTotalSales > 0 && (
                    <>
                      <th className="text-right p-3 text-[#9b9b9b] font-medium">Periodo Confronto</th>
                      <th className="text-right p-3 text-[#9b9b9b] font-medium">Delta</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {categoryTotals.map((cat) => {
                  const comparisonTotal = compareEnabled ? (comparisonCategoryTotals[cat.category] || 0) : 0;
                  const delta = compareEnabled ? cat.total - comparisonTotal : 0;
                  
                  return (
                    <tr key={cat.category} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-[#6b6b6b] capitalize">{cat.category}</span>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {cat.products.length} prodott{cat.products.length === 1 ? 'o' : 'i'}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-[#8b7355] text-lg">{cat.total}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-[#6b6b6b]">
                          {((cat.total / totalSales) * 100).toFixed(1)}%
                        </span>
                      </td>
                      {compareEnabled && comparisonTotalSales > 0 && (
                        <>
                          <td className="p-3 text-right">
                            <span className="text-slate-500">{comparisonTotal}</span>
                          </td>
                          <td className="p-3 text-right">
                            <div className={`font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {delta >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                              {delta >= 0 ? '+' : ''}{delta}
                              {comparisonTotal > 0 && (
                                <span className="text-xs ml-1">({((delta / comparisonTotal) * 100).toFixed(1)}%)</span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </NeumorphicCard>
      )}

      {/* Search */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-[#9b9b9b]" />
          <input
            type="text"
            placeholder="Cerca prodotto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          />
        </div>
      </NeumorphicCard>

      {/* All Products Table */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-xl font-bold text-[#6b6b6b]">Tutti i Prodotti</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategories([])}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategories.length === 0
                  ? 'bg-[#8b7355] text-white'
                  : 'bg-[#e0e5ec] text-[#6b6b6b]'
              }`}
            >
              Tutte
            </button>
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  if (selectedCategories.includes(cat)) {
                    setSelectedCategories(selectedCategories.filter(c => c !== cat));
                  } else {
                    setSelectedCategories([...selectedCategories, cat]);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategories.includes(cat)
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#e0e5ec] text-[#6b6b6b]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#8b7355]">
                <th className="text-left p-3 text-[#9b9b9b] font-medium">#</th>
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Prodotto</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Quantità</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">% del Totale</th>
              </tr>
            </thead>
            <tbody>
              {categoryFilteredProducts.map((product, index) => {
                const comparisonProduct = compareEnabled ? comparisonTotals[product.name] : null;
                const comparisonTotal = comparisonProduct?.total || 0;
                const delta = compareEnabled ? product.total - comparisonTotal : 0;
                
                return (
                  <tr key={product.name} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3 text-[#9b9b9b]">{index + 1}</td>
                    <td className="p-3">
                      <div>
                        <span className="font-medium text-[#6b6b6b]">{product.name}</span>
                        <span className="ml-2 text-xs text-[#9b9b9b] px-2 py-0.5 rounded-full bg-slate-100">
                          {product.category}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-[#8b7355]">{product.total}</span>
                      {compareEnabled && comparisonTotal > 0 && (
                        <div className={`text-xs font-medium mt-1 ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {delta >= 0 ? '+' : ''}{delta} ({((delta / comparisonTotal) * 100).toFixed(1)}%)
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-[#6b6b6b]">
                        {categoryFilteredTotal > 0 ? ((product.total / categoryFilteredTotal) * 100).toFixed(1) : 0}%
                      </span>
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