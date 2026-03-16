import React, { useState } from 'react';
import NeumorphicCard from '../neumorphic/NeumorphicCard';
import { Store, Truck, Thermometer, Droplets, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const GIORNI_SETTIMANA = [
  { key: 1, it: 'Lunedì', short: 'Lun' },
  { key: 2, it: 'Martedì', short: 'Mar' },
  { key: 3, it: 'Mercoledì', short: 'Mer' },
  { key: 4, it: 'Giovedì', short: 'Gio' },
  { key: 5, it: 'Venerdì', short: 'Ven' },
  { key: 6, it: 'Sabato', short: 'Sab' },
  { key: 0, it: 'Domenica', short: 'Dom' },
];

const pearsonCorrelation = (x, y) => {
  const n = x.length;
  if (n < 3) return null;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const denomX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0));
  const denomY = Math.sqrt(y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0));
  if (denomX === 0 || denomY === 0) return 0;
  return num / (denomX * denomY);
};

const getCorrelationBadge = (r) => {
  if (r === null || r === undefined) return { label: 'N/D', bg: 'bg-slate-100', text: 'text-slate-400' };
  const abs = Math.abs(r);
  const dir = r > 0 ? '+' : '−';
  if (abs >= 0.7) return { label: `${r.toFixed(2)} (Forte ${dir})`, bg: r > 0 ? 'bg-green-50' : 'bg-red-50', text: r > 0 ? 'text-green-700' : 'text-red-700' };
  if (abs >= 0.4) return { label: `${r.toFixed(2)} (Mod. ${dir})`, bg: r > 0 ? 'bg-emerald-50' : 'bg-orange-50', text: r > 0 ? 'text-emerald-600' : 'text-orange-600' };
  if (abs >= 0.2) return { label: `${r.toFixed(2)} (Debole)`, bg: 'bg-slate-100', text: 'text-slate-600' };
  return { label: `${r.toFixed(2)}`, bg: 'bg-slate-50', text: 'text-slate-400' };
};

/**
 * Deep dive: Store vs Delivery revenue correlated with weather, grouped by weekday.
 * 
 * Props:
 * - iPraticoData: raw iPratico records (with sourceType_store, sourceType_delivery, etc.)
 * - datiMeteo: { [date]: { temp_c, precip_mm, ... } }
 * - localeSelezionato: 'all' | store_id
 * - dataInizio, dataFine: date strings
 */
