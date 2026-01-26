import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { TrendingDown, Calendar, Filter, Download, BarChart3 } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Sconti() {
  const [dateFilter, setDateFilter] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  const { data: sconti = [], isLoading } = useQuery({
    queryKey: ['sconti'],
    queryFn: () => base44.entities.Sconto.list('-order_date'),
  });

  const filteredSconti = useMemo(() => {
    let filtered = [...sconti];
    
    // Filtra per data
    const now = new Date();
    if (dateFilter === 'month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      filtered = filtered.filter(s => {
        const date = parseISO(s.order_date);
        return date >= start && date <= end;
      });
    } else if (dateFilter === 'year') {
      const start = startOfYear(now);
      const end = endOfYear(now);
      filtered = filtered.filter(s => {
        const date = parseISO(s.order_date);
        return date >= start && date <= end;
      });
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = parseISO(customStartDate);
      const end = parseISO(customEndDate);
      filtered = filtered.filter(s => {
        const date = parseISO(s.order_date);
        return date >= start && date <= end;
      });
    }

    // Filtra per store
    if (channelFilter !== 'all') {
      filtered = filtered.filter(s => (s.store_name || s.channel) === channelFilter);
    }

    return filtered;
  }, [sconti, dateFilter, customStartDate, customEndDate, channelFilter]);

  const stats = useMemo(() => {
    const totalDiscount = filteredSconti.reduce((sum, s) => sum + (s.total_discount_price || 0), 0);
    const avgDiscount = filteredSconti.length > 0 ? totalDiscount / filteredSconti.length : 0;
    
    // Sconti per store
    const byChannel = {};
    filteredSconti.forEach(s => {
      const storeName = s.store_name || s.channel || 'Sconosciuto';
      if (!byChannel[storeName]) {
        byChannel[storeName] = { count: 0, total: 0 };
      }
      byChannel[storeName].count++;
      byChannel[storeName].total += s.total_discount_price || 0;
    });

    // Sconti per app
    const byApp = {
      glovo: 0,
      deliveroo: 0,
      justeat: 0,
      onlineordering: 0,
      ordertable: 0,
      tabesto: 0,
      deliverect: 0,
      store: 0
    };
    filteredSconti.forEach(s => {
      if (s.sourceApp_glovo) byApp.glovo += s.total_discount_price || 0;
      if (s.sourceApp_deliveroo) byApp.deliveroo += s.total_discount_price || 0;
      if (s.sourceApp_justeat) byApp.justeat += s.total_discount_price || 0;
      if (s.sourceApp_onlineordering) byApp.onlineordering += s.total_discount_price || 0;
      if (s.sourceApp_ordertable) byApp.ordertable += s.total_discount_price || 0;
      if (s.sourceApp_tabesto) byApp.tabesto += s.total_discount_price || 0;
      if (s.sourceApp_deliverect) byApp.deliverect += s.total_discount_price || 0;
      if (s.sourceApp_store) byApp.store += s.total_discount_price || 0;
    });

    return {
      totalDiscount,
      avgDiscount,
      totalOrders: filteredSconti.length,
      byChannel,
      byApp
    };
  }, [filteredSconti]);

  const channelChartData = useMemo(() => {
    return Object.entries(stats.byChannel).map(([channel, data]) => ({
      name: channel,
      valore: parseFloat(data.total.toFixed(2)),
      ordini: data.count
    }));
  }, [stats.byChannel]);

  const appChartData = useMemo(() => {
    return Object.entries(stats.byApp)
      .filter(([_, value]) => value > 0)
      .map(([app, value]) => ({
        name: app.charAt(0).toUpperCase() + app.slice(1),
        value: parseFloat(value.toFixed(2))
      }));
  }, [stats.byApp]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const uniqueChannels = useMemo(() => {
    return [...new Set(sconti.map(s => s.store_name || s.channel).filter(Boolean))];
  }, [sconti]);

  return (
    <ProtectedPage pageName="Sconti">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Analisi Sconti</h1>
          <p className="text-slate-500">Monitora gli sconti applicati agli ordini</p>
        </div>

        {/* Filtri */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-800">Filtri</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Periodo</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="all">Tutti i dati</option>
                <option value="month">Mese Corrente</option>
                <option value="year">Anno Corrente</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Data Inizio</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Data Fine</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Store</label>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="all">Tutti gli store</option>
                {uniqueChannels.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>
          </div>
        </NeumorphicCard>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NeumorphicCard className="p-6 text-center">
            <TrendingDown className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <p className="text-3xl font-bold text-red-600">€{stats.totalDiscount.toFixed(2)}</p>
            <p className="text-sm text-slate-600 mt-1">Sconti Totali</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <BarChart3 className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <p className="text-3xl font-bold text-blue-600">{stats.totalOrders}</p>
            <p className="text-sm text-slate-600 mt-1">Ordini con Sconto</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <Calendar className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <p className="text-3xl font-bold text-green-600">€{stats.avgDiscount.toFixed(2)}</p>
            <p className="text-sm text-slate-600 mt-1">Sconto Medio</p>
          </NeumorphicCard>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sconti per Store */}
          <NeumorphicCard className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Sconti per Store</h2>
            {channelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    formatter={(value) => `€${value}`}
                  />
                  <Legend />
                  <Bar dataKey="valore" fill="#3b82f6" name="Valore Sconti (€)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 py-12">Nessun dato disponibile</p>
            )}
          </NeumorphicCard>

          {/* Sconti per App */}
          <NeumorphicCard className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Distribuzione per App</h2>
            {appChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={appChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {appChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `€${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 py-12">Nessun dato disponibile</p>
            )}
          </NeumorphicCard>
        </div>

        {/* Tabella Dettagli */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Dettaglio Sconti</h2>
            <p className="text-sm text-slate-500">{filteredSconti.length} risultati</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Caricamento...</p>
            </div>
          ) : filteredSconti.length === 0 ? (
            <div className="text-center py-12">
              <TrendingDown className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">Nessuno sconto trovato</p>
              <p className="text-sm text-slate-500 mt-2">
                Carica i dati tramite Zapier seguendo la guida in "Zapier Sconti"
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left p-3 text-sm font-bold text-slate-700">Data</th>
                    <th className="text-left p-3 text-sm font-bold text-slate-700">Store</th>
                    <th className="text-right p-3 text-sm font-bold text-slate-700">Sconto</th>
                    <th className="text-left p-3 text-sm font-bold text-slate-700">App</th>
                    <th className="text-left p-3 text-sm font-bold text-slate-700">Tipo</th>
                    <th className="text-left p-3 text-sm font-bold text-slate-700">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSconti.map((sconto, idx) => {
                    const sourceApp = [
                      sconto.sourceApp_glovo && 'Glovo',
                      sconto.sourceApp_deliveroo && 'Deliveroo',
                      sconto.sourceApp_justeat && 'JustEat',
                      sconto.sourceApp_onlineordering && 'Online Ordering',
                      sconto.sourceApp_ordertable && 'OrderTable',
                      sconto.sourceApp_tabesto && 'Tabesto',
                      sconto.sourceApp_deliverect && 'Deliverect',
                      sconto.sourceApp_store && 'Store'
                    ].filter(Boolean).join(', ') || '-';

                    const sourceType = [
                      sconto.sourceType_delivery && 'Delivery',
                      sconto.sourceType_takeaway && 'Takeaway',
                      sconto.sourceType_takeawayOnSite && 'Takeaway On Site',
                      sconto.sourceType_store && 'Store'
                    ].filter(Boolean).join(', ') || '-';

                    const moneyType = [
                      sconto.moneyType_bancomat && 'Bancomat',
                      sconto.moneyType_cash && 'Contanti',
                      sconto.moneyType_online && 'Online',
                      sconto.moneyType_satispay && 'Satispay',
                      sconto.moneyType_credit_card && 'Carta',
                      sconto.moneyType_fidelity_card_points && 'Punti Fidelity'
                    ].filter(Boolean).join(', ') || '-';

                    return (
                      <tr key={sconto.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="p-3 text-sm text-slate-700">
                          {format(parseISO(sconto.order_date), 'dd MMM yyyy', { locale: it })}
                        </td>
                        <td className="p-3 text-sm text-slate-700">
                          {sconto.store_name || sconto.channel || '-'}
                          {!sconto.store_id && sconto.channel && (
                            <span className="ml-2 text-xs text-orange-600">(non trovato)</span>
                          )}
                        </td>
                        <td className="p-3 text-sm font-bold text-right text-red-600">
                          €{sconto.total_discount_price.toFixed(2)}
                        </td>
                        <td className="p-3 text-xs text-slate-600">{sourceApp}</td>
                        <td className="p-3 text-xs text-slate-600">{sourceType}</td>
                        <td className="p-3 text-xs text-slate-600">{moneyType}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>

        {/* Store Details */}
        <NeumorphicCard className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Riepilogo per Store</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byChannel).map(([channel, data]) => (
              <div key={channel} className="neumorphic-pressed p-4 rounded-xl">
                <h3 className="font-bold text-slate-800 mb-2">{channel}</h3>
                <p className="text-2xl font-bold text-red-600 mb-1">€{data.total.toFixed(2)}</p>
                <p className="text-sm text-slate-500">{data.count} ordini</p>
                <p className="text-xs text-slate-400 mt-1">
                  Media: €{(data.total / data.count).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}