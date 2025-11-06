
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, ShoppingCart, Truck, Filter, Calendar, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';

export default function Financials() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // selectedChannel and selectedDeliveryApp states removed as per changes

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: iPraticoData = [], isLoading } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000), // Fetches up to 1000 records, sorted by order_date
  });

  // Process and filter data
  const processedData = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    if (startDate || endDate) {
      // Ensure time components are set for accurate range filtering covering whole days
      cutoffDate = startDate ? parseISO(startDate + 'T00:00:00') : new Date(0); // Epoch start if no start date
      endFilterDate = endDate ? parseISO(endDate + 'T23:59:59') : new Date(); // Current time if no end date
    } else {
      const days = parseInt(dateRange, 10); // Parse string to number
      cutoffDate = subDays(new Date(), days);
      // For non-custom ranges, assume we want data up to the end of the current day
      endFilterDate = new Date(); 
    }
    
    let filtered = iPraticoData.filter(item => {
      // Date filter
      if (item.order_date) {
        try {
          // iPratico data's order_date is assumed to be 'YYYY-MM-DD'.
          // To compare against cutoffDate and endFilterDate (which include time),
          // we define the full day range for the item's order_date.
          const itemDateStart = parseISO(item.order_date + 'T00:00:00');
          const itemDateEnd = parseISO(item.order_date + 'T23:59:59');
          
          // Check if dates are valid
          if (isNaN(itemDateStart.getTime()) || isNaN(itemDateEnd.getTime())) {
            return false;
          }

          // Check for overlap: an item is within range if its start date is before or equal to the filter's end date,
          // AND its end date is after or equal to the filter's start date.
          if (isBefore(itemDateEnd, cutoffDate) || isAfter(itemDateStart, endFilterDate)) {
            return false;
          }
        } catch (e) {
          return false; // Skip items with invalid dates
        }
      }
      
      // Store filter
      if (selectedStore !== 'all' && item.store_id !== selectedStore) return false;
      
      return true;
    });

    // Calculate totals
    const totalRevenue = filtered.reduce((sum, item) => 
      sum + (item.total_revenue || 0), 0
    );
    
    const totalOrders = filtered.reduce((sum, item) => 
      sum + (item.total_orders || 0), 0
    );
    
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Revenue by date (group by day)
    const revenueByDate = {};
    
    filtered.forEach(item => {
      if (item.order_date) {
        const date = item.order_date; // Use the raw date string for grouping
        if (!revenueByDate[date]) {
          revenueByDate[date] = { date, revenue: 0, orders: 0 };
        }
        revenueByDate[date].revenue += item.total_revenue || 0;
        revenueByDate[date].orders += item.total_orders || 0;
      }
    });

    const dailyRevenue = Object.values(revenueByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => ({
        date: format(parseISO(d.date), 'dd/MM'), // Ensure date is parsed before formatting
        revenue: parseFloat(d.revenue.toFixed(2)),
        orders: d.orders,
        avgValue: d.orders > 0 ? parseFloat((d.revenue / d.orders).toFixed(2)) : 0
      }));

    // Revenue by store
    const revenueByStore = {};
    
    filtered.forEach(item => {
      const storeName = item.store_name || 'Unknown';
      if (!revenueByStore[storeName]) {
        revenueByStore[storeName] = { name: storeName, revenue: 0, orders: 0 };
      }
      revenueByStore[storeName].revenue += item.total_revenue || 0;
      revenueByStore[storeName].orders += item.total_orders || 0;
    });

    const storeBreakdown = Object.values(revenueByStore)
      .sort((a, b) => b.revenue - a.revenue)
      .map(s => ({
        name: s.name,
        revenue: parseFloat(s.revenue.toFixed(2)),
        orders: s.orders,
        avgValue: s.orders > 0 ? parseFloat((s.revenue / s.orders).toFixed(2)) : 0
      }));

    // Revenue by source type (for channel breakdown)
    const revenueByType = {};
    
    filtered.forEach(item => {
      const types = [
        { key: 'delivery', revenue: item.sourceType_delivery || 0, orders: item.sourceType_delivery_orders || 0 },
        { key: 'takeaway', revenue: item.sourceType_takeaway || 0, orders: item.sourceType_takeaway_orders || 0 },
        { key: 'store', revenue: item.sourceType_store || 0, orders: item.sourceType_store_orders || 0 }
      ];
      
      types.forEach(type => {
        if (type.revenue > 0 || type.orders > 0) {
          if (!revenueByType[type.key]) {
            revenueByType[type.key] = { name: type.key, value: 0, orders: 0 };
          }
          revenueByType[type.key].value += type.revenue;
          revenueByType[type.key].orders += type.orders;
        }
      });
    });

    const channelBreakdown = Object.values(revenueByType)
      .sort((a, b) => b.value - a.value)
      .map(c => ({
        name: c.name.charAt(0).toUpperCase() + c.name.slice(1), // Capitalize for display
        value: parseFloat(c.value.toFixed(2)),
        orders: c.orders
      }));

    // Revenue by source app (for delivery app breakdown)
    const revenueByApp = {};
    
    filtered.forEach(item => {
      const apps = [
        { key: 'glovo', revenue: item.sourceApp_glovo || 0, orders: item.sourceApp_glovo_orders || 0 },
        { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0, orders: item.sourceApp_deliveroo_orders || 0 },
        { key: 'justeat', revenue: item.sourceApp_justeat || 0, orders: item.sourceApp_justeat_orders || 0 },
        { key: 'tabesto', revenue: item.sourceApp_tabesto || 0, orders: item.sourceApp_tabesto_orders || 0 },
        { key: 'store', revenue: item.sourceApp_store || 0, orders: item.sourceApp_store_orders || 0 }
      ];
      
      apps.forEach(app => {
        if (app.revenue > 0 || app.orders > 0) {
          if (!revenueByApp[app.key]) {
            revenueByApp[app.key] = { name: app.key, value: 0, orders: 0 };
          }
          revenueByApp[app.key].value += app.revenue;
          revenueByApp[app.key].orders += app.orders;
        }
      });
    });

    const deliveryAppBreakdown = Object.values(revenueByApp)
      .sort((a, b) => b.value - a.value)
      .map(a => ({
        name: a.name.charAt(0).toUpperCase() + a.name.slice(1), // Capitalize for display
        value: parseFloat(a.value.toFixed(2)),
        orders: a.orders
      }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      dailyRevenue,
      storeBreakdown,
      channelBreakdown, // This is now source type breakdown
      deliveryAppBreakdown // This is now source app breakdown
    };
  }, [iPraticoData, selectedStore, dateRange, startDate, endDate]);

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
        <p className="text-[#9b9b9b]">Analisi dettagliata ordini e revenue (dati iPratico)</p>
      </div>

      {/* Filters */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Filtri</h2>
        </div>
        {/* Adjusted grid-cols to 2 since channel and delivery app filters are removed */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
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
          {/* Removed sales channel and delivery app filters */}
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
                {processedData.deliveryAppBreakdown.reduce((sum, app) => sum + app.orders, 0).toLocaleString()}
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
        {/* Daily Revenue Trend */}
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
                formatter={(value, name, props) => {
                    if (props.dataKey === 'revenue' || props.dataKey === 'avgValue') {
                        return `€${value.toFixed(2)}`;
                    }
                    return value;
                }}
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
                  if (name === 'Revenue €') return `€${value.toFixed(2)}`;
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
        {/* Revenue by Sales Channel (Source Type) */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue per Canale di Vendita (Source Type)</h2>
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
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#9b9b9b]">
              Nessun dato disponibile
            </div>
          )}
        </NeumorphicCard>

        {/* Revenue by Delivery App (Source App) */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue per App Delivery (Source App)</h2>
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
                    if (name === 'Revenue €') return `€${value.toFixed(2)}`;
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

        {/* Channels Table (Source Type) */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Dettaglio per Canale (Source Type)</h2>
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
                      {processedData.totalRevenue > 0 ? ((channel.value / processedData.totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NeumorphicCard>
      </div>

      {/* Delivery Apps Detailed Table (Source App) */}
      {processedData.deliveryAppBreakdown.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Dettaglio App Delivery (Source App)</h2>
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
                      €{(app.orders > 0 ? (app.value / app.orders) : 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-[#6b6b6b]">
                      {processedData.totalRevenue > 0 ? ((app.value / processedData.totalRevenue) * 100).toFixed(1) : 0}%
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
                    {processedData.deliveryAppBreakdown.reduce((sum, app) => sum + app.orders, 0).toLocaleString()}
                  </td>
                  <td className="p-3"></td> {/* Scontrino Medio for total delivery apps is more complex if not a single entity, leaving blank for now */}
                  <td className="p-3 text-right text-[#6b6b6b]">
                    {processedData.totalRevenue > 0 ? ((processedData.deliveryAppBreakdown.reduce((sum, app) => sum + app.value, 0) / processedData.totalRevenue) * 100).toFixed(1) : 0}%
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
              {/* Displays all days within the selected filter range */}
              {processedData.dailyRevenue.map((day, index) => (
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