export default function WeekdayChannelDeepDive({ iPraticoData, datiMeteo, localeSelezionato, dataInizio, dataFine }) {
  const [expanded, setExpanded] = useState(false);

  if (!iPraticoData || !datiMeteo || Object.keys(datiMeteo).length === 0) return null;

  // Aggregate daily store vs delivery revenue
  const dailyChannels = {};
  iPraticoData.forEach(item => {
    if (!item.order_date) return;
    if (item.order_date < dataInizio || item.order_date > dataFine) return;
    if (localeSelezionato !== 'all' && item.store_id !== localeSelezionato) return;

    if (!dailyChannels[item.order_date]) {
      dailyChannels[item.order_date] = { store: 0, delivery: 0 };
    }
    // "Store" = sourceType_store + sourceType_takeaway + sourceType_takeawayOnSite
    dailyChannels[item.order_date].store += (item.sourceType_store || 0) + (item.sourceType_takeaway || 0) + (item.sourceType_takeawayOnSite || 0);
    // "Delivery" = sourceType_delivery
    dailyChannels[item.order_date].delivery += (item.sourceType_delivery || 0);
  });

  // Build paired data (date + weather + channels)
  const paired = [];
  Object.entries(dailyChannels).forEach(([date, channels]) => {
    const m = datiMeteo[date];
    if (!m || m.temp_c === null || m.temp_c === undefined) return;
    paired.push({
      date,
      store: channels.store,
      delivery: channels.delivery,
      temp_c: m.temp_c,
      precip_mm: m.precip_mm || 0,
      dayIdx: new Date(date).getDay()
    });
  });

  if (paired.length < 3) return null;

  // Group by weekday
  const grouped = {};
  paired.forEach(row => {
    if (!grouped[row.dayIdx]) grouped[row.dayIdx] = [];
    grouped[row.dayIdx].push(row);
  });

  const weekdayStats = GIORNI_SETTIMANA.map(day => {
    const rows = grouped[day.key] || [];
    const n = rows.length;
    if (n === 0) return { ...day, n: 0 };

    const avgStore = rows.reduce((s, r) => s + r.store, 0) / n;
    const avgDelivery = rows.reduce((s, r) => s + r.delivery, 0) / n;
    const avgTemp = rows.reduce((s, r) => s + r.temp_c, 0) / n;
    const avgPrecip = rows.reduce((s, r) => s + r.precip_mm, 0) / n;

    const stores = rows.map(r => r.store);
    const deliveries = rows.map(r => r.delivery);
    const temps = rows.map(r => r.temp_c);
    const precips = rows.map(r => r.precip_mm);

    return {
      ...day, n,
      avgStore, avgDelivery, avgTemp, avgPrecip,
      rStoreTemp: pearsonCorrelation(temps, stores),
      rStorePrecip: pearsonCorrelation(precips, stores),
      rDeliveryTemp: pearsonCorrelation(temps, deliveries),
      rDeliveryPrecip: pearsonCorrelation(precips, deliveries),
    };
  });

  // Chart data for bar chart
  const chartData = weekdayStats.filter(d => d.n > 0).map(d => ({
    name: d.short,
    'In Store': Math.round(d.avgStore),
    'Delivery': Math.round(d.avgDelivery),
  }));

  // Global correlations
  const allStores = paired.map(r => r.store);
  const allDeliveries = paired.map(r => r.delivery);
  const allTemps = paired.map(r => r.temp_c);
  const allPrecips = paired.map(r => r.precip_mm);

  const globalStats = {
    rStoreTemp: pearsonCorrelation(allTemps, allStores),
    rStorePrecip: pearsonCorrelation(allPrecips, allStores),
    rDeliveryTemp: pearsonCorrelation(allTemps, allDeliveries),
    rDeliveryPrecip: pearsonCorrelation(allPrecips, allDeliveries),
  };

  const generateInsight = (stats) => {
    const parts = [];
    if (stats.rDeliveryPrecip !== null && Math.abs(stats.rDeliveryPrecip) >= 0.3) {
      parts.push(stats.rDeliveryPrecip > 0
        ? '🌧️ La pioggia favorisce il delivery'
        : '☀️ Il bel tempo favorisce il delivery');
    }
    if (stats.rStoreTemp !== null && Math.abs(stats.rStoreTemp) >= 0.3) {
      parts.push(stats.rStoreTemp > 0
        ? '🔥 Il caldo favorisce i ricavi in store'
        : '❄️ Il freddo favorisce i ricavi in store');
    }
    if (stats.rStorePrecip !== null && Math.abs(stats.rStorePrecip) >= 0.3) {
      parts.push(stats.rStorePrecip < 0
        ? '🌧️ La pioggia penalizza lo store'
        : '🌧️ La pioggia non penalizza lo store');
    }
    if (parts.length === 0) return '↔️ Il meteo non ha un impatto significativo sulla distribuzione store/delivery.';
    return parts.join(' · ');
  };

  return (
    <NeumorphicCard className="p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 text-sm">Deep Dive: Store vs Delivery × Meteo</p>
            <p className="text-xs text-slate-500">Come temperatura e pioggia influenzano i canali di vendita per giorno della settimana</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {expanded && (
        <div className="mt-5 space-y-5">
          {/* Global insight */}
          <div className="neumorphic-pressed rounded-xl p-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Insight globale</p>
            <p className="text-sm text-slate-700">{generateInsight(globalStats)}</p>
          </div>

          {/* Global correlation badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Store × Temp', r: globalStats.rStoreTemp, icon: <Thermometer className="w-3 h-3" />, channel: 'store' },
              { label: 'Store × Pioggia', r: globalStats.rStorePrecip, icon: <Droplets className="w-3 h-3" />, channel: 'store' },
              { label: 'Delivery × Temp', r: globalStats.rDeliveryTemp, icon: <Thermometer className="w-3 h-3" />, channel: 'delivery' },
              { label: 'Delivery × Pioggia', r: globalStats.rDeliveryPrecip, icon: <Droplets className="w-3 h-3" />, channel: 'delivery' },
            ].map((item, i) => {
              const badge = getCorrelationBadge(item.r);
              return (
                <div key={i} className={`rounded-xl p-3 ${badge.bg} border border-slate-100`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={item.channel === 'store' ? 'text-purple-500' : 'text-blue-500'}>{item.icon}</span>
                    <p className="text-xs font-semibold text-slate-600">{item.label}</p>
                  </div>
                  <p className={`text-lg font-bold ${badge.text}`}>{item.r !== null ? item.r.toFixed(3) : 'N/D'}</p>
                  <p className="text-xs text-slate-400">{badge.label}</p>
                </div>
              );
            })}
          </div>

          {/* Bar Chart: Store vs Delivery per weekday */}
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Ricavi medi per canale e giorno</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `€${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} width={55} />
                <RechartsTooltip
                  content={({ payload, label }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs">
                        <p className="font-bold text-slate-700 mb-1">{label}</p>
                        {payload.map((p, i) => (
                          <p key={i} style={{ color: p.color }} className="font-semibold">
                            {p.name}: €{formatCurrency(p.value)}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="In Store" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Delivery" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed table */}
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[950px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 px-2 text-slate-600 font-semibold">Giorno</th>
                  <th className="text-center py-2 px-2 text-slate-600 font-semibold">N°</th>
                  <th className="text-right py-2 px-2 text-purple-600 font-semibold">Store (€)</th>
                  <th className="text-right py-2 px-2 text-blue-600 font-semibold">Delivery (€)</th>
                  <th className="text-center py-2 px-2 text-slate-600 font-semibold">
                    <span className="flex items-center justify-center gap-1"><Store className="w-3 h-3" />×<Thermometer className="w-3 h-3" /></span>
                  </th>
                  <th className="text-center py-2 px-2 text-slate-600 font-semibold">
                    <span className="flex items-center justify-center gap-1"><Store className="w-3 h-3" />×<Droplets className="w-3 h-3" /></span>
                  </th>
                  <th className="text-center py-2 px-2 text-slate-600 font-semibold">
                    <span className="flex items-center justify-center gap-1"><Truck className="w-3 h-3" />×<Thermometer className="w-3 h-3" /></span>
                  </th>
                  <th className="text-center py-2 px-2 text-slate-600 font-semibold">
                    <span className="flex items-center justify-center gap-1"><Truck className="w-3 h-3" />×<Droplets className="w-3 h-3" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {weekdayStats.map(day => {
                  const isWeekend = day.key === 0 || day.key === 6;
                  if (day.n === 0) {
                    return (
                      <tr key={day.key} className="border-b border-slate-100">
                        <td className="py-2.5 px-2 font-semibold text-slate-700">{day.it}</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">0</td>
                        <td colSpan={6} className="py-2.5 px-2 text-center text-slate-400 italic">Nessun dato</td>
                      </tr>
                    );
                  }

                  const badges = [
                    getCorrelationBadge(day.rStoreTemp),
                    getCorrelationBadge(day.rStorePrecip),
                    getCorrelationBadge(day.rDeliveryTemp),
                    getCorrelationBadge(day.rDeliveryPrecip),
                  ];

                  return (
                    <tr key={day.key} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isWeekend ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-2.5 px-2 font-semibold text-slate-700">{day.it}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600">{day.n}</td>
                      <td className="py-2.5 px-2 text-right text-purple-700 font-semibold">€{formatCurrency(Math.round(day.avgStore))}</td>
                      <td className="py-2.5 px-2 text-right text-blue-700 font-semibold">€{formatCurrency(Math.round(day.avgDelivery))}</td>
                      {badges.map((b, i) => (
                        <td key={i} className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${b.bg} ${b.text}`}>
                            {b.label}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-400">
            💡 "Store" include vendite in negozio, takeaway e takeaway on-site. "Delivery" include solo le consegne a domicilio.
          </div>
        </div>
      )}
    </NeumorphicCard>
  );
}