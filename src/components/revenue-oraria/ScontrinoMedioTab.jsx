import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Minus, Loader2, Store as StoreIcon } from "lucide-react";

const PERIOD_OPTIONS = [
  { label: "30 giorni", days: 30 },
  { label: "60 giorni", days: 60 },
  { label: "90 giorni", days: 90 }
];

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1"
];

export default function ScontrinoMedioTab({ stores }) {
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const dateFrom = useMemo(() => moment().subtract(selectedPeriod, "days").format("YYYY-MM-DD"), [selectedPeriod]);
  const dateTo = useMemo(() => moment().format("YYYY-MM-DD"), []);

  const { data: revenueData = [], isLoading } = useQuery({
    queryKey: ["scontrino-medio-data", dateFrom, dateTo],
    queryFn: () => base44.entities.RevenueByHour.filter({
      order_date: { $gte: dateFrom, $lte: dateTo }
    }),
    staleTime: 60000
  });

  // Aggregate by store
  const storeStats = useMemo(() => {
    if (!revenueData.length) return [];

    const byStore = {};
    revenueData.forEach(r => {
      const sid = r.store_id || r.store_name;
      if (!byStore[sid]) {
        byStore[sid] = {
          store_id: r.store_id,
          store_name: r.store_name || stores.find(s => s.id === r.store_id)?.name || sid,
          totalRevenue: 0,
          totalOrders: 0
        };
      }
      byStore[sid].totalRevenue += r.total_revenue || 0;
      byStore[sid].totalOrders += r.total_orders || 0;
    });

    return Object.values(byStore)
      .map(s => ({
        ...s,
        avgTicket: s.totalOrders > 0 ? s.totalRevenue / s.totalOrders : 0
      }))
      .sort((a, b) => b.avgTicket - a.avgTicket);
  }, [revenueData, stores]);

  // Global avg ticket
  const globalStats = useMemo(() => {
    const totRev = storeStats.reduce((s, r) => s + r.totalRevenue, 0);
    const totOrd = storeStats.reduce((s, r) => s + r.totalOrders, 0);
    return { totalRevenue: totRev, totalOrders: totOrd, avgTicket: totOrd > 0 ? totRev / totOrd : 0 };
  }, [storeStats]);

  // Trend data: aggregate by week per store
  const trendData = useMemo(() => {
    if (!revenueData.length) return [];

    const byWeekStore = {};
    revenueData.forEach(r => {
      const weekKey = moment(r.order_date).startOf("isoWeek").format("YYYY-MM-DD");
      const storeName = r.store_name || stores.find(s => s.id === r.store_id)?.name || "Sconosciuto";

      if (!byWeekStore[weekKey]) byWeekStore[weekKey] = { week: weekKey };
      if (!byWeekStore[weekKey][`${storeName}_rev`]) {
        byWeekStore[weekKey][`${storeName}_rev`] = 0;
        byWeekStore[weekKey][`${storeName}_ord`] = 0;
      }
      byWeekStore[weekKey][`${storeName}_rev`] += r.total_revenue || 0;
      byWeekStore[weekKey][`${storeName}_ord`] += r.total_orders || 0;
    });

    const storeNames = [...new Set(revenueData.map(r => r.store_name || stores.find(s => s.id === r.store_id)?.name || "Sconosciuto"))];

    return Object.values(byWeekStore)
      .map(w => {
        const row = { week: moment(w.week).format("DD/MM") };
        storeNames.forEach(name => {
          const rev = w[`${name}_rev`] || 0;
          const ord = w[`${name}_ord`] || 0;
          row[name] = ord > 0 ? parseFloat((rev / ord).toFixed(2)) : 0;
        });
        return row;
      })
      .sort((a, b) => {
        const dA = moment(a.week, "DD/MM");
        const dB = moment(b.week, "DD/MM");
        return dA - dB;
      });
  }, [revenueData, stores]);

  // Daily trend per store
  const dailyTrendData = useMemo(() => {
    if (!revenueData.length) return [];

    const byDayStore = {};
    revenueData.forEach(r => {
      const dayKey = r.order_date;
      const storeName = r.store_name || stores.find(s => s.id === r.store_id)?.name || "Sconosciuto";

      if (!byDayStore[dayKey]) byDayStore[dayKey] = { day: dayKey };
      if (!byDayStore[dayKey][`${storeName}_rev`]) {
        byDayStore[dayKey][`${storeName}_rev`] = 0;
        byDayStore[dayKey][`${storeName}_ord`] = 0;
      }
      byDayStore[dayKey][`${storeName}_rev`] += r.total_revenue || 0;
      byDayStore[dayKey][`${storeName}_ord`] += r.total_orders || 0;
    });

    const storeNames = [...new Set(revenueData.map(r => r.store_name || stores.find(s => s.id === r.store_id)?.name || "Sconosciuto"))];

    return Object.values(byDayStore)
      .map(d => {
        const row = { day: moment(d.day).format("DD/MM") };
        storeNames.forEach(name => {
          const rev = d[`${name}_rev`] || 0;
          const ord = d[`${name}_ord`] || 0;
          row[name] = ord > 0 ? parseFloat((rev / ord).toFixed(2)) : 0;
        });
        return row;
      })
      .sort((a, b) => moment(a.day, "DD/MM") - moment(b.day, "DD/MM"));
  }, [revenueData, stores]);

  const storeNames = useMemo(() =>
    [...new Set(revenueData.map(r => r.store_name || stores.find(s => s.id === r.store_id)?.name || "Sconosciuto"))],
    [revenueData, stores]
  );

  // Compare first half vs second half for trend indicator
  const getTrend = (storeName) => {
    const storeData = revenueData.filter(r => (r.store_name || stores.find(s => s.id === r.store_id)?.name) === storeName);
    if (storeData.length < 4) return null;

    const sorted = [...storeData].sort((a, b) => a.order_date.localeCompare(b.order_date));
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const avg1Rev = firstHalf.reduce((s, r) => s + (r.total_revenue || 0), 0);
    const avg1Ord = firstHalf.reduce((s, r) => s + (r.total_orders || 0), 0);
    const avg2Rev = secondHalf.reduce((s, r) => s + (r.total_revenue || 0), 0);
    const avg2Ord = secondHalf.reduce((s, r) => s + (r.total_orders || 0), 0);

    const avg1 = avg1Ord > 0 ? avg1Rev / avg1Ord : 0;
    const avg2 = avg2Ord > 0 ? avg2Rev / avg2Ord : 0;

    if (avg1 === 0) return null;
    const change = ((avg2 - avg1) / avg1) * 100;
    return change;
  };

  const [chartMode, setChartMode] = useState("weekly"); // weekly or daily

  const chartData = chartMode === "weekly" ? trendData : dailyTrendData;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!revenueData.length) {
    return (
      <NeumorphicCard className="p-8 text-center">
        <p className="text-slate-500">Nessun dato trovato per il periodo selezionato</p>
      </NeumorphicCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <NeumorphicCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Periodo:</span>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setSelectedPeriod(opt.days)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedPeriod === opt.days
                  ? "bg-blue-500 text-white shadow-lg"
                  : "neumorphic-flat text-slate-600 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </NeumorphicCard>

      {/* Global KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NeumorphicCard className="p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Scontrino Medio Globale</p>
          <p className="text-2xl font-bold text-blue-600">€{globalStats.avgTicket.toFixed(2)}</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Ordini Totali</p>
          <p className="text-2xl font-bold text-slate-800">{globalStats.totalOrders.toLocaleString("it-IT")}</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Revenue Totale</p>
          <p className="text-2xl font-bold text-emerald-600">€{globalStats.totalRevenue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
        </NeumorphicCard>
      </div>

      {/* Store comparison bar chart */}
      <NeumorphicCard className="p-4 lg:p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <StoreIcon className="w-5 h-5 text-blue-600" />
          Scontrino Medio per Locale — Ultimi {selectedPeriod} giorni
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={storeStats} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={v => `€${v.toFixed(0)}`} />
            <YAxis type="category" dataKey="store_name" width={80} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
            <Bar dataKey="avgTicket" name="Scontrino Medio" fill="#3b82f6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </NeumorphicCard>

      {/* Store table with trend */}
      <NeumorphicCard className="p-4 lg:p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4">Dettaglio per Locale</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-blue-600">
                <th className="text-left p-2 text-slate-600 text-xs font-medium">Locale</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Scontrino Medio</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Ordini</th>
                <th className="text-right p-2 text-slate-600 text-xs font-medium">Revenue</th>
                <th className="text-center p-2 text-slate-600 text-xs font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {storeStats.map((store, idx) => {
                const trend = getTrend(store.store_name);
                return (
                  <tr key={store.store_id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 text-sm font-medium text-slate-700">{store.store_name}</td>
                    <td className="p-2 text-right text-sm font-bold text-blue-600">€{store.avgTicket.toFixed(2)}</td>
                    <td className="p-2 text-right text-sm text-slate-600">{store.totalOrders.toLocaleString("it-IT")}</td>
                    <td className="p-2 text-right text-sm text-slate-600">€{store.totalRevenue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 text-center">
                      {trend !== null ? (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          trend > 2 ? "bg-green-100 text-green-700" :
                          trend < -2 ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {trend > 2 ? <TrendingUp className="w-3 h-3" /> :
                           trend < -2 ? <TrendingDown className="w-3 h-3" /> :
                           <Minus className="w-3 h-3" />}
                          {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </NeumorphicCard>

      {/* Trend chart */}
      <NeumorphicCard className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Trend Scontrino Medio nel Tempo</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setChartMode("daily")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                chartMode === "daily" ? "bg-blue-500 text-white" : "neumorphic-flat text-slate-600 hover:bg-slate-100"
              }`}
            >
              Giornaliero
            </button>
            <button
              onClick={() => setChartMode("weekly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                chartMode === "weekly" ? "bg-blue-500 text-white" : "neumorphic-flat text-slate-600 hover:bg-slate-100"
              }`}
            >
              Settimanale
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartMode === "weekly" ? "week" : "day"} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `€${v}`} />
            <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
            <Legend />
            {storeNames.map((name, idx) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </NeumorphicCard>
    </div>
  );
}