import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, DollarSign, BarChart3, AlertTriangle, CheckCircle, Settings, X, ChevronUp, Loader2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO, isValid, addDays, subYears } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";
import { formatCurrency, formatEuro } from "../components/utils/formatCurrency";

export default function Target() {
  const [targetRevenue, setTargetRevenue] = useState('');
  const [targetStore, setTargetStore] = useState('all');
  const [targetApp, setTargetApp] = useState('');
  const [targetChannel, setTargetChannel] = useState('');
  const [targetDateMode, setTargetDateMode] = useState('range');
  const [targetStartDate, setTargetStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [historicalDaysTarget, setHistoricalDaysTarget] = useState(30);
  const [useEMA, setUseEMA] = useState(false);
  const [growthRatePeriodDays, setGrowthRatePeriodDays] = useState(0);
  const [selectedTargetView, setSelectedTargetView] = useState('list');
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [targetName, setTargetName] = useState('');
  const [detailView, setDetailView] = useState('daily');
  const [splitBy, setSplitBy] = useState('store');
  const [expandedSplit, setExpandedSplit] = useState({
    store: false,
    app: false,
    channel: false
  });
  const [channelMapping, setChannelMapping] = useState({});
  const [appMapping, setAppMapping] = useState({});

  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: iPraticoData = [] } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000)
  });

  const { data: financeConfigs = [] } = useQuery({
    queryKey: ['finance-configs'],
    queryFn: () => base44.entities.FinanceConfig.list()
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['targets'],
    queryFn: () => base44.entities.Target.list()
  });

  useEffect(() => {
    const targetId = searchParams.get('id');
    if (targetId && targets.length > 0) {
      const foundTarget = targets.find(t => t.id === targetId);
      if (foundTarget) {
        setSelectedTargetId(targetId);
        setTargetRevenue(foundTarget.target_revenue.toString());
        setTargetStore(foundTarget.store_id || 'all');
        setTargetChannel(foundTarget.channel || '');
        setTargetApp(foundTarget.app || '');
        setTargetDateMode(foundTarget.date_mode || 'range');
        setTargetStartDate(foundTarget.start_date || '');
        setTargetEndDate(foundTarget.end_date || '');
        setHistoricalDaysTarget(foundTarget.historical_days || 30);
        setUseEMA(foundTarget.use_ema || false);
        setGrowthRatePeriodDays(foundTarget.growth_rate_period_days || 0);
        setSelectedTargetView('details');
      }
    }
  }, [searchParams, targets]);

  const saveTargetMutation = useMutation({
    mutationFn: (targetData) => base44.entities.Target.create(targetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
      setSelectedTargetView('list');
      setTargetName('');
    }
  });

  const updateTargetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Target.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
      await queryClient.refetchQueries({ queryKey: ['targets'] });
    }
  });

  const deleteTargetMutation = useMutation({
    mutationFn: (id) => base44.entities.Target.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
      setSelectedTargetView('list');
      setSelectedTargetId(null);
    }
  });

  React.useEffect(() => {
    const activeConfig = financeConfigs.find((c) => c.is_active);
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

  const allChannels = useMemo(() => {
    const channelSet = new Set();
    iPraticoData.forEach((item) => {
      ['delivery', 'takeaway', 'takeawayOnSite', 'store'].forEach((key) => {
        const mappedKey = channelMapping[key] || key;
        channelSet.add(mappedKey);
      });
    });
    return Array.from(channelSet);
  }, [iPraticoData, channelMapping]);

  const allApps = useMemo(() => {
    const appSet = new Set();
    iPraticoData.forEach((item) => {
      ['glovo', 'deliveroo', 'justeat', 'onlineordering', 'ordertable', 'tabesto', 'store'].forEach((key) => {
        const mappedKey = appMapping[key] || key;
        appSet.add(mappedKey);
      });
    });
    return Array.from(appSet);
  }, [iPraticoData, appMapping]);

  return (
    <ProtectedPage pageName="Target">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="mb-1 text-2xl font-bold lg:text-3xl" style={{ color: '#000000' }}>Target Revenue</h1>
          <p className="text-sm" style={{ color: '#000000' }}>Monitora e prevedi i tuoi target di revenue</p>
        </div>

        {selectedTargetView === 'list' && (
          <>
            <NeumorphicCard className="p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">I Tuoi Target</h2>
                <button
                  onClick={() => {
                    setSelectedTargetView('create');
                    setTargetName('');
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  + Nuovo Target
                </button>
              </div>
            </NeumorphicCard>

            {targets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {targets.map((target) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  let periodStart, periodEnd;
                  if (target.date_mode === 'rolling') {
                    periodEnd = new Date(today);
                    periodEnd.setDate(today.getDate() + 29);
                    periodStart = today;
                  } else {
                    periodStart = target.start_date ? new Date(target.start_date) : today;
                    periodEnd = target.end_date ? new Date(target.end_date) : today;
                  }

                  const totalDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;
                  const daysPassed = Math.max(0, Math.ceil((today - periodStart) / (1000 * 60 * 60 * 24)));
                  const daysRemaining = Math.max(0, totalDays - daysPassed);

                  let currentRevenue = 0;
                  const currentData = iPraticoData.filter(item => {
                    if (!item.order_date) return false;
                    const itemDate = new Date(item.order_date);
                    itemDate.setHours(0, 0, 0, 0);
                    const maxDate = today < periodEnd ? today : periodEnd;
                    if (itemDate < periodStart || itemDate > maxDate) return false;
                    if (target.store_id !== 'all' && item.store_id !== target.store_id) return false;
                    return true;
                  });

                  currentData.forEach(item => {
                    let itemRevenue = 0;
                    if (target.app) {
                      const apps = [
                        { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                        { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                        { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                        { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                        { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                        { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                        { key: 'store', revenue: item.sourceApp_store || 0 }
                      ];
                      apps.forEach(app => {
                        const mappedKey = appMapping[app.key] || app.key;
                        if (mappedKey === target.app) itemRevenue += app.revenue;
                      });
                    } else if (target.channel) {
                      const channels = [
                        { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                        { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                        { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                        { key: 'store', revenue: item.sourceType_store || 0 }
                      ];
                      channels.forEach(ch => {
                        const mappedKey = channelMapping[ch.key] || ch.key;
                        if (mappedKey === target.channel) itemRevenue += ch.revenue;
                      });
                    } else {
                      itemRevenue = item.total_revenue || 0;
                    }
                    currentRevenue += itemRevenue;
                  });

                  const historicalCutoff = subDays(today, target.historical_days || 30);
                  const historicalData = iPraticoData.filter(item => {
                    if (!item.order_date) return false;
                    const itemDate = new Date(item.order_date);
                    itemDate.setHours(0, 0, 0, 0);
                    if (itemDate < historicalCutoff || itemDate >= today) return false;
                    if (target.store_id !== 'all' && item.store_id !== target.store_id) return false;
                    return true;
                  });

                  const dailyTotals = {};
                  historicalData.forEach(item => {
                    if (!dailyTotals[item.order_date]) dailyTotals[item.order_date] = 0;
                    let itemRevenue = item.total_revenue || 0;
                    if (target.app) {
                      itemRevenue = 0;
                      const apps = [
                        { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                        { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                        { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                        { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                        { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                        { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                        { key: 'store', revenue: item.sourceApp_store || 0 }
                      ];
                      apps.forEach(app => {
                        const mappedKey = appMapping[app.key] || app.key;
                        if (mappedKey === target.app) itemRevenue += app.revenue;
                      });
                    } else if (target.channel) {
                      itemRevenue = 0;
                      const channels = [
                        { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                        { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                        { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                        { key: 'store', revenue: item.sourceType_store || 0 }
                      ];
                      channels.forEach(ch => {
                        const mappedKey = channelMapping[ch.key] || ch.key;
                        if (mappedKey === target.channel) itemRevenue += ch.revenue;
                      });
                    }
                    dailyTotals[item.order_date] += itemRevenue;
                  });

                  const dayOfWeekRevenues = {};
                  Object.entries(dailyTotals).forEach(([date, revenue]) => {
                    const itemDate = new Date(date);
                    const dayOfWeek = itemDate.getDay();
                    if (!dayOfWeekRevenues[dayOfWeek]) dayOfWeekRevenues[dayOfWeek] = [];
                    dayOfWeekRevenues[dayOfWeek].push(revenue);
                  });

                  const avgByDayOfWeek = {};
                  Object.keys(dayOfWeekRevenues).forEach(dayOfWeek => {
                    const revenues = dayOfWeekRevenues[dayOfWeek];
                    let avg = 0;
                    
                    if (target.use_ema && revenues.length > 0) {
                      const alpha = 0.2;
                      avg = revenues[0];
                      for (let i = 1; i < revenues.length; i++) {
                        avg = alpha * revenues[i] + (1 - alpha) * avg;
                      }
                    } else {
                      avg = revenues.length > 0 ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length : 0;
                    }
                    
                    avgByDayOfWeek[dayOfWeek] = avg;
                  });

                  let cardDailyGrowthRate = 0;
                  if (target.growth_rate_period_days > 0) {
                    const growthCutoff = subDays(today, target.growth_rate_period_days);
                    const growthData = Object.entries(dailyTotals)
                      .filter(([date]) => {
                        const d = new Date(date);
                        return d >= growthCutoff && d < today;
                      })
                      .sort(([a], [b]) => a.localeCompare(b));
                    
                    if (growthData.length >= 2) {
                      const n = growthData.length;
                      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
                      
                      growthData.forEach(([date, revenue], index) => {
                        sumX += index;
                        sumY += revenue;
                        sumXY += index * revenue;
                        sumX2 += index * index;
                      });
                      
                      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                      cardDailyGrowthRate = slope;
                    }
                  }

                  let predictedRevenue = 0;
                  for (let i = 0; i < daysRemaining; i++) {
                    const futureDate = new Date(today);
                    futureDate.setDate(today.getDate() + i);
                    const dayOfWeek = futureDate.getDay();
                    const baseRev = avgByDayOfWeek[dayOfWeek] || 0;
                    const growthAdj = cardDailyGrowthRate * (daysPassed + i);
                    predictedRevenue += baseRev + growthAdj;
                  }

                  const totalProjected = currentRevenue + predictedRevenue;
                  const gap = target.target_revenue - totalProjected;
                  const progressPercent = target.target_revenue > 0 ? (totalProjected / target.target_revenue) * 100 : 0;

                  return (
                    <NeumorphicCard
                      key={target.id}
                      className="p-6 hover:shadow-lg transition-all cursor-pointer relative group"
                      onClick={() => {
                        setSelectedTargetId(target.id);
                        setTargetRevenue(target.target_revenue.toString());
                        setTargetStore(target.store_id || 'all');
                        setTargetChannel(target.channel || '');
                        setTargetApp(target.app || '');
                        setTargetDateMode(target.date_mode || 'range');
                        setTargetStartDate(target.start_date || '');
                        setTargetEndDate(target.end_date || '');
                        setHistoricalDaysTarget(target.historical_days || 30);
                        setUseEMA(target.use_ema || false);
                        setGrowthRatePeriodDays(target.growth_rate_period_days || 0);
                        setSelectedTargetView('details');
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-800">{target.name}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTargetId(target.id);
                              setTargetRevenue(target.target_revenue.toString());
                              setTargetStore(target.store_id || 'all');
                              setTargetChannel(target.channel || '');
                              setTargetApp(target.app || '');
                              setTargetDateMode(target.date_mode || 'range');
                              setTargetStartDate(target.start_date || '');
                              setTargetEndDate(target.end_date || '');
                              setHistoricalDaysTarget(target.historical_days || 30);
                              setUseEMA(target.use_ema || false);
                              setGrowthRatePeriodDays(target.growth_rate_period_days || 0);
                              setTargetName(target.name);
                              setSelectedTargetView('edit');
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <Settings className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Eliminare questo target?')) {
                                deleteTargetMutation.mutate(target.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-2xl font-bold text-blue-600 mb-3">{formatEuro(target.target_revenue)}</p>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Previsione:</span>
                          <span className={`font-bold ${gap <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                            {formatEuro(totalProjected)}
                          </span>
                        </div>
                        <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${gap <= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-bold ${gap <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gap <= 0 ? '✓ Sopra target' : '⚠ Sotto target'}
                          </span>
                          <span className="text-slate-600">{progressPercent.toFixed(0)}%</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-500">
                        {target.store_id && target.store_id !== 'all' ? stores.find(s => s.id === target.store_id)?.name || 'Locale' : 'Tutti i Locali'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Clicca per vedere il dettaglio completo
                      </p>
                    </NeumorphicCard>
                  );
                })}
              </div>
            ) : (
              <NeumorphicCard className="p-6 text-center">
                <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">Nessun target impostato</p>
                <button
                  onClick={() => {
                    setSelectedTargetView('create');
                    setTargetName('');
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  Crea il tuo primo target
                </button>
              </NeumorphicCard>
            )}
          </>
        )}

        {(selectedTargetView === 'create' || selectedTargetView === 'edit') && (
          <>
            <NeumorphicCard className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    setSelectedTargetView('list');
                    setSelectedTargetId(null);
                    setTargetName('');
                  }}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronUp className="w-5 h-5 text-slate-600 rotate-90" />
                </button>
                <h2 className="text-lg font-bold text-slate-800">
                  {selectedTargetView === 'edit' ? 'Modifica Target' : 'Crea Nuovo Target'}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">Nome Target</label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="es. Target Febbraio"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">Target Revenue (€)</label>
                  <input
                    type="number"
                    value={targetRevenue}
                    onChange={(e) => setTargetRevenue(e.target.value)}
                    placeholder="es. 50000"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">Locale</label>
                  <select
                    value={targetStore}
                    onChange={(e) => setTargetStore(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  >
                    <option value="all">Tutti i Locali</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">Canale (opzionale)</label>
                  <select
                    value={targetChannel}
                    onChange={(e) => setTargetChannel(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  >
                    <option value="">Tutti i Canali</option>
                    {allChannels.map(channel => (
                      <option key={channel} value={channel}>{channel.charAt(0).toUpperCase() + channel.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">App (opzionale)</label>
                  <select
                    value={targetApp}
                    onChange={(e) => setTargetApp(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  >
                    <option value="">Tutte le App</option>
                    {allApps.map(app => (
                      <option key={app} value={app}>{app.charAt(0).toUpperCase() + app.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">Modalità Periodo</label>
                  <select
                    value={targetDateMode}
                    onChange={(e) => setTargetDateMode(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  >
                    <option value="range">Range Specifico</option>
                    <option value="rolling">Rolling (ultimi 30 gg)</option>
                  </select>
                </div>

                {targetDateMode === 'range' && (
                  <>
                    <div>
                      <label className="text-sm text-slate-600 mb-2 block font-medium">Data Inizio</label>
                      <input
                        type="date"
                        value={targetStartDate}
                        onChange={(e) => setTargetStartDate(e.target.value)}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 mb-2 block font-medium">Data Target</label>
                      <input
                        type="date"
                        value={targetEndDate}
                        onChange={(e) => setTargetEndDate(e.target.value)}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">Giorni Storici per Stagionalità</label>
                  <select
                    value={historicalDaysTarget}
                    onChange={(e) => setHistoricalDaysTarget(parseInt(e.target.value))}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  >
                    <option value="30">30 giorni</option>
                    <option value="60">60 giorni</option>
                    <option value="90">90 giorni</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">Metodo Calcolo Stagionalità</label>
                  <select
                    value={useEMA}
                    onChange={(e) => setUseEMA(e.target.value === 'true')}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  >
                    <option value="false">Media Semplice</option>
                    <option value="true">Media Mobile Esponenziale (α=0.2)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">Tasso Crescita (Regressione Lineare)</label>
                  <select
                    value={growthRatePeriodDays}
                    onChange={(e) => setGrowthRatePeriodDays(parseInt(e.target.value))}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  >
                    <option value="0">Nessuno</option>
                    <option value="30">30 giorni</option>
                    <option value="60">60 giorni</option>
                    <option value="90">90 giorni</option>
                    <option value="180">180 giorni</option>
                    <option value="365">365 giorni</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedTargetView('list');
                    setSelectedTargetId(null);
                    setTargetName('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-300 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    if (targetName && targetRevenue) {
                      if (selectedTargetView === 'edit' && selectedTargetId) {
                        updateTargetMutation.mutate({
                          id: selectedTargetId,
                          data: {
                            name: targetName,
                            target_revenue: parseFloat(targetRevenue),
                            store_id: targetStore,
                            channel: targetChannel,
                            app: targetApp,
                            date_mode: targetDateMode,
                            start_date: targetStartDate,
                            end_date: targetEndDate,
                            historical_days: historicalDaysTarget,
                            use_ema: useEMA,
                            growth_rate_period_days: growthRatePeriodDays
                          }
                        });
                      } else {
                        saveTargetMutation.mutate({
                          name: targetName,
                          target_revenue: parseFloat(targetRevenue),
                          store_id: targetStore,
                          channel: targetChannel,
                          app: targetApp,
                          date_mode: targetDateMode,
                          start_date: targetStartDate,
                          end_date: targetEndDate,
                          historical_days: historicalDaysTarget,
                          use_ema: useEMA,
                          growth_rate_period_days: growthRatePeriodDays
                        });
                      }
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  {selectedTargetView === 'edit' ? 'Aggiorna Target' : 'Salva Target'}
                </button>
              </div>
            </NeumorphicCard>
          </>
        )}

        {selectedTargetView === 'details' && (
          <button
            onClick={() => setSelectedTargetView('list')}
            className="mb-4 p-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <ChevronUp className="w-5 h-5 text-slate-600 rotate-90" />
            <span className="text-slate-600">Torna alla lista</span>
          </button>
        )}

        {selectedTargetView === 'details' && (() => {
          const selectedTarget = targets.find(t => t.id === selectedTargetId);
          
          const activeTargetRevenue = selectedTarget?.target_revenue || parseFloat(targetRevenue);
          const activeTargetStore = selectedTarget?.store_id || targetStore;
          const activeTargetChannel = selectedTarget?.channel || targetChannel;
          const activeTargetApp = selectedTarget?.app || targetApp;
          const activeTargetDateMode = selectedTarget?.date_mode || targetDateMode;
          const activeTargetStartDate = selectedTarget?.start_date || targetStartDate;
          const activeTargetEndDate = selectedTarget?.end_date || targetEndDate;
          const activeHistoricalDays = selectedTarget?.historical_days || historicalDaysTarget;
          const activeUseEMA = selectedTarget?.use_ema !== undefined ? selectedTarget.use_ema : useEMA;
          const activeGrowthRatePeriodDays = selectedTarget?.growth_rate_period_days !== undefined ? selectedTarget.growth_rate_period_days : growthRatePeriodDays;
          
          const effectiveGrowthPeriodDays = activeGrowthRatePeriodDays || 0;
          
          if (!activeTargetRevenue || (activeTargetDateMode === 'range' && (!activeTargetStartDate || !activeTargetEndDate))) {
            return (
              <NeumorphicCard className="p-6 text-center">
                <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Configura il target per vedere la previsione</p>
              </NeumorphicCard>
            );
          }

          const target = activeTargetRevenue;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let periodStart, periodEnd;
          if (activeTargetDateMode === 'rolling') {
            periodEnd = new Date(today);
            periodEnd.setDate(today.getDate() + 29);
            periodStart = today;
          } else {
            periodStart = new Date(activeTargetStartDate);
            periodStart.setHours(0, 0, 0, 0);
            periodEnd = new Date(activeTargetEndDate);
            periodEnd.setHours(0, 0, 0, 0);
          }

          const totalDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1;
          const daysPassed = Math.max(0, Math.ceil((today - periodStart) / (1000 * 60 * 60 * 24)));
          const daysRemaining = Math.max(0, totalDays - daysPassed);

          let currentRevenue = 0;
          const currentData = iPraticoData.filter(item => {
            if (!item.order_date) return false;
            const itemDate = new Date(item.order_date);
            itemDate.setHours(0, 0, 0, 0);
            const maxDate = today < periodEnd ? today : periodEnd;
            if (itemDate < periodStart || itemDate > maxDate) return false;
            if (activeTargetStore !== 'all' && item.store_id !== activeTargetStore) return false;
            return true;
          });

          currentData.forEach(item => {
            let itemRevenue = 0;
            if (activeTargetApp) {
              const apps = [
                { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                { key: 'store', revenue: item.sourceApp_store || 0 }
              ];
              apps.forEach(app => {
                const mappedKey = appMapping[app.key] || app.key;
                if (mappedKey === activeTargetApp) {
                  itemRevenue += app.revenue;
                }
              });
            } else if (activeTargetChannel) {
              const channels = [
                { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                { key: 'store', revenue: item.sourceType_store || 0 }
              ];
              channels.forEach(ch => {
                const mappedKey = channelMapping[ch.key] || ch.key;
                if (mappedKey === activeTargetChannel) {
                  itemRevenue += ch.revenue;
                }
              });
            } else {
              itemRevenue = item.total_revenue || 0;
            }
            currentRevenue += itemRevenue;
          });

          let totalSeasonalityWeight = 0;
          
          const maxHistoricalDays = Math.max(activeHistoricalDays, effectiveGrowthPeriodDays || 0);
          const historicalCutoff = subDays(today, maxHistoricalDays);
          
          const historicalData = iPraticoData.filter(item => {
            if (!item.order_date) return false;
            const itemDate = new Date(item.order_date);
            itemDate.setHours(0, 0, 0, 0);
            if (itemDate < historicalCutoff || itemDate >= today) return false;
            if (activeTargetStore !== 'all' && item.store_id !== activeTargetStore) return false;
            return true;
          });

          const dailyTotals = {};
          historicalData.forEach(item => {
            if (!dailyTotals[item.order_date]) {
              dailyTotals[item.order_date] = 0;
            }

            let itemRevenue = 0;
            if (activeTargetApp) {
              const apps = [
                { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                { key: 'store', revenue: item.sourceApp_store || 0 }
              ];
              apps.forEach(app => {
                const mappedKey = appMapping[app.key] || app.key;
                if (mappedKey === activeTargetApp) {
                  itemRevenue += app.revenue;
                }
              });
            } else if (activeTargetChannel) {
              const channels = [
                { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                { key: 'store', revenue: item.sourceType_store || 0 }
              ];
              channels.forEach(ch => {
                const mappedKey = channelMapping[ch.key] || ch.key;
                if (mappedKey === activeTargetChannel) {
                  itemRevenue += ch.revenue;
                }
              });
            } else {
              itemRevenue = item.total_revenue || 0;
            }
            
            dailyTotals[item.order_date] += itemRevenue;
          });

          const seasonalityCutoff = subDays(today, activeHistoricalDays);
          const dayOfWeekRevenues = {};
          Object.entries(dailyTotals).forEach(([date, revenue]) => {
            const itemDate = new Date(date);
            if (itemDate >= seasonalityCutoff) {
              const dayOfWeek = itemDate.getDay();
              if (!dayOfWeekRevenues[dayOfWeek]) {
                dayOfWeekRevenues[dayOfWeek] = [];
              }
              dayOfWeekRevenues[dayOfWeek].push(revenue);
            }
          });

          const actualHistoricalDays = Object.keys(dailyTotals).length;
          const totalHistoricalRevenue = Object.values(dailyTotals).reduce((sum, r) => sum + r, 0);
          const overallAvgDaily = actualHistoricalDays > 0 ? totalHistoricalRevenue / actualHistoricalDays : 0;

          const avgByDayOfWeek = {};
          
          Object.keys(dayOfWeekRevenues).forEach(dayOfWeek => {
            const revenues = dayOfWeekRevenues[dayOfWeek];
            let avg = 0;
            
            if (activeUseEMA && revenues.length > 0) {
              const alpha = 0.2;
              avg = revenues[0];
              for (let i = 1; i < revenues.length; i++) {
                avg = alpha * revenues[i] + (1 - alpha) * avg;
              }
            } else {
              avg = revenues.length > 0 ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length : 0;
            }
            
            avgByDayOfWeek[dayOfWeek] = avg;
          });

          totalSeasonalityWeight = 0;
          for (let i = 0; i < totalDays; i++) {
            const currentDate = new Date(periodStart);
            currentDate.setDate(periodStart.getDate() + i);
            const dayOfWeek = currentDate.getDay();
            totalSeasonalityWeight += avgByDayOfWeek[dayOfWeek] || 0;
          }

          let dailyGrowthRate = 0;
          
          if (effectiveGrowthPeriodDays > 0) {
            const growthCutoff = subDays(today, effectiveGrowthPeriodDays);
            const growthData = Object.entries(dailyTotals)
              .filter(([date]) => {
                const d = new Date(date);
                return d >= growthCutoff && d < today;
              })
              .sort(([a], [b]) => a.localeCompare(b));

            if (growthData.length >= 2) {
              const n = growthData.length;
              let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

              growthData.forEach(([date, revenue], index) => {
                sumX += index;
                sumY += revenue;
                sumXY += index * revenue;
                sumX2 += index * index;
              });

              const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
              dailyGrowthRate = slope;
            }
          }

          let realGrowthRatePercent = 0;
          let realGrowthAbsolute = 0;
          const previousPeriodStart = subDays(periodStart, daysPassed);
          const previousPeriodEnd = subDays(periodStart, 1);

          const previousData = iPraticoData.filter(item => {
            if (!item.order_date) return false;
            const itemDate = new Date(item.order_date);
            itemDate.setHours(0, 0, 0, 0);
            if (itemDate < previousPeriodStart || itemDate > previousPeriodEnd) return false;
            if (activeTargetStore !== 'all' && item.store_id !== activeTargetStore) return false;
            return true;
          });

          let previousRevenue = 0;
          previousData.forEach(item => {
            let itemRevenue = 0;
            if (activeTargetApp) {
              const apps = [
                { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                { key: 'store', revenue: item.sourceApp_store || 0 }
              ];
              apps.forEach(app => {
                const mappedKey = appMapping[app.key] || app.key;
                if (mappedKey === activeTargetApp) itemRevenue += app.revenue;
              });
            } else if (activeTargetChannel) {
              const channels = [
                { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                { key: 'store', revenue: item.sourceType_store || 0 }
              ];
              channels.forEach(ch => {
                const mappedKey = channelMapping[ch.key] || ch.key;
                if (mappedKey === activeTargetChannel) itemRevenue += ch.revenue;
              });
            } else {
              itemRevenue = item.total_revenue || 0;
            }
            previousRevenue += itemRevenue;
          });

          if (previousRevenue > 0) {
            realGrowthAbsolute = currentRevenue - previousRevenue;
            realGrowthRatePercent = (realGrowthAbsolute / previousRevenue) * 100;
          }

          let yoyGrowthRatePercent = 0;
          let yoyGrowthAbsolute = 0;
          const yoyPeriodStart = subYears(periodStart, 1);
          const yoyPeriodEnd = subYears(subDays(today, 1), 1);

          const yoyData = iPraticoData.filter(item => {
            if (!item.order_date) return false;
            const itemDate = new Date(item.order_date);
            itemDate.setHours(0, 0, 0, 0);
            if (itemDate < yoyPeriodStart || itemDate > yoyPeriodEnd) return false;
            if (activeTargetStore !== 'all' && item.store_id !== activeTargetStore) return false;
            return true;
          });

          let yoyRevenue = 0;
          yoyData.forEach(item => {
            let itemRevenue = 0;
            if (activeTargetApp) {
              const apps = [
                { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                { key: 'store', revenue: item.sourceApp_store || 0 }
              ];
              apps.forEach(app => {
                const mappedKey = appMapping[app.key] || app.key;
                if (mappedKey === activeTargetApp) itemRevenue += app.revenue;
              });
            } else if (activeTargetChannel) {
              const channels = [
                { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                { key: 'store', revenue: item.sourceType_store || 0 }
              ];
              channels.forEach(ch => {
                const mappedKey = channelMapping[ch.key] || ch.key;
                if (mappedKey === activeTargetChannel) itemRevenue += ch.revenue;
              });
            } else {
              itemRevenue = item.total_revenue || 0;
            }
            yoyRevenue += itemRevenue;
          });

          if (yoyRevenue > 0) {
            yoyGrowthAbsolute = currentRevenue - yoyRevenue;
            yoyGrowthRatePercent = (yoyGrowthAbsolute / yoyRevenue) * 100;
          }

          let predictedRevenue = 0;
          for (let i = 0; i < daysRemaining; i++) {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);
            const dayOfWeek = futureDate.getDay();
            const baseRevenue = avgByDayOfWeek[dayOfWeek] || 0;
            
            const growthAdjustment = dailyGrowthRate * (daysPassed + i);
            predictedRevenue += baseRevenue + growthAdjustment;
          }

          const totalProjected = currentRevenue + predictedRevenue;
          const gap = activeTargetRevenue - totalProjected;
          const gapPercent = activeTargetRevenue > 0 ? (gap / activeTargetRevenue) * 100 : 0;
          const progressPercent = activeTargetRevenue > 0 ? (totalProjected / activeTargetRevenue) * 100 : 0;
          const currentProgress = activeTargetRevenue > 0 ? (currentRevenue / activeTargetRevenue) * 100 : 0;

          return (
            <>
              {/* Target Info Header */}
              {selectedTarget && (
                <NeumorphicCard className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-blue-100">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">{selectedTarget.name}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Target Revenue</p>
                      <p className="font-bold text-blue-600 text-lg">{formatEuro(activeTargetRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Locale</p>
                      <p className="font-bold text-slate-800">
                        {selectedTarget.store_id && selectedTarget.store_id !== 'all' 
                          ? stores.find(s => s.id === selectedTarget.store_id)?.name || 'N/A'
                          : 'Tutti i Locali'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Periodo</p>
                      <p className="font-bold text-slate-800">
                        {selectedTarget.date_mode === 'rolling' ? 'Rolling 30gg' : `${selectedTarget.start_date || 'N/A'} - ${selectedTarget.end_date || 'N/A'}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Filtri</p>
                      <p className="font-bold text-slate-800">
                        {selectedTarget.channel || selectedTarget.app || 'Nessuno'}
                      </p>
                    </div>
                  </div>
                </NeumorphicCard>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <NeumorphicCard className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Target</p>
                      <p className="text-3xl font-bold text-blue-600">{formatEuro(activeTargetRevenue)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Obiettivo revenue</p>
                </NeumorphicCard>

                <NeumorphicCard className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Attuale</p>
                      <p className="text-3xl font-bold text-green-600">{formatEuro(currentRevenue)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all"
                        style={{ width: `${Math.min(currentProgress, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-green-600">{currentProgress.toFixed(0)}%</span>
                  </div>
                </NeumorphicCard>

                <NeumorphicCard className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Previsione Finale</p>
                      <p className="text-3xl font-bold text-purple-600">{formatEuro(totalProjected)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all"
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-purple-600">{progressPercent.toFixed(0)}%</span>
                  </div>
                </NeumorphicCard>

                <NeumorphicCard className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Gap vs Target</p>
                      <p className={`text-3xl font-bold ${gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatEuro(Math.abs(gap))}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      gap > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-600'
                    }`}>
                      {gap > 0 ? <AlertTriangle className="w-6 h-6 text-white" /> : <CheckCircle className="w-6 h-6 text-white" />}
                    </div>
                  </div>
                  <p className={`text-xs font-bold ${gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {gap > 0 ? 'Sotto target' : 'Sopra target'} di {Math.abs(gapPercent).toFixed(1)}%
                  </p>
                </NeumorphicCard>
              </div>

              {/* Growth Rate Analysis Card */}
              <NeumorphicCard className="p-6 mb-6 bg-gradient-to-br from-cyan-50 to-cyan-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Analisi Crescita</h3>
                    
                    <div className="mb-4 pb-4 border-b border-cyan-200">
                      <p className="text-sm font-bold text-cyan-900 mb-2">
                        Crescita Reale vs Periodo Precedente
                      </p>
                      <p className="text-xs text-slate-500 mb-2">
                        📅 Periodo corrente: {format(periodStart, 'dd/MM')} - {format(subDays(today, 1), 'dd/MM/yyyy')} ({daysPassed} giorni)<br/>
                        📅 Periodo precedente: {format(previousPeriodStart, 'dd/MM')} - {format(previousPeriodEnd, 'dd/MM/yyyy')} ({daysPassed} giorni)
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Revenue Corrente</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatEuro(currentRevenue)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Revenue Precedente</p>
                          <p className="text-lg font-bold text-slate-600">
                            {formatEuro(previousRevenue)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Crescita %</p>
                          <p className={`text-xl font-bold ${realGrowthRatePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {realGrowthRatePercent >= 0 ? '+' : ''}{realGrowthRatePercent.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Differenza Assoluta</p>
                          <p className={`text-xl font-bold ${realGrowthAbsolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {realGrowthAbsolute >= 0 ? '+' : ''}{formatEuro(realGrowthAbsolute)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4 pb-4 border-b border-cyan-200">
                      <p className="text-sm font-bold text-cyan-900 mb-2">
                        Crescita YoY (stesso periodo anno scorso)
                      </p>
                      <p className="text-xs text-slate-500 mb-2">
                        📅 Periodo corrente: {format(periodStart, 'dd/MM')} - {format(subDays(today, 1), 'dd/MM/yyyy')} ({daysPassed} giorni)<br/>
                        📅 Periodo YoY: {format(yoyPeriodStart, 'dd/MM')} - {format(yoyPeriodEnd, 'dd/MM/yyyy')} ({daysPassed} giorni)
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Revenue Corrente</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatEuro(currentRevenue)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Revenue Anno Scorso</p>
                          <p className="text-lg font-bold text-slate-600">
                            {formatEuro(yoyRevenue)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Crescita %</p>
                          <p className={`text-xl font-bold ${yoyGrowthRatePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {yoyGrowthRatePercent >= 0 ? '+' : ''}{yoyGrowthRatePercent.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Differenza Assoluta</p>
                          <p className={`text-xl font-bold ${yoyGrowthAbsolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {yoyGrowthAbsolute >= 0 ? '+' : ''}{formatEuro(yoyGrowthAbsolute)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {effectiveGrowthPeriodDays > 0 && (
                      <>
                        <p className="text-sm font-bold text-cyan-900 mb-2">
                          Tasso Applicato alle Previsioni
                        </p>
                        <p className="text-xs text-slate-700 mb-3">
                          Calcolato con <strong>regressione lineare</strong> sugli ultimi <strong>{effectiveGrowthPeriodDays} giorni</strong>
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">Tasso Giornaliero</p>
                            <p className={`text-xl font-bold ${dailyGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {dailyGrowthRate >= 0 ? '+' : ''}{formatEuro(dailyGrowthRate)}/gg
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">Tasso %</p>
                            <p className={`text-xl font-bold ${dailyGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {(() => {
                                const avgDailyRevenue = actualHistoricalDays > 0 ? totalHistoricalRevenue / actualHistoricalDays : 0;
                                const growthPercent = avgDailyRevenue > 0 ? (dailyGrowthRate / avgDailyRevenue) * 100 : 0;
                                return `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(2)}%`;
                              })()}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">Impatto su Periodo</p>
                            <p className={`text-xl font-bold ${dailyGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {dailyGrowthRate >= 0 ? '+' : ''}{formatEuro(dailyGrowthRate * daysRemaining)}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </NeumorphicCard>

              {/* Timeline Chart - same as Financials */}
              <NeumorphicCard className="p-6 mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Andamento Temporale</h3>
                <div className="w-full overflow-x-auto">
                  <div style={{ minWidth: '500px' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={(() => {
                        const timelineData = [];
                        const dailyRevenueMap = {};
                        
                        currentData.forEach(item => {
                          if (!dailyRevenueMap[item.order_date]) {
                            dailyRevenueMap[item.order_date] = 0;
                          }
                          let itemRevenue = 0;
                          if (activeTargetApp) {
                            const apps = [
                              { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                              { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                              { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                              { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                              { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                              { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                              { key: 'store', revenue: item.sourceApp_store || 0 }
                            ];
                            apps.forEach(app => {
                              const mappedKey = appMapping[app.key] || app.key;
                              if (mappedKey === activeTargetApp) itemRevenue += app.revenue;
                            });
                          } else if (activeTargetChannel) {
                            const channels = [
                              { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                              { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                              { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                              { key: 'store', revenue: item.sourceType_store || 0 }
                            ];
                            channels.forEach(ch => {
                              const mappedKey = channelMapping[ch.key] || ch.key;
                              if (mappedKey === activeTargetChannel) itemRevenue += ch.revenue;
                            });
                          } else {
                            itemRevenue = item.total_revenue || 0;
                          }
                          dailyRevenueMap[item.order_date] += itemRevenue;
                        });

                        let cumulativeActual = 0;
                        let cumulativePredicted = 0;
                        let cumulativeRequired = 0;
                        
                        for (let i = 0; i < totalDays; i++) {
                          const currentDate = new Date(periodStart);
                          currentDate.setDate(periodStart.getDate() + i);
                          const dateStr = format(currentDate, 'yyyy-MM-dd');
                          const isPast = currentDate < today;
                          const dayOfWeek = currentDate.getDay();
                          
                          const dayRevenue = dailyRevenueMap[dateStr] || 0;
                          const baseRevenue = avgByDayOfWeek[dayOfWeek] || 0;
                          const growthAdjustment = dailyGrowthRate * i;
                          const predictedDayRevenue = baseRevenue + growthAdjustment;
                          
                          const dayWeight = avgByDayOfWeek[dayOfWeek] || 0;
                          const requiredDayRevenue = totalSeasonalityWeight > 0 ? (activeTargetRevenue * (dayWeight / totalSeasonalityWeight)) : (activeTargetRevenue / totalDays);
                          
                          if (isPast) {
                            cumulativeActual += dayRevenue;
                          } else {
                            if (cumulativePredicted === 0) {
                              cumulativePredicted = cumulativeActual;
                            }
                            cumulativePredicted += predictedDayRevenue;
                          }
                          
                          cumulativeRequired += requiredDayRevenue;
                          
                          timelineData.push({
                            date: format(currentDate, 'dd/MM'),
                            actual: isPast ? parseFloat(cumulativeActual.toFixed(2)) : null,
                            predicted: !isPast ? parseFloat(cumulativePredicted.toFixed(2)) : null,
                            required: parseFloat(cumulativeRequired.toFixed(2))
                          });
                        }

                        return timelineData;
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b" 
                          tick={{ fontSize: 10 }}
                          interval={Math.floor(totalDays / 10)}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          tick={{ fontSize: 11 }}
                          width={70}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(248, 250, 252, 0.95)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            fontSize: '11px'
                          }}
                          formatter={(value) => value ? `€${formatCurrency(value)}` : '-'}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        
                        <Line 
                          type="monotone" 
                          dataKey={() => activeTargetRevenue}
                          stroke="#ef4444"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          name="Target"
                          dot={false}
                        />
                        
                        <Line 
                          type="monotone" 
                          dataKey="actual"
                          stroke="#10b981"
                          strokeWidth={3}
                          name="Effettivo"
                          dot={{ fill: '#10b981', r: 2 }}
                          connectNulls={false}
                        />
                        
                        <Line 
                          type="monotone" 
                          dataKey="predicted"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          name="Previsto"
                          dot={{ fill: '#8b5cf6', r: 2 }}
                          connectNulls={false}
                        />
                        
                        <Line 
                          type="monotone" 
                          dataKey="required"
                          stroke="#f97316"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          name="Richiesto"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  📈 Il grafico mostra il revenue cumulativo nel periodo {format(periodStart, 'dd/MM')} - {format(periodEnd, 'dd/MM')}: linea verde = dati effettivi, linea viola tratteggiata = previsione{selectedTarget?.use_ema ? ' (EMA α=0.2)' : ''}{selectedTarget?.growth_rate_period_days > 0 ? ` + tasso crescita (${selectedTarget.growth_rate_period_days}gg)` : ''}, linea arancione = richiesto per target (con stagionalità)
                </p>
              </NeumorphicCard>

              {/* Detail Tables and Rest of Details View - copy from Financials */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <NeumorphicCard className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Dettaglio Periodo</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Giorni Totali</span>
                      <span className="text-sm font-bold text-slate-800">{totalDays}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Giorni Passati</span>
                      <span className="text-sm font-bold text-slate-800">{daysPassed}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Giorni Rimanenti</span>
                      <span className="text-sm font-bold text-blue-600">{daysRemaining}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Revenue Media Giornaliera (reale)</span>
                      <span className="text-sm font-bold text-slate-800">
                        {formatEuro(daysPassed > 0 ? currentRevenue / daysPassed : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Giorni con Dati (periodo storico)</span>
                      <span className="text-sm font-bold text-slate-800">{actualHistoricalDays}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Revenue Prevista (giorni rimanenti)</span>
                      <span className="text-sm font-bold text-purple-600">{formatEuro(predictedRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm text-slate-600 font-bold">Revenue Giornaliera Necessaria</span>
                      <span className="text-sm font-bold text-orange-600">
                        {daysRemaining > 0 ? formatEuro((target - currentRevenue) / daysRemaining) : '-'}
                      </span>
                    </div>
                  </div>
                </NeumorphicCard>

                <NeumorphicCard className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Stagionalità per Giorno</h3>
                  <div className="space-y-2">
                    {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map((dayName, idx) => {
                      const dayOfWeek = idx === 6 ? 0 : idx + 1;
                      const avgRevenue = avgByDayOfWeek[dayOfWeek] || 0;
                      const maxAvg = Math.max(...Object.values(avgByDayOfWeek));
                      const widthPercent = maxAvg > 0 ? (avgRevenue / maxAvg) * 100 : 0;

                      return (
                        <div key={dayName} className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 w-20">{dayName}</span>
                          <div className="flex-1 bg-slate-200 rounded-full h-6 overflow-hidden relative">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all flex items-center justify-end pr-2"
                              style={{ width: `${widthPercent}%` }}
                            >
                              <span className="text-xs font-bold text-white">{formatEuro(avgRevenue)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-4">
                    📊 Media calcolata sugli ultimi {activeHistoricalDays} giorni{activeUseEMA ? ' con Media Mobile Esponenziale (α=0.2)' : ''}
                    {activeGrowthRatePeriodDays > 0 && dailyGrowthRate !== 0 && (
                      <><br />📈 Tasso di crescita: {dailyGrowthRate >= 0 ? '+' : ''}{formatEuro(dailyGrowthRate)}/giorno (regressione lineare su {activeGrowthRatePeriodDays}gg)</>
                    )}
                  </p>
                </NeumorphicCard>
              </div>

              {gap > 0 && daysRemaining > 0 && (
                <NeumorphicCard className="p-6 bg-orange-50 border-2 border-orange-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-orange-800 mb-2">Azione Richiesta</h3>
                      <p className="text-sm text-slate-700 mb-3">
                        Per raggiungere il target di <strong>{formatEuro(activeTargetRevenue)}</strong> entro il {format(periodEnd, 'dd/MM/yyyy')}, 
                        è necessario aumentare la revenue giornaliera media.
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Media Attuale (storico)</p>
                          <p className="text-xl font-bold text-slate-800">
                            {formatEuro(daysPassed > 0 ? currentRevenue / daysPassed : 0)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Media Necessaria</p>
                          <p className="text-xl font-bold text-orange-600">
                            {formatEuro(daysRemaining > 0 ? (activeTargetRevenue - currentRevenue) / daysRemaining : 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </NeumorphicCard>
              )}

              {gap <= 0 && (
                <NeumorphicCard className="p-6 bg-green-50 border-2 border-green-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-800 mb-2">Target Raggiunto!</h3>
                      <p className="text-sm text-slate-700">
                        La previsione indica che raggiungerai <strong>{formatEuro(totalProjected)}</strong>, 
                        superando il target di <strong>{formatEuro(Math.abs(gap))}</strong> ({Math.abs(gapPercent).toFixed(1)}%).
                      </p>
                    </div>
                  </div>
                </NeumorphicCard>
              )}

              {/* Split Views - Separate Collapsible Cards */}
              {activeTargetStore === 'all' && (
                <>
                  {/* Per Locale */}
                  <NeumorphicCard className="p-6 mb-4">
                    <button
                      onClick={() => setExpandedSplit(prev => ({ ...prev, store: !prev.store }))}
                      className="w-full flex items-center justify-between"
                    >
                      <h3 className="text-lg font-bold text-slate-800">Dettaglio per Locale</h3>
                      <ChevronUp className={`w-5 h-5 text-slate-600 transition-transform ${expandedSplit.store ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedSplit.store && (
                      <div className="mt-4 space-y-4">
                        {(() => {
                          const splitData = {};
                          
                          // Calculate actual revenue per store
                          currentData.forEach(item => {
                            const splitKey = item.store_id;
                            let itemRevenue = 0;
                            if (activeTargetApp) {
                              const apps = [
                                { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                                { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                                { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                                { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                                { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                                { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                                { key: 'store', revenue: item.sourceApp_store || 0 }
                              ];
                              apps.forEach(app => {
                                const mappedKey = appMapping[app.key] || app.key;
                                if (mappedKey === activeTargetApp) itemRevenue += app.revenue;
                              });
                            } else if (activeTargetChannel) {
                              const channels = [
                                { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                                { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                                { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                                { key: 'store', revenue: item.sourceType_store || 0 }
                              ];
                              channels.forEach(ch => {
                                const mappedKey = channelMapping[ch.key] || ch.key;
                                if (mappedKey === activeTargetChannel) itemRevenue += ch.revenue;
                              });
                            } else {
                              itemRevenue = item.total_revenue || 0;
                            }
                            
                            if (!splitData[splitKey]) {
                              const storeName = stores.find(s => s.id === splitKey)?.name || splitKey;
                              splitData[splitKey] = { actual: 0, name: storeName };
                            }
                            splitData[splitKey].actual += itemRevenue;
                          });
                          
                          // Calculate historical data and prediction for each store
                          Object.keys(splitData).forEach(storeId => {
                            const storeHistoricalData = historicalData.filter(item => item.store_id === storeId);
                            const storeDailyTotals = {};
                            
                            storeHistoricalData.forEach(item => {
                              if (!storeDailyTotals[item.order_date]) storeDailyTotals[item.order_date] = 0;
                              let itemRevenue = 0;
                              if (activeTargetApp) {
                                const apps = [
                                  { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                                  { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                                  { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                                  { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                                  { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                                  { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                                  { key: 'store', revenue: item.sourceApp_store || 0 }
                                ];
                                apps.forEach(app => {
                                  const mappedKey = appMapping[app.key] || app.key;
                                  if (mappedKey === activeTargetApp) itemRevenue += app.revenue;
                                });
                              } else if (activeTargetChannel) {
                                const channels = [
                                  { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                                  { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                                  { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                                  { key: 'store', revenue: item.sourceType_store || 0 }
                                ];
                                channels.forEach(ch => {
                                  const mappedKey = channelMapping[ch.key] || ch.key;
                                  if (mappedKey === activeTargetChannel) itemRevenue += ch.revenue;
                                });
                              } else {
                                itemRevenue = item.total_revenue || 0;
                              }
                              storeDailyTotals[item.order_date] += itemRevenue;
                            });
                            
                            const storeDayOfWeekRevenues = {};
                            Object.entries(storeDailyTotals).forEach(([date, revenue]) => {
                              const itemDate = new Date(date);
                              if (itemDate >= seasonalityCutoff) {
                                const dayOfWeek = itemDate.getDay();
                                if (!storeDayOfWeekRevenues[dayOfWeek]) storeDayOfWeekRevenues[dayOfWeek] = [];
                                storeDayOfWeekRevenues[dayOfWeek].push(revenue);
                              }
                            });
                            
                            const storeAvgByDayOfWeek = {};
                            Object.keys(storeDayOfWeekRevenues).forEach(dayOfWeek => {
                              const revenues = storeDayOfWeekRevenues[dayOfWeek];
                              let avg = 0;
                              if (activeUseEMA && revenues.length > 0) {
                                const alpha = 0.2;
                                avg = revenues[0];
                                for (let i = 1; i < revenues.length; i++) {
                                  avg = alpha * revenues[i] + (1 - alpha) * avg;
                                }
                              } else {
                                avg = revenues.length > 0 ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length : 0;
                              }
                              storeAvgByDayOfWeek[dayOfWeek] = avg;
                            });
                            
                            let storeDailyGrowthRate = 0;
                            if (effectiveGrowthPeriodDays > 0) {
                              const growthCutoff = subDays(today, effectiveGrowthPeriodDays);
                              const growthData = Object.entries(storeDailyTotals)
                                .filter(([date]) => {
                                  const d = new Date(date);
                                  return d >= growthCutoff && d < today;
                                })
                                .sort(([a], [b]) => a.localeCompare(b));
                              
                              if (growthData.length >= 2) {
                                const n = growthData.length;
                                let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
                                growthData.forEach(([date, revenue], index) => {
                                  sumX += index;
                                  sumY += revenue;
                                  sumXY += index * revenue;
                                  sumX2 += index * index;
                                });
                                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                                storeDailyGrowthRate = slope;
                              }
                            }
                            
                            let storePredictedRevenue = 0;
                            for (let i = 0; i < daysRemaining; i++) {
                              const futureDate = new Date(today);
                              futureDate.setDate(today.getDate() + i);
                              const dayOfWeek = futureDate.getDay();
                              const baseRev = storeAvgByDayOfWeek[dayOfWeek] || 0;
                              const growthAdj = storeDailyGrowthRate * (daysPassed + i);
                              storePredictedRevenue += baseRev + growthAdj;
                            }
                            
                            splitData[storeId].predicted = storePredictedRevenue;
                          });
                          
                          const totalActualAll = Object.values(splitData).reduce((sum, d) => sum + d.actual, 0);
                          
                          return Object.entries(splitData)
                            .sort(([, a], [, b]) => b.actual - a.actual)
                            .map(([key, data]) => {
                              const proportion = totalActualAll > 0 ? data.actual / totalActualAll : 0;
                              const splitTarget = target * proportion;
                              const splitTotalProjected = data.actual + data.predicted;
                              const splitGap = splitTarget - splitTotalProjected;
                              const splitProgress = splitTarget > 0 ? (splitTotalProjected / splitTarget) * 100 : 0;
                              
                              return (
                                <div key={key} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-lg font-bold text-slate-800">{data.name}</h4>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                                      splitGap <= 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {splitGap <= 0 ? '▲ Sopra' : '▼ Sotto'}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-4 gap-3 mb-3">
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Target</p>
                                      <p className="text-sm font-bold text-blue-600">{formatEuro(splitTarget)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Attuale</p>
                                      <p className="text-sm font-bold text-green-600">{formatEuro(data.actual)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Previsto</p>
                                      <p className="text-sm font-bold text-purple-600">{formatEuro(splitTotalProjected)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Gap</p>
                                      <p className={`text-sm font-bold ${splitGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatEuro(Math.abs(splitGap))}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                                      <div 
                                        className={`h-full transition-all ${
                                          splitGap <= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'
                                        }`}
                                        style={{ width: `${Math.min(splitProgress, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{splitProgress.toFixed(0)}%</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                    <div className="text-slate-500">
                                      <span>Δ Attuale vs Richiesto (oggi): </span>
                                      <span className={`font-bold ${
                                        data.actual >= (splitTarget * (daysPassed / totalDays)) ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {formatEuro(data.actual - (splitTarget * (daysPassed / totalDays)))}
                                      </span>
                                    </div>
                                    <div className="text-slate-500">
                                      <span>Δ Previsto vs Target: </span>
                                      <span className={`font-bold ${splitGap <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatEuro(-splitGap)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                        })()}
                      </div>
                    )}
                  </NeumorphicCard>

                  {/* Per App */}
                  <NeumorphicCard className="p-6 mb-4">
                    <button
                      onClick={() => setExpandedSplit(prev => ({ ...prev, app: !prev.app }))}
                      className="w-full flex items-center justify-between"
                    >
                      <h3 className="text-lg font-bold text-slate-800">Dettaglio per App</h3>
                      <ChevronUp className={`w-5 h-5 text-slate-600 transition-transform ${expandedSplit.app ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedSplit.app && (
                      <div className="mt-4 space-y-4">
                        {(() => {
                          const splitData = {};
                          
                          // Calculate actual revenue per app
                          currentData.forEach(item => {
                            const apps = [
                              { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                              { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                              { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                              { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                              { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                              { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                              { key: 'store', revenue: item.sourceApp_store || 0 }
                            ];
                            apps.forEach(app => {
                              const mappedKey = appMapping[app.key] || app.key;
                              if (app.revenue > 0) {
                                if (!splitData[mappedKey]) splitData[mappedKey] = { actual: 0, name: mappedKey };
                                splitData[mappedKey].actual += app.revenue;
                              }
                            });
                          });
                          
                          // Calculate prediction for each app
                          Object.keys(splitData).forEach(appName => {
                            const appHistoricalData = historicalData.filter(item => {
                              const apps = [
                                { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                                { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                                { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                                { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                                { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                                { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                                { key: 'store', revenue: item.sourceApp_store || 0 }
                              ];
                              return apps.some(app => {
                                const mappedKey = appMapping[app.key] || app.key;
                                return mappedKey === appName && app.revenue > 0;
                              });
                            });
                            
                            const appDailyTotals = {};
                            appHistoricalData.forEach(item => {
                              if (!appDailyTotals[item.order_date]) appDailyTotals[item.order_date] = 0;
                              const apps = [
                                { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                                { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                                { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                                { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                                { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                                { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                                { key: 'store', revenue: item.sourceApp_store || 0 }
                              ];
                              apps.forEach(app => {
                                const mappedKey = appMapping[app.key] || app.key;
                                if (mappedKey === appName) appDailyTotals[item.order_date] += app.revenue;
                              });
                            });
                            
                            const appDayOfWeekRevenues = {};
                            Object.entries(appDailyTotals).forEach(([date, revenue]) => {
                              const itemDate = new Date(date);
                              if (itemDate >= seasonalityCutoff) {
                                const dayOfWeek = itemDate.getDay();
                                if (!appDayOfWeekRevenues[dayOfWeek]) appDayOfWeekRevenues[dayOfWeek] = [];
                                appDayOfWeekRevenues[dayOfWeek].push(revenue);
                              }
                            });
                            
                            const appAvgByDayOfWeek = {};
                            Object.keys(appDayOfWeekRevenues).forEach(dayOfWeek => {
                              const revenues = appDayOfWeekRevenues[dayOfWeek];
                              let avg = 0;
                              if (activeUseEMA && revenues.length > 0) {
                                const alpha = 0.2;
                                avg = revenues[0];
                                for (let i = 1; i < revenues.length; i++) {
                                  avg = alpha * revenues[i] + (1 - alpha) * avg;
                                }
                              } else {
                                avg = revenues.length > 0 ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length : 0;
                              }
                              appAvgByDayOfWeek[dayOfWeek] = avg;
                            });
                            
                            let appDailyGrowthRate = 0;
                            if (effectiveGrowthPeriodDays > 0) {
                              const growthCutoff = subDays(today, effectiveGrowthPeriodDays);
                              const growthData = Object.entries(appDailyTotals)
                                .filter(([date]) => {
                                  const d = new Date(date);
                                  return d >= growthCutoff && d < today;
                                })
                                .sort(([a], [b]) => a.localeCompare(b));
                              
                              if (growthData.length >= 2) {
                                const n = growthData.length;
                                let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
                                growthData.forEach(([date, revenue], index) => {
                                  sumX += index;
                                  sumY += revenue;
                                  sumXY += index * revenue;
                                  sumX2 += index * index;
                                });
                                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                                appDailyGrowthRate = slope;
                              }
                            }
                            
                            let appPredictedRevenue = 0;
                            for (let i = 0; i < daysRemaining; i++) {
                              const futureDate = new Date(today);
                              futureDate.setDate(today.getDate() + i);
                              const dayOfWeek = futureDate.getDay();
                              const baseRev = appAvgByDayOfWeek[dayOfWeek] || 0;
                              const growthAdj = appDailyGrowthRate * (daysPassed + i);
                              appPredictedRevenue += baseRev + growthAdj;
                            }
                            
                            splitData[appName].predicted = appPredictedRevenue;
                          });
                          
                          const totalActualAll = Object.values(splitData).reduce((sum, d) => sum + d.actual, 0);
                          
                          return Object.entries(splitData)
                            .sort(([, a], [, b]) => b.actual - a.actual)
                            .map(([key, data]) => {
                              const proportion = totalActualAll > 0 ? data.actual / totalActualAll : 0;
                              const splitTarget = target * proportion;
                              const splitTotalProjected = data.actual + data.predicted;
                              const splitGap = splitTarget - splitTotalProjected;
                              const splitProgress = splitTarget > 0 ? (splitTotalProjected / splitTarget) * 100 : 0;
                              
                              return (
                                <div key={key} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-lg font-bold text-slate-800">{data.name}</h4>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                                      splitGap <= 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {splitGap <= 0 ? '▲ Sopra' : '▼ Sotto'}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-4 gap-3 mb-3">
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Target</p>
                                      <p className="text-sm font-bold text-blue-600">{formatEuro(splitTarget)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Attuale</p>
                                      <p className="text-sm font-bold text-green-600">{formatEuro(data.actual)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Previsto</p>
                                      <p className="text-sm font-bold text-purple-600">{formatEuro(splitTotalProjected)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Gap</p>
                                      <p className={`text-sm font-bold ${splitGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatEuro(Math.abs(splitGap))}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                                      <div 
                                        className={`h-full transition-all ${
                                          splitGap <= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'
                                        }`}
                                        style={{ width: `${Math.min(splitProgress, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{splitProgress.toFixed(0)}%</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                    <div className="text-slate-500">
                                      <span>Δ Attuale vs Richiesto (oggi): </span>
                                      <span className={`font-bold ${
                                        data.actual >= (splitTarget * (daysPassed / totalDays)) ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {formatEuro(data.actual - (splitTarget * (daysPassed / totalDays)))}
                                      </span>
                                    </div>
                                    <div className="text-slate-500">
                                      <span>Δ Previsto vs Target: </span>
                                      <span className={`font-bold ${splitGap <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatEuro(-splitGap)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                        })()}
                      </div>
                    )}
                  </NeumorphicCard>

                  {/* Per Canale */}
                  <NeumorphicCard className="p-6 mb-4">
                    <button
                      onClick={() => setExpandedSplit(prev => ({ ...prev, channel: !prev.channel }))}
                      className="w-full flex items-center justify-between"
                    >
                      <h3 className="text-lg font-bold text-slate-800">Dettaglio per Canale</h3>
                      <ChevronUp className={`w-5 h-5 text-slate-600 transition-transform ${expandedSplit.channel ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedSplit.channel && (
                      <div className="mt-4 space-y-4">
                        {(() => {
                          const splitData = {};
                          
                          // Calculate actual revenue per channel
                          currentData.forEach(item => {
                            const channels = [
                              { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                              { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                              { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                              { key: 'store', revenue: item.sourceType_store || 0 }
                            ];
                            channels.forEach(ch => {
                              const mappedKey = channelMapping[ch.key] || ch.key;
                              if (ch.revenue > 0) {
                                if (!splitData[mappedKey]) splitData[mappedKey] = { actual: 0, name: mappedKey };
                                splitData[mappedKey].actual += ch.revenue;
                              }
                            });
                          });
                          
                          // Calculate prediction for each channel
                          Object.keys(splitData).forEach(channelName => {
                            const channelHistoricalData = historicalData.filter(item => {
                              const channels = [
                                { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                                { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                                { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                                { key: 'store', revenue: item.sourceType_store || 0 }
                              ];
                              return channels.some(ch => {
                                const mappedKey = channelMapping[ch.key] || ch.key;
                                return mappedKey === channelName && ch.revenue > 0;
                              });
                            });
                            
                            const channelDailyTotals = {};
                            channelHistoricalData.forEach(item => {
                              if (!channelDailyTotals[item.order_date]) channelDailyTotals[item.order_date] = 0;
                              const channels = [
                                { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                                { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                                { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                                { key: 'store', revenue: item.sourceType_store || 0 }
                              ];
                              channels.forEach(ch => {
                                const mappedKey = channelMapping[ch.key] || ch.key;
                                if (mappedKey === channelName) channelDailyTotals[item.order_date] += ch.revenue;
                              });
                            });
                            
                            const channelDayOfWeekRevenues = {};
                            Object.entries(channelDailyTotals).forEach(([date, revenue]) => {
                              const itemDate = new Date(date);
                              if (itemDate >= seasonalityCutoff) {
                                const dayOfWeek = itemDate.getDay();
                                if (!channelDayOfWeekRevenues[dayOfWeek]) channelDayOfWeekRevenues[dayOfWeek] = [];
                                channelDayOfWeekRevenues[dayOfWeek].push(revenue);
                              }
                            });
                            
                            const channelAvgByDayOfWeek = {};
                            Object.keys(channelDayOfWeekRevenues).forEach(dayOfWeek => {
                              const revenues = channelDayOfWeekRevenues[dayOfWeek];
                              let avg = 0;
                              if (activeUseEMA && revenues.length > 0) {
                                const alpha = 0.2;
                                avg = revenues[0];
                                for (let i = 1; i < revenues.length; i++) {
                                  avg = alpha * revenues[i] + (1 - alpha) * avg;
                                }
                              } else {
                                avg = revenues.length > 0 ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length : 0;
                              }
                              channelAvgByDayOfWeek[dayOfWeek] = avg;
                            });
                            
                            let channelDailyGrowthRate = 0;
                            if (effectiveGrowthPeriodDays > 0) {
                              const growthCutoff = subDays(today, effectiveGrowthPeriodDays);
                              const growthData = Object.entries(channelDailyTotals)
                                .filter(([date]) => {
                                  const d = new Date(date);
                                  return d >= growthCutoff && d < today;
                                })
                                .sort(([a], [b]) => a.localeCompare(b));
                              
                              if (growthData.length >= 2) {
                                const n = growthData.length;
                                let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
                                growthData.forEach(([date, revenue], index) => {
                                  sumX += index;
                                  sumY += revenue;
                                  sumXY += index * revenue;
                                  sumX2 += index * index;
                                });
                                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                                channelDailyGrowthRate = slope;
                              }
                            }
                            
                            let channelPredictedRevenue = 0;
                            for (let i = 0; i < daysRemaining; i++) {
                              const futureDate = new Date(today);
                              futureDate.setDate(today.getDate() + i);
                              const dayOfWeek = futureDate.getDay();
                              const baseRev = channelAvgByDayOfWeek[dayOfWeek] || 0;
                              const growthAdj = channelDailyGrowthRate * (daysPassed + i);
                              channelPredictedRevenue += baseRev + growthAdj;
                            }
                            
                            splitData[channelName].predicted = channelPredictedRevenue;
                          });
                          
                          const totalActualAll = Object.values(splitData).reduce((sum, d) => sum + d.actual, 0);
                          
                          return Object.entries(splitData)
                            .sort(([, a], [, b]) => b.actual - a.actual)
                            .map(([key, data]) => {
                              const proportion = totalActualAll > 0 ? data.actual / totalActualAll : 0;
                              const splitTarget = target * proportion;
                              const splitTotalProjected = data.actual + data.predicted;
                              const splitGap = splitTarget - splitTotalProjected;
                              const splitProgress = splitTarget > 0 ? (splitTotalProjected / splitTarget) * 100 : 0;
                              
                              return (
                                <div key={key} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-lg font-bold text-slate-800">{data.name}</h4>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                                      splitGap <= 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {splitGap <= 0 ? '▲ Sopra' : '▼ Sotto'}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-4 gap-3 mb-3">
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Target</p>
                                      <p className="text-sm font-bold text-blue-600">{formatEuro(splitTarget)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Attuale</p>
                                      <p className="text-sm font-bold text-green-600">{formatEuro(data.actual)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Previsto</p>
                                      <p className="text-sm font-bold text-purple-600">{formatEuro(splitTotalProjected)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Gap</p>
                                      <p className={`text-sm font-bold ${splitGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatEuro(Math.abs(splitGap))}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                                      <div 
                                        className={`h-full transition-all ${
                                          splitGap <= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'
                                        }`}
                                        style={{ width: `${Math.min(splitProgress, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{splitProgress.toFixed(0)}%</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                    <div className="text-slate-500">
                                      <span>Δ Attuale vs Richiesto (oggi): </span>
                                      <span className={`font-bold ${
                                        data.actual >= (splitTarget * (daysPassed / totalDays)) ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {formatEuro(data.actual - (splitTarget * (daysPassed / totalDays)))}
                                      </span>
                                    </div>
                                    <div className="text-slate-500">
                                      <span>Δ Previsto vs Target: </span>
                                      <span className={`font-bold ${splitGap <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatEuro(-splitGap)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                        })()}
                      </div>
                    )}
                  </NeumorphicCard>
                </>
              )}

              {/* Tabella Dettaglio Giornaliero */}
              <NeumorphicCard className="p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Dettaglio Periodo</h3>
                  <div className="flex gap-2">
                    <select
                      value={detailView}
                      onChange={(e) => setDetailView(e.target.value)}
                      className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 text-sm"
                    >
                      <option value="daily">Giornaliero</option>
                      <option value="weekly">Settimanale</option>
                      <option value="monthly">Mensile</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b-2 border-blue-600">
                        <th className="text-left p-3 text-slate-600 font-medium text-sm">Giorno</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm">Effettivo</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm">Previsto</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm bg-purple-50">Δ vs Previsto</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm bg-purple-50">Δ % vs Previsto</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm">Richiesto</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm bg-orange-50">Δ vs Richiesto</th>
                        <th className="text-right p-3 text-slate-600 font-medium text-sm bg-orange-50">Δ % vs Richiesto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Build daily revenue map with store split if needed
                        const dailyRevenueMap = {};
                        const dailyRevenueByStore = {};
                        
                        currentData.forEach(item => {
                          const key = splitBy === 'store' ? `${item.order_date}_${item.store_id}` : item.order_date;
                          if (!dailyRevenueMap[item.order_date]) {
                            dailyRevenueMap[item.order_date] = 0;
                          }
                          if (splitBy === 'store') {
                            if (!dailyRevenueByStore[key]) {
                              dailyRevenueByStore[key] = { storeId: item.store_id, revenue: 0 };
                            }
                          }
                          
                          let itemRevenue = 0;
                          if (activeTargetApp) {
                            const apps = [
                              { key: 'glovo', revenue: item.sourceApp_glovo || 0 },
                              { key: 'deliveroo', revenue: item.sourceApp_deliveroo || 0 },
                              { key: 'justeat', revenue: item.sourceApp_justeat || 0 },
                              { key: 'onlineordering', revenue: item.sourceApp_onlineordering || 0 },
                              { key: 'ordertable', revenue: item.sourceApp_ordertable || 0 },
                              { key: 'tabesto', revenue: item.sourceApp_tabesto || 0 },
                              { key: 'store', revenue: item.sourceApp_store || 0 }
                            ];
                            apps.forEach(app => {
                              const mappedKey = appMapping[app.key] || app.key;
                              if (mappedKey === activeTargetApp) itemRevenue += app.revenue;
                            });
                          } else if (activeTargetChannel) {
                            const channels = [
                              { key: 'delivery', revenue: item.sourceType_delivery || 0 },
                              { key: 'takeaway', revenue: item.sourceType_takeaway || 0 },
                              { key: 'takeawayOnSite', revenue: item.sourceType_takeawayOnSite || 0 },
                              { key: 'store', revenue: item.sourceType_store || 0 }
                            ];
                            channels.forEach(ch => {
                              const mappedKey = channelMapping[ch.key] || ch.key;
                              if (mappedKey === activeTargetChannel) itemRevenue += ch.revenue;
                            });
                          } else {
                            itemRevenue = item.total_revenue || 0;
                          }
                          
                          dailyRevenueMap[item.order_date] += itemRevenue;
                          if (splitBy === 'store') {
                            dailyRevenueByStore[key].revenue += itemRevenue;
                          }
                        });

                        // Aggregate based on view
                        let detailRows = [];
                        
                        if (detailView === 'daily') {
                          // Daily view - NO SPLIT in table anymore
                          if (false && splitBy === 'store') {
                            // Group by date and store
                            const dateStoreMap = {};
                            Object.entries(dailyRevenueByStore).forEach(([key, data]) => {
                              const [dateStr, storeId] = key.split('_');
                              if (!dateStoreMap[dateStr]) dateStoreMap[dateStr] = [];
                              dateStoreMap[dateStr].push({ storeId, revenue: data.revenue });
                            });
                            
                            for (let i = 0; i < totalDays; i++) {
                              const currentDate = new Date(periodStart);
                              currentDate.setDate(periodStart.getDate() + i);
                              const dateStr = format(currentDate, 'yyyy-MM-dd');
                              const isPast = currentDate <= today;
                              
                              const storesForDate = dateStoreMap[dateStr] || [];
                              const totalActual = dailyRevenueMap[dateStr] || 0;
                              
                              if (storesForDate.length > 0) {
                                storesForDate.forEach(s => {
                                  const storeName = stores.find(st => st.id === s.storeId)?.name || s.storeId;
                                  const dayOfWeek = currentDate.getDay();
                                  const baseRevenue = avgByDayOfWeek[dayOfWeek] || 0;
                                  const growthAdjustment = dailyGrowthRate * i;
                                  const predictedRevenue = (baseRevenue + growthAdjustment) * (s.revenue / (totalActual || 1));
                                  
                                  detailRows.push({
                                    date: `${format(currentDate, 'dd/MM (EEE)', { locale: it })} - ${storeName}`,
                                    actual: isPast ? s.revenue : null,
                                    predicted: predictedRevenue,
                                    deltaVsPredicted: isPast ? (s.revenue - predictedRevenue) : null,
                                    deltaPercentVsPredicted: isPast && predictedRevenue > 0 ? ((s.revenue - predictedRevenue) / predictedRevenue) * 100 : null,
                                    required: 0,
                                    deltaVsRequired: null,
                                    deltaPercentVsRequired: null,
                                    isPast
                                  });
                                });
                              } else {
                                const dayOfWeek = currentDate.getDay();
                                const baseRevenue = avgByDayOfWeek[dayOfWeek] || 0;
                                const growthAdjustment = dailyGrowthRate * i;
                                const predictedRevenue = baseRevenue + growthAdjustment;
                                
                                detailRows.push({
                                  date: format(currentDate, 'dd/MM (EEE)', { locale: it }),
                                  actual: isPast ? 0 : null,
                                  predicted: predictedRevenue,
                                  deltaVsPredicted: isPast ? -predictedRevenue : null,
                                  deltaPercentVsPredicted: null,
                                  required: 0,
                                  deltaVsRequired: null,
                                  deltaPercentVsRequired: null,
                                  isPast
                                });
                              }
                            }
                          } else {
                            // No split
                            for (let i = 0; i < totalDays; i++) {
                              const currentDate = new Date(periodStart);
                              currentDate.setDate(periodStart.getDate() + i);
                              const dateStr = format(currentDate, 'yyyy-MM-dd');
                              const isPast = currentDate <= today;
                              
                              const actualRevenue = dailyRevenueMap[dateStr] || 0;
                              const dayOfWeek = currentDate.getDay();
                              const baseRevenue = avgByDayOfWeek[dayOfWeek] || 0;
                              const growthAdjustment = dailyGrowthRate * i;
                              const predictedRevenue = baseRevenue + growthAdjustment;
                              
                              const dayWeight = avgByDayOfWeek[dayOfWeek] || 0;
                              const requiredRevenue = totalSeasonalityWeight > 0 ? (target * (dayWeight / totalSeasonalityWeight)) : (target / totalDays);
                              
                              detailRows.push({
                                date: format(currentDate, 'dd/MM (EEE)', { locale: it }),
                                actual: isPast ? actualRevenue : null,
                                predicted: predictedRevenue,
                                deltaVsPredicted: isPast ? (actualRevenue - predictedRevenue) : null,
                                deltaPercentVsPredicted: isPast && predictedRevenue > 0 ? ((actualRevenue - predictedRevenue) / predictedRevenue) * 100 : null,
                                required: requiredRevenue,
                                deltaVsRequired: isPast ? (actualRevenue - requiredRevenue) : null,
                                deltaPercentVsRequired: isPast && requiredRevenue > 0 ? ((actualRevenue - requiredRevenue) / requiredRevenue) * 100 : null,
                                isPast
                              });
                            }
                          }
                        } else if (detailView === 'weekly') {
                          // Weekly aggregation - collect all dates in each week
                          const weeklyDataMap = {};
                          
                          for (let i = 0; i < totalDays; i++) {
                            const currentDate = new Date(periodStart);
                            currentDate.setDate(periodStart.getDate() + i);
                            const dateStr = format(currentDate, 'yyyy-MM-dd');
                            
                            // Find week start (Monday)
                            const weekStart = new Date(currentDate);
                            const dayOfWeek = weekStart.getDay();
                            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
                            weekStart.setDate(weekStart.getDate() + diff);
                            const weekKey = format(weekStart, 'yyyy-MM-dd');
                            
                            if (!weeklyDataMap[weekKey]) {
                              weeklyDataMap[weekKey] = {
                                start: new Date(weekStart),
                                end: new Date(weekStart),
                                actual: 0,
                                predicted: 0,
                                required: 0,
                                dates: []
                              };
                            }
                            
                            weeklyDataMap[weekKey].end = new Date(currentDate);
                            weeklyDataMap[weekKey].dates.push(dateStr);
                            
                            const actualRev = dailyRevenueMap[dateStr] || 0;
                            weeklyDataMap[weekKey].actual += actualRev;
                            
                            const dow = currentDate.getDay();
                            const baseRevenue = avgByDayOfWeek[dow] || 0;
                            const growthAdjustment = dailyGrowthRate * i;
                            weeklyDataMap[weekKey].predicted += baseRevenue + growthAdjustment;
                            
                            const dayWeight = avgByDayOfWeek[dow] || 0;
                            weeklyDataMap[weekKey].required += totalSeasonalityWeight > 0 ? (target * (dayWeight / totalSeasonalityWeight)) : (target / totalDays);
                          }
                          
                          Object.values(weeklyDataMap).forEach(week => {
                            const isPast = week.end <= today;
                            
                            detailRows.push({
                              date: `${format(week.start, 'dd/MM')} - ${format(week.end, 'dd/MM')}`,
                              actual: isPast ? week.actual : null,
                              predicted: week.predicted,
                              deltaVsPredicted: isPast ? (week.actual - week.predicted) : null,
                              deltaPercentVsPredicted: isPast && week.predicted > 0 ? ((week.actual - week.predicted) / week.predicted) * 100 : null,
                              required: week.required,
                              deltaVsRequired: isPast ? (week.actual - week.required) : null,
                              deltaPercentVsRequired: isPast && week.required > 0 ? ((week.actual - week.required) / week.required) * 100 : null,
                              isPast
                            });
                          });
                        } else if (detailView === 'monthly') {
                          // Monthly aggregation
                          const monthlyDataMap = {};
                          
                          for (let i = 0; i < totalDays; i++) {
                            const currentDate = new Date(periodStart);
                            currentDate.setDate(periodStart.getDate() + i);
                            const dateStr = format(currentDate, 'yyyy-MM-dd');
                            const monthKey = format(currentDate, 'yyyy-MM');
                            
                            if (!monthlyDataMap[monthKey]) {
                              monthlyDataMap[monthKey] = {
                                start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                                end: currentDate,
                                actual: 0,
                                predicted: 0,
                                required: 0
                              };
                            }
                            
                            monthlyDataMap[monthKey].end = new Date(currentDate);
                            
                            const actualRev = dailyRevenueMap[dateStr] || 0;
                            monthlyDataMap[monthKey].actual += actualRev;
                            
                            const dayOfWeek = currentDate.getDay();
                            const baseRevenue = avgByDayOfWeek[dayOfWeek] || 0;
                            const growthAdjustment = dailyGrowthRate * i;
                            monthlyDataMap[monthKey].predicted += baseRevenue + growthAdjustment;
                            
                            const dayWeight = avgByDayOfWeek[dayOfWeek] || 0;
                            monthlyDataMap[monthKey].required += totalSeasonalityWeight > 0 ? (target * (dayWeight / totalSeasonalityWeight)) : (target / totalDays);
                          }
                          
                          Object.values(monthlyDataMap).forEach(month => {
                            const isPast = month.end < today || (month.end.getTime() === today.getTime());
                            
                            detailRows.push({
                              date: format(month.start, 'MMMM yyyy', { locale: it }),
                              actual: month.actual > 0 ? month.actual : null,
                              predicted: month.predicted,
                              deltaVsPredicted: isPast ? (month.actual - month.predicted) : null,
                              deltaPercentVsPredicted: isPast && month.predicted > 0 ? ((month.actual - month.predicted) / month.predicted) * 100 : null,
                              required: month.required,
                              deltaVsRequired: isPast ? (month.actual - month.required) : null,
                              deltaPercentVsRequired: isPast && month.required > 0 ? ((month.actual - month.required) / month.required) * 100 : null,
                              isPast
                            });
                          });
                        }
                        
                        return detailRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-3 text-slate-700 font-medium text-sm">{row.date}</td>
                            <td className="p-3 text-right text-slate-700 font-bold text-sm">
                              {row.actual !== null ? `€${formatCurrency(Math.round(row.actual), 0)}` : '-'}
                            </td>
                            <td className="p-3 text-right text-slate-600 text-sm">
                              €{formatCurrency(Math.round(row.predicted), 0)}
                            </td>
                            <td className={`p-3 text-right font-bold text-sm bg-purple-50 ${
                              row.deltaVsPredicted !== null ? (row.deltaVsPredicted >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'
                            }`}>
                              {row.deltaVsPredicted !== null ? `${row.deltaVsPredicted >= 0 ? '+' : ''}€${formatCurrency(Math.round(row.deltaVsPredicted), 0)}` : '-'}
                            </td>
                            <td className={`p-3 text-right font-bold text-sm bg-purple-50 ${
                              row.deltaPercentVsPredicted !== null ? (row.deltaPercentVsPredicted >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'
                            }`}>
                              {row.deltaPercentVsPredicted !== null ? `${row.deltaPercentVsPredicted >= 0 ? '+' : ''}${row.deltaPercentVsPredicted.toFixed(1)}%` : '-'}
                            </td>
                            <td className="p-3 text-right text-orange-600 font-bold text-sm">
                              €{formatCurrency(Math.round(row.required), 0)}
                            </td>
                            <td className={`p-3 text-right font-bold text-sm bg-orange-50 ${
                              row.deltaVsRequired !== null ? (row.deltaVsRequired >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'
                            }`}>
                              {row.deltaVsRequired !== null ? `${row.deltaVsRequired >= 0 ? '+' : ''}€${formatCurrency(Math.round(row.deltaVsRequired), 0)}` : '-'}
                            </td>
                            <td className={`p-3 text-right font-bold text-sm bg-orange-50 ${
                              row.deltaPercentVsRequired !== null ? (row.deltaPercentVsRequired >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'
                            }`}>
                              {row.deltaPercentVsRequired !== null ? `${row.deltaPercentVsRequired >= 0 ? '+' : ''}${row.deltaPercentVsRequired.toFixed(1)}%` : '-'}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
                
                <p className="text-xs text-slate-500 mt-3">
                  💡 "Previsto" = stima basata su stagionalità storica, "Richiesto" = quanto serviva per raggiungere il target (distribuito con stagionalità). <strong>"Delta"</strong> = differenza tra Effettivo e Previsto (in € assoluti e %).
                </p>
              </NeumorphicCard>
            </>
          );
        })()}
      </div>
    </ProtectedPage>
  );
}