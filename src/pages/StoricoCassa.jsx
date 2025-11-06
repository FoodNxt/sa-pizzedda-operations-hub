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
        if (isBefore(itemDate, cutoffDate) || isAfter(itemDate, endFilterDate)) {
          return false;
        }
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
        date: format(new Date(d.date), 'dd/MM'),
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

  const clearCustomDates = () => {
    setStartDate('');
    setEndDate('');
    setDateRange('30');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <DollarSign className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Storico Conteggi Cassa</h1>
        </div>
        <p className="text-[#9b9b9b]">Analisi storica dei conteggi cassa</p>
      </div>

      {/* Filters */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Filtri</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Locale</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="all">Tutti i Locali</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Periodo</label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                if (e.target.value !== 'custom') {
                  setStartDate('');
                  setEndDate('');
                }
              }}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 90 giorni</option>
              <option value="365">Ultimo anno</option>
              <option value="custom">Periodo Personalizzato</option>
            </select>
          </div>
        </div>

        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#c1c1c1]">
            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Inizio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-[#9b9b9b] mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Fine
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={clearCustomDates}
                    className="neumorphic-flat px-3 rounded-xl text-[#9b9b9b] hover:text-red-600 transition-colors"
                    title="Cancella date"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">
            €{stats.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Totale</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            €{stats.media.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Media</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">
            {stats.count}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Conteggi</p>
        </NeumorphicCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Trend Giornaliero</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
              <XAxis dataKey="date" stroke="#9b9b9b" />
              <YAxis stroke="#9b9b9b" />
              <Tooltip 
                contentStyle={{ 
                  background: '#e0e5ec', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                }}
                formatter={(value) => `€${value.toFixed(2)}`}
              />
              <Legend />
              <Line type="monotone" dataKey="valore" stroke="#8b7355" strokeWidth={3} name="Valore €" />
            </LineChart>
          </ResponsiveContainer>
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Per Locale</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.storeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c1c1c1" />
              <XAxis dataKey="name" stroke="#9b9b9b" />
              <YAxis stroke="#9b9b9b" />
              <Tooltip 
                contentStyle={{ 
                  background: '#e0e5ec', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 8px #b8bec8, -4px -4px 8px #ffffff'
                }}
                formatter={(value, name) => {
                  if (name === 'Valore €') return `€${value.toFixed(2)}`;
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="valore" fill="#8b7355" name="Valore €" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeumorphicCard>
      </div>

      {/* Table */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Dettaglio Conteggi</h2>
        
        {filteredConteggi.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Data e Ora</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Rilevato da</th>
                  <th className="text-right p-3 text-[#9b9b9b] font-medium">Importo</th>
                </tr>
              </thead>
              <tbody>
                {filteredConteggi.map((conteggio) => (
                  <tr key={conteggio.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                        <span className="text-[#6b6b6b]">
                          {format(new Date(conteggio.data_conteggio), 'dd/MM/yyyy HH:mm', { locale: it })}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#9b9b9b]" />
                        <span className="text-[#6b6b6b]">{conteggio.store_name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#9b9b9b]" />
                        <span className="text-[#6b6b6b] text-sm">{conteggio.rilevato_da}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-[#8b7355] font-bold text-lg">
                        €{conteggio.valore_conteggio.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-[#9b9b9b] opacity-50 mx-auto mb-4" />
            <p className="text-[#9b9b9b]">Nessun conteggio nel periodo selezionato</p>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}