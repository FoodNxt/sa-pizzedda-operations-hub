
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clock, Calendar, Users, Filter, Download, DollarSign, X, ChevronRight, FileText, CalendarRange } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isWithinInterval, format, startOfWeek, endOfWeek, addDays, eachWeekOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Payroll() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState('daily');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: rawShifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date', 10000),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // ✅ NORMALIZE SHIFT TYPE - Aggregate similar types
  const normalizeShiftType = (shiftType) => {
    if (!shiftType) return 'Turno normale';
    
    const type = shiftType.trim();
    
    if (type === 'Affiancamento') return 'Turno normale';
    if (type === 'Malattia (No Certificato)') return 'Assenza non retribuita';
    if (type === 'Ritardo') return 'Assenza non retribuita';
    
    return type;
  };

  // ✅ ULTRA MEGA AGGRESSIVE DEDUPLICATION
  const deduplicateShifts = (shiftsArray) => {
    const uniqueShiftsMap = new Map();
    const duplicatesDetailed = [];
    let duplicatesFound = 0;

    shiftsArray.forEach(shift => {
      // Helper to normalize and extract date/time components
      const normalizeEmployeeName = (name) => {
        if (!name) return 'unknown';
        return name.toLowerCase().replace(/\s+/g, '').trim();
      };

      const extractDate = (dateStr) => {
        if (!dateStr) return 'no-date';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return 'no-date';
          // Return only YYYY-MM-DD
          return date.toISOString().split('T')[0];
        } catch {
          return 'no-date';
        }
      };

      const extractTime = (dateTimeStr) => {
        if (!dateTimeStr) return 'no-time';
        try {
          const date = new Date(dateTimeStr);
          if (isNaN(date.getTime())) return 'no-time';
          // Return only HH:MM
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        } catch {
          return 'no-time';
        }
      };

      // Create normalized values
      const normalizedEmployee = normalizeEmployeeName(shift.employee_name);
      const normalizedDate = extractDate(shift.shift_date);
      const normalizedStart = extractTime(shift.scheduled_start);
      const normalizedEnd = extractTime(shift.scheduled_end);
      const normalizedStore = (shift.store_id || shift.store_name || 'no-store').toString().toLowerCase().replace(/\s+/g, '');

      // Create comprehensive unique key
      const key = `${normalizedEmployee}|${normalizedStore}|${normalizedDate}|${normalizedStart}|${normalizedEnd}`;

      if (!uniqueShiftsMap.has(key)) {
        uniqueShiftsMap.set(key, shift);
      } else {
        duplicatesFound++;
        const existing = uniqueShiftsMap.get(key);
        
        // Log duplicates for debugging
        duplicatesDetailed.push({
          key,
          employee_name: shift.employee_name,
          shift_date: shift.shift_date,
          existing_id: existing.id,
          duplicate_id: shift.id,
          existing_created: existing.created_date,
          duplicate_created: shift.created_date
        });

        // Keep the one with the LOWEST ID (assuming lower ID = older/original)
        if (shift.id < existing.id) {
          uniqueShiftsMap.set(key, shift);
        } else if (shift.id === existing.id) {
          // Same ID?! Check created_date
          if (shift.created_date && existing.created_date) {
            const shiftDate = new Date(shift.created_date);
            const existingDate = new Date(existing.created_date);
            if (shiftDate < existingDate) {
              uniqueShiftsMap.set(key, shift);
            }
          }
        }
      }
    });

    if (duplicatesFound > 0) {
      console.group('🔍 DEDUPLICA PAYROLL - DETTAGLI');
      console.log(`📊 Totale duplicati rimossi: ${duplicatesFound}`);
      console.log(`📋 Turni originali: ${shiftsArray.length}`);
      console.log(`✅ Turni unici: ${uniqueShiftsMap.size}`);
      
      // Group duplicates by employee
      const duplicatesByEmployee = {};
      duplicatesDetailed.forEach(dup => {
        if (!duplicatesByEmployee[dup.employee_name]) {
          duplicatesByEmployee[dup.employee_name] = [];
        }
        duplicatesByEmployee[dup.employee_name].push(dup);
      });
      
      console.log('👥 Duplicati per dipendente:');
      Object.entries(duplicatesByEmployee).forEach(([name, dups]) => {
        console.log(`  ${name}: ${dups.length} duplicati`);
        dups.slice(0, 3).forEach(dup => {
          console.log(`    → ${dup.shift_date} | IDs: ${dup.existing_id} vs ${dup.duplicate_id}`);
        });
      });
      
      console.groupEnd();
    } else {
      console.log('✅ Payroll: Nessun duplicato trovato');
    }

    return Array.from(uniqueShiftsMap.values());
  };

  // ✅ MEMO: Deduplicate shifts once
  const shifts = useMemo(() => {
    console.log('🔄 Inizio deduplica turni per Payroll...');
    const deduplicated = deduplicateShifts(rawShifts);
    console.log(`✅ Deduplica completata: ${rawShifts.length} → ${deduplicated.length} turni`);
    return deduplicated;
  }, [rawShifts]);

  // Process payroll data
  const payrollData = useMemo(() => {
    let filteredShifts = shifts;
    
    if (selectedStore !== 'all') {
      filteredShifts = filteredShifts.filter(s => s.store_id === selectedStore);
    }

    if (startDate || endDate) {
      filteredShifts = filteredShifts.filter(shift => {
        if (!shift.shift_date) return false;
        const shiftDate = parseISO(shift.shift_date);
        const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
        const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

        if (start && end) {
          return isWithinInterval(shiftDate, { start, end });
        } else if (start) {
          return shiftDate >= start;
        } else if (end) {
          return shiftDate <= end;
        }
        return true;
      });
    }

    const employeeData = {};

    filteredShifts.forEach(shift => {
      const empName = shift.employee_name || 'Unknown';
      
      if (!employeeData[empName]) {
        employeeData[empName] = {
          employee_name: empName,
          store_names: new Set(),
          shift_types: {},
          total_minutes: 0,
          total_ritardo_minutes: 0
        };
      }

      if (shift.store_name) {
        employeeData[empName].store_names.add(shift.store_name);
      }

      let workedMinutes = shift.scheduled_minutes || 0;

      // ✅ USE NORMALIZED SHIFT TYPE
      let shiftType = normalizeShiftType(shift.shift_type);
      
      if (!employeeData[empName].shift_types[shiftType]) {
        employeeData[empName].shift_types[shiftType] = 0;
      }

      employeeData[empName].shift_types[shiftType] += workedMinutes;
      employeeData[empName].total_minutes += workedMinutes;

      if (shift.minuti_di_ritardo && shift.minuti_di_ritardo > 0) {
        employeeData[empName].total_ritardo_minutes += shift.minuti_di_ritardo;
      }
    });

    Object.keys(employeeData).forEach(empName => {
      const emp = employeeData[empName];
      emp.store_names_display = Array.from(emp.store_names).sort().join(', ');
      
      if (emp.total_ritardo_minutes > 0) {
        if (emp.shift_types['Turno normale']) {
          emp.shift_types['Turno normale'] -= emp.total_ritardo_minutes;
          if (emp.shift_types['Turno normale'] < 0) {
            emp.shift_types['Turno normale'] = 0;
          }
        }
        
        if (!emp.shift_types['Assenza non retribuita']) {
          emp.shift_types['Assenza non retribuita'] = 0;
        }
        emp.shift_types['Assenza non retribuita'] += emp.total_ritardo_minutes;
      }
    });

    const employeeArray = Object.values(employeeData).sort((a, b) => 
      a.employee_name.localeCompare(b.employee_name)
    );

    const allShiftTypes = new Set();
    employeeArray.forEach(emp => {
      Object.keys(emp.shift_types).forEach(type => allShiftTypes.add(type));
    });

    return {
      employees: employeeArray,
      shiftTypes: Array.from(allShiftTypes).sort(),
      totalEmployees: employeeArray.length,
      totalMinutes: employeeArray.reduce((sum, emp) => sum + emp.total_minutes, 0),
      totalRitardoMinutes: employeeArray.reduce((sum, emp) => sum + emp.total_ritardo_minutes, 0)
    };
  }, [shifts, selectedStore, startDate, endDate]);

  // Calculate daily/weekly breakdown for selected employee
  const employeeDailyBreakdown = useMemo(() => {
    if (!selectedEmployee) return { days: [], shiftTypes: [], weeks: [] };

    let employeeShifts = shifts.filter(s => s.employee_name === selectedEmployee.employee_name);

    if (selectedStore !== 'all') {
      employeeShifts = employeeShifts.filter(s => s.store_id === selectedStore);
    }

    if (startDate || endDate) {
      employeeShifts = employeeShifts.filter(shift => {
        if (!shift.shift_date) return false;
        const shiftDate = parseISO(shift.shift_date);
        const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
        const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

        if (start && end) {
          return isWithinInterval(shiftDate, { start, end });
        } else if (start) {
          return shiftDate >= start;
        } else if (end) {
          return shiftDate <= end;
        }
        return true;
      });
    }

    const dailyData = {};
    const allShiftTypes = new Set();

    employeeShifts.forEach(shift => {
      const date = shift.shift_date;
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          shift_types: {},
          ritardo_minutes: 0
        };
      }

      let workedMinutes = shift.scheduled_minutes || 0;
      
      // ✅ USE NORMALIZED SHIFT TYPE
      let shiftType = normalizeShiftType(shift.shift_type);
      
      allShiftTypes.add(shiftType);

      if (!dailyData[date].shift_types[shiftType]) {
        dailyData[date].shift_types[shiftType] = 0;
      }

      dailyData[date].shift_types[shiftType] += workedMinutes;

      if (shift.minuti_di_ritardo && shift.minuti_di_ritardo > 0) {
        dailyData[date].ritardo_minutes += shift.minuti_di_ritardo;
      }
    });

    Object.keys(dailyData).forEach(date => {
      const day = dailyData[date];
      if (day.ritardo_minutes > 0) {
        if (day.shift_types['Turno normale']) {
          day.shift_types['Turno normale'] -= day.ritardo_minutes;
          if (day.shift_types['Turno normale'] < 0) {
            day.shift_types['Turno normale'] = 0;
          }
        }
        if (!day.shift_types['Assenza non retribuita']) {
          day.shift_types['Assenza non retribuita'] = 0;
        }
        day.shift_types['Assenza non retribuita'] += day.ritardo_minutes;
        allShiftTypes.add('Assenza non retribuita');
      }
    });

    const dailyArray = Object.values(dailyData).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    dailyArray.forEach(day => {
      day.total_minutes = Object.values(day.shift_types).reduce((sum, mins) => sum + mins, 0);
    });

    // Weekly data
    const weeklyData = {};
    
    employeeShifts.forEach(shift => {
      const date = parseISO(shift.shift_date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekStart,
          weekEnd,
          weekKey,
          shift_types: {},
          ritardo_minutes: 0
        };
      }

      let workedMinutes = shift.scheduled_minutes || 0;
      
      // ✅ USE NORMALIZED SHIFT TYPE
      let shiftType = normalizeShiftType(shift.shift_type);
      
      if (!weeklyData[weekKey].shift_types[shiftType]) {
        weeklyData[weekKey].shift_types[shiftType] = 0;
      }

      weeklyData[weekKey].shift_types[shiftType] += workedMinutes;

      if (shift.minuti_di_ritardo && shift.minuti_di_ritardo > 0) {
        weeklyData[weekKey].ritardo_minutes += shift.minuti_di_ritardo;
      }
    });

    Object.keys(weeklyData).forEach(weekKey => {
      const week = weeklyData[weekKey];
      if (week.ritardo_minutes > 0) {
        if (week.shift_types['Turno normale']) {
          week.shift_types['Turno normale'] -= week.ritardo_minutes;
          if (week.shift_types['Turno normale'] < 0) {
            week.shift_types['Turno normale'] = 0;
          }
        }
        if (!week.shift_types['Assenza non retribuita']) {
          week.shift_types['Assenza non retribuita'] = 0;
        }
        week.shift_types['Assenza non retribuita'] += week.ritardo_minutes;
      }
    });

    const weeklyArray = Object.values(weeklyData).sort((a, b) => 
      b.weekStart - a.weekStart
    );

    weeklyArray.forEach(week => {
      week.total_minutes = Object.values(week.shift_types).reduce((sum, mins) => sum + mins, 0);
    });

    return {
      days: dailyArray,
      weeks: weeklyArray,
      shiftTypes: Array.from(allShiftTypes).sort()
    };
  }, [selectedEmployee, shifts, selectedStore, startDate, endDate]);

  const minutesToHours = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const minutesToDecimal = (minutes) => {
    return (minutes / 60).toFixed(2);
  };

  // Export to CSV function
  const exportToCSV = () => {
    // Prepare CSV content
    let csv = 'Dipendente,Locale,';
    
    // Add shift type columns
    payrollData.shiftTypes.forEach(type => {
      csv += `"${type}",`;
    });
    csv += 'Totale Ore,Ore Nette\n';

    // Add data rows
    payrollData.employees.forEach(employee => {
      csv += `"${employee.employee_name}","${employee.store_names_display}",`;
      
      payrollData.shiftTypes.forEach(type => {
        const minutes = employee.shift_types[type] || 0;
        csv += `"${minutesToHours(minutes)}",`;
      });
      
      const netMinutes = employee.total_minutes - employee.total_ritardo_minutes;
      csv += `"${minutesToHours(employee.total_minutes)}","${minutesToHours(netMinutes)}"\n`;
    });

    // Add total row
    csv += 'TOTALE,,';
    payrollData.shiftTypes.forEach(type => {
      const total = payrollData.employees.reduce((sum, emp) => sum + (emp.shift_types[type] || 0), 0);
      csv += `"${minutesToHours(total)}",`;
    });
    csv += `"${minutesToHours(payrollData.totalMinutes)}","${minutesToHours(payrollData.totalMinutes - payrollData.totalRitardoMinutes)}"\n`;

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = `payroll_sintesi_${startDate || 'all'}_${endDate || 'all'}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export employee daily breakdown to CSV
  const exportEmployeeDailyCSV = () => {
    if (!selectedEmployee) return;

    let csv = `Dipendente: ${selectedEmployee.employee_name}\n`;
    csv += `Periodo: ${startDate || 'Tutti i turni'} - ${endDate || 'Tutti i turni'}\n`;
    csv += `Visualizzazione: ${viewMode === 'daily' ? 'Giornaliera' : 'Settimanale'}\n\n`;
    
    if (viewMode === 'daily') {
      csv += 'Data,';
      employeeDailyBreakdown.shiftTypes.forEach(type => {
        csv += `"${type}",`;
      });
      csv += 'Totale Ore\n';

      employeeDailyBreakdown.days.forEach(day => {
        csv += `${format(parseISO(day.date), 'dd/MM/yyyy')},`;
        
        employeeDailyBreakdown.shiftTypes.forEach(type => {
          const minutes = day.shift_types[type] || 0;
          csv += `"${minutesToHours(minutes)}",`;
        });
        
        csv += `"${minutesToHours(day.total_minutes)}"\n`;
      });
    } else {
      // Weekly view
      csv += 'Settimana,';
      employeeDailyBreakdown.shiftTypes.forEach(type => {
        csv += `"${type}",`;
      });
      csv += 'Totale Ore\n';

      employeeDailyBreakdown.weeks.forEach(week => {
        const weekLabel = `Settimana ${format(week.weekStart, 'dd/MM', { locale: it })} - ${format(week.weekEnd, 'dd/MM/yyyy', { locale: it })}`;
        csv += `"${weekLabel}",`;
        
        employeeDailyBreakdown.shiftTypes.forEach(type => {
          const minutes = week.shift_types[type] || 0;
          csv += `"${minutesToHours(minutes)}",`;
        });
        
        csv += `"${minutesToHours(week.total_minutes)}"\n`;
      });
    }

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = `payroll_${selectedEmployee.employee_name.replace(/\s+/g, '_')}_${viewMode}_${startDate || 'all'}_${endDate || 'all'}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // NEW: Export daily breakdown for ALL employees
  const exportAllEmployeesDailyCSV = () => {
    let csv = 'Report Giornaliero - Tutti i Dipendenti\n';
    csv += `Periodo: ${startDate || 'Tutti i turni'} - ${endDate || 'Tutti i turni'}\n`;
    csv += `Locale: ${selectedStore === 'all' ? 'Tutti i Locali' : stores.find(s => s.id === selectedStore)?.name || selectedStore}\n\n`;
    
    // Header
    csv += 'Data,Dipendente,Locale,';
    
    // Get all unique shift types across all employees
    const allShiftTypes = new Set();
    payrollData.employees.forEach(employee => { // Use payrollData's shiftTypes for consistency
      Object.keys(employee.shift_types).forEach(type => allShiftTypes.add(type));
    });
    const shiftTypesArray = Array.from(allShiftTypes).sort();
    
    shiftTypesArray.forEach(type => {
      csv += `"${type}",`;
    });
    csv += 'Totale Ore\n';

    // Collect all daily data for all employees
    const allDailyData = [];

    payrollData.employees.forEach(employee => {
      // Filter shifts for this employee
      let employeeShifts = shifts.filter(s => { // Using the already deduplicated 'shifts'
        if (s.employee_name !== employee.employee_name) return false;

        // Apply store filter
        if (selectedStore !== 'all' && s.store_id !== selectedStore) return false;

        // Apply date filter
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

      // Group by date
      const dailyData = {};
      employeeShifts.forEach(shift => {
        const date = shift.shift_date;
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            employee_name: employee.employee_name,
            store_names: new Set(),
            shift_types: {},
            ritardo_minutes: 0
          };
        }

        // Add store name
        if (shift.store_name) {
          dailyData[date].store_names.add(shift.store_name);
        }

        let workedMinutes = shift.scheduled_minutes || 0;
        
        // ✅ USE NORMALIZED SHIFT TYPE
        let shiftType = normalizeShiftType(shift.shift_type);
        
        if (!dailyData[date].shift_types[shiftType]) {
          dailyData[date].shift_types[shiftType] = 0;
        }

        dailyData[date].shift_types[shiftType] += workedMinutes;

        if (shift.minuti_di_ritardo && shift.minuti_di_ritardo > 0) {
          dailyData[date].ritardo_minutes += shift.minuti_di_ritardo;
        }
      });

      // Process ritardi for each day
      Object.keys(dailyData).forEach(date => {
        const day = dailyData[date];
        if (day.ritardo_minutes > 0) {
          if (day.shift_types['Turno normale']) {
            day.shift_types['Turno normale'] -= day.ritardo_minutes;
            if (day.shift_types['Turno normale'] < 0) {
              day.shift_types['Turno normale'] = 0;
            }
          }
          if (!day.shift_types['Assenza non retribuita']) {
            day.shift_types['Assenza non retribuita'] = 0;
          }
          day.shift_types['Assenza non retribuita'] += day.ritardo_minutes;
        }
        
        // Calculate total minutes
        day.total_minutes = Object.values(day.shift_types).reduce((sum, mins) => sum + mins, 0);
        
        // Convert store names set to string
        day.store_names_display = Array.from(day.store_names).sort().join(', ');
      });

      // Add to all daily data
      Object.values(dailyData).forEach(day => {
        allDailyData.push(day);
      });
    });

    // Sort by date (most recent first), then by employee name
    allDailyData.sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      return a.employee_name.localeCompare(b.employee_name);
    });

    // Write data rows
    allDailyData.forEach(day => {
      csv += `${format(parseISO(day.date), 'dd/MM/yyyy')},"${day.employee_name}","${day.store_names_display}",`;
      
      shiftTypesArray.forEach(type => {
        const minutes = day.shift_types[type] || 0;
        csv += `"${minutesToHours(minutes)}",`;
      });
      
      csv += `"${minutesToHours(day.total_minutes)}"\n`;
    });

    // Summary row
    csv += '\nRIEPILOGO TOTALE,,';
    shiftTypesArray.forEach(type => {
      const totalMinutes = allDailyData.reduce((sum, day) => sum + (day.shift_types[type] || 0), 0);
      csv += `"${minutesToHours(totalMinutes)}",`;
    });
    const grandTotal = allDailyData.reduce((sum, day) => sum + day.total_minutes, 0);
    csv += `"${minutesToHours(grandTotal)}"\n`;

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = `payroll_daily_all_employees_${startDate || 'all'}_${endDate || 'all'}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // NEW: Export weekly breakdown for ALL employees
  const exportWeeklyReport = () => {
    let csv = 'Report Settimanale - Tutti i Dipendenti\n';
    csv += `Periodo: ${startDate || 'Tutti i turni'} - ${endDate || 'Tutti i turni'}\n`;
    csv += `Locale: ${selectedStore === 'all' ? 'Tutti i Locali' : stores.find(s => s.id === selectedStore)?.name || selectedStore}\n\n`;

    // Get all unique shift types
    const allShiftTypes = new Set();
    payrollData.employees.forEach(employee => {
      Object.keys(employee.shift_types).forEach(type => allShiftTypes.add(type));
    });
    const shiftTypesArray = Array.from(allShiftTypes).sort();

    // Determine date range for all relevant shifts
    let minDate = null;
    let maxDate = null;

    const relevantShifts = shifts.filter(s => { // Using the already deduplicated 'shifts'
      // Apply store filter
      if (selectedStore !== 'all' && s.store_id !== selectedStore) return false;
      // Only shifts with a date are relevant for range calculation
      return !!s.shift_date;
    });

    relevantShifts.forEach(shift => {
      const shiftDate = parseISO(shift.shift_date);
      if (!minDate || shiftDate < minDate) minDate = shiftDate;
      if (!maxDate || shiftDate > maxDate) maxDate = shiftDate;
    });

    // If specific startDate/endDate filters are applied, use them to refine minDate/maxDate
    if (startDate) {
      const filterStart = parseISO(startDate);
      if (!minDate || filterStart > minDate) minDate = filterStart;
    }
    if (endDate) {
      const filterEnd = parseISO(endDate);
      if (!maxDate || filterEnd < maxDate) maxDate = filterEnd;
    }
    
    if (!minDate || !maxDate) {
      alert('Nessun turno disponibile nel periodo selezionato per generare il report.');
      return;
    }

    // Get all weeks in the period (starting Monday)
    // Adjust maxDate to end of week if it's not already
    const adjustedMaxDate = endOfWeek(maxDate, { weekStartsOn: 1 });
    const weeks = eachWeekOfInterval(
      { start: startOfWeek(minDate, { weekStartsOn: 1 }), end: adjustedMaxDate },
      { weekStartsOn: 1 } // Monday
    );

    // Collect weekly data for all employees
    const employeeWeeklyData = {};

    payrollData.employees.forEach(employee => {
      let employeeShifts = shifts.filter(s => { // Using the already deduplicated 'shifts'
        if (s.employee_name !== employee.employee_name) return false;

        // Apply store filter
        if (selectedStore !== 'all' && s.store_id !== selectedStore) return false;

        // Apply date filter
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

      if (!employeeWeeklyData[employee.employee_name]) {
        employeeWeeklyData[employee.employee_name] = {};
      }

      // Group shifts by week
      employeeShifts.forEach(shift => {
        const shiftDate = parseISO(shift.shift_date);
        const weekStart = startOfWeek(shiftDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        if (!employeeWeeklyData[employee.employee_name][weekKey]) {
          employeeWeeklyData[employee.employee_name][weekKey] = {
            weekStart,
            weekEnd: endOfWeek(shiftDate, { weekStartsOn: 1 }),
            store_names: new Set(),
            shift_types: {},
            ritardo_minutes: 0
          };
        }

        const weekData = employeeWeeklyData[employee.employee_name][weekKey];

        // Add store name
        if (shift.store_name) {
          weekData.store_names.add(shift.store_name);
        }

        let workedMinutes = shift.scheduled_minutes || 0;
        
        // ✅ USE NORMALIZED SHIFT TYPE
        let shiftType = normalizeShiftType(shift.shift_type);
        
        if (!weekData.shift_types[shiftType]) {
          weekData.shift_types[shiftType] = 0;
        }

        weekData.shift_types[shiftType] += workedMinutes;

        if (shift.minuti_di_ritardo && shift.minuti_di_ritardo > 0) {
          weekData.ritardo_minutes += shift.minuti_di_ritardo;
        }
      });

      // Process ritardi for each week
      Object.keys(employeeWeeklyData[employee.employee_name]).forEach(weekKey => {
        const weekData = employeeWeeklyData[employee.employee_name][weekKey];
        
        if (weekData.ritardo_minutes > 0) {
          if (weekData.shift_types['Turno normale']) {
            weekData.shift_types['Turno normale'] -= weekData.ritardo_minutes;
            if (weekData.shift_types['Turno normale'] < 0) {
              weekData.shift_types['Turno normale'] = 0;
            }
          }
          if (!weekData.shift_types['Assenza non retribuita']) {
            weekData.shift_types['Assenza non retribuita'] = 0;
          }
          weekData.shift_types['Assenza non retribuita'] += weekData.ritardo_minutes;
        }
        
        // Calculate total minutes
        weekData.total_minutes = Object.values(weekData.shift_types).reduce((sum, mins) => sum + mins, 0);
        
        // Convert store names set to string
        weekData.store_names_display = Array.from(weekData.store_names).sort().join(', ');
      });
    });

    // Write CSV header
    csv += 'Settimana,Dipendente,Locali,';
    shiftTypesArray.forEach(type => {
      csv += `"${type}",`;
    });
    csv += 'Totale Ore\n';

    // Collect all rows for sorting
    const allRows = [];
    weeks.forEach(weekStartInPeriod => { // Iterate over all weeks in the determined period
      const weekKey = format(weekStartInPeriod, 'yyyy-MM-dd');
      payrollData.employees.forEach(employee => { // For each employee
        const weekDataForEmployee = employeeWeeklyData[employee.employee_name]?.[weekKey];
        if (weekDataForEmployee) {
          allRows.push({
            employeeName: employee.employee_name,
            weekKey,
            weekData: weekDataForEmployee
          });
        } else {
          // If no shifts for this employee in this week, create an empty row
          allRows.push({
            employeeName: employee.employee_name,
            weekKey,
            weekData: {
              weekStart: weekStartInPeriod,
              weekEnd: endOfWeek(weekStartInPeriod, { weekStartsOn: 1 }),
              store_names_display: employee.store_names_display, // Show all stores for employee if no specific shifts for the week
              shift_types: Object.fromEntries(shiftTypesArray.map(type => [type, 0])), // All types with 0 minutes
              total_minutes: 0
            }
          });
        }
      });
    });

    // Sort by week (most recent first), then by employee name
    allRows.sort((a, b) => {
      const weekCompare = new Date(b.weekKey) - new Date(a.weekKey);
      if (weekCompare !== 0) return weekCompare;
      return a.employeeName.localeCompare(b.employeeName);
    });

    // Write data rows
    allRows.forEach(row => {
      const { employeeName, weekData } = row;
      const weekLabel = `${format(weekData.weekStart, 'dd/MM/yyyy')} - ${format(weekData.weekEnd, 'dd/MM/yyyy')}`;
      
      csv += `"${weekLabel}","${employeeName}","${weekData.store_names_display}",`;
      
      shiftTypesArray.forEach(type => {
        const minutes = weekData.shift_types[type] || 0;
        csv += `"${minutesToHours(minutes)}",`;
      });
      
      csv += `"${minutesToHours(weekData.total_minutes)}"\n`;
    });

    // Summary row
    csv += '\nRIEPILOGO TOTALE,,';
    shiftTypesArray.forEach(type => {
      const totalMinutes = allRows.reduce((sum, row) => sum + (row.weekData.shift_types[type] || 0), 0);
      csv += `"${minutesToHours(totalMinutes)}",`;
    });
    const grandTotal = allRows.reduce((sum, row) => sum + row.weekData.total_minutes, 0);
    csv += `"${minutesToHours(grandTotal)}"\n`;

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = `payroll_weekly_all_employees_${startDate || 'all'}_${endDate || 'all'}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-[#8b7355] animate-spin mx-auto mb-4" />
          <p className="text-[#9b9b9b]">Caricamento dati payroll...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Payroll</h1>
        <p className="text-[#9b9b9b]">Dettaglio ore lavorate per dipendente per tipo di turno</p>
      </div>

      {/* Filters */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-[#8b7355]" />
          <h2 className="text-lg font-bold text-[#6b6b6b]">Filtri</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block">Locale</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            >
              <option value="all">Tutti i Locali</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Inizio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-[#9b9b9b] mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Fine
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            />
          </div>
        </div>

        {(startDate || endDate) && (
          <div className="mt-4 pt-4 border-t border-[#c1c1c1]">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#9b9b9b] hover:text-[#6b6b6b] transition-colors"
            >
              Cancella Filtro Date
            </button>
          </div>
        )}
      </NeumorphicCard>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{payrollData.totalEmployees}</h3>
          <p className="text-sm text-[#9b9b9b]">Dipendenti</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-2xl font-bold text-[#6b6b6b] mb-1">
            {minutesToHours(payrollData.totalMinutes)}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Ore Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-red-600 mb-1">
            {minutesToHours(payrollData.totalRitardoMinutes)}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Ore Ritardo Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-green-600 mb-1">
            {minutesToHours(payrollData.totalMinutes - payrollData.totalRitardoMinutes)}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Ore Nette</p>
        </NeumorphicCard>
      </div>

      {/* Payroll Table */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#6b6b6b]">Dettaglio Ore per Dipendente</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm text-[#9b9b9b]">
              {startDate && endDate ? (
                <span>
                  Periodo: {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
                </span>
              ) : startDate ? (
                <span>Da: {format(parseISO(startDate), 'dd/MM/yyyy')}</span>
              ) : endDate ? (
                <span>Fino a: {format(parseISO(endDate), 'dd/MM/yyyy')}</span>
              ) : (
                <span>Tutti i turni</span>
              )}
            </div>
            <button
              onClick={exportWeeklyReport}
              className="neumorphic-flat px-4 py-2 rounded-lg flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
              title="Scarica report settimanale di tutti i dipendenti"
            >
              <CalendarRange className="w-4 h-4" />
              Report Settimanale
            </button>
            <button
              onClick={exportAllEmployeesDailyCSV}
              className="neumorphic-flat px-4 py-2 rounded-lg flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
              title="Scarica report giornaliero di tutti i dipendenti"
            >
              <FileText className="w-4 h-4" />
              Report Giornaliero
            </button>
            <button
              onClick={exportToCSV}
              className="neumorphic-flat px-4 py-2 rounded-lg flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
            >
              <Download className="w-4 h-4" />
              Scarica CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#8b7355]">
                <th className="text-left p-3 text-[#9b9b9b] font-medium sticky left-0 bg-[#e0e5ec]">Dipendente</th>
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Locali</th>
                {payrollData.shiftTypes.map(type => (
                  <th 
                    key={type} 
                    className={`text-center p-3 font-medium ${
                      type === 'Assenza non retribuita' ? 'text-red-600' : 'text-[#9b9b9b]'
                    }`}
                  >
                    {type}
                  </th>
                ))}
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Totale Ore</th>
                <th className="text-right p-3 text-green-600 font-medium">Ore Nette</th>
                <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.employees.length > 0 ? (
                payrollData.employees.map((employee, index) => {
                  const netMinutes = employee.total_minutes - employee.total_ritardo_minutes;
                  return (
                    <tr 
                      key={index} 
                      className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors"
                    >
                      <td className="p-3 sticky left-0 bg-[#e0e5ec]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full neumorphic-flat flex items-center justify-center">
                            <span className="text-sm font-bold text-[#8b7355]">
                              {employee.employee_name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-[#6b6b6b] font-medium">{employee.employee_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-[#6b6b6b] text-sm">
                        {employee.store_names_display}
                      </td>
                      {payrollData.shiftTypes.map(type => (
                        <td 
                          key={type} 
                          className={`p-3 text-center ${
                            type === 'Assenza non retribuita' ? 'text-red-600 font-bold' : 'text-[#6b6b6b]'
                          }`}
                        >
                          {employee.shift_types[type] ? (
                            <div className="font-bold">
                              {minutesToHours(employee.shift_types[type])}
                            </div>
                          ) : (
                            <span className="text-[#9b9b9b]">-</span>
                          )}
                        </td>
                      ))}
                      <td className="p-3 text-right">
                        <div className="font-bold text-[#6b6b6b]">
                          {minutesToHours(employee.total_minutes)}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-green-600">
                          {minutesToHours(netMinutes)}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedEmployee(employee)}
                          className="neumorphic-flat px-3 py-2 rounded-lg flex items-center gap-1 text-[#6b6b6b] hover:text-[#8b7355] transition-colors mx-auto"
                        >
                          <span className="text-sm">Dettaglio</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={payrollData.shiftTypes.length + 5} className="p-8 text-center text-[#9b9b9b]">
                    Nessun turno trovato per i filtri selezionati
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#8b7355] font-bold bg-[#e8ecf3]">
                <td className="p-3 text-[#6b6b6b] sticky left-0 bg-[#e8ecf3]">TOTALE</td>
                <td className="p-3"></td>
                {payrollData.shiftTypes.map(type => {
                  const totalForType = payrollData.employees.reduce(
                    (sum, emp) => sum + (emp.shift_types[type] || 0), 
                    0
                  );
                  return (
                    <td 
                      key={type} 
                      className={`p-3 text-center ${
                        type === 'Assenza non retribuita' ? 'text-red-600' : 'text-[#6b6b6b]'
                      }`}
                    >
                      {totalForType > 0 && (
                        <div>{minutesToHours(totalForType)}</div>
                      )}
                    </td>
                  );
                })}
                <td className="p-3 text-right text-[#6b6b6b]">
                  <div>{minutesToHours(payrollData.totalMinutes)}</div>
                </td>
                <td className="p-3 text-right text-green-600">
                  <div>
                    {minutesToHours(payrollData.totalMinutes - payrollData.totalRitardoMinutes)}
                  </div>
                </td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </NeumorphicCard>

      {/* Employee Daily/Weekly Breakdown Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#6b6b6b] mb-1">
                  {selectedEmployee.employee_name} - Dettaglio {viewMode === 'daily' ? 'Giornaliero' : 'Settimanale'}
                </h2>
                <p className="text-[#9b9b9b]">
                  {startDate && endDate ? (
                    <span>
                      Periodo: {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
                    </span>
                  ) : startDate ? (
                    <span>Da: {format(parseISO(startDate), 'dd/MM/yyyy')}</span>
                  ) : endDate ? (
                    <span>Fino a: {format(parseISO(endDate), 'dd/MM/yyyy')}</span>
                  ) : (
                    <span>Tutti i turni</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="neumorphic-pressed rounded-lg p-1 flex gap-1">
                  <button
                    onClick={() => setViewMode('daily')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'daily' 
                        ? 'neumorphic-flat text-[#6b6b6b]' 
                        : 'text-[#9b9b9b] hover:text-[#6b6b6b]'
                    }`}
                  >
                    Giornaliero
                  </button>
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'weekly' 
                        ? 'neumorphic-flat text-[#6b6b6b]' 
                        : 'text-[#9b9b9b] hover:text-[#6b6b6b]'
                    }`}
                  >
                    Settimanale
                  </button>
                </div>
                
                <button
                  onClick={exportEmployeeDailyCSV}
                  className="neumorphic-flat px-4 py-2 rounded-lg flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Scarica CSV
                </button>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="neumorphic-flat p-2 rounded-lg text-[#6b6b6b] hover:text-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">
                  {viewMode === 'daily' ? 'Giorni Lavorati' : 'Settimane Lavorate'}
                </p>
                <p className="text-2xl font-bold text-[#6b6b6b]">
                  {viewMode === 'daily' ? employeeDailyBreakdown.days.length : employeeDailyBreakdown.weeks.length}
                </p>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Ore Totali</p>
                <p className="text-xl font-bold text-[#6b6b6b]">
                  {minutesToHours(selectedEmployee.total_minutes)}
                </p>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Ore Ritardo</p>
                <p className="text-xl font-bold text-red-600">
                  {minutesToHours(selectedEmployee.total_ritardo_minutes)}
                </p>
              </div>
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Ore Nette</p>
                <p className="text-xl font-bold text-green-600">
                  {minutesToHours(selectedEmployee.total_minutes - selectedEmployee.total_ritardo_minutes)}
                </p>
              </div>
            </div>

            {/* Daily/Weekly Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium sticky left-0 bg-[#e0e5ec]">
                      {viewMode === 'daily' ? 'Data' : 'Settimana'}
                    </th>
                    {employeeDailyBreakdown.shiftTypes.map(type => (
                      <th 
                        key={type} 
                        className={`text-center p-3 font-medium ${
                          type === 'Assenza non retribuita' ? 'text-red-600' : 'text-[#9b9b9b]'
                        }`}
                      >
                        {type}
                      </th>
                    ))}
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Totale Ore</th>
                  </tr>
                </thead>
                <tbody>
                  {viewMode === 'daily' ? (
                    employeeDailyBreakdown.days.length > 0 ? (
                      employeeDailyBreakdown.days.map((day, index) => (
                        <tr 
                          key={index} 
                          className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors"
                        >
                          <td className="p-3 sticky left-0 bg-[#e0e5ec] font-medium text-[#6b6b6b]">
                            {format(parseISO(day.date), 'dd/MM/yyyy')}
                          </td>
                          {employeeDailyBreakdown.shiftTypes.map(type => (
                            <td 
                              key={type} 
                              className={`p-3 text-center ${
                                type === 'Assenza non retribuita' ? 'text-red-600 font-bold' : 'text-[#6b6b6b]'
                              }`}
                            >
                              {day.shift_types[type] ? (
                                <div className="font-bold">
                                  {minutesToHours(day.shift_types[type])}
                                </div>
                              ) : (
                                <span className="text-[#9b9b9b]">-</span>
                              )}
                            </td>
                          ))}
                          <td className="p-3 text-right">
                            <div className="font-bold text-[#6b6b6b]">
                              {minutesToHours(day.total_minutes)}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={employeeDailyBreakdown.shiftTypes.length + 2} className="p-8 text-center text-[#9b9b9b]">
                          Nessun turno trovato per questo dipendente nel periodo selezionato
                        </td>
                      </tr>
                    )
                  ) : (
                    // Weekly view
                    employeeDailyBreakdown.weeks.length > 0 ? (
                      employeeDailyBreakdown.weeks.map((week, index) => (
                        <tr 
                          key={index} 
                          className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors"
                        >
                          <td className="p-3 sticky left-0 bg-[#e0e5ec] font-medium text-[#6b6b6b]">
                            <div>
                              <div className="text-sm">
                                Settimana {format(week.weekStart, 'dd/MM', { locale: it })} - {format(week.weekEnd, 'dd/MM/yyyy', { locale: it })}
                              </div>
                            </div>
                          </td>
                          {employeeDailyBreakdown.shiftTypes.map(type => (
                            <td 
                              key={type} 
                              className={`p-3 text-center ${
                                type === 'Assenza non retribuita' ? 'text-red-600 font-bold' : 'text-[#6b6b6b]'
                              }`}
                            >
                              {week.shift_types[type] ? (
                                <div className="font-bold">
                                  {minutesToHours(week.shift_types[type])}
                                </div>
                              ) : (
                                <span className="text-[#9b9b9b]">-</span>
                              )}
                            </td>
                          ))}
                          <td className="p-3 text-right">
                            <div className="font-bold text-[#6b6b6b]">
                              {minutesToHours(week.total_minutes)}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={employeeDailyBreakdown.shiftTypes.length + 2} className="p-8 text-center text-[#9b9b9b]">
                          Nessun turno trovato per questo dipendente nel periodo selezionato
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
        </div>
      )}

      {/* Info Card */}
      <NeumorphicCard className="p-6 bg-blue-50 border-2 border-blue-300">
        <div className="text-sm text-blue-800 space-y-2">
          <p className="font-bold">ℹ️ Note:</p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Turno normale</strong>: include tutti i turni senza tipo specifico e i turni di tipo "Affiancamento"</li>
            <li>• <strong>Assenza non retribuita</strong>: include i minuti di ritardo, i turni di tipo "Ritardo" e "Malattia (No Certificato)"</li>
            <li>• <strong>Ritardo</strong>: i minuti di ritardo sono sottratti dai turni normali e sommati alla categoria 'Assenza non retribuita'</li>
            <li>• <strong>Ore Nette</strong>: Ore totali meno ore di ritardo</li>
            <li>• Le ore sono mostrate in formato ore e minuti (es. 8h 30m)</li>
            <li>• I turni duplicati vengono automaticamente filtrati</li>
          </ul>
        </div>
      </NeumorphicCard>
    </div>
  );
}
