
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, ShoppingCart, Truck, Filter, Calendar, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import ProtectedPage from "../components/ProtectedPage";

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

  // Helper function to safely parse dates
  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch (e) {
      return null;
    }
  };

  // Process and filter data
  const processedData = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    if (startDate || endDate) {
      // Ensure time components are set for accurate range filtering covering whole days
      cutoffDate = startDate ? safeParseDate(startDate + 'T00:00:00') : new Date(0); // Epoch start if no start date
      endFilterDate = endDate ? safeParseDate(endDate + 'T23:59:59') : new Date(); // Current time if no end date
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
          const itemDateStart = safeParseDate(item.order_date + 'T00:00:00');
          const itemDateEnd = safeParseDate(item.order_date + 'T23:59:59');
          
          // Check if dates are valid
          if (!itemDateStart || !itemDateEnd) {
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
      .sort((a, b) => {
        const dateA = safeParseDate(a.date);
        const dateB = safeParseDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      })
      .map(d => {
        try {
          const parsedDate = safeParseDate(d.date);
          return {
            date: parsedDate ? format(parsedDate, 'dd/MM') : 'N/A',
            revenue: parseFloat(d.revenue.toFixed(2)),
            orders: d.orders,
            avgValue: d.orders > 0 ? parseFloat((d.revenue / d.orders).toFixed(2)) : 0
          };
        } catch (e) {
          return {
            date: 'N/A',
            revenue: parseFloat(d.revenue.toFixed(2)),
            orders: d.orders,
            avgValue: d.orders > 0 ? parseFloat((d.revenue / d.orders).toFixed(2)) : 0
          };
        }
      })
      .filter(d => d.date !== 'N/A');

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

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30');
  };

  return (
    <ProtectedPage pageName="Financials">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Analisi Finanziaria
          </h1>
          <p className="text-sm text-slate-500">Dati iPratico</p>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Locale</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="all">Tutti i Locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-2 block">Periodo</label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  if (e.target.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="7">Ultimi 7 giorni</option>
                <option value="30">Ultimi 30 giorni</option>
                <option value="90">Ultimi 90 giorni</option>
                <option value="365">Ultimo anno</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Inizio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Fine</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </NeumorphicCard>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-3 shadow-lg">
                <DollarSign className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-1">
                €{(processedData.totalRevenue / 1000).toFixed(1)}k
              </h3>
              <p className="text-xs text-slate-500">Revenue</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg">
                <TrendingUp className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                {processedData.totalOrders}
              </h3>
              <p className="text-xs text-slate-500">Ordini</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-3 shadow-lg">
                <DollarSign className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-1">
                €{processedData.avgOrderValue.toFixed(2)}
              </h3>
              <p className="text-xs text-slate-500">Medio</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-3 shadow-lg">
                <Truck className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                {processedData.deliveryAppBreakdown.reduce((sum, app) => sum + app.orders, 0)}
              </h3>
              <p className="text-xs text-slate-500">Delivery</p>
            </div>
          </NeumorphicCard>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Trend Giornaliero</h2>
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: '300px' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={processedData.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#3b82f6"
                      tick={{ fontSize: 11 }}
                      width={50}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      stroke="#22c55e"
                      tick={{ fontSize: 11 }}
                      width={50}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(248, 250, 252, 0.95)', 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                      formatter={(value) => `€${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      name="Revenue" 
                      dot={{ fill: '#3b82f6', r: 3 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="avgValue" 
                      stroke="#22c55e" 
                      strokeWidth={2} 
                      name="Medio"
                      dot={{ fill: '#22c55e', r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Revenue per Locale</h2>
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: '300px' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={processedData.storeBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      width={60}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(248, 250, 252, 0.95)', 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                      formatter={(value) => `€${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar 
                      dataKey="revenue" 
                      fill="url(#storeGradient)" 
                      name="Revenue" 
                      radius={[8, 8, 0, 0]} 
                    />
                    <defs>
                      <linearGradient id="storeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </NeumorphicCard>
        </div>

        {/* Tables - Mobile Optimized */}
        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Dettaglio Locali</h2>
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Locale</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Revenue</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Ordini</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">€ Medio</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.storeBreakdown.map((store, index) => (
                    <tr key={index} className="border-b border-slate-200">
                      <td className="p-2 lg:p-3 text-slate-700 font-medium text-sm">{store.name}</td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">€{store.revenue.toFixed(2)}</td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">{store.orders}</td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">€{store.avgValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Canale Vendita</h2>
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-[450px]">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Canale</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Revenue</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Ordini</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">%</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.channelBreakdown.map((channel, index) => (
                    <tr key={index} className="border-b border-slate-200">
                      <td className="p-2 lg:p-3 text-slate-700 font-medium text-sm">{channel.name}</td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">€{channel.value.toFixed(2)}</td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">{channel.orders}</td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                        {processedData.totalRevenue > 0 ? ((channel.value / processedData.totalRevenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
        </div>

        {/* Delivery Apps Table */}
        {processedData.deliveryAppBreakdown.length > 0 && (
          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">App Delivery</h2>
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">App</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Revenue</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Ordini</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">€ Medio</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">%</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.deliveryAppBreakdown.map((app, index) => (
                    <tr key={index} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ background: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-slate-700 font-medium text-sm">{app.name}</span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 font-bold text-sm">
                        €{app.value.toFixed(2)}
                      </td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                        {app.orders}
                      </td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                        €{(app.orders > 0 ? (app.value / app.orders) : 0).toFixed(2)}
                      </td>
                      <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                        {processedData.totalRevenue > 0 ? ((app.value / processedData.totalRevenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}
