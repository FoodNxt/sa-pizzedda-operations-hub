import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Filter, Calendar, X, BarChart3, DollarSign, ShoppingCart, ArrowRight, Plus, Trash2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, isAfter, isBefore, parseISO } from 'date-fns';

export default function ChannelComparison() {
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Multiple combinations
  const [combinations, setCombinations] = useState([
    { id: 1, channel: 'all', app: 'all', store: 'all', color: '#3b82f6', name: 'Comb 1' },
    { id: 2, channel: 'all', app: 'all', store: 'all', color: '#8b5cf6', name: 'Comb 2' }
  ]);

  // Fetch iPratico data
  const { data: iPraticoData = [], isLoading } = useQuery({
    queryKey: ['iPratico'], // Updated queryKey as per outline
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000) // Updated queryFn as per outline
  });

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  // Get unique sales channels and delivery apps
  const { salesChannels, deliveryApps } = useMemo(() => {
    const channels = new Set();
    const apps = new Set();

    iPraticoData.forEach((item) => {
      // Source types as channels, checking if they exist / have values
      if ((item.sourceType_delivery || 0) > 0 || (item.sourceType_delivery_orders || 0) > 0) channels.add('Delivery');
      if ((item.sourceType_takeaway || 0) > 0 || (item.sourceType_takeaway_orders || 0) > 0) channels.add('Takeaway');
      if ((item.sourceType_store || 0) > 0 || (item.sourceType_store_orders || 0) > 0) channels.add('Store');

      // Source apps, checking if they exist / have values
      if ((item.sourceApp_glovo || 0) > 0 || (item.sourceApp_glovo_orders || 0) > 0) apps.add('Glovo');
      if ((item.sourceApp_deliveroo || 0) > 0 || (item.sourceApp_deliveroo_orders || 0) > 0) apps.add('Deliveroo');
      if ((item.sourceApp_justeat || 0) > 0 || (item.sourceApp_justeat_orders || 0) > 0) apps.add('JustEat');
      if ((item.sourceApp_tabesto || 0) > 0 || (item.sourceApp_tabesto_orders || 0) > 0) apps.add('Tabesto');
      if ((item.sourceApp_store || 0) > 0 || (item.sourceApp_store_orders || 0) > 0) apps.add('Store');
    });

    return {
      salesChannels: [...channels].sort(),
      deliveryApps: [...apps].sort()
    };
  }, [iPraticoData]);

  // Filter and calculate metrics
  const comparisonData = useMemo(() => {
    let cutoffDate;
    let endFilterDate;

    if (startDate && endDate) {// Check both to ensure a valid custom range
      cutoffDate = parseISO(startDate + 'T00:00:00'); // Ensure start of day
      endFilterDate = parseISO(endDate + 'T23:59:59'); // Ensure end of day
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }

    const filterByDate = () => {
      return iPraticoData.filter((item) => {
        if (item.order_date) {
          const itemDate = parseISO(item.order_date);
          // Compare only date part
          return !isBefore(itemDate, cutoffDate) && !isAfter(itemDate, endFilterDate);
        }
        return false;
      });
    };

    const calculateMetrics = (channel, app, store) => {
      let filteredData = filterByDate();

      if (store !== 'all') {
        filteredData = filteredData.filter((item) => item.store_id === store);
      }

      let totalRevenue = 0;
      let totalOrders = 0;

      filteredData.forEach((item) => {
        let currentChannelRevenue = 0;
        let currentChannelOrders = 0;

        if (channel === 'all') {
          currentChannelRevenue = item.total_revenue || 0;
          currentChannelOrders = item.total_orders || 0;
        } else if (channel === 'Delivery') {
          currentChannelRevenue = item.sourceType_delivery || 0;
          currentChannelOrders = item.sourceType_delivery_orders || 0;
        } else if (channel === 'Takeaway') {
          currentChannelRevenue = item.sourceType_takeaway || 0;
          currentChannelOrders = item.sourceType_takeaway_orders || 0;
        } else if (channel === 'Store') {
          currentChannelRevenue = item.sourceType_store || 0;
          currentChannelOrders = item.sourceType_store_orders || 0;
        }

        if (app !== 'all') {
          let appRevenue = 0;
          let appOrders = 0;

          if (app === 'Glovo') {
            appRevenue = item.sourceApp_glovo || 0;
            appOrders = item.sourceApp_glovo_orders || 0;
          } else if (app === 'Deliveroo') {
            appRevenue = item.sourceApp_deliveroo || 0;
            appOrders = item.sourceApp_deliveroo_orders || 0;
          } else if (app === 'JustEat') {
            appRevenue = item.sourceApp_justeat || 0;
            appOrders = item.sourceApp_justeat_orders || 0;
          } else if (app === 'Tabesto') {
            appRevenue = item.sourceApp_tabesto || 0;
            appOrders = item.sourceApp_tabesto_orders || 0;
          } else if (app === 'Store') {
            appRevenue = item.sourceApp_store || 0;
            appOrders = item.sourceApp_store_orders || 0;
          }

          currentChannelRevenue = Math.min(currentChannelRevenue, appRevenue);
          currentChannelOrders = Math.min(currentChannelOrders, appOrders);
        }

        totalRevenue += currentChannelRevenue;
        totalOrders += currentChannelOrders;
      });

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return { totalRevenue, totalOrders, avgOrderValue };
    };

    // Calculate metrics for all combinations
    const combinationMetrics = combinations.map(comb => ({
      ...comb,
      metrics: calculateMetrics(comb.channel, comb.app, comb.store)
    }));

    return combinationMetrics;
  }, [iPraticoData, combinations, dateRange, startDate, endDate]);

  // Removed clearCustomDates function

  const getCombinationLabel = (channel, app, store) => {
    const channelLabel = channel === 'all' ? 'Tutti i canali' : channel;
    const appLabel = app === 'all' ? 'Tutte le app' : app;
    const storeLabel = store === 'all' ? 'Tutti i locali' : stores.find((s) => s.id === store)?.name || store;

    const parts = [];
    if (store !== 'all') parts.push(storeLabel);
    if (channel !== 'all') parts.push(channelLabel);
    if (app !== 'all') parts.push(appLabel);

    if (parts.length === 0) return 'Tutti';
    return parts.join(' - ');
  };

  const addCombination = () => {
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    const newId = Math.max(...combinations.map(c => c.id), 0) + 1;
    const colorIndex = (combinations.length) % colors.length;
    setCombinations([...combinations, {
      id: newId,
      channel: 'all',
      app: 'all',
      store: 'all',
      color: colors[colorIndex],
      name: `Comb ${newId}`
    }]);
  };

  const removeCombination = (id) => {
    if (combinations.length > 2) {
      setCombinations(combinations.filter(c => c.id !== id));
    }
  };

  const updateCombination = (id, field, value) => {
    setCombinations(combinations.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Chart data - dynamic based on combinations
  const chartData = [
    {
      metric: 'Revenue €',
      ...Object.fromEntries(comparisonData.map(c => [c.name, parseFloat(c.metrics.totalRevenue.toFixed(2))]))
    },
    {
      metric: 'Ordini',
      ...Object.fromEntries(comparisonData.map(c => [c.name, c.metrics.totalOrders]))
    },
    {
      metric: 'Medio €',
      ...Object.fromEntries(comparisonData.map(c => [c.name, parseFloat(c.metrics.avgOrderValue.toFixed(2))]))
    }
  ];


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /> {/* Updated spinner as per outline */}
      </div>);

  }

  return (
    <ProtectedPage pageName="ChannelComparison"> {/* Wrapped in ProtectedPage */}
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6"> {/* Updated spacing for mobile */}
        {/* Header */}
        <div className="mb-4 lg:mb-6"> {/* Updated margin */}
          <h1 className="mb-1 text-2xl font-bold lg:text-3xl" style={{ color: '#000000' }}>Confronto Canali
          </h1>
          <p className="text-sm" style={{ color: '#000000' }}>Confronta performance tra diverse combinazioni</p> {/* Updated styling as per outline */}
        </div>

        {/* Date Range Filter */}
        <NeumorphicCard className="p-4 lg:p-6"> {/* Updated padding */}
          <div className="flex items-center gap-2 mb-4"> {/* Updated gap */}
            <Filter className="w-5 h-5 text-blue-600" /> {/* Updated icon color and size */}
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Periodo</h2> {/* Updated text styling */}
          </div>
          <div className="grid grid-cols-1 gap-3"> {/* Updated grid for mobile */}
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                if (e.target.value !== 'custom') {
                  setStartDate('');
                  setEndDate('');
                }
              }}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" // Updated text styling and size
            >
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 90 giorni</option>
              <option value="365">Ultimo anno</option>
              <option value="custom">Personalizzato</option> {/* Updated label */}
            </select>

            {dateRange === 'custom' &&
            <div className="grid grid-cols-2 gap-3"> {/* Updated grid for custom dates */}
                <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm" // Updated text styling and size
              />
                <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm" // Updated text styling and size
              />
                {/* Removed clear button */}
              </div>
            }
          </div>
        </NeumorphicCard>

        {/* Combination Selectors */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Combinazioni</h2>
            <NeumorphicButton
              onClick={addCombination}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Aggiungi
            </NeumorphicButton>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {combinations.map((comb, idx) => (
              <NeumorphicCard key={comb.id} className="p-4 lg:p-6 border-2" style={{ borderColor: comb.color }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: comb.color }} />
                    <h2 className="text-base lg:text-lg font-bold text-slate-800">{comb.name}</h2>
                  </div>
                  {combinations.length > 2 && (
                    <button
                      onClick={() => removeCombination(comb.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-600 mb-2 block">Locale</label>
                    <select
                      value={comb.store}
                      onChange={(e) => updateCombination(comb.id, 'store', e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                    >
                      <option value="all">Tutti</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-600 mb-2 block">Canale</label>
                    <select
                      value={comb.channel}
                      onChange={(e) => updateCombination(comb.id, 'channel', e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                    >
                      <option value="all">Tutti</option>
                      {salesChannels.map((channel) => (
                        <option key={channel} value={channel}>{channel}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-600 mb-2 block">App</label>
                    <select
                      value={comb.app}
                      onChange={(e) => updateCombination(comb.id, 'app', e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                    >
                      <option value="all">Tutte</option>
                      {deliveryApps.map((app) => (
                        <option key={app} value={app}>{app}</option>
                      ))}
                    </select>
                  </div>

                  <div className="neumorphic-flat p-3 rounded-xl" style={{ backgroundColor: comb.color + '15' }}>
                    <p className="text-sm font-medium truncate" style={{ color: comb.color }}>
                      {getCombinationLabel(comb.channel, comb.app, comb.store)}
                    </p>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-semibold text-slate-700">Revenue Totale</h3>
            </div>
            {comparisonData.map((comb) => (
              <div key={comb.id} className="flex items-center justify-between py-1">
                <span className="text-xs" style={{ color: comb.color }}>{comb.name}</span>
                <span className="text-sm font-bold text-slate-800">
                  €{comb.metrics.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-700">Ordini Totali</h3>
            </div>
            {comparisonData.map((comb) => (
              <div key={comb.id} className="flex items-center justify-between py-1">
                <span className="text-xs" style={{ color: comb.color }}>{comb.name}</span>
                <span className="text-sm font-bold text-slate-800">
                  {comb.metrics.totalOrders.toLocaleString()}
                </span>
              </div>
            ))}
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-slate-700">Ordine Medio</h3>
            </div>
            {comparisonData.map((comb) => (
              <div key={comb.id} className="flex items-center justify-between py-1">
                <span className="text-xs" style={{ color: comb.color }}>{comb.name}</span>
                <span className="text-sm font-bold text-slate-800">
                  €{comb.metrics.avgOrderValue.toFixed(2)}
                </span>
              </div>
            ))}
          </NeumorphicCard>
        </div>

        {/* Comparison Chart */}
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Confronto Visivo</h2>
          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: '300px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis
                    dataKey="metric"
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
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {comparisonData.map((comb) => (
                    <Bar key={comb.id} dataKey={comb.name} fill={comb.color} radius={[8, 8, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </NeumorphicCard>

        {/* Insights - Removed completely as per outline */}
      </div>
    </ProtectedPage>);

}