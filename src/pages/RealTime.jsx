
import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, ShoppingCart, TrendingUp, Clock, Zap, Filter, Store, RefreshCw } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage"; // Added ProtectedPage import
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns'; // Removed parseISO and it from date-fns import

export default function RealTime() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  // Get today's iPratico data
  const { data: iPraticoData = [], isLoading } = useQuery({
    queryKey: ['iPratico-today'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return base44.entities.iPratico.filter({
        order_date: today
      }, '-order_date', 1000);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    onSuccess: () => {
      setLastUpdateTime(new Date());
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['iPratico-today'] });
    await queryClient.invalidateQueries({ queryKey: ['stores'] });
    setLastUpdateTime(new Date());
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Process today's data
  const todayData = useMemo(() => {
    // Filter by store if selected
    const filteredData = selectedStore !== 'all' 
      ? iPraticoData.filter(item => item.store_id === selectedStore)
      : iPraticoData;

    // Calculate total revenue and orders
    const totalRevenue = filteredData.reduce((sum, item) => 
      sum + (item.total_revenue || 0), 0
    );

    const totalOrders = filteredData.reduce((sum, item) => 
      sum + (item.total_orders || 0), 0
    );

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Revenue by store (always use all data for the table)
    const storeBreakdown = iPraticoData.map(item => ({
      store_id: item.store_id,
      store_name: item.store_name,
      revenue: item.total_revenue || 0,
      orders: item.total_orders || 0,
      avgOrderValue: item.total_orders > 0 
        ? (item.total_revenue || 0) / item.total_orders 
        : 0
    })).sort((a, b) => b.revenue - a.revenue);

    // Revenue by source app (for filtered data)
    const appBreakdown = [];
    filteredData.forEach(item => {
      if ((item.sourceApp_glovo || 0) > 0) {
        appBreakdown.push({
          name: 'Glovo',
          value: item.sourceApp_glovo || 0,
          orders: item.sourceApp_glovo_orders || 0
        });
      }
      if ((item.sourceApp_deliveroo || 0) > 0) {
        appBreakdown.push({
          name: 'Deliveroo',
          value: item.sourceApp_deliveroo || 0,
          orders: item.sourceApp_deliveroo_orders || 0
        });
      }
      if ((item.sourceApp_justeat || 0) > 0) {
        appBreakdown.push({
          name: 'JustEat',
          value: item.sourceApp_justeat || 0,
          orders: item.sourceApp_justeat_orders || 0
        });
      }
      if ((item.sourceApp_tabesto || 0) > 0) {
        appBreakdown.push({
          name: 'Tabesto',
          value: item.sourceApp_tabesto || 0,
          orders: item.sourceApp_tabesto_orders || 0
        });
      }
      if ((item.sourceApp_store || 0) > 0) {
        appBreakdown.push({
          name: 'Store',
          value: item.sourceApp_store || 0,
          orders: item.sourceApp_store_orders || 0
        });
      }
    });

    // Aggregate delivery apps by name
    const deliveryAppMap = {};
    appBreakdown.forEach(app => {
      if (!deliveryAppMap[app.name]) {
        deliveryAppMap[app.name] = { name: app.name, value: 0, orders: 0 };
      }
      deliveryAppMap[app.name].value += app.value;
      deliveryAppMap[app.name].orders += app.orders;
    });

    const deliveryAppBreakdown = Object.values(deliveryAppMap)
      .sort((a, b) => b.value - a.value)
      .map(a => ({
        name: a.name,
        value: parseFloat(a.value.toFixed(2)),
        orders: a.orders
      }));

    // Revenue by source type (for filtered data)
    const channelBreakdown = [];
    filteredData.forEach(item => {
      if ((item.sourceType_delivery || 0) > 0) {
        channelBreakdown.push({
          name: 'Delivery',
          value: item.sourceType_delivery || 0,
          orders: item.sourceType_delivery_orders || 0
        });
      }
      if ((item.sourceType_takeaway || 0) > 0) {
        channelBreakdown.push({
          name: 'Takeaway',
          value: item.sourceType_takeaway || 0,
          orders: item.sourceType_takeaway_orders || 0
        });
      }
      if ((item.sourceType_store || 0) > 0) {
        channelBreakdown.push({
          name: 'Store',
          value: item.sourceType_store || 0,
          orders: item.sourceType_store_orders || 0
        });
      }
    });

    // Aggregate channels by name
    const channelMap = {};
    channelBreakdown.forEach(channel => {
      if (!channelMap[channel.name]) {
        channelMap[channel.name] = { name: channel.name, value: 0, orders: 0 };
      }
      channelMap[channel.name].value += channel.value;
      channelMap[channel.name].orders += channel.orders;
    });

    const aggregatedChannels = Object.values(channelMap)
      .sort((a, b) => b.value - a.value)
      .map(c => ({
        name: c.name,
        value: parseFloat(c.value.toFixed(2)),
        orders: c.orders
      }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      storeBreakdown,
      channelBreakdown: aggregatedChannels,
      deliveryAppBreakdown,
    };
  }, [iPraticoData, selectedStore]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']; // Updated color palette

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage pageName="RealTime">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="mb-4 lg:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
                Real Time Dashboard
              </h1>
              <p className="text-sm text-slate-500">Monitoraggio in tempo reale (dati iPratico)</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`nav-button px-4 py-2.5 rounded-xl flex items-center gap-2 text-slate-700 ${
                  isRefreshing ? 'opacity-50' : 'hover:shadow-lg'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="font-medium text-sm">Aggiorna</span>
              </button>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Aggiornato</p>
                <div className="flex items-center gap-2 neumorphic-pressed px-3 py-1.5 rounded-xl">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-700 font-medium text-sm">
                    {format(lastUpdateTime, 'HH:mm:ss')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri</h2>
          </div>
          <div>
            <label htmlFor="store-select" className="text-sm text-slate-600 mb-2 block">Locale</label>
            <select
              id="store-select"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full md:w-64 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
            >
              <option value="all">Tutti i Locali</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </NeumorphicCard>

        {/* Main KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-2 lg:mb-3 shadow-lg">
                <DollarSign className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-1">
                €{(todayData.totalRevenue / 1000).toFixed(1)}k
              </h3>
              <p className="text-xs text-slate-500">Revenue</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2 lg:mb-3 shadow-lg">
                <ShoppingCart className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                {todayData.totalOrders}
              </h3>
              <p className="text-xs text-slate-500">Ordini</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-2 lg:mb-3 shadow-lg">
                <TrendingUp className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-base lg:text-lg font-bold text-slate-800 mb-1">
                €{todayData.avgOrderValue.toFixed(2)}
              </h3>
              <p className="text-xs text-slate-500">Medio</p>
            </div>
          </NeumorphicCard>
        </div>

        {/* Revenue per Negozio Table */}
        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-4 lg:mb-6">
            <Store className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Revenue per Negozio</h2>
          </div>
          
          {todayData.storeBreakdown.length > 0 ? (
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Negozio</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Revenue</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Ordini</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Medio</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">%</th>
                  </tr>
                </thead>
                <tbody>
                  {todayData.storeBreakdown.map((store, index) => {
                    const totalRevenueOverall = todayData.storeBreakdown.reduce((sum, s) => sum + s.revenue, 0);
                    const percentage = totalRevenueOverall > 0 ? (store.revenue / totalRevenueOverall) * 100 : 0;
                    
                    return (
                      <tr 
                        key={store.store_id} 
                        className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                          selectedStore === store.store_id ? 'bg-slate-50' : ''
                        }`}
                      >
                        <td className="p-2 lg:p-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ 
                                background: `hsl(${(index * 60) % 360}, 45%, 55%)` 
                              }}
                            />
                            <span className="text-slate-700 font-medium text-sm">{store.store_name}</span>
                          </div>
                        </td>
                        <td className="p-2 lg:p-3 text-right text-slate-800 font-bold text-sm lg:text-base">
                          €{store.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                          {store.orders}
                        </td>
                        <td className="p-2 lg:p-3 text-right text-slate-700 text-sm">
                          €{store.avgOrderValue.toFixed(2)}
                        </td>
                        <td className="p-2 lg:p-3 text-right text-slate-700 font-medium text-sm">
                          {percentage.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-blue-600 font-bold">
                    <td className="p-2 lg:p-3 text-slate-700">TOTALE</td>
                    <td className="p-2 lg:p-3 text-right text-slate-700 text-base">
                      €{todayData.storeBreakdown.reduce((sum, s) => sum + s.revenue, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 lg:p-3 text-right text-slate-700">
                      {todayData.storeBreakdown.reduce((sum, s) => sum + s.orders, 0)}
                    </td>
                    <td className="p-2 lg:p-3 text-right text-slate-700">
                      {todayData.storeBreakdown.reduce((sum, s) => sum + s.orders, 0) > 0 
                        ? `€${(todayData.storeBreakdown.reduce((sum, s) => sum + s.revenue, 0) / todayData.storeBreakdown.reduce((sum, s) => sum + s.orders, 0)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                        : '€0.00'
                      }
                    </td>
                    <td className="p-2 lg:p-3 text-right text-slate-700">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessun dato oggi</p>
            </div>
          )}
        </NeumorphicCard>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Revenue per Canale di Vendita */}
          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Canali Vendita</h2>
            {todayData.channelBreakdown.length > 0 ? (
              <>
                <div className="w-full overflow-x-auto">
                  <div style={{ minWidth: '250px' }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={todayData.channelBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {todayData.channelBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(248, 250, 252, 0.95)', 
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '11px'
                          }}
                          formatter={(value) => `€${value.toFixed(2)}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 mt-4">
                  <table className="w-full min-w-[300px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="text-left p-2 text-slate-600 font-medium text-xs">Canale</th>
                        <th className="text-right p-2 text-slate-600 font-medium text-xs">Revenue</th>
                        <th className="text-right p-2 text-slate-600 font-medium text-xs">Ordini</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayData.channelBreakdown.map((channel, index) => (
                        <tr key={index} className="border-b border-slate-200">
                          <td className="p-2 text-slate-700 font-medium text-sm">{channel.name}</td>
                          <td className="p-2 text-right text-slate-700 text-sm">€{channel.value.toFixed(2)}</td>
                          <td className="p-2 text-right text-slate-700 text-sm">{channel.orders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Nessun dato
              </div>
            )}
          </NeumorphicCard>

          {/* Revenue per App Delivery */}
          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">App Delivery</h2>
            {todayData.deliveryAppBreakdown.length > 0 ? (
              <>
                <div className="w-full overflow-x-auto">
                  <div style={{ minWidth: '250px' }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={todayData.deliveryAppBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis 
                          dataKey="name" 
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
                          formatter={(value, name) => {
                            if (name === 'Revenue') return `€${value.toFixed(2)}`;
                            return value;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="value" fill="#3b82f6" name="Revenue" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="orders" fill="#8b5cf6" name="Ordini" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 mt-4">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="text-left p-2 text-slate-600 font-medium text-xs">App</th>
                        <th className="text-right p-2 text-slate-600 font-medium text-xs">Revenue</th>
                        <th className="text-right p-2 text-slate-600 font-medium text-xs">Ordini</th>
                        <th className="text-right p-2 text-slate-600 font-medium text-xs">€ Medio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayData.deliveryAppBreakdown.map((app, index) => (
                        <tr key={index} className="border-b border-slate-200">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ background: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-slate-700 font-medium text-sm">{app.name}</span>
                            </div>
                          </td>
                          <td className="p-2 text-right text-slate-800 font-bold text-sm">
                            €{app.value.toFixed(2)}
                          </td>
                          <td className="p-2 text-right text-slate-700 text-sm">{app.orders}</td>
                          <td className="p-2 text-right text-slate-700 text-sm">
                            €{app.orders > 0 ? (app.value / app.orders).toFixed(2) : '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Nessun ordine delivery
              </div>
            )}
          </NeumorphicCard>
        </div>

        {/* Summary Info (preserved and styled to match new design) */}
        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="text-base lg:text-lg font-bold text-slate-800">Informazioni</h3>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl space-y-2 text-sm text-slate-700">
            <p>📊 Questa dashboard mostra i dati iPratico in tempo reale della giornata corrente</p>
            <p>🔄 I dati si aggiornano automaticamente ogni 30 secondi</p>
            <p>💡 Fonte dati: iPratico (importato da Google Sheets)</p>
            <p>📍 La tabella "Revenue per Negozio" mostra i dati aggregati di tutti i locali per oggi</p>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}
