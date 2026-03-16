import React from 'react';
import NeumorphicCard from '../neumorphic/NeumorphicCard';
import { Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';

const GIORNI_SETTIMANA = [
  { key: 1, it: 'Lunedì', en: 'Monday' },
  { key: 2, it: 'Martedì', en: 'Tuesday' },
  { key: 3, it: 'Mercoledì', en: 'Wednesday' },
  { key: 4, it: 'Giovedì', en: 'Thursday' },
  { key: 5, it: 'Venerdì', en: 'Friday' },
  { key: 6, it: 'Sabato', en: 'Saturday' },
  { key: 0, it: 'Domenica', en: 'Sunday' },
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

const getCorrelationInfo = (r) => {
  if (r === null || r === undefined)
    return { label: 'N/D', colore: 'text-slate-400', sfondo: 'bg-slate-50', forza: 'Dati insufficienti' };
  const abs = Math.abs(r);
  const dir = r > 0 ? '+' : '−';
  if (abs >= 0.7)
    return { label: r.toFixed(2), colore: r > 0 ? 'text-green-700' : 'text-red-700', sfondo: r > 0 ? 'bg-green-50' : 'bg-red-50', forza: `Forte ${dir}` };
  if (abs >= 0.4)
    return { label: r.toFixed(2), colore: r > 0 ? 'text-emerald-600' : 'text-orange-600', sfondo: r > 0 ? 'bg-emerald-50' : 'bg-orange-50', forza: `Moderata ${dir}` };
  if (abs >= 0.2)
    return { label: r.toFixed(2), colore: 'text-slate-600', sfondo: 'bg-slate-100', forza: `Debole ${dir}` };
  return { label: r.toFixed(2), colore: 'text-slate-400', sfondo: 'bg-slate-50', forza: 'Trascurabile' };
};

const getWeekdayInsight = (rTemp, rPrecip, dayName) => {
  if (rTemp === null && rPrecip === null) return { text: 'Dati insufficienti per generare insight.', icon: '⚠️' };

  const parts = [];
  let icon = '↔️';

  // Temperature insight
  if (rTemp !== null) {
    const absT = Math.abs(rTemp);
    if (absT >= 0.4 && rTemp > 0) {
      parts.push('il caldo aumenta i ricavi');
      icon = '🔥';
    } else if (absT >= 0.4 && rTemp < 0) {
      parts.push('il caldo riduce i ricavi');
      icon = '❄️';
    } else if (absT >= 0.2 && rTemp > 0) {
      parts.push('lieve effetto positivo del caldo');
    } else if (absT >= 0.2 && rTemp < 0) {
      parts.push('lieve effetto negativo del caldo');
    }
  }

  // Precipitation insight
  if (rPrecip !== null) {
    const absP = Math.abs(rPrecip);
    if (absP >= 0.4 && rPrecip < 0) {
      parts.push('la pioggia penalizza i ricavi');
      icon = '🌧️';
    } else if (absP >= 0.4 && rPrecip > 0) {
      parts.push('la pioggia favorisce i ricavi');
      icon = '🌧️';
    } else if (absP >= 0.2 && rPrecip < 0) {
      parts.push('lieve impatto negativo della pioggia');
    } else if (absP >= 0.2 && rPrecip > 0) {
      parts.push('lieve impatto positivo della pioggia');
    }
  }

  if (parts.length === 0) {
    return { text: `Il meteo non influenza significativamente i ricavi di ${dayName}.`, icon: '✅' };
  }

  const sentence = parts.join('; ');
  return { text: `Di ${dayName}, ${sentence}.`, icon };
};

export default function WeekdayCorrelationTable({ accoppiati }) {
  if (!accoppiati || accoppiati.length < 3) return null;

  // Group by weekday (0=Sun..6=Sat)
  const grouped = {};
  accoppiati.forEach(row => {
    const dayIdx = new Date(row.data).getDay();
    if (!grouped[dayIdx]) grouped[dayIdx] = [];
    grouped[dayIdx].push(row);
  });

  const weekdayStats = GIORNI_SETTIMANA.map(day => {
    const rows = grouped[day.key] || [];
    const n = rows.length;
    if (n === 0) return { ...day, n: 0 };

    const avgRevenue = rows.reduce((s, r) => s + r.ricavi, 0) / n;
    const avgTemp = rows.reduce((s, r) => s + (r.temp_c || 0), 0) / n;
    const avgPrecip = rows.reduce((s, r) => s + (r.precip_mm || 0), 0) / n;

    const revenues = rows.map(r => r.ricavi);
    const temps = rows.map(r => r.temp_c);
    const precips = rows.map(r => r.precip_mm);

    const rTemp = pearsonCorrelation(temps, revenues);
    const rPrecip = pearsonCorrelation(precips, revenues);

    return { ...day, n, avgRevenue, avgTemp, avgPrecip, rTemp, rPrecip };
  });

  return (
    <NeumorphicCard className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">Analisi per Giorno della Settimana</p>
          <p className="text-xs text-slate-500">Correlazione ricavi–meteo raggruppata per giorno settimanale</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-2 px-2 text-slate-600 font-semibold">Giorno</th>
              <th className="text-center py-2 px-2 text-slate-600 font-semibold">N° gg</th>
              <th className="text-right py-2 px-2 text-slate-600 font-semibold">Ricavi medi (€)</th>
              <th className="text-right py-2 px-2 text-slate-600 font-semibold">Temp. media (°C)</th>
              <th className="text-right py-2 px-2 text-slate-600 font-semibold">Pioggia media (mm)</th>
              <th className="text-center py-2 px-2 text-slate-600 font-semibold">r(Temp)</th>
              <th className="text-center py-2 px-2 text-slate-600 font-semibold">r(Pioggia)</th>
              <th className="text-left py-2 px-2 text-slate-600 font-semibold">Insight</th>
            </tr>
          </thead>
          <tbody>
            {weekdayStats.map(day => {
              const infoTemp = getCorrelationInfo(day.rTemp);
              const infoPrecip = getCorrelationInfo(day.rPrecip);
              const isWeekend = day.key === 0 || day.key === 6;

              return (
                <tr
                  key={day.key}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isWeekend ? 'bg-amber-50/30' : ''}`}
                >
                  <td className="py-2.5 px-2 font-semibold text-slate-700">
                    {day.it}
                    <span className="text-slate-400 font-normal ml-1">/ {day.en}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-600">{day.n}</td>
                  {day.n === 0 ? (
                    <td colSpan={6} className="py-2.5 px-2 text-center text-slate-400 italic">
                      Nessun dato
                    </td>
                  ) : (
                    <>
                      <td className="py-2.5 px-2 text-right text-slate-800 font-semibold">
                        €{formatCurrency(Math.round(day.avgRevenue))}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700">
                        {day.avgTemp?.toFixed(1)}°
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700">
                        {day.avgPrecip?.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${infoTemp.sfondo} ${infoTemp.colore}`}>
                          {infoTemp.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${infoPrecip.sfondo} ${infoPrecip.colore}`}>
                          {infoPrecip.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-left text-slate-600 max-w-[220px]">
                        {(() => {
                          const insight = getWeekdayInsight(day.rTemp, day.rPrecip, day.it);
                          return (
                            <span className="text-xs leading-snug">
                              {insight.icon} {insight.text}
                            </span>
                          );
                        })()}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-400">
        💡 La correlazione è calcolata solo per i giorni con almeno 3 osservazioni. Per periodi più lunghi si ottengono risultati più significativi.
      </div>
    </NeumorphicCard>
  );
}