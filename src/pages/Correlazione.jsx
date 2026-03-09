import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO, isValid } from "date-fns";
import { it } from "date-fns/locale";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Bar, Legend,
} from "recharts";
import { CloudRain, TrendingUp, Thermometer, Droplets, Loader2, AlertTriangle, RefreshCw, MapPin } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { formatCurrency } from "../components/utils/formatCurrency";

// --- Pearson correlation coefficient ---
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? null : num / denom;
}

function corrLabel(r) {
  if (r === null) return { text: "Dati insufficienti", color: "text-slate-500" };
  const abs = Math.abs(r);
  const dir = r > 0 ? "positiva" : "negativa";
  if (abs >= 0.7) return { text: `Correlazione forte ${dir}`, color: r > 0 ? "text-green-600" : "text-red-600" };
  if (abs >= 0.4) return { text: `Correlazione moderata ${dir}`, color: r > 0 ? "text-yellow-600" : "text-orange-600" };
  if (abs >= 0.2) return { text: `Correlazione debole ${dir}`, color: "text-slate-600" };
  return { text: "Nessuna correlazione significativa", color: "text-slate-400" };
}

const WEATHER_METRICS = [
  { key: "avg_temp_c", label: "Temperatura media (°C)", icon: Thermometer, color: "#f59e0b" },
  { key: "precip_mm", label: "Precipitazioni (mm)", icon: CloudRain, color: "#3b82f6" },
  { key: "avg_humidity", label: "Umidità media (%)", icon: Droplets, color: "#06b6d4" },
  { key: "chance_of_rain", label: "Probabilità pioggia (%)", icon: CloudRain, color: "#8b5cf6" },
];

