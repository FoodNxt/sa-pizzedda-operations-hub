
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, ShoppingCart, Truck, Filter, Calendar, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';

export default function Financials() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('30'); // Changed to string to accommodate 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedDeliveryApp, setSelectedDeliveryApp] = useState('all');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  // Smart data fetching: use filter when custom dates, list otherwise
  const { data: orderItems = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orderItems', startDate, endDate, dateRange],
    queryFn: async () => {
      // If custom date range, use server-side filtering
      if (startDate && endDate) {
        const start = parseISO(startDate + 'T00:00:00');
        const end = parseISO(endDate + 'T23:59:59');
        
        return base44.entities.OrderItem.filter({
          modifiedDate: {
            $gte: start.toISOString(),
            $lte: end.toISOString()
          }
        }, '-modifiedDate', 100000);
      }
      
      // Otherwise, use list with reasonable limit
      return base44.entities.OrderItem.list('-modifiedDate', 10000);
    },
  });

  // Get unique sales channels and delivery apps
  const salesChannels = useMemo(() => {
    const channels = new Set(orderItems.map(o => o.saleTypeName).filter(Boolean));
    
    // Add Tabesto as a sales channel if it exists in sourceApp
    orderItems.forEach(o => {
      if (o.sourceApp && o.sourceApp.toLowerCase() === 'tabesto') {
        channels.add('Tabesto');
      }
    });
    
    return [...channels];
  }, [orderItems]);
  
  const deliveryApps = useMemo(() => {
    return [...new Set(orderItems
      .map(o => o.sourceApp)
      .filter(app => app && app.toLowerCase() !== 'tabesto') // Exclude Tabesto from delivery apps
    )];
  }, [orderItems]);

  // Process and filter data
  const processedData = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    // Use custom date range if provided, otherwise use preset
    if (startDate || endDate) {
      // Ensure time components are set for accurate range filtering
      cutoffDate = startDate ? parseISO(startDate + 'T00:00:00') : new Date(0); // Epoch start if no start date
      endFilterDate = endDate ? parseISO(endDate + 'T23:59:59') : new Date(); // Current time if no end date
    } else {
      const days = parseInt(dateRange, 10); // Parse string to number
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date(); // End of current day for non-custom ranges
    }
    
    let filtered = orderItems.filter(item => {
      // Date filter
      if (item.modifiedDate) {
        const itemDate = new Date(item.modifiedDate);
        // Exclude items whose date is before the cutoffDate or after the endFilterDate
        if (isBefore(itemDate, cutoffDate) || isAfter(itemDate, endFilterDate)) {
          return false;
        }
      }
      
      // Store filter
      if (selectedStore !== 'all' && item.store_id !== selectedStore) return false;
      
      // Channel filter - include Tabesto as a channel
      if (selectedChannel !== 'all') {
        if (selectedChannel === 'Tabesto') {
          if (!item.sourceApp || item.sourceApp.toLowerCase() !== 'tabesto') return false;
        } else {
          // Check item.saleTypeName normally for other channels
          if (item.saleTypeName !== selectedChannel) return false;
        }
      }
      
      // Delivery app filter (Tabesto is excluded from deliveryApps list, so this is implicitly fine)
      if (selectedDeliveryApp !== 'all' && item.sourceApp !== selectedDeliveryApp) return false;
      
      return true;
    });

    // Calculate totals
    const totalRevenue = filtered.reduce((sum, item) => 
      sum + (item.finalPriceWithSessionDiscountsAndSurcharges || 0), 0
    );
    
    // Count unique orders (not items)
    const uniqueOrders = [...new Set(filtered.map(item => item.order).filter(Boolean))];
    const totalOrders = uniqueOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Revenue by date (group by day)
    const revenueByDate = {};
    const ordersByDate = {}; // To store unique orders per date
    
    filtered.forEach(item => {
      if (item.modifiedDate) {
        const date = format(new Date(item.modifiedDate), 'yyyy-MM-dd');
        if (!revenueByDate[date]) {
          revenueByDate[date] = { date, revenue: 0 };
          ordersByDate[date] = new Set(); // Initialize a Set for unique orders
        }
        revenueByDate[date].revenue += item.finalPriceWithSessionDiscountsAndSurcharges || 0;
        if (item.order) { // Add order ID to the set if it exists
          ordersByDate[date].add(item.order);
        }
      }
    });

    const dailyRevenue = Object.values(revenueByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => {
        const orders = ordersByDate[d.date].size; // Get the count of unique orders for this date
        return {
          date: format(new Date(d.date), 'dd/MM'),
          revenue: parseFloat(d.revenue.toFixed(2)),
          orders: orders,
          avgValue: orders > 0 ? parseFloat((d.revenue / orders).toFixed(2)) : 0
        };
      });

    // Revenue by store
    const revenueByStore = {};
    const ordersByStore = {}; // To store unique orders per store
    
    filtered.forEach(item => {
      const storeName = item.store_name || 'Unknown';
      if (!revenueByStore[storeName]) {
        revenueByStore[storeName] = { name: storeName, revenue: 0 };
        ordersByStore[storeName] = new Set(); // Initialize a Set for unique orders
      }
      revenueByStore[storeName].revenue += item.finalPriceWithSessionDiscountsAndSurcharges || 0;
      if (item.order) { // Add order ID to the set if it exists
        ordersByStore[storeName].add(item.order);
      }
    });

    const storeBreakdown = Object.values(revenueByStore)
      .sort((a, b) => b.revenue - a.revenue)
      .map(s => {
        const orders = ordersByStore[s.name].size; // Get the count of unique orders for this store
        return {
          name: s.name,
          revenue: parseFloat(s.revenue.toFixed(2)),
          orders: orders,
          avgValue: orders > 0 ? parseFloat((s.revenue / orders).toFixed(2)) : 0
        };
      });

    // Revenue by sales channel
    const revenueByChannel = {};
    const ordersByChannel = {}; // To store unique orders per channel
    
    filtered.forEach(item => {
      let channelName;
      if (item.sourceApp && item.sourceApp.toLowerCase() === 'tabesto') {
        channelName = 'Tabesto';
      } else {
        channelName = item.saleTypeName || 'Unknown';
      }

      if (!revenueByChannel[channelName]) {
        revenueByChannel[channelName] = { name: channelName, value: 0 };
        ordersByChannel[channelName] = new Set(); // Initialize a Set for unique orders
      }
      revenueByChannel[channelName].value += item.finalPriceWithSessionDiscountsAndSurcharges || 0;
      if (item.order) { // Add order ID to the set if it exists
        ordersByChannel[channelName].add(item.order);
      }
    });

    const channelBreakdown = Object.values(revenueByChannel)
      .sort((a, b) => b.value - a.value)
      .map(c => ({
        name: c.name,
        value: parseFloat(c.value.toFixed(2)),
        orders: ordersByChannel[c.name].size // Get the count of unique orders for this channel
      }));

    // Revenue by delivery app
    const revenueByApp = {};
    const ordersByApp = {}; // To store unique orders per app
    
    filtered.forEach(item => {
      // Exclude Tabesto from delivery app breakdown
      if (item.sourceApp && item.sourceApp.toLowerCase() !== 'tabesto') {
        const app = item.sourceApp;
        if (!revenueByApp[app]) {
          revenueByApp[app] = { name: app, value: 0 };
          ordersByApp[app] = new Set(); // Initialize a Set for unique orders
        }
        revenueByApp[app].value += item.finalPriceWithSessionDiscountsAndSurcharges || 0;
        if (item.order) { // Add order ID to the set if it exists
          ordersByApp[app].add(item.order);
        }
      }
    });

    const deliveryAppBreakdown = Object.values(revenueByApp)
      .sort((a, b) => b.value - a.value)
      .map(a => ({
        name: a.name.charAt(0).toUpperCase() + a.name.slice(1),
        value: parseFloat(a.value.toFixed(2)),
        orders: ordersByApp[a.name].size // Get the count of unique orders for this app
      }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      dailyRevenue,
      storeBreakdown,
      channelBreakdown,
      deliveryAppBreakdown
    };
  }, [orderItems, selectedStore, dateRange, startDate, endDate, selectedChannel, selectedDeliveryApp]);

  const COLORS = ['#8b7355', '#a68a6a', '#c1a07f', '#dcb794', '#6b5d51', '#9d8770'];

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30'); // Reset to default preset
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Analisi Finanziaria</h1>
        <p className="text-[#9b9b9b]">Analisi dettagliata ordini e revenue</p>
      </div>

      {/* Filters */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Filtri</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Canale Vendita</label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
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
              value={selectedDeliveryApp}
              onChange={(e) => setSelectedDeliveryApp(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="all">Tutte le App</option>
              {deliveryApps.map(app => (
                <option key={app} value={app}>{app.charAt(0).toUpperCase() + app.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#c1c1c1]">
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
        )}
      </NeumorphicCard>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Revenue Totale</p>
              <h3 className="text-3xl font-bold text-[#6b6b6b]">
                €{processedData.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="neumorphic-flat p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Ordini Totali</p>
              <h3 className="text-3xl font-bold text-[#6b6b6b]">
                {processedData.totalOrders.toLocaleString()}
              </h3>
            </div>
            <div className="neumorphic-flat p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Scontrino Medio</p>
              <h3 className="text-3xl font-bold text-[#6b6b6b]">
                €{processedData.avgOrderValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="neumorphic-flat p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Delivery App Orders</p>
              <h3 className="text-3xl font-bold text-[#6b6b6b]">
                {processedData.deliveryAppBreakdown.reduce((sum, app) => sum + app.orders, 0)}
              </h3>
            </div>
            <div className="neumorphic-flat p-3 rounded-lg">
              <Truck className="w-6 h-6 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend - UPDATED with dual Y-axis */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Trend Revenue Giornaliero</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={processedData.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
              <XAxis dataKey="date" stroke="#9b9b9b" />
              <YAxis 
                yAxisId="left"
                stroke="#8b7355" 
                label={{ value: 'Revenue (€)', angle: -90, position: 'insideLeft', style: { fill: '#8b7355' } }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                stroke="#22c55e"
                label={{ value: 'Scontrino Medio (€)', angle: 90, position: 'insideRight', style: { fill: '#22c55e' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#e0e5ec', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                }}
                formatter={(value) => `€${value.toFixed(2)}`}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b7355" 
                strokeWidth={3} 
                name="Revenue €" 
                dot={{ fill: '#8b7355', r: 4 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avgValue" 
                stroke="#22c55e" 
                strokeWidth={2} 
                name="Scontrino Medio €"
                dot={{ fill: '#22c55e', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </NeumorphicCard>

        {/* Revenue by Store */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue per Locale</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={processedData.storeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
              <XAxis dataKey="name" stroke="#9b9b9b" />
              <YAxis stroke="#9b9b9b" />
              <Tooltip 
                contentStyle={{ 
                  background: '#e0e5ec', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                }}
                formatter={(value, name) => {
                  if (name === 'revenue') return `€${value.toFixed(2)}`;
                  if (name === 'avgValue') return `€${value.toFixed(2)}`;
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#8b7355" name="Revenue €" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeumorphicCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Sales Channel */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue per Canale di Vendita</h2>
          {processedData.channelBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processedData.channelBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {processedData.channelBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: '#e0e5ec', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                  }}
                  formatter={(value) => `€${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#9b9b9b]">
              Nessun dato disponibile
            </div>
          )}
        </NeumorphicCard>

        {/* Revenue by Delivery App */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue per App Delivery</h2>
          {processedData.deliveryAppBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processedData.deliveryAppBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
                <XAxis dataKey="name" stroke="#9b9b9b" />
                <YAxis stroke="#9b9b9b" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#e0e5ec', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                  }}
                  formatter={(value, name) => {
                    if (name === 'value') return `€${value.toFixed(2)}`;
                    return value;
                  }}
                />
                <Legend />
                <Bar dataKey="value" fill="#8b7355" name="Revenue €" radius={[8, 8, 0, 0]} />
                <Bar dataKey="orders" fill="#a68a6a" name="Ordini" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#9b9b9b]">
              Nessun ordine da app di delivery
            </div>
          )}
        </NeumorphicCard>
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stores Table */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Dettaglio per Locale</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#c1c1c1]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Revenue</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Ordini</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">€ Medio</th>
                </tr>
              </thead>
              <tbody>
                {processedData.storeBreakdown.map((store, index) => (
                  <tr key={index} className="border-b border-[#d1d1d1]">
                    <td className="p-3 text-[#6b6b6b] font-medium">{store.name}</td>
                    <td className="p-3 text-right text-[#6b6b6b]">€{store.revenue.toFixed(2)}</td>
                    <td className="p-3 text-right text-[#6b6b6b]">{store.orders}</td>
                    <td className="p-3 text-right text-[#6b6b6b]">€{store.avgValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NeumorphicCard>

        {/* Channels Table */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Dettaglio per Canale</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#c1c1c1]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Canale</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Revenue</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Ordini</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">% Tot</th>
                </tr>
              </thead>
              <tbody>
                {processedData.channelBreakdown.map((channel, index) => (
                  <tr key={index} className="border-b border-[#d1d1d1]">
                    <td className="p-3 text-[#6b6b6b] font-medium">{channel.name}</td>
                    <td className="p-3 text-right text-[#6b6b6b]">€{channel.value.toFixed(2)}</td>
                    <td className="p-3 text-right text-[#6b6b6b]">{channel.orders}</td>
                    <td className="p-3 text-right text-[#6b6b6b]">
                      {((channel.value / processedData.totalRevenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NeumorphicCard>
      </div>

      {/* Delivery Apps Detailed Table */}
      {processedData.deliveryAppBreakdown.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Dettaglio App Delivery</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">App</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Revenue</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Ordini</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Scontrino Medio</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">% Revenue Totale</th>
                </tr>
              </thead>
              <tbody>
                {processedData.deliveryAppBreakdown.map((app, index) => (
                  <tr key={index} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ background: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-[#6b6b6b] font-medium">{app.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-[#6b6b6b] font-bold">
                      €{app.value.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-[#6b6b6b]">
                      {app.orders}
                    </td>
                    <td className="p-3 text-right text-[#6b6b6b]">
                      €{(app.value / app.orders).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-[#6b6b6b]">
                      {((app.value / processedData.totalRevenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#8b7355] font-bold">
                  <td className="p-3 text-[#6b6b6b]">TOTALE DELIVERY</td>
                  <td className="p-3 text-right text-[#6b6b6b]">
                    €{processedData.deliveryAppBreakdown.reduce((sum, app) => sum + app.value, 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-[#6b6b6b]">
                    {processedData.deliveryAppBreakdown.reduce((sum, app) => sum + app.orders, 0)}
                  </td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right text-[#6b6b6b]">
                    {((processedData.deliveryAppBreakdown.reduce((sum, app) => sum + app.value, 0) / processedData.totalRevenue) * 100).toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </NeumorphicCard>
      )}

      {/* Daily Revenue Details Table */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Dettaglio Giornaliero</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#8b7355]">
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Revenue</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Ordini</th>
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Scontrino Medio</th>
              </tr>
            </thead>
            <tbody>
              {processedData.dailyRevenue.slice(-14).reverse().map((day, index) => (
                <tr key={index} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                  <td className="p-3 text-[#6b6b6b]">{day.date}</td>
                  <td className="p-3 text-right text-[#6b6b6b] font-bold">
                    €{day.revenue.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-[#6b6b6b]">
                    {day.orders}
                  </td>
                  <td className="p-3 text-right text-[#6b6b6b]">
                    €{day.avgValue.toFixed(2)}
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
