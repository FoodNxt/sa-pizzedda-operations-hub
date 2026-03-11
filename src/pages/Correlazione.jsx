import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from '../components/ProtectedPage';
import NeumorphicCard from '../components/neumorphic/NeumorphicCard';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, BarChart, Bar, ResponsiveContainer, Cell
} from 'recharts';
import { Thermometer, Droplets, Cloud, Loader2, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { formatCurrency } from '../components/utils/formatCurrency';
import WeatherAuditTable from '../components/correlation/WeatherAuditTable';

// Open-Meteo archive API ha un ritardo di ~5 giorni
const MAX_END_DATE = format(subDays(new Date(), 5), 'yyyy-MM-dd');
const DEFAULT_START = format(subDays(new Date(), 35), 'yyyy-MM-dd');
const DEFAULT_END = format(subDays(new Date(), 6), 'yyyy-MM-dd');

const WMO_CATEGORIA = (code) => {
  if (code === 0) return 'Soleggiato';
  if (code <= 2) return 'Parz. nuvoloso';
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
    return { label: 'N/D', colore: 'text-slate-500', sfondo: 'bg-slate-100', forza: 'Dati insufficienti', barra: 'bg-slate-300' };
  const abs = Math.abs(r);
  const dir = r > 0 ? 'positiva' : 'negativa';
  if (abs >= 0.7)
    return { label: r.toFixed(3), colore: r > 0 ? 'text-green-700' : 'text-red-700', sfondo: r > 0 ? 'bg-green-50' : 'bg-red-50', forza: `Forte ${dir}`, barra: r > 0 ? 'bg-green-500' : 'bg-red-500' };
  if (abs >= 0.4)
    return { label: r.toFixed(3), colore: r > 0 ? 'text-emerald-600' : 'text-orange-600', sfondo: r > 0 ? 'bg-emerald-50' : 'bg-orange-50', forza: `Moderata ${dir}`, barra: r > 0 ? 'bg-emerald-400' : 'bg-orange-400' };
  if (abs >= 0.2)
    return { label: r.toFixed(3), colore: 'text-slate-600', sfondo: 'bg-slate-100', forza: `Debole ${dir}`, barra: 'bg-slate-400' };
  return { label: r.toFixed(3), colore: 'text-slate-400', sfondo: 'bg-slate-50', forza: 'Trascurabile', barra: 'bg-slate-200' };
};

const COLORI = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#ef4444'];

export default function Correlazione() {
  const [localeSelezionato, setLocaleSelezionato] = useState('all');
  const [dataInizio, setDataInizio] = useState(DEFAULT_START);
  const [dataFine, setDataFine] = useState(DEFAULT_END);
  const [datiMeteo, setDatiMeteo] = useState(null);
  const [caricandoMeteo, setCaricandoMeteo] = useState(false);
  const [erroreMeteo, setErroreMeteo] = useState(null);
  const [meteoObsoleto, setMeteoObsoleto] = useState(false);
  const [metricaAttiva, setMetricaAttiva] = useState('temp');

  const { data: locali = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: iPraticoData = [], isLoading: caricandoRicavi } = useQuery({
    queryKey: ['iPratico'],
    queryFn: () => base44.entities.iPratico.list('-order_date', 1000)
  });

  const posizioneLocale = useMemo(() => {
    if (localeSelezionato === 'all') {
      return { lat: 45.4642, lon: 9.1900, etichetta: 'Milano (default — tutti i locali)', hasCoords: true };
    }
    const store = locali.find(s => s.id === localeSelezionato);
    if (!store) return { lat: 45.4642, lon: 9.1900, etichetta: 'Locale non trovato (default Milano)', hasCoords: false };
    if (store.latitude && store.longitude) {
      return { lat: store.latitude, lon: store.longitude, etichetta: store.city || store.name, hasCoords: true };
    }
    return { lat: 45.4642, lon: 9.1900, etichetta: `${store.name} (coordinate non disponibili — default Milano)`, hasCoords: false };
  }, [localeSelezionato, locali]);

  useEffect(() => {
    if (datiMeteo) setMeteoObsoleto(true);
  }, [dataInizio, dataFine, localeSelezionato]);

  // Clamp end date: non oltre MAX_END_DATE (ritardo archivio Open-Meteo ~5 giorni)
  const dataFineEffettiva = dataFine > MAX_END_DATE ? MAX_END_DATE : dataFine;

  const ricaviPerData = useMemo(() => {
    const mappa = {};
    iPraticoData.forEach(item => {
      if (!item.order_date) return;
      if (item.order_date < dataInizio || item.order_date > dataFineEffettiva) return;
      if (localeSelezionato !== 'all' && item.store_id !== localeSelezionato) return;
      mappa[item.order_date] = (mappa[item.order_date] || 0) + (item.total_revenue || 0);
    });
    return mappa;
  }, [iPraticoData, dataInizio, dataFineEffettiva, localeSelezionato]);

  const caricaMeteo = async () => {
    setCaricandoMeteo(true);
    setErroreMeteo(null);
    try {
      const { lat, lon } = posizioneLocale;
      // FIX: parametro corretto è "weather_code" (non "weathercode") in Open-Meteo v2
      // FIX: end_date viene clamped a MAX_END_DATE per evitare errore 400
      const fineRichiesta = dataFine > MAX_END_DATE ? MAX_END_DATE : dataFine;
      if (dataInizio > fineRichiesta) {
        throw new Error(`Il periodo selezionato è troppo recente. I dati meteo storici sono disponibili fino al ${fineRichiesta}. Seleziona una data di fine precedente.`);
      }
      const url =
        `https://archive-api.open-meteo.com/v1/archive` +
        `?latitude=${lat}&longitude=${lon}` +
        `&start_date=${dataInizio}&end_date=${fineRichiesta}` +
        `&daily=temperature_2m_mean,temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code` +
        `&timezone=Europe%2FRome`;
      const res = await fetch(url);
      if (!res.ok) {
        const testo = await res.text().catch(() => '');
        throw new Error(`Errore API meteo (codice ${res.status}). ${testo.includes('No data') ? 'Nessun dato per questo periodo o coordinate.' : 'Controlla le date selezionate.'}`);
      }
      const data = await res.json();
      if (!data.daily?.time?.length) {
        throw new Error('Nessun dato meteo disponibile per il periodo e la posizione selezionati.');
      }
      const mappa = {};
      data.daily.time.forEach((data_giorno, i) => {
        mappa[data_giorno] = {
          temp_c: data.daily.temperature_2m_mean[i],
          temp_min: data.daily.temperature_2m_min?.[i] ?? null,
          temp_max: data.daily.temperature_2m_max?.[i] ?? null,
          precip_mm: data.daily.precipitation_sum[i] ?? 0,
          codice_meteo: data.daily.weather_code[i] ?? 0
        };
      });
      setDatiMeteo(mappa);
      setMeteoObsoleto(false);
    } catch (e) {
      setErroreMeteo(e.message);
    } finally {
      setCaricandoMeteo(false);
    }
  };

  const datiCorrelazione = useMemo(() => {
    if (!datiMeteo || Object.keys(ricaviPerData).length === 0) return null;
    const accoppiati = [];
    Object.keys(ricaviPerData).forEach(data => {
      const m = datiMeteo[data];
      if (m && m.temp_c !== null && m.temp_c !== undefined) {
        accoppiati.push({
          data,
          ricavi: ricaviPerData[data],
          temp_c: m.temp_c,
          temp_min: m.temp_min,
          temp_max: m.temp_max,
          precip_mm: m.precip_mm,
          codice_meteo: m.codice_meteo,
          categoria: `${WMO_EMOJI(m.codice_meteo)} ${WMO_CATEGORIA(m.codice_meteo)}`
        });
      }
    });
    if (accoppiati.length < 3) return { accoppiati, insufficiente: true };

    const ricavi = accoppiati.map(p => p.ricavi);
    const temperature = accoppiati.map(p => p.temp_c);
    const precipitazioni = accoppiati.map(p => p.precip_mm);

    const rTemp = pearsonCorrelation(temperature, ricavi);
    const rPrecip = pearsonCorrelation(precipitazioni, ricavi);

    const gruppiCondizione = {};
    accoppiati.forEach(p => {
      if (!gruppiCondizione[p.categoria]) gruppiCondizione[p.categoria] = [];
      gruppiCondizione[p.categoria].push(p.ricavi);
    });
    const datiCondizione = Object.entries(gruppiCondizione)
      .map(([cat, revs]) => ({
        condizione: cat,
        media_ricavi: Math.round(revs.reduce((a, b) => a + b, 0) / revs.length),
        conteggio: revs.length
      }))
      .sort((a, b) => b.media_ricavi - a.media_ricavi);

    const allTempMin = accoppiati.map(p => p.temp_min).filter(v => v !== null && v !== undefined);
    const allTempMax = accoppiati.map(p => p.temp_max).filter(v => v !== null && v !== undefined);
    const tempMin = allTempMin.length > 0 ? Math.min(...allTempMin) : Math.min(...temperature);
    const tempMax = allTempMax.length > 0 ? Math.max(...allTempMax) : Math.max(...temperature);
    const precipTotale = precipitazioni.reduce((a, b) => a + b, 0);

    return { accoppiati, rTemp, rPrecip, datiCondizione, n: accoppiati.length, tempMin, tempMax, precipTotale };
  }, [datiMeteo, ricaviPerData]);

  const infoTemp = datiCorrelazione?.rTemp !== undefined ? getCorrelationInfo(datiCorrelazione.rTemp) : null;
  const infoPrecip = datiCorrelazione?.rPrecip !== undefined ? getCorrelationInfo(datiCorrelazione.rPrecip) : null;

  const datiScatter = useMemo(() => {
    if (!datiCorrelazione?.accoppiati) return [];
    return datiCorrelazione.accoppiati.map(p => ({
      x: metricaAttiva === 'temp' ? p.temp_c : p.precip_mm,
      y: p.ricavi,
      data: p.data
    }));
  }, [datiCorrelazione, metricaAttiva]);

  const giorniConRicavi = Object.keys(ricaviPerData).length;
  const nomeLocale = localeSelezionato === 'all'
    ? 'Tutti i locali'
    : locali.find(s => s.id === localeSelezionato)?.name || '—';

  const dataFineVisibile = dataFine > MAX_END_DATE
    ? <span className="text-orange-600 font-medium">Clamped a {MAX_END_DATE} (ritardo archivio)</span>
    : dataFine;

  return (
    <ProtectedPage pageName="Correlazione">
      <div className="max-w-5xl mx-auto space-y-4 lg:space-y-5">

        {/* Intestazione */}
        <div>
          <p className="text-2xl font-bold lg:text-3xl text-slate-900">Correlazione Ricavi–Meteo</p>
          <p className="text-sm text-slate-500 mt-1">
            Analizza la relazione statistica tra i ricavi giornalieri e le condizioni meteorologiche storiche
          </p>
        </div>

        {/* Filtri */}
        <NeumorphicCard className="p-4">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Filtri</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Locale</label>
              <select
                value={localeSelezionato}
                onChange={e => setLocaleSelezionato(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
              >
                <option value="all">Tutti i locali</option>
                {locali.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Dal</label>
              <input
                type="date"
                value={dataInizio}
                max={MAX_END_DATE}
                onChange={e => setDataInizio(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Al {dataFine > MAX_END_DATE && <span className="text-orange-500">(max: {MAX_END_DATE})</span>}
              </label>
              <input
                type="date"
                value={dataFine}
                max={MAX_END_DATE}
                onChange={e => setDataFine(e.target.value)}
                className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={caricaMeteo}
              disabled={caricandoMeteo}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {caricandoMeteo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
              {caricandoMeteo ? 'Caricamento...' : 'Carica dati meteo'}
            </button>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
                📍 {posizioneLocale.etichetta}
              </span>
              {!caricandoRicavi && (
                <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
                  {giorniConRicavi} giorni con ricavi
                </span>
              )}
              {meteoObsoleto && datiMeteo && !caricandoMeteo && (
                <span className="px-2 py-1 bg-orange-100 rounded-lg text-orange-700 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Filtri modificati — ricarica il meteo
                </span>
              )}
            </div>
          </div>

          {dataFine > MAX_END_DATE && (
            <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
              <Info className="w-3 h-3" />
              I dati meteo storici Open-Meteo hanno un ritardo di circa 5 giorni. La data di fine verrà automaticamente impostata al {MAX_END_DATE}.
            </div>
          )}
        </NeumorphicCard>

        {/* Errore */}
        {erroreMeteo && (
          <NeumorphicCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700 mb-0.5">Errore nel caricamento meteo</p>
                <p className="text-xs text-red-600">{erroreMeteo}</p>
              </div>
            </div>
          </NeumorphicCard>
        )}

        {/* Stato vuoto */}
        {!datiMeteo && !caricandoMeteo && !erroreMeteo && (
          <NeumorphicCard className="p-10 text-center">
            <Cloud className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold mb-1">Nessun dato meteo caricato</p>
            <p className="text-slate-400 text-xs mb-3">
              Seleziona il periodo e il locale, poi clicca "Carica dati meteo"
            </p>
            <p className="text-slate-300 text-xs">
              Dati forniti da Open-Meteo · open-source · gratuito · nessuna API key richiesta
            </p>
          </NeumorphicCard>
        )}

        {/* Riepilogo analisi */}
        {datiCorrelazione && !meteoObsoleto && (
          <>
            {datiCorrelazione.insufficiente ? (
              <NeumorphicCard className="p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-3" />
                <p className="text-slate-700 text-sm font-semibold mb-1">Dati insufficienti per l'analisi</p>
                <p className="text-slate-500 text-xs">
                  Trovati solo {datiCorrelazione.accoppiati.length} giorn{datiCorrelazione.accoppiati.length === 1 ? 'o' : 'i'} con corrispondenza tra ricavi e dati meteo.
                  Sono necessari almeno 3 giorni.
                </p>
              </NeumorphicCard>
            ) : (
              <>
                {/* Scheda riepilogo periodo */}
                <NeumorphicCard className="p-4">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Riepilogo periodo analizzato</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="neumorphic-pressed rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-slate-800">{datiCorrelazione.n}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Giorni analizzati</p>
                    </div>
                    <div className="neumorphic-pressed rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-800">{nomeLocale}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Locale</p>
                    </div>
                    <div className="neumorphic-pressed rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-800">
                        {datiCorrelazione.tempMin?.toFixed(1)}° / {datiCorrelazione.tempMax?.toFixed(1)}°C
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Temperatura min/max</p>
                    </div>
                    <div className="neumorphic-pressed rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-800">{datiCorrelazione.precipTotale?.toFixed(0)} mm</p>
                      <p className="text-xs text-slate-500 mt-0.5">Precipitazioni totali</p>
                    </div>
                  </div>
                </NeumorphicCard>

                {/* Schede correlazione */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Temperatura */}
                  <NeumorphicCard className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0">
                        <Thermometer className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Ricavi vs Temperatura</p>
                        <p className="text-xs text-slate-500">Correlazione lineare (Pearson r)</p>
                      </div>
                    </div>
                    {infoTemp && (
                      <>
                        <div className={`flex items-center gap-4 px-4 py-3 rounded-xl ${infoTemp.sfondo} mb-3`}>
                          <span className={`text-4xl font-bold ${infoTemp.colore}`}>{infoTemp.label}</span>
                          <div>
                            <p className={`text-sm font-bold ${infoTemp.colore}`}>{infoTemp.forza}</p>
                            <p className="text-xs text-slate-400">Coefficiente r</p>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full mb-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${infoTemp.barra} transition-all duration-500`}
                            style={{ width: `${Math.min(Math.abs(datiCorrelazione.rTemp) * 100, 100)}%` }}
                          />
                        </div>
                      </>
                    )}
                    <p className="text-xs text-slate-500">
                      {datiCorrelazione.rTemp > 0.3
                        ? '📈 Con temperature più alte i ricavi tendono ad aumentare.'
                        : datiCorrelazione.rTemp < -0.3
                        ? '📉 Con temperature più alte i ricavi tendono a diminuire.'
                        : '↔️ Nessuna relazione lineare significativa tra temperatura e ricavi.'}
                    </p>
                  </NeumorphicCard>

                  {/* Precipitazioni */}
                  <NeumorphicCard className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Droplets className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Ricavi vs Precipitazioni</p>
                        <p className="text-xs text-slate-500">Correlazione lineare (Pearson r)</p>
                      </div>
                    </div>
                    {infoPrecip && (
                      <>
                        <div className={`flex items-center gap-4 px-4 py-3 rounded-xl ${infoPrecip.sfondo} mb-3`}>
                          <span className={`text-4xl font-bold ${infoPrecip.colore}`}>{infoPrecip.label}</span>
                          <div>
                            <p className={`text-sm font-bold ${infoPrecip.colore}`}>{infoPrecip.forza}</p>
                            <p className="text-xs text-slate-400">Coefficiente r</p>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full mb-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${infoPrecip.barra} transition-all duration-500`}
                            style={{ width: `${Math.min(Math.abs(datiCorrelazione.rPrecip) * 100, 100)}%` }}
                          />
                        </div>
                      </>
                    )}
                    <p className="text-xs text-slate-500">
                      {datiCorrelazione.rPrecip > 0.3
                        ? '🌧️ Nei giorni di pioggia i ricavi tendono ad essere più alti.'
                        : datiCorrelazione.rPrecip < -0.3
                        ? '☀️ Nei giorni di pioggia i ricavi tendono a calare.'
                        : '↔️ Nessuna relazione lineare significativa tra pioggia e ricavi.'}
                    </p>
                  </NeumorphicCard>
                </div>

                {/* Scatter plot */}
                <NeumorphicCard className="p-5">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Dispersione ricavi–meteo</p>
                      <p className="text-xs text-slate-500">Ogni punto rappresenta un giorno — asse X: variabile meteo, asse Y: ricavi</p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => setMetricaAttiva('temp')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${metricaAttiva === 'temp' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Temperatura
                      </button>
                      <button
                        onClick={() => setMetricaAttiva('precip')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${metricaAttiva === 'precip' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Precipitazioni
                      </button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 35, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        label={{
                          value: metricaAttiva === 'temp' ? 'Temperatura (°C)' : 'Precipitazioni (mm)',
                          position: 'insideBottom',
                          offset: -20,
                          style: { fontSize: 11, fill: '#64748b' }
                        }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="y"
                        type="number"
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
                              <p className="font-bold text-slate-700 mb-1">{d.data}</p>
                              <p className="text-slate-600">Ricavi: €{formatCurrency(d.y)}</p>
                              <p className="text-slate-600">
                                {metricaAttiva === 'temp'
                                  ? `Temperatura: ${d.x?.toFixed(1)} °C`
                                  : `Precipitazioni: ${d.x?.toFixed(1)} mm`}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Scatter
                        data={datiScatter}
                        fill={metricaAttiva === 'temp' ? '#f97316' : '#3b82f6'}
                        fillOpacity={0.65}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </NeumorphicCard>

                {/* Ricavi per condizione meteo */}
                {datiCorrelazione.datiCondizione.length > 0 && (
                  <NeumorphicCard className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Cloud className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Ricavi medi per condizione meteo</p>
                        <p className="text-xs text-slate-500">Media giornaliera raggruppata per tipo di cielo</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={datiCorrelazione.datiCondizione} margin={{ bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="condizione" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={55} />
                        <YAxis tickFormatter={v => `€${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} width={55} />
                        <RechartsTooltip
                          content={({ payload, label }) => {
                            if (!payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs">
                                <p className="font-bold text-slate-700 mb-1">{label}</p>
                                <p className="text-slate-600">Media ricavi: €{formatCurrency(d.media_ricavi)}</p>
                                <p className="text-slate-500">{d.conteggio} giorn{d.conteggio === 1 ? 'o' : 'i'}</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="media_ricavi" radius={[6, 6, 0, 0]}>
                          {datiCorrelazione.datiCondizione.map((_, idx) => (
                            <Cell key={idx} fill={COLORI[idx % COLORI.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {datiCorrelazione.datiCondizione.map((d, i) => (
                        <div key={i} className="neumorphic-flat rounded-lg p-2 text-center">
                          <p className="text-xs font-semibold text-slate-700">{d.condizione}</p>
                          <p className="text-sm font-bold text-slate-800">€{formatCurrency(d.media_ricavi)}</p>
                          <p className="text-xs text-slate-400">{d.conteggio} gg</p>
                        </div>
                      ))}
                    </div>
                  </NeumorphicCard>
                )}

                {/* Legenda metodologia */}
                {/* Daily Audit Table */}
                <WeatherAuditTable
                  accoppiati={datiCorrelazione.accoppiati}
                  posizioneLocale={posizioneLocale}
                />

                <NeumorphicCard className="p-4" style={{ background: '#f8faff' }}>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-600 space-y-1.5">
                      <p className="font-semibold text-slate-700">Come leggere i risultati</p>
                      <p>
                        Il <strong>coefficiente di Pearson (r)</strong> misura la relazione lineare tra due variabili.
                        Va da <strong>-1</strong> (relazione inversa perfetta) a <strong>+1</strong> (relazione diretta perfetta).
                        Un valore vicino a 0 indica nessuna correlazione lineare.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-semibold">|r| ≥ 0.7 — Forte</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">0.4–0.7 — Moderata</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">0.2–0.4 — Debole</span>
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded font-semibold">&lt;0.2 — Trascurabile</span>
                      </div>
                      <p className="text-slate-400 pt-1">
                        Dati meteo: Open-Meteo Archive API · temperatura media a 2m · precipitazioni totali · classificazione WMO
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