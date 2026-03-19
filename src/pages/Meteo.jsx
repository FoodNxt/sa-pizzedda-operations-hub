import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Cloud, Droplets, Wind, Thermometer, Sun, CloudRain, Eye, RefreshCw } from "lucide-react";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";

const CITY = "Milano";

export default function Meteo() {
  const [forecastDays, setForecastDays] = useState(3);

  const { data: weather, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["meteo-milano", forecastDays],
    queryFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Get the current weather and ${forecastDays}-day forecast for ${CITY}, Italy. Include: current temperature (°C), feels like, humidity %, wind speed (km/h), condition description, UV index, and for each forecast day: date, max temp, min temp, condition, chance of rain %. Return ONLY factual weather data, no commentary.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            current: {
              type: "object",
              properties: {
                temp_c: { type: "number" },
                feels_like_c: { type: "number" },
                humidity: { type: "number" },
                wind_kph: { type: "number" },
                condition: { type: "string" },
                uv: { type: "number" }
              }
            },
            forecast: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  max_temp_c: { type: "number" },
                  min_temp_c: { type: "number" },
                  condition: { type: "string" },
                  chance_of_rain: { type: "number" }
                }
              }
            }
          }
        }
      });
      return result;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  const getWeatherIcon = (condition) => {
    if (!condition) return <Cloud className="w-8 h-8 text-slate-400" />;
    const c = condition.toLowerCase();
    if (c.includes("rain") || c.includes("pioggia") || c.includes("shower")) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (c.includes("sun") || c.includes("clear") || c.includes("sole") || c.includes("sereno")) return <Sun className="w-8 h-8 text-yellow-500" />;
    return <Cloud className="w-8 h-8 text-slate-400" />;
  };

  const getSmallWeatherIcon = (condition) => {
    if (!condition) return <Cloud className="w-5 h-5 text-slate-400" />;
    const c = condition.toLowerCase();
    if (c.includes("rain") || c.includes("pioggia") || c.includes("shower")) return <CloudRain className="w-5 h-5 text-blue-500" />;
    if (c.includes("sun") || c.includes("clear") || c.includes("sole") || c.includes("sereno")) return <Sun className="w-5 h-5 text-yellow-500" />;
    return <Cloud className="w-5 h-5 text-slate-400" />;
  };

  return (
    <ProtectedPage pageName="Meteo">
      <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl" style={{ color: "#000000" }}>
              Meteo {CITY}
            </h1>
            <p className="text-sm" style={{ color: "#000000" }}>Previsioni meteo per i locali</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="neumorphic-card p-3 rounded-xl hover:shadow-lg transition-all"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-500">Caricamento meteo...</p>
          </div>
        )}

        {error && (
          <NeumorphicCard className="p-6 text-center">
            <p className="text-red-600 font-medium">Errore nel caricamento meteo</p>
            <p className="text-sm text-slate-500 mt-2">{error.message}</p>
            <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
              Riprova
            </button>
          </NeumorphicCard>
        )}

        {weather && !isLoading && (
          <>
            {/* Current Weather */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
                  {getWeatherIcon(weather.current?.condition)}
                </div>
                <div>
                  <p className="text-4xl font-bold text-slate-800">{weather.current?.temp_c?.toFixed(1)}°C</p>
                  <p className="text-sm text-slate-500 capitalize">{weather.current?.condition}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="neumorphic-pressed p-3 rounded-xl text-center">
                  <Thermometer className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                  <p className="text-xs text-slate-500">Percepita</p>
                  <p className="text-lg font-bold text-slate-800">{weather.current?.feels_like_c?.toFixed(1)}°C</p>
                </div>
                <div className="neumorphic-pressed p-3 rounded-xl text-center">
                  <Droplets className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs text-slate-500">Umidità</p>
                  <p className="text-lg font-bold text-slate-800">{weather.current?.humidity}%</p>
                </div>
                <div className="neumorphic-pressed p-3 rounded-xl text-center">
                  <Wind className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <p className="text-xs text-slate-500">Vento</p>
                  <p className="text-lg font-bold text-slate-800">{weather.current?.wind_kph?.toFixed(0)} km/h</p>
                </div>
                <div className="neumorphic-pressed p-3 rounded-xl text-center">
                  <Sun className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                  <p className="text-xs text-slate-500">UV</p>
                  <p className="text-lg font-bold text-slate-800">{weather.current?.uv}</p>
                </div>
              </div>
            </NeumorphicCard>

            {/* Forecast */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Previsioni</h3>
                <div className="flex gap-1">
                  {[3, 5, 7].map((d) => (
                    <button
                      key={d}
                      onClick={() => setForecastDays(d)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        forecastDays === d
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                          : "neumorphic-pressed text-slate-600"
                      }`}
                    >
                      {d}gg
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {weather.forecast?.map((day, idx) => (
                  <div key={idx} className="neumorphic-pressed p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getSmallWeatherIcon(day.condition)}
                      <div>
                        <p className="text-sm font-medium text-slate-800">{day.date}</p>
                        <p className="text-xs text-slate-500 capitalize">{day.condition}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {day.chance_of_rain > 0 && (
                        <div className="flex items-center gap-1">
                          <Droplets className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-blue-600">{day.chance_of_rain}%</span>
                        </div>
                      )}
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-800">{day.max_temp_c?.toFixed(0)}°</span>
                        <span className="text-sm text-slate-400 ml-1">{day.min_temp_c?.toFixed(0)}°</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </NeumorphicCard>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}