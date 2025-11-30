import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Calendar,
  AlertCircle,
  TrendingUp,
  Sun,
  Coffee,
  XCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  CheckCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, isValid, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

export default function OreLavorate() {
  const [expandedSections, setExpandedSections] = useState({});

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

  // Filter shifts for current user and remove duplicates
  const myShifts = useMemo(() => {
    if (!user || !shifts.length) return [];
    const userDisplayName = (user.nome_cognome || user.full_name)?.toLowerCase().trim();
    const userShifts = shifts.filter(s =>
      s.employee_name?.toLowerCase().trim() === userDisplayName
    );
    
    // Remove duplicates based on date + scheduled start time only
    const seen = new Set();
    const uniqueShifts = userShifts.filter(s => {
      const startTime = s.scheduled_start ? new Date(s.scheduled_start).toTimeString().slice(0, 5) : '';
      const key = `${s.shift_date}_${startTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    return uniqueShifts.sort((a, b) => new Date(b.shift_date) - new Date(a.shift_date));
  }, [user, shifts]);

  // Calculate previous month data with detailed breakdown
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

    // Categorize shifts
    const turniBase = monthShifts.filter(s => {
      const type = (s.shift_type || '').toLowerCase();
      return !type.includes('straordinario') && !type.includes('ferie') && 
             !type.includes('malattia') && !type.includes('assenza');
    });

    const turniStraordinari = monthShifts.filter(s => 
      (s.shift_type || '').toLowerCase().includes('straordinario')
    );

    const turniFerie = monthShifts.filter(s => 
      (s.shift_type || '').toLowerCase().includes('ferie')
    );

    const turniMalattia = monthShifts.filter(s => 
      (s.shift_type || '').toLowerCase().includes('malattia')
    );

    const turniAssenza = monthShifts.filter(s => 
      (s.shift_type || '').toLowerCase().includes('assenza')
    );

    // Calculate hours
    const oreBase = turniBase.reduce((sum, s) => sum + (s.scheduled_minutes || 0), 0) / 60;
    const oreStraordinari = turniStraordinari.reduce((sum, s) => sum + (s.scheduled_minutes || 0), 0) / 60;
    const oreFerie = turniFerie.reduce((sum, s) => sum + (s.scheduled_minutes || 0), 0) / 60;
    const oreMalattia = turniMalattia.reduce((sum, s) => sum + (s.scheduled_minutes || 0), 0) / 60;
    
    // Calculate delays
    const lateShifts = monthShifts.filter(s => s.ritardo === true);
    const totalLateMinutes = lateShifts.reduce((sum, s) => sum + (s.minuti_di_ritardo || 0), 0);
    const oreRitardo = totalLateMinutes / 60;

    // Calculate assenza (ore non retribuite)
    const oreAssenza = turniAssenza.reduce((sum, s) => sum + (s.scheduled_minutes || 0), 0) / 60;

    // Total
    const oreTotali = oreBase + oreStraordinari + oreFerie + oreMalattia - oreRitardo - oreAssenza;

    return {
      monthName: format(prevMonth, 'MMMM yyyy', { locale: it }),
      monthStart,
      monthEnd,
      oreBase,
      oreStraordinari,
      oreFerie,
      oreMalattia,
      oreRitardo,
      oreAssenza,
      oreTotali,
      turniBase,
      turniStraordinari,
      turniFerie,
      turniMalattia,
      turniAssenza,
      lateShifts
    };
  }, [myShifts]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  if (userLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <NeumorphicCard className="p-8">
          <p className="text-slate-500">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  const renderShiftDetails = (shifts, type) => {
    if (!shifts || shifts.length === 0) {
      return (
        <p className="text-sm text-slate-400 italic py-2">Nessun turno in questa categoria</p>
      );
    }

    return (
      <div className="space-y-2 mt-3">
        {shifts.map((shift, index) => (
          <div key={`${shift.id}-${index}`} className="neumorphic-flat p-3 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="neumorphic-pressed w-10 h-10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#8b7355]" />
                </div>
                <div>
                  <p className="font-medium text-[#6b6b6b]">{safeFormatDate(shift.shift_date)}</p>
                  <p className="text-xs text-[#9b9b9b]">{shift.store_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-[#6b6b6b]">
                  {safeFormatTime(shift.scheduled_start)} - {safeFormatTime(shift.scheduled_end)}
                </p>
                <p className="text-xs text-[#9b9b9b]">
                  {shift.scheduled_minutes ? (shift.scheduled_minutes / 60).toFixed(1) : '--'}h
                </p>
              </div>
            </div>
            {type === 'ritardo' && shift.minuti_di_ritardo > 0 && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                Ritardo: +{shift.minuti_di_ritardo} minuti
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const HourRow = ({ label, hours, icon: Icon, color, bgColor, isAddition = true, shifts, sectionKey }) => {
    const isExpanded = expandedSections[sectionKey];
    const hasShifts = shifts && shifts.length > 0;
    
    return (
      <div className="mb-3">
        <div 
          className={`neumorphic-pressed p-4 rounded-xl ${bgColor} cursor-pointer`}
          onClick={() => hasShifts && toggleSection(sectionKey)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasShifts ? (
                isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                )
              ) : (
                <div className="w-5" />
              )}
              <div className={`neumorphic-flat w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="font-medium text-[#6b6b6b]">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${color}`}>
                {isAddition ? <Plus className="w-4 h-4 inline" /> : <Minus className="w-4 h-4 inline" />}
                {' '}{hours.toFixed(1)}h
              </span>
              {hasShifts && (
                <span className="text-xs text-slate-400">({shifts.length} turni)</span>
              )}
            </div>
          </div>
        </div>
        
        {isExpanded && hasShifts && (
          <div className="ml-8 mt-2">
            {renderShiftDetails(shifts, sectionKey)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Ore Lavorate</h1>
        <p className="text-[#9b9b9b]">Riepilogo dettagliato delle ore per {previousMonthData.monthName}</p>
      </div>

      {/* Main Card - Vertical Breakdown */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#8b7355]" />
          Dettaglio Ore - {previousMonthData.monthName}
        </h2>

        {/* Hours Breakdown */}
        <div className="space-y-2">
          {/* Additions */}
          <HourRow 
            label="Ore Turni Base"
            hours={previousMonthData.oreBase}
            icon={Clock}
            color="text-blue-600"
            bgColor="bg-blue-50"
            isAddition={true}
            shifts={previousMonthData.turniBase}
            sectionKey="base"
          />
          
          <HourRow 
            label="Ore Straordinari"
            hours={previousMonthData.oreStraordinari}
            icon={TrendingUp}
            color="text-green-600"
            bgColor="bg-green-50"
            isAddition={true}
            shifts={previousMonthData.turniStraordinari}
            sectionKey="straordinari"
          />
          
          <HourRow 
            label="Ore Ferie"
            hours={previousMonthData.oreFerie}
            icon={Sun}
            color="text-orange-600"
            bgColor="bg-orange-50"
            isAddition={true}
            shifts={previousMonthData.turniFerie}
            sectionKey="ferie"
          />
          
          <HourRow 
            label="Ore Malattia"
            hours={previousMonthData.oreMalattia}
            icon={Coffee}
            color="text-yellow-600"
            bgColor="bg-yellow-50"
            isAddition={true}
            shifts={previousMonthData.turniMalattia}
            sectionKey="malattia"
          />

          {/* Separator */}
          <div className="border-t-2 border-slate-200 my-4" />

          {/* Subtractions */}
          <HourRow 
            label="Ore Ritardo"
            hours={previousMonthData.oreRitardo}
            icon={AlertCircle}
            color="text-red-600"
            bgColor="bg-red-50"
            isAddition={false}
            shifts={previousMonthData.lateShifts}
            sectionKey="ritardo"
          />
          
          <HourRow 
            label="Assenza Non Retribuita"
            hours={previousMonthData.oreAssenza}
            icon={XCircle}
            color="text-red-700"
            bgColor="bg-red-100"
            isAddition={false}
            shifts={previousMonthData.turniAssenza}
            sectionKey="assenza"
          />

          {/* Separator */}
          <div className="border-t-4 border-slate-300 my-4" />

          {/* Total */}
          <div className="neumorphic-card p-6 rounded-xl bg-gradient-to-r from-slate-100 to-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="neumorphic-flat w-12 h-12 rounded-xl flex items-center justify-center bg-[#8b7355]">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold text-[#6b6b6b]">ORE TOTALI</span>
              </div>
              <span className={`text-3xl font-bold ${previousMonthData.oreTotali >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                = {previousMonthData.oreTotali.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Summary Formula */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-blue-800 mb-2">Come viene calcolato il totale</h3>
            <p className="text-sm text-blue-700 font-mono">
              Ore Turni Base ({previousMonthData.oreBase.toFixed(1)}h) + 
              Straordinari ({previousMonthData.oreStraordinari.toFixed(1)}h) + 
              Ferie ({previousMonthData.oreFerie.toFixed(1)}h) + 
              Malattia ({previousMonthData.oreMalattia.toFixed(1)}h) - 
              Ritardi ({previousMonthData.oreRitardo.toFixed(1)}h) - 
              Assenze ({previousMonthData.oreAssenza.toFixed(1)}h) = 
              <strong> {previousMonthData.oreTotali.toFixed(1)}h</strong>
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Clicca su ogni riga per vedere il dettaglio dei singoli turni
            </p>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}