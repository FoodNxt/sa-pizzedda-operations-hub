import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  ShoppingCart,
  Star,
  Eye,
  X,
  Settings,
  Save,
  BarChart3,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  TrendingDown,
  EyeOff,
  Calculator } from
'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { parseISO, isWithinInterval, isValid, format as formatDate } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';

export default function Employees() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('performance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });
  const [dateRangePreset, setDateRangePreset] = useState('current_month');
  const [expandedView, setExpandedView] = useState(null);
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [showLetteraForm, setShowLetteraForm] = useState(false);
  const [selectedEmployeeForLettera, setSelectedEmployeeForLettera] = useState(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const queryClient = useQueryClient();

  const toggleHideMutation = useMutation({
    mutationFn: async ({ userId, hide }) => {
      return base44.entities.User.update(userId, { hide_from_performance: hide });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dipendenti-users'] });
    }
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  // CHANGED: Fetch users with dipendente role instead of Employee entity
  const { data: users = [] } = useQuery({
    queryKey: ['dipendenti-users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter((u) => u.user_type === 'dipendente' || u.user_type === 'user');
    }
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['planday-shifts'],
    queryFn: () => base44.entities.TurnoPlanday.list()
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list()
  });

  const { data: allWrongOrderMatches = [] } = useQuery({
    queryKey: ['all-wrong-order-matches'],
    queryFn: () => base44.entities.WrongOrderMatch.list()
  });

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: async () => {
      const orders = await base44.entities.WrongOrder.list('-order_date');
      return orders.filter((o) => o.store_matched);
    }
  });

  const { data: metricWeights = [] } = useQuery({
    queryKey: ['metric-weights'],
    queryFn: () => base44.entities.MetricWeight.list()
  });

  const { data: p2pResponses = [] } = useQuery({
    queryKey: ['p2p-responses'],
    queryFn: () => base44.entities.P2PFeedbackResponse.list('-submitted_date')
  });

  const { data: cleaningInspections = [] } = useQuery({
    queryKey: ['cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date')
  });

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.list()
  });

  const { data: domande = [] } = useQuery({
    queryKey: ['domande-pulizia'],
    queryFn: () => base44.entities.DomandaPulizia.list()
  });

  const { data: richiesteAssenze = [] } = useQuery({
    queryKey: ['richieste-assenze'],
    queryFn: async () => {
      const ferie = await base44.entities.RichiestaFerie.list();
      return ferie.filter((f) => f.stato === 'approvata').map((f) => ({
        ...f,
        tipo: 'assenza_non_giustificata'
      }));
    }
  });

  const { data: malattie = [] } = useQuery({
    queryKey: ['richieste-malattia'],
    queryFn: () => base44.entities.RichiestaMalattia.list()
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['lettera-templates'],
    queryFn: () => base44.entities.LetteraRichiamoTemplate.list()
  });

  const { data: tipoTurnoConfigs = [] } = useQuery({
    queryKey: ['tipo-turno-configs'],
    queryFn: () => base44.entities.TipoTurnoConfig.list()
  });

  const currentOrderIds = useMemo(() => new Set(wrongOrders.map((o) => o.id)), [wrongOrders]);
  const wrongOrderMatches = useMemo(() =>
  allWrongOrderMatches.filter((m) => currentOrderIds.has(m.wrong_order_id)),
  [allWrongOrderMatches, currentOrderIds]);

  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      return date;
    } catch (e) {
      return null;
    }
  };

  const safeFormatDate = (dateString, formatString, options = {}) => {
    if (!dateString) return 'N/A';
    const date = safeParseDate(dateString);
    if (!date) return 'N/A';
    try {
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

  const safeFormatDateTimeLocale = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      if (!isValid(date)) return 'N/A';
      return date.toLocaleString('it-IT');
    } catch (e) {
      return 'N/A';
    }
  };

  const deduplicateShifts = (shiftsArray) => {
    const uniqueShiftsMap = new Map();

    shiftsArray.forEach((shift) => {
      const shiftDate = safeParseDate(shift.data);
      const normalizedDate = shiftDate ? shiftDate.toISOString().split('T')[0] : 'no-date';

      const normalizedStart = shift.ora_inizio ?
      shift.ora_inizio :
      'no-start';
      const normalizedEnd = shift.ora_fine ?
      shift.ora_fine :
      'no-end';

      const key = `${shift.dipendente_nome}|${shift.store_id || 'no-store'}|${normalizedDate}|${normalizedStart}|${normalizedEnd}`;

      if (!uniqueShiftsMap.has(key)) {
        uniqueShiftsMap.set(key, shift);
      } else {
        const existing = uniqueShiftsMap.get(key);
        if (shift.created_date && existing.created_date &&
        new Date(shift.created_date) < new Date(existing.created_date)) {
          uniqueShiftsMap.set(key, shift);
        }
      }
    });

    return Array.from(uniqueShiftsMap.values());
  };

  // Calculate employee metrics - UPDATED to work with User entity
  const employeeMetrics = useMemo(() => {
    let filteredReviews = reviews;
    if (startDate || endDate) {
      filteredReviews = reviews.filter((review) => {
        if (!review.review_date) return false;
        const reviewDate = safeParseDate(review.review_date);
        if (!reviewDate) return false;

        const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
        const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;

        if (start && end) {
          return isWithinInterval(reviewDate, { start, end });
        } else if (start) {
          return reviewDate >= start;
        } else if (end) {
          return reviewDate <= end;
        }
        return true;
      });
    }

    return users.map((user) => {
      const employeeName = user.nome_cognome || user.full_name || user.email;

      let employeeShifts = shifts.filter((s) => {
        if (s.dipendente_nome !== employeeName) return false;

        // Exclude future shifts
        if (!s.data) return false;
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (shiftDate > today) return false;

        if (startDate || endDate) {
          const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
          const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;

          if (start && end) {
            return isWithinInterval(shiftDate, { start, end });
          } else if (start) {
            return shiftDate >= start;
          } else if (end) {
            return shiftDate <= end;
          }
        }
        return true;
      });

      employeeShifts = deduplicateShifts(employeeShifts);

      const employeeWrongOrders = wrongOrderMatches.filter((m) => {
        if (m.matched_employee_name !== employeeName) return false;

        // ALWAYS apply date filter if dates are set
        if (!m.order_date) return !startDate && !endDate;
        
        const orderDate = safeParseDate(m.order_date);
        if (!orderDate) return !startDate && !endDate;

        const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
        const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;

        if (start && end) {
          return isWithinInterval(orderDate, { start, end });
        } else if (start) {
          return orderDate >= start;
        } else if (end) {
          return orderDate <= end;
        }
        
        return true;
      });

      const wrongOrdersCount = employeeWrongOrders.length;
      const wrongOrderRate = employeeShifts.length > 0 ?
      wrongOrdersCount / employeeShifts.length * 100 :
      0;

      // Calcola ritardi - RICALCOLO MANUALE
      let totalLateMinutes = 0;
      let numeroRitardi = 0;
      employeeShifts.forEach((shift) => {
        if (!shift.timbratura_entrata || !shift.ora_inizio) return;
        try {
          const clockInTime = new Date(shift.timbratura_entrata);
          const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
          const scheduledStart = new Date(clockInTime);
          scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
          const delayMs = clockInTime - scheduledStart;
          const delayMinutes = Math.floor(delayMs / 60000);
          const ritardoReale = delayMinutes > 0 ? delayMinutes : 0;
          totalLateMinutes += ritardoReale;
          if (ritardoReale > 0) numeroRitardi++;
        } catch (e) {


          // Skip in caso di errore
        }});const avgLateMinutes = employeeShifts.length > 0 ? totalLateMinutes / employeeShifts.length : 0;
      const percentualeRitardi = employeeShifts.length > 0 ? numeroRitardi / employeeShifts.length * 100 : 0;

      // Calcola assenze non giustificate (ore)
      const assenzeNonGiustificate = employeeShifts.filter((s) => {
        // Turni passati senza timbratura E senza richiesta ferie approvata E senza malattia
        if (s.timbratura_entrata) return false;
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;
        const today = new Date();
        if (shiftDate > today) return false;

        // Check se ha richiesta ferie approvata per questo giorno
        const hasFerie = richiesteAssenze.some((f) => {
          const start = safeParseDate(f.data_inizio);
          const end = safeParseDate(f.data_fine);
          return f.dipendente_nome === employeeName &&
          start && end &&
          shiftDate >= start && shiftDate <= end;
        });

        // Check se ha malattia certificata per questo giorno
        const hasMalattia = malattie.some((m) => {
          const start = safeParseDate(m.data_inizio);
          const end = m.data_fine ? safeParseDate(m.data_fine) : start;
          return m.dipendente_nome === employeeName &&
          m.stato === 'certificata' &&
          start && end &&
          shiftDate >= start && shiftDate <= end;
        });

        return !hasFerie && !hasMalattia;
      });

      const oreAssenzeNonGiustificate = assenzeNonGiustificate.reduce((sum, s) => {
        if (!s.ora_inizio || !s.ora_fine) return sum;
        try {
          const [startH, startM] = s.ora_inizio.split(':').map(Number);
          const [endH, endM] = s.ora_fine.split(':').map(Number);
          const hours = endH + endM / 60 - (startH + startM / 60);
          return sum + hours;
        } catch (e) {
          return sum;
        }
      }, 0);

      // Calcola ore malattia
      const oreMalattia = malattie.
      filter((m) => {
        if (m.dipendente_nome !== employeeName) return false;
        if (m.stato !== 'certificata') return false;

        if (startDate || endDate) {
          const start = safeParseDate(m.data_inizio);
          if (!start) return false;
          const filterStart = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
          const filterEnd = endDate ? safeParseDate(endDate + 'T23:59:59') : null;

          if (filterStart && start < filterStart) return false;
          if (filterEnd && start > filterEnd) return false;
        }
        return true;
      }).
      reduce((sum, m) => {
        if (!m.turni_coinvolti || m.turni_coinvolti.length === 0) return sum;
        const turniMalattia = employeeShifts.filter((s) => m.turni_coinvolti.includes(s.id));
        const oreTurni = turniMalattia.reduce((total, s) => {
          if (!s.ora_inizio || !s.ora_fine) return total;
          try {
            const [startH, startM] = s.ora_inizio.split(':').map(Number);
            const [endH, endM] = s.ora_fine.split(':').map(Number);
            const hours = endH + endM / 60 - (startH + startM / 60);
            return total + hours;
          } catch (e) {
            return total;
          }
        }, 0);
        return sum + oreTurni;
      }, 0);

      // Timbrature mancanti - SOLO turni passati SENZA timbratura E che richiedono timbratura
      const numeroTimbratureMancate = employeeShifts.filter((s) => {
        // NON deve avere timbratura di entrata
        if (s.timbratura_entrata) return false;

        // Verifica se questo tipo turno richiede timbratura
        const tipoTurnoConfig = tipoTurnoConfigs.find(c => c.tipo_turno === s.tipo_turno);
        const richiedeTimbratura = tipoTurnoConfig?.richiede_timbratura !== false;
        if (!richiedeTimbratura) return false;

        // Deve essere passato (data + orario)
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;

        const now = new Date();
        const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const shiftDateOnly = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());

        // Se il turno è in una data futura -> non è mancato
        if (shiftDateOnly > todayDateOnly) return false;

        // Se il turno è oggi, controlla se l'orario di inizio è passato
        if (shiftDateOnly.getTime() === todayDateOnly.getTime()) {
          if (!s.ora_inizio) return false;
          try {
            const [hh, mm] = s.ora_inizio.split(':').map(Number);
            const shiftStartTime = new Date(now);
            shiftStartTime.setHours(hh, mm, 0, 0);
            // Se l'orario di inizio non è ancora arrivato -> non è mancato
            if (shiftStartTime > now) return false;
          } catch (e) {
            return false;
          }
        }

        // Turno passato senza timbratura
        return true;
      }).length;

      const mentions = filteredReviews.filter((r) => r.employee_mentioned === user.id);
      const positiveMentions = mentions.filter((r) => r.rating >= 4).length;
      const negativeMentions = mentions.filter((r) => r.rating < 3).length;

      const assignedReviews = filteredReviews.filter((r) => {
        if (!r.employee_assigned_name) return false;
        const assignedNames = r.employee_assigned_name.split(',').map((n) => n.trim().toLowerCase());
        return assignedNames.includes(employeeName.toLowerCase());
      });

      const googleReviews = assignedReviews.filter((r) => r.source === 'google');
      const avgGoogleRating = googleReviews.length > 0 ?
      googleReviews.reduce((sum, r) => sum + r.rating, 0) / googleReviews.length :
      0;

      const getWeight = (metricName, ruolo = null) => {
        let weight;
        if (ruolo) {
          weight = metricWeights.find((w) => w.metric_name === metricName && w.ruolo === ruolo && w.is_active);
        } else {
          weight = metricWeights.find((w) => w.metric_name === metricName && w.is_active);
        }
        return weight ? weight.weight : 1;
      };

      // Get weights for reviews based on employee roles (average if multiple roles)
      const userRoles = user.ruoli_dipendente || [];
      const getAverageWeight = (metricName) => {
        if (userRoles.length === 0) {
          return getWeight(metricName, null);
        }
        
        const roleWeights = userRoles.map(ruolo => getWeight(metricName, ruolo)).filter(w => w !== 1);
        
        if (roleWeights.length > 0) {
          return roleWeights.reduce((sum, w) => sum + w, 0) / roleWeights.length;
        }
        
        return getWeight(metricName, null);
      };

      const w_bonus_recensione = getAverageWeight('bonus_per_recensione');
      const w_min_recensioni = getAverageWeight('min_recensioni');
      const w_malus_recensioni = getAverageWeight('malus_sotto_minimo_recensioni');
      const w_punteggio_recensioni = getAverageWeight('punteggio_recensioni');
      const w_pulizie = getAverageWeight('pulizie');

      // Calculate base score starting from 100
      let performanceScore = 100;

      // Deduct points for negative metrics (these ALWAYS reduce score)
      // For wrong orders, ritardi, timbrature - use weights based on role at time of event
      let deductionOrdini = 0;
      let deductionRitardi = 0;
      let deductionTimbrature = 0;

      // Track breakdown by role
      const scoreBreakdown = {
        turniPerRuolo: {},
        ordiniPerRuolo: {},
        ritardiPerRuolo: {},
        timbraturePerRuolo: {}
      };

      // Count shifts per role
      employeeShifts.forEach((shift) => {
        const ruolo = shift.ruolo || 'Nessun Ruolo';
        scoreBreakdown.turniPerRuolo[ruolo] = (scoreBreakdown.turniPerRuolo[ruolo] || 0) + 1;
      });

      // Ordini sbagliati - use weight based on role during shift
      employeeWrongOrders.forEach((order) => {
        const shiftData = employeeShifts.find((s) => {
          if (!s.data) return false;
          const shiftDate = safeParseDate(s.data);
          if (!shiftDate) return false;
          const orderDate = safeParseDate(order.order_date);
          if (!orderDate) return false;
          return shiftDate.toISOString().split('T')[0] === orderDate.toISOString().split('T')[0];
        });
        const ruolo = shiftData ? shiftData.ruolo : 'Nessun Ruolo';
        // Get weight with specific role or fallback to no role (generic weight)
        let weight = getWeight('ordini_sbagliati', ruolo === 'Nessun Ruolo' ? null : ruolo);
        // If no role-specific weight found and ruolo is not null, try generic weight
        if (weight === 1 && ruolo !== 'Nessun Ruolo') {
          weight = getWeight('ordini_sbagliati', null) || 2;
        }
        deductionOrdini += weight;
        
        // Track breakdown
        if (!scoreBreakdown.ordiniPerRuolo[ruolo]) {
          scoreBreakdown.ordiniPerRuolo[ruolo] = { count: 0, weight, totalDeduction: 0 };
        }
        scoreBreakdown.ordiniPerRuolo[ruolo].count++;
        scoreBreakdown.ordiniPerRuolo[ruolo].totalDeduction += weight;
      });

      // Ritardi - use weight based on role during shift
      employeeShifts.forEach((shift) => {
        if (!shift.timbratura_entrata || !shift.ora_inizio) return;
        try {
          const clockInTime = new Date(shift.timbratura_entrata);
          const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
          const scheduledStart = new Date(clockInTime);
          scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
          const delayMs = clockInTime - scheduledStart;
          const delayMinutes = Math.floor(delayMs / 60000);
          if (delayMinutes > 0) {
            const ruolo = shift.ruolo || 'Nessun Ruolo';
            let weight = getWeight('ritardi', ruolo === 'Nessun Ruolo' ? null : ruolo);
            if (weight === 1 && ruolo !== 'Nessun Ruolo') {
              weight = getWeight('ritardi', null) || 0.3;
            }
            deductionRitardi += weight;
            
            // Track breakdown
            if (!scoreBreakdown.ritardiPerRuolo[ruolo]) {
              scoreBreakdown.ritardiPerRuolo[ruolo] = { count: 0, weight, totalDeduction: 0 };
            }
            scoreBreakdown.ritardiPerRuolo[ruolo].count++;
            scoreBreakdown.ritardiPerRuolo[ruolo].totalDeduction += weight;
          }
        } catch (e) {
          // Skip
        }
      });
      
      // Timbrature mancanti - use weight based on role during shift (solo se timbratura richiesta)
      const missingClockIns = employeeShifts.filter((s) => {
        if (s.timbratura_entrata) return false;
        
        // Verifica se questo tipo turno richiede timbratura
        const tipoTurnoConfig = tipoTurnoConfigs.find(c => c.tipo_turno === s.tipo_turno);
        const richiedeTimbratura = tipoTurnoConfig?.richiede_timbratura !== false;
        if (!richiedeTimbratura) return false;
        
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;
        const today = new Date();
        if (shiftDate > today) return false;
        return true;
      });

      missingClockIns.forEach((shift) => {
        const ruolo = shift.ruolo || 'Nessun Ruolo';
        let weight = getWeight('timbrature_mancanti', ruolo === 'Nessun Ruolo' ? null : ruolo);
        if (weight === 1 && ruolo !== 'Nessun Ruolo') {
          weight = getWeight('timbrature_mancanti', null) || 1;
        }
        deductionTimbrature += weight;
        
        // Track breakdown
        if (!scoreBreakdown.timbraturePerRuolo[ruolo]) {
          scoreBreakdown.timbraturePerRuolo[ruolo] = { count: 0, weight, totalDeduction: 0 };
        }
        scoreBreakdown.timbraturePerRuolo[ruolo].count++;
        scoreBreakdown.timbraturePerRuolo[ruolo].totalDeduction += weight;
      });

      performanceScore -= deductionOrdini;
      performanceScore -= deductionRitardi;
      performanceScore -= deductionTimbrature;

      // Reduce score if average review rating is below 5 (scale: 5=0 penalty, 4=-5, 3=-10, 2=-15, 1=-20)
      if (googleReviews.length > 0 && avgGoogleRating < 5) {
        const reviewPenalty = (5 - avgGoogleRating) * w_punteggio_recensioni;
        performanceScore -= reviewPenalty;
      }

      // Bonus per ogni recensione con 4 o 5 stelle
      const highRatingReviews = googleReviews.filter((r) => r.rating >= 4);
      if (highRatingReviews.length > 0 && w_bonus_recensione > 0) {
        const reviewBonus = highRatingReviews.length * w_bonus_recensione;
        performanceScore += reviewBonus;
      }

      // Malus se sotto il numero minimo di recensioni
      if (w_min_recensioni > 0 && googleReviews.length < w_min_recensioni && w_malus_recensioni > 0) {
        const recensioniMancanti = w_min_recensioni - googleReviews.length;
        const malusTotale = recensioniMancanti * w_malus_recensioni;
        performanceScore -= malusTotale;
      }

      // Pulizie: calcola % come in PulizieMatch (puliti/totali controlli)
      let puliti = 0;
      let sporchi = 0;

      cleaningInspections.forEach((inspection) => {
        if (!inspection.domande_risposte || inspection.analysis_status !== 'completed') return;

        // Filter by date if needed
        if (startDate || endDate) {
          if (!inspection.inspection_date) return;
          const inspDate = safeParseDate(inspection.inspection_date);
          if (!inspDate) return;
          const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
          const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;
          if (start && end && !isWithinInterval(inspDate, { start, end })) return;else
          if (start && inspDate < start) return;else
          if (end && inspDate > end) return;
        }

        const dataCompilazione = new Date(inspection.inspection_date);
        const inspectionStoreId = inspection.store_id;

        inspection.domande_risposte.forEach((domanda) => {
          // Trova l'attrezzatura - per scelta multipla cerca nella domanda originale
          let nomeAttrezzatura = domanda.attrezzatura;

          if (!nomeAttrezzatura && domanda.tipo_controllo === 'scelta_multipla') {
            const originalQuestion = domande.find((d) => d.id === domanda.domanda_id);
            nomeAttrezzatura = originalQuestion?.attrezzatura;

            if (!nomeAttrezzatura) {
              const domandaLower = domanda.domanda_testo?.toLowerCase() || '';
              for (const attr of attrezzature) {
                const attrLower = attr.nome.toLowerCase();
                if (domandaLower.includes(attrLower)) {
                  nomeAttrezzatura = attr.nome;
                  break;
                }
              }
            }
          }

          if (!nomeAttrezzatura) return;

          const attrezzatura = attrezzature.find((a) => a.nome === nomeAttrezzatura);
          if (!attrezzatura || !attrezzatura.ruoli_responsabili || attrezzatura.ruoli_responsabili.length === 0) return;

          // Determina lo stato in base al tipo di domanda
          let statoPulizia = null;

          if (domanda.tipo_controllo === 'foto') {
            const normalizeAttrezzatura = (name) => {
              const map = {
                'Forno': 'forno',
                'Impastatrice': 'impastatrice',
                'Tavolo da lavoro': 'tavolo_lavoro',
                'Frigo': 'frigo',
                'Cassa': 'cassa',
                'Lavandino': 'lavandino',
                'Tavolette Takeaway': 'tavolette_takeaway'
              };
              return map[name] || name?.toLowerCase().replace(/\s+/g, '_') || '';
            };

            const normalizedName = normalizeAttrezzatura(nomeAttrezzatura);
            const statusField = `${normalizedName}_pulizia_status`;
            const correctedField = `${normalizedName}_corrected_status`;
            statoPulizia = inspection[correctedField] || inspection[statusField];
          } else if (domanda.tipo_controllo === 'scelta_multipla') {
            const originalQuestion = domande.find((d) => d.id === domanda.domanda_id);
            const isCorrect = domanda.risposta?.toLowerCase() === originalQuestion?.risposta_corretta?.toLowerCase();
            statoPulizia = isCorrect ? 'pulito' : 'sporco';
          }

          if (!statoPulizia) return;

          // Process each responsible role
          attrezzatura.ruoli_responsabili.forEach((ruoloResponsabile) => {
            const candidateShifts = employeeShifts.filter((t) => {
              if (t.store_id !== inspectionStoreId) return false;
              if (t.ruolo !== ruoloResponsabile) return false;
              if (!t.dipendente_nome) return false;
              if (!t.data || !t.ora_fine) return false;

              const shiftEndTime = t.timbratura_uscita ?
              new Date(t.timbratura_uscita) :
              new Date(t.data + 'T' + t.ora_fine);

              return shiftEndTime <= dataCompilazione;
            });

            const lastShift = candidateShifts.sort((a, b) => {
              const endA = a.timbratura_uscita ? new Date(a.timbratura_uscita) : new Date(a.data + 'T' + a.ora_fine);
              const endB = b.timbratura_uscita ? new Date(b.timbratura_uscita) : new Date(b.data + 'T' + b.ora_fine);
              return endB - endA;
            })[0];

            if (!lastShift) return;

            // Verifica che questo dipendente sia il responsabile
            if (lastShift.dipendente_nome !== employeeName) return;

            const isPulito = statoPulizia === 'pulito';

            if (isPulito) {
              puliti++;
            } else {
              sporchi++;
            }
          });
        });
      });

      // Calcola percentuale pulito come in PulizieMatch
      const totalControlli = puliti + sporchi;
      if (totalControlli > 0) {
        const percentualePulito = puliti / totalControlli * 100;
        if (percentualePulito < 80) {
          const cleaningPenalty = (80 - percentualePulito) * w_pulizie * 0.1;
          performanceScore -= cleaningPenalty;
        }
      }

      // Ensure score stays between 0 and 100
      // Score of 100 is ONLY possible if: 0 wrong orders, 0 delays, 0 missing clockins, and avg review = 5
      performanceScore = Math.max(0, Math.min(100, performanceScore));

      const performanceLevel = performanceScore >= 80 ? 'excellent' :
      performanceScore >= 60 ? 'good' :
      performanceScore >= 40 ? 'needs_improvement' :
      'poor';

      return {
        ...user,
        full_name: employeeName,
        wrongOrders: wrongOrdersCount,
        wrongOrderRate,
        totalLateMinutes,
        avgLateMinutes,
        numeroRitardi,
        percentualeRitardi,
        numeroTimbratureMancate,
        mentions: mentions.length,
        positiveMentions,
        negativeMentions,
        performanceScore: Math.round(performanceScore),
        performanceLevel,
        totalShifts: employeeShifts.length,
        avgGoogleRating,
        googleReviewCount: googleReviews.length,
        oreAssenzeNonGiustificate,
        oreMalattia,
        weights: {
          w_bonus_recensione,
          w_min_recensioni,
          w_malus_recensioni,
          w_punteggio_recensioni,
          w_pulizie
        },
        scoreBreakdown
      };
    });
  }, [users, shifts, reviews, wrongOrderMatches, startDate, endDate, metricWeights, richiesteAssenze, malattie, tipoTurnoConfigs]);

  const filteredEmployees = useMemo(() => {
    let filtered = employeeMetrics;

    // Filter out employees with 0 shifts in the selected period
    filtered = filtered.filter((e) => e.totalShifts > 0);

    // Filter out hidden employees (unless showHidden is true)
    if (!showHidden) {
      filtered = filtered.filter((e) => !e.hide_from_performance);
    }

    if (selectedStore !== 'all') {
      filtered = filtered.filter((e) => {
        if (!e.assigned_stores || e.assigned_stores.length === 0) return true;
        return e.assigned_stores.some((storeName) => {
          const store = stores.find((s) => s.name === storeName);
          return store && store.id === selectedStore;
        });
      });
    }

    if (selectedPosition !== 'all') {
      filtered = filtered.filter((e) => {
        return e.ruoli_dipendente && e.ruoli_dipendente.includes(selectedPosition);
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => {
        const name = (e.full_name || '').toLowerCase();
        const email = (e.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    filtered.sort((a, b) => {
      let valueA, valueB;
      switch (sortBy) {
        case 'performance':
          valueA = a.performanceScore;
          valueB = b.performanceScore;
          break;
        case 'wrongOrders':
          valueA = a.wrongOrders;
          valueB = b.wrongOrders;
          break;
        case 'lateness':
          valueA = a.avgLateMinutes;
          valueB = b.avgLateMinutes;
          break;
        case 'numeroRitardi':
          valueA = a.numeroRitardi;
          valueB = b.numeroRitardi;
          break;
        case 'percentualeRitardi':
          valueA = a.percentualeRitardi;
          valueB = b.percentualeRitardi;
          break;
        case 'numeroTimbratureMancate':
          valueA = a.numeroTimbratureMancate;
          valueB = b.numeroTimbratureMancate;
          break;
        case 'googleRating':
          valueA = a.avgGoogleRating;
          valueB = b.avgGoogleRating;
          break;
        default:
          valueA = a.performanceScore;
          valueB = b.performanceScore;
      }
      return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
    });

    return filtered;
  }, [employeeMetrics, selectedStore, selectedPosition, searchQuery, sortBy, sortOrder, stores, showHidden]);

  const getPerformanceColor = (level) => {
    switch (level) {
      case 'excellent':return 'text-green-600';
      case 'good':return 'text-blue-600';
      case 'needs_improvement':return 'text-yellow-600';
      case 'poor':return 'text-red-600';
      default:return 'text-slate-700';
    }
  };

  const getPerformanceLabel = (level) => {
    switch (level) {
      case 'excellent':return 'Excellent';
      case 'good':return 'Good';
      case 'needs_improvement':return 'Needs Improvement';
      case 'poor':return 'Poor';
      default:return 'N/A';
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getAllLateShifts = (employeeName) => {
    const lateShifts = shifts.
    filter((s) => {
      if (s.dipendente_nome !== employeeName || !s.data) return false;
      if (!s.timbratura_entrata || !s.ora_inizio) return false;

      // Ricalcola ritardo manualmente
      let hasDelay = false;
      try {
        const clockInTime = new Date(s.timbratura_entrata);
        const [oraInizioHH, oraInizioMM] = s.ora_inizio.split(':').map(Number);
        const scheduledStart = new Date(clockInTime);
        scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
        const delayMs = clockInTime - scheduledStart;
        const delayMinutes = Math.floor(delayMs / 60000);
        hasDelay = delayMinutes > 0;
      } catch (e) {
        return false;
      }

      if (!hasDelay) return false;

      if (startDate || endDate) {
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;
        const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
        const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;

        if (start && end) {
          return isWithinInterval(shiftDate, { start, end });
        } else if (start) {
          return shiftDate >= start;
        } else if (end) {
          return shiftDate <= end;
        }
      }
      return true;
    }).
    sort((a, b) => {
      const dateA = safeParseDate(a.data);
      const dateB = safeParseDate(b.data);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });

    return deduplicateShifts(lateShifts);
  };

  const getLatestLateShifts = (employeeName) => {
    return getAllLateShifts(employeeName).slice(0, 3);
  };

  const getAllMissingClockIns = (employeeName) => {
    const missingClockIns = shifts.
    filter((s) => {
      if (s.dipendente_nome !== employeeName || !s.data) return false;

      // NON deve avere timbratura di entrata
      if (s.timbratura_entrata) return false;

      // Verifica se questo tipo turno richiede timbratura
      const tipoTurnoConfig = tipoTurnoConfigs.find(c => c.tipo_turno === s.tipo_turno);
      const richiedeTimbratura = tipoTurnoConfig?.richiede_timbratura !== false;
      if (!richiedeTimbratura) return false;

      // Deve essere passato (data + orario)
      const shiftDate = safeParseDate(s.data);
      if (!shiftDate) return false;

      const now = new Date();
      const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const shiftDateOnly = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());

      // Se il turno è in una data futura -> non è mancato
      if (shiftDateOnly > todayDateOnly) return false;

      // Se il turno è oggi, controlla se l'orario di inizio è passato
      if (shiftDateOnly.getTime() === todayDateOnly.getTime()) {
        if (!s.ora_inizio) return false;
        try {
          const [hh, mm] = s.ora_inizio.split(':').map(Number);
          const shiftStartTime = new Date(now);
          shiftStartTime.setHours(hh, mm, 0, 0);
          // Se l'orario di inizio non è ancora arrivato -> non è mancato
          if (shiftStartTime > now) return false;
        } catch (e) {
          return false;
        }
      }

      if (startDate || endDate) {
        const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
        const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;

        if (start && end) {
          return isWithinInterval(shiftDate, { start, end });
        } else if (start) {
          return shiftDate >= start;
        } else if (end) {
          return shiftDate <= end;
        }
      }
      return true;
    }).
    sort((a, b) => {
      const dateA = safeParseDate(a.data);
      const dateB = safeParseDate(b.data);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });

    return deduplicateShifts(missingClockIns);
  };

  const getLatestMissingClockIns = (employeeName) => {
    return getAllMissingClockIns(employeeName).slice(0, 3);
  };

  const getAllGoogleReviews = (employeeName) => {
    return reviews.
    filter((r) => {
      if (!r.employee_assigned_name || r.source !== 'google' || !r.review_date) return false;

      const assignedNames = r.employee_assigned_name.split(',').map((n) => n.trim().toLowerCase());
      if (!assignedNames.includes(employeeName.toLowerCase())) return false;

      if (startDate || endDate) {
        const reviewDate = safeParseDate(r.review_date);
        if (!reviewDate) return false;
        const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
        const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;

        if (start && end) {
          return isWithinInterval(reviewDate, { start, end });
        } else if (start) {
          return reviewDate >= start;
        } else if (end) {
          return reviewDate <= end;
        }
      }
      return true;
    }).
    sort((a, b) => {
      const dateA = safeParseDate(a.review_date);
      const dateB = safeParseDate(b.review_date);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });
  };

  const getLatestGoogleReviews = (employeeName) => {
    return getAllGoogleReviews(employeeName).slice(0, 3);
  };

  const getAllWrongOrders = (employeeName) => {
    const employeeMatches = wrongOrderMatches.filter((m) => {
      if (m.matched_employee_name !== employeeName) return false;

      if (startDate || endDate) {
        if (!m.order_date) return false;
        const orderDate = safeParseDate(m.order_date);
        if (!orderDate) return false;

        const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
        const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;

        if (start && end) {
          return isWithinInterval(orderDate, { start, end });
        } else if (start) {
          return orderDate >= start;
        } else if (end) {
          return orderDate <= end;
        }
      }
      return true;
    }).sort((a, b) => {
      const dateA = safeParseDate(a.order_date);
      const dateB = safeParseDate(b.order_date);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });

    return employeeMatches.map((match) => {
      const orderDetails = wrongOrders.find((o) => o.id === match.wrong_order_id);
      return {
        ...match,
        orderDetails
      };
    });
  };

  const getLatestWrongOrders = (employeeName) => {
    return getAllWrongOrders(employeeName).slice(0, 3);
  };

  const getP2PFeedbackForEmployee = (employeeName) => {
    return p2pResponses.
    filter((r) => r.reviewed_name === employeeName).
    sort((a, b) => {
      const dateA = new Date(a.submitted_date || 0);
      const dateB = new Date(b.submitted_date || 0);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const getCleaningScoreForEmployee = (employeeName) => {
    const user = users.find((u) =>
    (u.nome_cognome || u.full_name || u.email) === employeeName
    );

    if (!user) return { percentualePulito: null, count: 0, puliti: 0, sporchi: 0 };

    let puliti = 0;
    let sporchi = 0;

    cleaningInspections.forEach((inspection) => {
      if (!inspection.domande_risposte || inspection.analysis_status !== 'completed') return;

      // Filter by date if needed
      if (startDate || endDate) {
        if (!inspection.inspection_date) return;
        const inspDate = safeParseDate(inspection.inspection_date);
        if (!inspDate) return;
        const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
        const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;
        if (start && end && !isWithinInterval(inspDate, { start, end })) return;else
        if (start && inspDate < start) return;else
        if (end && inspDate > end) return;
      }

      const dataCompilazione = new Date(inspection.inspection_date);
      const inspectionStoreId = inspection.store_id;

      inspection.domande_risposte.forEach((domanda) => {
        // Trova l'attrezzatura - per scelta multipla cerca nella domanda originale
        let nomeAttrezzatura = domanda.attrezzatura;

        if (!nomeAttrezzatura && domanda.tipo_controllo === 'scelta_multipla') {
          const originalQuestion = domande.find((d) => d.id === domanda.domanda_id);
          nomeAttrezzatura = originalQuestion?.attrezzatura;

          if (!nomeAttrezzatura) {
            const domandaLower = domanda.domanda_testo?.toLowerCase() || '';
            for (const attr of attrezzature) {
              const attrLower = attr.nome.toLowerCase();
              if (domandaLower.includes(attrLower)) {
                nomeAttrezzatura = attr.nome;
                break;
              }
            }
          }
        }

        if (!nomeAttrezzatura) return;

        const attrezzatura = attrezzature.find((a) => a.nome === nomeAttrezzatura);
        if (!attrezzatura || !attrezzatura.ruoli_responsabili || attrezzatura.ruoli_responsabili.length === 0) return;

        // Determina lo stato in base al tipo di domanda
        let statoPulizia = null;

        if (domanda.tipo_controllo === 'foto') {
          const normalizeAttrezzatura = (name) => {
            const map = {
              'Forno': 'forno',
              'Impastatrice': 'impastatrice',
              'Tavolo da lavoro': 'tavolo_lavoro',
              'Frigo': 'frigo',
              'Cassa': 'cassa',
              'Lavandino': 'lavandino',
              'Tavolette Takeaway': 'tavolette_takeaway'
            };
            return map[name] || name?.toLowerCase().replace(/\s+/g, '_') || '';
          };

          const normalizedName = normalizeAttrezzatura(nomeAttrezzatura);
          const statusField = `${normalizedName}_pulizia_status`;
          const correctedField = `${normalizedName}_corrected_status`;
          statoPulizia = inspection[correctedField] || inspection[statusField];
        } else if (domanda.tipo_controllo === 'scelta_multipla') {
          const originalQuestion = domande.find((d) => d.id === domanda.domanda_id);
          const isCorrect = domanda.risposta?.toLowerCase() === originalQuestion?.risposta_corretta?.toLowerCase();
          statoPulizia = isCorrect ? 'pulito' : 'sporco';
        }

        if (!statoPulizia) return;

        // Process each responsible role
        attrezzatura.ruoli_responsabili.forEach((ruoloResponsabile) => {
          const candidateShifts = shifts.filter((t) => {
            if (t.store_id !== inspectionStoreId) return false;
            if (t.ruolo !== ruoloResponsabile) return false;
            if (!t.dipendente_nome) return false;
            if (!t.data || !t.ora_fine) return false;

            const shiftEndTime = t.timbratura_uscita ?
            new Date(t.timbratura_uscita) :
            new Date(t.data + 'T' + t.ora_fine);

            return shiftEndTime <= dataCompilazione;
          });

          const lastShift = candidateShifts.sort((a, b) => {
            const endA = a.timbratura_uscita ? new Date(a.timbratura_uscita) : new Date(a.data + 'T' + a.ora_fine);
            const endB = b.timbratura_uscita ? new Date(b.timbratura_uscita) : new Date(b.data + 'T' + b.ora_fine);
            return endB - endA;
          })[0];

          if (!lastShift) return;

          // Verifica che questo dipendente sia il responsabile
          if (lastShift.dipendente_nome !== employeeName) return;

          const isPulito = statoPulizia === 'pulito';

          if (isPulito) {
            puliti++;
          } else {
            sporchi++;
          }
        });
      });
    });

    const totalControlli = puliti + sporchi;

    if (totalControlli === 0) return { percentualePulito: null, count: 0, puliti: 0, sporchi: 0 };

    const percentualePulito = puliti / totalControlli * 100;
    return { percentualePulito, count: totalControlli, puliti, sporchi };
  };

  const getConfidenceBadgeColor = (confidence) => {
    switch (confidence) {
      case 'high':return 'bg-green-100 text-green-700';
      case 'medium':return 'bg-yellow-100 text-yellow-700';
      case 'low':return 'bg-orange-100 text-orange-700';
      case 'manual':return 'bg-blue-100 text-blue-700';
      default:return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDateRangePreset = (preset) => {
    setDateRangePreset(preset);
    const now = new Date();

    if (preset === 'current_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'current_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleRecalculateDelays = async () => {
    if (!confirm('Vuoi ricalcolare i ritardi per tutti i turni? Questo potrebbe richiedere alcuni secondi.')) {
      return;
    }

    setRecalculating(true);
    try {
      const response = await base44.functions.invoke('calculateShiftDelay', {});
      alert(response.data.message || 'Ritardi ricalcolati con successo!');
      queryClient.invalidateQueries({ queryKey: ['planday-shifts'] });
    } catch (error) {
      alert('Errore nel ricalcolo dei ritardi: ' + error.message);
    } finally {
      setRecalculating(false);
    }
  };

  const inviaLetteraMutation = useMutation({
    mutationFn: async ({ userId, templateId }) => {
      const template = templates.find((t) => t.id === templateId);
      const user = users.find((u) => u.id === userId);

      let contenuto = template.contenuto;
      contenuto = contenuto.replace(/{{nome_dipendente}}/g, user.nome_cognome || user.full_name || user.email);
      contenuto = contenuto.replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'));

      return base44.entities.LetteraRichiamo.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.nome_cognome || user.full_name || user.email,
        tipo_lettera: 'lettera_richiamo',
        contenuto_lettera: contenuto,
        data_invio: new Date().toISOString(),
        status: 'inviata'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
      alert('Lettera di richiamo inviata con successo!');
      setShowLetteraForm(false);
      setSelectedEmployeeForLettera(null);
    }
  });

  // Cluster calculations
  const getClusters = (metric) => {
    const sorted = [...employeeMetrics].
    filter((e) => {
      // Apply store and position filters
      let passFilter = true;

      if (selectedStore !== 'all') {
        if (!e.assigned_stores || e.assigned_stores.length === 0) passFilter = true;else
        {
          const hasStore = e.assigned_stores.some((storeName) => {
            const store = stores.find((s) => s.name === storeName);
            return store && store.id === selectedStore;
          });
          passFilter = hasStore;
        }
      }

      if (selectedPosition !== 'all') {
        passFilter = passFilter && e.ruoli_dipendente && e.ruoli_dipendente.includes(selectedPosition);
      }

      return passFilter;
    }).
    sort((a, b) => {
      const valA = metric === 'googleRating' ? a.avgGoogleRating :
      metric === 'googleReviews' ? a.googleReviewCount :
      metric === 'wrongOrders' ? a.wrongOrders :
      metric === 'ritardi' ? a.totalLateMinutes :
      metric === 'timbrature' ? a.numeroTimbratureMancate :
      metric === 'assenze' ? a.oreAssenzeNonGiustificate :
      metric === 'malattia' ? a.oreMalattia : 0;
      const valB = metric === 'googleRating' ? b.avgGoogleRating :
      metric === 'googleReviews' ? b.googleReviewCount :
      metric === 'wrongOrders' ? b.wrongOrders :
      metric === 'ritardi' ? b.totalLateMinutes :
      metric === 'timbrature' ? b.numeroTimbratureMancate :
      metric === 'assenze' ? b.oreAssenzeNonGiustificate :
      metric === 'malattia' ? b.oreMalattia : 0;

      // For rating and reviews, higher is better
      if (metric === 'googleRating' || metric === 'googleReviews') {
        return valB - valA;
      }
      // For others, lower is better
      return valA - valB;
    });

    const best = sorted.slice(0, 5);

    // For googleRating worst, exclude employees with no reviews
    let worst;
    if (metric === 'googleRating') {
      const withReviews = sorted.filter((e) => e.googleReviewCount > 0);
      worst = withReviews.slice(-5).reverse();
    } else {
      worst = sorted.slice(-5).reverse();
    }

    return { best, worst };
  };

  return (
    <ProtectedPage pageName="Employees">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold lg:text-3xl" style={{ color: '#000000' }}>Performance Dipendenti
            </h1>
            <p className="text-sm" style={{ color: '#000000' }}>Ranking dipendenti</p>
          </div>
          <div className="flex gap-2">
            <NeumorphicButton
              onClick={handleRecalculateDelays}
              disabled={recalculating}
              className="flex items-center gap-2">

              <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{recalculating ? 'Ricalcolo...' : 'Ricalcola Ritardi'}</span>
            </NeumorphicButton>
            <NeumorphicButton
              onClick={() => setShowWeightsModal(true)}
              className="flex items-center gap-2">

              <Settings className="w-5 h-5" />
              <span className="hidden md:inline">Pesi</span>
            </NeumorphicButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
           <input
            type="text"
            placeholder="Cerca dipendente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm flex-1 min-w-[150px]" />

           <button
            onClick={() => setShowHidden(!showHidden)}
            className={`neumorphic-pressed px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${showHidden ? 'bg-blue-100 text-blue-700' : 'text-slate-700'}`}>
            <EyeOff className="w-4 h-4" />
            <span className="hidden md:inline">{showHidden ? 'Nascondi Esclusi' : 'Mostra Esclusi'}</span>
          </button>


           <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm">

             <option value="all">Tutti i Locali</option>
             {stores.map((store) =>
            <option key={store.id} value={store.id}>{store.name}</option>
            )}
           </select>

           <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm">

             <option value="all">Tutti i Ruoli</option>
             <option value="Pizzaiolo">Pizzaiolo</option>
             <option value="Cassiere">Cassiere</option>
             <option value="Store Manager">Store Manager</option>
           </select>

          <select
            value={dateRangePreset}
            onChange={(e) => handleDateRangePreset(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm">

            <option value="all">Tutto il periodo</option>
            <option value="current_month">Mese in corso</option>
            <option value="last_month">Mese scorso</option>
            <option value="current_year">Anno in corso</option>
            <option value="custom">Personalizzato</option>
          </select>

          {dateRangePreset === 'custom' &&
          <>
              <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
              placeholder="Data inizio" />


              <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
              placeholder="Data fine" />

            </>
          }

          {(startDate || endDate) &&
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setDateRangePreset('all');
            }}
            className="neumorphic-flat px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700">

              <X className="w-4 h-4" />
            </button>
          }
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">{filteredEmployees.length}</h3>
              <p className="text-xs text-slate-500">Totale</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <Award className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-green-600 mb-1">
                {filteredEmployees.filter((e) => e.performanceLevel === 'excellent').length}
              </h3>
              <p className="text-xs text-slate-500">Top</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-blue-600 mb-1">
                {filteredEmployees.filter((e) => e.performanceLevel === 'good').length}
              </h3>
              <p className="text-xs text-slate-500">Good</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-red-600 mb-1">
                {filteredEmployees.filter((e) => e.performanceLevel === 'poor' || e.performanceLevel === 'needs_improvement').length}
              </h3>
              <p className="text-xs text-slate-500">Attenzione</p>
            </div>
          </NeumorphicCard>
        </div>

        {/* Gaussian Distribution Chart */}
        {filteredEmployees.length > 2 &&
        <NeumorphicCard className="p-4 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">Distribuzione Performance</h3>
            </div>
            <GaussianChart employees={filteredEmployees} />
          </NeumorphicCard>
        }

        {/* Best/Worst Clusters */}
        <NeumorphicCard className="p-4 lg:p-6">
          <button
            onClick={() => setShowClusters(!showClusters)}
            className="w-full flex items-center justify-between mb-4">

            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">Classifica per Categoria</h3>
            </div>
            {showClusters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showClusters &&
          <div className="space-y-6">
              {/* Google Reviews Count */}
              <ClusterSection
              title="Numero Recensioni Google Maps"
              metric="googleReviews"
              getClusters={getClusters}
              formatValue={(e) => e.googleReviewCount}
              expandedCluster={expandedCluster}
              setExpandedCluster={setExpandedCluster}
              onSendLettera={(emp) => {
                setSelectedEmployeeForLettera(emp);
                setShowLetteraForm(true);
              }} />


              {/* Google Rating Average */}
              <ClusterSection
              title="Punteggio Medio Recensioni Google Maps"
              metric="googleRating"
              getClusters={getClusters}
              formatValue={(e) => e.googleReviewCount > 0 ? e.avgGoogleRating.toFixed(1) : '-'}
              expandedCluster={expandedCluster}
              setExpandedCluster={setExpandedCluster}
              onSendLettera={(emp) => {
                setSelectedEmployeeForLettera(emp);
                setShowLetteraForm(true);
              }} />


              {/* Wrong Orders */}
              <ClusterSection
              title="Ordini Sbagliati"
              metric="wrongOrders"
              getClusters={getClusters}
              formatValue={(e) => e.wrongOrders}
              expandedCluster={expandedCluster}
              setExpandedCluster={setExpandedCluster}
              onSendLettera={(emp) => {
                setSelectedEmployeeForLettera(emp);
                setShowLetteraForm(true);
              }} />


              {/* Ritardi */}
              <ClusterSection
              title="Ritardi (minuti totali)"
              metric="ritardi"
              getClusters={getClusters}
              formatValue={(e) => `${e.totalLateMinutes.toFixed(0)} min`}
              expandedCluster={expandedCluster}
              setExpandedCluster={setExpandedCluster}
              onSendLettera={(emp) => {
                setSelectedEmployeeForLettera(emp);
                setShowLetteraForm(true);
              }} />


              {/* Timbrature Mancanti */}
              <ClusterSection
              title="Timbrature Mancanti"
              metric="timbrature"
              getClusters={getClusters}
              formatValue={(e) => e.numeroTimbratureMancate}
              expandedCluster={expandedCluster}
              setExpandedCluster={setExpandedCluster}
              onSendLettera={(emp) => {
                setSelectedEmployeeForLettera(emp);
                setShowLetteraForm(true);
              }} />


              {/* Assenze Non Giustificate */}
              <ClusterSection
              title="Assenze Non Giustificate (ore)"
              metric="assenze"
              getClusters={getClusters}
              formatValue={(e) => `${e.oreAssenzeNonGiustificate.toFixed(1)}h`}
              expandedCluster={expandedCluster}
              setExpandedCluster={setExpandedCluster}
              onSendLettera={(emp) => {
                setSelectedEmployeeForLettera(emp);
                setShowLetteraForm(true);
              }} />


              {/* Malattia */}
              <ClusterSection
              title="Malattia (ore)"
              metric="malattia"
              getClusters={getClusters}
              formatValue={(e) => `${e.oreMalattia.toFixed(1)}h`}
              expandedCluster={expandedCluster}
              setExpandedCluster={setExpandedCluster}
              onSendLettera={(emp) => {
                setSelectedEmployeeForLettera(emp);
                setShowLetteraForm(true);
              }} />

            </div>
          }
        </NeumorphicCard>

        <div className="grid grid-cols-1 gap-3">
          {filteredEmployees.length > 0 ?
          filteredEmployees.map((employee, index) =>
          <NeumorphicCard
            key={employee.id}
            className="p-4 hover:shadow-xl transition-all">

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                      <span className="text-sm lg:text-base font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm lg:text-base truncate">
                        {employee.full_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{employee.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {employee.ruoli_dipendente && employee.ruoli_dipendente.length > 0 && employee.ruoli_dipendente.map((role, idx) =>
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {role}
                          </span>
                        )}
                        {employee.hide_from_performance && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <EyeOff className="w-3 h-3" />
                            Nascosto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-2xl lg:text-3xl font-bold ${getPerformanceColor(employee.performanceLevel)}`}>
                      {employee.performanceScore}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">{getPerformanceLabel(employee.performanceLevel)}</p>
                  </div>
                </div>

                {/* Metriche Summary - ULTRA COMPACT */}
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  <div className="neumorphic-pressed p-1.5 rounded-lg text-center">
                    <ShoppingCart className="w-3 h-3 mx-auto mb-0.5 text-red-600" />
                    <p className={`text-xs font-bold ${employee.wrongOrders > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {employee.wrongOrders}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">Ordini</p>
                  </div>

                  <div className="neumorphic-pressed p-1.5 rounded-lg text-center">
                    <Clock className="w-3 h-3 mx-auto mb-0.5 text-orange-600" />
                    <p className={`text-xs font-bold ${employee.numeroRitardi > 3 ? 'text-red-600' : 'text-green-600'}`}>
                      {employee.numeroRitardi}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">Ritardi</p>
                  </div>

                  <div className="neumorphic-pressed p-1.5 rounded-lg text-center">
                    <AlertCircle className="w-3 h-3 mx-auto mb-0.5 text-yellow-600" />
                    <p className={`text-xs font-bold ${employee.numeroTimbratureMancate > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {employee.numeroTimbratureMancate}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">Timbr.</p>
                  </div>

                  <div className="neumorphic-pressed p-1.5 rounded-lg text-center">
                    <Star className="w-3 h-3 mx-auto mb-0.5 text-yellow-500 fill-yellow-500" />
                    {employee.googleReviewCount > 0 ?
                <>
                        <p className="text-xs font-bold text-slate-700">{employee.avgGoogleRating.toFixed(1)}</p>
                        <p className="text-[10px] text-slate-500 leading-tight">({employee.googleReviewCount})</p>
                      </> :

                <>
                        <p className="text-xs font-bold text-slate-400">-</p>
                        <p className="text-[10px] text-slate-500 leading-tight">(0)</p>
                      </>
                }
                  </div>

                  <div className="neumorphic-pressed p-1.5 rounded-lg text-center">
                    <Sparkles className="w-3 h-3 mx-auto mb-0.5 text-cyan-600" />
                    {(() => {
                  const cleaningData = getCleaningScoreForEmployee(employee.full_name);
                  return cleaningData.count > 0 ?
                  <>
                          <p className={`text-xs font-bold ${
                    cleaningData.percentualePulito >= 80 ? 'text-green-600' : 'text-red-600'}`
                    }>
                            {cleaningData.percentualePulito.toFixed(0)}%
                          </p>
                          <p className="text-[10px] text-slate-500 leading-tight">({cleaningData.count})</p>
                        </> :

                  <>
                          <p className="text-xs font-bold text-slate-400">-</p>
                          <p className="text-[10px] text-slate-500 leading-tight">(0)</p>
                        </>;

                })()}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {employee.hide_from_performance ? (
                    <NeumorphicButton
                      onClick={() => {
                        if (confirm(`Ripristinare ${employee.full_name} nella lista Performance?`)) {
                          toggleHideMutation.mutate({ userId: employee.id, hide: false });
                        }
                      }}
                      className="flex items-center justify-center gap-2 text-sm bg-green-100">
                      <Eye className="w-4 h-4" />
                      <span className="hidden lg:inline">Ripristina</span>
                    </NeumorphicButton>
                  ) : (
                    <NeumorphicButton
                      onClick={() => {
                        if (confirm(`Nascondere ${employee.full_name} dalla lista Performance?`)) {
                          toggleHideMutation.mutate({ userId: employee.id, hide: true });
                        }
                      }}
                      className="flex items-center justify-center gap-2 text-sm">
                      <EyeOff className="w-4 h-4" />
                      <span className="hidden lg:inline">Nascondi</span>
                    </NeumorphicButton>
                  )}
                  <NeumorphicButton
                    onClick={() => setSelectedEmployee(employee)}
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2 text-sm">
                    <Eye className="w-4 h-4" />
                    Mostra Dettagli
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
          ) :

          <NeumorphicCard className="p-8 text-center">
              <p className="text-slate-500">Nessun dipendente trovato</p>
            </NeumorphicCard>
          }
        </div>

        {selectedEmployee &&
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
            <NeumorphicCard className="w-full lg:max-w-2xl max-h-[85vh] lg:max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
              <div className="flex items-start justify-between mb-4 lg:mb-6 sticky top-0 bg-gradient-to-br from-slate-50 to-slate-100 pb-4 -mt-4 pt-4 -mx-4 px-4 z-10">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1 truncate">{selectedEmployee.full_name}</h2>
                  {selectedEmployee.ruoli_dipendente && selectedEmployee.ruoli_dipendente.length > 0 &&
                <p className="text-sm text-slate-500 truncate">{selectedEmployee.ruoli_dipendente.join(', ')}</p>
                }
                </div>
                <button
                onClick={() => {
                  setSelectedEmployee(null);
                  setExpandedView(null);
                }}
                className="nav-button px-3 py-2 rounded-lg text-slate-700 flex-shrink-0 ml-3">

                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-2">Performance</p>
                  <p className={`text-3xl lg:text-4xl font-bold ${getPerformanceColor(selectedEmployee.performanceLevel)}`}>
                    {selectedEmployee.performanceScore}
                  </p>
                  <p className={`text-xs mt-1 ${getPerformanceColor(selectedEmployee.performanceLevel)}`}>
                    {getPerformanceLabel(selectedEmployee.performanceLevel)}
                  </p>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-500 mb-2">Google</p>
                  {selectedEmployee.googleReviewCount > 0 ?
                <>
                      <div className="flex items-center justify-center gap-2">
                        <Star className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-500 fill-yellow-500" />
                        <p className="text-2xl lg:text-3xl font-bold text-slate-800">
                          {selectedEmployee.avgGoogleRating.toFixed(1)}
                        </p>
                      </div>
                      <p className="text-xs mt-1 text-slate-500">{selectedEmployee.googleReviewCount} reviews</p>
                    </> :

                <p className="text-xl text-slate-400">N/A</p>
                }
                </div>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl mb-4 bg-blue-50">
                <button
                  onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                  className="w-full flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-bold text-blue-800">Dettaglio Calcolo Punteggio</h4>
                  </div>
                  {showScoreBreakdown ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                </button>

                {showScoreBreakdown && (
                  <div className="text-xs text-blue-800 space-y-2 mt-3">
                    <p><strong>Base:</strong> 100 punti</p>
                    
                    {/* Turni per Ruolo */}
                    <div className="neumorphic-pressed p-3 rounded-lg bg-white">
                      <p className="font-bold text-slate-700 mb-2">📊 Turni per Ruolo</p>
                      {Object.entries(selectedEmployee.scoreBreakdown.turniPerRuolo).map(([ruolo, count]) => (
                        <p key={ruolo} className="text-slate-600">• <strong>{ruolo}:</strong> {count} turni</p>
                      ))}
                    </div>

                    {/* Ordini Sbagliati per Ruolo */}
                    {Object.keys(selectedEmployee.scoreBreakdown.ordiniPerRuolo).length > 0 && (
                      <div className="neumorphic-pressed p-3 rounded-lg bg-red-50">
                        <p className="font-bold text-red-700 mb-2">🛒 Ordini Sbagliati per Ruolo</p>
                        {Object.entries(selectedEmployee.scoreBreakdown.ordiniPerRuolo).map(([ruolo, data]) => (
                          <p key={ruolo} className="text-red-600">
                            • <strong>{ruolo}:</strong> {data.count} ordini × peso {data.weight} = -{data.totalDeduction.toFixed(1)} punti
                          </p>
                        ))}
                        <p className="font-bold text-red-700 mt-2 pt-2 border-t border-red-200">Totale: -{Object.values(selectedEmployee.scoreBreakdown.ordiniPerRuolo).reduce((sum, d) => sum + d.totalDeduction, 0).toFixed(1)} punti</p>
                      </div>
                    )}

                    {/* Ritardi per Ruolo */}
                    {Object.keys(selectedEmployee.scoreBreakdown.ritardiPerRuolo).length > 0 && (
                      <div className="neumorphic-pressed p-3 rounded-lg bg-orange-50">
                        <p className="font-bold text-orange-700 mb-2">⏰ Ritardi per Ruolo</p>
                        {Object.entries(selectedEmployee.scoreBreakdown.ritardiPerRuolo).map(([ruolo, data]) => (
                          <p key={ruolo} className="text-orange-600">
                            • <strong>{ruolo}:</strong> {data.count} ritardi × peso {data.weight} = -{data.totalDeduction.toFixed(1)} punti
                          </p>
                        ))}
                        <p className="font-bold text-orange-700 mt-2 pt-2 border-t border-orange-200">Totale: -{Object.values(selectedEmployee.scoreBreakdown.ritardiPerRuolo).reduce((sum, d) => sum + d.totalDeduction, 0).toFixed(1)} punti</p>
                      </div>
                    )}

                    {/* Timbrature Mancanti per Ruolo */}
                    {Object.keys(selectedEmployee.scoreBreakdown.timbraturePerRuolo).length > 0 && (
                      <div className="neumorphic-pressed p-3 rounded-lg bg-yellow-50">
                        <p className="font-bold text-yellow-700 mb-2">⚠️ Timbrature Mancanti per Ruolo</p>
                        {Object.entries(selectedEmployee.scoreBreakdown.timbraturePerRuolo).map(([ruolo, data]) => (
                          <p key={ruolo} className="text-yellow-600">
                            • <strong>{ruolo}:</strong> {data.count} mancanti × peso {data.weight} = -{data.totalDeduction.toFixed(1)} punti
                          </p>
                        ))}
                        <p className="font-bold text-yellow-700 mt-2 pt-2 border-t border-yellow-200">Totale: -{Object.values(selectedEmployee.scoreBreakdown.timbraturePerRuolo).reduce((sum, d) => sum + d.totalDeduction, 0).toFixed(1)} punti</p>
                      </div>
                    )}

                    {selectedEmployee.weights.w_punteggio_recensioni > 0 && selectedEmployee.googleReviewCount > 0 && selectedEmployee.avgGoogleRating < 5 &&
                      <p className="text-red-600"><strong>- Media Recensioni &lt; 5:</strong> (5 - {selectedEmployee.avgGoogleRating.toFixed(1)}) × {selectedEmployee.weights.w_punteggio_recensioni} = -{((5 - selectedEmployee.avgGoogleRating) * selectedEmployee.weights.w_punteggio_recensioni).toFixed(1)}</p>
                    }
                    {selectedEmployee.weights.w_bonus_recensione > 0 && selectedEmployee.googleReviewCount > 0 && (() => {
                      const highRatingCount = getAllGoogleReviews(selectedEmployee.full_name).filter((r) => r.rating >= 4).length;
                      if (highRatingCount > 0) {
                        return <p className="text-green-600"><strong>+ Bonus Recensioni (4-5★):</strong> {highRatingCount} × {selectedEmployee.weights.w_bonus_recensione} = +{(highRatingCount * selectedEmployee.weights.w_bonus_recensione).toFixed(1)}</p>;
                      }
                      return null;
                    })()}
                    {selectedEmployee.weights.w_min_recensioni > 0 && selectedEmployee.googleReviewCount < selectedEmployee.weights.w_min_recensioni && selectedEmployee.weights.w_malus_recensioni > 0 &&
                      <p className="text-red-600"><strong>- Sotto Minimo Recensioni:</strong> ({selectedEmployee.weights.w_min_recensioni} - {selectedEmployee.googleReviewCount}) × {selectedEmployee.weights.w_malus_recensioni} = -{((selectedEmployee.weights.w_min_recensioni - selectedEmployee.googleReviewCount) * selectedEmployee.weights.w_malus_recensioni).toFixed(1)}</p>
                    }
                    {selectedEmployee.weights.w_pulizie > 0 && (() => {
                      const cleaningData = getCleaningScoreForEmployee(selectedEmployee.full_name);
                      if (cleaningData.count > 0) {
                        if (cleaningData.percentualePulito < 80) {
                          const penalty = (80 - cleaningData.percentualePulito) * selectedEmployee.weights.w_pulizie * 0.1;
                          return (
                            <p className="text-red-600"><strong>- Pulizie &lt; 80%:</strong> (80 - {cleaningData.percentualePulito.toFixed(1)}) × {selectedEmployee.weights.w_pulizie} × 0.1 = -{penalty.toFixed(1)}</p>
                          );
                        } else {
                          return (
                            <p className="text-green-600"><strong>✓ Pulizie OK:</strong> {cleaningData.percentualePulito.toFixed(1)}% ≥ 80% (peso {selectedEmployee.weights.w_pulizie}, nessuna penalità)</p>
                          );
                        }
                      } else {
                        return (
                          <p className="text-slate-500"><strong>Pulizie:</strong> Nessun controllo (peso {selectedEmployee.weights.w_pulizie})</p>
                        );
                      }
                    })()}
                    <p className="font-bold mt-2 pt-2 border-t border-blue-200"><strong>Punteggio Finale:</strong> {selectedEmployee.performanceScore}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 lg:space-y-4">
                <div className="neumorphic-flat p-3 lg:p-4 rounded-xl">
                  <div className="flex items-center gap-2 lg:gap-3 mb-3">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base">Ordini</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Ordini Sbagliati</p>
                      <p className="text-lg lg:text-xl font-bold text-slate-800">
                        {selectedEmployee.wrongOrders} ({selectedEmployee.wrongOrderRate.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="neumorphic-flat p-3 lg:p-4 rounded-xl">
                  <div className="flex items-center gap-2 lg:gap-3 mb-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base">Presenza</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Turni</p>
                      <p className="text-lg lg:text-xl font-bold text-slate-800">{selectedEmployee.totalShifts}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Media Ritardo</p>
                      <p className="text-lg lg:text-xl font-bold text-slate-800">
                        {selectedEmployee.avgLateMinutes.toFixed(1)}m
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">N° Ritardi</p>
                      <p className="text-lg lg:text-xl font-bold text-red-600">
                        {selectedEmployee.numeroRitardi}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">% Ritardi</p>
                      <p className="text-lg lg:text-xl font-bold text-red-600">
                        {selectedEmployee.percentualeRitardi.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-slate-800">
                        {expandedView === 'wrongOrders' ? 'Tutti gli' : 'Ultimi 3'} Ordini Sbagliati
                      </h3>
                    </div>
                    {getAllWrongOrders(selectedEmployee.full_name).length > 3 &&
                  <button
                    onClick={() => setExpandedView(expandedView === 'wrongOrders' ? null : 'wrongOrders')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">

                        {expandedView === 'wrongOrders' ? 'Mostra meno' : `Vedi tutti (${getAllWrongOrders(selectedEmployee.full_name).length})`}
                      </button>
                  }
                  </div>
                  {(() => {
                  const wrongOrdersList = expandedView === 'wrongOrders' ?
                  getAllWrongOrders(selectedEmployee.full_name) :
                  getLatestWrongOrders(selectedEmployee.full_name);
                  return wrongOrdersList.length > 0 ?
                  <div className="space-y-2">
                        {wrongOrdersList.map((match, index) =>
                    <div key={`${match.id}-${index}`} className="neumorphic-pressed p-3 rounded-lg border-2 border-red-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          match.platform === 'glovo' ?
                          'bg-orange-100 text-orange-700' :
                          'bg-teal-100 text-teal-700'}`
                          }>
                                  {match.platform}
                                </span>
                                <span className="font-mono text-sm text-slate-800">#{match.order_id}</span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${getConfidenceBadgeColor(match.match_confidence)}`}>
                                {match.match_confidence === 'high' ? 'Alta' :
                          match.match_confidence === 'medium' ? 'Media' :
                          match.match_confidence === 'low' ? 'Bassa' : 'Manuale'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <div>
                                <strong>Data:</strong> {safeFormatDateTimeLocale(match.order_date)}
                              </div>
                              <div>
                                <strong>Negozio:</strong> {match.store_name || 'N/A'}
                              </div>
                              {match.orderDetails &&
                        <>
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-red-200">
                                    <span className="font-medium text-slate-800">Rimborso:</span>
                                    <span className="text-sm font-bold text-red-600">
                                      €{match.orderDetails.refund_value?.toFixed(2) || '0.00'}
                                    </span>
                                  </div>
                                  {match.orderDetails.complaint_reason &&
                          <div>
                                      <strong>Motivo:</strong> {match.orderDetails.complaint_reason}
                                    </div>
                          }
                                </>
                        }
                            </div>
                          </div>
                    )}
                      </div> :

                  <p className="text-sm text-slate-500 text-center py-2">
                        Nessun ordine sbagliato abbinato 🎉
                      </p>;

                })()}
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-slate-800">
                        {expandedView === 'lateShifts' ? 'Tutti i' : 'Ultimi 3'} Turni in Ritardo
                      </h3>
                    </div>
                    {getAllLateShifts(selectedEmployee.full_name).length > 3 &&
                  <button
                    onClick={() => setExpandedView(expandedView === 'lateShifts' ? null : 'lateShifts')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">

                        {expandedView === 'lateShifts' ? 'Mostra meno' : `Vedi tutti (${getAllLateShifts(selectedEmployee.full_name).length})`}
                      </button>
                  }
                  </div>
                  {(() => {
                  const lateShifts = expandedView === 'lateShifts' ?
                  getAllLateShifts(selectedEmployee.full_name) :
                  getLatestLateShifts(selectedEmployee.full_name);
                  return lateShifts.length > 0 ?
                  <div className="space-y-2">
                        {lateShifts.map((shift, index) => {
                      let ritardoReale = 0;
                      if (shift.timbratura_entrata && shift.ora_inizio) {
                        try {
                          const clockInTime = new Date(shift.timbratura_entrata);
                          const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
                          const scheduledStart = new Date(clockInTime);
                          scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
                          const delayMs = clockInTime - scheduledStart;
                          const delayMinutes = Math.floor(delayMs / 60000);
                          ritardoReale = delayMinutes > 0 ? delayMinutes : 0;
                        } catch (e) {}
                      }
                      return (
                        <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-3 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-800">
                                  {safeFormatDateLocale(shift.data)} - {shift.store_nome || 'N/A'}
                                </span>
                                <span className="text-sm font-bold text-red-600">
                                  +{ritardoReale} min
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                <strong>Previsto:</strong> {shift.ora_inizio}
                                {' → '}
                                <strong>Effettivo:</strong> {shift.timbratura_entrata ? safeFormatTime(shift.timbratura_entrata) : 'N/A'}
                              </div>
                            </div>);

                    })}
                      </div> :

                  <p className="text-sm text-slate-500 text-center py-2">
                        Nessun ritardo registrato 🎉
                      </p>;

                })()}
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <h3 className="font-bold text-slate-800">
                        {expandedView === 'missingClockIns' ? 'Tutti i' : 'Ultimi 3'} Turni con Timbratura Mancata
                      </h3>
                    </div>
                    {getAllMissingClockIns(selectedEmployee.full_name).length > 3 &&
                  <button
                    onClick={() => setExpandedView(expandedView === 'missingClockIns' ? null : 'missingClockIns')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">

                        {expandedView === 'missingClockIns' ? 'Mostra meno' : `Vedi tutti (${getAllMissingClockIns(selectedEmployee.full_name).length})`}
                      </button>
                  }
                  </div>
                  {(() => {
                  const missingClockIns = expandedView === 'missingClockIns' ?
                  getAllMissingClockIns(selectedEmployee.full_name) :
                  getLatestMissingClockIns(selectedEmployee.full_name);
                  return missingClockIns.length > 0 ?
                  <div className="space-y-2">
                        {missingClockIns.map((shift, index) =>
                    <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-3 rounded-lg border-2 border-orange-200">
                           <div className="flex items-center justify-between mb-1">
                             <span className="text-sm font-medium text-slate-800">
                               {safeFormatDateLocale(shift.data)} - {shift.store_nome || 'N/A'}
                             </span>
                             <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                               NON TIMBRATO
                             </span>
                           </div>
                           <div className="text-xs text-slate-500">
                             <strong>Orario Previsto:</strong> {shift.ora_inizio}
                             {' - '}
                             {shift.ora_fine}
                           </div>
                          </div>
                    )}
                      </div> :

                  <p className="text-sm text-slate-500 text-center py-2">
                        Nessuna timbratura mancata 🎉
                      </p>;

                })()}
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <h3 className="font-bold text-slate-800">
                        {expandedView === 'googleReviews' ? 'Tutte le' : 'Ultime 3'} Recensioni Google Maps
                      </h3>
                    </div>
                    {getAllGoogleReviews(selectedEmployee.full_name).length > 3 &&
                  <button
                    onClick={() => setExpandedView(expandedView === 'googleReviews' ? null : 'googleReviews')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">

                        {expandedView === 'googleReviews' ? 'Mostra meno' : `Vedi tutte (${getAllGoogleReviews(selectedEmployee.full_name).length})`}
                      </button>
                  }
                  </div>
                  {(() => {
                  const googleReviews = expandedView === 'googleReviews' ?
                  getAllGoogleReviews(selectedEmployee.full_name) :
                  getLatestGoogleReviews(selectedEmployee.full_name);
                  return googleReviews.length > 0 ?
                  <div className="space-y-2">
                        {googleReviews.map((review) =>
                    <div key={review.id} className="neumorphic-pressed p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-800">
                                {review.customer_name || 'Anonimo'}
                              </span>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) =>
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                            i < review.rating ?
                            'text-yellow-500 fill-yellow-500' :
                            'text-gray-300'}`
                            } />

                          )}
                              </div>
                            </div>
                            {review.comment &&
                      <p className="text-xs text-slate-800 mb-1">{review.comment}</p>
                      }
                            <p className="text-xs text-slate-500">
                              {safeFormatDateLocale(review.review_date)}
                            </p>
                          </div>
                    )}
                      </div> :

                  <p className="text-sm text-slate-500 text-center py-2">
                        Nessuna recensione Google Maps ricevuta
                      </p>;

                })()}
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-5 h-5 text-cyan-600" />
                    <h3 className="font-bold text-slate-800">Controlli Pulizia</h3>
                  </div>
                  {(() => {
                  const cleaningData = getCleaningScoreForEmployee(selectedEmployee.full_name);
                  return cleaningData.count > 0 ?
                  <div className="neumorphic-pressed p-4 rounded-xl">
                        <div className="text-center mb-3">
                          <p className="text-sm text-slate-500 mb-2">Percentuale Pulito</p>
                          <div className="flex items-center justify-center gap-3">
                            <p className={`text-3xl font-bold ${
                        cleaningData.percentualePulito >= 80 ? 'text-green-600' :
                        cleaningData.percentualePulito >= 60 ? 'text-blue-600' :
                        cleaningData.percentualePulito >= 40 ? 'text-yellow-600' : 'text-red-600'}`
                        }>
                              {cleaningData.percentualePulito.toFixed(1)}%
                            </p>
                            <Sparkles className={`w-6 h-6 ${
                        cleaningData.percentualePulito >= 80 ? 'text-green-600' :
                        cleaningData.percentualePulito >= 60 ? 'text-blue-600' :
                        cleaningData.percentualePulito >= 40 ? 'text-yellow-600' : 'text-red-600'}`
                        } />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="neumorphic-flat p-2 rounded-lg">
                            <p className="text-xs text-green-600 font-medium">Puliti</p>
                            <p className="text-lg font-bold text-green-600">{cleaningData.puliti}</p>
                          </div>
                          <div className="neumorphic-flat p-2 rounded-lg">
                            <p className="text-xs text-red-600 font-medium">Sporchi</p>
                            <p className="text-lg font-bold text-red-600">{cleaningData.sporchi}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">{cleaningData.count} controlli totali</p>
                      </div> :

                  <p className="text-sm text-slate-500 text-center py-2">
                        Nessun controllo pulizia assegnato
                      </p>;

                })()}
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-slate-800">Valutazione P2P</h3>
                  </div>
                  {(() => {
                  const p2pFeedbacks = getP2PFeedbackForEmployee(selectedEmployee.full_name);
                  return p2pFeedbacks.length > 0 ?
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                        {p2pFeedbacks.map((feedback) =>
                    <div key={feedback.id} className="neumorphic-pressed p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-800">
                                Da: {feedback.reviewer_name}
                              </span>
                              <span className="text-xs text-slate-500">
                                {(() => {
                            try {
                              return new Date(feedback.submitted_date).toLocaleDateString('it-IT');
                            } catch (e) {
                              return 'N/A';
                            }
                          })()}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {feedback.responses?.map((resp, idx) =>
                        <div key={idx} className="text-xs">
                                  <span className="text-slate-600">{resp.question_text}:</span>
                                  <span className="text-slate-800 font-medium ml-1">{resp.answer}</span>
                                </div>
                        )}
                            </div>
                          </div>
                    )}
                      </div> :

                  <p className="text-sm text-slate-500 text-center py-2">
                        Nessuna valutazione P2P ricevuta
                      </p>;

                })()}
                </div>
              </div>
            </NeumorphicCard>
          </div>
        }

        {showWeightsModal &&
        <MetricWeightsModal
          weights={metricWeights}
          onClose={() => setShowWeightsModal(false)} />

        }

        {/* Lettera Form Modal */}
        {showLetteraForm && selectedEmployeeForLettera &&
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Invia Lettera di Richiamo</h2>
                <button onClick={() => {setShowLetteraForm(false);setSelectedEmployeeForLettera(null);}} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="mb-4 neumorphic-pressed p-4 rounded-xl">
                <p className="text-sm text-slate-700"><strong>Dipendente:</strong></p>
                <p className="text-lg font-bold text-slate-800">{selectedEmployeeForLettera.full_name}</p>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Seleziona Template
                </label>
                <select
                value={selectedEmployeeForLettera.selectedTemplate || ''}
                onChange={(e) => setSelectedEmployeeForLettera({ ...selectedEmployeeForLettera, selectedTemplate: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                required>

                  <option value="">Seleziona template...</option>
                  {templates.filter((t) => t.tipo_lettera === 'lettera_richiamo' && t.attivo).map((t) =>
                <option key={t.id} value={t.id}>{t.nome_template}</option>
                )}
                </select>
              </div>

              <div className="flex gap-3">
                <NeumorphicButton
                type="button"
                onClick={() => {setShowLetteraForm(false);setSelectedEmployeeForLettera(null);}}
                className="flex-1">

                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                onClick={() => {
                  if (!selectedEmployeeForLettera.selectedTemplate) {
                    alert('Seleziona un template');
                    return;
                  }
                  inviaLetteraMutation.mutate({
                    userId: selectedEmployeeForLettera.id,
                    templateId: selectedEmployeeForLettera.selectedTemplate
                  });
                }}
                variant="primary"
                className="flex-1"
                disabled={inviaLetteraMutation.isPending}>

                  <FileText className="w-5 h-5 mr-2" />
                  Invia
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        }
      </div>
    </ProtectedPage>);

}

function GaussianChart({ employees }) {
  // Calculate mean and standard deviation
  const scores = employees.map((e) => e.performanceScore);
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance) || 1;

  // Generate gaussian curve data
  const gaussianData = [];
  for (let x = 0; x <= 100; x += 1) {
    const y = 1 / (stdDev * Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    gaussianData.push({ score: x, density: y });
  }

  // Normalize density for visualization
  const maxDensity = Math.max(...gaussianData.map((d) => d.density));
  gaussianData.forEach((d) => d.density = d.density / maxDensity * 100);

  // Get employee positions on the curve
  const employeePositions = employees.map((e) => {
    const density = 1 / (stdDev * Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * Math.pow((e.performanceScore - mean) / stdDev, 2));
    return {
      ...e,
      normalizedDensity: density / maxDensity * 100
    };
  });

  const getPerformanceColor = (score) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#2563eb';
    if (score >= 40) return '#ca8a04';
    return '#dc2626';
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={gaussianData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="gaussianGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.8} />
              <stop offset="40%" stopColor="#ca8a04" stopOpacity={0.8} />
              <stop offset="60%" stopColor="#2563eb" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="score"
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => v}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }} />

          <YAxis hide domain={[0, 110]} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const score = payload[0].payload.score;
                const empsAtScore = employees.filter((e) => Math.round(e.performanceScore) === Math.round(score));
                if (empsAtScore.length > 0) {
                  return (
                    <div className="bg-white p-2 rounded-lg shadow-lg border text-xs">
                      {empsAtScore.map((emp) =>
                      <div key={emp.id}>{emp.full_name}: {emp.performanceScore}</div>
                      )}
                    </div>);

                }
              }
              return null;
            }} />

          <Area
            type="monotone"
            dataKey="density"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#gaussianGradient)" />

          <ReferenceLine x={mean} stroke="#1e293b" strokeDasharray="5 5" strokeWidth={2} />
          {employeePositions.map((emp, idx) =>
          <ReferenceDot
            key={emp.id}
            x={emp.performanceScore}
            y={emp.normalizedDensity}
            r={6}
            fill={getPerformanceColor(emp.performanceScore)}
            stroke="#fff"
            strokeWidth={2} />

          )}
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-600"></div>
          <span className="text-slate-600">Poor (&lt;40)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
          <span className="text-slate-600">Needs Improvement (40-60)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span className="text-slate-600">Good (60-80)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <span className="text-slate-600">Excellent (&gt;80)</span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex justify-center gap-6 mt-4 text-xs text-slate-600">
        <div><strong>Media:</strong> {mean.toFixed(1)}</div>
        <div><strong>Dev. Std:</strong> {stdDev.toFixed(1)}</div>
      </div>
    </div>);

}

function MetricWeightsModal({ weights, onClose }) {
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState('Pizzaiolo');
  const [localWeights, setLocalWeights] = useState({
    Pizzaiolo: {
      ordini_sbagliati: weights.find((w) => w.metric_name === 'ordini_sbagliati' && w.ruolo === 'Pizzaiolo')?.weight || 2,
      ritardi: weights.find((w) => w.metric_name === 'ritardi' && w.ruolo === 'Pizzaiolo')?.weight || 0.3,
      timbrature_mancanti: weights.find((w) => w.metric_name === 'timbrature_mancanti' && w.ruolo === 'Pizzaiolo')?.weight || 1,
      straordinari: weights.find((w) => w.metric_name === 'straordinari' && w.ruolo === 'Pizzaiolo')?.weight || 0.5,
      bonus_per_recensione: weights.find((w) => w.metric_name === 'bonus_per_recensione' && w.ruolo === 'Pizzaiolo')?.weight || 0.5,
      min_recensioni: weights.find((w) => w.metric_name === 'min_recensioni' && w.ruolo === 'Pizzaiolo')?.weight || 5,
      malus_sotto_minimo_recensioni: weights.find((w) => w.metric_name === 'malus_sotto_minimo_recensioni' && w.ruolo === 'Pizzaiolo')?.weight || 2,
      punteggio_recensioni: weights.find((w) => w.metric_name === 'punteggio_recensioni' && w.ruolo === 'Pizzaiolo')?.weight || 2,
      pulizie: weights.find((w) => w.metric_name === 'pulizie' && w.ruolo === 'Pizzaiolo')?.weight || 1
    },
    Cassiere: {
      ordini_sbagliati: weights.find((w) => w.metric_name === 'ordini_sbagliati' && w.ruolo === 'Cassiere')?.weight || 2,
      ritardi: weights.find((w) => w.metric_name === 'ritardi' && w.ruolo === 'Cassiere')?.weight || 0.3,
      timbrature_mancanti: weights.find((w) => w.metric_name === 'timbrature_mancanti' && w.ruolo === 'Cassiere')?.weight || 1,
      straordinari: weights.find((w) => w.metric_name === 'straordinari' && w.ruolo === 'Cassiere')?.weight || 0.5,
      bonus_per_recensione: weights.find((w) => w.metric_name === 'bonus_per_recensione' && w.ruolo === 'Cassiere')?.weight || 0.5,
      min_recensioni: weights.find((w) => w.metric_name === 'min_recensioni' && w.ruolo === 'Cassiere')?.weight || 5,
      malus_sotto_minimo_recensioni: weights.find((w) => w.metric_name === 'malus_sotto_minimo_recensioni' && w.ruolo === 'Cassiere')?.weight || 2,
      punteggio_recensioni: weights.find((w) => w.metric_name === 'punteggio_recensioni' && w.ruolo === 'Cassiere')?.weight || 2,
      pulizie: weights.find((w) => w.metric_name === 'pulizie' && w.ruolo === 'Cassiere')?.weight || 1
    },
    'Store Manager': {
      ordini_sbagliati: weights.find((w) => w.metric_name === 'ordini_sbagliati' && w.ruolo === 'Store Manager')?.weight || 2,
      ritardi: weights.find((w) => w.metric_name === 'ritardi' && w.ruolo === 'Store Manager')?.weight || 0.3,
      timbrature_mancanti: weights.find((w) => w.metric_name === 'timbrature_mancanti' && w.ruolo === 'Store Manager')?.weight || 1,
      straordinari: weights.find((w) => w.metric_name === 'straordinari' && w.ruolo === 'Store Manager')?.weight || 0.5,
      bonus_per_recensione: weights.find((w) => w.metric_name === 'bonus_per_recensione' && w.ruolo === 'Store Manager')?.weight || 0.5,
      min_recensioni: weights.find((w) => w.metric_name === 'min_recensioni' && w.ruolo === 'Store Manager')?.weight || 5,
      malus_sotto_minimo_recensioni: weights.find((w) => w.metric_name === 'malus_sotto_minimo_recensioni' && w.ruolo === 'Store Manager')?.weight || 2,
      punteggio_recensioni: weights.find((w) => w.metric_name === 'punteggio_recensioni' && w.ruolo === 'Store Manager')?.weight || 2,
      pulizie: weights.find((w) => w.metric_name === 'pulizie' && w.ruolo === 'Store Manager')?.weight || 1
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (weightsData) => {
      for (const [role, metrics] of Object.entries(weightsData)) {
        for (const [metricName, weight] of Object.entries(metrics)) {
          const existing = weights.find((w) => w.metric_name === metricName && w.ruolo === role);
          if (existing) {
            await base44.entities.MetricWeight.update(existing.id, { weight, is_active: true });
          } else {
            await base44.entities.MetricWeight.create({ metric_name: metricName, weight, is_active: true, ruolo: role });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric-weights'] });
      onClose();
    }
  });

  const metricLabels = {
    ordini_sbagliati: 'Peso Ordini Sbagliati',
    ritardi: 'Peso Ritardi',
    timbrature_mancanti: 'Peso Timbrature Mancanti',
    straordinari: 'Peso Straordinari',
    bonus_per_recensione: 'Bonus per Recensione (4-5 stelle)',
    min_recensioni: 'Numero Minimo Recensioni',
    malus_sotto_minimo_recensioni: 'Malus per Recensione Mancante (sotto minimo)',
    punteggio_recensioni: 'Peso Punteggio Recensioni',
    pulizie: 'Peso Pulizie (se < 80%)'
  };

  const ruoli = ['Pizzaiolo', 'Cassiere', 'Store Manager'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <NeumorphicCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Configura Pesi Metriche per Ruolo</h2>
          <button onClick={onClose} className="nav-button p-2 rounded-lg flex-shrink-0">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
          {ruoli.map((role) =>
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeRole === role ?
            'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
            'nav-button text-slate-700'}`
            }>

              {role}
            </button>
          )}
        </div>

        <div className="space-y-4 mb-6">
          {Object.entries(localWeights[activeRole]).map(([key, value]) =>
          <div key={key}>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                {metricLabels[key]}
              </label>
              <input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setLocalWeights({
                ...localWeights,
                [activeRole]: { ...localWeights[activeRole], [key]: parseFloat(e.target.value) || 0 }
              })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none" />

            </div>
          )}
        </div>

        <NeumorphicButton
          onClick={() => saveMutation.mutate(localWeights)}
          variant="primary"
          className="w-full flex items-center justify-center gap-2">

          <Save className="w-5 h-5" />
          Salva Configurazione
        </NeumorphicButton>

        <div className="mt-4 p-4 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-800">
            <strong>ℹ️ Info:</strong> I pesi determinano quanto ogni metrica influenza il punteggio finale. 
            Valori più alti = maggiore impatto.
          </p>
        </div>
      </NeumorphicCard>
    </div>);

}

function ClusterSection({ title, metric, getClusters, formatValue, expandedCluster, setExpandedCluster, onSendLettera }) {
  const { best, worst } = getClusters(metric);
  const isExpanded = expandedCluster === metric;

  if (best.length === 0 && worst.length === 0) return null;

  return (
    <div className="neumorphic-pressed p-4 rounded-xl">
      <button
        onClick={() => setExpandedCluster(isExpanded ? null : metric)}
        className="w-full flex items-center justify-between mb-3">

        <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded &&
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Best */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h5 className="font-bold text-green-600 text-xs">Top 5</h5>
            </div>
            {best.map((emp, idx) =>
          <div key={emp.id} className="neumorphic-flat p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{idx + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">{emp.full_name}</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    {formatValue(emp)}
                  </span>
                </div>
              </div>
          )}
          </div>

          {/* Worst */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <h5 className="font-bold text-red-600 text-xs">Bottom 5</h5>
            </div>
            {worst.map((emp, idx) =>
          <div key={emp.id} className="neumorphic-flat p-3 rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{idx + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">{emp.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-red-600">
                      {formatValue(emp)}
                    </span>
                    <button
                  onClick={() => onSendLettera(emp)}
                  className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                  title="Invia lettera di richiamo">

                      <FileText className="w-4 h-4 text-orange-600" />
                    </button>
                  </div>
                </div>
              </div>
          )}
          </div>
        </div>
      }
    </div>);

}