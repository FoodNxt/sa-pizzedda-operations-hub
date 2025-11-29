import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { ChefHat, Calendar, Store, User, TrendingUp, BarChart3 } from "lucide-react";
import moment from "moment";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function StoricoImpasti() {
  const [selectedStore, setSelectedStore] = useState('');
  const [dateRange, setDateRange] = useState('week');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['calcolo-impasto-logs'],
    queryFn: () => base44.entities.CalcoloImpastoLog.list('-data_calcolo', 500),
  });

  const getDateFilter = () => {
    const now = moment();
    if (dateRange === 'today') return now.startOf('day');
    if (dateRange === 'week') return now.subtract(7, 'days');
    if (dateRange === 'month') return now.subtract(30, 'days');
    return null;
  };

  const filteredLogs = logs.filter(log => {
    if (selectedStore && log.store_id !== selectedStore) return false;
    const dateFilter = getDateFilter();
    if (dateFilter && moment(log.data_calcolo).isBefore(dateFilter)) return false;
    return true;
  });

  const stats = {
    totaleCalcoli: filteredLogs.length,
    mediaBarelle: filteredLogs.length > 0 
      ? (filteredLogs.reduce((sum, l) => sum + (l.barelle_in_frigo || 0), 0) / filteredLogs.length).toFixed(1)
      : 0,
    mediaImpasto: filteredLogs.length > 0
      ? (filteredLogs.reduce((sum, l) => sum + (l.impasto_suggerito || 0), 0) / filteredLogs.length).toFixed(0)
      : 0,
    totaleImpasto: filteredLogs.reduce((sum, l) => sum + (l.impasto_suggerito || 0), 0)
  };

  // Trend data - grouped by date
  const trendData = useMemo(() => {
    const grouped = {};
    filteredLogs.forEach(log => {
      const date = moment(log.data_calcolo).format('DD/MM');
      if (!grouped[date]) {
        grouped[date] = { barelle: [], impasto: [] };
      }
      grouped[date].barelle.push(log.barelle_in_frigo || 0);
      grouped[date].impasto.push(log.impasto_suggerito || 0);
    });

    return Object.entries(grouped)
      .map(([date, values]) => ({
        data: date,
        mediaBarelle: values.barelle.length > 0 
          ? parseFloat((values.barelle.reduce((a, b) => a + b, 0) / values.barelle.length).toFixed(1))
          : 0,
        mediaImpasto: values.impasto.length > 0 
          ? Math.round(values.impasto.reduce((a, b) => a + b, 0) / values.impasto.length)
          : 0
      }))
      .sort((a, b) => {
        const [dayA, monthA] = a.data.split('/').map(Number);
        const [dayB, monthB] = b.data.split('/').map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
      });
  }, [filteredLogs]);

  // Data by day of week
  const dayOfWeekData = useMemo(() => {
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const grouped = {};
    giorni.forEach((g, idx) => {
      grouped[idx] = { barelle: [], impasto: [] };
    });

    filteredLogs.forEach(log => {
      const dayIndex = moment(log.data_calcolo).day();
      grouped[dayIndex].barelle.push(log.barelle_in_frigo || 0);
      grouped[dayIndex].impasto.push(log.impasto_suggerito || 0);
    });

    return giorni.map((giorno, idx) => ({
      giorno: giorno.slice(0, 3),
      mediaBarelle: grouped[idx].barelle.length > 0
        ? parseFloat((grouped[idx].barelle.reduce((a, b) => a + b, 0) / grouped[idx].barelle.length).toFixed(1))
        : 0,
      mediaImpasto: grouped[idx].impasto.length > 0
        ? Math.round(grouped[idx].impasto.reduce((a, b) => a + b, 0) / grouped[idx].impasto.length)
        : 0
    }));
  }, [filteredLogs]);

  return (
    <ProtectedPage pageName="StoricoImpasti">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Storico Impasti
          </h1>
          <p className="text-slate-500 mt-1">Visualizza lo storico dei calcoli impasto</p>
        </div>

        {/* Filtri */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Store className="w-4 h-4 inline mr-1" />
                Negozio
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Tutti i negozi</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Periodo
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'today', label: 'Oggi' },
                  { value: 'week', label: '7 giorni' },
                  { value: 'month', label: '30 giorni' },
                  { value: 'all', label: 'Tutto' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDateRange(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      dateRange === opt.value
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'neumorphic-flat text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NeumorphicCard className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totaleCalcoli}</p>
            <p className="text-xs text-slate-500">Calcoli effettuati</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 mx-auto mb-2 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.mediaBarelle}</p>
            <p className="text-xs text-slate-500">Media barelle</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 mx-auto mb-2 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.mediaImpasto}</p>
            <p className="text-xs text-slate-500">Media impasto</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-2 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totaleImpasto}</p>
            <p className="text-xs text-slate-500">Totale palline</p>
          </NeumorphicCard>
        </div>

        {/* Lista */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Storico Calcoli</h2>
          
          {filteredLogs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nessun calcolo trovato</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-2 text-slate-700">Data/Ora</th>
                    <th className="text-left py-3 px-2 text-slate-700">Negozio</th>
                    <th className="text-left py-3 px-2 text-slate-700">Operatore</th>
                    <th className="text-right py-3 px-2 text-slate-700">Barelle in Frigo</th>
                    <th className="text-right py-3 px-2 text-slate-700">Palline Presenti</th>
                    <th className="text-right py-3 px-2 text-slate-700">Fabbisogno 3gg</th>
                    <th className="text-right py-3 px-2 text-slate-700 bg-green-50">Impasto Suggerito</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-2 text-slate-700">
                        {moment(log.data_calcolo).format('DD/MM/YYYY HH:mm')}
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-800">{log.store_name}</td>
                      <td className="py-3 px-2 text-slate-600">
                        <User className="w-3 h-3 inline mr-1" />
                        {log.operatore || '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-700">{log.barelle_in_frigo}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{log.palline_presenti}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{log.fabbisogno_3_giorni}</td>
                      <td className="py-3 px-2 text-right font-bold text-green-700 bg-green-50">
                        {log.impasto_suggerito}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}