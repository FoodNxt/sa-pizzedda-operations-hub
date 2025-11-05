
import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, ShoppingCart, TrendingUp, Clock, Zap, Filter, Store, RefreshCw } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfDay, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

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

  const COLORS = ['#8b7355', '#a68a6a', '#c1a07f', '#dcb794', '#6b5d51', '#9d8770'];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-12">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Clock className="w-8 h-8 text-[#8b7355]" />
          </div>
          <p className="text-[#9b9b9b]">Caricamento dati in tempo reale...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-[#8b7355]" />
              <h1 className="text-3xl font-bold text-[#6b6b6b]">Real Time Dashboard</h1>
            </div>
            <p className="text-[#9b9b9b]">Monitoraggio in tempo reale della giornata corrente (dati iPratico)</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`neumorphic-flat px-4 py-3 rounded-xl flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-all ${
                isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="font-medium">Aggiorna Dati</span>
            </button>
            <div className="text-right">
              <p className="text-sm text-[#9b9b9b] mb-1">Ultimo aggiornamento</p>
              <div className="flex items-center gap-2 neumorphic-pressed px-4 py-2 rounded-xl">
                <Clock className="w-4 h-4 text-[#8b7355]" />
                <span className="text-[#6b6b6b] font-medium">
                  {format(lastUpdateTime, 'HH:mm:ss')}
                </span>
              </div>
              <p className="text-xs text-[#9b9b9b] mt-1">Auto-refresh ogni 30s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Filtri</h2>
        </div>
        <div>
          <label htmlFor="store-select" className="text-sm text-[#9b9b9b] mb-2 block">Locale</label>
          <select
            id="store-select"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full md:w-64 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Locali</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      </NeumorphicCard>

      {/* Date Badge */}
      <NeumorphicCard className="p-4 text-center border-2 border-[#8b7355]">
        <p className="text-[#9b9b9b] text-sm mb-1">Dati di oggi</p>
        <h2 className="text-2xl font-bold text-[#8b7355]">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: it })}
        </h2>
        {selectedStore !== 'all' && (
          <p className="text-sm text-[#9b9b9b] mt-1">
            Locale: {stores.find(s => s.id === selectedStore)?.name || 'N/A'}
          </p>
        )}
      </NeumorphicCard>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Revenue Totale</p>
              <h3 className="text-4xl font-bold text-[#6b6b6b]">
                €{todayData.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-[#9b9b9b] mt-2">Oggi</p>
            </div>
            <div className="neumorphic-flat p-4 rounded-full">
              <DollarSign className="w-8 h-8 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Ordini Totali</p>
              <h3 className="text-4xl font-bold text-[#6b6b6b]">
                {todayData.totalOrders}
              </h3>
              <p className="text-xs text-[#9b9b9b] mt-2">Ordini completati</p>
            </div>
            <div className="neumorphic-flat p-4 rounded-full">
              <ShoppingCart className="w-8 h-8 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#9b9b9b] mb-2">Scontrino Medio</p>
              <h3 className="text-4xl font-bold text-[#6b6b6b]">
                €{todayData.avgOrderValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-[#9b9b9b] mt-2">Per ordine</p>
            </div>
            <div className="neumorphic-flat p-4 rounded-full">
              <TrendingUp className="w-8 h-8 text-[#8b7355]" />
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Revenue per Negozio Table */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Store className="w-6 h-6 text-[#8b7355]" />
          <h2 className="text-xl font-bold text-[#6b6b6b]">Revenue per Negozio</h2>
        </div>
        
        {todayData.storeBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-4 text-[#9b9b9b] font-medium">Negozio</th>
                  <th className="text-right p-4 text-[#9b9b9b] font-medium">Revenue Totale</th>
                  <th className="text-right p-4 text-[#9b9b9b] font-medium">Ordini</th>
                  <th className="text-right p-4 text-[#9b9b9b] font-medium">Scontrino Medio</th>
                  <th className="text-right p-4 text-[#9b9b9b] font-medium">% Revenue Totale</th>
                </tr>
              </thead>
              <tbody>
                {todayData.storeBreakdown.map((store, index) => {
                  const totalRevenueOverall = todayData.storeBreakdown.reduce((sum, s) => sum + s.revenue, 0);
                  const percentage = totalRevenueOverall > 0 ? (store.revenue / totalRevenueOverall) * 100 : 0;
                  
                  return (
                    <tr 
                      key={store.store_id} 
                      className={`border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors ${
                        selectedStore === store.store_id ? 'bg-[#e8ecf3] neumorphic-flat' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ 
                              background: `hsl(${(index * 60) % 360}, 45%, 55%)` 
                            }}
                          />
                          <span className="text-[#6b6b6b] font-medium">{store.store_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-[#6b6b6b] font-bold text-lg">
                        €{store.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right text-[#6b6b6b]">
                        {store.orders}
                      </td>
                      <td className="p-4 text-right text-[#6b6b6b]">
                        €{store.avgOrderValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right text-[#6b6b6b] font-medium">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#8b7355] font-bold bg-[#e8ecf3] neumorphic-flat">
                  <td className="p-4 text-[#6b6b6b]">TOTALE</td>
                  <td className="p-4 text-right text-[#6b6b6b] text-lg">
                    €{todayData.storeBreakdown.reduce((sum, s) => sum + s.revenue, 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-[#6b6b6b]">
                    {todayData.storeBreakdown.reduce((sum, s) => sum + s.orders, 0)}
                  </td>
                  <td className="p-4 text-right text-[#6b6b6b]">
                    {todayData.storeBreakdown.reduce((sum, s) => sum + s.orders, 0) > 0 
                      ? `€${(todayData.storeBreakdown.reduce((sum, s) => sum + s.revenue, 0) / todayData.storeBreakdown.reduce((sum, s) => sum + s.orders, 0)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '€0.00'
                    }
                  </td>
                  <td className="p-4 text-right text-[#6b6b6b]">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-[#9b9b9b]">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessun dato negozio oggi</p>
          </div>
        )}
      </NeumorphicCard>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue per Canale di Vendita */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue per Canale di Vendita</h2>
          {todayData.channelBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={todayData.channelBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {todayData.channelBreakdown.map((entry, index) => (
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
              
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#c1c1c1]">
                      <th className="text-left p-2 text-[#9b9b9b] font-medium">Canale</th>
                      <th className="text-right p-2 text-[#9b9b9b] font-medium">Revenue</th>
                      <th className="text-right p-2 text-[#9b9b9b] font-medium">Ordini</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayData.channelBreakdown.map((channel, index) => (
                      <tr key={index} className="border-b border-[#d1d1d1]">
                        <td className="p-2 text-[#6b6b6b] font-medium">{channel.name}</td>
                        <td className="p-2 text-right text-[#6b6b6b]">€{channel.value.toFixed(2)}</td>
                        <td className="p-2 text-right text-[#6b6b6b]">{channel.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#9b9b9b]">
              Nessun dato disponibile per oggi
            </div>
          )}
        </NeumorphicCard>

        {/* Revenue per App Delivery */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Revenue per App Delivery</h2>
          {todayData.deliveryAppBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={todayData.deliveryAppBreakdown}>
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

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#c1c1c1]">
                      <th className="text-left p-2 text-[#9b9b9b] font-medium">App</th>
                      <th className="text-right p-2 text-[#9b9b9b] font-medium">Revenue</th>
                      <th className="text-right p-2 text-[#9b9b9b] font-medium">Ordini</th>
                      <th className="text-right p-2 text-[#9b9b9b] font-medium">€ Medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayData.deliveryAppBreakdown.map((app, index) => (
                      <tr key={index} className="border-b border-[#d1d1d1]">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ background: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-[#6b6b6b] font-medium">{app.name}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right text-[#6b6b6b] font-bold">
                          €{app.value.toFixed(2)}
                        </td>
                        <td className="p-2 text-right text-[#6b6b6b]">
                          {app.orders}
                        </td>
                        <td className="p-2 text-right text-[#6b6b6b]">
                          €{app.orders > 0 ? (app.value / app.orders).toFixed(2) : '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#8b7355] font-bold">
                      <td className="p-2 text-[#6b6b6b]">TOTALE DELIVERY</td>
                      <td className="p-2 text-right text-[#6b6b6b]">
                        €{todayData.deliveryAppBreakdown.reduce((sum, app) => sum + app.value, 0).toFixed(2)}
                      </td>
                      <td className="p-2 text-right text-[#6b6b6b]">
                        {todayData.deliveryAppBreakdown.reduce((sum, app) => sum + app.orders, 0)}
                      </td>
                      <td className="p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#9b9b9b]">
              Nessun ordine da app di delivery oggi
            </div>
          )}
        </NeumorphicCard>
      </div>

      {/* Summary Info */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-[#8b7355]" />
          <h3 className="text-lg font-bold text-[#6b6b6b]">Informazioni</h3>
        </div>
        <div className="neumorphic-pressed p-4 rounded-xl space-y-2 text-sm text-[#6b6b6b]">
          <p>📊 Questa dashboard mostra i dati iPratico in tempo reale della giornata corrente</p>
          <p>🔄 I dati si aggiornano automaticamente ogni 30 secondi</p>
          <p>💡 Fonte dati: iPratico (importato da Google Sheets)</p>
          <p>📍 La tabella "Revenue per Negozio" mostra i dati aggregati di tutti i locali per oggi</p>
        </div>
      </NeumorphicCard>
    </div>
  );
}
