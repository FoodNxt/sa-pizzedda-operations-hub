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
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeSlotView, setTimeSlotView] = useState('30min'); // '30min' or '1hour'
  const [showRevenue, setShowRevenue] = useState(true);
  const [showHours, setShowHours] = useState(true);
  const [showRevenuePerHour, setShowRevenuePerHour] = useState(true);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: revenueData = [] } = useQuery({
    queryKey: ['revenue-by-time-slot'],
    queryFn: () => base44.entities.RevenueByTimeSlot.list('-date', 1000),
  });

  const { data: allShifts = [] } = useQuery({
    queryKey: ['planday-shifts'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 2000),
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
    } else if (dateRange === 'custom') {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      filtered = filtered.filter(r => {
        const date = parseISO(r.date);
        return date >= start && date <= end;
      });
    }

    return filtered;
  }, [revenueData, selectedStore, dateRange, startDate, endDate]);

  // Calculate hours worked by time slot
  const hoursWorkedBySlot = useMemo(() => {
    const slotHours = {};

    allShifts.forEach(shift => {
      if (!shift.ora_inizio || !shift.ora_fine) return;
      if (selectedStore !== 'all' && shift.store_id !== selectedStore) return;

      const shiftDate = shift.data;
      const startTime = shift.ora_inizio; // e.g. "09:00"
      const endTime = shift.ora_fine; // e.g. "17:00"

      // Generate all 30-min slots for this shift
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      let currentMin = startHour * 60 + startMin;
      const endMinTotal = endHour * 60 + endMin;

      while (currentMin < endMinTotal) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}-${String(Math.floor((currentMin + 30) / 60)).padStart(2, '0')}:${String((currentMin + 30) % 60).padStart(2, '0')}`;
        
        if (!slotHours[slot]) {
          slotHours[slot] = 0;
        }
        slotHours[slot] += 0.5; // 30 minutes = 0.5 hours
        
        currentMin += 30;
      }
    });

    return slotHours;
  }, [allShifts, selectedStore]);

  // Aggregate by time slot (30min or 1hour)
  const aggregatedData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const aggregation = {};
    
    filteredData.forEach(record => {
      Object.entries(record.slots || {}).forEach(([slot, revenue]) => {
        let key;
        if (timeSlotView === '1hour') {
          const hour = slot.split(':')[0] + ':00';
          key = hour;
        } else {
          key = slot;
        }

        if (!aggregation[key]) {
          aggregation[key] = { slot: key, revenue: 0, hours: 0, count: 0 };
        }
        aggregation[key].revenue += revenue || 0;
        aggregation[key].hours += hoursWorkedBySlot[slot] || 0;
        aggregation[key].count += 1;
      });
    });

    return Object.values(aggregation)
      .map(item => ({
        slot: item.slot,
        avgRevenue: item.revenue / item.count,
        avgHours: item.hours / item.count,
        revenuePerHour: item.hours > 0 ? item.revenue / item.hours : 0
      }))
      .sort((a, b) => a.slot.localeCompare(b.slot));
  }, [filteredData, timeSlotView, hoursWorkedBySlot]);

  // Daily data for selected date
  const dailySlotData = useMemo(() => {
    const dayData = filteredData.find(r => r.date === selectedDate);
    if (!dayData || !dayData.slots) return [];

    // Get shifts for this specific date
    const dayShifts = allShifts.filter(s => s.data === selectedDate);
    const dayHoursSlot = {};

    dayShifts.forEach(shift => {
      if (!shift.ora_inizio || !shift.ora_fine) return;
      if (selectedStore !== 'all' && shift.store_id !== selectedStore) return;

      const [startHour, startMin] = shift.ora_inizio.split(':').map(Number);
      const [endHour, endMin] = shift.ora_fine.split(':').map(Number);
      
      let currentMin = startHour * 60 + startMin;
      const endMinTotal = endHour * 60 + endMin;

      while (currentMin < endMinTotal) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}-${String(Math.floor((currentMin + 30) / 60)).padStart(2, '0')}:${String((currentMin + 30) % 60).padStart(2, '0')}`;
        
        if (!dayHoursSlot[slot]) {
          dayHoursSlot[slot] = 0;
        }
        dayHoursSlot[slot] += 0.5;
        
        currentMin += 30;
      }
    });

    const data = Object.entries(dayData.slots)
      .map(([slot, revenue]) => ({ 
        slot, 
        revenue,
        hours: dayHoursSlot[slot] || 0,
        revenuePerHour: (dayHoursSlot[slot] || 0) > 0 ? revenue / (dayHoursSlot[slot] || 0) : 0
      }))
      .sort((a, b) => a.slot.localeCompare(b.slot));

    // Aggregate by view type
    if (timeSlotView === '1hour') {
      const hourlyAgg = {};
      data.forEach(item => {
        const hour = item.slot.split(':')[0] + ':00';
        if (!hourlyAgg[hour]) {
          hourlyAgg[hour] = { slot: hour, revenue: 0, hours: 0 };
        }
        hourlyAgg[hour].revenue += item.revenue;
        hourlyAgg[hour].hours += item.hours;
      });
      return Object.values(hourlyAgg)
        .map(item => ({
          ...item,
          revenuePerHour: item.hours > 0 ? item.revenue / item.hours : 0
        }))
        .sort((a, b) => a.slot.localeCompare(b.slot));
    }

    return data;
  }, [filteredData, selectedDate, allShifts, selectedStore, timeSlotView]);

  const stats = {
    totalRevenue: filteredData.reduce((sum, r) => sum + (r.total_revenue || 0), 0),
    avgDailyRevenue: filteredData.length > 0 ? filteredData.reduce((sum, r) => sum + (r.total_revenue || 0), 0) / filteredData.length : 0,
    daysTracked: filteredData.length,
    totalHours: Object.values(hoursWorkedBySlot).reduce((sum, h) => sum + h, 0),
    peakHour: aggregatedData.length > 0 ? aggregatedData.reduce((max, h) => h.avgRevenue > max.avgRevenue ? h : max, aggregatedData[0]).slot : '-'
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
            <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.totalHours.toFixed(1)}h</h3>
            <p className="text-sm text-[#9b9b9b]">Ore Lavorate Totali</p>
          </NeumorphicCard>
        </div>

        {/* View Toggle */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#6b6b6b] mb-1">Vista Temporale</h3>
              <p className="text-sm text-[#9b9b9b]">Seleziona la granularità dei dati</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeSlotView('30min')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  timeSlotView === '30min'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'neumorphic-flat text-[#6b6b6b]'
                }`}
              >
                30 minuti
              </button>
              <button
                onClick={() => setTimeSlotView('1hour')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  timeSlotView === '1hour'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'neumorphic-flat text-[#6b6b6b]'
                }`}
              >
                1 ora
              </button>
            </div>
          </div>
        </NeumorphicCard>

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
                <option value="custom">Personalizzato</option>
                <option value="all">Tutti i periodi</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Data Inizio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Data Fine</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </NeumorphicCard>

        {/* Time Slot Analysis Chart */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#6b6b6b]">Analisi per {timeSlotView === '30min' ? 'Slot (30 min)' : 'Ora'}</h3>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRevenue}
                  onChange={(e) => setShowRevenue(e.target.checked)}
                  className="w-4 h-4"
                />
                Revenue
              </label>
              <label className="flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHours}
                  onChange={(e) => setShowHours(e.target.checked)}
                  className="w-4 h-4"
                />
                Ore Lavorate
              </label>
            </div>
          </div>
          {aggregatedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="slot" 
                  angle={timeSlotView === '30min' ? -45 : 0}
                  textAnchor={timeSlotView === '30min' ? 'end' : 'middle'}
                  height={timeSlotView === '30min' ? 100 : 50}
                  interval={timeSlotView === '30min' ? 1 : 0}
                />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'avgRevenue') return `€${value.toFixed(2)}`;
                    if (name === 'avgHours') return `${value.toFixed(1)}h`;
                    return value;
                  }}
                />
                <Legend />
                {showRevenue && <Bar yAxisId="left" dataKey="avgRevenue" fill="#3b82f6" name="Revenue Media (€)" />}
                {showHours && <Bar yAxisId="right" dataKey="avgHours" fill="#f59e0b" name="Ore Medie Lavorate" />}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          )}
        </NeumorphicCard>

        {/* Revenue per Hour Chart - NEW */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#6b6b6b]">Revenue per Ora Lavorata</h3>
              <p className="text-sm text-[#9b9b9b]">Analisi produttività oraria (€/ora)</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer">
              <input
                type="checkbox"
                checked={showRevenuePerHour}
                onChange={(e) => setShowRevenuePerHour(e.target.checked)}
                className="w-4 h-4"
              />
              Mostra grafico
            </label>
          </div>
          {showRevenuePerHour && aggregatedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="slot" 
                  angle={timeSlotView === '30min' ? -45 : 0}
                  textAnchor={timeSlotView === '30min' ? 'end' : 'middle'}
                  height={timeSlotView === '30min' ? 100 : 50}
                  interval={timeSlotView === '30min' ? 1 : 0}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-bold text-gray-800 mb-2">{label}</p>
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold">€/ora:</span> €{data.revenuePerHour.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Revenue media:</span> €{data.avgRevenue.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Ore medie:</span> {data.avgHours.toFixed(1)}h
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenuePerHour" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  name="€/ora" 
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : !showRevenuePerHour ? (
            <p className="text-center text-[#9b9b9b] py-8">Grafico nascosto</p>
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
                  angle={timeSlotView === '30min' ? -45 : 0}
                  textAnchor={timeSlotView === '30min' ? 'end' : 'middle'}
                  height={timeSlotView === '30min' ? 100 : 50}
                  interval={timeSlotView === '30min' ? 1 : 0}
                />
                <YAxis yAxisId="left" orientation="left" stroke="#8b7355" />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'Revenue') return `€${value.toFixed(2)}`;
                    if (name === 'Ore Lavorate') return `${value.toFixed(1)}h`;
                    if (name === 'Revenue per Ora') return `€${value.toFixed(2)}/ora`;
                    return value;
                  }}
                />
                <Legend />
                {showRevenue && <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8b7355" strokeWidth={2} name="Revenue" />}
                {showHours && <Line yAxisId="right" type="monotone" dataKey="hours" stroke="#f59e0b" strokeWidth={2} name="Ore Lavorate" />}
                {showRevenuePerHour && <Line yAxisId="left" type="monotone" dataKey="revenuePerHour" stroke="#10b981" strokeWidth={2} name="Revenue per Ora" dot={{ fill: '#10b981', r: 3 }} />}
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