export default function Correlazione() {
  const today = format(new Date(), "yyyy-MM-dd");
  const default30 = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [location, setLocation] = useState("Milan");
  const [startDate, setStartDate] = useState(default30);
  const [endDate, setEndDate] = useState(today);
  const [selectedStore, setSelectedStore] = useState("all");
  const [weatherMetric, setWeatherMetric] = useState("avg_temp_c");
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationInput, setLocationInput] = useState("Milan");

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: iPraticoData = [] } = useQuery({
    queryKey: ["iPratico-correlazione"],
    queryFn: () => base44.entities.iPratico.list("-order_date", 2000),
  });

  const fetchWeather = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getWeatherHistory", {
        location: locationInput,
        start_date: startDate,
        end_date: endDate,
      });
      if (res.data.success) {
        setWeatherData(res.data.data);
        setLocation(locationInput);
      } else {
        setError(res.data.error || "Errore nel recupero dei dati meteo");
      }
    } catch (e) {
      setError(e.message || "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  }, [locationInput, startDate, endDate]);

  // Revenue aggregated by date
  const revenueByDate = useMemo(() => {
    const map = {};
    iPraticoData.forEach((item) => {
      if (!item.order_date) return;
      const d = parseISO(item.order_date);
      if (!isValid(d)) return;
      if (item.order_date < startDate || item.order_date > endDate) return;
      if (selectedStore !== "all" && item.store_id !== selectedStore) return;
      if (!map[item.order_date]) map[item.order_date] = { revenue: 0, orders: 0 };
      map[item.order_date].revenue += item.total_revenue || 0;
      map[item.order_date].orders += item.total_orders || 0;
    });
    return map;
  }, [iPraticoData, startDate, endDate, selectedStore]);

  // Joined dataset
  const joinedData = useMemo(() => {
    if (!weatherData) return [];
    return weatherData
      .map((w) => {
        const rev = revenueByDate[w.date];
        if (!rev) return null;
        return {
          date: w.date,
          dateLabel: format(parseISO(w.date), "dd/MM", { locale: it }),
          revenue: parseFloat(rev.revenue.toFixed(2)),
          orders: rev.orders,
          avg_temp_c: w.avg_temp_c,
          precip_mm: w.precip_mm,
          avg_humidity: w.avg_humidity,
          chance_of_rain: w.chance_of_rain,
          avg_vis_km: w.avg_vis_km,
          condition: w.condition,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [weatherData, revenueByDate]);

  const selectedMetricMeta = WEATHER_METRICS.find((m) => m.key === weatherMetric);

  const correlation = useMemo(() => {
    if (!joinedData.length) return null;
    return pearson(
      joinedData.map((d) => d[weatherMetric]),
      joinedData.map((d) => d.revenue)
    );
  }, [joinedData, weatherMetric]);

  const corrInfo = corrLabel(correlation);

  return (
    <ProtectedPage pageName="Correlazione">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#000" }}>
            Correlazione Meteo × Revenue
          </h1>
          <p className="text-sm text-slate-500">
            Analizza quanto le condizioni meteo influenzano i ricavi giornalieri
          </p>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block font-medium">Località meteo</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="es. Milan, Roma, Torino"
                  className="flex-1 neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block font-medium">Dal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block font-medium">Al</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block font-medium">Locale</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
              >
                <option value="all">Tutti i locali</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={fetchWeather}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isLoading ? "Caricamento meteo..." : "Carica dati meteo"}
            </button>
            {location && weatherData && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3" /> {location}
                {" · "}{weatherData.length} giorni caricati
              </span>
            )}
            <p className="text-xs text-slate-400">Max 90 giorni per richiesta</p>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </NeumorphicCard>

        {joinedData.length > 0 && (
          <>
            {/* Weather metric selector */}
            <div className="flex flex-wrap gap-2">
              {WEATHER_METRICS.map((m) => {
                const Icon = m.icon;
                const r = pearson(
                  joinedData.map((d) => d[m.key]),
                  joinedData.map((d) => d.revenue)
                );
                return (
                  <button
                    key={m.key}
                    onClick={() => setWeatherMetric(m.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      weatherMetric === m.key
                        ? "bg-blue-500 text-white shadow-md"
                        : "neumorphic-flat text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {m.label}
                    {r !== null && (
                      <span className={`text-xs font-bold ml-1 ${weatherMetric === m.key ? "text-blue-100" : Math.abs(r) >= 0.4 ? "text-orange-600" : "text-slate-400"}`}>
                        r={r.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Correlation summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <NeumorphicCard className="p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Giorni analizzati</p>
                <p className="text-2xl font-bold text-slate-800">{joinedData.length}</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Coefficiente r</p>
                <p className={`text-2xl font-bold ${corrInfo.color}`}>
                  {correlation !== null ? correlation.toFixed(3) : "—"}
                </p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">R² (varianza spiegata)</p>
                <p className="text-2xl font-bold text-slate-800">
                  {correlation !== null ? `${(correlation ** 2 * 100).toFixed(1)}%` : "—"}
                </p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Interpretazione</p>
                <p className={`text-sm font-bold leading-tight mt-1 ${corrInfo.color}`}>{corrInfo.text}</p>
              </NeumorphicCard>
            </div>

            {/* Dual-axis time chart */}
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4">
                Revenue vs {selectedMetricMeta?.label} — andamento temporale
              </h2>
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: 400 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={joinedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={55}
                      />
                      <YAxis
                        yAxisId="rev"
                        stroke="#3b82f6"
                        tick={{ fontSize: 10 }}
                        width={60}
                        tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`}
                      />
                      <YAxis
                        yAxisId="weather"
                        orientation="right"
                        stroke={selectedMetricMeta?.color}
                        tick={{ fontSize: 10 }}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(248,250,252,0.97)",
                          border: "none",
                          borderRadius: 10,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          fontSize: 11,
                        }}
                        formatter={(value, name) => {
                          if (name === "Revenue") return [`€${formatCurrency(value)}`, name];
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        yAxisId="rev"
                        dataKey="revenue"
                        name="Revenue"
                        fill="#3b82f680"
                        radius={[3, 3, 0, 0]}
                      />
                      <Line
                        yAxisId="weather"
                        type="monotone"
                        dataKey={weatherMetric}
                        name={selectedMetricMeta?.label}
                        stroke={selectedMetricMeta?.color}
                        strokeWidth={2}
                        dot={{ r: 2, fill: selectedMetricMeta?.color }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </NeumorphicCard>

            {/* Scatter plot */}
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-base font-bold text-slate-800 mb-1">
                Scatter plot — {selectedMetricMeta?.label} vs Revenue
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Ogni punto è un giorno. La dispersione mostra la relazione diretta tra i due valori.
              </p>
              <div style={{ minWidth: 300 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey={weatherMetric}
                      name={selectedMetricMeta?.label}
                      type="number"
                      tick={{ fontSize: 10 }}
                      label={{ value: selectedMetricMeta?.label, position: "insideBottom", offset: -5, fontSize: 10 }}
                      height={40}
                    />
                    <YAxis
                      dataKey="revenue"
                      name="Revenue"
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`}
                      width={55}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: "rgba(248,250,252,0.97)",
                        border: "none",
                        borderRadius: 10,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: 11,
                      }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs">
                            <p className="font-bold text-slate-700 mb-1">{d.date}</p>
                            <p>Revenue: <span className="font-bold">€{formatCurrency(d.revenue)}</span></p>
                            <p>{selectedMetricMeta?.label}: <span className="font-bold">{d[weatherMetric]}</span></p>
                            <p className="text-slate-400 mt-1">{d.condition}</p>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      data={joinedData}
                      fill={selectedMetricMeta?.color}
                      fillOpacity={0.7}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </NeumorphicCard>

            {/* All correlations summary */}
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4">Riepilogo Correlazioni</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-2 text-xs text-slate-500 font-medium">Variabile meteo</th>
                      <th className="text-right p-2 text-xs text-slate-500 font-medium">Coeff. r</th>
                      <th className="text-right p-2 text-xs text-slate-500 font-medium">R²</th>
                      <th className="text-left p-2 text-xs text-slate-500 font-medium">Interpretazione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WEATHER_METRICS.map((m) => {
                      const r = pearson(
                        joinedData.map((d) => d[m.key]),
                        joinedData.map((d) => d.revenue)
                      );
                      const info = corrLabel(r);
                      return (
                        <tr key={m.key} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2 text-sm font-medium text-slate-700">{m.label}</td>
                          <td className={`p-2 text-right text-sm font-bold ${info.color}`}>
                            {r !== null ? r.toFixed(3) : "—"}
                          </td>
                          <td className="p-2 text-right text-sm text-slate-600">
                            {r !== null ? `${(r ** 2 * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className={`p-2 text-sm ${info.color}`}>{info.text}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>

            {/* Raw data table */}
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4">Dati Giornalieri</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-2 text-slate-500 font-medium">Data</th>
                      <th className="text-right p-2 text-slate-500 font-medium">Revenue</th>
                      <th className="text-right p-2 text-slate-500 font-medium">Ordini</th>
                      <th className="text-right p-2 text-slate-500 font-medium">Temp °C</th>
                      <th className="text-right p-2 text-slate-500 font-medium">Pioggia mm</th>
                      <th className="text-right p-2 text-slate-500 font-medium">Umidità %</th>
                      <th className="text-right p-2 text-slate-500 font-medium">P(pioggia)%</th>
                      <th className="text-left p-2 text-slate-500 font-medium">Condizione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joinedData.map((d) => (
                      <tr key={d.date} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-medium text-slate-700">{d.date}</td>
                        <td className="p-2 text-right font-bold text-slate-800">€{formatCurrency(d.revenue)}</td>
                        <td className="p-2 text-right text-slate-600">{d.orders}</td>
                        <td className="p-2 text-right text-slate-600">{d.avg_temp_c}°</td>
                        <td className="p-2 text-right text-slate-600">{d.precip_mm}</td>
                        <td className="p-2 text-right text-slate-600">{d.avg_humidity}%</td>
                        <td className="p-2 text-right text-slate-600">{d.chance_of_rain}%</td>
                        <td className="p-2 text-slate-500 truncate max-w-[120px]">{d.condition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>
          </>
        )}

        {!weatherData && !isLoading && (
          <NeumorphicCard className="p-12 text-center">
            <CloudRain className="w-12 h-12 text-blue-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-600 mb-2">Nessun dato meteo caricato</h2>
            <p className="text-sm text-slate-400">
              Imposta la località e l'intervallo di date, poi clicca "Carica dati meteo" per iniziare l'analisi.
            </p>
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}