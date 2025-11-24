import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  Sun,
  Coffee,
  XCircle,
  Filter,
  List,
  BarChart3
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isValid, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function OreLavorate() {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'month'
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser-ore'],
    queryFn: async () => {
      const u = await base44.auth.me();
      setCurrentUser(u);
      return u;
    },
  });

  // Fetch shifts
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts-ore'],
    queryFn: () => base44.entities.Shift.list('-shift_date'),
  });

  // Helper functions
  const safeFormatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'N/A';
      return format(date, 'dd MMM yyyy', { locale: it });
    } catch (e) {
      return 'N/A';
    }
  };

  const safeFormatTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      if (!isValid(date)) return 'N/A';
      return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'N/A';
    }
  };

  const formatMinutesToHours = (minutes) => {
    if (!minutes || minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

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
    const ferieShifts = monthShifts.filter(s => s.shift_type?.toLowerCase().includes('ferie'));
    const straordinariShifts = monthShifts.filter(s => s.shift_type?.toLowerCase().includes('straordinari'));
    const assenzeShifts = monthShifts.filter(s => 
      s.shift_type?.toLowerCase().includes('assenza') && 
      !s.shift_type?.toLowerCase().includes('retribuit')
    );

    return {
      monthName: format(prevMonth, 'MMMM yyyy', { locale: it }),
      totalShifts: monthShifts.length,
      totalScheduledMinutes,
      totalActualMinutes,
      lateCount: lateShifts.length,
      totalLateMinutes,
      missingClockIns: missingClockIns.length,
      ferieCount: ferieShifts.length,
      straordinariCount: straordinariShifts.length,
      assenzeCount: assenzeShifts.length,
      shifts: monthShifts
    };
  }, [myShifts]);

  // Get shift type badge
  const getShiftTypeBadge = (shiftType) => {
    if (!shiftType) return null;
    const type = shiftType.toLowerCase();
    if (type.includes('ferie')) {
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Ferie</span>;
    }
    if (type.includes('straordinari')) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Straordinario</span>;
    }
    if (type.includes('malattia')) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Malattia</span>;
    }
    if (type.includes('assenza')) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Assenza</span>;
    }
    return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{shiftType}</span>;
  };

  if (userLoading || shiftsLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <NeumorphicCard className="p-8">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          Ore Lavorate
        </h1>
        <p className="text-sm text-slate-500">I tuoi turni, ore lavorate e statistiche</p>
      </div>

      {/* View Mode Selector */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <span className="text-sm font-medium text-slate-700">Visualizza:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'neumorphic-flat text-slate-700'
              }`}
            >
              <List className="w-4 h-4" />
              Lista Turni
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'neumorphic-flat text-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Mese Precedente
            </button>
          </div>
        </div>
      </NeumorphicCard>

      {viewMode === 'month' ? (
        /* Previous Month Summary View */
        <>
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#8b7355]" />
              Riepilogo {previousMonthData.monthName}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">{previousMonthData.totalShifts}</p>
                <p className="text-xs text-slate-500">Turni Totali</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">{formatMinutesToHours(previousMonthData.totalActualMinutes)}</p>
                <p className="text-xs text-slate-500">Ore Lavorate</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{previousMonthData.lateCount}</p>
                <p className="text-xs text-slate-500">Ritardi</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <XCircle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{previousMonthData.missingClockIns}</p>
                <p className="text-xs text-slate-500">Timb. Mancanti</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-slate-700">Ferie</span>
                </div>
                <p className="text-xl font-bold text-green-600">{previousMonthData.ferieCount} giorni</p>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Coffee className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Straordinari</span>
                </div>
                <p className="text-xl font-bold text-blue-600">{previousMonthData.straordinariCount} turni</p>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-slate-700">Assenze N.R.</span>
                </div>
                <p className="text-xl font-bold text-red-600">{previousMonthData.assenzeCount} giorni</p>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-slate-700">Min. Ritardo</span>
                </div>
                <p className="text-xl font-bold text-red-600">{previousMonthData.totalLateMinutes} min</p>
              </div>
            </div>
          </NeumorphicCard>

          {/* Previous Month Shifts List */}
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Dettaglio Turni - {previousMonthData.monthName}</h3>
            
            {previousMonthData.shifts.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {previousMonthData.shifts.map((shift, index) => (
                  <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-800">{safeFormatDate(shift.shift_date)}</span>
                        {shift.store_name && <span className="text-sm text-slate-500">• {shift.store_name}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {getShiftTypeBadge(shift.shift_type)}
                        {shift.ritardo && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            +{shift.minuti_di_ritardo || 0}min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span><strong>Previsto:</strong> {safeFormatTime(shift.scheduled_start)} - {safeFormatTime(shift.scheduled_end)}</span>
                      {shift.actual_start && (
                        <span className="ml-4"><strong>Effettivo:</strong> {safeFormatTime(shift.actual_start)} - {safeFormatTime(shift.actual_end)}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Durata: {formatMinutesToHours(shift.actual_minutes || shift.scheduled_minutes || 0)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nessun turno nel mese precedente</p>
            )}
          </NeumorphicCard>
        </>
      ) : (
        /* List View - All Shifts */
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NeumorphicCard className="p-4 text-center">
              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-slate-800">{myShifts.length}</p>
              <p className="text-xs text-slate-500">Turni Totali</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-slate-800">
                {formatMinutesToHours(myShifts.reduce((sum, s) => sum + (s.actual_minutes || 0), 0))}
              </p>
              <p className="text-xs text-slate-500">Ore Totali</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-4 text-center">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-red-600">{myShifts.filter(s => s.ritardo).length}</p>
              <p className="text-xs text-slate-500">Ritardi</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-4 text-center">
              <XCircle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-orange-600">{myShifts.filter(s => s.timbratura_mancata).length}</p>
              <p className="text-xs text-slate-500">Timb. Mancanti</p>
            </NeumorphicCard>
          </div>

          {/* All Shifts List */}
          <NeumorphicCard className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <List className="w-5 h-5 text-[#8b7355]" />
              Tutti i Turni
            </h2>

            {myShifts.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {myShifts.map((shift, index) => (
                  <div 
                    key={`${shift.id}-${index}`} 
                    className={`neumorphic-pressed p-4 rounded-xl ${
                      shift.ritardo ? 'border-l-4 border-red-400' : 
                      shift.timbratura_mancata ? 'border-l-4 border-orange-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-800">{safeFormatDate(shift.shift_date)}</span>
                        {shift.store_name && <span className="text-sm text-slate-500">• {shift.store_name}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {getShiftTypeBadge(shift.shift_type)}
                        {shift.ritardo && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            Ritardo +{shift.minuti_di_ritardo || 0}min
                          </span>
                        )}
                        {shift.timbratura_mancata && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            Non Timbrato
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="text-slate-600">
                        <strong>Previsto:</strong> {safeFormatTime(shift.scheduled_start)} - {safeFormatTime(shift.scheduled_end)}
                      </div>
                      {shift.actual_start && (
                        <div className="text-slate-600">
                          <strong>Effettivo:</strong> {safeFormatTime(shift.actual_start)} - {safeFormatTime(shift.actual_end)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">
                        Durata prevista: {formatMinutesToHours(shift.scheduled_minutes || 0)}
                      </span>
                      {shift.actual_minutes && (
                        <span className="text-xs text-slate-700 font-medium">
                          Durata effettiva: {formatMinutesToHours(shift.actual_minutes)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun turno registrato</p>
              </div>
            )}
          </NeumorphicCard>
        </>
      )}
    </div>
  );
}