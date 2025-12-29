import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/nemorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  TrendingUp, Download, Calendar, Store, Tag, BarChart3, 
  LineChart as LineChartIcon, PieChart as PieChartIcon, ArrowUpDown 
} from "lucide-react";
import moment from "moment";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area
} from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function VenditeAnalytics() {
  // Date ranges
  const [mainStartDate, setMainStartDate] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
  const [mainEndDate, setMainEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [compareStartDate, setCompareStartDate] = useState(moment().subtract(60, 'days').format('YYYY-MM-DD'));
  const [compareEndDate, setCompareEndDate] = useState(moment().subtract(31, 'days').format('YYYY-MM-DD'));
  
  // Filters
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [comparisonMode, setComparisonMode] = useState('none'); // 'none', 'period', 'yoy', 'mom'
  const [chartType, setChartType] = useState('line'); // 'line', 'bar', 'area', 'pie'
  const [groupBy, setGroupBy] = useState('day'); // 'day', 'week', 'month'

  // Data fetching
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: mainPeriodData = [] } = useQuery({
    queryKey: ['vendite-main', mainStartDate, mainEndDate],
    queryFn: () => base44.entities.ProdottiVenduti.filter({
      data_vendita: { $gte: mainStartDate, $lte: mainEndDate }
    }),
  });

  const { data: comparePeriodData = [] } = useQuery({
    queryKey: ['vendite-compare', compareStartDate, compareEndDate],
    queryFn: () => base44.entities.ProdottiVenduti.filter({
      data_vendita: { $gte: compareStartDate, $lte: compareEndDate }
    }),
    enabled: comparisonMode !== 'none',
  });

  // Quick date range selectors
  const setQuickRange = (range) => {
    const now = moment();
    switch(range) {
      case 'today':
        setMainStartDate(now.format('YYYY-MM-DD'));
        setMainEndDate(now.format('YYYY-MM-DD'));
        break;
      case 'week':
        setMainStartDate(now.subtract(7, 'days').format('YYYY-MM-DD'));
        setMainEndDate(moment().format('YYYY-MM-DD'));
        break;
      case 'month':
        setMainStartDate(now.subtract(30, 'days').format('YYYY-MM-DD'));
        setMainEndDate(moment().format('YYYY-MM-DD'));
        break;
      case 'quarter':
        setMainStartDate(now.subtract(90, 'days').format('YYYY-MM-DD'));
        setMainEndDate(moment().format('YYYY-MM-DD'));
        break;
      case 'year':
        setMainStartDate(now.subtract(365, 'days').format('YYYY-MM-DD'));
        setMainEndDate(moment().format('YYYY-MM-DD'));
        break;
    }
  };

  const setComparisonPeriod = (type) => {
    setComparisonMode(type);
    const mainDays = moment(mainEndDate).diff(moment(mainStartDate), 'days');
    
    switch(type) {
      case 'period':
        setCompareStartDate(moment(mainStartDate).subtract(mainDays + 1, 'days').format('YYYY-MM-DD'));
        setCompareEndDate(moment(mainStartDate).subtract(1, 'days').format('YYYY-MM-DD'));
        break;
      case 'yoy':
        setCompareStartDate(moment(mainStartDate).subtract(1, 'year').format('YYYY-MM-DD'));
        setCompareEndDate(moment(mainEndDate).subtract(1, 'year').format('YYYY-MM-DD'));
        break;
      case 'mom':
        setCompareStartDate(moment(mainStartDate).subtract(1, 'month').format('YYYY-MM-DD'));
        setCompareEndDate(moment(mainEndDate).subtract(1, 'month').format('YYYY-MM-DD'));
        break;
      case 'none':
      default:
        break;
    }
  };

  // Available categories
  const availableCategories = useMemo(() => {
    return [...new Set(mainPeriodData.map(p => p.category))].filter(Boolean);
  }, [mainPeriodData]);

  // Filter data
  const filteredMainData = useMemo(() => {
    return mainPeriodData.filter(p => {
      if (selectedStores.length > 0 && !selectedStores.includes(p.store_id)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) return false;
      return true;
    });
  }, [mainPeriodData, selectedStores, selectedCategories]);

  const filteredCompareData = useMemo(() => {
    return comparePeriodData.filter(p => {
      if (selectedStores.length > 0 && !selectedStores.includes(p.store_id)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) return false;
      return true;
    });
  }, [comparePeriodData, selectedStores, selectedCategories]);

  // Aggregate data by groupBy
  const aggregateByPeriod = (data) => {
    const grouped = {};
    data.forEach(item => {
      let key;
      const date = moment(item.data_vendita);
      
      if (groupBy === 'day') {
        key = date.format('YYYY-MM-DD');
      } else if (groupBy === 'week') {
        key = date.startOf('week').format('YYYY-MM-DD');
      } else if (groupBy === 'month') {
        key = date.format('YYYY-MM');
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          revenue: 0,
          units: 0,
          orders: 0
        };
      }

      grouped[key].revenue += item.total_revenue || 0;
      grouped[key].units += item.total_pizzas_sold || 0;
      grouped[key].orders += 1;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  };

  const mainAggregated = useMemo(() => aggregateByPeriod(filteredMainData), [filteredMainData, groupBy]);
  const compareAggregated = useMemo(() => aggregateByPeriod(filteredCompareData), [filteredCompareData, groupBy]);

  // Chart data with comparison
  const chartData = useMemo(() => {
    if (comparisonMode === 'none') {
      return mainAggregated.map(d => ({
        date: groupBy === 'month' ? moment(d.date).format('MMM YYYY') : moment(d.date).format('DD/MM'),
        revenue: d.revenue,
        units: d.units
      }));
    }

    // Align comparison data by index
    return mainAggregated.map((d, idx) => ({
      date: groupBy === 'month' ? moment(d.date).format('MMM YYYY') : moment(d.date).format('DD/MM'),
      revenue: d.revenue,
      units: d.units,
      revenue_compare: compareAggregated[idx]?.revenue || 0,
      units_compare: compareAggregated[idx]?.units || 0
    }));
  }, [mainAggregated, compareAggregated, comparisonMode, groupBy]);

  // Stats
  const mainStats = useMemo(() => {
    const totalRevenue = filteredMainData.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
    const totalUnits = filteredMainData.reduce((sum, p) => sum + (p.total_pizzas_sold || 0), 0);
    const totalOrders = filteredMainData.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalRevenue, totalUnits, totalOrders, avgOrderValue };
  }, [filteredMainData]);

  const compareStats = useMemo(() => {
    if (comparisonMode === 'none') return null;
    
    const totalRevenue = filteredCompareData.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
    const totalUnits = filteredCompareData.reduce((sum, p) => sum + (p.total_pizzas_sold || 0), 0);
    const totalOrders = filteredCompareData.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalRevenue, totalUnits, totalOrders, avgOrderValue };
  }, [filteredCompareData, comparisonMode]);

  // Performance by store
  const storePerformance = useMemo(() => {
    const byStore = {};
    filteredMainData.forEach(p => {
      if (!byStore[p.store_name]) {
        byStore[p.store_name] = { revenue: 0, units: 0, orders: 0 };
      }
      byStore[p.store_name].revenue += p.total_revenue || 0;
      byStore[p.store_name].units += p.total_pizzas_sold || 0;
      byStore[p.store_name].orders += 1;
    });

    return Object.entries(byStore)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredMainData]);

  // Performance by category
  const categoryPerformance = useMemo(() => {
    const byCategory = {};
    filteredMainData.forEach(p => {
      if (!byCategory[p.category]) {
        byCategory[p.category] = { revenue: 0, units: 0, orders: 0 };
      }
      byCategory[p.category].revenue += p.total_revenue || 0;
      byCategory[p.category].units += p.total_pizzas_sold || 0;
      byCategory[p.category].orders += 1;
    });

    return Object.entries(byCategory)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredMainData]);

  // Export functions
  const exportToCSV = () => {
    const headers = comparisonMode === 'none' 
      ? ['Data', 'Revenue', 'Unità']
      : ['Data', 'Revenue Periodo 1', 'Unità Periodo 1', 'Revenue Periodo 2', 'Unità Periodo 2'];
    
    const rows = chartData.map(d => 
      comparisonMode === 'none'
        ? [d.date, d.revenue.toFixed(2), d.units]
        : [d.date, d.revenue.toFixed(2), d.units, d.revenue_compare?.toFixed(2) || '0', d.units_compare || '0']
    );

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendite-analytics-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  const calcPercentChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <ProtectedPage pageName="VenditeAnalytics" requiredUserTypes={['admin', 'manager']}>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Analytics Vendite
            </h1>
            <p className="text-slate-500 mt-1">Dashboard avanzata con confronto periodi e analisi dettagliata</p>
          </div>
          <NeumorphicButton onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Esporta CSV
          </NeumorphicButton>
        </div>

        {/* Date Range and Filters */}
        <NeumorphicCard className="p-6">
          <div className="space-y-4">
            {/* Quick ranges */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Periodo rapido</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'today', label: 'Oggi' },
                  { value: 'week', label: 'Ultimi 7gg' },
                  { value: 'month', label: 'Ultimi 30gg' },
                  { value: 'quarter', label: 'Ultimi 90gg' },
                  { value: 'year', label: 'Ultimo anno' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setQuickRange(opt.value)}
                    className="px-4 py-2 rounded-lg text-sm font-medium neumorphic-flat text-slate-700 hover:bg-blue-50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Periodo Principale - Inizio
                </label>
                <input
                  type="date"
                  value={mainStartDate}
                  onChange={(e) => setMainStartDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Periodo Principale - Fine
                </label>
                <input
                  type="date"
                  value={mainEndDate}
                  onChange={(e) => setMainEndDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Comparison mode */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <ArrowUpDown className="w-4 h-4 inline mr-1" />
                Modalità confronto
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'none', label: 'Nessuno' },
                  { value: 'period', label: 'Periodo precedente' },
                  { value: 'yoy', label: 'Anno su anno' },
                  { value: 'mom', label: 'Mese su mese' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setComparisonPeriod(opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      comparisonMode === opt.value
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                        : 'neumorphic-flat text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comparison period dates (if enabled) */}
            {comparisonMode !== 'none' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Periodo Confronto - Inizio
                  </label>
                  <input
                    type="date"
                    value={compareStartDate}
                    onChange={(e) => setCompareStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Periodo Confronto - Fine
                  </label>
                  <input
                    type="date"
                    value={compareEndDate}
                    onChange={(e) => setCompareEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Store filter */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Store className="w-4 h-4 inline mr-1" />
                Filtra per negozio
              </label>
              <div className="flex flex-wrap gap-2">
                {stores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => {
                      setSelectedStores(prev =>
                        prev.includes(store.id)
                          ? prev.filter(id => id !== store.id)
                          : [...prev, store.id]
                      );
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedStores.includes(store.id)
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'neumorphic-flat text-slate-700'
                    }`}
                  >
                    {store.name}
                  </button>
                ))}
                {selectedStores.length > 0 && (
                  <button
                    onClick={() => setSelectedStores([])}
                    className="px-4 py-2 rounded-lg text-sm font-medium neumorphic-flat text-red-600"
                  >
                    Mostra Tutti
                  </button>
                )}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Tag className="w-4 h-4 inline mr-1" />
                Filtra per categoria
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategories(prev =>
                        prev.includes(cat)
                          ? prev.filter(c => c !== cat)
                          : [...prev, cat]
                      );
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCategories.includes(cat)
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'neumorphic-flat text-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="px-4 py-2 rounded-lg text-sm font-medium neumorphic-flat text-red-600"
                  >
                    Mostra Tutte
                  </button>
                )}
              </div>
            </div>

            {/* Group by */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Raggruppa per</label>
              <div className="flex gap-2">
                {[
                  { value: 'day', label: 'Giorno' },
                  { value: 'week', label: 'Settimana' },
                  { value: 'month', label: 'Mese' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGroupBy(opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      groupBy === opt.value
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                        : 'neumorphic-flat text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NeumorphicCard className="p-6">
            <p className="text-sm text-slate-500 mb-1">Revenue Totale</p>
            <p className="text-3xl font-bold text-slate-800">€{mainStats.totalRevenue.toFixed(0)}</p>
            {compareStats && (
              <p className={`text-sm mt-2 ${
                mainStats.totalRevenue >= compareStats.totalRevenue ? 'text-green-600' : 'text-red-600'
              }`}>
                {calcPercentChange(mainStats.totalRevenue, compareStats.totalRevenue)}% vs periodo confronto
              </p>
            )}
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <p className="text-sm text-slate-500 mb-1">Unità Vendute</p>
            <p className="text-3xl font-bold text-slate-800">{mainStats.totalUnits}</p>
            {compareStats && (
              <p className={`text-sm mt-2 ${
                mainStats.totalUnits >= compareStats.totalUnits ? 'text-green-600' : 'text-red-600'
              }`}>
                {calcPercentChange(mainStats.totalUnits, compareStats.totalUnits)}% vs periodo confronto
              </p>
            )}
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <p className="text-sm text-slate-500 mb-1">Ordini</p>
            <p className="text-3xl font-bold text-slate-800">{mainStats.totalOrders}</p>
            {compareStats && (
              <p className={`text-sm mt-2 ${
                mainStats.totalOrders >= compareStats.totalOrders ? 'text-green-600' : 'text-red-600'
              }`}>
                {calcPercentChange(mainStats.totalOrders, compareStats.totalOrders)}% vs periodo confronto
              </p>
            )}
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <p className="text-sm text-slate-500 mb-1">Valore Medio Ordine</p>
            <p className="text-3xl font-bold text-slate-800">€{mainStats.avgOrderValue.toFixed(2)}</p>
            {compareStats && (
              <p className={`text-sm mt-2 ${
                mainStats.avgOrderValue >= compareStats.avgOrderValue ? 'text-green-600' : 'text-red-600'
              }`}>
                {calcPercentChange(mainStats.avgOrderValue, compareStats.avgOrderValue)}% vs periodo confronto
              </p>
            )}
          </NeumorphicCard>
        </div>

        {/* Chart Type Selector */}
        <NeumorphicCard className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Tipo grafico:</span>
            {[
              { value: 'line', label: 'Linea', icon: LineChartIcon },
              { value: 'bar', label: 'Barre', icon: BarChart3 },
              { value: 'area', label: 'Area', icon: TrendingUp }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setChartType(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  chartType === opt.value
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'neumorphic-flat text-slate-700'
                }`}
              >
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </NeumorphicCard>

        {/* Main Chart */}
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Trend Revenue e Unità</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis yAxisId="left" stroke="#64748b" />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue €" />
                  {comparisonMode !== 'none' && (
                    <Line yAxisId="left" type="monotone" dataKey="revenue_compare" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Revenue € (confronto)" />
                  )}
                  <Line yAxisId="right" type="monotone" dataKey="units" stroke="#10b981" strokeWidth={2} name="Unità" />
                  {comparisonMode !== 'none' && (
                    <Line yAxisId="right" type="monotone" dataKey="units_compare" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Unità (confronto)" />
                  )}
                </LineChart>
              ) : chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue €" />
                  {comparisonMode !== 'none' && (
                    <Bar dataKey="revenue_compare" fill="#ef4444" name="Revenue € (confronto)" />
                  )}
                </BarChart>
              ) : (
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.3} name="Revenue €" />
                  {comparisonMode !== 'none' && (
                    <Area type="monotone" dataKey="revenue_compare" fill="#ef4444" stroke="#ef4444" fillOpacity={0.2} name="Revenue € (confronto)" />
                  )}
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </NeumorphicCard>

        {/* Performance by Store and Category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Store */}
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Performance per Negozio</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storePerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis type="category" dataKey="name" stroke="#64748b" width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue €" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </NeumorphicCard>

          {/* By Category */}
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Performance per Categoria</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPerformance}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={entry => `${entry.name}: €${entry.revenue.toFixed(0)}`}
                  >
                    {categoryPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </NeumorphicCard>
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Top 10 Negozi per Revenue</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-2 text-slate-700">Negozio</th>
                    <th className="text-right py-2 text-slate-700">Revenue</th>
                    <th className="text-right py-2 text-slate-700">Unità</th>
                    <th className="text-right py-2 text-slate-700">Ordini</th>
                  </tr>
                </thead>
                <tbody>
                  {storePerformance.slice(0, 10).map((store, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2 text-slate-700">{store.name}</td>
                      <td className="py-2 text-right font-semibold text-blue-600">€{store.revenue.toFixed(2)}</td>
                      <td className="py-2 text-right text-slate-600">{store.units}</td>
                      <td className="py-2 text-right text-slate-600">{store.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Performance per Categoria</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-2 text-slate-700">Categoria</th>
                    <th className="text-right py-2 text-slate-700">Revenue</th>
                    <th className="text-right py-2 text-slate-700">Unità</th>
                    <th className="text-right py-2 text-slate-700">Ordini</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryPerformance.map((cat, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2 text-slate-700">{cat.name}</td>
                      <td className="py-2 text-right font-semibold text-green-600">€{cat.revenue.toFixed(2)}</td>
                      <td className="py-2 text-right text-slate-600">{cat.units}</td>
                      <td className="py-2 text-right text-slate-600">{cat.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
        </div>
      </div>
    </ProtectedPage>
  );
}