import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Clock, DollarSign, Calendar } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import ProtectedPage from "../components/ProtectedPage";

export default function Produttivita() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: revenueData = [] } = useQuery({
    queryKey: ['revenue-by-time-slot'],
    queryFn: () => base44.entities.RevenueByTimeSlot.list('-date', 1000),
  });

  const filteredData = useMemo(() => {
    let filtered = revenueData;

    if (selectedStore !== 'all') {
      filtered = filtered.filter(r => r.store_id === selectedStore);
    }

    const now = new Date();
    if (dateRange === 'month') {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      filtered = filtered.filter(r => {
        const date = parseISO(r.date);
        return date >= monthStart && date <= monthEnd;
      });
    }

    return filtered;
  }, [revenueData, selectedStore, dateRange]);

  // Aggregate by hour
  const hourlyData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const hourAggregation = {};
    
    filteredData.forEach(record => {
      Object.entries(record.slots || {}).forEach(([slot, revenue]) => {
        const hour = slot.split(':')[0] + ':00';
        if (!hourAggregation[hour]) {
          hourAggregation[hour] = { hour, revenue: 0, count: 0 };
        }
        hourAggregation[hour].revenue += revenue || 0;
        hourAggregation[hour].count += 1;
      });
    });

    return Object.values(hourAggregation)
      .map(h => ({
        hour: h.hour,
        avgRevenue: h.revenue / h.count
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [filteredData]);

  // Daily data for selected date
  const dailySlotData = useMemo(() => {
    const dayData = filteredData.find(r => r.date === selectedDate);
    if (!dayData || !dayData.slots) return [];

    return Object.entries(dayData.slots)
      .map(([slot, revenue]) => ({ slot, revenue }))
      .sort((a, b) => a.slot.localeCompare(b.slot));
  }, [filteredData, selectedDate]);

  const stats = {
    totalRevenue: filteredData.reduce((sum, r) => sum + (r.total_revenue || 0), 0),
    avgDailyRevenue: filteredData.length > 0 ? filteredData.reduce((sum, r) => sum + (r.total_revenue || 0), 0) / filteredData.length : 0,
    daysTracked: filteredData.length,
    peakHour: hourlyData.length > 0 ? hourlyData.reduce((max, h) => h.avgRevenue > max.avgRevenue ? h : max, hourlyData[0]).hour : '-'
  };

  return (
    <ProtectedPage pageName="Produttivita" requiredUserTypes={['admin', 'manager']}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📊 Produttività</h1>
          <p className="text-[#9b9b9b]">Analisi revenue per slot orari</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <NeumorphicCard className="p-6 text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">€{stats.totalRevenue.toFixed(2)}</h3>
            <p className="text-sm text-[#9b9b9b]">Revenue Totale</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">€{stats.avgDailyRevenue.toFixed(2)}</h3>
            <p className="text-sm text-[#9b9b9b]">Media Giornaliera</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-[#8b7355]" />
            </div>
            <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.daysTracked}</h3>
            <p className="text-sm text-[#9b9b9b]">Giorni Tracciati</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.peakHour}</h3>
            <p className="text-sm text-[#9b9b9b]">Ora di Punta</p>
          </NeumorphicCard>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Negozio</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="all">Tutti i negozi</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Periodo</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="month">Questo mese</option>
                <option value="all">Tutti i periodi</option>
              </select>
            </div>
          </div>
        </NeumorphicCard>

        {/* Hourly Average Chart */}
        <NeumorphicCard className="p-6">
          <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Revenue Media per Ora</h3>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="avgRevenue" fill="#3b82f6" name="Revenue Media" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          )}
        </NeumorphicCard>

        {/* Daily Slot View */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#6b6b6b]">Dettaglio Slot - Singolo Giorno</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
            />
          </div>
          {dailySlotData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dailySlotData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="slot" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={1}
                />
                <YAxis />
                <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8b7355" strokeWidth={2} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato per questa data</p>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}