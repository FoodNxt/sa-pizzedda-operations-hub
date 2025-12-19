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

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: prodottiVenduti = [], isLoading } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list('-data_vendita'),
  });

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = prodottiVenduti;

    // Store filter
    if (selectedStore !== 'all') {
      filtered = filtered.filter(p => p.store_id === selectedStore);
    }

    // Date filter
    const now = new Date();
    let startFilterDate = null;

    if (dateRange === 'today') {
      startFilterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === 'week') {
      startFilterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'month') {
      startFilterDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filtered = filtered.filter(p => {
        const date = new Date(p.data_vendita);
        return date >= start && date <= end;
      });
      return filtered;
    }

    if (startFilterDate) {
      filtered = filtered.filter(p => new Date(p.data_vendita) >= startFilterDate);
    }

    return filtered;
  }, [prodottiVenduti, selectedStore, dateRange, startDate, endDate]);

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

  // Calculate stats
  const totalSales = productTotals.reduce((sum, p) => sum + p.total, 0);
  const activeProducts = productTotals.filter(p => p.total > 0).length;
  const avgPerProduct = activeProducts > 0 ? (totalSales / activeProducts).toFixed(1) : 0;

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
      <div className="flex flex-wrap gap-3 mb-6">
        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Negozi</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="today">Oggi</option>
            <option value="week">Ultima Settimana</option>
            <option value="month">Questo Mese</option>
            <option value="all">Tutto</option>
            <option value="custom">Personalizzato</option>
          </select>
        </NeumorphicCard>

        {dateRange === 'custom' && (
          <>
            <NeumorphicCard className="px-4 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#9b9b9b]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[#6b6b6b] outline-none text-sm"
              />
            </NeumorphicCard>

            <NeumorphicCard className="px-4 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#9b9b9b]" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[#6b6b6b] outline-none text-sm"
              />
            </NeumorphicCard>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{totalSales}</h3>
          <p className="text-sm text-[#9b9b9b]">Vendite Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{activeProducts}</h3>
          <p className="text-sm text-[#9b9b9b]">Prodotti Venduti</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{avgPerProduct}</h3>
          <p className="text-sm text-[#9b9b9b]">Media per Prodotto</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Store className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-3xl font-bold text-purple-600 mb-1">{filteredData.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Record Totali</p>
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
              {categoryFilteredProducts.map((product, index) => (
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
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-[#6b6b6b]">
                      {categoryFilteredTotal > 0 ? ((product.total / categoryFilteredTotal) * 100).toFixed(1) : 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeumorphicCard>
    </div>
  );
}