import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  Store,
  AlertTriangle,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';

export default function AnalisiSprechi() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: teglieButtate = [] } = useQuery({
    queryKey: ['teglie-buttate'],
    queryFn: () => base44.entities.TeglieButtate.list('-data_rilevazione', 1000),
  });

  const filteredData = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    if (startDate || endDate) {
      cutoffDate = startDate ? parseISO(startDate + 'T00:00:00') : new Date(0);
      endFilterDate = endDate ? parseISO(endDate + 'T23:59:59') : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }
    
    return teglieButtate.filter(item => {
      if (!item.data_rilevazione) return false;
      
      const itemDate = parseISO(item.data_rilevazione);
      
      if (isBefore(itemDate, cutoffDate) || isAfter(itemDate, endFilterDate)) return false;
      if (selectedStore !== 'all' && item.store_id !== selectedStore) return false;
      
      return true;
    });
  }, [teglieButtate, selectedStore, dateRange, startDate, endDate]);

  const stats = useMemo(() => {
    const totalRosse = filteredData.reduce((sum, t) => sum + (t.teglie_rosse_buttate || 0), 0);
    const totalBianche = filteredData.reduce((sum, t) => sum + (t.teglie_bianche_buttate || 0), 0);
    const totalTeglie = totalRosse + totalBianche;

    const mediaRosse = filteredData.length > 0 ? totalRosse / filteredData.length : 0;
    const mediaBianche = filteredData.length > 0 ? totalBianche / filteredData.length : 0;

    const byDate = {};
    filteredData.forEach(t => {
      const date = t.data_rilevazione.split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { date, rosse: 0, bianche: 0, totali: 0 };
      }
      byDate[date].rosse += t.teglie_rosse_buttate || 0;
      byDate[date].bianche += t.teglie_bianche_buttate || 0;
      byDate[date].totali += (t.teglie_rosse_buttate || 0) + (t.teglie_bianche_buttate || 0);
    });

    const dailyData = Object.values(byDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => ({
        date: format(parseISO(d.date), 'dd/MM'),
        rosse: d.rosse,
        bianche: d.bianche,
        totali: d.totali
      }));

    const byStore = {};
    filteredData.forEach(t => {
      if (!byStore[t.store_name]) {
        byStore[t.store_name] = { name: t.store_name, rosse: 0, bianche: 0, totali: 0, count: 0 };
      }
      byStore[t.store_name].rosse += t.teglie_rosse_buttate || 0;
      byStore[t.store_name].bianche += t.teglie_bianche_buttate || 0;
      byStore[t.store_name].totali += (t.teglie_rosse_buttate || 0) + (t.teglie_bianche_buttate || 0);
      byStore[t.store_name].count += 1;
    });

    const storeData = Object.values(byStore)
      .sort((a, b) => b.totali - a.totali)
      .map(s => ({
        name: s.name,
        rosse: s.rosse,
        bianche: s.bianche,
        totali: s.totali,
        mediaGiornaliera: s.count > 0 ? (s.totali / s.count).toFixed(1) : 0
      }));

    return {
      totalRosse,
      totalBianche,
      totalTeglie,
      mediaRosse: mediaRosse.toFixed(1),
      mediaBianche: mediaBianche.toFixed(1),
      dailyData,
      storeData,
      count: filteredData.length
    };
  }, [filteredData]);

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30');
  };

  return (
    <ProtectedPage pageName="AnalisiSprechi">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Analisi Sprechi
          </h1>
          <p className="text-sm text-slate-500">Analizza i dati delle teglie buttate per ridurre gli sprechi</p>
        </div>

        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Locale</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="all">Tutti i Locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-2 block">Periodo</label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  if (e.target.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="7">Ultimi 7 giorni</option>
                <option value="30">Ultimi 30 giorni</option>
                <option value="90">Ultimi 90 giorni</option>
                <option value="365">Ultimo anno</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Inizio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Fine</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </NeumorphicCard>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <Trash2 className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-red-600 mb-1">{stats.totalRosse}</h3>
              <p className="text-xs text-slate-500">Teglie Rosse</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-gray-500 to-gray-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <Trash2 className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-gray-600 mb-1">{stats.totalBianche}</h3>
              <p className="text-xs text-slate-500">Teglie Bianche</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <Trash2 className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-orange-600 mb-1">{stats.totalTeglie}</h3>
              <p className="text-xs text-slate-500">Totali</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-blue-600 mb-1">{stats.count}</h3>
              <p className="text-xs text-slate-500">Rilevazioni</p>
            </div>
          </NeumorphicCard>
        </div>

        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Trend Giornaliero</h2>
          {stats.dailyData.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: '300px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      width={50}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(248, 250, 252, 0.95)', 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="rosse" 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      name="Rosse"
                      dot={{ fill: '#ef4444', r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bianche" 
                      stroke="#6b7280" 
                      strokeWidth={2} 
                      name="Bianche"
                      dot={{ fill: '#6b7280', r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totali" 
                      stroke="#f97316" 
                      strokeWidth={3} 
                      name="Totali"
                      dot={{ fill: '#f97316', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Nessun dato disponibile per il periodo selezionato
            </div>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Confronto per Locale</h2>
          {stats.storeData.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: '300px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.storeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      width={50}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(248, 250, 252, 0.95)', 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="rosse" fill="#ef4444" name="Rosse" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="bianche" fill="#6b7280" name="Bianche" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Nessun dato disponibile
            </div>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Dettaglio per Locale</h2>
          {stats.storeData.length > 0 ? (
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Locale</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Rosse</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Bianche</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Totali</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Media/Giorno</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.storeData.map((store, index) => (
                    <tr key={index} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-2 lg:p-3 text-slate-700 font-medium text-sm">{store.name}</td>
                      <td className="p-2 lg:p-3 text-right text-red-600 font-bold text-sm">{store.rosse}</td>
                      <td className="p-2 lg:p-3 text-right text-gray-600 font-bold text-sm">{store.bianche}</td>
                      <td className="p-2 lg:p-3 text-right text-orange-600 font-bold text-sm lg:text-base">{store.totali}</td>
                      <td className="p-2 lg:p-3 text-right text-blue-600 font-medium text-sm">{store.mediaGiornaliera}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Trash2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessun dato disponibile</p>
            </div>
          )}
        </NeumorphicCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <NeumorphicCard className="p-4 lg:p-6">
            <h3 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Media Giornaliera</h3>
            <div className="space-y-4">
              <div className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Teglie Rosse</span>
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-red-600">{stats.mediaRosse}</p>
                <p className="text-xs text-slate-500 mt-1">al giorno</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Teglie Bianche</span>
                  <Trash2 className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-3xl font-bold text-gray-600">{stats.mediaBianche}</p>
                <p className="text-xs text-slate-500 mt-1">al giorno</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4 lg:p-6 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="text-sm text-amber-800">
                <p className="font-bold mb-2">💡 Insights</p>
                <ul className="space-y-2 text-xs lg:text-sm">
                  <li>• Le teglie buttate rappresentano uno spreco di prodotto e costi</li>
                  <li>• Monitora i trend per locale per identificare pattern</li>
                  <li>• Una media elevata potrebbe indicare sovraproduzione</li>
                  <li>• Considera di ottimizzare le quantità prodotte in base ai dati storici</li>
                </ul>
              </div>
            </div>
          </NeumorphicCard>
        </div>
      </div>
    </ProtectedPage>
  );
}