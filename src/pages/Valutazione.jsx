import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
   AlertCircle,
   Clock,
   Star,
   TrendingUp,
   Eye,
   X,
   User,
   Calendar,
   AlertTriangle,
   Filter,
   Sparkles
 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isValid, format as formatDate, subDays, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Valutazione() {
  const [expandedView, setExpandedView] = useState(null);
  const [matchedEmployee, setMatchedEmployee] = useState(null);
  const [dateRange, setDateRange] = useState('30'); // '30' or '90'

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const u = await base44.auth.me();
      return u;
    },
  });

  // Fetch Planday shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['planday-shifts'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data'),
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date'),
  });

  // Fetch wrong orders
  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: () => base44.entities.WrongOrder.list('-created_date'),
  });

  // Match shifts and reviews by nome_cognome from User entity
  React.useEffect(() => {
    if (user) {
      setMatchedEmployee({
        full_name: user.nome_cognome || user.full_name || user.email,
        function_name: user.ruoli_dipendente?.join(', ') || 'Dipendente',
        employee_group: user.user_type
      });
    }
  }, [user]);

  // Calculate date filter
  const filterDate = useMemo(() => {
    const now = new Date();
    return dateRange === '30' ? subDays(now, 30) : subMonths(now, 3);
  }, [dateRange]);

  // Helper function to safely format dates
  const safeFormatDate = (dateString, formatString, options = {}) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'N/A';
      return formatDate(date, formatString, { locale: it, ...options });
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

  const safeFormatDateLocale = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'N/A';
      return date.toLocaleDateString('it-IT');
    } catch (e) {
      return 'N/A';
    }
  };

  // Filter shifts for current user with date range
   const myShifts = useMemo(() => {
     if (!user || !shifts.length) return [];
     return shifts.filter(s => {
       // Match by user ID
       if (s.dipendente_id !== user.id) return false;
       // Apply date filter
       try {
         const shiftDate = new Date(s.data);
         return shiftDate >= filterDate;
       } catch (e) {
         return true;
       }
     });
   }, [user, shifts, filterDate]);

   // Fetch TurnoPlanday for proper delay calculation
   const { data: turniPlanday = [] } = useQuery({
     queryKey: ['turni-planday'],
     queryFn: () => base44.entities.TurnoPlanday.list('-data'),
   });

   // Fetch cleaning inspections
   const { data: cleaningInspections = [] } = useQuery({
     queryKey: ['cleaning-inspections'],
     queryFn: () => base44.entities.CleaningInspection.list('-inspection_date'),
   });

   // Use TurnoPlanday instead of shifts for correct delay data
   const myTurni = useMemo(() => {
     if (!user || !turniPlanday.length) return [];
     return turniPlanday.filter(t => {
       // Match by user ID
       if (t.dipendente_id !== user.id) return false;
       // Apply date filter
       try {
         const turnoDate = new Date(t.data);
         return turnoDate >= filterDate;
       } catch (e) {
         return true;
       }
     });
   }, [user, turniPlanday, filterDate]);

  // Filter reviews assigned to current user with date range
  const myReviews = useMemo(() => {
    if (!user || !reviews.length) return [];
    const userDisplayName = (user.nome_cognome || user.full_name || '').toLowerCase().trim();
    return reviews.filter(r => {
      if (!r.employee_assigned_name) return false;
      const assignedNames = r.employee_assigned_name.split(',').map(n => n.trim().toLowerCase());
      if (!assignedNames.includes(userDisplayName)) return false;
      // Apply date filter
      try {
        const reviewDate = new Date(r.review_date);
        return reviewDate >= filterDate;
      } catch (e) {
        return true;
      }
    });
  }, [user, reviews, filterDate]);

  // Filter wrong orders assigned to current user with date range
  const myWrongOrders = useMemo(() => {
    if (!user || !wrongOrders.length) return [];
    const userDisplayName = (user.nome_cognome || user.full_name || '').toLowerCase().trim();
    return wrongOrders.filter(wo => {
      if (!wo.assigned_employee_name) return false;
      if (wo.assigned_employee_name.toLowerCase().trim() !== userDisplayName) return false;
      // Apply date filter
      try {
        const orderDate = new Date(wo.created_date || wo.order_date);
        return orderDate >= filterDate;
      } catch (e) {
        return true;
      }
    }).sort((a, b) => new Date(b.created_date || b.order_date) - new Date(a.created_date || a.order_date));
  }, [user, wrongOrders, filterDate]);

  // Filter data for current employee
  const employeeData = useMemo(() => {
    if (!matchedEmployee || !user) {
      return {
        lateShifts: [],
        missingClockIns: [],
        googleReviews: [],
        wrongOrders: [],
        totalShifts: 0,
        latePercentage: 0,
        averageRating: 0,
        totalDelayMinutes: 0,
        overallScore: 0
      };
    }

    const lateShifts = myTurni.filter(t => t.in_ritardo === true);
     const missingClockIns = myTurni.filter(t => t.stato === 'programmato' && new Date(t.data) < new Date());
     const googleReviews = myReviews.filter(r => r.source === 'google');

     // Count only shifts with both clock-in and clock-out
     const totalShifts = myTurni.filter(t => t.timbratura_entrata && t.timbratura_uscita).length;

     // Calculate TOTAL delay minutes (same as Store Manager dashboard)
     const totalDelayMinutes = myTurni.reduce((acc, t) => acc + (t.minuti_ritardo_conteggiato || 0), 0);
     const latePercentage = totalShifts > 0
       ? (lateShifts.length / totalShifts) * 100
       : 0;

    // Calculate average rating
    const averageRating = googleReviews.length > 0
      ? googleReviews.reduce((sum, r) => sum + r.rating, 0) / googleReviews.length
      : 0;

    // Get user's store IDs from their shifts
     const userStoreIds = [...new Set(myTurni.map(t => t.store_id).filter(Boolean))];

     // Calculate cleaning score (same as Store Manager - based on stores where user works)
     const myCleaningInspections = cleaningInspections.filter(i => {
       // Include inspections from the stores where the user works
       if (!userStoreIds.includes(i.store_id)) return false;
       try {
         const inspDate = new Date(i.inspection_date);
         return inspDate >= filterDate;
       } catch (e) {
         return true;
       }
     });
     const avgCleaningScore = myCleaningInspections.length > 0
       ? myCleaningInspections.reduce((sum, i) => sum + (i.overall_score || 0), 0) / myCleaningInspections.length
       : 0;

     // Calculate total delay minutes (using minuti_ritardo_conteggiato like Store Manager)
     const totalDelayMinutes = myTurni.reduce((acc, t) => acc + (t.minuti_ritardo_conteggiato || 0), 0);

    // Calculate overall score (same formula as admin page)
    let overallScore = 100;
    
    // Get weights (default to 1 if not found)
    const getWeight = (metricName) => {
      // We don't have metricWeights here, use defaults that match admin
      const defaults = {
        'ordini_sbagliati': 2,
        'ritardi': 0.3,
        'timbrature_mancanti': 1,
        'numero_recensioni': 0.5,
        'punteggio_recensioni': 2
      };
      return defaults[metricName] || 1;
    };
    
    const w_ordini = getWeight('ordini_sbagliati');
    const w_ritardi = getWeight('ritardi');
    const w_timbrature = getWeight('timbrature_mancanti');
    const w_num_recensioni = getWeight('numero_recensioni');
    const w_punteggio_recensioni = getWeight('punteggio_recensioni');
    
    // Deduct points for negative metrics
    overallScore -= (myWrongOrders.length * w_ordini);
    overallScore -= (lateShifts.length * w_ritardi);
    overallScore -= (missingClockIns.length * w_timbrature);
    
    // Reduce score if average review rating is below 5
    if (googleReviews.length > 0 && averageRating < 5) {
      const reviewPenalty = (5 - averageRating) * w_punteggio_recensioni;
      overallScore -= reviewPenalty;
    }
    
    // Small bonus for having reviews (max +5)
    if (googleReviews.length > 0) {
      const reviewBonus = Math.min(googleReviews.length * w_num_recensioni, 5);
      overallScore += reviewBonus;
    }
    
    overallScore = Math.max(0, Math.min(100, overallScore));

    return {
      lateShifts: lateShifts.sort((a, b) => new Date(b.data) - new Date(a.data)),
      missingClockIns: missingClockIns.sort((a, b) => new Date(b.data) - new Date(a.data)),
      googleReviews: googleReviews.sort((a, b) => new Date(b.review_date) - new Date(a.review_date)),
      wrongOrders: myWrongOrders,
      totalShifts,
      latePercentage,
      averageRating,
      avgCleaningScore,
      myCleaningInspections,
      totalDelayMinutes,
      overallScore: Math.round(overallScore)
    };
    }, [user, matchedEmployee, myTurni, myReviews, myWrongOrders, cleaningInspections, filterDate]);

  if (userLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <div className="neumorphic-card p-8">
          <p className="text-[#9b9b9b]">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!matchedEmployee) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">La Tua Valutazione</h1>
          <p className="text-[#9b9b9b]">Monitora i tuoi turni, timbrature e recensioni</p>
        </div>

        <NeumorphicCard className="p-8 text-center border-2 border-yellow-300">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-2">Completa il Tuo Profilo</h2>
          <p className="text-[#9b9b9b] mb-4">
            Per visualizzare la tua valutazione, completa prima il tuo profilo nella sezione "Profilo"
          </p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">La Tua Valutazione</h1>
        <p className="text-[#9b9b9b]">Monitora i tuoi turni, timbrature e recensioni</p>
      </div>

      {/* Date Range Filter */}
      <NeumorphicCard className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <span className="text-sm font-medium text-[#6b6b6b]">Periodo:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('30')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                dateRange === '30'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'neumorphic-flat text-[#6b6b6b]'
              }`}
            >
              Ultimi 30 giorni
            </button>
            <button
              onClick={() => setDateRange('90')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                dateRange === '90'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'neumorphic-flat text-[#6b6b6b]'
              }`}
            >
              Ultimi 3 mesi
            </button>
          </div>
        </div>
      </NeumorphicCard>

      {/* Employee Info */}
      <NeumorphicCard className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full neumorphic-flat flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-[#8b7355]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-[#6b6b6b] truncate">{matchedEmployee.full_name}</h2>
            <p className="text-sm sm:text-base text-[#9b9b9b]">{matchedEmployee.function_name || 'Dipendente'}</p>
            {matchedEmployee.employee_group && (
              <p className="text-xs sm:text-sm text-[#9b9b9b]">Gruppo: {matchedEmployee.employee_group}</p>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="neumorphic-pressed px-3 py-2 rounded-xl flex-1 sm:flex-initial text-center">
              <p className="text-xs text-[#9b9b9b]">Turni</p>
              <p className="text-lg sm:text-2xl font-bold text-[#6b6b6b]">{employeeData.totalShifts}</p>
            </div>
            <div className="neumorphic-pressed px-3 py-2 rounded-xl flex-1 sm:flex-initial text-center">
              <p className="text-xs text-[#9b9b9b]">Score</p>
              <p className={`text-lg sm:text-2xl font-bold ${
                employeeData.overallScore >= 80 ? 'text-green-600' :
                employeeData.overallScore >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {employeeData.overallScore}
              </p>
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <NeumorphicCard className="p-3 sm:p-4 text-center">
          <div className="neumorphic-flat w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-red-600 mb-1">{employeeData.totalDelayMinutes}</h3>
          <p className="text-[10px] sm:text-xs text-[#9b9b9b]">Minuti Ritardo</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-3 sm:p-4 text-center">
          <div className="neumorphic-flat w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-orange-600 mb-1">{employeeData.missingClockIns.length}</h3>
          <p className="text-[10px] sm:text-xs text-[#9b9b9b]">Timb. Manc.</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-3 sm:p-4 text-center">
          <div className="neumorphic-flat w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-purple-600 mb-1">{employeeData.wrongOrders.length}</h3>
          <p className="text-[10px] sm:text-xs text-[#9b9b9b]">Ordini Sbag.</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-3 sm:p-4 text-center">
          <div className="neumorphic-flat w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 fill-yellow-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#6b6b6b] mb-1">{employeeData.googleReviews.length}</h3>
          <p className="text-[10px] sm:text-xs text-[#9b9b9b]">Recensioni</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-3 sm:p-4 text-center col-span-2 md:col-span-1">
           <div className="neumorphic-flat w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
             <Star className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 fill-blue-600" />
           </div>
           <h3 className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">
             {employeeData.averageRating > 0 ? employeeData.averageRating.toFixed(1) : '-'}
           </h3>
           <p className="text-[10px] sm:text-xs text-[#9b9b9b]">Rating Medio</p>
         </NeumorphicCard>

         <NeumorphicCard className="p-3 sm:p-4 text-center col-span-2 md:col-span-1">
           <div className="neumorphic-flat w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center">
             <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 fill-cyan-600" />
           </div>
           <h3 className={`text-xl sm:text-2xl font-bold mb-1 ${
             employeeData.avgCleaningScore >= 80 ? 'text-green-600' :
             employeeData.avgCleaningScore >= 60 ? 'text-yellow-600' :
             'text-red-600'
           }`}>
             {employeeData.avgCleaningScore > 0 ? Math.round(employeeData.avgCleaningScore) : '-'}
           </h3>
           <p className="text-[10px] sm:text-xs text-[#9b9b9b]">Score Pulizie</p>
         </NeumorphicCard>
        </div>

      {/* Turni in Ritardo */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              {expandedView === 'late' ? 'Tutti i Turni in Ritardo' : 'Ultimi 5 Turni in Ritardo'}
            </h2>
          </div>
          {employeeData.lateShifts.length > 5 && (
            <button
              onClick={() => setExpandedView(expandedView === 'late' ? null : 'late')}
              className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
            >
              {expandedView === 'late' ? <><X className="w-4 h-4" />Chiudi</> : <><Eye className="w-4 h-4" />Vedi tutti ({employeeData.lateShifts.length})</>}
            </button>
          )}
        </div>

        {employeeData.lateShifts.length > 0 ? (
          <div className={`space-y-3 ${expandedView === 'late' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
            {(expandedView === 'late' ? employeeData.lateShifts : employeeData.lateShifts.slice(0, 5)).map((shift, index) => (
              <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                    <span className="font-medium text-[#6b6b6b]">{safeFormatDateLocale(shift.data)}</span>
                    {shift.store_name && <span className="text-sm text-[#9b9b9b]">• {shift.store_name}</span>}
                  </div>
                  <span className="text-lg font-bold text-red-600">+{shift.minuti_ritardo_conteggiato || 0} min</span>
                </div>
                <div className="text-sm text-[#9b9b9b]">
                <strong>Previsto:</strong> {shift.ora_inizio || 'N/A'} → <strong>Effettivo:</strong> {shift.timbratura_entrata ? safeFormatTime(shift.timbratura_entrata) : 'N/A'}
                {shift.minuti_ritardo_conteggiato && <div className="mt-1 text-xs">Minuti conteggiati: {shift.minuti_ritardo_conteggiato}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-[#6b6b6b] font-medium">Nessun ritardo registrato! 🎉</p>
          </div>
        )}
      </NeumorphicCard>

      {/* Timbrature Mancanti */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              {expandedView === 'missing' ? 'Tutte le Timbrature Mancanti' : 'Ultime 5 Timbrature Mancanti'}
            </h2>
          </div>
          {employeeData.missingClockIns.length > 5 && (
            <button
              onClick={() => setExpandedView(expandedView === 'missing' ? null : 'missing')}
              className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
            >
              {expandedView === 'missing' ? <><X className="w-4 h-4" />Chiudi</> : <><Eye className="w-4 h-4" />Vedi tutte ({employeeData.missingClockIns.length})</>}
            </button>
          )}
        </div>

        {employeeData.missingClockIns.length > 0 ? (
          <div className={`space-y-3 ${expandedView === 'missing' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
            {(expandedView === 'missing' ? employeeData.missingClockIns : employeeData.missingClockIns.slice(0, 5)).map((shift, index) => (
              <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl border-2 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                    <span className="font-medium text-[#6b6b6b]">{safeFormatDateLocale(shift.data)}</span>
                    {shift.store_name && <span className="text-sm text-[#9b9b9b]">• {shift.store_name}</span>}
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">NON TIMBRATO</span>
                </div>
                <div className="text-sm text-[#9b9b9b]">
                  <strong>Orario Previsto:</strong> {shift.ora_inizio || 'N/A'} - {shift.ora_fine || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-[#6b6b6b] font-medium">Nessuna timbratura mancante! 🎉</p>
          </div>
        )}
      </NeumorphicCard>

      {/* Ordini Sbagliati */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              {expandedView === 'wrongOrders' ? 'Tutti gli Ordini Sbagliati' : 'Ultimi 5 Ordini Sbagliati'}
            </h2>
          </div>
          {employeeData.wrongOrders.length > 5 && (
            <button
              onClick={() => setExpandedView(expandedView === 'wrongOrders' ? null : 'wrongOrders')}
              className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
            >
              {expandedView === 'wrongOrders' ? <><X className="w-4 h-4" />Chiudi</> : <><Eye className="w-4 h-4" />Vedi tutti ({employeeData.wrongOrders.length})</>}
            </button>
          )}
        </div>

        {employeeData.wrongOrders.length > 0 ? (
          <div className={`space-y-3 ${expandedView === 'wrongOrders' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
            {(expandedView === 'wrongOrders' ? employeeData.wrongOrders : employeeData.wrongOrders.slice(0, 5)).map((order, index) => (
              <div key={`${order.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl border-2 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                    <span className="font-medium text-[#6b6b6b]">{safeFormatDateLocale(order.created_date || order.order_date)}</span>
                    {order.store_name && <span className="text-sm text-[#9b9b9b]">• {order.store_name}</span>}
                  </div>
                  <span className="text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                    {order.error_type || 'Errore'}
                  </span>
                </div>
                {order.order_id && (
                  <div className="text-sm text-[#9b9b9b] mb-1">
                    <strong>ID Ordine:</strong> {order.order_id}
                  </div>
                )}
                {order.description && (
                  <p className="text-sm text-[#6b6b6b]">{order.description}</p>
                )}
                {order.refund_amount && (
                  <div className="text-sm text-red-600 mt-1">
                    <strong>Rimborso:</strong> €{order.refund_amount.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-[#6b6b6b] font-medium">Nessun ordine sbagliato! 🎉</p>
            <p className="text-sm text-[#9b9b9b] mt-1">Ottimo lavoro!</p>
          </div>
        )}
      </NeumorphicCard>

      {/* Score Pulizie */}
       {employeeData.myCleaningInspections && employeeData.myCleaningInspections.length > 0 && (
         <NeumorphicCard className="p-6">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <Sparkles className="w-6 h-6 text-cyan-600" />
               <h2 className="text-xl font-bold text-[#6b6b6b]">
                 {expandedView === 'cleanings' ? 'Tutti i Controlli Pulizie' : 'Ultimi 5 Controlli Pulizie'}
               </h2>
             </div>
             {employeeData.myCleaningInspections.length > 5 && (
               <button
                 onClick={() => setExpandedView(expandedView === 'cleanings' ? null : 'cleanings')}
                 className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
               >
                 {expandedView === 'cleanings' ? <><X className="w-4 h-4" />Chiudi</> : <><Eye className="w-4 h-4" />Vedi tutti ({employeeData.myCleaningInspections.length})</>}
               </button>
             )}
           </div>

           <div className={`space-y-3 ${expandedView === 'cleanings' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
             {(expandedView === 'cleanings' ? employeeData.myCleaningInspections : employeeData.myCleaningInspections.slice(0, 5)).map((inspection, index) => (
               <div key={`${inspection.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-[#9b9b9b]" />
                     <span className="font-medium text-[#6b6b6b]">{safeFormatDateLocale(inspection.inspection_date)}</span>
                     {inspection.store_name && <span className="text-sm text-[#9b9b9b]">• {inspection.store_name}</span>}
                   </div>
                   <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                     inspection.overall_score >= 80 ? 'bg-green-100 text-green-700' :
                     inspection.overall_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                     'bg-red-100 text-red-700'
                   }`}>
                     {inspection.overall_score || 0}/100
                   </span>
                 </div>
                 <div className="text-xs text-[#9b9b9b]">
                   <strong>Ruolo:</strong> {inspection.inspector_role}
                 </div>
               </div>
             ))}
           </div>
         </NeumorphicCard>
       )}

      {/* Recensioni Google */}
       <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              {expandedView === 'reviews' ? 'Tutte le Recensioni Google' : 'Ultime 5 Recensioni Google'}
            </h2>
          </div>
          {employeeData.googleReviews.length > 5 && (
            <button
              onClick={() => setExpandedView(expandedView === 'reviews' ? null : 'reviews')}
              className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
            >
              {expandedView === 'reviews' ? <><X className="w-4 h-4" />Chiudi</> : <><Eye className="w-4 h-4" />Vedi tutte ({employeeData.googleReviews.length})</>}
            </button>
          )}
        </div>

        {employeeData.googleReviews.length > 0 ? (
          <div className={`space-y-3 ${expandedView === 'reviews' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
            {(expandedView === 'reviews' ? employeeData.googleReviews : employeeData.googleReviews.slice(0, 5)).map((review, index) => (
              <div key={`${review.id}-${index}`} className="neumorphic-pressed p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[#6b6b6b]">{review.customer_name || 'Anonimo'}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm text-[#6b6b6b] mb-2">{review.comment}</p>}
                <div className="flex items-center justify-between text-xs text-[#9b9b9b]">
                  <span>{safeFormatDateLocale(review.review_date)}</span>
                  {review.store_name && <span>• {review.store_name}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-[#9b9b9b] mx-auto mb-3" />
            <p className="text-[#6b6b6b] font-medium">Nessuna recensione ancora</p>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
}