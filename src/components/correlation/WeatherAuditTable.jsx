import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';
import NeumorphicCard from '../neumorphic/NeumorphicCard';
import { formatCurrency } from '../utils/formatCurrency';

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

const WMO_LABEL = (code) => {
  if (code === 0) return { it: 'Soleggiato', en: 'Sunny' };
  if (code <= 2) return { it: 'Parz. nuvoloso', en: 'Partly cloudy' };
  if (code === 3) return { it: 'Nuvoloso', en: 'Cloudy' };
  if (code <= 48) return { it: 'Nebbia', en: 'Fog' };
  if (code <= 67) return { it: 'Pioggia', en: 'Rain' };
  if (code <= 77) return { it: 'Neve', en: 'Snow' };
  if (code <= 82) return { it: 'Rovesci', en: 'Showers' };
  if (code <= 86) return { it: 'Neve', en: 'Snow' };
  return { it: 'Temporale', en: 'Thunderstorm' };
};

export default function WeatherAuditTable({ accoppiati, posizioneLocale }) {
  const [expanded, setExpanded] = useState(false);

  if (!accoppiati || accoppiati.length === 0) return null;

  const sorted = [...accoppiati].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <NeumorphicCard className="p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">Dati Giornalieri — Daily Historical Data</p>
            <p className="text-xs text-slate-500">{sorted.length} giorni · clicca per {expanded ? 'chiudere' : 'espandere'}</p>
          </div>
        </div>
        {expanded
          ? <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 text-slate-600 font-semibold">Data</th>
                  <th className="text-right py-2 px-2 text-slate-600 font-semibold">T. Media (°C)</th>
                  <th className="text-right py-2 px-2 text-slate-600 font-semibold">T. Min (°C)</th>
                  <th className="text-right py-2 px-2 text-slate-600 font-semibold">T. Max (°C)</th>
                  <th className="text-right py-2 px-2 text-slate-600 font-semibold">Pioggia (mm)</th>
                  <th className="text-left py-2 px-2 text-slate-600 font-semibold">Condizione / Condition</th>
                  <th className="text-right py-2 px-2 text-slate-600 font-semibold">Ricavi (€)</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const wmo = WMO_LABEL(row.codice_meteo);
                  return (
                    <tr key={row.data} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-2 text-slate-700 font-medium">{row.data}</td>
                      <td className="py-2 px-2 text-right text-slate-700">{row.temp_c?.toFixed(1) ?? '—'}</td>
                      <td className="py-2 px-2 text-right text-blue-600">{row.temp_min?.toFixed(1) ?? '—'}</td>
                      <td className="py-2 px-2 text-right text-red-600">{row.temp_max?.toFixed(1) ?? '—'}</td>
                      <td className="py-2 px-2 text-right text-slate-700">{row.precip_mm?.toFixed(1) ?? '0.0'}</td>
                      <td className="py-2 px-2 text-slate-700">
                        {WMO_EMOJI(row.codice_meteo)} {wmo.it} / {wmo.en}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-800 font-semibold">€{formatCurrency(row.ricavi)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Data Source Transparency */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600">Fonte dati meteo / Weather data source</p>
            <p><strong>API:</strong> Open-Meteo Archive API (open-source, gratuita)</p>
            <p><strong>Tipo dati:</strong> Dati giornalieri storici / Historical daily weather</p>
            <p><strong>Coordinate usate:</strong> {posizioneLocale.lat.toFixed(4)}, {posizioneLocale.lon.toFixed(4)} — {posizioneLocale.etichetta}</p>
            <p className="text-slate-400 pt-1">
              Nota: tutti i locali di Milano ricadono nella stessa cella della griglia meteo (~4 km), 
              quindi i dati meteorologici sono identici indipendentemente dal locale selezionato.
            </p>
          </div>
        </div>
      )}
    </NeumorphicCard>
  );
}