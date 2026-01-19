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
  RefreshCw
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { parseISO, isWithinInterval, isValid, format as formatDate } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';

export default function Employees() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [sortBy, setSortBy] = useState('performance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedView, setExpandedView] = useState(null);
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  // CHANGED: Fetch users with dipendente role instead of Employee entity
  const { data: users = [] } = useQuery({
    queryKey: ['dipendenti-users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['planday-shifts'],
    queryFn: () => base44.entities.TurnoPlanday.list(),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list(),
  });

  const { data: allWrongOrderMatches = [] } = useQuery({
    queryKey: ['all-wrong-order-matches'],
    queryFn: () => base44.entities.WrongOrderMatch.list(),
  });

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: async () => {
      const orders = await base44.entities.WrongOrder.list('-order_date');
      return orders.filter(o => o.store_matched);
    },
  });

  const { data: metricWeights = [] } = useQuery({
    queryKey: ['metric-weights'],
    queryFn: () => base44.entities.MetricWeight.list(),
  });

  const { data: p2pResponses = [] } = useQuery({
    queryKey: ['p2p-responses'],
    queryFn: () => base44.entities.P2PFeedbackResponse.list('-submitted_date'),
  });

  const { data: cleaningInspections = [] } = useQuery({
    queryKey: ['cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date'),
  });

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.list(),
  });

  const currentOrderIds = useMemo(() => new Set(wrongOrders.map(o => o.id)), [wrongOrders]);
  const wrongOrderMatches = useMemo(() =>
    allWrongOrderMatches.filter(m => currentOrderIds.has(m.wrong_order_id))
  , [allWrongOrderMatches, currentOrderIds]);

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

    shiftsArray.forEach(shift => {
      const shiftDate = safeParseDate(shift.data);
      const normalizedDate = shiftDate ? shiftDate.toISOString().split('T')[0] : 'no-date';

      const normalizedStart = shift.ora_inizio
        ? shift.ora_inizio
        : 'no-start';
      const normalizedEnd = shift.ora_fine
        ? shift.ora_fine
        : 'no-end';

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
      filteredReviews = reviews.filter(review => {
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

    return users.map(user => {
      const employeeName = user.nome_cognome || user.full_name || user.email;

      let employeeShifts = shifts.filter(s => {
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

      const employeeWrongOrders = wrongOrderMatches.filter(m => {
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
      });

      const wrongOrdersCount = employeeWrongOrders.length;
      const wrongOrderRate = employeeShifts.length > 0
        ? (wrongOrdersCount / employeeShifts.length) * 100
        : 0;

      // Calcola ritardi - RICALCOLO MANUALE
      let totalLateMinutes = 0;
      let numeroRitardi = 0;
      employeeShifts.forEach(shift => {
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
        }
      });
      const avgLateMinutes = employeeShifts.length > 0 ? totalLateMinutes / employeeShifts.length : 0;
      const percentualeRitardi = employeeShifts.length > 0 ? (numeroRitardi / employeeShifts.length) * 100 : 0;
      
      // Timbrature mancanti - SOLO turni passati SENZA timbratura
      const numeroTimbratureMancate = employeeShifts.filter(s => {
        // Deve essere passato
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (shiftDate >= today) return false;
        
        // NON deve avere timbratura di entrata
        return !s.timbratura_entrata;
      }).length;

      const mentions = filteredReviews.filter(r => r.employee_mentioned === user.id);
      const positiveMentions = mentions.filter(r => r.rating >= 4).length;
      const negativeMentions = mentions.filter(r => r.rating < 3).length;

      const assignedReviews = filteredReviews.filter(r => {
        if (!r.employee_assigned_name) return false;
        const assignedNames = r.employee_assigned_name.split(',').map(n => n.trim().toLowerCase());
        return assignedNames.includes(employeeName.toLowerCase());
      });

      const googleReviews = assignedReviews.filter(r => r.source === 'google');
      const avgGoogleRating = googleReviews.length > 0
        ? googleReviews.reduce((sum, r) => sum + r.rating, 0) / googleReviews.length
        : 0;

      const getWeight = (metricName) => {
        const weight = metricWeights.find(w => w.metric_name === metricName && w.is_active);
        return weight ? weight.weight : 1;
      };

      const w_ordini = getWeight('ordini_sbagliati');
      const w_ritardi = getWeight('ritardi');
      const w_timbrature = getWeight('timbrature_mancanti');
      const w_num_recensioni = getWeight('numero_recensioni');
      const w_punteggio_recensioni = getWeight('punteggio_recensioni');
      const w_pulizie = getWeight('pulizie');

      // Calculate base score starting from 100
      let performanceScore = 100;
      
      // Deduct points for negative metrics (these ALWAYS reduce score)
      performanceScore -= (wrongOrdersCount * w_ordini);
      performanceScore -= (numeroRitardi * w_ritardi);
      performanceScore -= (numeroTimbratureMancate * w_timbrature);
      
      // Reduce score if average review rating is below 5 (scale: 5=0 penalty, 4=-5, 3=-10, 2=-15, 1=-20)
      if (googleReviews.length > 0 && avgGoogleRating < 5) {
        const reviewPenalty = (5 - avgGoogleRating) * w_punteggio_recensioni;
        performanceScore -= reviewPenalty;
      }
      
      // Small bonus for having reviews (but max +5)
      if (googleReviews.length > 0) {
        const reviewBonus = Math.min(googleReviews.length * w_num_recensioni, 5);
        performanceScore += reviewBonus;
      }
      
      // Pulizie: assegna ogni domanda al dipendente responsabile basandosi sul ruolo dell'attrezzatura
      const employeeCleaningScores = [];
      
      cleaningInspections.forEach(inspection => {
        if (!inspection.domande_risposte || inspection.analysis_status !== 'completed') return;
        
        // Filter by date if needed
        if (startDate || endDate) {
          if (!inspection.inspection_date) return;
          const inspDate = safeParseDate(inspection.inspection_date);
          if (!inspDate) return;
          const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
          const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;
          if (start && end && !isWithinInterval(inspDate, { start, end })) return;
          else if (start && inspDate < start) return;
          else if (end && inspDate > end) return;
        }
        
        const inspectionDate = safeParseDate(inspection.inspection_date);
        const inspectionStoreId = inspection.store_id;
        
        inspection.domande_risposte.forEach(risposta => {
          if (!risposta.attrezzatura) return;
          
          const attrezzatura = attrezzature.find(a => a.nome === risposta.attrezzatura);
          if (!attrezzatura || !attrezzatura.ruoli_responsabili || attrezzatura.ruoli_responsabili.length === 0) return;
          
          // Find the employee whose shift ended before the inspection
          const eligibleShifts = employeeShifts.filter(shift => {
            if (shift.store_id !== inspectionStoreId) return false;
            
            const shiftEnd = shift.timbratura_uscita || (shift.data && shift.ora_fine ? `${shift.data}T${shift.ora_fine}` : null);
            if (!shiftEnd) return false;

            try {
              const shiftEndDate = safeParseDate(shiftEnd);
              return shiftEndDate < inspectionDate;
            } catch (e) {
              return false;
            }
          });

          const roleFilteredShifts = eligibleShifts.filter(shift => {
            return attrezzatura.ruoli_responsabili.some(role => user.ruoli_dipendente?.includes(role));
          });

          const sortedShifts = roleFilteredShifts.sort((a, b) => {
            const endA = safeParseDate(a.timbratura_uscita || (a.data && a.ora_fine ? `${a.data}T${a.ora_fine}` : null));
            const endB = safeParseDate(b.timbratura_uscita || (b.data && b.ora_fine ? `${b.data}T${b.ora_fine}` : null));
            return endB - endA;
          });

          if (sortedShifts.length > 0) {
            // This employee was responsible for this question
            const equipmentKey = risposta.attrezzatura.toLowerCase().replace(/\s+/g, '_');
            const status = inspection[`${equipmentKey}_corrected`]
              ? inspection[`${equipmentKey}_corrected_status`]
              : inspection[`${equipmentKey}_pulizia_status`];
            
            if (status) {
              let score = 0;
              if (status === 'pulito') score = 100;
              else if (status === 'medio') score = 50;
              else if (status === 'sporco') score = 0;
              else if (status === 'non_valutabile') return; // Skip non-evaluable
              
              employeeCleaningScores.push(score);
            }
          }
        });
      });
      
      if (employeeCleaningScores.length > 0) {
        const avgCleaningScore = employeeCleaningScores.reduce((sum, s) => sum + s, 0) / employeeCleaningScores.length;
        if (avgCleaningScore < 80) {
          const cleaningPenalty = (80 - avgCleaningScore) * w_pulizie * 0.1;
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
        weights: {
          w_ordini,
          w_ritardi,
          w_timbrature,
          w_num_recensioni,
          w_punteggio_recensioni,
          w_pulizie
        }
      };
    });
  }, [users, shifts, reviews, wrongOrderMatches, startDate, endDate, metricWeights]);

  const filteredEmployees = useMemo(() => {
    let filtered = employeeMetrics;

    if (selectedStore !== 'all') {
      filtered = filtered.filter(e => {
        if (!e.assigned_stores || e.assigned_stores.length === 0) return true;
        return e.assigned_stores.some(storeName => {
          const store = stores.find(s => s.name === storeName);
          return store && store.id === selectedStore;
        });
      });
    }

    if (selectedPosition !== 'all') {
      filtered = filtered.filter(e => {
        return e.ruoli_dipendente && e.ruoli_dipendente.includes(selectedPosition);
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
  }, [employeeMetrics, selectedStore, selectedPosition, sortBy, sortOrder, stores]);

  const getPerformanceColor = (level) => {
    switch (level) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs_improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-slate-700';
    }
  };

  const getPerformanceLabel = (level) => {
    switch (level) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'needs_improvement': return 'Needs Improvement';
      case 'poor': return 'Poor';
      default: return 'N/A';
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
    const lateShifts = shifts
      .filter(s => {
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
      })
      .sort((a, b) => {
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
    const missingClockIns = shifts
      .filter(s => {
        if (s.dipendente_nome !== employeeName || !s.data) return false;
        
        // Verifica che la data sia passata
        const shiftDate = safeParseDate(s.data);
        if (!shiftDate) return false;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (shiftDate >= today) return false;
        
        // Verifica che NON ci sia timbratura di entrata
        if (s.timbratura_entrata) return false;
        
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
      })
      .sort((a, b) => {
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
    return reviews
      .filter(r => {
        if (!r.employee_assigned_name || r.source !== 'google' || !r.review_date) return false;
        
        const assignedNames = r.employee_assigned_name.split(',').map(n => n.trim().toLowerCase());
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
      })
      .sort((a, b) => {
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
    const employeeMatches = wrongOrderMatches.filter(m => {
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

    return employeeMatches.map(match => {
      const orderDetails = wrongOrders.find(o => o.id === match.wrong_order_id);
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
    return p2pResponses
      .filter(r => r.reviewed_name === employeeName)
      .sort((a, b) => {
        const dateA = new Date(a.submitted_date || 0);
        const dateB = new Date(b.submitted_date || 0);
        return dateB.getTime() - dateA.getTime();
      });
  };

  const getCleaningScoreForEmployee = (employeeName) => {
    const user = users.find(u => 
      (u.nome_cognome || u.full_name || u.email) === employeeName
    );
    
    if (!user) return { avgScore: null, count: 0 };
    
    const employeeCleaningScores = [];
    
    cleaningInspections.forEach(inspection => {
      if (!inspection.domande_risposte || inspection.analysis_status !== 'completed') return;
      
      // Filter by date if needed
      if (startDate || endDate) {
        if (!inspection.inspection_date) return;
        const inspDate = safeParseDate(inspection.inspection_date);
        if (!inspDate) return;
        const start = startDate ? safeParseDate(startDate + 'T00:00:00') : null;
        const end = endDate ? safeParseDate(endDate + 'T23:59:59') : null;
        if (start && end && !isWithinInterval(inspDate, { start, end })) return;
        else if (start && inspDate < start) return;
        else if (end && inspDate > end) return;
      }
      
      const inspectionDate = safeParseDate(inspection.inspection_date);
      const inspectionStoreId = inspection.store_id;
      
      inspection.domande_risposte.forEach(risposta => {
        if (!risposta.attrezzatura) return;
        
        const attrezzatura = attrezzature.find(a => a.nome === risposta.attrezzatura);
        if (!attrezzatura || !attrezzatura.ruoli_responsabili || attrezzatura.ruoli_responsabili.length === 0) return;
        
        // Find shifts for this employee at this store that ended before inspection
        const eligibleShifts = shifts.filter(shift => {
          if (shift.dipendente_nome !== employeeName) return false;
          if (shift.store_id !== inspectionStoreId) return false;
          
          const shiftEnd = shift.timbratura_uscita || (shift.data && shift.ora_fine ? `${shift.data}T${shift.ora_fine}` : null);
          if (!shiftEnd) return false;

          try {
            const shiftEndDate = safeParseDate(shiftEnd);
            return shiftEndDate < inspectionDate;
          } catch (e) {
            return false;
          }
        });

        const roleFilteredShifts = eligibleShifts.filter(shift => {
          return attrezzatura.ruoli_responsabili.some(role => user.ruoli_dipendente?.includes(role));
        });

        const sortedShifts = roleFilteredShifts.sort((a, b) => {
          const endA = safeParseDate(a.timbratura_uscita || (a.data && a.ora_fine ? `${a.data}T${a.ora_fine}` : null));
          const endB = safeParseDate(b.timbratura_uscita || (b.data && b.ora_fine ? `${b.data}T${b.ora_fine}` : null));
          return endB - endA;
        });

        if (sortedShifts.length > 0) {
          // This employee was responsible for this question
          const equipmentKey = risposta.attrezzatura.toLowerCase().replace(/\s+/g, '_');
          const status = inspection[`${equipmentKey}_corrected`]
            ? inspection[`${equipmentKey}_corrected_status`]
            : inspection[`${equipmentKey}_pulizia_status`];
          
          if (status) {
            let score = 0;
            if (status === 'pulito') score = 100;
            else if (status === 'medio') score = 50;
            else if (status === 'sporco') score = 0;
            else if (status === 'non_valutabile') return; // Skip non-evaluable
            
            employeeCleaningScores.push(score);
          }
        }
      });
    });

    if (employeeCleaningScores.length === 0) return { avgScore: null, count: 0 };

    const avgScore = employeeCleaningScores.reduce((sum, s) => sum + s, 0) / employeeCleaningScores.length;
    return { avgScore, count: employeeCleaningScores.length };
  };

  const getConfidenceBadgeColor = (confidence) => {
    switch(confidence) {
      case 'high': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-orange-100 text-orange-700';
      case 'manual': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
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

  return (
    <ProtectedPage pageName="Employees">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
              Performance Dipendenti
            </h1>
            <p className="text-sm text-slate-500">Ranking dipendenti</p>
          </div>
          <div className="flex gap-2">
            <NeumorphicButton
              onClick={handleRecalculateDelays}
              disabled={recalculating}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{recalculating ? 'Ricalcolo...' : 'Ricalcola Ritardi'}</span>
            </NeumorphicButton>
            <NeumorphicButton
              onClick={() => setShowWeightsModal(true)}
              className="flex items-center gap-2"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden md:inline">Pesi</span>
            </NeumorphicButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
          >
            <option value="all">Tutti i Locali</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>

          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
          >
            <option value="all">Tutti i Ruoli</option>
            <option value="Pizzaiolo">Pizzaiolo</option>
            <option value="Cassiere">Cassiere</option>
            <option value="Store Manager">Store Manager</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
            placeholder="Data inizio"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
            placeholder="Data fine"
          />

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="neumorphic-flat px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
                {filteredEmployees.filter(e => e.performanceLevel === 'excellent').length}
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
                {filteredEmployees.filter(e => e.performanceLevel === 'good').length}
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
                {filteredEmployees.filter(e => e.performanceLevel === 'poor' || e.performanceLevel === 'needs_improvement').length}
              </h3>
              <p className="text-xs text-slate-500">Attenzione</p>
            </div>
          </NeumorphicCard>
        </div>

        {/* Gaussian Distribution Chart */}
        {filteredEmployees.length > 2 && (
          <NeumorphicCard className="p-4 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">Distribuzione Performance</h3>
            </div>
            <GaussianChart employees={filteredEmployees} />
          </NeumorphicCard>
        )}

        <div className="grid grid-cols-1 gap-3">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee, index) => (
              <NeumorphicCard 
                key={employee.id}
                className="p-4 hover:shadow-xl transition-all"
              >
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
                      {employee.ruoli_dipendente && employee.ruoli_dipendente.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {employee.ruoli_dipendente.map((role, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              {role}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-lg lg:text-xl font-bold ${getPerformanceColor(employee.performanceLevel)}`}>
                          {employee.performanceScore}
                        </span>
                        {employee.googleReviewCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold text-slate-700">
                              {employee.avgGoogleRating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      employee.wrongOrders > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {employee.wrongOrders} ord
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      employee.numeroRitardi > 5 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {employee.numeroRitardi} rit
                    </span>
                  </div>
                </div>
                
                <NeumorphicButton
                  onClick={() => setSelectedEmployee(employee)}
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Mostra Dettagli
                </NeumorphicButton>
              </NeumorphicCard>
            ))
          ) : (
            <NeumorphicCard className="p-8 text-center">
              <p className="text-slate-500">Nessun dipendente trovato</p>
            </NeumorphicCard>
          )}
        </div>

        {selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
            <NeumorphicCard className="w-full lg:max-w-2xl max-h-[85vh] lg:max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
              <div className="flex items-start justify-between mb-4 lg:mb-6 sticky top-0 bg-gradient-to-br from-slate-50 to-slate-100 pb-4 -mt-4 pt-4 -mx-4 px-4 z-10">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1 truncate">{selectedEmployee.full_name}</h2>
                  {selectedEmployee.ruoli_dipendente && selectedEmployee.ruoli_dipendente.length > 0 && (
                    <p className="text-sm text-slate-500 truncate">{selectedEmployee.ruoli_dipendente.join(', ')}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedEmployee(null);
                    setExpandedView(null);
                  }}
                  className="nav-button px-3 py-2 rounded-lg text-slate-700 flex-shrink-0 ml-3"
                >
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
                  {selectedEmployee.googleReviewCount > 0 ? (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <Star className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-500 fill-yellow-500" />
                        <p className="text-2xl lg:text-3xl font-bold text-slate-800">
                          {selectedEmployee.avgGoogleRating.toFixed(1)}
                        </p>
                      </div>
                      <p className="text-xs mt-1 text-slate-500">{selectedEmployee.googleReviewCount} reviews</p>
                    </>
                  ) : (
                    <p className="text-xl text-slate-400">N/A</p>
                  )}
                </div>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl mb-4 bg-blue-50">
                <h4 className="text-sm font-bold text-blue-800 mb-2">Dettaglio Calcolo Punteggio</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p><strong>Base:</strong> 100 punti</p>
                  {selectedEmployee.weights.w_ordini > 0 && (
                    <p className="text-red-600"><strong>- Ordini Sbagliati:</strong> {selectedEmployee.wrongOrders} × {selectedEmployee.weights.w_ordini} = -{(selectedEmployee.wrongOrders * selectedEmployee.weights.w_ordini).toFixed(1)}</p>
                  )}
                  {selectedEmployee.weights.w_ritardi > 0 && (
                    <p className="text-red-600"><strong>- Ritardi:</strong> {selectedEmployee.numeroRitardi} × {selectedEmployee.weights.w_ritardi} = -{(selectedEmployee.numeroRitardi * selectedEmployee.weights.w_ritardi).toFixed(1)}</p>
                  )}
                  {selectedEmployee.weights.w_timbrature > 0 && (
                    <p className="text-red-600"><strong>- Timbrature Mancate:</strong> {selectedEmployee.numeroTimbratureMancate} × {selectedEmployee.weights.w_timbrature} = -{(selectedEmployee.numeroTimbratureMancate * selectedEmployee.weights.w_timbrature).toFixed(1)}</p>
                  )}
                  {selectedEmployee.weights.w_punteggio_recensioni > 0 && selectedEmployee.googleReviewCount > 0 && selectedEmployee.avgGoogleRating < 5 && (
                    <p className="text-red-600"><strong>- Media Recensioni &lt; 5:</strong> (5 - {selectedEmployee.avgGoogleRating.toFixed(1)}) × {selectedEmployee.weights.w_punteggio_recensioni} = -{((5 - selectedEmployee.avgGoogleRating) * selectedEmployee.weights.w_punteggio_recensioni).toFixed(1)}</p>
                  )}
                  {selectedEmployee.weights.w_num_recensioni > 0 && selectedEmployee.googleReviewCount > 0 && (
                    <p className="text-green-600"><strong>+ Bonus Recensioni:</strong> min({selectedEmployee.googleReviewCount} × {selectedEmployee.weights.w_num_recensioni}, 5) = +{Math.min(selectedEmployee.googleReviewCount * selectedEmployee.weights.w_num_recensioni, 5).toFixed(1)}</p>
                  )}
                  {selectedEmployee.weights.w_pulizie > 0 && (() => {
                    const cleaningData = getCleaningScoreForEmployee(selectedEmployee.full_name);
                    if (cleaningData.count > 0) {
                      if (cleaningData.avgScore < 80) {
                        const penalty = (80 - cleaningData.avgScore) * selectedEmployee.weights.w_pulizie * 0.1;
                        return (
                          <p className="text-red-600"><strong>- Pulizie &lt; 80:</strong> (80 - {cleaningData.avgScore.toFixed(1)}) × {selectedEmployee.weights.w_pulizie} × 0.1 = -{penalty.toFixed(1)}</p>
                        );
                      } else {
                        return (
                          <p className="text-green-600"><strong>✓ Pulizie OK:</strong> Score {cleaningData.avgScore.toFixed(1)} ≥ 80 (peso {selectedEmployee.weights.w_pulizie}, nessuna penalità)</p>
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
                    {getAllWrongOrders(selectedEmployee.full_name).length > 3 && (
                      <button
                        onClick={() => setExpandedView(expandedView === 'wrongOrders' ? null : 'wrongOrders')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expandedView === 'wrongOrders' ? 'Mostra meno' : `Vedi tutti (${getAllWrongOrders(selectedEmployee.full_name).length})`}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const wrongOrdersList = expandedView === 'wrongOrders' 
                      ? getAllWrongOrders(selectedEmployee.full_name) 
                      : getLatestWrongOrders(selectedEmployee.full_name);
                    return wrongOrdersList.length > 0 ? (
                      <div className="space-y-2">
                        {wrongOrdersList.map((match, index) => (
                          <div key={`${match.id}-${index}`} className="neumorphic-pressed p-3 rounded-lg border-2 border-red-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  match.platform === 'glovo' 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : 'bg-teal-100 text-teal-700'
                                }`}>
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
                              {match.orderDetails && (
                                <>
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-red-200">
                                    <span className="font-medium text-slate-800">Rimborso:</span>
                                    <span className="text-sm font-bold text-red-600">
                                      €{match.orderDetails.refund_value?.toFixed(2) || '0.00'}
                                    </span>
                                  </div>
                                  {match.orderDetails.complaint_reason && (
                                    <div>
                                      <strong>Motivo:</strong> {match.orderDetails.complaint_reason}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Nessun ordine sbagliato abbinato 🎉
                      </p>
                    );
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
                    {getAllLateShifts(selectedEmployee.full_name).length > 3 && (
                      <button
                        onClick={() => setExpandedView(expandedView === 'lateShifts' ? null : 'lateShifts')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expandedView === 'lateShifts' ? 'Mostra meno' : `Vedi tutti (${getAllLateShifts(selectedEmployee.full_name).length})`}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const lateShifts = expandedView === 'lateShifts'
                      ? getAllLateShifts(selectedEmployee.full_name)
                      : getLatestLateShifts(selectedEmployee.full_name);
                    return lateShifts.length > 0 ? (
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
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Nessun ritardo registrato 🎉
                      </p>
                    );
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
                    {getAllMissingClockIns(selectedEmployee.full_name).length > 3 && (
                      <button
                        onClick={() => setExpandedView(expandedView === 'missingClockIns' ? null : 'missingClockIns')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expandedView === 'missingClockIns' ? 'Mostra meno' : `Vedi tutti (${getAllMissingClockIns(selectedEmployee.full_name).length})`}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const missingClockIns = expandedView === 'missingClockIns'
                      ? getAllMissingClockIns(selectedEmployee.full_name)
                      : getLatestMissingClockIns(selectedEmployee.full_name);
                    return missingClockIns.length > 0 ? (
                      <div className="space-y-2">
                        {missingClockIns.map((shift, index) => (
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
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Nessuna timbratura mancata 🎉
                      </p>
                    );
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
                    {getAllGoogleReviews(selectedEmployee.full_name).length > 3 && (
                      <button
                        onClick={() => setExpandedView(expandedView === 'googleReviews' ? null : 'googleReviews')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {expandedView === 'googleReviews' ? 'Mostra meno' : `Vedi tutte (${getAllGoogleReviews(selectedEmployee.full_name).length})`}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const googleReviews = expandedView === 'googleReviews'
                      ? getAllGoogleReviews(selectedEmployee.full_name)
                      : getLatestGoogleReviews(selectedEmployee.full_name);
                    return googleReviews.length > 0 ? (
                      <div className="space-y-2">
                        {googleReviews.map((review) => (
                          <div key={review.id} className="neumorphic-pressed p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-800">
                                {review.customer_name || 'Anonimo'}
                              </span>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < review.rating
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-xs text-slate-800 mb-1">{review.comment}</p>
                            )}
                            <p className="text-xs text-slate-500">
                              {safeFormatDateLocale(review.review_date)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Nessuna recensione Google Maps ricevuta
                      </p>
                    );
                  })()}
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-5 h-5 text-cyan-600" />
                    <h3 className="font-bold text-slate-800">Controlli Pulizia</h3>
                  </div>
                  {(() => {
                    const cleaningData = getCleaningScoreForEmployee(selectedEmployee.full_name);
                    return cleaningData.count > 0 ? (
                      <div className="neumorphic-pressed p-4 rounded-xl text-center">
                        <p className="text-sm text-slate-500 mb-2">Score Medio</p>
                        <div className="flex items-center justify-center gap-3">
                          <p className={`text-3xl font-bold ${
                            cleaningData.avgScore >= 80 ? 'text-green-600' :
                            cleaningData.avgScore >= 60 ? 'text-blue-600' :
                            cleaningData.avgScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {cleaningData.avgScore.toFixed(0)}
                          </p>
                          <Sparkles className={`w-6 h-6 ${
                            cleaningData.avgScore >= 80 ? 'text-green-600' :
                            cleaningData.avgScore >= 60 ? 'text-blue-600' :
                            cleaningData.avgScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                          }`} />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">{cleaningData.count} ispezioni completate</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Nessun controllo pulizia assegnato
                      </p>
                    );
                  })()}
                </div>

                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-slate-800">Valutazione P2P</h3>
                  </div>
                  {(() => {
                    const p2pFeedbacks = getP2PFeedbackForEmployee(selectedEmployee.full_name);
                    return p2pFeedbacks.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {p2pFeedbacks.map((feedback) => (
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
                              {feedback.responses?.map((resp, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="text-slate-600">{resp.question_text}:</span>
                                  <span className="text-slate-800 font-medium ml-1">{resp.answer}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Nessuna valutazione P2P ricevuta
                      </p>
                    );
                  })()}
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}

        {showWeightsModal && (
          <MetricWeightsModal
            weights={metricWeights}
            onClose={() => setShowWeightsModal(false)}
          />
        )}
      </div>
    </ProtectedPage>
  );
}

function GaussianChart({ employees }) {
  // Calculate mean and standard deviation
  const scores = employees.map(e => e.performanceScore);
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance) || 1;

  // Generate gaussian curve data
  const gaussianData = [];
  for (let x = 0; x <= 100; x += 1) {
    const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    gaussianData.push({ score: x, density: y });
  }

  // Normalize density for visualization
  const maxDensity = Math.max(...gaussianData.map(d => d.density));
  gaussianData.forEach(d => d.density = (d.density / maxDensity) * 100);

  // Get employee positions on the curve
  const employeePositions = employees.map(e => {
    const density = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((e.performanceScore - mean) / stdDev, 2));
    return {
      ...e,
      normalizedDensity: (density / maxDensity) * 100
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
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.8}/>
              <stop offset="40%" stopColor="#ca8a04" stopOpacity={0.8}/>
              <stop offset="60%" stopColor="#2563eb" stopOpacity={0.8}/>
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="score" 
            type="number" 
            domain={[0, 100]} 
            tickFormatter={(v) => v}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis hide domain={[0, 110]} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const score = payload[0].payload.score;
                const empsAtScore = employees.filter(e => Math.round(e.performanceScore) === Math.round(score));
                if (empsAtScore.length > 0) {
                  return (
                    <div className="bg-white p-2 rounded-lg shadow-lg border text-xs">
                      {empsAtScore.map(emp => (
                        <div key={emp.id}>{emp.full_name}: {emp.performanceScore}</div>
                      ))}
                    </div>
                  );
                }
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="density" 
            stroke="#3b82f6" 
            strokeWidth={2}
            fill="url(#gaussianGradient)" 
          />
          <ReferenceLine x={mean} stroke="#1e293b" strokeDasharray="5 5" strokeWidth={2} />
          {employeePositions.map((emp, idx) => (
            <ReferenceDot
              key={emp.id}
              x={emp.performanceScore}
              y={emp.normalizedDensity}
              r={6}
              fill={getPerformanceColor(emp.performanceScore)}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
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
    </div>
  );
}

function MetricWeightsModal({ weights, onClose }) {
  const queryClient = useQueryClient();
  const [localWeights, setLocalWeights] = useState({
    ordini_sbagliati: weights.find(w => w.metric_name === 'ordini_sbagliati')?.weight || 2,
    ritardi: weights.find(w => w.metric_name === 'ritardi')?.weight || 0.3,
    timbrature_mancanti: weights.find(w => w.metric_name === 'timbrature_mancanti')?.weight || 1,
    numero_recensioni: weights.find(w => w.metric_name === 'numero_recensioni')?.weight || 0.5,
    punteggio_recensioni: weights.find(w => w.metric_name === 'punteggio_recensioni')?.weight || 2,
    pulizie: weights.find(w => w.metric_name === 'pulizie')?.weight || 1
  });

  const saveMutation = useMutation({
    mutationFn: async (weightsData) => {
      for (const [metricName, weight] of Object.entries(weightsData)) {
        const existing = weights.find(w => w.metric_name === metricName);
        if (existing) {
          await base44.entities.MetricWeight.update(existing.id, { weight, is_active: true });
        } else {
          await base44.entities.MetricWeight.create({ metric_name: metricName, weight, is_active: true });
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
    numero_recensioni: 'Peso Numero Recensioni',
    punteggio_recensioni: 'Peso Punteggio Recensioni',
    pulizie: 'Peso Pulizie (se < 80)'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <NeumorphicCard className="max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Configura Pesi Metriche</h2>
          <button onClick={onClose} className="nav-button p-2 rounded-lg">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {Object.entries(localWeights).map(([key, value]) => (
            <div key={key}>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                {metricLabels[key]}
              </label>
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setLocalWeights({ ...localWeights, [key]: parseFloat(e.target.value) || 0 })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              />
            </div>
          ))}
        </div>

        <NeumorphicButton
          onClick={() => saveMutation.mutate(localWeights)}
          variant="primary"
          className="w-full flex items-center justify-center gap-2"
        >
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
    </div>
  );
}