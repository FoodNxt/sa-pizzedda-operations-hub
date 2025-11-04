
import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingCart, TrendingUp, Clock, Zap, Filter } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';

export default function RealTime() {
  const [selectedStore, setSelectedStore] = useState('all');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: orderItems = [], isLoading } = useQuery({
    queryKey: ['orderItems'],
    queryFn: () => base44.entities.OrderItem.list('-modifiedDate', 10000),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Process today's data
  const todayData = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Filter orders from today
    let todayOrders = orderItems.filter(item => {
      if (!item.modifiedDate) return false;
      const itemDate = new Date(item.modifiedDate);
      return isWithinInterval(itemDate, { start: todayStart, end: todayEnd });
    });

    // Filter by store if selected
    if (selectedStore !== 'all') {
      todayOrders = todayOrders.filter(item => item.store_id === selectedStore);
    }

    // Calculate total revenue
    const totalRevenue = todayOrders.reduce((sum, item) => 
      sum + (item.finalPriceWithSessionDiscountsAndSurcharges || 0), 0
    );

    // Count unique orders
    const uniqueOrders = [...new Set(todayOrders.map(item => item.order).filter(Boolean))];
    const totalOrders = uniqueOrders.length;

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get unique sales channels and delivery apps
    const salesChannels = new Set(todayOrders.map(o => o.saleTypeName).filter(Boolean));
    todayOrders.forEach(o => {
      if (o.sourceApp && o.sourceApp.toLowerCase() === 'tabesto') {
        salesChannels.add('Tabesto');
      }
    });

    // Revenue by sales channel
    const revenueByChannel = {};
    const ordersByChannel = {};
    
    todayOrders.forEach(item => {
      let channelName;
      if (item.sourceApp && item.sourceApp.toLowerCase() === 'tabesto') {
        channelName = 'Tabesto';
      } else {
        channelName = item.saleTypeName || 'Unknown';
      }

      if (!revenueByChannel[channelName]) {
        revenueByChannel[channelName] = { name: channelName, value: 0 };
        ordersByChannel[channelName] = new Set();
      }
      revenueByChannel[channelName].value += item.finalPriceWithSessionDiscountsAndSurcharges || 0;
      if (item.order) {
        ordersByChannel[channelName].add(item.order);
      }
    });

    const channelBreakdown = Object.values(revenueByChannel)
      .sort((a, b) => b.value - a.value)
      .map(c => ({
        name: c.name,
        value: parseFloat(c.value.toFixed(2)),
        orders: ordersByChannel[c.name].size
      }));

    // Revenue by delivery app
    const revenueByApp = {};
    const ordersByApp = {};
    
    todayOrders.forEach(item => {
      if (item.sourceApp && item.sourceApp.toLowerCase() !== 'tabesto') {
        const app = item.sourceApp;
        if (!revenueByApp[app]) {
          revenueByApp[app] = { name: app, value: 0 };
          ordersByApp[app] = new Set();
        }
        revenueByApp[app].value += item.finalPriceWithSessionDiscountsAndSurcharges || 0;
        if (item.order) {
          ordersByApp[app].add(item.order);
        }
      }
    });

    const deliveryAppBreakdown = Object.values(revenueByApp)
      .sort((a, b) => b.value - a.value)
      .map(a => ({
        name: a.name.charAt(0).toUpperCase() + a.name.slice(1),
        value: parseFloat(a.value.toFixed(2)),
        orders: ordersByApp[a.name].size
      }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      channelBreakdown,
      deliveryAppBreakdown,
      lastUpdate: new Date()
    };
  }, [orderItems, selectedStore]);

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
            <p className="text-[#9b9b9b]">Monitoraggio in tempo reale della giornata corrente</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#9b9b9b] mb-1">Ultimo aggiornamento</p>
            <div className="flex items-center gap-2 neumorphic-pressed px-4 py-2 rounded-xl">
              <Clock className="w-4 h-4 text-[#8b7355]" />
              <span className="text-[#6b6b6b] font-medium">
                {format(todayData.lastUpdate, 'HH:mm:ss')}
              </span>
            </div>
            <p className="text-xs text-[#9b9b9b] mt-1">Auto-refresh ogni 30s</p>
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
          <label className="text-sm text-[#9b9b9b] mb-2 block">Locale</label>
          <select
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
        {/* Revenue Totale */}
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

        {/* Ordini Totali */}
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

        {/* Scontrino Medio */}
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
              
              {/* Details Table */}
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

              {/* Details Table */}
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
                          €{(app.value / app.orders).toFixed(2)}
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
          <p>📊 Questa dashboard mostra i dati in tempo reale della giornata corrente (dalle 00:00 alle 23:59)</p>
          <p>🔄 I dati si aggiornano automaticamente ogni 30 secondi</p>
          <p>💡 Tutte le metriche sono calcolate solo sugli ordini completati oggi</p>
        </div>
      </NeumorphicCard>
    </div>
  );
}
