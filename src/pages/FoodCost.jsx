import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { TrendingUp, TrendingDown, ChefHat, Store as StoreIcon } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { formatEuro } from "../components/utils/formatCurrency";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function FoodCost() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: iPraticoData = [] } = useQuery({
    queryKey: ['ipratico'],
    queryFn: () => base44.entities.iPratico.list()
  });

  const { data: prodottiVenduti = [] } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list()
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list()
  });

  // Calcola food cost per periodo
  const foodCostData = useMemo(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Filtra iPratico data nel range
    const revenueData = iPraticoData.filter(d => {
      const orderDate = new Date(d.order_date);
      return orderDate >= startDate && orderDate <= endDate &&
        (selectedStore === 'all' || d.store_id === selectedStore);
    });

    // Filtra prodotti venduti nel range
    const prodotti = prodottiVenduti.filter(p => {
      const orderDate = new Date(p.order_date);
      return orderDate >= startDate && orderDate <= endDate &&
        (selectedStore === 'all' || p.store_id === selectedStore);
    });

    // Calcola costo totale dei prodotti venduti
    let costoTotale = 0;
    prodotti.forEach(prod => {
      const ricetta = ricette.find(r => r.nome_prodotto === prod.product_name);
      if (ricetta && ricetta.costo_unitario) {
        costoTotale += ricetta.costo_unitario * (prod.quantity || 0);
      }
    });

    // Revenue totale
    const revenueTotale = revenueData.reduce((sum, d) => sum + (d.total_revenue || 0), 0);

    // Food cost percentuale
    const foodCostPercentuale = revenueTotale > 0 ? (costoTotale / revenueTotale) * 100 : 0;

    return {
      costoTotale,
      revenueTotale,
      foodCostPercentuale
    };
  }, [iPraticoData, prodottiVenduti, ricette, dateRange, selectedStore]);

  // Food cost per store
  const foodCostByStore = useMemo(() => {
    if (selectedStore !== 'all') return [];

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    return stores.map(store => {
      const storeRevenue = iPraticoData.filter(d => {
        const orderDate = new Date(d.order_date);
        return orderDate >= startDate && orderDate <= endDate && d.store_id === store.id;
      }).reduce((sum, d) => sum + (d.total_revenue || 0), 0);

      const storeProdotti = prodottiVenduti.filter(p => {
        const orderDate = new Date(p.order_date);
        return orderDate >= startDate && orderDate <= endDate && p.store_id === store.id;
      });

      let storeCosto = 0;
      storeProdotti.forEach(prod => {
        const ricetta = ricette.find(r => r.nome_prodotto === prod.product_name);
        if (ricetta && ricetta.costo_unitario) {
          storeCosto += ricetta.costo_unitario * (prod.quantity || 0);
        }
      });

      const foodCostPerc = storeRevenue > 0 ? (storeCosto / storeRevenue) * 100 : 0;

      return {
        store: store.name,
        foodCost: foodCostPerc,
        costo: storeCosto,
        revenue: storeRevenue
      };
    }).filter(d => d.revenue > 0);
  }, [stores, iPraticoData, prodottiVenduti, ricette, dateRange, selectedStore]);

  // Trend giornaliero food cost
  const trendGiornaliero = useMemo(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    if (daysDiff > 90) {
      // Aggregazione settimanale se > 90 giorni
      const weeklyData = {};
      
      iPraticoData.forEach(d => {
        const orderDate = new Date(d.order_date);
        if (orderDate >= startDate && orderDate <= endDate &&
          (selectedStore === 'all' || d.store_id === selectedStore)) {
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay());
          const weekKey = format(weekStart, 'yyyy-MM-dd');

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { date: weekKey, revenue: 0, costo: 0 };
          }
          weeklyData[weekKey].revenue += d.total_revenue || 0;
        }
      });

      prodottiVenduti.forEach(p => {
        const orderDate = new Date(p.order_date);
        if (orderDate >= startDate && orderDate <= endDate &&
          (selectedStore === 'all' || p.store_id === selectedStore)) {
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay());
          const weekKey = format(weekStart, 'yyyy-MM-dd');

          if (weeklyData[weekKey]) {
            const ricetta = ricette.find(r => r.nome_prodotto === p.product_name);
            if (ricetta && ricetta.costo_unitario) {
              weeklyData[weekKey].costo += ricetta.costo_unitario * (p.quantity || 0);
            }
          }
        }
      });

      return Object.values(weeklyData)
        .map(d => ({
          date: format(new Date(d.date), 'dd MMM', { locale: it }),
          foodCost: d.revenue > 0 ? (d.costo / d.revenue) * 100 : 0
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
      // Aggregazione giornaliera
      const dailyData = {};

      iPraticoData.forEach(d => {
        const orderDate = new Date(d.order_date);
        if (orderDate >= startDate && orderDate <= endDate &&
          (selectedStore === 'all' || d.store_id === selectedStore)) {
          const dateKey = d.order_date;
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { date: dateKey, revenue: 0, costo: 0 };
          }
          dailyData[dateKey].revenue += d.total_revenue || 0;
        }
      });

      prodottiVenduti.forEach(p => {
        const orderDate = new Date(p.order_date);
        if (orderDate >= startDate && orderDate <= endDate &&
          (selectedStore === 'all' || p.store_id === selectedStore)) {
          const dateKey = p.order_date;
          if (dailyData[dateKey]) {
            const ricetta = ricette.find(r => r.nome_prodotto === p.product_name);
            if (ricetta && ricetta.costo_unitario) {
              dailyData[dateKey].costo += ricetta.costo_unitario * (p.quantity || 0);
            }
          }
        }
      });

      return Object.values(dailyData)
        .map(d => ({
          date: format(new Date(d.date), 'dd MMM', { locale: it }),
          foodCost: d.revenue > 0 ? (d.costo / d.revenue) * 100 : 0
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  }, [iPraticoData, prodottiVenduti, ricette, dateRange, selectedStore]);

  // Quick date range buttons
  const setQuickRange = (days) => {
    const end = new Date();
    const start = days === 'month' ? startOfMonth(end) : subDays(end, days - 1);
    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  return (
    <ProtectedPage pageName="FoodCost">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-slate-50 mb-6">
          <h1 className="text-3xl font-bold text-slate-50">Food Cost</h1>
          <p className="text-slate-50 mt-1">Analisi dettagliata del food cost per locale e periodo</p>
        </div>

        {/* Filtri */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Locale</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
              >
                <option value="all">Tutti i Locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Inizio</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Fine</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quick Select</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setQuickRange(7)}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium"
                >
                  7gg
                </button>
                <button
                  onClick={() => setQuickRange(30)}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium"
                >
                  30gg
                </button>
                <button
                  onClick={() => setQuickRange('month')}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium"
                >
                  Mese
                </button>
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NeumorphicCard className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-slate-500 mb-1">Food Cost Medio</p>
                <p className="text-3xl font-bold text-slate-800">
                  {foodCostData.foodCostPercentuale.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {foodCostData.foodCostPercentuale <= 30 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-green-600 font-medium">Ottimo controllo</p>
                </>
              ) : foodCostData.foodCostPercentuale <= 35 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-yellow-600" />
                  <p className="text-xs text-yellow-600 font-medium">Nella media</p>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  <p className="text-xs text-red-600 font-medium">Sopra target</p>
                </>
              )}
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-slate-500 mb-1">Costo Ingredienti</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatEuro(foodCostData.costoTotale)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Costo totale materie prime</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-slate-500 mb-1">Revenue Totale</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatEuro(foodCostData.revenueTotale)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Revenue nel periodo selezionato</p>
          </NeumorphicCard>
        </div>

        {/* Trend nel tempo */}
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Andamento Food Cost</h3>
          {trendGiornaliero.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendGiornaliero}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(val) => `${val.toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                  formatter={(value) => `${value.toFixed(2)}%`}
                />
                <Line 
                  type="monotone" 
                  dataKey="foodCost" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  name="Food Cost %"
                  dot={{ fill: '#f59e0b', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-500">
              Nessun dato disponibile per il periodo selezionato
            </div>
          )}
        </NeumorphicCard>

        {/* Comparazione tra locali */}
        {selectedStore === 'all' && foodCostByStore.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NeumorphicCard className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Food Cost per Locale</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={foodCostByStore}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="store" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                    formatter={(value) => `${value.toFixed(2)}%`}
                  />
                  <Bar dataKey="foodCost" fill="#f59e0b" name="Food Cost %" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuzione Revenue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={foodCostByStore}
                    dataKey="revenue"
                    nameKey="store"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.store} (${((entry.revenue / foodCostData.revenueTotale) * 100).toFixed(1)}%)`}
                  >
                    {foodCostByStore.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                    formatter={(value) => formatEuro(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </NeumorphicCard>
          </div>
        )}

        {/* Tabella dettagli per locale */}
        {selectedStore === 'all' && foodCostByStore.length > 0 && (
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Dettaglio per Locale</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Locale</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Costo Ingredienti</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Food Cost %</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Margine</th>
                  </tr>
                </thead>
                <tbody>
                  {foodCostByStore.map((row, idx) => {
                    const margine = row.revenue - row.costo;
                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{row.store}</td>
                        <td className="py-3 px-4 text-sm text-right text-green-600 font-bold">
                          {formatEuro(row.revenue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-red-600 font-bold">
                          {formatEuro(row.costo)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-bold">
                          <span className={`px-2 py-1 rounded-lg ${
                            row.foodCost <= 30 ? 'bg-green-100 text-green-700' :
                            row.foodCost <= 35 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {row.foodCost.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-blue-600 font-bold">
                          {formatEuro(margine)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}