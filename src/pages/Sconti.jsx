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
  const [activeView, setActiveView] = useState('sconti');
  const [dateFilter, setDateFilter] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  const { data: sconti = [], isLoading } = useQuery({
    queryKey: ['sconti'],
    queryFn: () => base44.entities.Sconto.list('-order_date'),
  });

  const { data: iPraticoData = [], isLoading: isLoadingIPratico } = useQuery({
    queryKey: ['ipratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date'),
  });

  const { data: financeConfigs = [] } = useQuery({
    queryKey: ['finance-configs'],
    queryFn: () => base44.entities.FinanceConfig.list(),
  });

  const [channelMapping, setChannelMapping] = React.useState({});
  const [appMapping, setAppMapping] = React.useState({});

  React.useEffect(() => {
    const activeConfig = financeConfigs.find(c => c.is_active);
    if (activeConfig) {
      setChannelMapping(activeConfig.channel_mapping || {});
      setAppMapping(activeConfig.app_mapping || {});
    }
  }, [financeConfigs]);

  const filteredSconti = useMemo(() => {
    let filtered = [...sconti];
    
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

    if (channelFilter !== 'all') {
      filtered = filtered.filter(s => (s.store_name || s.channel) === channelFilter);
    }

    return filtered;
  }, [sconti, dateFilter, customStartDate, customEndDate, channelFilter]);

  const filteredIPratico = useMemo(() => {
    let filtered = [...iPraticoData];
    
    const now = new Date();
    if (dateFilter === 'month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      filtered = filtered.filter(i => {
        const date = parseISO(i.order_date);
        return date >= start && date <= end;
      });
    } else if (dateFilter === 'year') {
      const start = startOfYear(now);
      const end = endOfYear(now);
      filtered = filtered.filter(i => {
        const date = parseISO(i.order_date);
        return date >= start && date <= end;
      });
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = parseISO(customStartDate);
      const end = parseISO(customEndDate);
      filtered = filtered.filter(i => {
        const date = parseISO(i.order_date);
        return date >= start && date <= end;
      });
    }

    if (channelFilter !== 'all') {
      filtered = filtered.filter(i => (i.store_name || i.channel) === channelFilter);
    }

    return filtered;
  }, [iPraticoData, dateFilter, customStartDate, customEndDate, channelFilter]);

  const stats = useMemo(() => {
    const totalDiscount = filteredSconti.reduce((sum, s) => sum + (s.total_discount_price || 0), 0);
    const avgDiscount = filteredSconti.length > 0 ? totalDiscount / filteredSconti.length : 0;
    
    const byChannel = {};
    filteredSconti.forEach(s => {
      const storeName = s.store_name || s.channel || 'Sconosciuto';
      if (!byChannel[storeName]) {
        byChannel[storeName] = { count: 0, total: 0 };
      }
      byChannel[storeName].count++;
      byChannel[storeName].total += s.total_discount_price || 0;
    });

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
      const appCount = [s.sourceApp_glovo, s.sourceApp_deliveroo, s.sourceApp_justeat, s.sourceApp_onlineordering, s.sourceApp_ordertable, s.sourceApp_tabesto, s.sourceApp_deliverect, s.sourceApp_store].filter(Boolean).length;
      const discountPortion = appCount > 0 ? (s.total_discount_price || 0) / appCount : 0;
      
      if (s.sourceApp_glovo) byApp.glovo += discountPortion;
      if (s.sourceApp_deliveroo) byApp.deliveroo += discountPortion;
      if (s.sourceApp_justeat) byApp.justeat += discountPortion;
      if (s.sourceApp_onlineordering) byApp.onlineordering += discountPortion;
      if (s.sourceApp_ordertable) byApp.ordertable += discountPortion;
      if (s.sourceApp_tabesto) byApp.tabesto += discountPortion;
      if (s.sourceApp_deliverect) byApp.deliverect += discountPortion;
      if (s.sourceApp_store) byApp.store += discountPortion;
    });

    return {
      totalDiscount,
      avgDiscount,
      totalOrders: filteredSconti.length,
      byChannel,
      byApp
    };
  }, [filteredSconti]);

  const grossSalesStats = useMemo(() => {
    const revenueByStore = {};
    filteredIPratico.forEach(item => {
      const storeName = item.store_name || item.channel || 'Sconosciuto';
      if (!revenueByStore[storeName]) {
        revenueByStore[storeName] = 0;
      }
      revenueByStore[storeName] += item.total_revenue || 0;
    });

    const discountByStore = {};
    filteredSconti.forEach(s => {
      const storeName = s.store_name || s.channel || 'Sconosciuto';
      if (!discountByStore[storeName]) {
        discountByStore[storeName] = 0;
      }
      discountByStore[storeName] += s.total_discount_price || 0;
    });

    const byStore = {};
    const allStores = [...new Set([...Object.keys(revenueByStore), ...Object.keys(discountByStore)])];
    
    allStores.forEach(storeName => {
      const revenue = revenueByStore[storeName] || 0;
      const discount = discountByStore[storeName] || 0;
      const grossSales = revenue + discount;
      const discountPercent = grossSales > 0 ? (discount / grossSales) * 100 : 0;
      
      byStore[storeName] = {
        revenue,
        discount,
        grossSales,
        discountPercent
      };
    });

    // Calculate by App using appMapping
    const byApp = {};
    filteredSconti.forEach(s => {
      const apps = [];
      if (s.sourceApp_glovo) apps.push(appMapping['glovo'] || 'glovo');
      if (s.sourceApp_deliveroo) apps.push(appMapping['deliveroo'] || 'deliveroo');
      if (s.sourceApp_justeat) apps.push(appMapping['justeat'] || 'justeat');
      if (s.sourceApp_onlineordering) apps.push(appMapping['onlineordering'] || 'onlineordering');
      if (s.sourceApp_ordertable) apps.push(appMapping['ordertable'] || 'ordertable');
      if (s.sourceApp_tabesto) apps.push(appMapping['tabesto'] || 'tabesto');
      if (s.sourceApp_deliverect) apps.push(appMapping['deliverect'] || 'deliverect');
      if (s.sourceApp_store) apps.push(appMapping['store'] || 'store');
      
      const portion = apps.length > 0 ? (s.total_discount_price || 0) / apps.length : 0;
      apps.forEach(app => {
        if (!byApp[app]) byApp[app] = { discount: 0, revenue: 0 };
        byApp[app].discount += portion;
      });
    });

    filteredIPratico.forEach(item => {
      const apps = [];
      if ((item.sourceApp_glovo || 0) > 0) apps.push({ key: appMapping['glovo'] || 'glovo', revenue: item.sourceApp_glovo || 0 });
      if ((item.sourceApp_deliveroo || 0) > 0) apps.push({ key: appMapping['deliveroo'] || 'deliveroo', revenue: item.sourceApp_deliveroo || 0 });
      if ((item.sourceApp_justeat || 0) > 0) apps.push({ key: appMapping['justeat'] || 'justeat', revenue: item.sourceApp_justeat || 0 });
      if ((item.sourceApp_onlineordering || 0) > 0) apps.push({ key: appMapping['onlineordering'] || 'onlineordering', revenue: item.sourceApp_onlineordering || 0 });
      if ((item.sourceApp_ordertable || 0) > 0) apps.push({ key: appMapping['ordertable'] || 'ordertable', revenue: item.sourceApp_ordertable || 0 });
      if ((item.sourceApp_tabesto || 0) > 0) apps.push({ key: appMapping['tabesto'] || 'tabesto', revenue: item.sourceApp_tabesto || 0 });
      if ((item.sourceApp_deliverect || 0) > 0) apps.push({ key: appMapping['deliverect'] || 'deliverect', revenue: item.sourceApp_deliverect || 0 });
      if ((item.sourceApp_store || 0) > 0) apps.push({ key: appMapping['store'] || 'store', revenue: item.sourceApp_store || 0 });
      
      apps.forEach(app => {
        if (!byApp[app.key]) byApp[app.key] = { discount: 0, revenue: 0 };
        byApp[app.key].revenue += app.revenue;
      });
    });

    // Calculate by Type using channelMapping
    const byType = {};
    filteredSconti.forEach(s => {
      const types = [];
      if (s.sourceType_delivery) types.push(channelMapping['delivery'] || 'delivery');
      if (s.sourceType_takeaway) types.push(channelMapping['takeaway'] || 'takeaway');
      if (s.sourceType_takeawayOnSite) types.push(channelMapping['takeawayOnSite'] || 'takeawayOnSite');
      if (s.sourceType_store) types.push(channelMapping['store'] || 'store');
      
      const portion = types.length > 0 ? (s.total_discount_price || 0) / types.length : 0;
      types.forEach(type => {
        if (!byType[type]) byType[type] = { discount: 0, revenue: 0 };
        byType[type].discount += portion;
      });
    });

    filteredIPratico.forEach(item => {
      const types = [];
      if ((item.sourceType_delivery || 0) > 0) types.push({ key: channelMapping['delivery'] || 'delivery', revenue: item.sourceType_delivery || 0 });
      if ((item.sourceType_takeaway || 0) > 0) types.push({ key: channelMapping['takeaway'] || 'takeaway', revenue: item.sourceType_takeaway || 0 });
      if ((item.sourceType_takeawayOnSite || 0) > 0) types.push({ key: channelMapping['takeawayOnSite'] || 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 });
      if ((item.sourceType_store || 0) > 0) types.push({ key: channelMapping['store'] || 'store', revenue: item.sourceType_store || 0 });
      
      types.forEach(type => {
        if (!byType[type.key]) byType[type.key] = { discount: 0, revenue: 0 };
        byType[type.key].revenue += type.revenue;
      });
    });

    // Calculate by Payment Method
    const byPayment = {};
    filteredSconti.forEach(s => {
      const methods = [];
      if (s.moneyType_bancomat) methods.push('bancomat');
      if (s.moneyType_cash) methods.push('cash');
      if (s.moneyType_online) methods.push('online');
      if (s.moneyType_satispay) methods.push('satispay');
      if (s.moneyType_credit_card) methods.push('credit_card');
      if (s.moneyType_fidelity_card_points) methods.push('fidelity_card_points');
      
      const portion = methods.length > 0 ? (s.total_discount_price || 0) / methods.length : 0;
      methods.forEach(method => {
        if (!byPayment[method]) byPayment[method] = { discount: 0, revenue: 0 };
        byPayment[method].discount += portion;
      });
    });

    filteredIPratico.forEach(item => {
      const methods = [];
      if ((item.moneyType_bancomat || 0) > 0) methods.push({ key: 'bancomat', revenue: item.moneyType_bancomat || 0 });
      if ((item.moneyType_cash || 0) > 0) methods.push({ key: 'cash', revenue: item.moneyType_cash || 0 });
      if ((item.moneyType_online || 0) > 0) methods.push({ key: 'online', revenue: item.moneyType_online || 0 });
      if ((item.moneyType_satispay || 0) > 0) methods.push({ key: 'satispay', revenue: item.moneyType_satispay || 0 });
      if ((item.moneyType_credit_card || 0) > 0) methods.push({ key: 'credit_card', revenue: item.moneyType_credit_card || 0 });
      if ((item.moneyType_fidelity_card_points || 0) > 0) methods.push({ key: 'fidelity_card_points', revenue: item.moneyType_fidelity_card_points || 0 });
      
      methods.forEach(method => {
        if (!byPayment[method.key]) byPayment[method.key] = { discount: 0, revenue: 0 };
        byPayment[method.key].revenue += method.revenue;
      });
    });

    const totalRevenue = Object.values(revenueByStore).reduce((sum, v) => sum + v, 0);
    const totalDiscount = Object.values(discountByStore).reduce((sum, v) => sum + v, 0);
    const totalGrossSales = totalRevenue + totalDiscount;
    const avgDiscountPercent = totalGrossSales > 0 ? (totalDiscount / totalGrossSales) * 100 : 0;

    return {
      byStore,
      byApp,
      byType,
      byPayment,
      totalRevenue,
      totalDiscount,
      totalGrossSales,
      avgDiscountPercent
    };
  }, [filteredIPratico, filteredSconti, appMapping, channelMapping]);

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

  const grossSalesChartData = useMemo(() => {
    return Object.entries(grossSalesStats.byStore).map(([storeName, data]) => ({
      name: storeName,
      grossSales: parseFloat(data.grossSales.toFixed(2)),
      revenue: parseFloat(data.revenue.toFixed(2)),
      sconto: parseFloat(data.discount.toFixed(2)),
      percentualeSconto: parseFloat(data.discountPercent.toFixed(2))
    }));
  }, [grossSalesStats.byStore]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const uniqueChannels = useMemo(() => {
    return [...new Set(sconti.map(s => s.store_name || s.channel).filter(Boolean))];
  }, [sconti]);

  return (
    <ProtectedPage pageName="Sconti">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Analisi Sconti</h1>
          <p className="text-slate-500">Monitora gli sconti applicati agli ordini</p>
        </div>

        <NeumorphicCard className="p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('sconti')}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                activeView === 'sconti' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Sconti
            </button>
            <button
              onClick={() => setActiveView('grossSales')}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                activeView === 'grossSales' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Gross Sales
            </button>
          </div>
        </NeumorphicCard>

        {activeView === 'sconti' && (
          <div className="space-y-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              <NeumorphicCard className="p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Sconti per App</h2>
                {appChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={appChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        formatter={(value) => `€${value}`}
                      />
                      <Legend />
                      <Bar dataKey="value" fill="#ef4444" name="Sconti (€)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-slate-400 py-12">Nessun dato disponibile</p>
                )}
              </NeumorphicCard>
            </div>

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
        )}

        {activeView === 'grossSales' && (
          <div className="space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <NeumorphicCard className="p-6 text-center">
                <BarChart3 className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-blue-600">€{grossSalesStats.totalGrossSales.toFixed(0)}</p>
                <p className="text-sm text-slate-600 mt-1">Gross Sales</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <TrendingDown className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-green-600">€{grossSalesStats.totalRevenue.toFixed(0)}</p>
                <p className="text-sm text-slate-600 mt-1">Net Sales</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <TrendingDown className="w-10 h-10 text-red-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-red-600">€{grossSalesStats.totalDiscount.toFixed(0)}</p>
                <p className="text-sm text-slate-600 mt-1">Sconti Totali</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <Calendar className="w-10 h-10 text-orange-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-orange-600">{grossSalesStats.avgDiscountPercent.toFixed(2)}%</p>
                <p className="text-sm text-slate-600 mt-1">% Sconto Media</p>
              </NeumorphicCard>
            </div>

            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Gross Sales per Store</h2>
              {grossSalesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={grossSalesChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value) => `€${value}`}
                    />
                    <Legend />
                    <Bar dataKey="grossSales" fill="#3b82f6" name="Gross Sales (€)" />
                    <Bar dataKey="revenue" fill="#10b981" name="Net Revenue (€)" />
                    <Bar dataKey="sconto" fill="#ef4444" name="Sconti (€)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-400 py-12">Nessun dato disponibile</p>
              )}
            </NeumorphicCard>

            <div className="grid grid-cols-1 gap-6">
              <NeumorphicCard className="p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 pb-3 border-b-2 border-blue-500">Per App</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                       <tr className="border-b-2 border-slate-300">
                         <th className="text-left p-3 text-sm font-bold text-slate-700">App</th>
                         <th className="text-right p-3 text-sm font-bold text-slate-700">Gross</th>
                         <th className="text-right p-3 text-sm font-bold text-slate-700">Net Sales</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">Sconto</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(grossSalesStats.byApp)
                        .filter(([_, stats]) => stats.discount > 0 || stats.revenue > 0)
                        .sort(([_, a], [__, b]) => (b.revenue + b.discount) - (a.revenue + a.discount))
                        .map(([app, stats], idx) => {
                          const gross = stats.revenue + stats.discount;
                          const pct = gross > 0 ? (stats.discount / gross) * 100 : 0;
                          return (
                            <tr key={app} className={`border-b border-slate-200 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                              <td className="p-3 text-sm font-medium text-slate-700">{app.charAt(0).toUpperCase() + app.slice(1)}</td>
                              <td className="p-3 text-right text-sm font-bold text-blue-600">€{gross.toFixed(0)}</td>
                              <td className="p-3 text-right text-sm text-green-600">€{stats.revenue.toFixed(0)}</td>
                              <td className="p-3 text-right text-sm text-red-600">€{stats.discount.toFixed(0)}</td>
                              <td className="p-3 text-right text-sm font-bold text-orange-600">{pct.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </NeumorphicCard>

              <NeumorphicCard className="p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 pb-3 border-b-2 border-green-500">Per Tipo</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                       <tr className="border-b-2 border-slate-300">
                         <th className="text-left p-3 text-sm font-bold text-slate-700">Tipo</th>
                         <th className="text-right p-3 text-sm font-bold text-slate-700">Gross</th>
                         <th className="text-right p-3 text-sm font-bold text-slate-700">Net Sales</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">Sconto</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(grossSalesStats.byType)
                        .filter(([_, stats]) => stats.discount > 0 || stats.revenue > 0)
                        .sort(([_, a], [__, b]) => (b.revenue + b.discount) - (a.revenue + a.discount))
                        .map(([type, stats], idx) => {
                          const gross = stats.revenue + stats.discount;
                          const pct = gross > 0 ? (stats.discount / gross) * 100 : 0;
                          return (
                            <tr key={type} className={`border-b border-slate-200 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                              <td className="p-3 text-sm font-medium text-slate-700">{type.charAt(0).toUpperCase() + type.slice(1)}</td>
                              <td className="p-3 text-right text-sm font-bold text-blue-600">€{gross.toFixed(0)}</td>
                              <td className="p-3 text-right text-sm text-green-600">€{stats.revenue.toFixed(0)}</td>
                              <td className="p-3 text-right text-sm text-red-600">€{stats.discount.toFixed(0)}</td>
                              <td className="p-3 text-right text-sm font-bold text-orange-600">{pct.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </NeumorphicCard>

              <NeumorphicCard className="p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 pb-3 border-b-2 border-purple-500">Per Pagamento</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                       <tr className="border-b-2 border-slate-300">
                         <th className="text-left p-3 text-sm font-bold text-slate-700">Metodo</th>
                         <th className="text-right p-3 text-sm font-bold text-slate-700">Gross</th>
                         <th className="text-right p-3 text-sm font-bold text-slate-700">Net Sales</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">Sconto</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const methodLabels = {
                          'bancomat': 'Bancomat',
                          'cash': 'Contanti',
                          'online': 'Online',
                          'satispay': 'Satispay',
                          'credit_card': 'Carta',
                          'fidelity_card_points': 'Punti Fidelity'
                        };
                        
                        return Object.entries(grossSalesStats.byPayment)
                          .filter(([_, stats]) => stats.discount > 0 || stats.revenue > 0)
                          .sort(([_, a], [__, b]) => (b.revenue + b.discount) - (a.revenue + a.discount))
                          .map(([method, stats], idx) => {
                            const gross = stats.revenue + stats.discount;
                            const pct = gross > 0 ? (stats.discount / gross) * 100 : 0;
                            return (
                              <tr key={method} className={`border-b border-slate-200 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                <td className="p-3 text-sm font-medium text-slate-700">{methodLabels[method] || method}</td>
                                <td className="p-3 text-right text-sm font-bold text-blue-600">€{gross.toFixed(0)}</td>
                                <td className="p-3 text-right text-sm text-green-600">€{stats.revenue.toFixed(0)}</td>
                                <td className="p-3 text-right text-sm text-red-600">€{stats.discount.toFixed(0)}</td>
                                <td className="p-3 text-right text-sm font-bold text-orange-600">{pct.toFixed(1)}%</td>
                              </tr>
                            );
                          });
                      })()}
                    </tbody>
                  </table>
                </div>
              </NeumorphicCard>
            </div>

            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Dettaglio per Store</h2>
              
              {isLoadingIPratico || isLoading ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Caricamento...</p>
                </div>
              ) : grossSalesChartData.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400">Nessun dato disponibile</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left p-3 text-sm font-bold text-slate-700">Store</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">Gross Sales</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">Net Revenue</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">Sconti</th>
                        <th className="text-right p-3 text-sm font-bold text-slate-700">% Sconto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grossSalesChartData.map((item, idx) => (
                        <tr key={item.name} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                          <td className="p-3 text-sm font-medium text-slate-700">{item.name}</td>
                          <td className="p-3 text-sm font-bold text-right text-blue-600">€{item.grossSales.toFixed(2)}</td>
                          <td className="p-3 text-sm text-right text-green-600">€{item.revenue.toFixed(2)}</td>
                          <td className="p-3 text-sm text-right text-red-600">€{item.sconto.toFixed(2)}</td>
                          <td className="p-3 text-sm font-bold text-right text-orange-600">{item.percentualeSconto.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}