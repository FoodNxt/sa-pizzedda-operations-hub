import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Calendar,
  AlertCircle,
  TrendingUp,
  Sun,
  Moon,
  Coffee,
  XCircle,
  Filter
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, parseISO, isValid, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

export default function OreLavorate() {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'month'

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date'),
  });

  // Filter shifts for current user
  const myShifts = useMemo(() => {
    if (!user || !shifts.length) return [];
    const userDisplayName = (user.nome_cognome || user.full_name)?.toLowerCase().trim();
    return shifts.filter(s =>
      s.employee_name?.toLowerCase().trim() === userDisplayName
    ).sort((a, b) => new Date(b.shift_date) - new Date(a.shift_date));
  }, [user, shifts]);

  // Calculate previous month data
  const previousMonthData = useMemo(() => {
    const now = new Date();
    const prevMonth = subMonths(now, 1);
    const monthStart = startOfMonth(prevMonth);
    const monthEnd = endOfMonth(prevMonth);

    const monthShifts = myShifts.filter(s => {
      try {
        const shiftDate = new Date(s.shift_date);
        return shiftDate >= monthStart && shiftDate <= monthEnd;
      } catch (e) {
        return false;
      }
    });

    const totalScheduledMinutes = monthShifts.reduce((sum, s) => sum + (s.scheduled_minutes || 0), 0);
    const totalActualMinutes = monthShifts.reduce((sum, s) => sum + (s.actual_minutes || 0), 0);
    const lateShifts = monthShifts.filter(s => s.ritardo === true);
    const totalLateMinutes = lateShifts.reduce((sum, s) => sum + (s.minuti_di_ritardo || 0), 0);
    const missingClockIns = monthShifts.filter(s => s.timbratura_mancata === true);
    
    // Count by shift type
    const ferie = monthShifts.filter(s => s.shift_type?.toLowerCase().includes('ferie')).length;
    const malattia = monthShifts.filter(s => s.shift_type?.toLowerCase().includes('malattia')).length;
    const straordinari = monthShifts.filter(s => s.shift_type?.toLowerCase().includes('straordinario')).length;
    const assenzaNonRetribuita = monthShifts.filter(s => 
      s.shift_type?.toLowerCase().includes('assenza') && 
      !s.shift_type?.toLowerCase().includes('retribuita')
    ).length;

    return {
      monthName: format(prevMonth, 'MMMM yyyy', { locale: it }),
      totalShifts: monthShifts.length,
      totalScheduledHours: (totalScheduledMinutes / 60).toFixed(1),
      totalActualHours: (totalActualMinutes / 60).toFixed(1),
      lateCount: lateShifts.length,
      totalLateMinutes,
      missingClockIns: missingClockIns.length,
      ferie,
      malattia,
      straordinari,
      assenzaNonRetribuita
    };
  }, [myShifts]);

  const safeFormatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'N/A';
      return format(date, 'dd/MM/yyyy', { locale: it });
    } catch (e) {
      return 'N/A';
    }
  };

  const safeFormatTime = (dateTimeString) => {
    if (!dateTimeString) return '--:--';
    try {
      const date = new Date(dateTimeString);
      if (!isValid(date)) return '--:--';
      return format(date, 'HH:mm');
    } catch (e) {
      return '--:--';
    }
  };

  const getShiftTypeBadge = (shiftType) => {
    if (!shiftType) return null;
    const type = shiftType.toLowerCase();
    if (type.includes('ferie')) return { color: 'bg-blue-100 text-blue-700', icon: Sun };
    if (type.includes('malattia')) return { color: 'bg-yellow-100 text-yellow-700', icon: Coffee };
    if (type.includes('straordinario')) return { color: 'bg-green-100 text-green-700', icon: TrendingUp };
    if (type.includes('assenza')) return { color: 'bg-red-100 text-red-700', icon: XCircle };
    return { color: 'bg-gray-100 text-gray-700', icon: Clock };
  };

  if (userLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <NeumorphicCard className="p-8">
          <p className="text-slate-500">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Ore Lavorate</h1>
        <p className="text-[#9b9b9b]">Visualizza i tuoi turni, ore lavorate e assenze</p>
      </div>

      {/* View Mode Selector */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <span className="text-sm font-medium text-[#6b6b6b]">Visualizza:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'neumorphic-flat text-[#6b6b6b]'
              }`}
            >
              Lista Turni
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'neumorphic-flat text-[#6b6b6b]'
              }`}
            >
              Mese Precedente
            </button>
          </div>
        </div>
      </NeumorphicCard>

      {viewMode === 'month' ? (
        /* Previous Month Summary View */
        <div className="space-y-6">
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#8b7355]" />
              Riepilogo {previousMonthData.monthName}
            </h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#6b6b6b]">{previousMonthData.totalActualHours}h</p>
                <p className="text-xs text-[#9b9b9b]">Ore Lavorate</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#6b6b6b]">{previousMonthData.totalShifts}</p>
                <p className="text-xs text-[#9b9b9b]">Turni Totali</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{previousMonthData.lateCount}</p>
                <p className="text-xs text-[#9b9b9b]">Ritardi</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <XCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{previousMonthData.missingClockIns}</p>
                <p className="text-xs text-[#9b9b9b]">Timb. Mancanti</p>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-[#6b6b6b]">Ferie</span>
                </div>
                <p className="text-xl font-bold text-blue-600">{previousMonthData.ferie} giorni</p>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Coffee className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-[#6b6b6b]">Malattia</span>
                </div>
                <p className="text-xl font-bold text-yellow-600">{previousMonthData.malattia} giorni</p>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-[#6b6b6b]">Straordinari</span>
                </div>
                <p className="text-xl font-bold text-green-600">{previousMonthData.straordinari} turni</p>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-[#6b6b6b]">Assenze N.R.</span>
                </div>
                <p className="text-xl font-bold text-red-600">{previousMonthData.assenzaNonRetribuita} giorni</p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 neumorphic-pressed p-4 rounded-xl bg-blue-50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#9b9b9b]">Ore Previste</p>
                  <p className="font-bold text-[#6b6b6b]">{previousMonthData.totalScheduledHours}h</p>
                </div>
                <div>
                  <p className="text-[#9b9b9b]">Minuti Ritardo Totali</p>
                  <p className="font-bold text-red-600">{previousMonthData.totalLateMinutes} min</p>
                </div>
              </div>
            </div>
          </NeumorphicCard>
        </div>
      ) : (
        /* Shift List View */
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#8b7355]" />
            I Tuoi Turni
          </h2>

          {myShifts.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {myShifts.slice(0, 50).map((shift, index) => {
                const badge = getShiftTypeBadge(shift.shift_type);
                const BadgeIcon = badge?.icon || Clock;

                return (
                  <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="neumorphic-flat w-12 h-12 rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-[#8b7355]" />
                        </div>
                        <div>
                          <p className="font-bold text-[#6b6b6b]">{safeFormatDate(shift.shift_date)}</p>
                          <p className="text-sm text-[#9b9b9b]">{shift.store_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {shift.ritardo && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                            +{shift.minuti_di_ritardo || 0} min
                          </span>
                        )}
                        {shift.timbratura_mancata && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                            Non timbrato
                          </span>
                        )}
                        {badge && shift.shift_type && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${badge.color}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {shift.shift_type}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="neumorphic-flat p-2 rounded-lg">
                        <p className="text-xs text-[#9b9b9b]">Orario Previsto</p>
                        <p className="font-medium text-[#6b6b6b]">
                          {safeFormatTime(shift.scheduled_start)} - {safeFormatTime(shift.scheduled_end)}
                        </p>
                      </div>

                      <div className="neumorphic-flat p-2 rounded-lg">
                        <p className="text-xs text-[#9b9b9b]">Orario Effettivo</p>
                        <p className="font-medium text-[#6b6b6b]">
                          {safeFormatTime(shift.actual_start)} - {safeFormatTime(shift.actual_end)}
                        </p>
                      </div>

                      <div className="neumorphic-flat p-2 rounded-lg">
                        <p className="text-xs text-[#9b9b9b]">Ore Previste</p>
                        <p className="font-medium text-[#6b6b6b]">
                          {shift.scheduled_minutes ? (shift.scheduled_minutes / 60).toFixed(1) : '--'}h
                        </p>
                      </div>

                      <div className="neumorphic-flat p-2 rounded-lg">
                        <p className="text-xs text-[#9b9b9b]">Ore Effettive</p>
                        <p className="font-medium text-[#6b6b6b]">
                          {shift.actual_minutes ? (shift.actual_minutes / 60).toFixed(1) : '--'}h
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
              <p className="text-[#9b9b9b]">Nessun turno trovato</p>
            </div>
          )}
        </NeumorphicCard>
      )}
    </div>
  );
}