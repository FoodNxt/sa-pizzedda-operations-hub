
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  ShoppingCart,
  Star,
  Eye,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isWithinInterval, isValid, format as formatDate } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function Employees() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [sortBy, setSortBy] = useState('performance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedView, setExpandedView] = useState(null); // 'late', 'missing', 'reviews', 'wrongOrders', null

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list(),
  });

  // Load ALL wrong order matches
  const { data: allWrongOrderMatches = [] } = useQuery({
    queryKey: ['all-wrong-order-matches'], // Changed key to differentiate from filtered one
    queryFn: () => base44.entities.WrongOrderMatch.list(),
  });

  // NEW: Load wrong orders to filter matches
  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders'],
    queryFn: async () => {
      const orders = await base44.entities.WrongOrder.list('-order_date');
      return orders.filter(o => o.store_matched);
    },
  });

  // FIXED: Filter matches to only include current orders
  const currentOrderIds = useMemo(() => new Set(wrongOrders.map(o => o.id)), [wrongOrders]);
  const wrongOrderMatches = useMemo(() =>
    allWrongOrderMatches.filter(m => currentOrderIds.has(m.wrong_order_id))
  , [allWrongOrderMatches, currentOrderIds]);

  // Helper function to safely parse dates
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

  // Helper function to safely format dates
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

  // Helper function to safely format time from datetime
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

  // Helper function to safely format date to locale string
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

  // Helper function to safely format datetime to locale string
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

  // Helper function to deduplicate shifts
  const deduplicateShifts = (shiftsArray) => {
    const uniqueShiftsMap = new Map();

    shiftsArray.forEach(shift => {
      // Normalize date to YYYY-MM-DD format for comparison
      const shiftDate = safeParseDate(shift.shift_date);
      const normalizedDate = shiftDate ? shiftDate.toISOString().split('T')[0] : 'no-date';

      // Normalize scheduled times (extract just HH:mm or use 'no-time' if null)
      const normalizedStart = shift.scheduled_start
        ? new Date(shift.scheduled_start).toISOString().substring(11, 16)
        : 'no-start';
      const normalizedEnd = shift.scheduled_end
        ? new Date(shift.scheduled_end).toISOString().substring(11, 16)
        : 'no-end';

      // Create unique key
      const key = `${shift.employee_name}|${shift.store_id || 'no-store'}|${normalizedDate}|${normalizedStart}|${normalizedEnd}`;

      // Only keep the first occurrence (or the one with older created_date)
      // If key exists, keep the one with older created_date (assuming older created_date means the "original" shift record)
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

  // Calculate employee metrics
  const employeeMetrics = useMemo(() => {
    // Filter reviews by date range
    let filteredReviews = reviews;
    if (startDate || endDate) {
      filteredReviews = reviews.filter(review => {
        // Ensure review_date exists before parsing
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

    return employees.map(employee => {
      // Shift metrics (filtered by date)
      let employeeShifts = shifts.filter(s => {
        if (s.employee_name !== employee.full_name) return false;

        // Date filter
        if (startDate || endDate) {
          if (!s.shift_date) return false;
          
          const shiftDate = safeParseDate(s.shift_date);
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
      });

      // ✅ DEDUPLICATE SHIFTS BEFORE CALCULATING METRICS
      employeeShifts = deduplicateShifts(employeeShifts);

      // Orders metrics - REPLACED with WrongOrderMatches
      const employeeWrongOrders = wrongOrderMatches.filter(m => {
        if (m.matched_employee_name !== employee.full_name) return false;
        
        // Apply date filter if set
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

      const wrongOrdersCount = employeeWrongOrders.length; // Renamed to avoid confusion with `wrongOrders` array

      // Calculate wrong order rate (per shifts worked)
      const wrongOrderRate = employeeShifts.length > 0
        ? (wrongOrdersCount / employeeShifts.length) * 100
        : 0;

      const totalLateMinutes = employeeShifts.reduce((sum, s) => sum + (s.minuti_di_ritardo || 0), 0);
      const avgLateMinutes = employeeShifts.length > 0 ? totalLateMinutes / employeeShifts.length : 0;

      // Calcolo ritardi
      const numeroRitardi = employeeShifts.filter(s => s.ritardo === true).length;
      const percentualeRitardi = employeeShifts.length > 0 ? (numeroRitardi / employeeShifts.length) * 100 : 0;

      // ✅ Calcolo timbrature mancate
      const numeroTimbratureMancate = employeeShifts.filter(s => s.timbratura_mancata === true).length;

      // Review mentions (filtered by date)
      const mentions = filteredReviews.filter(r => r.employee_mentioned === employee.id);
      const positiveMentions = mentions.filter(r => r.rating >= 4).length;
      const negativeMentions = mentions.filter(r => r.rating < 3).length;

      // Calculate average Google rating from assigned reviews (filtered by date)
      const assignedReviews = filteredReviews.filter(r => {
        if (!r.employee_assigned_name) return false;
        // Handle cases where employee_assigned_name might be a single string or comma-separated
        const assignedNames = r.employee_assigned_name.split(',').map(n => n.trim().toLowerCase());
        return assignedNames.includes(employee.full_name.toLowerCase());
      });

      const googleReviews = assignedReviews.filter(r => r.source === 'google');
      const avgGoogleRating = googleReviews.length > 0
        ? googleReviews.reduce((sum, r) => sum + r.rating, 0) / googleReviews.length
        : 0;

      // Calculate overall performance score (0-100)
      let performanceScore = 100;
      performanceScore -= wrongOrderRate * 2; // Penalty for wrong orders
      performanceScore -= avgLateMinutes * 0.5; // Penalty for lateness
      performanceScore -= percentualeRitardi * 0.3; // Penalty for delay percentage
      performanceScore -= numeroTimbratureMancate * 1; // Penalty for missing clock-ins
      performanceScore += positiveMentions * 2; // Bonus for positive mentions
      performanceScore -= negativeMentions * 3; // Penalty for negative mentions
      // The 'avgSatisfaction' portion has been removed as orders are no longer directly tracked here for satisfaction
      performanceScore = Math.max(0, Math.min(100, performanceScore));

      // Performance level
      const performanceLevel = performanceScore >= 80 ? 'excellent' :
                              performanceScore >= 60 ? 'good' :
                              performanceScore >= 40 ? 'needs_improvement' :
                              'poor';

      return {
        ...employee,
        wrongOrders: wrongOrdersCount, // Using the new count
        wrongOrderRate,
        // avgProcessingTime is no longer calculated
        // avgSatisfaction is no longer calculated
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
        // totalOrders is no longer calculated
        totalShifts: employeeShifts.length,
        avgGoogleRating,
        googleReviewCount: googleReviews.length
      };
    });
  }, [employees, shifts, reviews, wrongOrderMatches, startDate, endDate]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let filtered = employeeMetrics;

    if (selectedStore !== 'all') {
      filtered = filtered.filter(e => e.store_id === selectedStore);
    }

    if (selectedPosition !== 'all') {
      filtered = filtered.filter(e => e.position === selectedPosition);
    }

    // Sort
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
  }, [employeeMetrics, selectedStore, selectedPosition, sortBy, sortOrder]);

  const getPerformanceColor = (level) => {
    switch (level) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs_improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-slate-700'; // Changed from 500 to 700
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

  // Get ALL late shifts for selected employee (not just 3)
  const getAllLateShifts = (employeeName) => {
    const lateShifts = shifts
      .filter(s => {
        if (s.employee_name !== employeeName || s.ritardo !== true || !s.shift_date) return false;
        
        // Apply date filter if set
        if (startDate || endDate) {
          const shiftDate = safeParseDate(s.shift_date);
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
        const dateA = safeParseDate(a.shift_date);
        const dateB = safeParseDate(b.shift_date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
      });

    return deduplicateShifts(lateShifts);
  };

  // Get latest 3 late shifts for selected employee
  const getLatestLateShifts = (employeeName) => {
    return getAllLateShifts(employeeName).slice(0, 3);
  };

  // Get ALL missing clock-ins for selected employee
  const getAllMissingClockIns = (employeeName) => {
    const missingClockIns = shifts
      .filter(s => {
        if (s.employee_name !== employeeName || s.timbratura_mancata !== true || !s.shift_date) return false;
        
        // Apply date filter if set
        if (startDate || endDate) {
          const shiftDate = safeParseDate(s.shift_date);
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
        const dateA = safeParseDate(a.shift_date);
        const dateB = safeParseDate(b.shift_date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
      });

    return deduplicateShifts(missingClockIns);
  };

  // Get latest 3 missing clock-ins for selected employee
  const getLatestMissingClockIns = (employeeName) => {
    return getAllMissingClockIns(employeeName).slice(0, 3);
  };

  // Get ALL Google reviews for selected employee
  const getAllGoogleReviews = (employeeName) => {
    return reviews
      .filter(r => {
        if (!r.employee_assigned_name || r.source !== 'google' || !r.review_date) return false;
        
        const assignedNames = r.employee_assigned_name.split(',').map(n => n.trim().toLowerCase());
        if (!assignedNames.includes(employeeName.toLowerCase())) return false;
        
        // Apply date filter if set
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
        return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
      });
  };

  // Get latest 3 Google reviews for selected employee
  const getLatestGoogleReviews = (employeeName) => {
    return getAllGoogleReviews(employeeName).slice(0, 3);
  };

  // NEW: Get ALL wrong orders for selected employee
  const getAllWrongOrders = (employeeName) => {
    const employeeMatches = wrongOrderMatches.filter(m => {
      if (m.matched_employee_name !== employeeName) return false;
      
      // Apply date filter if set
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
      return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
    });

    // Enrich with order details
    return employeeMatches.map(match => {
      const orderDetails = wrongOrders.find(o => o.id === match.wrong_order_id);
      return {
        ...match,
        orderDetails
      };
    });
  };

  // NEW: Get latest 3 wrong orders for selected employee
  const getLatestWrongOrders = (employeeName) => {
    return getAllWrongOrders(employeeName).slice(0, 3);
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

  return (
    <ProtectedPage pageName="Employees">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Performance
          </h1>
          <p className="text-sm text-slate-500">Ranking dipendenti</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
          >
            <option value="all">Tutti</option>
            {stores.map(store => (
              <option key={store.id} value={store.name}>{store.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
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

        {/* Summary Stats */}
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

        {/* Employee Cards - Mobile Optimized */}
        <div className="grid grid-cols-1 gap-3">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee, index) => (
              <NeumorphicCard 
                key={employee.id}
                className="p-4 hover:shadow-xl transition-all cursor-pointer"
                onClick={() => setSelectedEmployee(employee)}
              >
                <div className="flex items-start justify-between gap-3">
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
              </NeumorphicCard>
            ))
          ) : (
            <NeumorphicCard className="p-8 text-center">
              <p className="text-slate-500">Nessun dipendente trovato</p>
            </NeumorphicCard>
          )}
        </div>

        {/* Employee Detail Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
            <NeumorphicCard className="w-full lg:max-w-2xl max-h-[85vh] lg:max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
              <div className="flex items-start justify-between mb-4 lg:mb-6 sticky top-0 bg-gradient-to-br from-slate-50 to-slate-100 pb-4 -mt-4 pt-4 -mx-4 px-4 z-10">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1 truncate">{selectedEmployee.full_name}</h2>
                  <p className="text-sm text-slate-500 capitalize truncate">{selectedEmployee.position?.replace(/_/g, ' ')}</p>
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

              <div className="space-y-3 lg:space-y-4"> {/* Adjusted spacing */}
                <div className="neumorphic-flat p-3 lg:p-4 rounded-xl"> {/* Adjusted padding */}
                  <div className="flex items-center gap-2 lg:gap-3 mb-3"> {/* Adjusted gap */}
                    <ShoppingCart className="w-5 h-5 text-blue-600" /> {/* Changed icon color */}
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base">Ordini</h3> {/* Adjusted font size */}
                  </div>
                  {/* Updated to display only Wrong Orders from the new source */}
                  <div className="grid grid-cols-1 gap-3"> {/* Adjusted gap */}
                    <div>
                      <p className="text-xs text-slate-500">Ordini Sbagliati</p> {/* Adjusted font size */}
                      <p className="text-lg lg:text-xl font-bold text-slate-800"> {/* Adjusted font size */}
                        {selectedEmployee.wrongOrders} ({selectedEmployee.wrongOrderRate.toFixed(1)}%)
                      </p>
                    </div>
                    {/* Avg Processing Time and Avg Satisfaction are removed */}
                  </div>
                </div>

                <div className="neumorphic-flat p-3 lg:p-4 rounded-xl"> {/* Adjusted padding */}
                  <div className="flex items-center gap-2 lg:gap-3 mb-3"> {/* Adjusted gap */}
                    <Clock className="w-5 h-5 text-blue-600" /> {/* Changed icon color */}
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base">Presenza</h3> {/* Adjusted font size */}
                  </div>
                  <div className="grid grid-cols-2 gap-3"> {/* Adjusted gap */}
                    <div>
                      <p className="text-xs text-slate-500">Turni</p> {/* Adjusted font size */}
                      <p className="text-lg lg:text-xl font-bold text-slate-800">{selectedEmployee.totalShifts}</p> {/* Adjusted font size */}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Media Ritardo</p> {/* Adjusted font size */}
                      <p className="text-lg lg:text-xl font-bold text-slate-800"> {/* Adjusted font size */}
                        {selectedEmployee.avgLateMinutes.toFixed(1)}m
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">N° Ritardi</p> {/* Adjusted font size */}
                      <p className="text-lg lg:text-xl font-bold text-red-600"> {/* Adjusted font size */}
                        {selectedEmployee.numeroRitardi}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">% Ritardi</p> {/* Adjusted font size */}
                      <p className="text-lg lg:text-xl font-bold text-red-600"> {/* Adjusted font size */}
                        {selectedEmployee.percentualeRitardi.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* NEW: Ultimi Ordini Sbagliati */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-slate-800">
                        {expandedView === 'wrongOrders' ? 'Tutti gli Ordini Sbagliati' : 'Ultimi 3 Ordini Sbagliati'}
                      </h3>
                    </div>
                    {(() => {
                      const allWrongOrders = getAllWrongOrders(selectedEmployee.full_name);
                      return allWrongOrders.length > 3 && (
                        <button
                          onClick={() => setExpandedView(expandedView === 'wrongOrders' ? null : 'wrongOrders')}
                          className="neumorphic-flat px-3 py-1 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
                        >
                          {expandedView === 'wrongOrders' ? (
                            <>
                              <X className="w-4 h-4" />
                              Chiudi
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Vedi tutti ({allWrongOrders.length})
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                  {(() => {
                    const wrongOrdersList = expandedView === 'wrongOrders' 
                      ? getAllWrongOrders(selectedEmployee.full_name)
                      : getLatestWrongOrders(selectedEmployee.full_name);
                      
                    return wrongOrdersList.length > 0 ? (
                      <div className={`space-y-2 ${expandedView === 'wrongOrders' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
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
                              <div className="text-[0.65rem] text-gray-400 mt-1">
                                Match ID: {match.id} • {match.match_method === 'auto' ? 'Automatico' : 'Manuale'}
                              </div>
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

                {/* Ultimi Turni in Ritardo - IMPROVED DISPLAY */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-slate-800">
                        {expandedView === 'late' ? 'Tutti i Turni in Ritardo' : 'Ultimi 3 Turni in Ritardo'}
                      </h3>
                    </div>
                    {(() => {
                      const allLateShifts = getAllLateShifts(selectedEmployee.full_name);
                      return allLateShifts.length > 3 && (
                        <button
                          onClick={() => setExpandedView(expandedView === 'late' ? null : 'late')}
                          className="neumorphic-flat px-3 py-1 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
                        >
                          {expandedView === 'late' ? (
                            <>
                              <X className="w-4 h-4" />
                              Chiudi
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Vedi tutti ({allLateShifts.length})
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                  {(() => {
                    const lateShifts = expandedView === 'late' 
                      ? getAllLateShifts(selectedEmployee.full_name)
                      : getLatestLateShifts(selectedEmployee.full_name);
                      
                    return lateShifts.length > 0 ? (
                      <div className={`space-y-2 ${expandedView === 'late' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
                        {lateShifts.map((shift, index) => (
                          <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-800">
                                {safeFormatDateLocale(shift.shift_date)} - {shift.store_name || 'N/A'}
                              </span>
                              <span className="text-sm font-bold text-red-600">
                                +{shift.minuti_di_ritardo || 0} min
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <div>
                                <strong>Previsto:</strong> {safeFormatTime(shift.scheduled_start)}
                                {' → '}
                                <strong>Effettivo:</strong> {safeFormatTime(shift.actual_start)}
                              </div>
                              <div className="text-[0.65rem] text-gray-400">
                                ID: {shift.id} • Creato: {safeFormatDateTimeLocale(shift.created_date)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Nessun ritardo registrato 🎉
                      </p>
                    );
                  })()}
                </div>

                {/* Ultimi Turni con Timbratura Mancata */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <h3 className="font-bold text-slate-800">
                        {expandedView === 'missing' ? 'Tutti i Turni con Timbratura Mancata' : 'Ultimi 3 Turni con Timbratura Mancata'}
                      </h3>
                    </div>
                    {(() => {
                      const allMissingClockIns = getAllMissingClockIns(selectedEmployee.full_name);
                      return allMissingClockIns.length > 3 && (
                        <button
                          onClick={() => setExpandedView(expandedView === 'missing' ? null : 'missing')}
                          className="neumorphic-flat px-3 py-1 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
                        >
                          {expandedView === 'missing' ? (
                            <>
                              <X className="w-4 h-4" />
                              Chiudi
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Vedi tutti ({allMissingClockIns.length})
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                  {(() => {
                    const missingClockIns = expandedView === 'missing'
                      ? getAllMissingClockIns(selectedEmployee.full_name)
                      : getLatestMissingClockIns(selectedEmployee.full_name);
                      
                    return missingClockIns.length > 0 ? (
                      <div className={`space-y-2 ${expandedView === 'missing' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
                        {missingClockIns.map((shift, index) => (
                          <div key={`${shift.id}-${index}`} className="neumorphic-pressed p-3 rounded-lg border-2 border-orange-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-800">
                                {safeFormatDateLocale(shift.shift_date)} - {shift.store_name || 'N/A'}
                              </span>
                              <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                NON TIMBRATO
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <div>
                                <strong>Orario Previsto:</strong> {safeFormatTime(shift.scheduled_start)}
                                {' - '}
                                {safeFormatTime(shift.scheduled_end)}
                              </div>
                              {shift.shift_type && (
                                <div>
                                  <strong>Tipo Turno:</strong> {shift.shift_type}
                                </div>
                              )}
                              <div className="text-[0.65rem] text-gray-400">
                                ID: {shift.id} • Creato: {safeFormatDateTimeLocale(shift.created_date)}
                              </div>
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

                {/* Ultime Recensioni Google */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <h3 className="font-bold text-slate-800">
                        {expandedView === 'reviews' ? 'Tutte le Recensioni Google Maps' : 'Ultime 3 Recensioni Google Maps'}
                      </h3>
                    </div>
                    {(() => {
                      const allGoogleReviews = getAllGoogleReviews(selectedEmployee.full_name);
                      return allGoogleReviews.length > 3 && (
                        <button
                          onClick={() => setExpandedView(expandedView === 'reviews' ? null : 'reviews')}
                          className="neumorphic-flat px-3 py-1 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
                        >
                          {expandedView === 'reviews' ? (
                            <>
                              <X className="w-4 h-4" />
                              Chiudi
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Vedi tutti ({allGoogleReviews.length})
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                  {(() => {
                    const googleReviews = expandedView === 'reviews'
                      ? getAllGoogleReviews(selectedEmployee.full_name)
                      : getLatestGoogleReviews(selectedEmployee.full_name);
                      
                    return googleReviews.length > 0 ? (
                      <div className={`space-y-2 ${expandedView === 'reviews' ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
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
                    <Star className="w-5 h-5 text-[#8b7355]" />
                    <h3 className="font-bold text-slate-800">Customer Feedback</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Mentions</p>
                      <p className="text-xl font-bold text-slate-800">{selectedEmployee.mentions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Positive</p>
                      <p className="text-xl font-bold text-green-600">{selectedEmployee.positiveMentions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Negative</p>
                      <p className="text-xl font-bold text-red-600">{selectedEmployee.negativeMentions}</p>
                    </div>
                  </div>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
