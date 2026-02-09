import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { TrendingUp, TrendingDown, Store as StoreIcon, Calendar, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { formatEuro } from "../components/utils/formatCurrency";

const COLORS = {
  glovo: '#FFC244',
  deliveroo: '#00CCBC',
  justeat: '#FF8000',
  onlineordering: '#3b82f6',
  ordertable: '#8b5cf6',
  tabesto: '#10b981',
  store: '#ef4444'
};

const CHANNEL_LABELS = {
  glovo: 'Glovo',
  deliveroo: 'Deliveroo',
  justeat: 'JustEat',
  onlineordering: 'Online Ordering',
  ordertable: 'Order Table',
  tabesto: 'Tabesto',
  store: 'Store'
};

export default function Cannibalizzazione() {
  const [selectedAnalysis, setSelectedAnalysis] = useState('revenue_totale'); // revenue_totale | per_canale
  const [selectedStore, setSelectedStore] = useState('all');
  const [showOpeningDates, setShowOpeningDates] = useState(true);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: iPraticoData = [] } = useQuery({
    queryKey: ['ipratico'],
    queryFn: () => base44.entities.iPratico.list()
  });

  // Calculate opening dates from first revenue data
  const storeOpeningDates = useMemo(() => {
    const openings = {};
    
    stores.forEach(store => {
      const storeData = iPraticoData
        .filter(d => d.store_id === store.id && d.total_revenue > 0)
        .sort((a, b) => new Date(a.order_date) - new Date(b.order_date));
      
      if (storeData.length > 0) {
        openings[store.id] = {
          store_name: store.name,
          opening_date: storeData[0].order_date,
          first_revenue: storeData[0].total_revenue
        };
      }
    });

    return Object.values(openings).sort((a, b) => 
      new Date(a.opening_date) - new Date(b.opening_date)
    );
  }, [stores, iPraticoData]);

  // Timeline data - revenue totale
  const timelineData = useMemo(() => {
    const dailyData = {};

    iPraticoData.forEach(d => {
      const dateKey = d.order_date;
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          revenue: 0,
          stores_active: new Set()
        };
      }
      dailyData[dateKey].revenue += d.total_revenue || 0;
      dailyData[dateKey].stores_active.add(d.store_id);
    });

    return Object.values(dailyData)
      .map(d => ({
        ...d,
        stores_count: d.stores_active.size,
        stores_active: undefined
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [iPraticoData]);

  // Timeline data - per canale
  const channelTimelineData = useMemo(() => {
    const dailyData = {};

    iPraticoData.forEach(d => {
      const dateKey = d.order_date;
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          glovo: 0,
          deliveroo: 0,
          justeat: 0,
          onlineordering: 0,
          ordertable: 0,
          tabesto: 0,
          store: 0
        };
      }
      dailyData[dateKey].glovo += d.sourceApp_glovo || 0;
      dailyData[dateKey].deliveroo += d.sourceApp_deliveroo || 0;
      dailyData[dateKey].justeat += d.sourceApp_justeat || 0;
      dailyData[dateKey].onlineordering += d.sourceApp_onlineordering || 0;
      dailyData[dateKey].ordertable += d.sourceApp_ordertable || 0;
      dailyData[dateKey].tabesto += d.sourceApp_tabesto || 0;
      dailyData[dateKey].store += d.sourceApp_store || 0;
    });

    return Object.values(dailyData)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [iPraticoData]);

  // Analisi impatto aperture
  const impactAnalysis = useMemo(() => {
    return storeOpeningDates.map((opening, index) => {
      const openingDate = new Date(opening.opening_date);
      
      // Calculate before period (30 days before opening, or from previous opening)
      let beforeStart;
      if (index === 0) {
        beforeStart = new Date(openingDate);
        beforeStart.setDate(beforeStart.getDate() - 30);
      } else {
        beforeStart = new Date(storeOpeningDates[index - 1].opening_date);
      }
      
      const beforeEnd = new Date(openingDate);
      beforeEnd.setDate(beforeEnd.getDate() - 1);

      // Calculate after period (30 days after opening)
      const afterStart = openingDate;
      const afterEnd = new Date(openingDate);
      afterEnd.setDate(afterEnd.getDate() + 30);

      // Revenue before
      const revenueBefore = iPraticoData
        .filter(d => {
          const date = new Date(d.order_date);
          return date >= beforeStart && date <= beforeEnd;
        })
        .reduce((sum, d) => sum + (d.total_revenue || 0), 0);

      // Revenue after
      const revenueAfter = iPraticoData
        .filter(d => {
          const date = new Date(d.order_date);
          return date >= afterStart && date <= afterEnd;
        })
        .reduce((sum, d) => sum + (d.total_revenue || 0), 0);

      // Revenue for other stores before/after
      const otherStoresRevenueBefore = iPraticoData
        .filter(d => {
          const date = new Date(d.order_date);
          return date >= beforeStart && date <= beforeEnd && d.store_id !== opening.store_id;
        })
        .reduce((sum, d) => sum + (d.total_revenue || 0), 0);

      const otherStoresRevenueAfter = iPraticoData
        .filter(d => {
          const date = new Date(d.order_date);
          return date >= afterStart && date <= afterEnd && d.store_id !== opening.store_id;
        })
        .reduce((sum, d) => sum + (d.total_revenue || 0), 0);

      // New store revenue in 30 days
      const newStoreRevenue = iPraticoData
        .filter(d => {
          const date = new Date(d.order_date);
          return date >= afterStart && date <= afterEnd && d.store_id === opening.store_id;
        })
        .reduce((sum, d) => sum + (d.total_revenue || 0), 0);

      const daysBefore = Math.ceil((beforeEnd - beforeStart) / (1000 * 60 * 60 * 24)) + 1;
      const daysAfter = Math.ceil((afterEnd - afterStart) / (1000 * 60 * 60 * 24)) + 1;

      const avgRevenueBefore = daysBefore > 0 ? revenueBefore / daysBefore : 0;
      const avgRevenueAfter = daysAfter > 0 ? revenueAfter / daysAfter : 0;
      const avgOtherBefore = daysBefore > 0 ? otherStoresRevenueBefore / daysBefore : 0;
      const avgOtherAfter = daysAfter > 0 ? otherStoresRevenueAfter / daysAfter : 0;

      const changeTotal = avgRevenueAfter - avgRevenueBefore;
      const changePercTotal = avgRevenueBefore > 0 ? ((avgRevenueAfter - avgRevenueBefore) / avgRevenueBefore) * 100 : 0;
      
      const changeOther = avgOtherAfter - avgOtherBefore;
      const changePercOther = avgOtherBefore > 0 ? ((avgOtherAfter - avgOtherBefore) / avgOtherBefore) * 100 : 0;

      const cannibalizzazione = changeOther < 0 ? Math.abs(changeOther) : 0;
      const cannibalizzazionePerc = avgOtherBefore > 0 ? (cannibalizzazione / avgOtherBefore) * 100 : 0;

      return {
        store_name: opening.store_name,
        opening_date: opening.opening_date,
        avgRevenueBefore,
        avgRevenueAfter,
        avgOtherBefore,
        avgOtherAfter,
        changeTotal,
        changePercTotal,
        changeOther,
        changePercOther,
        newStoreRevenue,
        cannibalizzazione,
        cannibalizzazionePerc,
        incrementoNetto: changeTotal - cannibalizzazione
      };
    });
  }, [storeOpeningDates, iPraticoData]);

  // Store comparison before/after
  const storeComparison = useMemo(() => {
    if (selectedStore === 'all') return null;

    const opening = storeOpeningDates.find(o => {
      const store = stores.find(s => s.name === o.store_name);
      return store?.id === selectedStore;
    });

    if (!opening) return null;

    const openingDate = new Date(opening.opening_date);
    const beforeStart = new Date(openingDate);
    beforeStart.setDate(beforeStart.getDate() - 30);
    const afterEnd = new Date(openingDate);
    afterEnd.setDate(afterEnd.getDate() + 30);

    // Get daily data for this store and others
    const dailyComparison = {};

    iPraticoData
      .filter(d => {
        const date = new Date(d.order_date);
        return date >= beforeStart && date <= afterEnd;
      })
      .forEach(d => {
        const dateKey = d.order_date;
        if (!dailyComparison[dateKey]) {
          dailyComparison[dateKey] = {
            date: dateKey,
            thisStore: 0,
            otherStores: 0
          };
        }
        if (d.store_id === selectedStore) {
          dailyComparison[dateKey].thisStore += d.total_revenue || 0;
        } else {
          dailyComparison[dateKey].otherStores += d.total_revenue || 0;
        }
      });

    return Object.values(dailyComparison)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedStore, storeOpeningDates, iPraticoData, stores]);

  // Analisi impatto per canale
  const channelImpactAnalysis = useMemo(() => {
    return storeOpeningDates.map((opening, index) => {
      const openingDate = new Date(opening.opening_date);
      const store = stores.find(s => s.name === opening.store_name);
      
      let beforeStart;
      if (index === 0) {
        beforeStart = new Date(openingDate);
        beforeStart.setDate(beforeStart.getDate() - 30);
      } else {
        beforeStart = new Date(storeOpeningDates[index - 1].opening_date);
      }
      
      const beforeEnd = new Date(openingDate);
      beforeEnd.setDate(beforeEnd.getDate() - 1);
      const afterStart = openingDate;
      const afterEnd = new Date(openingDate);
      afterEnd.setDate(afterEnd.getDate() + 30);

      const daysBefore = Math.ceil((beforeEnd - beforeStart) / (1000 * 60 * 60 * 24)) + 1;
      const daysAfter = Math.ceil((afterEnd - afterStart) / (1000 * 60 * 60 * 24)) + 1;

      const channelData = {};
      const channels = ['glovo', 'deliveroo', 'justeat', 'onlineordering', 'ordertable', 'tabesto', 'store'];

      channels.forEach(channel => {
        // Altri locali - prima
        const otherBefore = iPraticoData
          .filter(d => {
            const date = new Date(d.order_date);
            return date >= beforeStart && date <= beforeEnd && d.store_id !== store?.id;
          })
          .reduce((sum, d) => sum + (d[`sourceApp_${channel}`] || 0), 0);

        // Altri locali - dopo
        const otherAfter = iPraticoData
          .filter(d => {
            const date = new Date(d.order_date);
            return date >= afterStart && date <= afterEnd && d.store_id !== store?.id;
          })
          .reduce((sum, d) => sum + (d[`sourceApp_${channel}`] || 0), 0);

        const avgBefore = daysBefore > 0 ? otherBefore / daysBefore : 0;
        const avgAfter = daysAfter > 0 ? otherAfter / daysAfter : 0;
        const change = avgAfter - avgBefore;
        const changePerc = avgBefore > 0 ? (change / avgBefore) * 100 : 0;
        const cannibalization = change < 0 ? Math.abs(change) : 0;

        channelData[channel] = {
          avgBefore,
          avgAfter,
          change,
          changePerc,
          cannibalization
        };
      });

      return {
        store_name: opening.store_name,
        opening_date: opening.opening_date,
        channels: channelData
      };
    });
  }, [storeOpeningDates, iPraticoData, stores]);

  return (
    <ProtectedPage pageName="Cannibalizzazione">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#000000' }}>📊 Analisi Cannibalizzazione</h1>
          <p style={{ color: '#000000' }}>Impatto delle nuove aperture sulle revenue esistenti</p>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo Analisi</label>
              <select
                value={selectedAnalysis}
                onChange={(e) => setSelectedAnalysis(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
              >
                <option value="revenue_totale">Revenue Totale</option>
                <option value="per_canale">Per Canale/App</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Focus su Locale</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg"
              >
                <option value="all">Tutti i Locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="showOpenings"
              checked={showOpeningDates}
              onChange={(e) => setShowOpeningDates(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="showOpenings" className="text-sm text-slate-700">
              Mostra date aperture sui grafici
            </label>
          </div>
        </NeumorphicCard>

        {/* Timeline delle Aperture */}
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Timeline Aperture Locali
          </h3>
          <div className="space-y-3">
            {storeOpeningDates.map((opening, idx) => (
              <div key={idx} className="neumorphic-pressed p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{opening.store_name}</p>
                  <p className="text-sm text-slate-500">
                    {format(parseISO(opening.opening_date), 'dd MMMM yyyy', { locale: it })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Prima Revenue</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatEuro(opening.first_revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </NeumorphicCard>

        {/* Grafico Revenue Totale */}
        {selectedAnalysis === 'revenue_totale' && (
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Andamento Revenue Totale nel Tempo
            </h3>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    style={{ fontSize: '11px' }}
                    tickFormatter={(date) => format(parseISO(date), 'dd MMM', { locale: it })}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    style={{ fontSize: '12px' }}
                    tickFormatter={(val) => `€${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                    formatter={(value) => formatEuro(value)}
                    labelFormatter={(date) => format(parseISO(date), 'dd MMMM yyyy', { locale: it })}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Revenue Totale"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stores_count" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Locali Attivi"
                    yAxisId="right"
                    dot={false}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#10b981"
                    style={{ fontSize: '12px' }}
                  />
                  {showOpeningDates && storeOpeningDates.map((opening, idx) => (
                    <ReferenceLine
                      key={idx}
                      x={opening.opening_date}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      label={{
                        value: opening.store_name,
                        position: 'top',
                        fill: '#ef4444',
                        fontSize: 11
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Nessun dato disponibile
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Grafico Per Canale */}
        {selectedAnalysis === 'per_canale' && (
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Andamento Revenue per Canale/App
            </h3>
            {channelTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={channelTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    style={{ fontSize: '11px' }}
                    tickFormatter={(date) => format(parseISO(date), 'dd MMM', { locale: it })}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    style={{ fontSize: '12px' }}
                    tickFormatter={(val) => `€${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                    formatter={(value) => formatEuro(value)}
                    labelFormatter={(date) => format(parseISO(date), 'dd MMMM yyyy', { locale: it })}
                  />
                  <Legend />
                  {Object.keys(COLORS).map(channel => (
                    <Line
                      key={channel}
                      type="monotone"
                      dataKey={channel}
                      stroke={COLORS[channel]}
                      strokeWidth={2}
                      name={CHANNEL_LABELS[channel]}
                      dot={false}
                    />
                  ))}
                  {showOpeningDates && storeOpeningDates.map((opening, idx) => (
                    <ReferenceLine
                      key={idx}
                      x={opening.opening_date}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      label={{
                        value: opening.store_name,
                        position: 'top',
                        fill: '#ef4444',
                        fontSize: 11
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Nessun dato disponibile
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Dettaglio Locale Selezionato */}
        {selectedStore !== 'all' && storeComparison && (
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Confronto Pre/Post Apertura - {stores.find(s => s.id === selectedStore)?.name}
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={storeComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  style={{ fontSize: '11px' }}
                  tickFormatter={(date) => format(parseISO(date), 'dd MMM', { locale: it })}
                />
                <YAxis 
                  stroke="#64748b" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(val) => `€${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                  formatter={(value) => formatEuro(value)}
                  labelFormatter={(date) => format(parseISO(date), 'dd MMMM yyyy', { locale: it })}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="thisStore" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Questo Locale"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="otherStores" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Altri Locali"
                  dot={false}
                />
                {showOpeningDates && storeOpeningDates
                  .filter(o => {
                    const store = stores.find(s => s.name === o.store_name);
                    return store?.id === selectedStore;
                  })
                  .map((opening, idx) => (
                    <ReferenceLine
                      key={idx}
                      x={opening.opening_date}
                      stroke="#ef4444"
                      strokeWidth={2}
                      label={{
                        value: 'Apertura',
                        position: 'top',
                        fill: '#ef4444',
                        fontSize: 12,
                        fontWeight: 'bold'
                      }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </NeumorphicCard>
        )}

        {/* Tabella Impatto Aperture */}
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Analisi Impatto Aperture (30 giorni pre/post)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-blue-600">
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Locale</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Data Apertura</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Media/gg Prima</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Media/gg Dopo</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Δ Totale</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Revenue Nuovo</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Δ Altri Locali</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Cannibalizzazione</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Incremento Netto</th>
                </tr>
              </thead>
              <tbody>
                {impactAnalysis.map((impact, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      {impact.store_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {format(parseISO(impact.opening_date), 'dd/MM/yyyy', { locale: it })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      {formatEuro(impact.avgRevenueBefore)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      {formatEuro(impact.avgRevenueAfter)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-bold ${
                      impact.changeTotal >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {impact.changeTotal >= 0 ? '+' : ''}{formatEuro(impact.changeTotal)}
                      <div className="text-xs font-normal">
                        ({impact.changePercTotal >= 0 ? '+' : ''}{impact.changePercTotal.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-blue-600">
                      {formatEuro(impact.newStoreRevenue)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-bold ${
                      impact.changeOther >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {impact.changeOther >= 0 ? '+' : ''}{formatEuro(impact.changeOther)}
                      <div className="text-xs font-normal">
                        ({impact.changePercOther >= 0 ? '+' : ''}{impact.changePercOther.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-orange-600">
                      {impact.cannibalizzazione > 0 ? `-${formatEuro(impact.cannibalizzazione)}` : '€0,00'}
                      <div className="text-xs font-normal">
                        ({impact.cannibalizzazionePerc.toFixed(1)}%)
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-bold ${
                      impact.incrementoNetto >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {impact.incrementoNetto >= 0 ? '+' : ''}{formatEuro(impact.incrementoNetto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NeumorphicCard>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-slate-500 mb-1">Locali Aperti</p>
                <p className="text-3xl font-bold text-blue-600">
                  {storeOpeningDates.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <StoreIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-slate-500 mb-1">Cannibalizzazione Media</p>
                <p className="text-3xl font-bold text-orange-600">
                  {impactAnalysis.length > 0 
                    ? (impactAnalysis.reduce((sum, i) => sum + i.cannibalizzazionePerc, 0) / impactAnalysis.length).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-slate-500 mb-1">Incremento Netto Medio</p>
                <p className="text-3xl font-bold text-green-600">
                  {impactAnalysis.length > 0
                    ? formatEuro(impactAnalysis.reduce((sum, i) => sum + i.incrementoNetto, 0) / impactAnalysis.length)
                    : '€0,00'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-500">Revenue/giorno aggiunta netta</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-slate-500 mb-1">Crescita Totale</p>
                <p className="text-3xl font-bold text-purple-600">
                  {impactAnalysis.length > 0 && impactAnalysis[0].avgRevenueBefore > 0
                    ? ((impactAnalysis[impactAnalysis.length - 1].avgRevenueAfter - impactAnalysis[0].avgRevenueBefore) / impactAnalysis[0].avgRevenueBefore * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-500">Dal primo all'ultimo locale</p>
          </NeumorphicCard>
        </div>

        {/* Analisi Cannibalizzazione per Canale */}
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📱 Impatto per Canale/App</h3>
          <p className="text-sm text-slate-500 mb-4">
            Analisi cannibalizzazione per canale di vendita (30 giorni pre/post apertura)
          </p>
          <div className="space-y-6">
            {channelImpactAnalysis.map((impact, idx) => (
              <div key={idx} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{impact.store_name}</p>
                    <p className="text-sm text-slate-500">
                      {format(parseISO(impact.opening_date), 'dd MMMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.keys(COLORS).map(channel => {
                    const data = impact.channels[channel];
                    const hasData = data.avgBefore > 0 || data.avgAfter > 0;
                    
                    if (!hasData) return null;

                    return (
                      <div key={channel} className="neumorphic-flat p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[channel] }}
                          />
                          <p className="font-medium text-slate-800 text-sm">
                            {CHANNEL_LABELS[channel]}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Media/gg Prima:</span>
                            <span className="text-slate-700 font-medium">
                              {formatEuro(data.avgBefore)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Media/gg Dopo:</span>
                            <span className="text-slate-700 font-medium">
                              {formatEuro(data.avgAfter)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                            <span className="text-slate-500">Variazione:</span>
                            <span className={`font-bold ${
                              data.change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {data.change >= 0 ? '+' : ''}{formatEuro(data.change)}
                              <span className="text-xs ml-1">
                                ({data.changePerc >= 0 ? '+' : ''}{data.changePerc.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                          {data.cannibalization > 0 && (
                            <div className="flex justify-between text-xs pt-1">
                              <span className="text-orange-600 font-medium">Cannib.:</span>
                              <span className="text-orange-600 font-bold">
                                -{formatEuro(data.cannibalization)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </NeumorphicCard>

        {/* Insights */}
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">💡 Insights</h3>
          <div className="space-y-3">
            {impactAnalysis.map((impact, idx) => {
              const isPositive = impact.incrementoNetto > 0;
              const highCannibalization = impact.cannibalizzazionePerc > 20;
              
              return (
                <div key={idx} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isPositive ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'
                    }`}>
                      {isPositive ? 
                        <TrendingUp className="w-5 h-5 text-white" /> : 
                        <TrendingDown className="w-5 h-5 text-white" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{impact.store_name}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Apertura il {format(parseISO(impact.opening_date), 'dd MMMM yyyy', { locale: it })}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-slate-700">
                          • Incremento netto giornaliero: <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{formatEuro(impact.incrementoNetto)}
                          </span>
                        </p>
                        <p className="text-sm text-slate-700">
                          • Revenue nuovo locale (30gg): <span className="font-bold text-blue-600">
                            {formatEuro(impact.newStoreRevenue)}
                          </span>
                        </p>
                        {highCannibalization && (
                          <p className="text-sm text-orange-700 font-medium">
                            ⚠️ Alta cannibalizzazione: {impact.cannibalizzazionePerc.toFixed(1)}% degli altri locali
                          </p>
                        )}
                        {!highCannibalization && impact.cannibalizzazione > 0 && (
                          <p className="text-sm text-slate-600">
                            • Cannibalizzazione: {formatEuro(impact.cannibalizzazione)}/gg ({impact.cannibalizzazionePerc.toFixed(1)}%)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}