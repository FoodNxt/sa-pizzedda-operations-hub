import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import ProtectedPage from '../components/ProtectedPage';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  BarChart, Bar, ResponsiveContainer, Cell
} from 'recharts';
import { BarChart3, Thermometer, Droplets, Cloud, Loader2, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { formatCurrency } from '../components/utils/formatCurrency';

// WMO weather code → readable category
const WMO_CATEGORY = (code) => {
  if (code === 0) return 'Soleggiato';
  if (code <= 2) return 'Parz. Nuvoloso';
  if (code === 3) return 'Nuvoloso';
  if (code <= 48) return 'Nebbia';
  if (code <= 67) return 'Pioggia';
  if (code <= 77) return 'Neve';
  if (code <= 82) return 'Rovesci';
  if (code <= 86) return 'Neve';
  return 'Temporale';
};

const WMO_EMOJI = (code) => {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '❄️';
  return '⛈️';
};

// Pearson correlation coefficient
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

const getCorrelationInfo = (r) => {
  if (r === null || r === undefined)
    return { label: 'N/D', color: 'text-slate-500', bg: 'bg-slate-100', strength: 'Insufficiente', bar: 'bg-slate-300' };
  const abs = Math.abs(r);
  const dir = r > 0 ? 'Positiva' : 'Negativa';
  if (abs >= 0.7)
    return { label: r.toFixed(3), color: r > 0 ? 'text-green-700' : 'text-red-700', bg: r > 0 ? 'bg-green-100' : 'bg-red-100', strength: `Forte ${dir}`, bar: r > 0 ? 'bg-green-500' : 'bg-red-500' };
  if (abs >= 0.4)
    return { label: r.toFixed(3), color: r > 0 ? 'text-emerald-600' : 'text-orange-600', bg: r > 0 ? 'bg-emerald-50' : 'bg-orange-50', strength: `Moderata ${dir}`, bar: r > 0 ? 'bg-emerald-400' : 'bg-orange-400' };
  if (abs >= 0.2)
    return { label: r.toFixed(3), color: 'text-slate-600', bg: 'bg-slate-100', strength: `Debole ${dir}`, bar: 'bg-slate-400' };
  return { label: r.toFixed(3), color: 'text-slate-400', bg: 'bg-slate-50', strength: 'Trascurabile', bar: 'bg-slate-200' };
};

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#ef4444'];

export default function Correlazione() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 31), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [weatherData, setWeatherData] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [weatherStale, setWeatherStale] = useState(false);
  const [activeMetric, setActiveMetric] = useState('temp');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: iPraticoData = [], isLoading: revenueLoading } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000)
  });

  const storeLocation = useMemo(() => {
    if (selectedStore === 'all') {
      return { lat: 45.4642, lon: 9.1900, label: 'Milano (default per tutti i locali)' };
    }
    const store = stores.find(s => s.id === selectedStore);
    if (!store) return { lat: 45.4642, lon: 9.1900, label: 'Milano (default)' };
    if (store.latitude && store.longitude) {
      return { lat: store.latitude, lon: store.longitude, label: store.city || store.name };
    }
    return { lat: 45.4642, lon: 9.1900, label: `${store.city || store.name} (coords n.d. → Milano)` };
  }, [selectedStore, stores]);

  useEffect(() => {
    if (weatherData) setWeatherStale(true);
  }, [startDate, endDate, selectedStore]);

  const revenueByDate = useMemo(() => {
    const map = {};
    iPraticoData.forEach(item => {
      if (!item.order_date) return;
      if (item.order_date < startDate || item.order_date > endDate) return;
      if (selectedStore !== 'all' && item.store_id !== selectedStore) return;
      map[item.order_date] = (map[item.order_date] || 0) + (item.total_revenue || 0);
    });
    return map;
  }, [iPraticoData, startDate, endDate, selectedStore]);

  const fetchWeather = async () => {
    setIsLoadingWeather(true);
    setWeatherError(null);
    try {
      const { lat, lon } = storeLocation;
      const url =
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
        `&start_date=${startDate}&end_date=${endDate}` +
        `&daily=temperature_2m_mean,precipitation_sum,weathercode&timezone=Europe%2FRome`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Errore API meteo (${res.status})`);
      const data = await res.json();
      if (!data.daily?.time) throw new Error('Nessun dato meteo per il periodo selezionato. I dati Open-Meteo hanno un ritardo di circa 5 giorni.');
      const map = {};
      data.daily.time.forEach((date, i) => {
        map[date] = {
          temp_c: data.daily.temperature_2m_mean[i],
          precip_mm: data.daily.precipitation_sum[i] ?? 0,
          weathercode: data.daily.weathercode[i] ?? 0
        };
      });
      setWeatherData(map);
      setWeatherStale(false);
    } catch (e) {
      setWeatherError(e.message);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const correlationData = useMemo(() => {
    if (!weatherData || Object.keys(revenueByDate).length === 0) return null;
    const paired = [];
    Object.keys(revenueByDate).forEach(date => {
      const w = weatherData[date];
      if (w && w.temp_c !== null && w.temp_c !== undefined) {
        paired.push({
          date,
          revenue: revenueByDate[date],
          temp_c: w.temp_c,
          precip_mm: w.precip_mm,
          weathercode: w.weathercode,
          category: `${WMO_EMOJI(w.weathercode)} ${WMO_CATEGORY(w.weathercode)}`
        });
      }
    });
    if (paired.length < 3) return { paired, insufficient: true };

    const revenues = paired.map(p => p.revenue);
    const temps = paired.map(p => p.temp_c);
    const precips = paired.map(p => p.precip_mm);

    const rTemp = pearsonCorrelation(temps, revenues);
    const rPrecip = pearsonCorrelation(precips, revenues);

    const conditionGroups = {};
    paired.forEach(p => {
      if (!conditionGroups[p.category]) conditionGroups[p.category] = [];
      conditionGroups[p.category].push(p.revenue);
    });
    const conditionData = Object.entries(conditionGroups)
      .map(([cat, revs]) => ({
        condition: cat,
        avg_revenue: Math.round(revs.reduce((a, b) => a + b, 0) / revs.length),
        count: revs.length
      }))
      .sort((a, b) => b.avg_revenue - a.avg_revenue);

    return { paired, rTemp, rPrecip, conditionData, n: paired.length };
  }, [weatherData, revenueByDate]);

  const tempInfo = correlationData?.rTemp !== undefined ? getCorrelationInfo(correlationData.rTemp) : null;
  const precipInfo = correlationData?.rPrecip !== undefined ? getCorrelationInfo(correlationData.rPrecip) : null;

  const scatterData = useMemo(() => {
    if (!correlationData?.paired) return [];
    return correlationData.paired.map(p => ({
      x: activeMetric === 'temp' ? p.temp_c : p.precip_mm,
      y: p.revenue,
      date: p.date
    }));
  }, [correlationData, activeMetric]);

  const revenueDates = Object.keys(revenueByDate).length;

  return (
    <ProtectedPage pageName="Correlazione">
      <div className="max-w-5xl mx-auto space-y-4 lg:space-y-6">

        <div className="mb-4">
          <h1 className="text-2xl font-bold lg:text-3xl" style={{ color: '#000000' }}>
            Correlazione Revenue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analisi della relazione tra ricavi e condizioni meteo storiche
          </p>
        </div>

        <NeumorphicCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-medium">Locale</label>
              <select
                value={selectedStore}
                onChange={e => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
              >
                <option value="all">Tutti i Locali</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-medium">Data Inizio</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-medium">Data Fine</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={fetchWeather}
              disabled={isLoadingWeather}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {isLoadingWeather
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Cloud className="w-4 h-4" />}
              {isLoadingWeather ? 'Caricamento meteo...' : 'Carica Dati Meteo'}
            </button>

            <span className="text-xs text-slate-500">📍 {storeLocation.label}</span>

            {!revenueLoading && (
              <span className="text-xs text-slate-400">
                {revenueDates} giorni con ricavi nel periodo
              </span>
            )}

            {weatherStale && weatherData && !isLoadingWeather && (
              <span className="text-xs text-orange-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Filtri cambiati — ricarica il meteo
              </span>
            )}
          </div>
        </NeumorphicCard>

        {weatherError && (
          <NeumorphicCard className="p-4 border border-red-200" style={{ background: '#fff5f5' }}>
            <div className="flex items-start gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{weatherError}</p>
            </div>
          </NeumorphicCard>
        )}

        {!weatherData && !isLoadingWeather && !weatherError && (
          <NeumorphicCard className="p-10 text-center">
            <Cloud className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-medium mb-1">
              Seleziona il periodo e clicca "Carica Dati Meteo"
            </p>
            <p className="text-slate-400 text-xs">
              Dati meteo forniti da <strong>Open-Meteo</strong> (open-source, gratuito, nessuna API key richiesta)
            </p>
          </NeumorphicCard>
        )}

        {correlationData && !weatherStale && (
          <>
            {correlationData.insufficient ? (
              <NeumorphicCard className="p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-3" />
                <p className="text-slate-600 text-sm">
                  Dati insufficienti ({correlationData.paired.length} giorn{correlationData.paired.length === 1 ? 'o' : 'i'} con dati meteo e ricavi).
                  Sono necessari almeno 3 giorni.
                </p>
              </NeumorphicCard>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NeumorphicCard className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md">
                        <Thermometer className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Revenue vs Temperatura</h3>
                        <p className="text-xs text-slate-500">{correlationData.n} giorni analizzati</p>
                      </div>
                    </div>
                    {tempInfo && (
                      <>
                        <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl ${tempInfo.bg} mb-3`}>
                          <span className={`text-3xl font-bold ${tempInfo.color}`}>{tempInfo.label}</span>
                          <div>
                            <p className={`text-xs font-bold ${tempInfo.color}`}>{tempInfo.strength}</p>
                            <p className="text-xs text-slate-400">Pearson r</p>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full mb-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${tempInfo.bar} transition-all`}
                            style={{ width: `${Math.min(Math.abs(correlationData.rTemp) * 100, 100)}%` }}
                          />
                        </div>
                      </>
                    )}
                    <p className="text-xs text-slate-500">
                      {correlationData.rTemp > 0.3
                        ? '📈 I ricavi tendono ad aumentare con temperature più alte.'
                        : correlationData.rTemp < -0.3
                        ? '📉 I ricavi tendono a diminuire con temperature più alte.'
                        : '↔️ Nessuna correlazione significativa tra temperatura e ricavi.'}
                    </p>
                  </NeumorphicCard>

                  <NeumorphicCard className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
                        <Droplets className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Revenue vs Precipitazioni</h3>
                        <p className="text-xs text-slate-500">{correlationData.n} giorni analizzati</p>
                      </div>
                    </div>
                    {precipInfo && (
                      <>
                        <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl ${precipInfo.bg} mb-3`}>
                          <span className={`text-3xl font-bold ${precipInfo.color}`}>{precipInfo.label}</span>
                          <div>
                            <p className={`text-xs font-bold ${precipInfo.color}`}>{precipInfo.strength}</p>
                            <p className="text-xs text-slate-400">Pearson r</p>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full mb-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${precipInfo.bar} transition-all`}
                            style={{ width: `${Math.min(Math.abs(correlationData.rPrecip) * 100, 100)}%` }}
                          />
                        </div>
                      </>
                    )}
                    <p className="text-xs text-slate-500">
                      {correlationData.rPrecip > 0.3
                        ? '🌧️ I ricavi tendono ad aumentare nei giorni di pioggia.'
                        : correlationData.rPrecip < -0.3
                        ? '☀️ I ricavi tendono a diminuire nei giorni di pioggia.'
                        : '↔️ Nessuna correlazione significativa tra precipitazioni e ricavi.'}
                    </p>
                  </NeumorphicCard>
                </div>

                <NeumorphicCard className="p-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Scatter Plot</h3>
                      <p className="text-xs text-slate-500">Ogni punto = un giorno</p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => setActiveMetric('temp')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeMetric === 'temp' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'}`}
                      >
                        Temperatura
                      </button>
                      <button
                        onClick={() => setActiveMetric('precip')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeMetric === 'precip' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'}`}
                      >
                        Precipitazioni
                      </button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        name={activeMetric === 'temp' ? 'Temperatura (°C)' : 'Precipitazioni (mm)'}
                        label={{
                          value: activeMetric === 'temp' ? 'Temperatura (°C)' : 'Precipitazioni (mm)',
                          position: 'insideBottom',
                          offset: -15,
                          style: { fontSize: 11, fill: '#64748b' }
                        }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="y"
                        type="number"
                        name="Revenue (€)"
                        tickFormatter={v => `€${Math.round(v / 1000)}k`}
                        tick={{ fontSize: 11 }}
                        width={55}
                      />
                      <RechartsTooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs">
                              <p className="font-bold text-slate-700 mb-1">{d.date}</p>
                              <p className="text-slate-600">Revenue: €{formatCurrency(d.y)}</p>
                              <p className="text-slate-600">
                                {activeMetric === 'temp' ? `Temperatura: ${d.x?.toFixed(1)}°C` : `Precipitazioni: ${d.x?.toFixed(1)}mm`}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Scatter
                        data={scatterData}
                        fill={activeMetric === 'temp' ? '#f97316' : '#3b82f6'}
                        fillOpacity={0.65}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </NeumorphicCard>

                {correlationData.conditionData.length > 0 && (
                  <NeumorphicCard className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
                        <Cloud className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Revenue Medio per Condizione Meteo</h3>
                        <p className="text-xs text-slate-500">Revenue medio giornaliero per tipo di cielo</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={correlationData.conditionData} margin={{ bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="condition" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={55} />
                        <YAxis tickFormatter={v => `€${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} width={55} />
                        <RechartsTooltip
                          content={({ payload, label }) => {
                            if (!payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs">
                                <p className="font-bold text-slate-700 mb-1">{label}</p>
                                <p className="text-slate-600">Rev. medio: €{formatCurrency(d.avg_revenue)}</p>
                                <p className="text-slate-500">{d.count} giorn{d.count === 1 ? 'o' : 'i'}</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="avg_revenue" radius={[6, 6, 0, 0]}>
                          {correlationData.conditionData.map((_, idx) => (
                            <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {correlationData.conditionData.map((d, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {d.condition}: {d.count}gg
                        </span>
                      ))}
                    </div>
                  </NeumorphicCard>
                )}

                <NeumorphicCard className="p-4" style={{ background: '#f0f9ff' }}>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong>Correlazione di Pearson (r)</strong>: misura la relazione lineare tra due variabili numeriche.
                        Varia da -1 (correlazione negativa perfetta) a +1 (correlazione positiva perfetta).
                      </p>
                      <p>
                        |r| ≥ 0.7 = <span className="text-green-700 font-semibold">Forte</span> &nbsp;·&nbsp;
                        0.4 ≤ |r| &lt; 0.7 = <span className="text-emerald-600 font-semibold">Moderata</span> &nbsp;·&nbsp;
                        0.2 ≤ |r| &lt; 0.4 = <span className="text-slate-600 font-semibold">Debole</span> &nbsp;·&nbsp;
                        |r| &lt; 0.2 = <span className="text-slate-400 font-semibold">Trascurabile</span>
                      </p>
                      <p>
                        Dati meteo: <strong>Open-Meteo</strong> (open-source, gratuito) ·
                        Temperatura media giornaliera a 2m · Precipitazioni totali giornaliere · Codice WMO
                      </p>
                    </div>
                  </div>
                </NeumorphicCard>
              </>
            )}
          </>
        )}
      </div>
    </ProtectedPage>
  );
}