import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Clock, DollarSign, Calendar, Store, X, Settings, ChevronDown, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
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
  const [orarioApertura, setOrarioApertura] = useState('11:00');
  const [orarioChiusura, setOrarioChiusura] = useState('23:00');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('all'); // 'all' or day index 0-6
  const [collapsedSections, setCollapsedSections] = useState({
    datiRaw: true,
    produttivitaGiornaliera: true,
    produttivitaMensile: true
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: revenueData = [] } = useQuery({
    queryKey: ['revenue-by-time-slot'],
    queryFn: () => base44.entities.RevenueByTimeSlot.list('-date', 1000)
  });

  const { data: allShifts = [] } = useQuery({
    queryKey: ['planday-shifts'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 2000)
  });

  const { data: tipiTurnoConfig = [] } = useQuery({
    queryKey: ['tipi-turno-config'],
    queryFn: () => base44.entities.TipoTurnoConfig.list()
  });

  const { data: produttivitaConfigs = [] } = useQuery({
    queryKey: ['produttivita-config'],
    queryFn: () => base44.entities.ProduttivitaConfig.list()
  });

  const queryClient = useQueryClient();

  const saveConfigMutation = useMutation({
    mutationFn: async (configData) => {
      const existingConfig = produttivitaConfigs.find(c => c.is_active);
      if (existingConfig) {
        return await base44.entities.ProduttivitaConfig.update(existingConfig.id, configData);
      } else {
        return await base44.entities.ProduttivitaConfig.create({ ...configData, config_name: 'default_config', is_active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produttivita-config'] });
      setShowSettings(false);
    }
  });

  // Estrai tipi turno unici da config + turni esistenti
  const availableTipiTurno = useMemo(() => {
    const tipiMap = new Map();

    // Prima aggiungi tutti i tipi dalla config
    tipiTurnoConfig.forEach((config) => {
      if (config.is_active !== false && config.nome) {
        tipiMap.set(config.nome, {
          nome: config.nome,
          colore: config.colore || '#94a3b8',
          is_active: true
        });
      }
    });

    // Poi aggiungi tipi dai turni effettivi (se non già presenti)
    allShifts.forEach((shift) => {
      if (shift.tipo_turno && !tipiMap.has(shift.tipo_turno)) {
        const config = tipiTurnoConfig.find((t) => t.nome === shift.tipo_turno);
        tipiMap.set(shift.tipo_turno, {
          nome: shift.tipo_turno,
          colore: config?.colore || '#94a3b8',
          is_active: config?.is_active !== false
        });
      }
    });

    return Array.from(tipiMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [allShifts, tipiTurnoConfig]);

  // Carica configurazione salvata
  React.useEffect(() => {
    const activeConfig = produttivitaConfigs.find(c => c.is_active);
    if (activeConfig) {
      if (activeConfig.orario_apertura) setOrarioApertura(activeConfig.orario_apertura);
      if (activeConfig.orario_chiusura) setOrarioChiusura(activeConfig.orario_chiusura);
      if (activeConfig.tipi_turno_inclusi && activeConfig.tipi_turno_inclusi.length > 0) {
        setIncludedTipiTurno(activeConfig.tipi_turno_inclusi);
      }
    }
  }, [produttivitaConfigs]);

  // Inizializza tipi turno inclusi con tutti i tipi disponibili solo se non ci sono config salvate
  React.useEffect(() => {
    if (includedTipiTurno.length === 0 && availableTipiTurno.length > 0 && produttivitaConfigs.length === 0) {
      const tipi = availableTipiTurno.map((t) => t.nome);
      setIncludedTipiTurno(tipi);
    }
  }, [availableTipiTurno, produttivitaConfigs]);

  // Filtra turni in base ai tipi selezionati
  const filteredShifts = useMemo(() => {
    if (includedTipiTurno.length === 0) return [];
    return allShifts.filter((shift) =>
    includedTipiTurno.includes(shift.tipo_turno)
    );
  }, [allShifts, includedTipiTurno]);

  const filteredData = useMemo(() => {
    let filtered = revenueData;

    if (selectedStore !== 'all') {
      filtered = filtered.filter((r) => r.store_id === selectedStore);
    }

    const now = new Date();
    if (dateRange === 'month') {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      filtered = filtered.filter((r) => {
        const date = parseISO(r.date);
        return date >= monthStart && date <= monthEnd;
      });
    } else if (dateRange === 'custom') {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      filtered = filtered.filter((r) => {
        const date = parseISO(r.date);
        return date >= start && date <= end;
      });
    }

    return filtered;
  }, [revenueData, selectedStore, dateRange, startDate, endDate]);

  // Calculate AVERAGE hours worked by time slot (per day)
  const hoursWorkedBySlot = useMemo(() => {
    // Apply date range filtering
    const now = new Date();
    let shiftStartDate, shiftEndDate;
    
    if (dateRange === 'month') {
      shiftStartDate = startOfMonth(now);
      shiftEndDate = endOfMonth(now);
    } else if (dateRange === 'custom') {
      shiftStartDate = parseISO(startDate);
      shiftEndDate = parseISO(endDate);
    } else {
      shiftStartDate = null;
      shiftEndDate = null;
    }

    const slotDataByDay = {}; // { date: { slot: hours } }

    filteredShifts.forEach((shift) => {
      if (!shift.ora_inizio || !shift.ora_fine) return;
      if (selectedStore !== 'all' && shift.store_id !== selectedStore) return;

      const shiftDate = shift.data;
      if (!shiftDate) return;

      // Apply date filtering
      const date = parseISO(shiftDate);
      if (shiftStartDate && date < shiftStartDate) return;
      if (shiftEndDate && date > shiftEndDate) return;

      // Apply day of week filtering
      if (selectedDayOfWeek !== 'all') {
        const dayIndex = date.getDay();
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        if (adjustedIndex !== parseInt(selectedDayOfWeek)) return;
      }

      if (!slotDataByDay[shiftDate]) {
        slotDataByDay[shiftDate] = {};
      }

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

        if (!slotDataByDay[shiftDate][slot]) {
          slotDataByDay[shiftDate][slot] = 0;
        }
        slotDataByDay[shiftDate][slot] += 0.5; // 30 minutes = 0.5 hours

        currentMin += 30;
      }
    });

    // Calculate average hours per day for each slot
    const slotAverages = {};
    const slotDayCounts = {};

    Object.values(slotDataByDay).forEach((daySlots) => {
      Object.entries(daySlots).forEach(([slot, hours]) => {
        if (!slotAverages[slot]) {
          slotAverages[slot] = 0;
          slotDayCounts[slot] = 0;
        }
        slotAverages[slot] += hours;
        slotDayCounts[slot] += 1;
      });
    });

    const avgHours = {};
    Object.keys(slotAverages).forEach((slot) => {
      avgHours[slot] = slotDayCounts[slot] > 0 ? slotAverages[slot] / slotDayCounts[slot] : 0;
    });

    return avgHours;
  }, [filteredShifts, selectedStore]);

  // Aggregate by time slot (30min or 1hour)
  const aggregatedData = useMemo(() => {
    let dataToAggregate = filteredData;

    // Filter by day of week if selected
    if (selectedDayOfWeek !== 'all') {
      const selectedDayIndex = parseInt(selectedDayOfWeek);
      dataToAggregate = filteredData.filter((record) => {
        const date = parseISO(record.date);
        const dayIndex = date.getDay(); // 0=Sunday, 1=Monday, etc.
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert to 0=Monday
        return adjustedIndex === selectedDayIndex;
      });
    }

    if (dataToAggregate.length === 0) return [];

    // Recalcola ore lavorate per slot aggregato (1hour o 30min)
    const slotDataByDay = {};
    
    // Apply date range filtering
    const now = new Date();
    let shiftStartDate, shiftEndDate;
    
    if (dateRange === 'month') {
      shiftStartDate = startOfMonth(now);
      shiftEndDate = endOfMonth(now);
    } else if (dateRange === 'custom') {
      shiftStartDate = parseISO(startDate);
      shiftEndDate = parseISO(endDate);
    } else {
      shiftStartDate = null;
      shiftEndDate = null;
    }
    
    filteredShifts.forEach((shift) => {
      if (!shift.ora_inizio || !shift.ora_fine || !shift.data) return;
      if (selectedStore !== 'all' && shift.store_id !== selectedStore) return;

      const shiftDate = shift.data;
      const date = parseISO(shiftDate);
      
      // Apply date filtering
      if (shiftStartDate && date < shiftStartDate) return;
      if (shiftEndDate && date > shiftEndDate) return;

      // Filter by day of week if selected
      if (selectedDayOfWeek !== 'all') {
        const dayIndex = date.getDay();
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        if (adjustedIndex !== parseInt(selectedDayOfWeek)) return;
      }
      if (!slotDataByDay[shiftDate]) {
        slotDataByDay[shiftDate] = {};
      }

      const [startHour, startMin] = shift.ora_inizio.split(':').map(Number);
      const [endHour, endMin] = shift.ora_fine.split(':').map(Number);

      let currentMin = startHour * 60 + startMin;
      const endMinTotal = endHour * 60 + endMin;

      while (currentMin < endMinTotal) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        
        let key;
        if (timeSlotView === '1hour') {
          key = `${String(h).padStart(2, '0')}:00`;
        } else {
          key = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}-${String(Math.floor((currentMin + 30) / 60)).padStart(2, '0')}:${String((currentMin + 30) % 60).padStart(2, '0')}`;
        }

        if (!slotDataByDay[shiftDate][key]) {
          slotDataByDay[shiftDate][key] = 0;
        }
        slotDataByDay[shiftDate][key] += 0.5;

        currentMin += 30;
      }
    });

    // Calculate average hours per slot
    const avgHoursPerSlot = {};
    const slotDayCounts = {};

    Object.values(slotDataByDay).forEach((daySlots) => {
      Object.entries(daySlots).forEach(([slot, hours]) => {
        if (!avgHoursPerSlot[slot]) {
          avgHoursPerSlot[slot] = 0;
          slotDayCounts[slot] = 0;
        }
        avgHoursPerSlot[slot] += hours;
        slotDayCounts[slot] += 1;
      });
    });

    Object.keys(avgHoursPerSlot).forEach((slot) => {
      avgHoursPerSlot[slot] = slotDayCounts[slot] > 0 ? avgHoursPerSlot[slot] / slotDayCounts[slot] : 0;
    });

    const aggregation = {};

    dataToAggregate.forEach((record) => {
      Object.entries(record.slots || {}).forEach(([slot, revenue]) => {
        let key;
        if (timeSlotView === '1hour') {
          const hour = slot.split(':')[0] + ':00';
          key = hour;
        } else {
          key = slot;
        }

        if (!aggregation[key]) {
          aggregation[key] = { slot: key, revenue: 0, count: 0, dates: new Set() };
        }
        aggregation[key].revenue += revenue || 0;
        aggregation[key].dates.add(record.date);
        aggregation[key].count = aggregation[key].dates.size;
      });
    });

    return Object.values(aggregation).
    map((item) => ({
      slot: item.slot,
      avgRevenue: item.revenue / item.count,
      avgHours: avgHoursPerSlot[item.slot] || 0,
      revenuePerHour: (avgHoursPerSlot[item.slot] || 0) > 0 ? (item.revenue / item.count) / (avgHoursPerSlot[item.slot]) : 0
    })).
    sort((a, b) => a.slot.localeCompare(b.slot));
  }, [filteredData, timeSlotView, filteredShifts, selectedStore, selectedDayOfWeek, dateRange, startDate, endDate]);

  // Daily data for selected date
  const dailySlotData = useMemo(() => {
    const dayData = filteredData.find((r) => r.date === selectedDate);
    if (!dayData || !dayData.slots) return [];

    // Get shifts for this specific date
    const dayShifts = filteredShifts.filter((s) => s.data === selectedDate);
    const dayHoursSlot = {};

    dayShifts.forEach((shift) => {
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

    const data = Object.entries(dayData.slots).
    map(([slot, revenue]) => ({
      slot,
      revenue,
      hours: dayHoursSlot[slot] || 0,
      revenuePerHour: (dayHoursSlot[slot] || 0) > 0 ? revenue / (dayHoursSlot[slot] || 0) : 0
    })).
    sort((a, b) => a.slot.localeCompare(b.slot));

    // Aggregate by view type
    if (timeSlotView === '1hour') {
      const hourlyAgg = {};
      data.forEach((item) => {
        const hour = item.slot.split(':')[0] + ':00';
        if (!hourlyAgg[hour]) {
          hourlyAgg[hour] = { slot: hour, revenue: 0, hours: 0 };
        }
        hourlyAgg[hour].revenue += item.revenue;
        hourlyAgg[hour].hours += item.hours;
      });
      return Object.values(hourlyAgg).
      map((item) => ({
        ...item,
        revenuePerHour: item.hours > 0 ? item.revenue / item.hours : 0
      })).
      sort((a, b) => a.slot.localeCompare(b.slot));
    }

    return data;
  }, [filteredData, selectedDate, filteredShifts, selectedStore, timeSlotView]);

  // Heatmap data: day of week x time slot
  const heatmapData = useMemo(() => {
    const daySlotMap = {};
    const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

    // Get date range for filtering shifts (same as filteredData)
    const now = new Date();
    let shiftStartDate, shiftEndDate;
    
    if (dateRange === 'month') {
      shiftStartDate = startOfMonth(now);
      shiftEndDate = endOfMonth(now);
    } else if (dateRange === 'custom') {
      shiftStartDate = parseISO(startDate);
      shiftEndDate = parseISO(endDate);
    } else {
      // 'all' - don't filter
      shiftStartDate = null;
      shiftEndDate = null;
    }

    // Calcola ore lavorate per giorno della settimana e slot
    const hoursDataByDayOfWeek = {}; // { dayName: { slot: { totalHours, daysCount } } }
    
    filteredShifts.forEach((shift) => {
      if (!shift.ora_inizio || !shift.ora_fine || !shift.data) return;
      if (selectedStore !== 'all' && shift.store_id !== selectedStore) return;

      const date = parseISO(shift.data);
      
      // Apply same date filtering as revenue data
      if (shiftStartDate && date < shiftStartDate) return;
      if (shiftEndDate && date > shiftEndDate) return;
      const dayIndex = date.getDay();
      const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      const dayName = daysOfWeek[adjustedIndex];

      if (!hoursDataByDayOfWeek[dayName]) {
        hoursDataByDayOfWeek[dayName] = {};
      }

      const [startHour, startMin] = shift.ora_inizio.split(':').map(Number);
      const [endHour, endMin] = shift.ora_fine.split(':').map(Number);

      let currentMin = startHour * 60 + startMin;
      const endMinTotal = endHour * 60 + endMin;

      // Traccia quali slot sono coperti per questo shift in questo giorno
      const shiftDate = shift.data;
      const dayKey = `${dayName}_${shiftDate}`;

      while (currentMin < endMinTotal) {
        const h = Math.floor(currentMin / 60);
        
        let key;
        if (timeSlotView === '1hour') {
          key = `${String(h).padStart(2, '0')}:00`;
        } else {
          const m = currentMin % 60;
          key = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}-${String(Math.floor((currentMin + 30) / 60)).padStart(2, '0')}:${String((currentMin + 30) % 60).padStart(2, '0')}`;
        }

        const slotDayKey = `${dayName}_${key}_${shiftDate}`;
        if (!hoursDataByDayOfWeek[dayName][key]) {
          hoursDataByDayOfWeek[dayName][key] = { hoursByDay: {}, totalDays: new Set() };
        }
        
        if (!hoursDataByDayOfWeek[dayName][key].hoursByDay[shiftDate]) {
          hoursDataByDayOfWeek[dayName][key].hoursByDay[shiftDate] = 0;
        }
        hoursDataByDayOfWeek[dayName][key].hoursByDay[shiftDate] += 0.5;
        hoursDataByDayOfWeek[dayName][key].totalDays.add(shiftDate);

        currentMin += 30;
      }
    });

    // Calculate average hours per slot per day of week
    const avgHoursByDayOfWeek = {};
    Object.entries(hoursDataByDayOfWeek).forEach(([dayName, slots]) => {
      avgHoursByDayOfWeek[dayName] = {};
      Object.entries(slots).forEach(([slot, data]) => {
        const totalHours = Object.values(data.hoursByDay).reduce((sum, h) => sum + h, 0);
        const daysCount = data.totalDays.size;
        avgHoursByDayOfWeek[dayName][slot] = daysCount > 0 ? totalHours / daysCount : 0;
      });
    });

    // Process revenue data - already filtered by filteredData
    filteredData.forEach((record) => {
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
          daySlotMap[mapKey] = { revenue: 0, count: 0, dayName, dates: new Set() };
        }
        daySlotMap[mapKey].revenue += revenue || 0;
        daySlotMap[mapKey].dates.add(record.date);
        daySlotMap[mapKey].count = daySlotMap[mapKey].dates.size;
      });
    });

    // Convert to structured format with metadata
    const result = daysOfWeek.map((day) => {
      const dayData = { day, metadata: {} };
      Object.keys(daySlotMap).
      filter((k) => k.startsWith(day + '|')).
      forEach((k) => {
        const slot = k.split('|')[1];
        const data = daySlotMap[k];
        const avgRevenue = data.revenue / data.count;
        const avgHours = avgHoursByDayOfWeek[day]?.[slot] || 0;
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
  }, [filteredData, timeSlotView, filteredShifts, selectedStore]);

  // Weekly/Monthly productivity by store
  const storeProductivity = useMemo(() => {
    // Apply date range filtering for shifts
    const now = new Date();
    let shiftStartDate, shiftEndDate;
    
    if (dateRange === 'month') {
      shiftStartDate = startOfMonth(now);
      shiftEndDate = endOfMonth(now);
    } else if (dateRange === 'custom') {
      shiftStartDate = parseISO(startDate);
      shiftEndDate = parseISO(endDate);
    } else {
      shiftStartDate = null;
      shiftEndDate = null;
    }

    const storeData = {};

    // Group by store and time period (week/month)
    filteredData.forEach((record) => {
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
    filteredShifts.forEach((shift) => {
      if (!shift.ora_inizio || !shift.ora_fine || !shift.data || !shift.store_id) return;

      const date = parseISO(shift.data);
      
      // Apply date filtering
      if (shiftStartDate && date < shiftStartDate) return;
      if (shiftEndDate && date > shiftEndDate) return;

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
    Object.keys(storeData).forEach((storeId) => {
      Object.keys(storeData[storeId].weekly).forEach((weekKey) => {
        const data = storeData[storeId].weekly[weekKey];
        data.productivity = data.hours > 0 ? data.revenue / data.hours : 0;
      });

      Object.keys(storeData[storeId].monthly).forEach((monthKey) => {
        const data = storeData[storeId].monthly[monthKey];
        data.productivity = data.hours > 0 ? data.revenue / data.hours : 0;
      });
    });

    return storeData;
  }, [filteredData, filteredShifts, dateRange, startDate, endDate]);

  // Daily productivity by store
  const dailyProductivity = useMemo(() => {
    // Apply date range filtering for shifts
    const now = new Date();
    let shiftStartDate, shiftEndDate;
    
    if (dateRange === 'month') {
      shiftStartDate = startOfMonth(now);
      shiftEndDate = endOfMonth(now);
    } else if (dateRange === 'custom') {
      shiftStartDate = parseISO(startDate);
      shiftEndDate = parseISO(endDate);
    } else {
      shiftStartDate = null;
      shiftEndDate = null;
    }

    const dailyData = {};

    // Aggregate revenue by date and store
    filteredData.forEach((record) => {
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
    filteredShifts.forEach((shift) => {
      if (!shift.ora_inizio || !shift.ora_fine || !shift.data || !shift.store_id) return;

      const date = parseISO(shift.data);
      
      // Apply date filtering
      if (shiftStartDate && date < shiftStartDate) return;
      if (shiftEndDate && date > shiftEndDate) return;

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
    return Object.values(dailyData).
    map((item) => ({
      ...item,
      productivity: item.hours > 0 ? item.revenue / item.hours : 0
    })).
    sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredData, filteredShifts, dateRange, startDate, endDate]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, r) => sum + (r.total_revenue || 0), 0);
    const totalHours = dailyProductivity.reduce((sum, d) => sum + d.hours, 0);
    const avgProductivity = dailyProductivity.length > 0 ? 
      dailyProductivity.reduce((sum, d) => sum + d.productivity, 0) / dailyProductivity.length : 0;

    return {
      totalRevenue,
      avgDailyRevenue: filteredData.length > 0 ? totalRevenue / filteredData.length : 0,
      daysTracked: filteredData.length,
      totalHours,
      hourlyProductivity: avgProductivity,
      peakHour: aggregatedData.length > 0 ? aggregatedData.reduce((max, h) => h.avgRevenue > max.avgRevenue ? h : max, aggregatedData[0]).slot : '-'
    };
  }, [filteredData, dailyProductivity, aggregatedData]);

  return (
    <ProtectedPage pageName="Produttivita" requiredUserTypes={['admin', 'manager']}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold" style={{ color: '#000000' }}>📊 Produttività</h1>
            <p style={{ color: '#000000' }}>Analisi revenue per slot orari</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="neumorphic-flat p-3 rounded-xl hover:bg-slate-100 transition-all">

            <Settings className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Negozio</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none">

                <option value="all">Tutti i negozi</option>
                {stores.map((store) =>
                <option key={store.id} value={store.id}>{store.name}</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Periodo</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none">

                <option value="month">Questo mese</option>
                <option value="custom">Personalizzato</option>
                <option value="all">Tutti i periodi</option>
              </select>
            </div>

            {dateRange === 'custom' &&
            <>
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Data Inizio</label>
                  <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none" />

                </div>
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Data Fine</label>
                  <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none" />

                </div>
              </>
            }
          </div>
        </NeumorphicCard>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NeumorphicCard className="p-6 text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">€{stats.totalRevenue.toFixed(2)}</h3>
            <p className="text-sm text-[#9b9b9b]">Revenue Totale</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.totalHours.toFixed(1)}h</h3>
            <p className="text-sm text-[#9b9b9b]">Ore Lavorate Totali</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">€{stats.hourlyProductivity.toFixed(2)}/h</h3>
            <p className="text-sm text-[#9b9b9b]">Produttività Oraria</p>
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
                timeSlotView === '30min' ?
                'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
                'neumorphic-flat text-[#6b6b6b]'}`
                }>

                30 minuti
              </button>
              <button
                onClick={() => setTimeSlotView('1hour')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                timeSlotView === '1hour' ?
                'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
                'neumorphic-flat text-[#6b6b6b]'}`
                }>

                1 ora
              </button>
            </div>
          </div>
        </NeumorphicCard>

        {/* Time Slot Analysis Chart */}
         <NeumorphicCard className="p-6">
           <div className="mb-4">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-[#6b6b6b]">Analisi per {timeSlotView === '30min' ? 'Slot (30 min)' : 'Ora'}</h3>
               <div className="flex gap-3">
                 <label className="flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer">
                   <input
                    type="checkbox"
                    checked={showRevenue}
                    onChange={(e) => setShowRevenue(e.target.checked)}
                    className="w-4 h-4" />

                   Revenue
                 </label>
                 <label className="flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer">
                   <input
                    type="checkbox"
                    checked={showHours}
                    onChange={(e) => setShowHours(e.target.checked)}
                    className="w-4 h-4" />

                   Ore Lavorate
                 </label>
                 <label className="flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer">
                   <input
                    type="checkbox"
                    checked={showRevenuePerHour}
                    onChange={(e) => setShowRevenuePerHour(e.target.checked)}
                    className="w-4 h-4" />

                   €/ora
                 </label>
               </div>
             </div>
             <div>
               <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Giorno della Settimana</label>
               <select
                value={selectedDayOfWeek}
                onChange={(e) => setSelectedDayOfWeek(e.target.value)}
                className="w-full md:w-64 neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none">

                 <option value="all">Tutti i giorni</option>
                 <option value="0">Lunedì</option>
                 <option value="1">Martedì</option>
                 <option value="2">Mercoledì</option>
                 <option value="3">Giovedì</option>
                 <option value="4">Venerdì</option>
                 <option value="5">Sabato</option>
                 <option value="6">Domenica</option>
               </select>
             </div>
           </div>
          {aggregatedData.length > 0 ?
          <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                dataKey="slot"
                angle={timeSlotView === '30min' ? -45 : 0}
                textAnchor={timeSlotView === '30min' ? 'end' : 'middle'}
                height={timeSlotView === '30min' ? 100 : 50}
                interval={timeSlotView === '30min' ? 1 : 0} />

                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                <Tooltip
                formatter={(value, name) => {
                  if (name === 'avgRevenue') return `€${value.toFixed(2)}`;
                  if (name === 'avgHours') return `${value.toFixed(1)}h`;
                  if (name === 'revenuePerHour') return `€${value.toFixed(2)}/h`;
                  return value;
                }} />

                <Legend />
                {showRevenue && <Bar yAxisId="left" dataKey="avgRevenue" fill="#3b82f6" name="Revenue Media (€)" />}
                {showHours && <Bar yAxisId="right" dataKey="avgHours" fill="#f59e0b" name="Ore Medie Lavorate" />}
                {showRevenuePerHour && <Line yAxisId="left" type="monotone" dataKey="revenuePerHour" stroke="#10b981" strokeWidth={3} name="€/ora" dot={{ fill: '#10b981', r: 4 }} />}
              </ComposedChart>
            </ResponsiveContainer> :

          <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          }
        </NeumorphicCard>

        {/* Heatmap - Produttività per Giorno e Slot */}
        <NeumorphicCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#6b6b6b]">Heatmap per Giorno e Slot</h3>
              <p className="text-sm text-[#9b9b9b]">
                {heatmapMode === 'productivity' ? '€ fatturato / Ore lavorate (media per giorno e slot)' : 
                 heatmapMode === 'revenue' ? 'Fatturato medio per giorno e slot' : 'Ore lavorate medie per giorno e slot'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setHeatmapMode('productivity')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                heatmapMode === 'productivity' ?
                'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
                'neumorphic-flat text-[#6b6b6b]'}`
                }>

                Produttività (€/ora)
              </button>
              <button
                onClick={() => setHeatmapMode('revenue')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                heatmapMode === 'revenue' ?
                'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
                'neumorphic-flat text-[#6b6b6b]'}`
                }>

                Fatturato (€)
              </button>
              <button
                onClick={() => setHeatmapMode('hours')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                heatmapMode === 'hours' ?
                'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
                'neumorphic-flat text-[#6b6b6b]'}`
                }>

                Ore Lavorate
              </button>
            </div>
          </div>
          {heatmapData.length > 0 && (() => {
            // Get all unique slots from data
            const allSlots = new Set();
            heatmapData.forEach((row) => {
              Object.keys(row).forEach((key) => {
                if (key !== 'day' && key !== 'metadata') allSlots.add(key);
              });
            });
            const slots = Array.from(allSlots).sort();

            // Find min/max for color scaling
            const allValues = heatmapData.flatMap((row) =>
            slots.map((slot) => {
              if (heatmapMode === 'productivity') {
                return row[slot] || 0;
              } else if (heatmapMode === 'revenue') {
                return row.metadata?.[slot]?.avgRevenue || 0;
              } else {
                return row.metadata?.[slot]?.avgHours || 0;
              }
            }).filter((v) => v > 0)
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
                      {slots.map((slot) =>
                      <th key={slot} className="p-2 text-center text-[#9b9b9b] font-medium min-w-[60px]">
                          {slot}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map((row) =>
                    <tr key={row.day} className="border-t border-gray-200">
                        <td className="p-2 font-medium text-[#6b6b6b] sticky left-0 bg-white z-10">
                          {row.day}
                        </td>
                        {slots.map((slot) => {
                        const value = heatmapMode === 'productivity' ?
                        row[slot] || 0 :
                        heatmapMode === 'revenue' ?
                        row.metadata?.[slot]?.avgRevenue || 0 :
                        row.metadata?.[slot]?.avgHours || 0;
                        const metadata = row.metadata?.[slot];
                        return (
                          <td
                            key={slot}
                            onClick={() => metadata && setSelectedHeatmapCell({ day: row.day, slot, ...metadata })}
                            className={`p-2 text-center font-semibold transition-all hover:scale-110 cursor-pointer ${getColor(value)}`}
                            title={value > 0 ? 
                              heatmapMode === 'productivity' ? `€${value.toFixed(2)}/ora` : 
                              heatmapMode === 'revenue' ? `€${value.toFixed(2)}` :
                              `${value.toFixed(1)}h` : 'Nessun dato'}>

                              {value > 0 ? 
                                heatmapMode === 'hours' ? `${value.toFixed(1)}h` : `€${value.toFixed(0)}` 
                                : '-'}
                            </td>);

                      })}
                      </tr>
                    )}
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
              </div>);

          })()}
        </NeumorphicCard>

        {/* Heatmap Cell Detail Modal */}
        {selectedHeatmapCell &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#6b6b6b]">Dettaglio Slot</h3>
                <button
                onClick={() => setSelectedHeatmapCell(null)}
                className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors">

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
        }

        {/* Insights e Suggerimenti */}
        <NeumorphicCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-[#6b6b6b]">Insights e Suggerimenti</h3>
          </div>
          {(() => {
            const insights = [];
            
            // Funzione per verificare se uno slot è negli orari di apertura (esclude slot che iniziano all'orario di chiusura o dopo)
            const isInOpeningHours = (slot) => {
              const slotMatch = slot.match(/(\d{2}):(\d{2})/);
              if (!slotMatch) return true;
              
              const slotHours = parseInt(slotMatch[1]);
              const slotMinutes = parseInt(slotMatch[2]);
              const slotMinutesTotal = slotHours * 60 + slotMinutes;
              
              const [openHours, openMinutes] = orarioApertura.split(':').map(Number);
              const openMinutesTotal = openHours * 60 + openMinutes;
              
              const [closeHours, closeMinutes] = orarioChiusura.split(':').map(Number);
              const closeMinutesTotal = closeHours * 60 + closeMinutes;
              
              // Slot deve iniziare >= apertura e PRIMA della chiusura (non all'orario di chiusura)
              return slotMinutesTotal >= openMinutesTotal && slotMinutesTotal < closeMinutesTotal;
            };

            // Analizza heatmap per trovare slot con bassa produttività ma alte ore (SOLO negli orari di apertura)
            const lowProductivitySlots = heatmapData.flatMap(row => 
              Object.entries(row.metadata || {})
                .map(([slot, data]) => ({
                  day: row.day,
                  slot,
                  productivity: data.productivity,
                  avgHours: data.avgHours,
                  avgRevenue: data.avgRevenue
                }))
                .filter(item => item.avgHours > 0 && item.productivity < 30 && isInOpeningHours(item.slot))
            ).sort((a, b) => a.productivity - b.productivity).slice(0, 5);

            if (lowProductivitySlots.length > 0) {
              const totalHoursToReduce = lowProductivitySlots.reduce((sum, s) => sum + s.avgHours, 0);
              const potentialSavingsPerWeek = totalHoursToReduce * 12; // Assumendo €12/ora costo medio
              const potentialSavingsPerMonth = lowProductivitySlots.length * 12 * 4; // 1h per slot, 4 settimane
              
              insights.push({
                type: 'warning',
                icon: AlertTriangle,
                title: '💰 Opportunità Riduzione Personale',
                description: `${lowProductivitySlots.length} slot con bassa produttività (<€30/ora) negli orari di apertura`,
                details: [
                  ...lowProductivitySlots.map(s => 
                    `${s.day} alle ${s.slot}: €${s.productivity.toFixed(2)}/h con ${s.avgHours.toFixed(1)}h lavorate (revenue: €${s.avgRevenue.toFixed(0)})`
                  ),
                  '',
                  `📊 Riducendo 1h in ciascuno slot = risparmio €${potentialSavingsPerMonth.toFixed(0)}/mese`,
                  `📈 Totale ore attualmente lavorate in questi slot: ${totalHoursToReduce.toFixed(1)}h/settimana`
                ],
                suggestion: `Considera di ridurre gradualmente il personale in questi ${lowProductivitySlots.length} slot durante gli orari di apertura (${orarioApertura}-${orarioChiusura}). Risparmio stimato: €${potentialSavingsPerMonth.toFixed(0)}/mese.`
              });
            }

            // Analizza slot con alta produttività (SOLO negli orari di apertura)
            const highProductivitySlots = heatmapData.flatMap(row => 
              Object.entries(row.metadata || {})
                .map(([slot, data]) => ({
                  day: row.day,
                  slot,
                  productivity: data.productivity,
                  avgHours: data.avgHours,
                  avgRevenue: data.avgRevenue
                }))
                .filter(item => item.avgHours > 0 && item.productivity > 60 && isInOpeningHours(item.slot))
            ).sort((a, b) => b.productivity - a.productivity).slice(0, 3);

            if (highProductivitySlots.length > 0) {
              insights.push({
                type: 'success',
                icon: TrendingUp,
                title: 'Slot ad Alta Produttività',
                description: `${highProductivitySlots.length} slot con produttività >€60/ora rilevati`,
                details: highProductivitySlots.map(s => 
                  `${s.day} ${s.slot}: €${s.productivity.toFixed(2)}/h (${s.avgHours.toFixed(1)}h lavorate)`
                ),
                suggestion: 'Valuta di aumentare le ore lavorate in questi slot per massimizzare il fatturato.'
              });
            }

            // Confronto produttività tra negozi
            const storeProdArray = Object.entries(storeProductivity).map(([storeId, data]) => {
              const store = stores.find(s => s.id === storeId);
              const monthlyData = Object.values(data.monthly);
              const avgProd = monthlyData.length > 0 ? 
                monthlyData.reduce((sum, m) => sum + m.productivity, 0) / monthlyData.length : 0;
              return { storeName: store?.name || 'N/A', avgProd };
            }).sort((a, b) => b.avgProd - a.avgProd);

            if (storeProdArray.length > 1) {
              const best = storeProdArray[0];
              const worst = storeProdArray[storeProdArray.length - 1];
              const diff = ((best.avgProd - worst.avgProd) / worst.avgProd * 100);
              
              if (diff > 20) {
                insights.push({
                  type: 'info',
                  icon: Store,
                  title: 'Gap Produttività tra Negozi',
                  description: `${best.storeName} ha una produttività ${diff.toFixed(0)}% superiore a ${worst.storeName}`,
                  details: [
                    `${best.storeName}: €${best.avgProd.toFixed(2)}/h`,
                    `${worst.storeName}: €${worst.avgProd.toFixed(2)}/h`
                  ],
                  suggestion: `Analizza le best practice di ${best.storeName} e applicale a ${worst.storeName}.`
                });
              }
            }

            // Filtra insights per considerare solo slot negli orari di apertura
            const filteredInsights = insights.filter(insight => {
              // Se ha details, verifica che almeno uno sia negli orari di apertura
              if (insight.details && insight.details.length > 0) {
                return insight.details.some(detail => {
                  const slotMatch = detail.match(/(\d{2}:\d{2})/);
                  if (slotMatch) {
                    const slotTime = slotMatch[1];
                    const [hours, minutes] = slotTime.split(':').map(Number);
                    const slotMinutes = hours * 60 + minutes;
                    
                    const [openHours, openMinutes] = orarioApertura.split(':').map(Number);
                    const openMinutes24 = openHours * 60 + openMinutes;
                    
                    const [closeHours, closeMinutes] = orarioChiusura.split(':').map(Number);
                    const closeMinutes24 = closeHours * 60 + closeMinutes;
                    
                    return slotMinutes >= openMinutes24 && slotMinutes <= closeMinutes24;
                  }
                  return true;
                });
              }
              return true;
            });

            return filteredInsights.length > 0 ? (
              <div className="space-y-3">
                {filteredInsights.map((insight, idx) => (
                  <div key={idx} className={`neumorphic-pressed p-4 rounded-xl ${
                    insight.type === 'warning' ? 'bg-orange-50' :
                    insight.type === 'success' ? 'bg-green-50' :
                    'bg-blue-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      <insight.icon className={`w-5 h-5 flex-shrink-0 ${
                        insight.type === 'warning' ? 'text-orange-600' :
                        insight.type === 'success' ? 'text-green-600' :
                        'text-blue-600'
                      }`} />
                      <div className="flex-1">
                        <h4 className="font-bold text-[#6b6b6b] text-sm mb-1">{insight.title}</h4>
                        <p className="text-xs text-[#9b9b9b] mb-2">{insight.description}</p>
                        {insight.details && (
                          <ul className="text-xs text-[#6b6b6b] space-y-1 mb-2">
                            {insight.details.map((detail, i) => (
                              <li key={i}>• {detail}</li>
                            ))}
                          </ul>
                        )}
                        <div className="neumorphic-flat p-2 rounded-lg bg-white/50">
                          <p className="text-xs text-[#6b6b6b]">
                            <strong>Suggerimento:</strong> {insight.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#9b9b9b] py-4 text-sm">
                Nessun insight disponibile. Continua a raccogliere dati per ricevere suggerimenti.
              </p>
            );
          })()}
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
          {Object.keys(storeProductivity).length > 0 ?
          <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Settimana</th>
                    {Object.values(storeProductivity).map((store) =>
                  <th key={store.name} className="text-right p-3 text-[#9b9b9b] font-medium">{store.name}</th>
                  )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                  const allWeeks = new Set();
                  Object.values(storeProductivity).forEach((store) => {
                    Object.keys(store.weekly).forEach((week) => allWeeks.add(week));
                  });
                  const sortedWeeks = Array.from(allWeeks).sort().reverse();

                  return sortedWeeks.map((week) =>
                  <tr key={week} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                        <td className="p-3 text-[#6b6b6b] font-medium">
                          {format(parseISO(week), "'Sett.' w - dd/MM", { locale: it })}
                        </td>
                        {Object.values(storeProductivity).map((store) => {
                      const data = store.weekly[week];
                      return (
                        <td key={store.name} className="p-3 text-right">
                              {data ?
                          <div className="space-y-1">
                                  <span className="font-bold text-green-600">
                                    €{data.productivity.toFixed(2)}/h
                                  </span>
                                  <div className="text-xs text-[#9b9b9b]">
                                    €{data.revenue.toFixed(0)} / {data.hours.toFixed(0)}h
                                  </div>
                                </div> :

                          <span className="text-[#9b9b9b]">-</span>
                          }
                            </td>);

                    })}
                      </tr>
                  );
                })()}
                </tbody>
              </table>
            </div> :

          <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          }
        </NeumorphicCard>

        {/* Produttività Giornaliera per Negozio - Collapsabile */}
        <NeumorphicCard className="p-6">
          <button 
            onClick={() => setCollapsedSections(prev => ({ ...prev, produttivitaGiornaliera: !prev.produttivitaGiornaliera }))}
            className="w-full flex items-center justify-between mb-4"
          >
            <div>
              <h3 className="text-lg font-bold text-[#6b6b6b] text-left">Produttività Giornaliera per Negozio</h3>
              <p className="text-sm text-[#9b9b9b] text-left">Fatturato, ore lavorate e produttività per ogni giorno</p>
            </div>
            {collapsedSections.produttivitaGiornaliera ? 
              <ChevronRight className="w-5 h-5 text-[#9b9b9b]" /> : 
              <ChevronDown className="w-5 h-5 text-[#9b9b9b]" />
            }
          </button>
          {!collapsedSections.produttivitaGiornaliera && (
            dailyProductivity.length > 0 ?
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
                    {dailyProductivity.map((record) =>
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
                  )}
                  </tbody>
                </table>
              </div> :
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          )}
        </NeumorphicCard>

        {/* Store Productivity Comparison - Monthly - Collapsabile */}
        <NeumorphicCard className="p-6">
          <button 
            onClick={() => setCollapsedSections(prev => ({ ...prev, produttivitaMensile: !prev.produttivitaMensile }))}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#6b6b6b]" />
              <div className="text-left">
                <h3 className="text-lg font-bold text-[#6b6b6b]">Produttività Mensile per Negozio</h3>
                <p className="text-sm text-[#9b9b9b]">€/ora per mese - confronto tra negozi</p>
              </div>
            </div>
            {collapsedSections.produttivitaMensile ? 
              <ChevronRight className="w-5 h-5 text-[#9b9b9b]" /> : 
              <ChevronDown className="w-5 h-5 text-[#9b9b9b]" />
            }
          </button>
          {!collapsedSections.produttivitaMensile && (
            Object.keys(storeProductivity).length > 0 ?
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Mese</th>
                    {Object.values(storeProductivity).map((store) =>
                  <th key={store.name} className="text-right p-3 text-[#9b9b9b] font-medium">{store.name}</th>
                  )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                  const allMonths = new Set();
                  Object.values(storeProductivity).forEach((store) => {
                    Object.keys(store.monthly).forEach((month) => allMonths.add(month));
                  });
                  const sortedMonths = Array.from(allMonths).sort().reverse();

                  return sortedMonths.map((month) =>
                  <tr key={month} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                        <td className="p-3 text-[#6b6b6b] font-medium">
                          {format(parseISO(month + '-01'), 'MMMM yyyy', { locale: it })}
                        </td>
                        {Object.values(storeProductivity).map((store) => {
                      const data = store.monthly[month];
                      return (
                        <td key={store.name} className="p-3 text-right">
                              {data ?
                          <div className="space-y-1">
                                  <span className="font-bold text-green-600">
                                    €{data.productivity.toFixed(2)}/h
                                  </span>
                                  <div className="text-xs text-[#9b9b9b]">
                                    €{data.revenue.toFixed(0)} / {data.hours.toFixed(0)}h
                                  </div>
                                </div> :

                          <span className="text-[#9b9b9b]">-</span>
                          }
                            </td>);

                    })}
                      </tr>
                  );
                })()}
                </tbody>
              </table>
            </div> :

          <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          )}
        </NeumorphicCard>

        {/* Raw Data Table - Collapsabile */}
        <NeumorphicCard className="p-6">
          <button 
            onClick={() => setCollapsedSections(prev => ({ ...prev, datiRaw: !prev.datiRaw }))}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="text-left">
              <h3 className="text-lg font-bold text-[#6b6b6b]">Dati Raw da Zapier</h3>
              <p className="text-sm text-[#9b9b9b]">Tutti i record caricati ({filteredData.length} record)</p>
            </div>
            {collapsedSections.datiRaw ? 
              <ChevronRight className="w-5 h-5 text-[#9b9b9b]" /> : 
              <ChevronDown className="w-5 h-5 text-[#9b9b9b]" />
            }
          </button>
          {!collapsedSections.datiRaw && (
            filteredData.length > 0 ?
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
                      </tr>);

                })}
                </tbody>
                </table>
                </div> :
                <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
                )}
                </NeumorphicCard>

        {/* Settings Modal */}
        {showSettings &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#6b6b6b]">Impostazioni Produttività</h3>
                <button
                onClick={() => setShowSettings(false)}
                className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors">

                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Orari Apertura/Chiusura */}
                <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50">
                  <h4 className="font-bold text-[#6b6b6b] mb-3">Orari Standard Negozi</h4>
                  <p className="text-xs text-[#9b9b9b] mb-3">
                    Gli orari fuori da questo range sono considerati di preparazione e non vengono ottimizzati negli insights
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#6b6b6b] mb-1 block font-medium">Apertura</label>
                      <input
                        type="time"
                        value={orarioApertura}
                        onChange={(e) => setOrarioApertura(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-blue-300 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6b6b6b] mb-1 block font-medium">Chiusura</label>
                      <input
                        type="time"
                        value={orarioChiusura}
                        onChange={(e) => setOrarioChiusura(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-blue-300 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl">
                  <h4 className="font-bold text-[#6b6b6b] mb-3">Tipi di Turno da Includere</h4>
                  <p className="text-xs text-[#9b9b9b] mb-3">
                    Seleziona quali tipi di turno includere nel calcolo delle ore lavorate
                  </p>
                  <div className="space-y-2">
                    {availableTipiTurno.length > 0 ?
                  availableTipiTurno.map((tipo) =>
                  <label key={tipo.nome} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                          <input
                      type="checkbox"
                      checked={includedTipiTurno.includes(tipo.nome)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setIncludedTipiTurno((prev) => [...prev, tipo.nome]);
                        } else {
                          setIncludedTipiTurno((prev) => prev.filter((t) => t !== tipo.nome));
                        }
                      }}
                      className="w-5 h-5 rounded flex-shrink-0" />

                          <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: tipo.colore }} />

                          <span className="font-medium text-[#6b6b6b] text-sm">{tipo.nome}</span>
                        </label>
                  ) :

                  <p className="text-sm text-slate-500 text-center py-4">
                        Nessun tipo di turno trovato nei turni esistenti.
                      </p>
                  }
                  </div>
                  {includedTipiTurno.length === 0 &&
                <p className="text-xs text-red-600 mt-2">
                      ⚠️ Seleziona almeno un tipo di turno
                    </p>
                }
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50">
                  <p className="text-xs text-blue-700">
                    <strong>Nota:</strong> I filtri si applicano a tutti i grafici e calcoli di questa pagina.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-3 neumorphic-flat text-[#6b6b6b] rounded-xl font-medium hover:bg-slate-100 transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    saveConfigMutation.mutate({
                      orario_apertura: orarioApertura,
                      orario_chiusura: orarioChiusura,
                      tipi_turno_inclusi: includedTipiTurno
                    });
                  }}
                  disabled={saveConfigMutation.isPending || includedTipiTurno.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveConfigMutation.isPending ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </NeumorphicCard>
          </div>
        }
      </div>
    </ProtectedPage>);

}