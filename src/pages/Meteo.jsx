import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  Calendar,
  MapPin,
  TrendingUp,
  Eye,
  Gauge } from
'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Meteo() {
  const [city, setCity] = useState('Milan');
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [error, setError] = useState(null);

  const fetchWeatherData = async () => {
    if (!city.trim()) {
      setError('Inserisci una città');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch forecast
      const forecastResponse = await base44.functions.invoke('getWeatherData', {
        city: city.trim(),
        type: 'forecast'
      });

      // Fetch historical data
      const historyResponse = await base44.functions.invoke('getWeatherData', {
        city: city.trim(),
        type: 'history',
        date: selectedDate
      });

      if (forecastResponse.data.error) {
        setError(forecastResponse.data.error);
        return;
      }

      setForecastData(forecastResponse.data);
      setHistoryData(historyResponse.data.error ? null : historyResponse.data);
    } catch (err) {
      setError('Errore nel recupero dei dati meteo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition) => {
    const text = condition?.toLowerCase() || '';
    if (text.includes('rain') || text.includes('pioggia')) return <CloudRain className="w-8 h-8" />;
    if (text.includes('cloud') || text.includes('nuvoloso')) return <Cloud className="w-8 h-8" />;
    return <Sun className="w-8 h-8" />;
  };

  const chartData = forecastData?.forecast?.forecastday?.map((day) => ({
    date: new Date(day.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
    max: day.day.maxtemp_c,
    min: day.day.mintemp_c,
    avg: day.day.avgtemp_c,
    rain: day.day.daily_chance_of_rain
  })) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Cloud className="w-10 h-10 text-blue-500" />
          <h1 className="bg-clip-text text-slate-50 text-3xl font-bold from-slate-700 to-slate-900">Meteo

          </h1>
        </div>
        <p className="text-slate-50">Dati meteo storici e previsionali per le tue città</p>
      </div>

      {/* Search Section */}
      <NeumorphicCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Città
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="es. Milan, Rome, London"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && fetchWeatherData()} />

          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Storico (ultimi 7 giorni)
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              min={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none" />

          </div>

          <div className="flex items-end">
            <NeumorphicButton
              onClick={fetchWeatherData}
              disabled={loading}
              variant="primary"
              className="w-full">

              {loading ? 'Caricamento...' : 'Cerca Meteo'}
            </NeumorphicButton>
          </div>
        </div>

        {error &&
        <div className="mt-4 p-4 rounded-xl bg-red-50 text-red-700">
            {error}
          </div>
        }
      </NeumorphicCard>

      {/* Current Weather */}
      {forecastData &&
      <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-blue-500" />
                {forecastData.location.name}, {forecastData.location.country}
              </h2>
              <p className="text-slate-500">
                {forecastData.location.localtime}
              </p>
            </div>
            <div className="text-blue-500">
              {getWeatherIcon(forecastData.current.condition.text)}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <Thermometer className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-slate-800">{forecastData.current.temp_c}°C</p>
              <p className="text-sm text-slate-500">Temperatura</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <Droplets className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-slate-800">{forecastData.current.humidity}%</p>
              <p className="text-sm text-slate-500">Umidità</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <Wind className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-slate-800">{forecastData.current.wind_kph} km/h</p>
              <p className="text-sm text-slate-500">Vento</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <Eye className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-slate-800">{forecastData.current.vis_km} km</p>
              <p className="text-sm text-slate-500">Visibilità</p>
            </div>
          </div>

          <div className="mt-4 neumorphic-flat p-4 rounded-xl">
            <p className="text-slate-700 text-center">
              <strong>{forecastData.current.condition.text}</strong> • Percepita: {forecastData.current.feelslike_c}°C
            </p>
          </div>
        </NeumorphicCard>
      }

      {/* Historical Data */}
      {historyData &&
      <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-500" />
            Dati Storici - {new Date(selectedDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <TrendingUp className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-800">{historyData.forecast.forecastday[0].day.maxtemp_c}°C</p>
              <p className="text-xs text-slate-500">Temp Max</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-2 transform rotate-180" />
              <p className="text-2xl font-bold text-slate-800">{historyData.forecast.forecastday[0].day.mintemp_c}°C</p>
              <p className="text-xs text-slate-500">Temp Min</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <Thermometer className="w-5 h-5 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-800">{historyData.forecast.forecastday[0].day.avgtemp_c}°C</p>
              <p className="text-xs text-slate-500">Temp Media</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <CloudRain className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-800">{historyData.forecast.forecastday[0].day.totalprecip_mm} mm</p>
              <p className="text-xs text-slate-500">Precipitazioni</p>
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl text-center">
              <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-800">{historyData.forecast.forecastday[0].day.avghumidity}%</p>
              <p className="text-xs text-slate-500">Umidità Media</p>
            </div>
          </div>
        </NeumorphicCard>
      }

      {/* Forecast Chart */}
      {forecastData && chartData.length > 0 &&
      <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-500" />
            Previsioni 7 Giorni
          </h2>

          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                contentStyle={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }} />

                <Legend />
                <Line type="monotone" dataKey="max" stroke="#ef4444" strokeWidth={2} name="Max °C" />
                <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={2} name="Media °C" />
                <Line type="monotone" dataKey="min" stroke="#3b82f6" strokeWidth={2} name="Min °C" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {forecastData.forecast.forecastday.map((day, index) =>
          <div key={index} className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm font-bold text-slate-700 mb-2">
                  {new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' })}
                </p>
                <div className="text-blue-500 mx-auto mb-2">
                  {getWeatherIcon(day.day.condition.text)}
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {Math.round(day.day.maxtemp_c)}° / {Math.round(day.day.mintemp_c)}°
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <CloudRain className="w-3 h-3 inline mr-1" />
                  {day.day.daily_chance_of_rain}%
                </p>
              </div>
          )}
          </div>
        </NeumorphicCard>
      }

      {/* Info Box */}
      {!forecastData && !loading &&
      <NeumorphicCard className="p-12 text-center">
          <Cloud className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            Cerca una città
          </h3>
          <p className="text-slate-500">
            Inserisci il nome di una città e seleziona una data per visualizzare i dati meteo
          </p>
        </NeumorphicCard>
      }
    </div>);

}