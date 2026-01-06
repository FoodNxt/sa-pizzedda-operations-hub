import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Filter, Calendar, X, Settings, Eye, EyeOff, Save } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO, isValid, addDays, subYears, eachDayOfInterval } from 'date-fns';
import ProtectedPage from "../components/ProtectedPage";

export default function Financials() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showRevenue, setShowRevenue] = useState(true);
  const [showAvgValue, setShowAvgValue] = useState(true);
  const [selectedStoresForTrend, setSelectedStoresForTrend] = useState([]);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [channelMapping, setChannelMapping] = useState({});
  const [appMapping, setAppMapping] = useState({});
  const [compareMode, setCompareMode] = useState('none');
  const [compareStartDate, setCompareStartDate] = useState('');
  const [compareEndDate, setCompareEndDate] = useState('');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedApps, setSelectedApps] = useState([]);

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: iPraticoData = [], isLoading } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000),
  });

  const { data: financeConfigs = [] } = useQuery({
    queryKey: ['finance-configs'],
    queryFn: () => base44.entities.FinanceConfig.list(),
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (configData) => {
      const existing = await base44.entities.FinanceConfig.list();
      for (const config of existing) {
        await base44.entities.FinanceConfig.update(config.id, { is_active: false });
      }
      return base44.entities.FinanceConfig.create({ ...configData, is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-configs'] });
    },
  });

  // Load configs
  React.useEffect(() => {
    const activeConfig = financeConfigs.find(c => c.is_active);
    if (activeConfig) {
      setChannelMapping(activeConfig.channel_mapping || {});
      setAppMapping(activeConfig.app_mapping || {});
    }
  }, [financeConfigs]);

  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      return date;
    } catch (e) {
      return null;
    }
  };

  const safeFormatDate = (date, formatString) => {
    if (!date || !isValid(date)) return 'N/A';
    try {
      return format(date, formatString);
    } catch (e) {
      return 'N/A';
    }
  };

  const processedData = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    if (startDate || endDate) {
      cutoffDate = startDate ? safeParseDate(startDate + 'T00:00:00') : new Date(0);
      endFilterDate = endDate ? safeParseDate(endDate + 'T23:59:59') : new Date();
    } else {
      const days = parseInt(dateRange, 10);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date(); 
    }
    
    let filtered = iPraticoData.filter(item => {
      if (!item.order_date) return false;
      
      const itemDateStart = safeParseDate(item.order_date + 'T00:00:00');
      const itemDateEnd = safeParseDate(item.order_date + 'T23:59:59');
      
      if (!itemDateStart || !itemDateEnd) return false;

      if (cutoffDate && isBefore(itemDateEnd, cutoffDate)) return false;
      if (endFilterDate && isAfter(itemDateStart, endFilterDate)) return false;
      
      if (selectedStore !== 'all' && item.store_id !== selectedStore) return false;
      
      return true;
    });

    const totalRevenue = filtered.reduce((sum, item) => 
      sum + (item.total_revenue || 0), 0
    );
    
    const totalOrders = filtered.reduce((sum, item) => 
      sum + (item.total_orders || 0), 0
    );
    
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Generate ALL days in range (including zero-revenue days)
    const allDaysInRange = cutoffDate && endFilterDate 
      ? eachDayOfInterval({ start: cutoffDate, end: endFilterDate })
      : [];

    const revenueByDate = {};
    
    // Initialize all days with 0
    allDaysInRange.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      revenueByDate[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
    });
    
    // Fill in actual data
    filtered.forEach(item => {
      if (!item.order_date) return;
      const date = item.order_date;
      if (!revenueByDate[date]) {
        revenueByDate[date] = { date, revenue: 0, orders: 0 };
      }
      revenueByDate[date].revenue += item.total_revenue || 0;
      revenueByDate[date].orders += item.total_orders || 0;
    });

    const dailyRevenue = Object.values(revenueByDate)
      .map(d => ({
        ...d,
        parsedDate: safeParseDate(d.date)
      }))
      .filter(d => d.parsedDate !== null)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .map(d => ({
        date: safeFormatDate(d.parsedDate, 'dd/MM'),
        revenue: parseFloat(d.revenue.toFixed(2)),
        orders: d.orders,
        avgValue: d.orders > 0 ? parseFloat((d.revenue / d.orders).toFixed(2)) : 0
      }))
      .filter(d => d.date !== 'N/A');

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

    const revenueByType = {};
    
    filtered.forEach(item => {
      const types = [
        { key: 'delivery', revenue: item.sourceType_delivery || 0, orders: item.sourceType_delivery_orders || 0 },
        { key: 'takeaway', revenue: item.sourceType_takeaway || 0, orders: item.sourceType_takeaway_orders || 0 },
        { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0, orders: item.sourceType_takeawayOnSite_orders || 0 },
        { key: 'store', revenue: item.sourceType_store || 0, orders: item.sourceType_store_orders || 0 }
      ];
      
      types.forEach(type => {
        if (type.revenue > 0 || type.orders > 0) {
          const mappedKey = channelMapping[type.key] || type.key;
          
          // Apply channel filter
          if (selectedChannels.length > 0 && !selectedChannels.includes(mappedKey)) {
            return;
          }
          
          if (!revenueByType[mappedKey]) {
            revenueByType[mappedKey] = { name: mappedKey, value: 0, orders: 0 };
          }
          revenueByType[mappedKey].value += type.revenue;
          revenueByType[mappedKey].orders += type.orders;
        }
      });
    });

    const channelBreakdown = Object.values(revenueByType)
      .sort((a, b) => b.value - a.value)
      .map(c => ({
        name: c.name.charAt(0).toUpperCase() + c.name.slice(1),
        value: parseFloat(c.value.toFixed(2)),
        orders: c.orders
      }));

    const revenueByApp = {};
    
    filtered.forEach(item => {
      const apps = [
        { key: 'glovo', revenue: item.sourceApp_glovo || 0, orders: item.sourceApp_glovo_orders || 0 },
        { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0, orders: item.sourceApp_deliveroo_orders || 0 },
        { key: 'justeat', revenue: item.sourceApp_justeat || 0, orders: item.sourceApp_justeat_orders || 0 },
        { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0, orders: item.sourceApp_onlineordering_orders || 0 },
        { key: 'ordertable', revenue: item.sourceApp_ordertable || 0, orders: item.sourceApp_ordertable_orders || 0 },
        { key: 'tabesto', revenue: item.sourceApp_tabesto || 0, orders: item.sourceApp_tabesto_orders || 0 },
        { key: 'store', revenue: item.sourceApp_store || 0, orders: item.sourceApp_store_orders || 0 }
      ];
      
      apps.forEach(app => {
        if (app.revenue > 0 || app.orders > 0) {
          const mappedKey = appMapping[app.key] || app.key;
          
          // Apply app filter
          if (selectedApps.length > 0 && !selectedApps.includes(mappedKey)) {
            return;
          }
          
          if (!revenueByApp[mappedKey]) {
            revenueByApp[mappedKey] = { name: mappedKey, value: 0, orders: 0 };
          }
          revenueByApp[mappedKey].value += app.revenue;
          revenueByApp[mappedKey].orders += app.orders;
        }
      });
    });

    const deliveryAppBreakdown = Object.values(revenueByApp)
      .sort((a, b) => b.value - a.value)
      .map(a => ({
        name: a.name.charAt(0).toUpperCase() + a.name.slice(1),
        value: parseFloat(a.value.toFixed(2)),
        orders: a.orders
      }));

    // Multi-store trend data
    const dailyRevenueByStore = {};
    if (selectedStoresForTrend.length > 0) {
      iPraticoData.filter(item => {
        if (!item.order_date) return false;
        const itemDateStart = safeParseDate(item.order_date + 'T00:00:00');
        const itemDateEnd = safeParseDate(item.order_date + 'T23:59:59');
        if (!itemDateStart || !itemDateEnd) return false;
        if (cutoffDate && isBefore(itemDateEnd, cutoffDate)) return false;
        if (endFilterDate && isAfter(itemDateStart, endFilterDate)) return false;
        return selectedStoresForTrend.includes(item.store_id);
      }).forEach(item => {
        if (!dailyRevenueByStore[item.order_date]) {
          dailyRevenueByStore[item.order_date] = {};
        }
        const storeName = item.store_name || 'Unknown';
        if (!dailyRevenueByStore[item.order_date][storeName]) {
          dailyRevenueByStore[item.order_date][storeName] = { revenue: 0, orders: 0 };
        }
        dailyRevenueByStore[item.order_date][storeName].revenue += item.total_revenue || 0;
        dailyRevenueByStore[item.order_date][storeName].orders += item.total_orders || 0;
      });
    }

    const dailyRevenueMultiStore = Object.entries(dailyRevenueByStore)
      .map(([date, storeData]) => {
        const parsedDate = safeParseDate(date);
        const entry = { date: safeFormatDate(parsedDate, 'dd/MM'), parsedDate };
        Object.entries(storeData).forEach(([storeName, data]) => {
          entry[`${storeName}_revenue`] = parseFloat(data.revenue.toFixed(2));
          entry[`${storeName}_avgValue`] = data.orders > 0 ? parseFloat((data.revenue / data.orders).toFixed(2)) : 0;
        });
        return entry;
      })
      .filter(d => d.date !== 'N/A')
      .sort((a, b) => {
        return a.parsedDate.getTime() - b.parsedDate.getTime();
      });

    // Comparison data
    let comparisonData = null;
    if (compareMode !== 'none' && cutoffDate && endFilterDate) {
      let compareStart, compareEnd;
      
      if (compareMode === 'previous') {
        const daysDiff = Math.ceil((endFilterDate - cutoffDate) / (1000 * 60 * 60 * 24));
        compareEnd = subDays(cutoffDate, 1);
        compareStart = subDays(compareEnd, daysDiff);
      } else if (compareMode === 'lastyear') {
        compareStart = subYears(cutoffDate, 1);
        compareEnd = subYears(endFilterDate, 1);
      } else if (compareMode === 'custom' && compareStartDate && compareEndDate) {
        compareStart = safeParseDate(compareStartDate + 'T00:00:00');
        compareEnd = safeParseDate(compareEndDate + 'T23:59:59');
      }
      
      if (compareStart && compareEnd) {
        const compareFiltered = iPraticoData.filter(item => {
          if (!item.order_date) return false;
          const itemDateStart = safeParseDate(item.order_date + 'T00:00:00');
          const itemDateEnd = safeParseDate(item.order_date + 'T23:59:59');
          if (!itemDateStart || !itemDateEnd) return false;
          if (isBefore(itemDateEnd, compareStart)) return false;
          if (isAfter(itemDateStart, compareEnd)) return false;
          if (selectedStore !== 'all' && item.store_id !== selectedStore) return false;
          return true;
        });
        
        const compareTotalRevenue = compareFiltered.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
        const compareTotalOrders = compareFiltered.reduce((sum, item) => sum + (item.total_orders || 0), 0);
        
        const compareAvgOrderValue = compareTotalOrders > 0 ? compareTotalRevenue / compareTotalOrders : 0;
        
        comparisonData = {
          totalRevenue: compareTotalRevenue,
          totalOrders: compareTotalOrders,
          avgOrderValue: compareAvgOrderValue,
          revenueDiff: totalRevenue - compareTotalRevenue,
          revenueDiffPercent: compareTotalRevenue > 0 ? ((totalRevenue - compareTotalRevenue) / compareTotalRevenue) * 100 : 0,
          ordersDiff: totalOrders - compareTotalOrders,
          ordersDiffPercent: compareTotalOrders > 0 ? ((totalOrders - compareTotalOrders) / compareTotalOrders) * 100 : 0,
          avgOrderValueDiff: avgOrderValue - compareAvgOrderValue,
          avgOrderValueDiffPercent: compareAvgOrderValue > 0 ? ((avgOrderValue - compareAvgOrderValue) / compareAvgOrderValue) * 100 : 0
        };
      }
    }

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      dailyRevenue,
      dailyRevenueMultiStore,
      storeBreakdown,
      channelBreakdown,
      deliveryAppBreakdown,
      comparisonData
    };
  }, [iPraticoData, selectedStore, dateRange, startDate, endDate, selectedStoresForTrend, channelMapping, appMapping, compareMode, compareStartDate, compareEndDate, selectedChannels, selectedApps]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30');
  };

  return (
    <ProtectedPage pageName="Financials">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Analisi Finanziaria
          </h1>
          <p className="text-sm text-slate-500">Dati iPratico</p>
        </div>

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

            <div>
              <label className="text-sm text-slate-600 mb-2 block">Confronta con</label>
              <select
                value={compareMode}
                onChange={(e) => setCompareMode(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="none">Nessun confronto</option>
                <option value="previous">Periodo Precedente</option>
                <option value="lastyear">Anno Scorso</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {compareMode === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Confronta Da</label>
                  <input
                    type="date"
                    value={compareStartDate}
                    onChange={(e) => setCompareStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Confronta A</label>
                  <input
                    type="date"
                    value={compareEndDate}
                    onChange={(e) => setCompareEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-slate-600 mb-2 block">Canali</label>
              <div className="flex flex-wrap gap-2">
                {processedData.channelBreakdown.map(channel => (
                  <button
                    key={channel.name}
                    onClick={() => {
                      setSelectedChannels(prev => 
                        prev.includes(channel.name.toLowerCase()) 
                          ? prev.filter(c => c !== channel.name.toLowerCase()) 
                          : [...prev, channel.name.toLowerCase()]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedChannels.includes(channel.name.toLowerCase()) || selectedChannels.length === 0
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {channel.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-2 block">App Delivery</label>
              <div className="flex flex-wrap gap-2">
                {processedData.deliveryAppBreakdown.map(app => (
                  <button
                    key={app.name}
                    onClick={() => {
                      setSelectedApps(prev => 
                        prev.includes(app.name.toLowerCase()) 
                          ? prev.filter(a => a !== app.name.toLowerCase()) 
                          : [...prev, app.name.toLowerCase()]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedApps.includes(app.name.toLowerCase()) || selectedApps.length === 0
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* Comparison Stats */}
        {processedData.comparisonData && (
          <NeumorphicCard className="p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-blue-100">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Confronto Periodi</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="neumorphic-pressed p-4 rounded-xl bg-white">
                <p className="text-xs text-slate-500 mb-1">Revenue</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-bold text-slate-800">
                    €{(processedData.comparisonData.totalRevenue / 1000).toFixed(1)}k
                  </p>
                  <p className={`text-xs font-medium ${
                    processedData.comparisonData.revenueDiff >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {processedData.comparisonData.revenueDiff >= 0 ? '+' : ''}
                    {processedData.comparisonData.revenueDiffPercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl bg-white">
                <p className="text-xs text-slate-500 mb-1">Ordini</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-bold text-slate-800">
                    {processedData.comparisonData.totalOrders}
                  </p>
                  <p className={`text-xs font-medium ${
                    processedData.comparisonData.ordersDiff >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {processedData.comparisonData.ordersDiff >= 0 ? '+' : ''}
                    {processedData.comparisonData.ordersDiffPercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl bg-white">
                <p className="text-xs text-slate-500 mb-1">Scontrino Medio</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-bold text-slate-800">
                    €{processedData.comparisonData.avgOrderValue.toFixed(2)}
                  </p>
                  <p className={`text-xs font-medium ${
                    processedData.comparisonData.avgOrderValueDiff >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {processedData.comparisonData.avgOrderValueDiff >= 0 ? '+' : ''}
                    {processedData.comparisonData.avgOrderValueDiffPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </NeumorphicCard>
        )}

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
                <TrendingUp className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                {(() => {
                  const storeApp = processedData.deliveryAppBreakdown.find(app => 
                    app.name.toLowerCase() === 'store'
                  );
                  const totalAppRevenue = processedData.deliveryAppBreakdown.reduce((sum, app) => sum + app.value, 0);
                  const storeRevenue = storeApp?.value || 0;
                  return totalAppRevenue > 0 ? ((storeRevenue / totalAppRevenue) * 100).toFixed(1) : 0;
                })()}%
              </h3>
              <p className="text-xs text-slate-500">% in Store</p>
            </div>
          </NeumorphicCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          <NeumorphicCard className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base lg:text-lg font-bold text-slate-800">Trend Giornaliero</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRevenue(!showRevenue)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                    showRevenue ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {showRevenue ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  Revenue
                </button>
                <button
                  onClick={() => setShowAvgValue(!showAvgValue)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                    showAvgValue ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {showAvgValue ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  Medio
                </button>
              </div>
            </div>

            {selectedStore === 'all' && (
              <div className="mb-4">
                <label className="text-sm text-slate-600 mb-2 block">Confronta Negozi:</label>
                <div className="flex flex-wrap gap-2">
                  {stores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => {
                        setSelectedStoresForTrend(prev => 
                          prev.includes(store.id)
                            ? prev.filter(id => id !== store.id)
                            : [...prev, store.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedStoresForTrend.includes(store.id)
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {store.name}
                    </button>
                  ))}
                  {selectedStoresForTrend.length > 0 && (
                    <button
                      onClick={() => setSelectedStoresForTrend([])}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedStoresForTrend.length > 0 && processedData.dailyRevenueMultiStore.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: '300px' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={processedData.dailyRevenueMultiStore}>
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
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      {stores.filter(s => selectedStoresForTrend.includes(s.id)).map((store, idx) => (
                        <React.Fragment key={store.id}>
                          {showRevenue && (
                            <Line 
                              type="monotone" 
                              dataKey={`${store.name}_revenue`}
                              stroke={COLORS[idx % COLORS.length]} 
                              strokeWidth={2} 
                              name={`${store.name} Revenue`}
                              dot={{ fill: COLORS[idx % COLORS.length], r: 2 }}
                            />
                          )}
                          {showAvgValue && (
                            <Line 
                              type="monotone" 
                              dataKey={`${store.name}_avgValue`}
                              stroke={COLORS[idx % COLORS.length]} 
                              strokeWidth={2} 
                              strokeDasharray="5 5"
                              name={`${store.name} Medio`}
                              dot={{ fill: COLORS[idx % COLORS.length], r: 2 }}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : processedData.dailyRevenue.length > 0 ? (
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
                      {showRevenue && (
                        <YAxis 
                          yAxisId="left"
                          stroke="#3b82f6"
                          tick={{ fontSize: 11 }}
                          width={50}
                        />
                      )}
                      {showAvgValue && (
                        <YAxis 
                          yAxisId="right" 
                          orientation="right"
                          stroke="#22c55e"
                          tick={{ fontSize: 11 }}
                          width={50}
                        />
                      )}
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
                      {showRevenue && (
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#3b82f6" 
                          strokeWidth={2} 
                          name="Revenue" 
                          dot={{ fill: '#3b82f6', r: 3 }}
                        />
                      )}
                      {showAvgValue && (
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="avgValue" 
                          stroke="#22c55e" 
                          strokeWidth={2} 
                          name="Medio"
                          dot={{ fill: '#22c55e', r: 2 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Nessun dato disponibile per il periodo selezionato
              </div>
            )}
          </NeumorphicCard>

          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Revenue per Locale</h2>
            {processedData.storeBreakdown.length > 0 ? (
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
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Nessun dato disponibile
              </div>
            )}
          </NeumorphicCard>
        </div>

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base lg:text-lg font-bold text-slate-800">Canale Vendita</h2>
              <button
                onClick={() => setShowChannelSettings(!showChannelSettings)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {showChannelSettings && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg space-y-3">
                <h3 className="text-sm font-bold text-blue-800 mb-2">Configurazione Aggregazione Canali</h3>
                <p className="text-xs text-slate-600 mb-3">Inserisci il nome della categoria finale per aggregare i dati. Più campi con lo stesso nome verranno sommati.</p>
                {['delivery', 'takeaway', 'takeawayOnSite', 'store'].map(key => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-xs text-slate-600 w-32 font-mono">{key}:</label>
                    <input
                      type="text"
                      value={channelMapping[key] || key}
                      onChange={(e) => setChannelMapping({...channelMapping, [key]: e.target.value})}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder={`es. "Asporto" per aggregare`}
                    />
                  </div>
                ))}
                <div className="pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-700 mb-2">💡 Esempio: Se imposti "takeaway" e "takeawayOnSite" entrambi come "Asporto", i loro dati verranno sommati nella categoria "Asporto"</p>
                </div>
                <button
                  onClick={() => {
                    saveConfigMutation.mutate({ channel_mapping: channelMapping, app_mapping: appMapping });
                    setShowChannelSettings(false);
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salva Configurazione
                </button>
              </div>
            )}

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

        {processedData.deliveryAppBreakdown.length > 0 && (
          <NeumorphicCard className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base lg:text-lg font-bold text-slate-800">App Delivery</h2>
              <button
                onClick={() => setShowAppSettings(!showAppSettings)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {showAppSettings && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg space-y-3 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-bold text-blue-800 mb-2">Configurazione Aggregazione App</h3>
                <p className="text-xs text-slate-600 mb-3">Inserisci il nome della categoria finale per aggregare i dati. Più app con lo stesso nome verranno sommate.</p>
                {['glovo', 'deliveroo', 'justeat', 'onlineordering', 'ordertable', 'tabesto', 'store'].map(key => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-xs text-slate-600 w-32 font-mono">{key}:</label>
                    <input
                      type="text"
                      value={appMapping[key] || key}
                      onChange={(e) => setAppMapping({...appMapping, [key]: e.target.value})}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder={`es. "Delivery" per aggregare`}
                    />
                  </div>
                ))}
                <div className="pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-700 mb-2">💡 Esempio: Se imposti "glovo", "deliveroo" e "justeat" tutti come "Delivery", i loro dati verranno sommati nella categoria "Delivery"</p>
                </div>
                <button
                  onClick={() => {
                    saveConfigMutation.mutate({ channel_mapping: channelMapping, app_mapping: appMapping });
                    setShowAppSettings(false);
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salva Configurazione
                </button>
              </div>
            )}

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