import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Store,
  User,
  Calendar,
  TrendingUp,
  Filter,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StoricoCassa() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: conteggi = [] } = useQuery({
    queryKey: ['conteggi-cassa'],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio', 500),
  });

  const filteredConteggi = useMemo(() => {
    let cutoffDate;
    let endFilterDate;
    
    if (startDate || endDate) {
      cutoffDate = startDate ? parseISO(startDate) : new Date(0);
      endFilterDate = endDate ? parseISO(endDate) : new Date();
    } else {
      const days = parseInt(dateRange);
      cutoffDate = subDays(new Date(), days);
      endFilterDate = new Date();
    }
    
    return conteggi.filter(c => {
      if (c.data_conteggio) {
        const itemDate = parseISO(c.data_conteggio);
        if (isBefore(itemDate, cutoffDate) || isAfter(itemDate, endFilterDate)) return false;
      }
      if (selectedStore !== 'all' && c.store_id !== selectedStore) return false;
      return true;
    });
  }, [conteggi, selectedStore, dateRange, startDate, endDate]);

  const stats = useMemo(() => {
    const totale = filteredConteggi.reduce((sum, c) => sum + (c.valore_conteggio || 0), 0);
    const media = filteredConteggi.length > 0 ? totale / filteredConteggi.length : 0;
    
    const byDate = {};
    filteredConteggi.forEach(c => {
      const date = c.data_conteggio.split('T')[0];
      if (!byDate[date]) byDate[date] = { date, value: 0, count: 0 };
      byDate[date].value += c.valore_conteggio || 0;
      byDate[date].count += 1;
    });

    const dailyData = Object.values(byDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => ({
        date: format(parseISO(d.date), 'dd/MM'),
        valore: parseFloat(d.value.toFixed(2)),
        conteggi: d.count
      }));

    const byStore = {};
    filteredConteggi.forEach(c => {
      if (!byStore[c.store_name]) byStore[c.store_name] = { name: c.store_name, value: 0, count: 0 };
      byStore[c.store_name].value += c.valore_conteggio || 0;
      byStore[c.store_name].count += 1;
    });

    const storeData = Object.values(byStore)
      .sort((a, b) => b.value - a.value)
      .map(s => ({
        name: s.name,
        valore: parseFloat(s.value.toFixed(2)),
        conteggi: s.count
      }));

    return { totale, media, dailyData, storeData, count: filteredConteggi.length };
  }, [filteredConteggi]);

  return (
    <ProtectedPage pageName="StoricoCassa">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Storico Conteggi Cassa
          </h1>
          <p className="text-sm text-slate-500">Analisi storica dei conteggi cassa</p>
        </div>

        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Locale</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
              >
                <option value="all">Tutti</option>
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
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="neumorphic-pressed px-3 py-2.5 rounded-xl text-slate-700 outline-none text-sm"
                />
              </>
            )}
          </div>
        </NeumorphicCard>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-2 lg:mb-3 shadow-lg">
                <DollarSign className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                €{stats.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500">Totale</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2 lg:mb-3 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-blue-600 mb-1">
                €{stats.media.toFixed(2)}
              </h3>
              <p className="text-xs text-slate-500">Media</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-2 lg:mb-3 shadow-lg">
                <Calendar className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-purple-600 mb-1">
                {stats.count}
              </h3>
              <p className="text-xs text-slate-500">Conteggi</p>
            </div>
          </NeumorphicCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Trend Giornaliero</h2>
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: '300px' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(248, 250, 252, 0.95)', 
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '11px'
                      }}
                      formatter={(value) => `€${value.toFixed(2)}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="valore" stroke="#3b82f6" strokeWidth={3} name="Valore €" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4 lg:p-6">
            <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Per Locale</h2>
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: '300px' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.storeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(248, 250, 252, 0.95)', 
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '11px'
                      }}
                      formatter={(value, name) => {
                        if (name === 'Valore €') return `€${value.toFixed(2)}`;
                        return value;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="valore" fill="#3b82f6" name="Valore €" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </NeumorphicCard>
        </div>

        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Ultimo Conteggio per Locale</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stores.map(store => {
              const storeConteggi = conteggi
                .filter(c => c.store_id === store.id)
                .sort((a, b) => new Date(b.data_conteggio) - new Date(a.data_conteggio));
              
              const lastConteggio = storeConteggi[0];
              
              return (
                <div key={store.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">{store.name}</h3>
                  </div>
                  
                  {lastConteggio ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Ultimo:</span>
                        <span className="text-lg font-bold text-blue-600">
                          €{lastConteggio.valore_conteggio.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {format(parseISO(lastConteggio.data_conteggio), 'dd/MM HH:mm', { locale: it })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600">{lastConteggio.rilevato_da}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Nessun conteggio</p>
                  )}
                </div>
              );
            })}
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">Dettaglio</h2>
          
          {filteredConteggi.length > 0 ? (
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Data</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Locale</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Rilevato da</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConteggi.map((conteggio) => (
                    <tr key={conteggio.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">
                            {format(parseISO(conteggio.data_conteggio), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">{conteggio.store_name}</span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">{conteggio.rilevato_da}</span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3 text-right">
                        <span className="text-blue-600 font-bold text-sm lg:text-base">
                          €{conteggio.valore_conteggio.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessun conteggio</p>
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}