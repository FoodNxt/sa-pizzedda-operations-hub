
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  Clock,
  ShoppingCart,
  Star,
  ChevronDown,
  ChevronUp,
  Calendar,
  Eye,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isWithinInterval } from 'date-fns';

export default function Employees() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [sortBy, setSortBy] = useState('performance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedView, setExpandedView] = useState(null); // 'late', 'missing', 'reviews', null

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

  // Helper function to deduplicate shifts
  const deduplicateShifts = (shiftsArray) => {
    const uniqueShiftsMap = new Map();

    shiftsArray.forEach(shift => {
      // Normalize date to YYYY-MM-DD format for comparison
      const normalizedDate = shift.shift_date ? new Date(shift.shift_date).toISOString().split('T')[0] : 'no-date';

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

        const reviewDate = parseISO(review.review_date);
        const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
        const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

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
      // Orders metrics
      const employeeOrders = orders.filter(o => o.employee_id === employee.id);
      const wrongOrders = employeeOrders.filter(o => o.is_wrong_order).length;
      const wrongOrderRate = employeeOrders.length > 0
        ? (wrongOrders / employeeOrders.length) * 100
        : 0;
      const avgProcessingTime = employeeOrders.length > 0
        ? employeeOrders.reduce((sum, o) => sum + (o.processing_time_minutes || 0), 0) / employeeOrders.length
        : 0;
      const avgSatisfaction = employeeOrders.filter(o => o.customer_satisfaction).length > 0
        ? employeeOrders.reduce((sum, o) => sum + (o.customer_satisfaction || 0), 0) /
          employeeOrders.filter(o => o.customer_satisfaction).length
        : 0;

      // Shift metrics (filtered by date)
      let employeeShifts = shifts.filter(s => {
        if (s.employee_name !== employee.full_name) return false;

        // Date filter
        if (startDate || endDate) {
          if (!s.shift_date) return false;
          const shiftDate = parseISO(s.shift_date);
          const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
          const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

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
      performanceScore += (avgSatisfaction - 3) * 5; // Bonus/penalty based on satisfaction
      performanceScore = Math.max(0, Math.min(100, performanceScore));

      // Performance level
      const performanceLevel = performanceScore >= 80 ? 'excellent' :
                              performanceScore >= 60 ? 'good' :
                              performanceScore >= 40 ? 'needs_improvement' :
                              'poor';

      return {
        ...employee,
        wrongOrders,
        wrongOrderRate,
        avgProcessingTime,
        avgSatisfaction,
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
        totalOrders: employeeOrders.length,
        totalShifts: employeeShifts.length,
        avgGoogleRating,
        googleReviewCount: googleReviews.length
      };
    });
  }, [employees, orders, shifts, reviews, startDate, endDate]);

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
          valueA = a.wrongOrderRate;
          valueB = b.wrongOrderRate;
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
        // The 'satisfaction' sort option is removed as the column is no longer displayed.
        // case 'satisfaction':
        //   valueA = a.avgSatisfaction;
        //   valueB = b.avgSatisfaction;
        //   break;
        default:
          valueA = a.performanceScore;
          valueB = b.performanceScore;
      }
      return sortOrder === 'desc' ? valueB - valueA : valueA - b.performanceScore;
    });

    return filtered;
  }, [employeeMetrics, selectedStore, selectedPosition, sortBy, sortOrder]);

  const getPerformanceColor = (level) => {
    switch (level) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs_improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-[#6b6b6b]';
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
          const shiftDate = parseISO(s.shift_date);
          const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
          const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

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
      .sort((a, b) => new Date(b.shift_date) - new Date(a.shift_date));

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
          const shiftDate = parseISO(s.shift_date);
          const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
          const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

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
      .sort((a, b) => new Date(b.shift_date) - new Date(a.shift_date));

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
          const reviewDate = parseISO(r.review_date);
          const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
          const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

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
      .sort((a, b) => new Date(b.review_date) - new Date(a.review_date));
  };

  // Get latest 3 Google reviews for selected employee
  const getLatestGoogleReviews = (employeeName) => {
    return getAllGoogleReviews(employeeName).slice(0, 3);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Employee Performance</h1>
        <p className="text-[#9b9b9b]">Monitor and rank employees based on multiple metrics</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">All Stores</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">All Positions</option>
            <option value="manager">Manager</option>
            <option value="chef">Chef</option>
            <option value="server">Server</option>
            <option value="delivery">Delivery</option>
            <option value="cashier">Cashier</option>
            <option value="kitchen_staff">Kitchen Staff</option>
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#9b9b9b]" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none text-sm"
            placeholder="Start date"
          />
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#9b9b9b]" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none text-sm"
            placeholder="End date"
          />
        </NeumorphicCard>

        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#9b9b9b] hover:text-[#6b6b6b]"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{filteredEmployees.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Total Employees</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Award className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            {filteredEmployees.filter(e => e.performanceLevel === 'excellent').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Top Performers</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">
            {filteredEmployees.filter(e => e.performanceLevel === 'good').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Good Performance</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">
            {filteredEmployees.filter(e => e.performanceLevel === 'poor' || e.performanceLevel === 'needs_improvement').length}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Needs Attention</p>
        </NeumorphicCard>
      </div>

      {/* Employee Rankings Table */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Employee Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#c1c1c1]">
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Rank</th>
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Employee</th>
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Position</th>
                <th
                  className="text-center p-3 text-[#9b9b9b] font-medium cursor-pointer hover:text-[#6b6b6b]"
                  onClick={() => toggleSort('performance')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Performance
                    {sortBy === 'performance' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-center p-3 text-[#9b9b9b] font-medium cursor-pointer hover:text-[#6b6b6b]"
                  onClick={() => toggleSort('googleRating')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Google Rating
                    {sortBy === 'googleRating' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-center p-3 text-[#9b9b9b] font-medium cursor-pointer hover:text-[#6b6b6b]"
                  onClick={() => toggleSort('wrongOrders')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Wrong Orders
                    {sortBy === 'wrongOrders' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-center p-3 text-[#9b9b9b] font-medium cursor-pointer hover:text-[#6b6b6b]"
                  onClick={() => toggleSort('lateness')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Avg Lateness
                    {sortBy === 'lateness' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-center p-3 text-[#9b9b9b] font-medium cursor-pointer hover:text-[#6b6b6b]"
                  onClick={() => toggleSort('numeroRitardi')}
                >
                  <div className="flex items-center justify-center gap-1">
                    N° Ritardi
                    {sortBy === 'numeroRitardi' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-center p-3 text-[#9b9b9b] font-medium cursor-pointer hover:text-[#6b6b6b]"
                  onClick={() => toggleSort('percentualeRitardi')}
                >
                  <div className="flex items-center justify-center gap-1">
                    % Ritardi
                    {sortBy === 'percentualeRitardi' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-center p-3 text-[#9b9b9b] font-medium cursor-pointer hover:text-[#6b6b6b]"
                  onClick={() => toggleSort('numeroTimbratureMancate')}
                >
                  <div className="flex items-center justify-center gap-1">
                    N° Timbrature Mancate
                    {sortBy === 'numeroTimbratureMancate' && (
                      sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="text-center p-3 text-[#9b9b9b] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee, index) => (
                  <tr
                    key={employee.id}
                    className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors cursor-pointer"
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <td className="p-3">
                      <div className="neumorphic-flat w-8 h-8 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-[#6b6b6b]">{index + 1}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full neumorphic-flat flex items-center justify-center">
                          <span className="text-sm font-bold text-[#8b7355]">
                            {employee.full_name?.charAt(0) || 'E'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#6b6b6b]">{employee.full_name}</p>
                          <p className="text-sm text-[#9b9b9b]">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-[#6b6b6b] capitalize">
                      {employee.position?.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-2xl font-bold ${getPerformanceColor(employee.performanceLevel)}`}>
                          {employee.performanceScore}
                        </span>
                        <span className={`text-xs ${getPerformanceColor(employee.performanceLevel)}`}>
                          {getPerformanceLabel(employee.performanceLevel)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {employee.googleReviewCount > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className={`text-lg font-bold ${
                              employee.avgGoogleRating >= 4.5 ? 'text-green-600' :
                              employee.avgGoogleRating >= 4.0 ? 'text-blue-600' :
                              employee.avgGoogleRating >= 3.5 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {employee.avgGoogleRating.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-xs text-[#9b9b9b]">
                            {employee.googleReviewCount} reviews
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#9b9b9b]">N/A</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-bold ${
                          employee.wrongOrderRate > 10 ? 'text-red-600' :
                          employee.wrongOrderRate > 5 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {employee.wrongOrders}
                        </span>
                        <span className="text-xs text-[#9b9b9b]">
                          {employee.wrongOrderRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-bold ${
                          employee.avgLateMinutes > 10 ? 'text-red-600' :
                          employee.avgLateMinutes > 5 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {employee.avgLateMinutes.toFixed(1)}
                        </span>
                        <span className="text-xs text-[#9b9b9b]">minutes</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-lg font-bold ${
                          employee.numeroRitardi > 10 ? 'text-red-600' :
                          employee.numeroRitardi > 5 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {employee.numeroRitardi}
                        </span>
                        <span className="text-xs text-[#9b9b9b]">
                          su {employee.totalShifts} turni
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-lg font-bold ${
                          employee.percentualeRitardi > 20 ? 'text-red-600' :
                          employee.percentualeRitardi > 10 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {employee.percentualeRitardi.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-lg font-bold ${
                          employee.numeroTimbratureMancate > 5 ? 'text-red-600' :
                          employee.numeroTimbratureMancate > 2 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {employee.numeroTimbratureMancate}
                        </span>
                        <span className="text-xs text-[#9b9b9b]">
                          su {employee.totalShifts} turni
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(employee);
                        }}
                        className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-[#9b9b9b]">
                    No employees found matching the filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </NeumorphicCard>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#6b6b6b] mb-1">{selectedEmployee.full_name}</h2>
                <p className="text-[#9b9b9b] capitalize">{selectedEmployee.position?.replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  setExpandedView(null); // Reset expanded view when closing modal
                }}
                className="neumorphic-flat px-4 py-2 rounded-lg text-[#6b6b6b]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-2">Performance Score</p>
                <p className={`text-4xl font-bold ${getPerformanceColor(selectedEmployee.performanceLevel)}`}>
                  {selectedEmployee.performanceScore}
                </p>
                <p className={`text-sm mt-1 ${getPerformanceColor(selectedEmployee.performanceLevel)}`}>
                  {getPerformanceLabel(selectedEmployee.performanceLevel)}
                </p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-2">Google Rating</p>
                {selectedEmployee.googleReviewCount > 0 ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                      <p className={`text-4xl font-bold ${
                        selectedEmployee.avgGoogleRating >= 4.5 ? 'text-green-600' :
                        selectedEmployee.avgGoogleRating >= 4.0 ? 'text-blue-600' :
                        'text-yellow-600'
                      }`}>
                        {selectedEmployee.avgGoogleRating.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-sm mt-1 text-[#9b9b9b]">{selectedEmployee.googleReviewCount} reviews</p>
                  </>
                ) : (
                  <p className="text-2xl text-[#9b9b9b]">N/A</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <ShoppingCart className="w-5 h-5 text-[#8b7355]" />
                  <h3 className="font-bold text-[#6b6b6b]">Order Performance</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Wrong Orders</p>
                    <p className="text-xl font-bold text-[#6b6b6b]">
                      {selectedEmployee.wrongOrders} ({selectedEmployee.wrongOrderRate.toFixed(1)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Avg Processing Time</p>
                    <p className="text-xl font-bold text-[#6b6b6b]">
                      {selectedEmployee.avgProcessingTime.toFixed(1)} min
                    </p>
                  </div>
                </div>
              </div>

              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 text-[#8b7355]" />
                  <h3 className="font-bold text-[#6b6b6b]">Attendance & Ritardi</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Total Shifts</p>
                    <p className="text-xl font-bold text-[#6b6b6b]">{selectedEmployee.totalShifts}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Avg Lateness</p>
                    <p className="text-xl font-bold text-[#6b6b6b]">
                      {selectedEmployee.avgLateMinutes.toFixed(1)} min
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Numero Ritardi</p>
                    <p className="text-xl font-bold text-red-600">
                      {selectedEmployee.numeroRitardi}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">% Ritardi</p>
                    <p className="text-xl font-bold text-red-600">
                      {selectedEmployee.percentualeRitardi.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Ultimi Turni in Ritardo - IMPROVED DISPLAY */}
              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-[#6b6b6b]">
                      {expandedView === 'late' ? 'Tutti i Turni in Ritardo' : 'Ultimi 3 Turni in Ritardo'}
                    </h3>
                  </div>
                  {(() => {
                    const allLateShifts = getAllLateShifts(selectedEmployee.full_name);
                    return allLateShifts.length > 3 && (
                      <button
                        onClick={() => setExpandedView(expandedView === 'late' ? null : 'late')}
                        className="neumorphic-flat px-3 py-1 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-1"
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
                            <span className="text-sm font-medium text-[#6b6b6b]">
                              {new Date(shift.shift_date).toLocaleDateString('it-IT')} - {shift.store_name}
                            </span>
                            <span className="text-sm font-bold text-red-600">
                              +{shift.minuti_di_ritardo} min
                            </span>
                          </div>
                          <div className="text-xs text-[#9b9b9b] space-y-1">
                            <div>
                              <strong>Previsto:</strong> {shift.scheduled_start ? new Date(shift.scheduled_start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              {' → '}
                              <strong>Effettivo:</strong> {shift.actual_start ? new Date(shift.actual_start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </div>
                            <div className="text-[0.65rem] text-gray-400">
                              ID: {shift.id} • Creato: {shift.created_date ? new Date(shift.created_date).toLocaleString('it-IT') : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9b9b9b] text-center py-2">
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
                    <h3 className="font-bold text-[#6b6b6b]">
                      {expandedView === 'missing' ? 'Tutti i Turni con Timbratura Mancata' : 'Ultimi 3 Turni con Timbratura Mancata'}
                    </h3>
                  </div>
                  {(() => {
                    const allMissingClockIns = getAllMissingClockIns(selectedEmployee.full_name);
                    return allMissingClockIns.length > 3 && (
                      <button
                        onClick={() => setExpandedView(expandedView === 'missing' ? null : 'missing')}
                        className="neumorphic-flat px-3 py-1 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-1"
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
                            <span className="text-sm font-medium text-[#6b6b6b]">
                              {new Date(shift.shift_date).toLocaleDateString('it-IT')} - {shift.store_name}
                            </span>
                            <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                              NON TIMBRATO
                            </span>
                          </div>
                          <div className="text-xs text-[#9b9b9b] space-y-1">
                            <div>
                              <strong>Orario Previsto:</strong> {shift.scheduled_start ? new Date(shift.scheduled_start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              {' - '}
                              {shift.scheduled_end ? new Date(shift.scheduled_end).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </div>
                            {shift.shift_type && (
                              <div>
                                <strong>Tipo Turno:</strong> {shift.shift_type}
                              </div>
                            )}
                            <div className="text-[0.65rem] text-gray-400">
                              ID: {shift.id} • Creato: {shift.created_date ? new Date(shift.created_date).toLocaleString('it-IT') : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9b9b9b] text-center py-2">
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
                    <h3 className="font-bold text-[#6b6b6b]">
                      {expandedView === 'reviews' ? 'Tutte le Recensioni Google Maps' : 'Ultime 3 Recensioni Google Maps'}
                    </h3>
                  </div>
                  {(() => {
                    const allGoogleReviews = getAllGoogleReviews(selectedEmployee.full_name);
                    return allGoogleReviews.length > 3 && (
                      <button
                        onClick={() => setExpandedView(expandedView === 'reviews' ? null : 'reviews')}
                        className="neumorphic-flat px-3 py-1 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-1"
                      >
                        {expandedView === 'reviews' ? (
                          <>
                            <X className="w-4 h-4" />
                            Chiudi
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            Vedi tutte ({allGoogleReviews.length})
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
                            <span className="text-sm font-medium text-[#6b6b6b]">
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
                            <p className="text-xs text-[#6b6b6b] mb-1">{review.comment}</p>
                          )}
                          <p className="text-xs text-[#9b9b9b]">
                            {new Date(review.review_date).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9b9b9b] text-center py-2">
                      Nessuna recensione Google Maps ricevuta
                    </p>
                  );
                })()}
              </div>

              <div className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Star className="w-5 h-5 text-[#8b7355]" />
                  <h3 className="font-bold text-[#6b6b6b]">Customer Feedback</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Mentions</p>
                    <p className="text-xl font-bold text-[#6b6b6b]">{selectedEmployee.mentions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Positive</p>
                    <p className="text-xl font-bold text-green-600">{selectedEmployee.positiveMentions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Negative</p>
                    <p className="text-xl font-bold text-red-600">{selectedEmployee.negativeMentions}</p>
                  </div>
                </div>
              </div>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}
