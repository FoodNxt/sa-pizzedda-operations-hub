import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Filter, Calendar, X, BarChart3, DollarSign, ShoppingCart, ArrowRight } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage"; // Added ProtectedPage import
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, isAfter, isBefore, parseISO } from 'date-fns'; // Removed 'format'

export default function ChannelComparison() {
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Combination 1
  const [channel1, setChannel1] = useState('all');
  const [app1, setApp1] = useState('all');
  const [store1, setStore1] = useState('all');

  // Combination 2
  const [channel2, setChannel2] = useState('all');
  const [app2, setApp2] = useState('all');
  const [store2, setStore2] = useState('all');

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
      let filteredData = filterByDate(); // First filter by date

      // Apply store filter
      if (store !== 'all') {
        filteredData = filteredData.filter((item) => item.store_id === store);
      }

      let totalRevenue = 0;
      let totalOrders = 0;

      filteredData.forEach((item) => {
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
          } else if (app === 'Store') {// Note: 'Store' as an app usually means direct, matching sourceType_store
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

    const metrics1 = calculateMetrics(channel1, app1, store1);
    const metrics2 = calculateMetrics(channel2, app2, store2);

    // Calculate comparison percentages - simplified as per outline
    const revenueDiff = metrics2.totalRevenue !== 0 ?
    (metrics1.totalRevenue - metrics2.totalRevenue) / metrics2.totalRevenue * 100 :
    0; // Changed from Infinity/NaN handling to 0
    const ordersDiff = metrics2.totalOrders !== 0 ?
    (metrics1.totalOrders - metrics2.totalOrders) / metrics2.totalOrders * 100 :
    0; // Changed from Infinity/NaN handling to 0
    const avgDiff = metrics2.avgOrderValue !== 0 ?
    (metrics1.avgOrderValue - metrics2.avgOrderValue) / metrics2.avgOrderValue * 100 :
    0; // Changed from Infinity/NaN handling to 0

    return {
      combination1: metrics1,
      combination2: metrics2,
      revenueDiff, // No more isFinite capping
      ordersDiff,
      avgDiff
    };
  }, [iPraticoData, channel1, app1, store1, channel2, app2, store2, dateRange, startDate, endDate]);

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

  const formatDiff = (diff) => {
    // Simplified as per outline, assuming diff is already handled to not be Infinity
    const absValue = Math.abs(diff);
    const sign = diff > 0 ? '+' : '';
    return `${sign}${absValue.toFixed(1)}%`;
  };

  const getDiffColor = (diff) => {
    if (Math.abs(diff) < 5) return 'text-slate-700'; // Changed color as per outline
    return diff > 0 ? 'text-green-600' : 'text-red-600';
  };

  // Chart data - labels changed as per outline
  const chartData = [
  {
    metric: 'Revenue €',
    'Comb 1': parseFloat(comparisonData.combination1.totalRevenue.toFixed(2)),
    'Comb 2': parseFloat(comparisonData.combination2.totalRevenue.toFixed(2))
  },
  {
    metric: 'Ordini',
    'Comb 1': comparisonData.combination1.totalOrders,
    'Comb 2': comparisonData.combination2.totalOrders
  },
  {
    metric: 'Medio €', // Label changed
    'Comb 1': parseFloat(comparisonData.combination1.avgOrderValue.toFixed(2)),
    'Comb 2': parseFloat(comparisonData.combination2.avgOrderValue.toFixed(2))
  }];


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
          <h1 className="bg-clip-text text-slate-50 mb-1 text-2xl font-bold lg:text-3xl from-slate-700 to-slate-900">Confronto Canali

          </h1>
          <p className="text-slate-50 text-sm">Confronta performance tra diverse combinazioni</p> {/* Updated styling as per outline */}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"> {/* Updated spacing */}
          {/* Combination 1 */}
          <NeumorphicCard className="p-4 lg:p-6 border-2 border-blue-500"> {/* Updated padding and border color */}
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" /> {/* Updated icon size and color */}
              <h2 className="text-base lg:text-lg font-bold text-slate-800">Combinazione 1</h2> {/* Updated text styling */}
            </div>
            
            <div className="space-y-3"> {/* Updated spacing */}
              <div>
                <label className="text-sm text-slate-600 mb-2 block">Locale</label>
                <select
                  value={store1}
                  onChange={(e) => setStore1(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                  <option value="all">Tutti</option>
                  {stores.map((store) =>
                  <option key={store.id} value={store.id}>{store.name}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block">Canale</label> {/* Updated text styling */}
                <select
                  value={channel1}
                  onChange={(e) => setChannel1(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" // Updated text styling and size
                >
                  <option value="all">Tutti</option> {/* Updated label */}
                  {salesChannels.map((channel) =>
                  <option key={channel} value={channel}>{channel}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block">App</label> {/* Updated text styling */}
                <select
                  value={app1}
                  onChange={(e) => setApp1(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" // Updated text styling and size
                >
                  <option value="all">Tutte</option> {/* Updated label */}
                  {deliveryApps.map((app) =>
                  <option key={app} value={app}>{app}</option>
                  )}
                </select>
              </div>

              <div className="neumorphic-flat p-3 rounded-xl bg-blue-50"> {/* Updated padding */}
                <p className="text-sm text-blue-800 font-medium truncate"> {/* Added truncate */}
                  {getCombinationLabel(channel1, app1, store1)}
                </p>
              </div>
            </div>
          </NeumorphicCard>

          {/* Combination 2 */}
          <NeumorphicCard className="p-4 lg:p-6 border-2 border-purple-500"> {/* Updated padding and border color */}
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" /> {/* Updated icon size and color */}
              <h2 className="text-base lg:text-lg font-bold text-slate-800">Combinazione 2</h2> {/* Updated text styling */}
            </div>
            
            <div className="space-y-3"> {/* Updated spacing */}
              <div>
                <label className="text-sm text-slate-600 mb-2 block">Locale</label>
                <select
                  value={store2}
                  onChange={(e) => setStore2(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">

                  <option value="all">Tutti</option>
                  {stores.map((store) =>
                  <option key={store.id} value={store.id}>{store.name}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block">Canale</label> {/* Updated text styling */}
                <select
                  value={channel2}
                  onChange={(e) => setChannel2(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" // Updated text styling and size
                >
                  <option value="all">Tutti</option> {/* Updated label */}
                  {salesChannels.map((channel) =>
                  <option key={channel} value={channel}>{channel}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block">App</label> {/* Updated text styling */}
                <select
                  value={app2}
                  onChange={(e) => setApp2(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" // Updated text styling and size
                >
                  <option value="all">Tutte</option> {/* Updated label */}
                  {deliveryApps.map((app) =>
                  <option key={app} value={app}>{app}</option>
                  )}
                </select>
              </div>

              <div className="neumorphic-flat p-3 rounded-xl bg-purple-50"> {/* Updated padding */}
                <p className="text-sm text-purple-800 font-medium truncate"> {/* Added truncate */}
                  {getCombinationLabel(channel2, app2, store2)}
                </p>
              </div>
            </div>
          </NeumorphicCard>
        </div>

        {/* Comparison Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6"> {/* Updated grid for mobile, added spacing */}
          {/* Revenue Comparison */}
          <NeumorphicCard className="p-4 lg:p-6"> {/* Updated padding */}
            <div className="flex items-center gap-3 mb-3"> {/* Updated margin */}
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg"> {/* Updated icon container styling */}
                <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-white" /> {/* Updated icon size and color */}
              </div>
              <h3 className="text-base lg:text-lg font-bold text-slate-800">Revenue</h3> {/* Updated text styling */}
            </div>

            <div className="space-y-3"> {/* Updated spacing */}
              <div>
                <p className="text-xs text-blue-600 mb-1">Comb 1</p> {/* Updated text styling */}
                <p className="text-lg lg:text-xl font-bold text-slate-800"> {/* Updated text size */}
                  €{comparisonData.combination1.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })} {/* Removed maxFractionDigits */}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-slate-400" /> {/* Updated icon size and color */}
              </div>

              <div>
                <p className="text-xs text-purple-600 mb-1">Comb 2</p> {/* Updated text styling */}
                <p className="text-lg lg:text-xl font-bold text-slate-800"> {/* Updated text size */}
                  €{comparisonData.combination2.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })} {/* Removed maxFractionDigits */}
                </p>
              </div>

              <div className="neumorphic-pressed p-3 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1">Diff</p> {/* Updated text styling and size */}
                <p className={`text-lg font-bold ${getDiffColor(comparisonData.revenueDiff)}`}> {/* Updated text size */}
                  {formatDiff(comparisonData.revenueDiff)}
                </p>
              </div>
            </div>
          </NeumorphicCard>

          {/* Orders Comparison */}
          <NeumorphicCard className="p-4 lg:p-6"> {/* Updated padding */}
            <div className="flex items-center gap-3 mb-3"> {/* Updated margin */}
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg"> {/* Updated icon container styling */}
                <ShoppingCart className="w-5 h-5 lg:w-6 lg:h-6 text-white" /> {/* Updated icon size and color */}
              </div>
              <h3 className="text-base lg:text-lg font-bold text-slate-800">Ordini</h3> {/* Updated text styling */}
            </div>

            <div className="space-y-3"> {/* Updated spacing */}
              <div>
                <p className="text-xs text-blue-600 mb-1">Comb 1</p> {/* Updated text styling */}
                <p className="text-lg lg:text-xl font-bold text-slate-800"> {/* Updated text size */}
                  {comparisonData.combination1.totalOrders.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-slate-400" /> {/* Updated icon size and color */}
              </div>

              <div>
                <p className="text-xs text-purple-600 mb-1">Comb 2</p> {/* Updated text styling */}
                <p className="text-lg lg:text-xl font-bold text-slate-800"> {/* Updated text size */}
                  {comparisonData.combination2.totalOrders.toLocaleString()}
                </p>
              </div>

              <div className="neumorphic-pressed p-3 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1">Diff</p> {/* Updated text styling and size */}
                <p className={`text-lg font-bold ${getDiffColor(comparisonData.ordersDiff)}`}> {/* Updated text size */}
                  {formatDiff(comparisonData.ordersDiff)}
                </p>
              </div>
            </div>
          </NeumorphicCard>

          {/* Average Order Value Comparison */}
          <NeumorphicCard className="p-4 lg:p-6"> {/* Updated padding */}
            <div className="flex items-center gap-3 mb-3"> {/* Updated margin */}
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg"> {/* Updated icon container styling */}
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-white" /> {/* Updated icon size and color */}
              </div>
              <h3 className="text-base lg:text-lg font-bold text-slate-800">Medio</h3> {/* Updated text styling */}
            </div>

            <div className="space-y-3"> {/* Updated spacing */}
              <div>
                <p className="text-xs text-blue-600 mb-1">Comb 1</p> {/* Updated text styling */}
                <p className="text-lg lg:text-xl font-bold text-slate-800"> {/* Updated text size */}
                  €{comparisonData.combination1.avgOrderValue.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-slate-400" /> {/* Updated icon size and color */}
              </div>

              <div>
                <p className="text-xs text-purple-600 mb-1">Comb 2</p> {/* Updated text styling */}
                <p className="text-lg lg:text-xl font-bold text-slate-800"> {/* Updated text size */}
                  €{comparisonData.combination2.avgOrderValue.toFixed(2)}
                </p>
              </div>

              <div className="neumorphic-pressed p-3 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1">Diff</p> {/* Updated text styling and size */}
                <p className={`text-lg font-bold ${getDiffColor(comparisonData.avgDiff)}`}> {/* Updated text size */}
                  {formatDiff(comparisonData.avgDiff)}
                </p>
              </div>
            </div>
          </NeumorphicCard>
        </div>

        {/* Comparison Chart */}
        <NeumorphicCard className="p-4 lg:p-6"> {/* Updated padding */}
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Confronto Visivo</h2> {/* Updated text styling */}
          <div className="w-full overflow-x-auto"> {/* Added for horizontal scrolling on small screens */}
            <div style={{ minWidth: '300px' }}> {/* Ensures chart doesn't shrink too much */}
              <ResponsiveContainer width="100%" height={300}> {/* Updated height */}
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" /> {/* Updated stroke color */}
                  <XAxis
                    dataKey="metric"
                    stroke="#64748b" // Updated stroke color
                    tick={{ fontSize: 11 }} // Updated tick font size
                  />
                  <YAxis
                    stroke="#64748b" // Updated stroke color
                    tick={{ fontSize: 11 }} // Updated tick font size
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(248, 250, 252, 0.95)', // Updated background color
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '11px' // Updated font size
                    }} />

                  <Legend wrapperStyle={{ fontSize: '11px' }} /> {/* Updated wrapperStyle */}
                  <Bar dataKey="Comb 1" fill="#3b82f6" radius={[8, 8, 0, 0]} /> {/* Updated fill color */}
                  <Bar dataKey="Comb 2" fill="#8b5cf6" radius={[8, 8, 0, 0]} /> {/* Updated fill color */}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </NeumorphicCard>

        {/* Insights - Removed completely as per outline */}
      </div>
    </ProtectedPage>);

}