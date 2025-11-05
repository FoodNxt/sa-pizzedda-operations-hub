
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Filter, Calendar, X, BarChart3, DollarSign, ShoppingCart, ArrowRight } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';

export default function ChannelComparison() {
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Combination 1
  const [channel1, setChannel1] = useState('all');
  const [app1, setApp1] = useState('all');
  
  // Combination 2
  const [channel2, setChannel2] = useState('all');
  const [app2, setApp2] = useState('all');

  // Fetch iPratico data
  const { data: iPraticoData = [], isLoading } = useQuery({
    queryKey: ['iPratico', startDate, endDate, dateRange], // Add dateRange to queryKey for refetch
    queryFn: async () => {
      // For iPratico, we typically fetch a larger set and filter locally
      // The outline suggests a limit of 1000, but for custom date ranges, it might need to be larger or server-side filtered if performance is an issue.
      // For now, let's fetch a reasonable amount that would cover most typical date ranges.
      // If startDate/endDate are used, we might want to adjust the query to fetch within that period if the API supports it efficiently.
      // Given the outline's `list('-order_date', 1000)`, we'll stick to that.
      return base44.entities.iPratico.list('-order_date', 1000);
    },
  });

  // Get unique sales channels and delivery apps
  const { salesChannels, deliveryApps } = useMemo(() => {
    const channels = new Set();
    const apps = new Set();
    
    iPraticoData.forEach(item => {
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
    
    if (startDate && endDate) { // Check both to ensure a valid custom range
      cutoffDate = parseISO(startDate + 'T00:00:00'); // Ensure start of day
      endFilterDate = parseISO(endDate + 'T23:59:59'); // Ensure end of day
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }

    const filterByDate = () => {
      return iPraticoData.filter(item => {
        if (item.order_date) {
          const itemDate = parseISO(item.order_date);
          // Compare only date part
          return !isBefore(itemDate, cutoffDate) && !isAfter(itemDate, endFilterDate);
        }
        return false;
      });
    };

    const calculateMetrics = (channel, app) => {
      const filteredData = filterByDate(); // First filter by date
      
      let totalRevenue = 0;
      let totalOrders = 0;
      
      filteredData.forEach(item => {
        let currentChannelRevenue = 0;
        let currentChannelOrders = 0;
        
        // Calculate revenue and orders based on channel filter
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
        
        // Apply app filter if not 'all'
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
          } else if (app === 'Store') { // Note: 'Store' as an app usually means direct, matching sourceType_store
            appRevenue = item.sourceApp_store || 0;
            appOrders = item.sourceApp_store_orders || 0;
          }
          
          // Use minimum of channel and app (intersection logic from outline)
          // This implies the revenue/orders for a combination are the minimum of the two category totals for that item.
          currentChannelRevenue = Math.min(currentChannelRevenue, appRevenue);
          currentChannelOrders = Math.min(currentChannelOrders, appOrders);
        }
        
        totalRevenue += currentChannelRevenue;
        totalOrders += currentChannelOrders;
      });

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return { totalRevenue, totalOrders, avgOrderValue };
    };

    const metrics1 = calculateMetrics(channel1, app1);
    const metrics2 = calculateMetrics(channel2, app2);

    // Calculate comparison percentages
    const revenueDiff = metrics2.totalRevenue !== 0 
      ? ((metrics1.totalRevenue - metrics2.totalRevenue) / metrics2.totalRevenue) * 100 
      : (metrics1.totalRevenue === 0 && metrics2.totalRevenue === 0 ? 0 : (metrics1.totalRevenue > 0 ? Infinity : -Infinity));
    const ordersDiff = metrics2.totalOrders !== 0 
      ? ((metrics1.totalOrders - metrics2.totalOrders) / metrics2.totalOrders) * 100 
      : (metrics1.totalOrders === 0 && metrics2.totalOrders === 0 ? 0 : (metrics1.totalOrders > 0 ? Infinity : -Infinity));
    const avgDiff = metrics2.avgOrderValue !== 0 
      ? ((metrics1.avgOrderValue - metrics2.avgOrderValue) / metrics2.avgOrderValue) * 100 
      : (metrics1.avgOrderValue === 0 && metrics2.avgOrderValue === 0 ? 0 : (metrics1.avgOrderValue > 0 ? Infinity : -Infinity));

    return {
      combination1: metrics1,
      combination2: metrics2,
      revenueDiff: isFinite(revenueDiff) ? revenueDiff : (revenueDiff > 0 ? 100 : -100), // Cap infinite diff for display
      ordersDiff: isFinite(ordersDiff) ? ordersDiff : (ordersDiff > 0 ? 100 : -100),
      avgDiff: isFinite(avgDiff) ? avgDiff : (avgDiff > 0 ? 100 : -100)
    };
  }, [iPraticoData, channel1, app1, channel2, app2, dateRange, startDate, endDate]);

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30');
  };

  const getCombinationLabel = (channel, app) => {
    const channelLabel = channel === 'all' ? 'Tutti i canali' : channel;
    const appLabel = app === 'all' ? 'Tutte le app' : app; // Use app name directly, assuming already capitalized
    
    if (channel === 'all' && app === 'all') return 'Tutti i canali e app';
    if (channel === 'all') return appLabel;
    if (app === 'all') return channelLabel;
    return `${channelLabel} - ${appLabel}`;
  };

  const formatDiff = (diff) => {
    if (diff === Infinity) return '+100%+'; // Custom formatting for very large positive diffs
    if (diff === -Infinity) return '-100%-'; // Custom formatting for very large negative diffs
    const absValue = Math.abs(diff);
    const sign = diff > 0 ? '+' : '';
    return `${sign}${absValue.toFixed(1)}%`;
  };

  const getDiffColor = (diff) => {
    if (Math.abs(diff) < 5) return 'text-[#6b6b6b]';
    return diff > 0 ? 'text-green-600' : 'text-red-600';
  };

  // Chart data
  const chartData = [
    {
      metric: 'Revenue €',
      'Combinazione 1': parseFloat(comparisonData.combination1.totalRevenue.toFixed(2)),
      'Combinazione 2': parseFloat(comparisonData.combination2.totalRevenue.toFixed(2))
    },
    {
      metric: 'Ordini',
      'Combinazione 1': comparisonData.combination1.totalOrders,
      'Combinazione 2': comparisonData.combination2.totalOrders
    },
    {
      metric: 'Scontrino Medio €',
      'Combinazione 1': parseFloat(comparisonData.combination1.avgOrderValue.toFixed(2)),
      'Combinazione 2': parseFloat(comparisonData.combination2.avgOrderValue.toFixed(2))
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-2xl font-bold text-[#6b6b6b]">
        Caricamento dati iPratico...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Confronto Canali e App Delivery</h1>
        <p className="text-[#9b9b9b]">Confronta le performance tra diverse combinazioni (dati iPratico)</p>
      </div>

      {/* Date Range Filter */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Filtro Periodo</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Periodo</label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                if (e.target.value !== 'custom') {
                  setStartDate('');
                  setEndDate('');
                }
              }}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 90 giorni</option>
              <option value="365">Ultimo anno</option>
              <option value="custom">Periodo Personalizzato</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <>
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
            </>
          )}
        </div>
      </NeumorphicCard>

      {/* Combination Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Combination 1 */}
        <NeumorphicCard className="p-6 border-2 border-[#8b7355]">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-[#8b7355]" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">Combinazione 1</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block">Canale Vendita</label>
              <select
                value={channel1}
                onChange={(e) => setChannel1(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="all">Tutti i Canali</option>
                {salesChannels.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block">App Delivery</label>
              <select
                value={app1}
                onChange={(e) => setApp1(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="all">Tutte le App</option>
                {deliveryApps.map(app => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
            </div>

            <div className="neumorphic-flat p-4 rounded-xl bg-blue-50">
              <p className="text-sm text-blue-800 font-medium">
                {getCombinationLabel(channel1, app1)}
              </p>
            </div>
          </div>
        </NeumorphicCard>

        {/* Combination 2 */}
        <NeumorphicCard className="p-6 border-2 border-[#a68a6a]">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-[#a68a6a]" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">Combinazione 2</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block">Canale Vendita</label>
              <select
                value={channel2}
                onChange={(e) => setChannel2(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="all">Tutti i Canali</option>
                {salesChannels.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block">App Delivery</label>
              <select
                value={app2}
                onChange={(e) => setApp2(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="all">Tutte le App</option>
                {deliveryApps.map(app => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
            </div>

            <div className="neumorphic-flat p-4 rounded-xl bg-purple-50">
              <p className="text-sm text-purple-800 font-medium">
                {getCombinationLabel(channel2, app2)}
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Comparison Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Comparison */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="neumorphic-flat p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-[#8b7355]" />
            </div>
            <h3 className="text-lg font-bold text-[#6b6b6b]">Revenue Totale</h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-blue-600 mb-1">Combinazione 1</p>
              <p className="text-2xl font-bold text-[#6b6b6b]">
                €{comparisonData.combination1.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-[#9b9b9b]" />
            </div>

            <div>
              <p className="text-sm text-purple-600 mb-1">Combinazione 2</p>
              <p className="text-2xl font-bold text-[#6b6b6b]">
                €{comparisonData.combination2.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl text-center">
              <p className="text-sm text-[#9b9b9b] mb-1">Differenza</p>
              <p className={`text-xl font-bold ${getDiffColor(comparisonData.revenueDiff)}`}>
                {formatDiff(comparisonData.revenueDiff)}
              </p>
            </div>
          </div>
        </NeumorphicCard>

        {/* Orders Comparison */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="neumorphic-flat p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-[#8b7355]" />
            </div>
            <h3 className="text-lg font-bold text-[#6b6b6b]">Ordini Totali</h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-blue-600 mb-1">Combinazione 1</p>
              <p className="text-2xl font-bold text-[#6b6b6b]">
                {comparisonData.combination1.totalOrders.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-[#9b9b9b]" />
            </div>

            <div>
              <p className="text-sm text-purple-600 mb-1">Combinazione 2</p>
              <p className="text-2xl font-bold text-[#6b6b6b]">
                {comparisonData.combination2.totalOrders.toLocaleString()}
              </p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl text-center">
              <p className="text-sm text-[#9b9b9b] mb-1">Differenza</p>
              <p className={`text-xl font-bold ${getDiffColor(comparisonData.ordersDiff)}`}>
                {formatDiff(comparisonData.ordersDiff)}
              </p>
            </div>
          </div>
        </NeumorphicCard>

        {/* Average Order Value Comparison */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="neumorphic-flat p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-[#8b7355]" />
            </div>
            <h3 className="text-lg font-bold text-[#6b6b6b]">Scontrino Medio</h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-blue-600 mb-1">Combinazione 1</p>
              <p className="text-2xl font-bold text-[#6b6b6b]">
                €{comparisonData.combination1.avgOrderValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-[#9b9b9b]" />
            </div>

            <div>
              <p className="text-sm text-purple-600 mb-1">Combinazione 2</p>
              <p className="text-2xl font-bold text-[#6b6b6b]">
                €{comparisonData.combination2.avgOrderValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="neumorphic-pressed p-3 rounded-xl text-center">
              <p className="text-sm text-[#9b9b9b] mb-1">Differenza</p>
              <p className={`text-xl font-bold ${getDiffColor(comparisonData.avgDiff)}`}>
                {formatDiff(comparisonData.avgDiff)}
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Comparison Chart */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Confronto Visivo</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
            <XAxis dataKey="metric" stroke="#9b9b9b" />
            <YAxis stroke="#9b9b9b" />
            <Tooltip 
              contentStyle={{ 
                background: '#e0e5ec', 
                border: 'none',
                borderRadius: '12px',
                boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
              }}
            />
            <Legend />
            <Bar dataKey="Combinazione 1" fill="#8b7355" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Combinazione 2" fill="#a68a6a" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </NeumorphicCard>

      {/* Insights */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">💡 Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="neumorphic-pressed p-4 rounded-xl">
            <p className="text-sm text-[#9b9b9b] mb-2">Revenue</p>
            <p className="text-[#6b6b6b]">
              {Math.abs(comparisonData.revenueDiff) < 5 ? (
                'Le due combinazioni hanno performance simili'
              ) : comparisonData.revenueDiff > 0 ? (
                `Combinazione 1 genera ${formatDiff(comparisonData.revenueDiff)} in più`
              ) : (
                `Combinazione 2 genera ${formatDiff(-comparisonData.revenueDiff)} in più`
              )}
            </p>
          </div>

          <div className="neumorphic-pressed p-4 rounded-xl">
            <p className="text-sm text-[#9b9b9b] mb-2">Volume Ordini</p>
            <p className="text-[#6b6b6b]">
              {Math.abs(comparisonData.ordersDiff) < 5 ? (
                'Volume simile tra le due combinazioni'
              ) : comparisonData.ordersDiff > 0 ? (
                `Combinazione 1 ha ${formatDiff(comparisonData.ordersDiff)} ordini in più`
              ) : (
                `Combinazione 2 ha ${formatDiff(-comparisonData.ordersDiff)} ordini in più`
              )}
            </p>
          </div>

          <div className="neumorphic-pressed p-4 rounded-xl">
            <p className="text-sm text-[#9b9b9b] mb-2">Scontrino Medio</p>
            <p className="text-[#6b6b6b]">
              {Math.abs(comparisonData.avgDiff) < 5 ? (
                'Valore medio simile'
              ) : comparisonData.avgDiff > 0 ? (
                `Combinazione 1 ha uno scontrino ${formatDiff(comparisonData.avgDiff)} più alto`
              ) : (
                `Combinazione 2 ha uno scontrino ${formatDiff(-comparisonData.avgDiff)} più alto`
              )}
            </p>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
