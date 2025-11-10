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

// Product display names mapping
const PRODUCT_DISPLAY_NAMES = {
  acqua_frizzante: 'Acqua Frizzante',
  acqua_naturale: 'Acqua Naturale',
  baione_cannonau: 'Baione Cannonau',
  bottarga: 'Bottarga',
  capperi_olive_acciughe: 'Capperi, olive e acciughe',
  cipolle_caramellate_gorgonzola: 'Cipolle caramellate e Gorgonzola',
  coca_cola_33cl: 'Coca Cola 33cl',
  coca_cola_zero_33cl: 'Coca Cola Zero 33cl',
  contissa_vermentino: 'Contissa Vermentino',
  estathe_33cl: 'Estathe 33cl',
  fanta_33cl: 'Fanta 33cl',
  fregola: 'Fregola',
  friarielli_olive: 'Friarielli e Olive',
  gorgonzola_radicchio: 'Gorgonzola e Radicchio',
  guttiau_70gr: 'Guttiau 70gr',
  guttiau_snack: 'Guttiau Snack',
  ichnusa_ambra_limpida: 'Ichnusa Ambra Limpida',
  ichnusa_classica: 'Ichnusa Classica',
  ichnusa_non_filtrata: 'Ichnusa Non Filtrata',
  malloreddus: 'Malloreddus',
  malloreddus_4_sapori: 'Malloreddus 4 sapori',
  margherita: 'Margherita',
  nduja_stracciatella: 'Nduja e stracciatella',
  nutella: 'Nutella',
  pabassinos_anice: 'Pabassinos Anice',
  pabassinos_noci: 'Pabassinos Noci',
  pane_carasau: 'Pane Carasau',
  pesca_gianduia: 'Pesca Gianduia',
  pistacchio: 'Pistacchio',
  pomodori_stracciatella: 'Pomodori e stracciatella',
  salsiccia_patate: 'Salsiccia e Patate',
  salsiccia_sarda_pecorino: 'Salsiccia Sarda e Pecorino'
};

const PRODUCT_FIELDS = Object.keys(PRODUCT_DISPLAY_NAMES);

export default function ProdottiVenduti() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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

  // Calculate totals by product
  const productTotals = useMemo(() => {
    const totals = {};
    
    PRODUCT_FIELDS.forEach(field => {
      totals[field] = filteredData.reduce((sum, record) => sum + (record[field] || 0), 0);
    });

    return Object.entries(totals)
      .map(([field, total]) => ({
        field,
        name: PRODUCT_DISPLAY_NAMES[field],
        total
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Top 10 products
  const top10Products = productTotals.slice(0, 10);

  // Daily trend for top product
  const dailyTrend = useMemo(() => {
    if (top10Products.length === 0) return [];

    const topProductField = top10Products[0].field;
    const dailyData = {};

    filteredData.forEach(record => {
      const date = record.data_vendita;
      if (!dailyData[date]) {
        dailyData[date] = 0;
      }
      dailyData[date] += record[topProductField] || 0;
    });

    return Object.entries(dailyData)
      .map(([date, quantity]) => ({ date, quantity }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData, top10Products]);

  // Search filtered products
  const searchFilteredProducts = useMemo(() => {
    if (!searchTerm) return productTotals;
    
    return productTotals.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productTotals, searchTerm]);

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
      {dailyTrend.length > 0 && top10Products.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">
            📈 Trend Giornaliero - {top10Products[0].name}
          </h2>
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
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Tutti i Prodotti</h2>
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
              {searchFilteredProducts.map((product, index) => (
                <tr key={product.field} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                  <td className="p-3 text-[#9b9b9b]">{index + 1}</td>
                  <td className="p-3">
                    <span className="font-medium text-[#6b6b6b]">{product.name}</span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-bold text-[#8b7355]">{product.total}</span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-[#6b6b6b]">
                      {totalSales > 0 ? ((product.total / totalSales) * 100).toFixed(1) : 0}%
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