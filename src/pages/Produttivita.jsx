import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Clock, DollarSign, Calendar, Store, X, Settings } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek, endOfWeek, getWeek } from 'date-fns';
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
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState(null);
  const [heatmapMode, setHeatmapMode] = useState('productivity'); // 'productivity' or 'revenue'
  const [showSettings, setShowSettings] = useState(false);
  const [includedTipiTurno, setIncludedTipiTurno] = useState([]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('all'); // 'all' or day index 0-6

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

  const { data: tipiTurnoConfig = [] } = useQuery({
    queryKey: ['tipi-turno-config'],
    queryFn: () => base44.entities.TipoTurnoConfig.list(),
  });

  // Estrai tipi turno unici da config + turni esistenti
  const availableTipiTurno = useMemo(() => {
    const tipiMap = new Map();
    
    // Prima aggiungi tutti i tipi dalla config
    tipiTurnoConfig.forEach(config => {
      if (config.is_active !== false && config.nome) {
        tipiMap.set(config.nome, {
          nome: config.nome,
          colore: config.colore || '#94a3b8',
          is_active: true
        });
      }
    });
    
    // Poi aggiungi tipi dai turni effettivi (se non già presenti)
    allShifts.forEach(shift => {
      if (shift.tipo_turno && !tipiMap.has(shift.tipo_turno)) {
        const config = tipiTurnoConfig.find(t => t.nome === shift.tipo_turno);
        tipiMap.set(shift.tipo_turno, {
          nome: shift.tipo_turno,
          colore: config?.colore || '#94a3b8',
          is_active: config?.is_active !== false
        });
      }
    });

    return Array.from(tipiMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [allShifts, tipiTurnoConfig]);

  // Inizializza tipi turno inclusi con tutti i tipi disponibili
  React.useEffect(() => {
    if (includedTipiTurno.length === 0 && availableTipiTurno.length > 0) {
      const tipi = availableTipiTurno.map(t => t.nome);
      setIncludedTipiTurno(tipi);
    }
  }, [availableTipiTurno]);

  // Filtra turni in base ai tipi selezionati
  const filteredShifts = useMemo(() => {
    if (includedTipiTurno.length === 0) return [];
    return allShifts.filter(shift => 
      includedTipiTurno.includes(shift.tipo_turno)
    );
  }, [allShifts, includedTipiTurno]);

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

  // Calculate AVERAGE hours worked by time slot (per day)
  const hoursWorkedBySlot = useMemo(() => {
    const slotData = {}; // { slot: { totalHours, daysSet } }

    filteredShifts.forEach(shift => {
      if (!shift.ora_inizio || !shift.ora_fine) return;
      if (selectedStore !== 'all' && shift.store_id !== selectedStore) return;

      const shiftDate = shift.data;
      if (!shiftDate) return;

      const startTime = shift.ora_inizio;
      const endTime = shift.ora_fine;

      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      let currentMin = startHour * 60 + startMin;
      const endMinTotal = endHour * 60 + endMin;

      while (currentMin < endMinTotal) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}-${String(Math.floor((currentMin + 30) / 60)).padStart(2, '0')}:${String((currentMin + 30) % 60).padStart(2, '0')}`;
        
        if (!slotData[slot]) {
          slotData[slot] = { totalHours: 0, daysSet: new Set() };
        }
        
        slotData[slot].totalHours += 0.5; // 30 minutes = 0.5 hours
        slotData[slot].daysSet.add(shiftDate);
        
        currentMin += 30;
      }
    });

    // Calculate average hours per day for each slot
    const avgHours = {};
    Object.keys(slotData).forEach(slot => {
      const daysCount = slotData[slot].daysSet.size;
      avgHours[slot] = daysCount > 0 ? slotData[slot].totalHours / daysCount : 0;
    });

    return avgHours;
  }, [filteredShifts, selectedStore]);

  // Aggregate by time slot (30min or 1hour)
  const aggregatedData = useMemo(() => {
    if (filteredData.length === 0) return [];

    // Pre-calculate average hours per hour slot (sum of 30-min slots)
    const avgHoursPerSlot = {};
    Object.entries(hoursWorkedBySlot || {}).forEach(([slot, hours]) => {
      if (timeSlotView === '1hour') {
        const hour = slot.split(':')[0] + ':00';
        avgHoursPerSlot[hour] = (avgHoursPerSlot[hour] || 0) + hours;
      } else {
        avgHoursPerSlot[slot] = hours;
      }
    });

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
          aggregation[key] = { slot: key, revenue: 0, count: 0 };
        }
        aggregation[key].revenue += revenue || 0;
        aggregation[key].count += 1;
      });
    });

    return Object.values(aggregation)
      .map(item => ({
        slot: item.slot,
        avgRevenue: item.revenue / item.count,
        avgHours: avgHoursPerSlot[item.slot] || 0,
        revenuePerHour: (avgHoursPerSlot[item.slot] || 0) > 0 ? (item.revenue / item.count) / (avgHoursPerSlot[item.slot] || 0) : 0
      }))
      .sort((a, b) => a.slot.localeCompare(b.slot));
  }, [filteredData, timeSlotView, hoursWorkedBySlot]);

  // Daily data for selected date
  const dailySlotData = useMemo(() => {
    const dayData = filteredData.find(r => r.date === selectedDate);
    if (!dayData || !dayData.slots) return [];

    // Get shifts for this specific date
    const dayShifts = filteredShifts.filter(s => s.data === selectedDate);
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
  }, [filteredData, selectedDate, filteredShifts, selectedStore, timeSlotView]);

  // Heatmap data: day of week x time slot
  const heatmapData = useMemo(() => {
    const daySlotMap = {};
    const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    
    // Pre-calculate average hours per hour slot (sum of 30-min slots)
    const avgHoursPerSlot = {};
    Object.entries(hoursWorkedBySlot || {}).forEach(([slot, hours]) => {
      if (timeSlotView === '1hour') {
        const hour = slot.split(':')[0] + ':00';
        avgHoursPerSlot[hour] = (avgHoursPerSlot[hour] || 0) + hours;
      } else {
        avgHoursPerSlot[slot] = hours;
      }
    });
    
    filteredData.forEach(record => {
      const date = parseISO(record.date);
      const dayIndex = date.getDay(); // 0=Sunday, 1=Monday, etc.
      const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert to 0=Monday
      const dayName = daysOfWeek[adjustedIndex];
      
      Object.entries(record.slots || {}).forEach(([slot, revenue]) => {
        let key;
        if (timeSlotView === '1hour') {
          const hour = slot.split(':')[0] + ':00';
          key = hour;
        } else {
          key = slot;
        }
        
        const mapKey = `${dayName}|${key}`;
        if (!daySlotMap[mapKey]) {
          daySlotMap[mapKey] = { revenue: 0, count: 0 };
        }
        daySlotMap[mapKey].revenue += revenue || 0;
        daySlotMap[mapKey].count += 1;
      });
    });
    
    // Convert to structured format with metadata
    const result = daysOfWeek.map(day => {
      const dayData = { day, metadata: {} };
      Object.keys(daySlotMap)
        .filter(k => k.startsWith(day + '|'))
        .forEach(k => {
          const slot = k.split('|')[1];
          const data = daySlotMap[k];
          const avgRevenue = data.revenue / data.count;
          const avgHours = avgHoursPerSlot[slot] || 0;
          const productivity = avgHours > 0 ? avgRevenue / avgHours : 0;
          
          dayData[slot] = productivity;
          dayData.metadata[slot] = {
            avgRevenue,
            avgHours,
            productivity,
            count: data.count
          };
        });
      return dayData;
    });
    
    return result;
  }, [filteredData, timeSlotView, hoursWorkedBySlot]);

  // Weekly/Monthly productivity by store
  const storeProductivity = useMemo(() => {
    const storeData = {};
    
    // Group by store and time period (week/month)
    filteredData.forEach(record => {
      const date = parseISO(record.date);
      const storeId = record.store_id;
      const storeName = record.store_name;
      
      if (!storeId) return;
      
      // Get week and month identifiers
      const weekKey = `${format(startOfWeek(date, { locale: it }), 'yyyy-MM-dd')}`;
      const monthKey = format(date, 'yyyy-MM');
      
      // Initialize store data
      if (!storeData[storeId]) {
        storeData[storeId] = {
          name: storeName,
          weekly: {},
          monthly: {}
        };
      }
      
      // Weekly data
      if (!storeData[storeId].weekly[weekKey]) {
        storeData[storeId].weekly[weekKey] = { revenue: 0, hours: 0, date: weekKey };
      }
      storeData[storeId].weekly[weekKey].revenue += record.total_revenue || 0;
      
      // Monthly data
      if (!storeData[storeId].monthly[monthKey]) {
        storeData[storeId].monthly[monthKey] = { revenue: 0, hours: 0, date: monthKey };
      }
      storeData[storeId].monthly[monthKey].revenue += record.total_revenue || 0;
    });
    
    // Add hours from shifts
    filteredShifts.forEach(shift => {
      if (!shift.ora_inizio || !shift.ora_fine || !shift.data || !shift.store_id) return;
      
      const date = parseISO(shift.data);
      const weekKey = `${format(startOfWeek(date, { locale: it }), 'yyyy-MM-dd')}`;
      const monthKey = format(date, 'yyyy-MM');
      
      // Calculate shift duration in hours
      const [startHour, startMin] = shift.ora_inizio.split(':').map(Number);
      const [endHour, endMin] = shift.ora_fine.split(':').map(Number);
      const hours = (endHour * 60 + endMin - (startHour * 60 + startMin)) / 60;
      
      if (storeData[shift.store_id]) {
        // Weekly hours
        if (storeData[shift.store_id].weekly[weekKey]) {
          storeData[shift.store_id].weekly[weekKey].hours += hours;
        }
        
        // Monthly hours
        if (storeData[shift.store_id].monthly[monthKey]) {
          storeData[shift.store_id].monthly[monthKey].hours += hours;
        }
      }
    });
    
    // Calculate productivity (€/hour)
    Object.keys(storeData).forEach(storeId => {
      Object.keys(storeData[storeId].weekly).forEach(weekKey => {
        const data = storeData[storeId].weekly[weekKey];
        data.productivity = data.hours > 0 ? data.revenue / data.hours : 0;
      });
      
      Object.keys(storeData[storeId].monthly).forEach(monthKey => {
        const data = storeData[storeId].monthly[monthKey];
        data.productivity = data.hours > 0 ? data.revenue / data.hours : 0;
      });
    });
    
    return storeData;
  }, [filteredData, filteredShifts]);

  // Daily productivity by store
  const dailyProductivity = useMemo(() => {
    const dailyData = {};
    
    // Aggregate revenue by date and store
    filteredData.forEach(record => {
      const key = `${record.date}_${record.store_id}`;
      if (!dailyData[key]) {
        dailyData[key] = {
          date: record.date,
          store_id: record.store_id,
          store_name: record.store_name,
          revenue: 0,
          hours: 0
        };
      }
      dailyData[key].revenue += record.total_revenue || 0;
    });
    
    // Add hours from shifts for each day
    filteredShifts.forEach(shift => {
      if (!shift.ora_inizio || !shift.ora_fine || !shift.data || !shift.store_id) return;
      
      const key = `${shift.data}_${shift.store_id}`;
      
      // Calculate shift duration in hours
      const [startHour, startMin] = shift.ora_inizio.split(':').map(Number);
      const [endHour, endMin] = shift.ora_fine.split(':').map(Number);
      const hours = (endHour * 60 + endMin - (startHour * 60 + startMin)) / 60;
      
      if (dailyData[key]) {
        dailyData[key].hours += hours;
      }
    });
    
    // Calculate productivity
    return Object.values(dailyData)
      .map(item => ({
        ...item,
        productivity: item.hours > 0 ? item.revenue / item.hours : 0
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredData, filteredShifts]);

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📊 Produttività</h1>
            <p className="text-[#9b9b9b]">Analisi revenue per slot orari</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="neumorphic-flat p-3 rounded-xl hover:bg-slate-100 transition-all"
          >
            <Settings className="w-5 h-5 text-slate-600" />
          </button>
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

        {/* Heatmap - Produttività per Giorno e Slot */}
        <NeumorphicCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#6b6b6b]">Heatmap per Giorno e Slot</h3>
              <p className="text-sm text-[#9b9b9b]">
                {heatmapMode === 'productivity' ? '€ fatturato / Ore lavorate (media per giorno e slot)' : 'Fatturato medio per giorno e slot'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setHeatmapMode('productivity')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  heatmapMode === 'productivity'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'neumorphic-flat text-[#6b6b6b]'
                }`}
              >
                Produttività (€/ora)
              </button>
              <button
                onClick={() => setHeatmapMode('revenue')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  heatmapMode === 'revenue'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'neumorphic-flat text-[#6b6b6b]'
                }`}
              >
                Fatturato (€)
              </button>
            </div>
          </div>
          {heatmapData.length > 0 && (() => {
            // Get all unique slots from data
            const allSlots = new Set();
            heatmapData.forEach(row => {
              Object.keys(row).forEach(key => {
                if (key !== 'day' && key !== 'metadata') allSlots.add(key);
              });
            });
            const slots = Array.from(allSlots).sort();
            
            // Find min/max for color scaling
            const allValues = heatmapData.flatMap(row => 
              slots.map(slot => {
                if (heatmapMode === 'productivity') {
                  return row[slot] || 0;
                } else {
                  return row.metadata?.[slot]?.avgRevenue || 0;
                }
              }).filter(v => v > 0)
            );
            const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
            const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
            
            const getColor = (value) => {
              if (!value || value === 0) return 'bg-gray-100';
              const normalized = (value - minValue) / (maxValue - minValue);
              if (normalized >= 0.8) return 'bg-green-600 text-white';
              if (normalized >= 0.6) return 'bg-green-500 text-white';
              if (normalized >= 0.4) return 'bg-yellow-500 text-gray-900';
              if (normalized >= 0.2) return 'bg-orange-400 text-gray-900';
              return 'bg-red-400 text-white';
            };
            
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-[#9b9b9b] font-medium sticky left-0 bg-white z-10">Giorno</th>
                      {slots.map(slot => (
                        <th key={slot} className="p-2 text-center text-[#9b9b9b] font-medium min-w-[60px]">
                          {slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map(row => (
                      <tr key={row.day} className="border-t border-gray-200">
                        <td className="p-2 font-medium text-[#6b6b6b] sticky left-0 bg-white z-10">
                          {row.day}
                        </td>
                        {slots.map(slot => {
                          const value = heatmapMode === 'productivity' 
                            ? (row[slot] || 0)
                            : (row.metadata?.[slot]?.avgRevenue || 0);
                          const metadata = row.metadata?.[slot];
                          return (
                            <td
                              key={slot}
                              onClick={() => metadata && setSelectedHeatmapCell({ day: row.day, slot, ...metadata })}
                              className={`p-2 text-center font-semibold transition-all hover:scale-110 cursor-pointer ${getColor(value)}`}
                              title={value > 0 ? (heatmapMode === 'productivity' ? `€${value.toFixed(2)}/ora` : `€${value.toFixed(2)}`) : 'Nessun dato'}
                            >
                              {value > 0 ? `€${value.toFixed(0)}` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-400 rounded"></div>
                    <span className="text-[#9b9b9b]">Bassa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-[#9b9b9b]">Media</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-600 rounded"></div>
                    <span className="text-[#9b9b9b]">Alta</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </NeumorphicCard>

        {/* Heatmap Cell Detail Modal */}
        {selectedHeatmapCell && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#6b6b6b]">Dettaglio Slot</h3>
                <button
                  onClick={() => setSelectedHeatmapCell(null)}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="neumorphic-pressed p-4 rounded-xl">
                  <p className="text-sm text-[#9b9b9b] mb-1">Giorno e Orario</p>
                  <p className="text-lg font-bold text-[#6b6b6b]">
                    {selectedHeatmapCell.day} - {selectedHeatmapCell.slot}
                  </p>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl">
                  <p className="text-sm text-[#9b9b9b] mb-2">Produttività</p>
                  <p className="text-3xl font-bold text-green-600">
                    €{selectedHeatmapCell.productivity.toFixed(2)}/ora
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="neumorphic-flat p-4 rounded-xl text-center">
                    <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-xs text-[#9b9b9b] mb-1">Fatturato Medio</p>
                    <p className="text-lg font-bold text-[#6b6b6b]">
                      €{selectedHeatmapCell.avgRevenue.toFixed(2)}
                    </p>
                  </div>

                  <div className="neumorphic-flat p-4 rounded-xl text-center">
                    <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-xs text-[#9b9b9b] mb-1">Ore Medie Lavorate</p>
                    <p className="text-lg font-bold text-[#6b6b6b]">
                      {selectedHeatmapCell.avgHours.toFixed(1)}h
                    </p>
                  </div>
                </div>

                <div className="neumorphic-pressed p-3 rounded-xl bg-blue-50">
                  <p className="text-xs text-blue-700">
                    <strong>Formula:</strong> €{selectedHeatmapCell.avgRevenue.toFixed(2)} ÷ {selectedHeatmapCell.avgHours.toFixed(1)}h = €{selectedHeatmapCell.productivity.toFixed(2)}/ora
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Calcolato su {selectedHeatmapCell.count} {selectedHeatmapCell.count === 1 ? 'giorno' : 'giorni'}
                  </p>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}

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

        {/* Store Productivity Comparison - Weekly */}
        <NeumorphicCard className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[#6b6b6b] flex items-center gap-2">
              <Store className="w-5 h-5" />
              Produttività Settimanale per Negozio
            </h3>
            <p className="text-sm text-[#9b9b9b]">€/ora per settimana - confronto tra negozi</p>
          </div>
          {Object.keys(storeProductivity).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Settimana</th>
                    {Object.values(storeProductivity).map(store => (
                      <th key={store.name} className="text-right p-3 text-[#9b9b9b] font-medium">{store.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allWeeks = new Set();
                    Object.values(storeProductivity).forEach(store => {
                      Object.keys(store.weekly).forEach(week => allWeeks.add(week));
                    });
                    const sortedWeeks = Array.from(allWeeks).sort().reverse();
                    
                    return sortedWeeks.map(week => (
                      <tr key={week} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                        <td className="p-3 text-[#6b6b6b] font-medium">
                          {format(parseISO(week), "'Sett.' w - dd/MM", { locale: it })}
                        </td>
                        {Object.values(storeProductivity).map(store => {
                          const data = store.weekly[week];
                          return (
                            <td key={store.name} className="p-3 text-right">
                              {data ? (
                                <div className="space-y-1">
                                  <span className="font-bold text-green-600">
                                    €{data.productivity.toFixed(2)}/h
                                  </span>
                                  <div className="text-xs text-[#9b9b9b]">
                                    €{data.revenue.toFixed(0)} / {data.hours.toFixed(0)}h
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#9b9b9b]">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          )}
        </NeumorphicCard>

        {/* Daily Productivity Table by Store */}
        <NeumorphicCard className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[#6b6b6b]">Produttività Giornaliera per Negozio</h3>
            <p className="text-sm text-[#9b9b9b]">Fatturato, ore lavorate e produttività per ogni giorno</p>
          </div>
          {dailyProductivity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Negozio</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Fatturato</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Ore Lavorate</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Produttività (€/ora)</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyProductivity.map((record) => (
                    <tr key={`${record.date}_${record.store_id}`} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3 text-[#6b6b6b] font-medium">
                        {format(parseISO(record.date), 'dd/MM/yyyy', { locale: it })}
                      </td>
                      <td className="p-3 text-[#6b6b6b]">{record.store_name}</td>
                      <td className="p-3 text-right font-bold text-green-600">
                        €{record.revenue.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-bold text-orange-600">
                        {record.hours.toFixed(1)}h
                      </td>
                      <td className="p-3 text-right font-bold text-blue-600">
                        {record.productivity > 0 ? `€${record.productivity.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          )}
        </NeumorphicCard>

        {/* Store Productivity Comparison - Monthly */}
        <NeumorphicCard className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[#6b6b6b] flex items-center gap-2">
              <Store className="w-5 h-5" />
              Produttività Mensile per Negozio
            </h3>
            <p className="text-sm text-[#9b9b9b]">€/ora per mese - confronto tra negozi</p>
          </div>
          {Object.keys(storeProductivity).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Mese</th>
                    {Object.values(storeProductivity).map(store => (
                      <th key={store.name} className="text-right p-3 text-[#9b9b9b] font-medium">{store.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allMonths = new Set();
                    Object.values(storeProductivity).forEach(store => {
                      Object.keys(store.monthly).forEach(month => allMonths.add(month));
                    });
                    const sortedMonths = Array.from(allMonths).sort().reverse();
                    
                    return sortedMonths.map(month => (
                      <tr key={month} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                        <td className="p-3 text-[#6b6b6b] font-medium">
                          {format(parseISO(month + '-01'), 'MMMM yyyy', { locale: it })}
                        </td>
                        {Object.values(storeProductivity).map(store => {
                          const data = store.monthly[month];
                          return (
                            <td key={store.name} className="p-3 text-right">
                              {data ? (
                                <div className="space-y-1">
                                  <span className="font-bold text-green-600">
                                    €{data.productivity.toFixed(2)}/h
                                  </span>
                                  <div className="text-xs text-[#9b9b9b]">
                                    €{data.revenue.toFixed(0)} / {data.hours.toFixed(0)}h
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#9b9b9b]">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          )}
        </NeumorphicCard>

        {/* Daily Productivity Table by Store */}
        <NeumorphicCard className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[#6b6b6b]">Produttività Giornaliera per Negozio</h3>
            <p className="text-sm text-[#9b9b9b]">Fatturato, ore lavorate e produttività per ogni giorno</p>
          </div>
          {dailyProductivity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Negozio</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Fatturato</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Ore Lavorate</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Produttività (€/ora)</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyProductivity.map((record) => (
                    <tr key={`${record.date}_${record.store_id}`} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3 text-[#6b6b6b] font-medium">
                        {format(parseISO(record.date), 'dd/MM/yyyy', { locale: it })}
                      </td>
                      <td className="p-3 text-[#6b6b6b]">{record.store_name}</td>
                      <td className="p-3 text-right font-bold text-green-600">
                        €{record.revenue.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-bold text-orange-600">
                        {record.hours.toFixed(1)}h
                      </td>
                      <td className="p-3 text-right font-bold text-blue-600">
                        {record.productivity > 0 ? `€${record.productivity.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          )}
        </NeumorphicCard>

        {/* Raw Data Table */}
        <NeumorphicCard className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[#6b6b6b]">Dati Raw da Zapier</h3>
            <p className="text-sm text-[#9b9b9b]">Tutti i record caricati ({filteredData.length} record)</p>
          </div>
          {filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Negozio</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Revenue Totale</th>
                    <th className="text-center p-3 text-[#9b9b9b] font-medium">Slot Popolati</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Creato</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record) => {
                    const slotCount = Object.keys(record.slots || {}).length;
                    return (
                      <tr key={record.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                        <td className="p-3 text-[#6b6b6b] font-medium">
                          {format(parseISO(record.date), 'dd/MM/yyyy', { locale: it })}
                        </td>
                        <td className="p-3 text-[#6b6b6b]">{record.store_name}</td>
                        <td className="p-3 text-right font-bold text-green-600">
                          €{(record.total_revenue || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-center text-[#6b6b6b]">{slotCount} slot</td>
                        <td className="p-3 text-xs text-[#9b9b9b]">
                          {format(parseISO(record.created_date), 'dd/MM/yyyy HH:mm', { locale: it })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          )}
        </NeumorphicCard>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#6b6b6b]">Impostazioni Produttività</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="neumorphic-pressed p-4 rounded-xl">
                  <h4 className="font-bold text-[#6b6b6b] mb-3">Tipi di Turno da Includere</h4>
                  <p className="text-xs text-[#9b9b9b] mb-3">
                    Seleziona quali tipi di turno includere nel calcolo delle ore lavorate
                  </p>
                  <div className="space-y-2">
                    {availableTipiTurno.length > 0 ? (
                      availableTipiTurno.map(tipo => (
                        <label key={tipo.nome} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={includedTipiTurno.includes(tipo.nome)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setIncludedTipiTurno(prev => [...prev, tipo.nome]);
                              } else {
                                setIncludedTipiTurno(prev => prev.filter(t => t !== tipo.nome));
                              }
                            }}
                            className="w-5 h-5 rounded flex-shrink-0"
                          />
                          <div 
                            className="w-4 h-4 rounded flex-shrink-0" 
                            style={{ backgroundColor: tipo.colore }}
                          />
                          <span className="font-medium text-[#6b6b6b] text-sm">{tipo.nome}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Nessun tipo di turno trovato nei turni esistenti.
                      </p>
                    )}
                  </div>
                  {includedTipiTurno.length === 0 && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ Seleziona almeno un tipo di turno
                    </p>
                  )}
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50">
                  <p className="text-xs text-blue-700">
                    <strong>Nota:</strong> I filtri si applicano a tutti i grafici e calcoli di questa pagina.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  Applica
                </button>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}