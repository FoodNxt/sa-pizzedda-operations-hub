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
  const [foodCostView, setFoodCostView] = useState('reale'); // reale | teorico | confronto
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: iPraticoData = [] } = useQuery({
    queryKey: ['ipratico'],
    queryFn: () => base44.entities.iPratico.list()
  });

  const { data: prodottiVendutiRaw = [] } = useQuery({
    queryKey: ['prodotti-venduti'],
    queryFn: () => base44.entities.ProdottiVenduti.list()
  });

  // Normalize prodotti venduti data
  const prodottiVenduti = useMemo(() => {
    return prodottiVendutiRaw.map(p => ({
      ...p,
      order_date: p.data_vendita,
      product_name: p.flavor,
      quantity: p.total_pizzas_sold || 0
    }));
  }, [prodottiVendutiRaw]);

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list()
  });

  const { data: ordiniFornitori = [] } = useQuery({
    queryKey: ['ordini-fornitori'],
    queryFn: () => base44.entities.OrdineFornitore.list()
  });

  // Calcola food cost per periodo
  const foodCostData = useMemo(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999); // Include full day

    // Filtra iPratico data nel range
    const revenueData = iPraticoData.filter(d => {
      const orderDate = new Date(d.order_date);
      return orderDate >= startDate && orderDate <= endDate &&
        (selectedStore === 'all' || d.store_id === selectedStore);
    });

    // Revenue totale
    const revenueTotale = revenueData.reduce((sum, d) => sum + (d.total_revenue || 0), 0);

    // COSTO REALE: dagli ordini fornitori arrivati
    let costoReale = 0;
    const ordiniArrivati = ordiniFornitori.filter(o => {
      if (o.status !== 'completato') return false;
      if (!o.data_completamento) return false;
      
      const dataArrivo = new Date(o.data_completamento);
      dataArrivo.setHours(0, 0, 0, 0); // Compare dates only
      return dataArrivo >= startDate && dataArrivo <= endDate &&
        (selectedStore === 'all' || o.store_id === selectedStore);
    });

    ordiniArrivati.forEach(ordine => {
      if (ordine.prodotti && Array.isArray(ordine.prodotti)) {
        ordine.prodotti.forEach(prod => {
          const quantita = prod.quantita_ricevuta || prod.quantita_ordinata || 0;
          const prezzo = prod.prezzo_unitario || 0;
          costoReale += quantita * prezzo;
        });
      }
    });

    // COSTO TEORICO: dalle ricette e prodotti venduti
    const prodotti = prodottiVenduti.filter(p => {
      const orderDate = new Date(p.order_date);
      return orderDate >= startDate && orderDate <= endDate &&
        (selectedStore === 'all' || p.store_id === selectedStore);
    });

    let costoTeorico = 0;
    prodotti.forEach(prod => {
      const ricetta = ricette.find(r => r.nome_prodotto === prod.product_name);
      if (ricetta && ricetta.costo_unitario) {
        costoTeorico += ricetta.costo_unitario * (prod.quantity || 0);
      }
    });

    // Food cost percentuali
    const foodCostReale = revenueTotale > 0 ? (costoReale / revenueTotale) * 100 : 0;
    const foodCostTeorico = revenueTotale > 0 ? (costoTeorico / revenueTotale) * 100 : 0;

    return {
      costoReale,
      costoTeorico,
      revenueTotale,
      foodCostReale,
      foodCostTeorico,
      varianza: costoReale - costoTeorico,
      varianzaPerc: costoTeorico > 0 ? ((costoReale - costoTeorico) / costoTeorico) * 100 : 0
    };
  }, [iPraticoData, ordiniFornitori, prodottiVenduti, ricette, dateRange, selectedStore]);

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

      // Costo reale
      const storeOrdini = ordiniFornitori.filter(o => {
        if (o.status !== 'completato' || !o.data_completamento) return false;
        const dataArrivo = new Date(o.data_completamento);
        return dataArrivo >= startDate && dataArrivo <= endDate && o.store_id === store.id;
      });

      let storeCostoReale = 0;
      storeOrdini.forEach(ordine => {
        if (ordine.prodotti && Array.isArray(ordine.prodotti)) {
          ordine.prodotti.forEach(prod => {
            const quantita = prod.quantita_ricevuta || prod.quantita_ordinata || 0;
            const prezzo = prod.prezzo_unitario || 0;
            storeCostoReale += quantita * prezzo;
          });
        }
      });

      // Costo teorico
      const storeProdotti = prodottiVenduti.filter(p => {
        const orderDate = new Date(p.order_date);
        return orderDate >= startDate && orderDate <= endDate && p.store_id === store.id;
      });

      let storeCostoTeorico = 0;
      storeProdotti.forEach(prod => {
        const ricetta = ricette.find(r => r.nome_prodotto === prod.product_name);
        if (ricetta && ricetta.costo_unitario) {
          storeCostoTeorico += ricetta.costo_unitario * (prod.quantity || 0);
        }
      });

      const foodCostReale = storeRevenue > 0 ? (storeCostoReale / storeRevenue) * 100 : 0;
      const foodCostTeorico = storeRevenue > 0 ? (storeCostoTeorico / storeRevenue) * 100 : 0;

      return {
        store: store.name,
        foodCostReale,
        foodCostTeorico,
        costoReale: storeCostoReale,
        costoTeorico: storeCostoTeorico,
        revenue: storeRevenue,
        varianza: storeCostoReale - storeCostoTeorico
      };
    }).filter(d => d.revenue > 0);
  }, [stores, iPraticoData, ordiniFornitori, prodottiVenduti, ricette, dateRange, selectedStore]);

  // Trend giornaliero food cost
  const trendGiornaliero = useMemo(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
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
            weeklyData[weekKey] = { date: weekKey, revenue: 0, costoReale: 0, costoTeorico: 0 };
          }
          weeklyData[weekKey].revenue += d.total_revenue || 0;
        }
      });

      ordiniFornitori.forEach(o => {
        if (o.status !== 'completato' || !o.data_completamento) return;
        const dataArrivo = new Date(o.data_completamento);
        if (dataArrivo >= startDate && dataArrivo <= endDate &&
          (selectedStore === 'all' || o.store_id === selectedStore)) {
          const weekStart = new Date(dataArrivo);
          weekStart.setDate(dataArrivo.getDate() - dataArrivo.getDay());
          const weekKey = format(weekStart, 'yyyy-MM-dd');

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { date: weekKey, revenue: 0, costoReale: 0, costoTeorico: 0 };
          }
          if (o.prodotti && Array.isArray(o.prodotti)) {
            o.prodotti.forEach(prod => {
              const quantita = prod.quantita_ricevuta || prod.quantita_ordinata || 0;
              const prezzo = prod.prezzo_unitario || 0;
              weeklyData[weekKey].costoReale += quantita * prezzo;
            });
          }
        }
      });

      prodottiVenduti.forEach(p => {
        const orderDate = new Date(p.order_date);
        if (orderDate >= startDate && orderDate <= endDate &&
          (selectedStore === 'all' || p.store_id === selectedStore)) {
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay());
          const weekKey = format(weekStart, 'yyyy-MM-dd');

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { date: weekKey, revenue: 0, costoReale: 0, costoTeorico: 0 };
          }
          const ricetta = ricette.find(r => r.nome_prodotto === p.product_name);
          if (ricetta && ricetta.costo_unitario) {
            weeklyData[weekKey].costoTeorico += ricetta.costo_unitario * (p.quantity || 0);
          }
        }
      });

      return Object.values(weeklyData)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(d => ({
          date: format(new Date(d.date), 'dd MMM', { locale: it }),
          foodCostReale: d.revenue > 0 ? (d.costoReale / d.revenue) * 100 : 0,
          foodCostTeorico: d.revenue > 0 ? (d.costoTeorico / d.revenue) * 100 : 0
        }));
    } else {
      // Aggregazione giornaliera
      const dailyData = {};

      iPraticoData.forEach(d => {
        const orderDate = new Date(d.order_date);
        if (orderDate >= startDate && orderDate <= endDate &&
          (selectedStore === 'all' || d.store_id === selectedStore)) {
          const dateKey = d.order_date;
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { date: dateKey, revenue: 0, costoReale: 0, costoTeorico: 0 };
          }
          dailyData[dateKey].revenue += d.total_revenue || 0;
        }
      });

      ordiniFornitori.forEach(o => {
        if (o.status !== 'completato' || !o.data_completamento) return;
        const dataArrivo = new Date(o.data_completamento);
        if (dataArrivo >= startDate && dataArrivo <= endDate &&
          (selectedStore === 'all' || o.store_id === selectedStore)) {
          const dateKey = format(dataArrivo, 'yyyy-MM-dd');
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { date: dateKey, revenue: 0, costoReale: 0, costoTeorico: 0 };
          }
          if (o.prodotti && Array.isArray(o.prodotti)) {
            o.prodotti.forEach(prod => {
              const quantita = prod.quantita_ricevuta || prod.quantita_ordinata || 0;
              const prezzo = prod.prezzo_unitario || 0;
              dailyData[dateKey].costoReale += quantita * prezzo;
            });
          }
        }
      });

      prodottiVenduti.forEach(p => {
        const orderDate = new Date(p.order_date);
        if (orderDate >= startDate && orderDate <= endDate &&
          (selectedStore === 'all' || p.store_id === selectedStore)) {
          const dateKey = p.order_date;
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { date: dateKey, revenue: 0, costoReale: 0, costoTeorico: 0 };
          }
          const ricetta = ricette.find(r => r.nome_prodotto === p.product_name);
          if (ricetta && ricetta.costo_unitario) {
            dailyData[dateKey].costoTeorico += ricetta.costo_unitario * (p.quantity || 0);
          }
        }
      });

      return Object.values(dailyData)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(d => ({
          date: format(new Date(d.date), 'dd MMM', { locale: it }),
          foodCostReale: d.revenue > 0 ? (d.costoReale / d.revenue) * 100 : 0,
          foodCostTeorico: d.revenue > 0 ? (d.costoTeorico / d.revenue) * 100 : 0
        }));
    }
  }, [iPraticoData, ordiniFornitori, prodottiVenduti, ricette, dateRange, selectedStore]);

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
          <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>Food Cost</h1>
          <p className="mt-1" style={{ color: '#000000' }}>Analisi dettagliata del food cost per locale e periodo</p>
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

        {/* View Toggle */}
        <NeumorphicCard className="p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFoodCostView('reale')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                foodCostView === 'reale' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Costo Reale
            </button>
            <button
              onClick={() => setFoodCostView('teorico')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                foodCostView === 'teorico' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Costo Teorico
            </button>
            <button
              onClick={() => setFoodCostView('confronto')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                foodCostView === 'confronto' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Confronto
            </button>
          </div>
        </NeumorphicCard>

        {/* KPI Cards */}
        {foodCostView === 'confronto' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <NeumorphicCard className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Food Cost Reale</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {foodCostData.foodCostReale.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Da ordini fornitori</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Food Cost Teorico</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {foodCostData.foodCostTeorico.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Da ricette</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Varianza €</p>
                  <p className={`text-3xl font-bold ${foodCostData.varianza > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {foodCostData.varianza > 0 ? '+' : ''}{formatEuro(foodCostData.varianza)}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  foodCostData.varianza > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-600'
                }`}>
                  {foodCostData.varianza > 0 ? <TrendingUp className="w-6 h-6 text-white" /> : <TrendingDown className="w-6 h-6 text-white" />}
                </div>
              </div>
              <p className="text-xs text-slate-500">Differenza reale vs teorico</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Varianza %</p>
                  <p className={`text-3xl font-bold ${foodCostData.varianzaPerc > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {foodCostData.varianzaPerc > 0 ? '+' : ''}{foodCostData.varianzaPerc.toFixed(1)}%
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  foodCostData.varianzaPerc > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-600'
                }`}>
                  {foodCostData.varianzaPerc > 0 ? <TrendingUp className="w-6 h-6 text-white" /> : <TrendingDown className="w-6 h-6 text-white" />}
                </div>
              </div>
              <p className="text-xs text-slate-500">% sul teorico</p>
            </NeumorphicCard>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NeumorphicCard className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Food Cost {foodCostView === 'reale' ? 'Reale' : 'Teorico'}</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {(foodCostView === 'reale' ? foodCostData.foodCostReale : foodCostData.foodCostTeorico).toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {(foodCostView === 'reale' ? foodCostData.foodCostReale : foodCostData.foodCostTeorico) <= 30 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-green-600 font-medium">Ottimo controllo</p>
                  </>
                ) : (foodCostView === 'reale' ? foodCostData.foodCostReale : foodCostData.foodCostTeorico) <= 35 ? (
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
                    {formatEuro(foodCostView === 'reale' ? foodCostData.costoReale : foodCostData.costoTeorico)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">{foodCostView === 'reale' ? 'Da ordini fornitori' : 'Da ricette'}</p>
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
        )}

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
                <Legend />
                {(foodCostView === 'reale' || foodCostView === 'confronto') && (
                  <Line 
                    type="monotone" 
                    dataKey="foodCostReale" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    name="Food Cost Reale %"
                    dot={{ fill: '#f59e0b', r: 4 }}
                  />
                )}
                {(foodCostView === 'teorico' || foodCostView === 'confronto') && (
                  <Line 
                    type="monotone" 
                    dataKey="foodCostTeorico" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Food Cost Teorico %"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                )}
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
                  <Legend />
                  {(foodCostView === 'reale' || foodCostView === 'confronto') && (
                    <Bar dataKey="foodCostReale" fill="#f59e0b" name="Reale %" radius={[8, 8, 0, 0]} />
                  )}
                  {(foodCostView === 'teorico' || foodCostView === 'confronto') && (
                    <Bar dataKey="foodCostTeorico" fill="#3b82f6" name="Teorico %" radius={[8, 8, 0, 0]} />
                  )}
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
                    {(foodCostView === 'reale' || foodCostView === 'confronto') && (
                      <>
                        <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Costo Reale</th>
                        <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">FC Reale %</th>
                      </>
                    )}
                    {(foodCostView === 'teorico' || foodCostView === 'confronto') && (
                      <>
                        <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Costo Teorico</th>
                        <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">FC Teorico %</th>
                      </>
                    )}
                    {foodCostView === 'confronto' && (
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Varianza</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {foodCostByStore.map((row, idx) => {
                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{row.store}</td>
                        <td className="py-3 px-4 text-sm text-right text-green-600 font-bold">
                          {formatEuro(row.revenue)}
                        </td>
                        {(foodCostView === 'reale' || foodCostView === 'confronto') && (
                          <>
                            <td className="py-3 px-4 text-sm text-right text-red-600 font-bold">
                              {formatEuro(row.costoReale)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-bold">
                              <span className={`px-2 py-1 rounded-lg ${
                                row.foodCostReale <= 30 ? 'bg-green-100 text-green-700' :
                                row.foodCostReale <= 35 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {row.foodCostReale.toFixed(1)}%
                              </span>
                            </td>
                          </>
                        )}
                        {(foodCostView === 'teorico' || foodCostView === 'confronto') && (
                          <>
                            <td className="py-3 px-4 text-sm text-right text-blue-600 font-bold">
                              {formatEuro(row.costoTeorico)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-bold">
                              <span className={`px-2 py-1 rounded-lg ${
                                row.foodCostTeorico <= 30 ? 'bg-green-100 text-green-700' :
                                row.foodCostTeorico <= 35 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {row.foodCostTeorico.toFixed(1)}%
                              </span>
                            </td>
                          </>
                        )}
                        {foodCostView === 'confronto' && (
                          <td className={`py-3 px-4 text-sm text-right font-bold ${
                            row.varianza > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {row.varianza > 0 ? '+' : ''}{formatEuro(row.varianza)}
                          </td>
                        )}
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