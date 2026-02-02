import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clock, Calendar, Users, Filter, Download, DollarSign, X, ChevronRight, FileText, CalendarRange, AlertCircle } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isWithinInterval, format, startOfWeek, endOfWeek, addDays, eachWeekOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Payroll() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState('daily');
  const [showUnpaidAbsenceModal, setShowUnpaidAbsenceModal] = useState(false);
  const [unpaidAbsenceDetails, setUnpaidAbsenceDetails] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null); // 'ferie', 'straordinario', etc.

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: turniPlanday = [], isLoading } = useQuery({
    queryKey: ['turni-planday-payroll'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 10000)
  });

  const { data: config = null } = useQuery({
    queryKey: ['timbratura-config'],
    queryFn: async () => {
      const configs = await base44.entities.TimbraturaConfig.list();
      return configs[0] || {};
    }
  });

  // ✅ HELPER: Normalize employee name for consistent grouping
  const normalizeEmployeeName = (name) => {
    if (!name) return 'unknown';
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  };

  // ✅ NORMALIZE SHIFT TYPE - Aggregate similar types
  const normalizeShiftType = (shiftType) => {
    if (!shiftType) return 'Turno normale';

    const type = shiftType.trim();

    if (type === 'Affiancamento') return 'Turno normale';
    if (type === 'Malattia (Non Certificata)') return 'Assenza non retribuita';
    if (type === 'Malattia (No Certificato)') return 'Assenza non retribuita';
    if (type === 'Assenza non retribuita') return 'Assenza non retribuita';
    if (type === 'Normale') return 'Turno normale';

    return type;
  };

  // Calcola ritardo effettivo con arrotondamento
  const calcolaRitardoEffettivo = (minutiRitardo) => {
    if (!config?.arrotonda_ritardo) return minutiRitardo;

    const incremento = config.arrotondamento_minuti || 15;
    const tipo = config.arrotondamento_tipo || 'eccesso';

    if (tipo === 'eccesso') {
      return Math.ceil(minutiRitardo / incremento) * incremento;
    } else {
      return Math.floor(minutiRitardo / incremento) * incremento;
    }
  };

  // Convert TurnoPlanday to Shift-like format
  const shifts = useMemo(() => {
    return turniPlanday.map((turno) => {
      const scheduledStart = turno.data && turno.ora_inizio ?
      `${turno.data}T${turno.ora_inizio}:00` :
      null;
      const scheduledEnd = turno.data && turno.ora_fine ?
      `${turno.data}T${turno.ora_fine}:00` :
      null;

      let scheduledMinutes = 0;
      if (turno.ora_inizio && turno.ora_fine) {
        const [startH, startM] = turno.ora_inizio.split(':').map(Number);
        const [endH, endM] = turno.ora_fine.split(':').map(Number);
        scheduledMinutes = endH * 60 + endM - (startH * 60 + startM);
      }

      // ✅ Calcola ritardo con arrotondamento (stesso metodo di Timbrature)
      let minutiDiRitardo = 0;
      
      // Usa calcolato_ritardo se disponibile E maggiore di 0, altrimenti calcola manualmente
      if (turno.calcolato_ritardo && turno.calcolato_ritardo > 0) {
        minutiDiRitardo = turno.calcolato_ritardo;
      } else if (turno.timbrata_entrata && scheduledStart) {
        const entrata = new Date(turno.timbrata_entrata);
        const previsto = new Date(scheduledStart);
        const diffMs = entrata - previsto;
        if (diffMs > 0) {
          const ritardoReale = Math.floor(diffMs / 60000);
          minutiDiRitardo = calcolaRitardoEffettivo(ritardoReale);
        }
      }

      // Store name lookup
      const store = stores.find((s) => s.id === turno.store_id);

      return {
        id: turno.id,
        employee_name: turno.dipendente_nome,
        store_id: turno.store_id,
        store_name: store?.name || turno.store_id,
        shift_date: turno.data,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        actual_start: turno.timbrata_entrata,
        actual_end: turno.timbrata_uscita,
        scheduled_minutes: scheduledMinutes,
        shift_type: turno.tipo_turno,
        minuti_di_ritardo: minutiDiRitardo,
        created_date: turno.created_date
      };
    });
  }, [turniPlanday, config, stores]);

  // ✅ IMPROVED: Process payroll data with NORMALIZED employee names AND total hours excluding overtime
  const payrollData = useMemo(() => {
    let filteredShifts = shifts;

    if (selectedStore !== 'all') {
      filteredShifts = filteredShifts.filter((s) => s.store_id === selectedStore);
    }

    if (startDate || endDate) {
      filteredShifts = filteredShifts.filter((shift) => {
        if (!shift.shift_date) return false;
        try {
          const shiftDate = parseISO(shift.shift_date);
          if (isNaN(shiftDate.getTime())) return false;
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
        } catch (e) {
          return false;
        }
      });
    }

    const employeeData = {};

    filteredShifts.forEach((shift) => {
      // ✅ USE NORMALIZED NAME AS KEY
      const normalizedName = normalizeEmployeeName(shift.employee_name);

      if (!employeeData[normalizedName]) {
        employeeData[normalizedName] = {
          employee_name: shift.employee_name || 'Unknown', // Keep original name for display, fallback to Unknown
          normalized_name: normalizedName,
          store_names: new Set(),
          shift_types: {},
          total_minutes: 0,
          total_ritardo_minutes: 0
        };
      }

      if (shift.store_name) {
        employeeData[normalizedName].store_names.add(shift.store_name);
      }

      let workedMinutes = shift.scheduled_minutes || 0;

      // ✅ USE NORMALIZED SHIFT TYPE
      let shiftType = normalizeShiftType(shift.shift_type);

      if (!employeeData[normalizedName].shift_types[shiftType]) {
        employeeData[normalizedName].shift_types[shiftType] = 0;
      }

      employeeData[normalizedName].shift_types[shiftType] += workedMinutes;
      employeeData[normalizedName].total_minutes += workedMinutes;

      if (shift.minuti_di_ritardo && shift.minuti_di_ritardo > 0) {
        employeeData[normalizedName].total_ritardo_minutes += shift.minuti_di_ritardo;
      }
    });

    Object.keys(employeeData).forEach((normalizedName) => {
      const emp = employeeData[normalizedName];
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

      // ✅ Calculate total excluding overtime (straordinari)
      const overtimeMinutes = emp.shift_types['Straordinario'] || 0;
      emp.total_minutes_excluding_overtime = emp.total_minutes - overtimeMinutes;
    });

    const employeeArray = Object.values(employeeData).sort((a, b) =>
    a.employee_name.localeCompare(b.employee_name)
    );

    const allShiftTypes = new Set();
    employeeArray.forEach((emp) => {
      Object.keys(emp.shift_types).forEach((type) => allShiftTypes.add(type));
    });

    console.log(`👥 Dipendenti unici nella tabella Payroll: ${employeeArray.length}`);
    console.log('📋 Nomi dipendenti:', employeeArray.map((e) => e.employee_name));

    return {
      employees: employeeArray,
      shiftTypes: Array.from(allShiftTypes).sort(),
      totalEmployees: employeeArray.length,
      totalMinutes: employeeArray.reduce((sum, emp) => sum + emp.total_minutes, 0),
      totalRitardoMinutes: employeeArray.reduce((sum, emp) => sum + emp.total_ritardo_minutes, 0),
      totalMinutesExcludingOvertime: employeeArray.reduce((sum, emp) => sum + emp.total_minutes_excluding_overtime, 0)
    };
  }, [shifts, selectedStore, startDate, endDate]);

  // Calculate daily/weekly breakdown for selected employee
  const employeeDailyBreakdown = useMemo(() => {
    if (!selectedEmployee) return { days: [], shiftTypes: [], weeks: [] };

    // Use normalized name to filter
    const selectedEmployeeNormalizedName = normalizeEmployeeName(selectedEmployee.employee_name);
    let employeeShifts = shifts.filter((s) => normalizeEmployeeName(s.employee_name) === selectedEmployeeNormalizedName);

    if (selectedStore !== 'all') {
      employeeShifts = employeeShifts.filter((s) => s.store_id === selectedStore);
    }

    if (startDate || endDate) {
      employeeShifts = employeeShifts.filter((shift) => {
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

    employeeShifts.forEach((shift) => {
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

    Object.keys(dailyData).forEach((date) => {
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

    const dailyArray = Object.values(dailyData).sort((a, b) => {
      try {
        return new Date(b.date) - new Date(a.date);
      } catch (e) {
        return 0;
      }
    });

    dailyArray.forEach((day) => {
      day.total_minutes = Object.values(day.shift_types).reduce((sum, mins) => sum + mins, 0);
    });

    // Weekly data
    const weeklyData = {};

    employeeShifts.forEach((shift) => {
      if (!shift.shift_date) return;
      try {
        const date = parseISO(shift.shift_date);
        if (isNaN(date.getTime())) return;
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
      } catch (e) {
        console.error('Error processing shift date:', e);
      }
    });

    Object.keys(weeklyData).forEach((weekKey) => {
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

    weeklyArray.forEach((week) => {
      week.total_minutes = Object.values(week.shift_types).reduce((sum, mins) => sum + mins, 0);
    });

    return {
      days: dailyArray,
      weeks: weeklyArray,
      shiftTypes: Array.from(allShiftTypes).sort()
    };
  }, [selectedEmployee, shifts, selectedStore, startDate, endDate, normalizeEmployeeName]); // Added normalizeEmployeeName to dependencies

  // ✅ Get unpaid absence shifts - include tutti i tipi di assenza non retribuita
  const getUnpaidAbsenceShifts = (employeeName) => {
    const targetNormalizedName = normalizeEmployeeName(employeeName);

    let employeeShifts = shifts.filter((s) => {
      if (normalizeEmployeeName(s.employee_name) !== targetNormalizedName) return false;
      if (selectedStore !== 'all' && s.store_id !== selectedStore) return false;

      if (startDate || endDate) {
        if (!s.shift_date) return false;
        try {
          const shiftDate = parseISO(s.shift_date);
          if (isNaN(shiftDate.getTime())) return false;
          const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
          const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

          if (start && end) {
            return isWithinInterval(shiftDate, { start, end });
          } else if (start) {
            return shiftDate >= start;
          } else if (end) {
            return shiftDate <= end;
          }
        } catch (e) {
          return false;
        }
      }

      return true;
    });

    const unpaidShifts = [];

    employeeShifts.forEach((shift) => {
      const originalType = shift.shift_type || 'Turno normale';
      const normalizedType = normalizeShiftType(originalType);

      // ✅ CASO 1: Turni che vengono normalizzati come "Assenza non retribuita"
      if (normalizedType === 'Assenza non retribuita') {
        unpaidShifts.push({
          ...shift,
          unpaid_reason: `Turno di tipo: ${originalType}`,
          unpaid_minutes: shift.scheduled_minutes || 0
        });
      }

      // ✅ CASO 2: Ritardi effettivi su turni normali (calcolato dal database)
      if (shift.minuti_di_ritardo && shift.minuti_di_ritardo > 0) {
        unpaidShifts.push({
          ...shift,
          unpaid_reason: 'Ritardo in ingresso',
          unpaid_minutes: shift.minuti_di_ritardo
        });
      }
    });

    // Sort by date (most recent first)
    return unpaidShifts.sort((a, b) => {
      try {
        return new Date(b.shift_date) - new Date(a.shift_date);
      } catch (e) {
        return 0;
      }
    });
  };

  const handleUnpaidAbsenceClick = (employee) => {
    const unpaidShifts = getUnpaidAbsenceShifts(employee.employee_name);
    setUnpaidAbsenceDetails({
      employee,
      shifts: unpaidShifts,
      totalMinutes: unpaidShifts.reduce((sum, s) => sum + s.unpaid_minutes, 0)
    });
    setShowUnpaidAbsenceModal(true);
  };

  // Get shifts by type for detail view
  const getShiftsByType = (employeeName, shiftType) => {
    const targetNormalizedName = normalizeEmployeeName(employeeName);

    let employeeShifts = shifts.filter((s) => {
      if (normalizeEmployeeName(s.employee_name) !== targetNormalizedName) return false;
      if (selectedStore !== 'all' && s.store_id !== selectedStore) return false;

      if (startDate || endDate) {
        if (!s.shift_date) return false;
        try {
          const shiftDate = parseISO(s.shift_date);
          if (isNaN(shiftDate.getTime())) return false;
          const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
          const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

          if (start && end) {
            return isWithinInterval(shiftDate, { start, end });
          } else if (start) {
            return shiftDate >= start;
          } else if (end) {
            return shiftDate <= end;
          }
        } catch (e) {
          return false;
        }
      }
      return true;
    });

    // Filter by shift type
    return employeeShifts.filter((s) => {
      const normalized = normalizeShiftType(s.shift_type);
      return normalized === shiftType;
    }).sort((a, b) => {
      try {
        return new Date(b.shift_date) - new Date(a.shift_date);
      } catch (e) {
        return 0;
      }
    });
  };

  const handleShiftTypeClick = (employee, shiftType) => {
    const shiftsForType = getShiftsByType(employee.employee_name, shiftType);
    setShowDetailModal({
      employee,
      shiftType,
      shifts: shiftsForType,
      totalMinutes: shiftsForType.reduce((sum, s) => sum + (s.scheduled_minutes || 0), 0)
    });
  };

  const minutesToHours = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const minutesToDecimal = (minutes) => {
    return (minutes / 60).toFixed(2);
  };

  // ✅ UPDATED: Export to CSV with overtime exclusion column
  const exportToCSV = () => {
    // Prepare CSV content
    let csv = 'Dipendente,Locale,';

    // Add shift type columns
    payrollData.shiftTypes.forEach((type) => {
      csv += `"${type}",`;
    });
    csv += 'Totale Ore,Totale Ore (Esclusi Straordinari),Ore Nette\n';

    // Add data rows
    payrollData.employees.forEach((employee) => {
      csv += `"${employee.employee_name}","${employee.store_names_display}",`;

      payrollData.shiftTypes.forEach((type) => {
        const minutes = employee.shift_types[type] || 0;
        csv += `"${minutesToHours(minutes)}",`;
      });

      const netMinutes = employee.total_minutes - employee.total_ritardo_minutes;
      csv += `"${minutesToHours(employee.total_minutes)}",`;
      csv += `"${minutesToHours(employee.total_minutes_excluding_overtime)}",`;
      csv += `"${minutesToHours(netMinutes)}"\n`;
    });

    // Add total row
    csv += 'TOTALE,,';
    payrollData.shiftTypes.forEach((type) => {
      const total = payrollData.employees.reduce((sum, emp) => sum + (emp.shift_types[type] || 0), 0);
      csv += `"${minutesToHours(total)}",`;
    });
    csv += `"${minutesToHours(payrollData.totalMinutes)}",`;
    csv += `"${minutesToHours(payrollData.totalMinutesExcludingOvertime)}",`;
    csv += `"${minutesToHours(payrollData.totalMinutes - payrollData.totalRitardoMinutes)}"\n`;

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

  // ✅ UPDATED: Export employee daily breakdown to CSV with overtime exclusion
  const exportEmployeeDailyCSV = () => {
    if (!selectedEmployee) return;

    let csv = `Dipendente: ${selectedEmployee.employee_name}\n`;
    csv += `Periodo: ${startDate || 'Tutti i turni'} - ${endDate || 'Tutti i turni'}\n`;
    csv += `Visualizzazione: ${viewMode === 'daily' ? 'Giornaliera' : 'Settimanale'}\n\n`;

    // Use normalized name for filtering shifts
    const selectedEmployeeNormalizedName = normalizeEmployeeName(selectedEmployee.employee_name);

    if (viewMode === 'daily') {
      csv += 'Data,';
      employeeDailyBreakdown.shiftTypes.forEach((type) => {
        csv += `"${type}",`;
      });
      csv += 'Totale Ore,Totale Ore (Esclusi Straordinari)\n';

      employeeDailyBreakdown.days.forEach((day) => {
        try {
          csv += `${format(parseISO(day.date), 'dd/MM/yyyy')},`;
        } catch (e) {
          csv += `${day.date},`;
        }

        employeeDailyBreakdown.shiftTypes.forEach((type) => {
          const minutes = day.shift_types[type] || 0;
          csv += `"${minutesToHours(minutes)}",`;
        });

        const overtimeMinutes = day.shift_types['Straordinario'] || 0;
        const totalExcludingOvertime = day.total_minutes - overtimeMinutes;

        csv += `"${minutesToHours(day.total_minutes)}",`;
        csv += `"${minutesToHours(totalExcludingOvertime)}"\n`;
      });
    } else {
      // Weekly view
      csv += 'Settimana,';
      employeeDailyBreakdown.shiftTypes.forEach((type) => {
        csv += `"${type}",`;
      });
      csv += 'Totale Ore,Totale Ore (Esclusi Straordinari)\n';

      employeeDailyBreakdown.weeks.forEach((week) => {
        let weekLabel;
        try {
          weekLabel = `Settimana ${format(week.weekStart, 'dd/MM', { locale: it })} - ${format(week.weekEnd, 'dd/MM/yyyy', { locale: it })}`;
        } catch (e) {
          weekLabel = 'Settimana non valida';
        }
        csv += `"${weekLabel}",`;

        employeeDailyBreakdown.shiftTypes.forEach((type) => {
          const minutes = week.shift_types[type] || 0;
          csv += `"${minutesToHours(minutes)}",`;
        });

        const overtimeMinutes = week.shift_types['Straordinario'] || 0;
        const totalExcludingOvertime = week.total_minutes - overtimeMinutes;

        csv += `"${minutesToHours(week.total_minutes)}",`;
        csv += `"${minutesToHours(totalExcludingOvertime)}"\n`;
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

  // ✅ UPDATED: Export daily breakdown for ALL employees with overtime exclusion
  const exportAllEmployeesDailyCSV = () => {
    let csv = 'Report Giornaliero - Tutti i Dipendenti\n';
    csv += `Periodo: ${startDate || 'Tutti i turni'} - ${endDate || 'Tutti i turni'}\n`;
    csv += `Locale: ${selectedStore === 'all' ? 'Tutti i Locali' : stores.find((s) => s.id === selectedStore)?.name || selectedStore}\n\n`;

    // Header
    csv += 'Data,Dipendente,Locale,';

    // Get all unique shift types across all employees
    const allShiftTypes = new Set();
    payrollData.employees.forEach((employee) => {// Use payrollData's shiftTypes for consistency
      Object.keys(employee.shift_types).forEach((type) => allShiftTypes.add(type));
    });
    const shiftTypesArray = Array.from(allShiftTypes).sort();

    shiftTypesArray.forEach((type) => {
      csv += `"${type}",`;
    });
    csv += 'Totale Ore,Totale Ore (Esclusi Straordinari)\n';

    // Collect all daily data for all employees
    const allDailyData = [];

    payrollData.employees.forEach((employee) => {
      // Filter shifts for this employee
      const employeeNormalizedName = normalizeEmployeeName(employee.employee_name); // Get normalized name for filtering
      let employeeShifts = shifts.filter((s) => {// Using the already deduplicated 'shifts'
        if (normalizeEmployeeName(s.employee_name) !== employeeNormalizedName) return false; // Filter by normalized name

        // Apply store filter
        if (selectedStore !== 'all' && s.store_id !== selectedStore) return false;

        // Apply date filter
        if (startDate || endDate) {
          if (!s.shift_date) return false;
          try {
            const shiftDate = parseISO(s.shift_date);
            if (isNaN(shiftDate.getTime())) return false;
            const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
            const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

            if (start && end) {
              return isWithinInterval(shiftDate, { start, end });
            } else if (start) {
              return shiftDate >= start;
            } else if (end) {
              return shiftDate <= end;
            }
          } catch (e) {
            return false;
          }
        }

        return true;
      });

      // Group by date
      const dailyData = {};
      employeeShifts.forEach((shift) => {
        if (!shift.shift_date) return;
        try {
          const date = shift.shift_date;
          if (!dailyData[date]) {
            dailyData[date] = {
              date,
              employee_name: employee.employee_name, // Use original employee name for display
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
        } catch (e) {
          console.error('Error processing shift date:', e);
        }
      });

      // Process ritardi for each day
      Object.keys(dailyData).forEach((date) => {
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
        const overtimeMinutes = day.shift_types['Straordinario'] || 0;
        day.total_minutes_excluding_overtime = day.total_minutes - overtimeMinutes;

        // Convert store names set to string
        day.store_names_display = Array.from(day.store_names).sort().join(', ');
      });

      // Add to all daily data
      Object.values(dailyData).forEach((day) => {
        allDailyData.push(day);
      });
    });

    // Sort by date (most recent first), then by employee name
    allDailyData.sort((a, b) => {
      try {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
      } catch (e) {


        // Ignore date comparison error
      }return a.employee_name.localeCompare(b.employee_name);});

    // Write data rows
    allDailyData.forEach((day) => {
      try {
        csv += `${format(parseISO(day.date), 'dd/MM/yyyy')},"${day.employee_name}","${day.store_names_display}",`;
      } catch (e) {
        csv += `${day.date},"${day.employee_name}","${day.store_names_display}",`;
      }

      shiftTypesArray.forEach((type) => {
        const minutes = day.shift_types[type] || 0;
        csv += `"${minutesToHours(minutes)}",`;
      });

      csv += `"${minutesToHours(day.total_minutes)}",`;
      csv += `"${minutesToHours(day.total_minutes_excluding_overtime)}"\n`;
    });

    // Summary row
    csv += '\nRIEPILOGO TOTALE,,';
    shiftTypesArray.forEach((type) => {
      const totalMinutes = allDailyData.reduce((sum, day) => sum + (day.shift_types[type] || 0), 0);
      csv += `"${minutesToHours(totalMinutes)}",`;
    });
    const grandTotal = allDailyData.reduce((sum, day) => sum + day.total_minutes, 0);
    const grandTotalExcludingOvertime = allDailyData.reduce((sum, day) => sum + day.total_minutes_excluding_overtime, 0);
    csv += `"${minutesToHours(grandTotal)}",`;
    csv += `"${minutesToHours(grandTotalExcludingOvertime)}"\n`;

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

  // ✅ UPDATED: Export weekly report with overtime exclusion
  const exportWeeklyReport = () => {
    let csv = 'Report Settimanale - Tutti i Dipendenti\n';
    csv += `Periodo: ${startDate || 'Tutti i turni'} - ${endDate || 'Tutti i turni'}\n`;
    csv += `Locale: ${selectedStore === 'all' ? 'Tutti i Locali' : stores.find((s) => s.id === selectedStore)?.name || selectedStore}\n\n`;

    // Get all unique shift types
    const allShiftTypes = new Set();
    payrollData.employees.forEach((employee) => {
      Object.keys(employee.shift_types).forEach((type) => allShiftTypes.add(type));
    });
    const shiftTypesArray = Array.from(allShiftTypes).sort();

    // Determine date range for all relevant shifts
    let minDate = null;
    let maxDate = null;

    const relevantShifts = shifts.filter((s) => {// Using the already deduplicated 'shifts'
      // Apply store filter
      if (selectedStore !== 'all' && s.store_id !== selectedStore) return false;
      // Only shifts with a date are relevant for range calculation
      return !!s.shift_date;
    });

    relevantShifts.forEach((shift) => {
      try {
        const shiftDate = parseISO(shift.shift_date);
        if (isNaN(shiftDate.getTime())) return;
        if (!minDate || shiftDate < minDate) minDate = shiftDate;
        if (!maxDate || shiftDate > maxDate) maxDate = shiftDate;
      } catch (e) {
        console.error('Error parsing shift date:', e);
      }
    });

    // If specific startDate/endDate filters are applied, use them to refine minDate/maxDate
    if (startDate) {
      try {
        const filterStart = parseISO(startDate);
        if (!isNaN(filterStart.getTime()) && (!minDate || filterStart > minDate)) minDate = filterStart;
      } catch (e) {
        console.error('Error parsing startDate:', e);
      }
    }
    if (endDate) {
      try {
        const filterEnd = parseISO(endDate);
        if (!isNaN(filterEnd.getTime()) && (!maxDate || filterEnd < maxDate)) maxDate = filterEnd;
      } catch (e) {
        console.error('Error parsing endDate:', e);
      }
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

    payrollData.employees.forEach((employee) => {
      const employeeNormalizedName = normalizeEmployeeName(employee.employee_name); // Get normalized name for filtering
      let employeeShifts = shifts.filter((s) => {// Using the already deduplicated 'shifts'
        if (normalizeEmployeeName(s.employee_name) !== employeeNormalizedName) return false; // Filter by normalized name

        // Apply store filter
        if (selectedStore !== 'all' && s.store_id !== selectedStore) return false;

        // Apply date filter
        if (startDate || endDate) {
          if (!s.shift_date) return false;
          try {
            const shiftDate = parseISO(s.shift_date);
            if (isNaN(shiftDate.getTime())) return false;
            const start = startDate ? parseISO(startDate + 'T00:00:00') : null;
            const end = endDate ? parseISO(endDate + 'T23:59:59') : null;

            if (start && end) {
              return isWithinInterval(shiftDate, { start, end });
            } else if (start) {
              return shiftDate >= start;
            } else if (end) {
              return shiftDate <= end;
            }
          } catch (e) {
            return false;
          }
        }

        return true;
      });

      if (!employeeWeeklyData[employee.employee_name]) {
        employeeWeeklyData[employee.employee_name] = {};
      }

      // Group shifts by week
      employeeShifts.forEach((shift) => {
        if (!shift.shift_date) return;
        try {
          const shiftDate = parseISO(shift.shift_date);
          if (isNaN(shiftDate.getTime())) return;
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
        } catch (e) {
          console.error('Error processing shift for weekly data:', e);
        }
      });

      // Process ritardi for each week
      Object.keys(employeeWeeklyData[employee.employee_name]).forEach((weekKey) => {
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
        const overtimeMinutes = weekData.shift_types['Straordinario'] || 0;
        weekData.total_minutes_excluding_overtime = weekData.total_minutes - overtimeMinutes;

        // Convert store names set to string
        weekData.store_names_display = Array.from(weekData.store_names).sort().join(', ');
      });
    });

    // Write CSV header
    csv += 'Settimana,Dipendente,Locali,';
    shiftTypesArray.forEach((type) => {
      csv += `"${type}",`;
    });
    csv += 'Totale Ore,Totale Ore (Esclusi Straordinari)\n';

    // Collect all rows for sorting
    const allRows = [];
    weeks.forEach((weekStartInPeriod) => {// Iterate over all weeks in the determined period
      const weekKey = format(weekStartInPeriod, 'yyyy-MM-dd');
      payrollData.employees.forEach((employee) => {// For each employee
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
              shift_types: Object.fromEntries(shiftTypesArray.map((type) => [type, 0])), // All types with 0 minutes
              total_minutes: 0,
              total_minutes_excluding_overtime: 0
            }
          });
        }
      });
    });

    // Sort by week (most recent first), then by employee name
    allRows.sort((a, b) => {
      try {
        const weekCompare = new Date(b.weekKey) - new Date(a.weekKey);
        if (weekCompare !== 0) return weekCompare;
      } catch (e) {


        // Ignore week comparison error
      }return a.employeeName.localeCompare(b.employeeName);});

    // Write data rows
    allRows.forEach((row) => {
      const { employeeName, weekData } = row;
      let weekLabel;
      try {
        weekLabel = `${format(weekData.weekStart, 'dd/MM/yyyy')} - ${format(weekData.weekEnd, 'dd/MM/yyyy')}`;
      } catch (e) {
        weekLabel = 'Data non valida';
      }

      csv += `"${weekLabel}","${employeeName}","${weekData.store_names_display}",`;

      shiftTypesArray.forEach((type) => {
        const minutes = weekData.shift_types[type] || 0;
        csv += `"${minutesToHours(minutes)}",`;
      });

      csv += `"${minutesToHours(weekData.total_minutes)}",`;
      csv += `"${minutesToHours(weekData.total_minutes_excluding_overtime)}"\n`;
    });

    // Summary row
    csv += '\nRIEPILOGO TOTALE,,';
    shiftTypesArray.forEach((type) => {
      const totalMinutes = allRows.reduce((sum, row) => sum + (row.weekData.shift_types[type] || 0), 0);
      csv += `"${minutesToHours(totalMinutes)}",`;
    });
    const grandTotal = allRows.reduce((sum, row) => sum + row.weekData.total_minutes, 0);
    const grandTotalExcludingOvertime = allRows.reduce((sum, row) => sum + (row.weekData.total_minutes_excluding_overtime || 0), 0);
    csv += `"${minutesToHours(grandTotal)}",`;
    csv += `"${minutesToHours(grandTotalExcludingOvertime)}"\n`;

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
      </div>);

  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-slate-50 mb-2 text-3xl font-bold">Payroll</h1>
        <p className="text-slate-50">Dettaglio ore lavorate per dipendente per tipo di turno</p>
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
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none">

              <option value="all">Tutti i Locali</option>
              {stores.map((store) =>
              <option key={store.id} value={store.id}>{store.name}</option>
              )}
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
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none" />

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
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none" />

          </div>
        </div>

        {(startDate || endDate) &&
        <div className="mt-4 pt-4 border-t border-[#c1c1c1]">
            <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#9b9b9b] hover:text-[#6b6b6b] transition-colors">

              Cancella Filtro Date
            </button>
          </div>
        }
      </NeumorphicCard>

      {/* Summary Stats - UPDATED */}
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
            {minutesToHours(payrollData.totalMinutesExcludingOvertime)}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Ore Totali (Esclusi Straordinari)</p>
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
            {minutesToHours(payrollData.totalMinutesExcludingOvertime - payrollData.totalRitardoMinutes)}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Ore Nette (Esclusi Straordinari)</p>
        </NeumorphicCard>
      </div>

      {/* Payroll Table - UPDATED */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#6b6b6b]">Dettaglio Ore per Dipendente</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm text-[#9b9b9b]">
              {startDate && endDate ?
              <span>
                  Periodo: {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
                </span> :
              startDate ?
              <span>Da: {format(parseISO(startDate), 'dd/MM/yyyy')}</span> :
              endDate ?
              <span>Fino a: {format(parseISO(endDate), 'dd/MM/yyyy')}</span> :

              <span>Tutti i turni</span>
              }
            </div>
            <button
              onClick={exportWeeklyReport}
              className="neumorphic-flat px-4 py-2 rounded-lg flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
              title="Scarica report settimanale di tutti i dipendenti">

              <CalendarRange className="w-4 h-4" />
              Report Settimanale
            </button>
            <button
              onClick={exportAllEmployeesDailyCSV}
              className="neumorphic-flat px-4 py-2 rounded-lg flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors"
              title="Scarica report giornaliero di tutti i dipendenti">

              <FileText className="w-4 h-4" />
              Report Giornaliero
            </button>
            <button
              onClick={exportToCSV}
              className="neumorphic-flat px-4 py-2 rounded-lg flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors">

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
                {payrollData.shiftTypes.map((type) =>
                <th
                  key={type}
                  className={`text-center p-3 font-medium ${
                  type === 'Assenza non retribuita' ? 'text-red-600' : 'text-[#9b9b9b]'}`
                  }>

                    {type}
                  </th>
                )}
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Totale Ore</th>
                <th className="text-right p-3 text-purple-600 font-medium">Totale Ore<br />(Esclusi Straordinari)</th>
                <th className="text-right p-3 text-green-600 font-medium">Ore Nette</th>
                <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.employees.length > 0 ?
              payrollData.employees.map((employee, index) => {
                const netMinutes = employee.total_minutes - employee.total_ritardo_minutes;
                const netMinutesExcludingOvertime = employee.total_minutes_excluding_overtime - employee.total_ritardo_minutes;
                return (
                  <tr
                    key={employee.normalized_name || index} // Use normalized_name for key
                    className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">

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
                      {payrollData.shiftTypes.map((type) => {
                      const isClickable = employee.shift_types[type] && employee.shift_types[type] > 0;
                      const isAssenza = type === 'Assenza non retribuita';

                      return (
                        <td
                          key={type}
                          className={`p-3 text-center ${
                          isAssenza ?
                          'text-red-600 font-bold' :
                          'text-[#6b6b6b]'} ${
                          isClickable ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                          onClick={isClickable ? () => {
                            if (isAssenza) {
                              handleUnpaidAbsenceClick(employee);
                            } else {
                              handleShiftTypeClick(employee, type);
                            }
                          } : undefined}
                          title={isClickable ? 'Click per vedere i dettagli' : ''}>

                            {employee.shift_types[type] ?
                          <div className="font-bold">
                                {minutesToHours(employee.shift_types[type])}
                              </div> :

                          <span className="text-[#9b9b9b]">-</span>
                          }
                          </td>);

                    })}
                      <td className="p-3 text-right">
                        <div className="font-bold text-[#6b6b6b]">
                          {minutesToHours(employee.total_minutes)}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-purple-600">
                          {minutesToHours(employee.total_minutes_excluding_overtime)}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-green-600">
                          {minutesToHours(netMinutesExcludingOvertime)}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                        onClick={() => setSelectedEmployee(employee)}
                        className="neumorphic-flat px-3 py-2 rounded-lg flex items-center gap-1 text-[#6b6b6b] hover:text-[#8b7355] transition-colors mx-auto">

                          <span className="text-sm">Dettaglio</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>);

              }) :

              <tr>
                  <td colSpan={payrollData.shiftTypes.length + 6} className="p-8 text-center text-[#9b9b9b]">
                    Nessun turno trovato per i filtri selezionati
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#8b7355] font-bold bg-[#e8ecf3]">
                <td className="p-3 text-[#6b6b6b] sticky left-0 bg-[#e8ecf3]">TOTALE</td>
                <td className="p-3"></td>
                {payrollData.shiftTypes.map((type) => {
                  const totalForType = payrollData.employees.reduce(
                    (sum, emp) => sum + (emp.shift_types[type] || 0),
                    0
                  );
                  return (
                    <td
                      key={type}
                      className={`p-3 text-center ${
                      type === 'Assenza non retribuita' ? 'text-red-600' : 'text-[#6b6b6b]'}`
                      }>

                      {totalForType > 0 &&
                      <div>{minutesToHours(totalForType)}</div>
                      }
                    </td>);

                })}
                <td className="p-3 text-right text-[#6b6b6b]">
                  <div>{minutesToHours(payrollData.totalMinutes)}</div>
                </td>
                <td className="p-3 text-right text-purple-600">
                  <div>{minutesToHours(payrollData.totalMinutesExcludingOvertime)}</div>
                </td>
                <td className="p-3 text-right text-green-600">
                  <div>
                    {minutesToHours(payrollData.totalMinutesExcludingOvertime - payrollData.totalRitardoMinutes)}
                  </div>
                </td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </NeumorphicCard>

      {/* Employee Daily/Weekly Breakdown Modal */}
      {selectedEmployee &&
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#6b6b6b] mb-1">
                  {selectedEmployee.employee_name} - Dettaglio {viewMode === 'daily' ? 'Giornaliero' : 'Settimanale'}
                </h2>
                <p className="text-[#9b9b9b]">
                  {startDate && endDate ?
                <span>
                      Periodo: {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
                    </span> :
                startDate ?
                <span>Da: {format(parseISO(startDate), 'dd/MM/yyyy')}</span> :
                endDate ?
                <span>Fino a: {format(parseISO(endDate), 'dd/MM/yyyy')}</span> :

                <span>Tutti i turni</span>
                }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="neumorphic-pressed rounded-lg p-1 flex gap-1">
                  <button
                  onClick={() => setViewMode('daily')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'daily' ?
                  'neumorphic-flat text-[#6b6b6b]' :
                  'text-[#9b9b9b] hover:text-[#6b6b6b]'}`
                  }>

                    Giornaliero
                  </button>
                  <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'weekly' ?
                  'neumorphic-flat text-[#6b6b6b]' :
                  'text-[#9b9b9b] hover:text-[#6b6b6b]'}`
                  }>

                    Settimanale
                  </button>
                </div>
                
                <button
                onClick={exportEmployeeDailyCSV}
                className="neumorphic-flat px-4 py-2 rounded-lg flex items-center gap-2 text-[#6b6b6b] hover:text-[#8b7355] transition-colors">

                  <Download className="w-4 h-4" />
                  Scarica CSV
                </button>
                <button
                onClick={() => setSelectedEmployee(null)}
                className="neumorphic-flat p-2 rounded-lg text-[#6b6b6b] hover:text-red-600 transition-colors">

                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary Cards - UPDATED */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">
                  {viewMode === 'daily' ? 'Giorni Lavorati' : 'Settimane Lavorate'}
                </p>
                <p className="text-2xl font-bold text-[#6b6b6b]">
                  {viewMode === 'daily' ? employeeDailyBreakdown.days.length : employeeDailyBreakdown.weeks.length}
                </p>
              </div>
              <NeumorphicCard className="p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Ore Totali (Esclusi Straordinari)</p>
                <p className="text-xl font-bold text-[#6b6b6b]">
                  {minutesToHours(selectedEmployee.total_minutes_excluding_overtime)}
                </p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Ore Ritardo</p>
                <p className="text-xl font-bold text-red-600">
                  {minutesToHours(selectedEmployee.total_ritardo_minutes)}
                </p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Ore Nette (Esclusi Straordinari)</p>
                <p className="text-xl font-bold text-green-600">
                  {minutesToHours(selectedEmployee.total_minutes_excluding_overtime - selectedEmployee.total_ritardo_minutes)}
                </p>
              </NeumorphicCard>
            </div>

            {/* Daily/Weekly Breakdown Table - UPDATED */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium sticky left-0 bg-[#e0e5ec]">
                      {viewMode === 'daily' ? 'Data' : 'Settimana'}
                    </th>
                    {employeeDailyBreakdown.shiftTypes.map((type) =>
                  <th
                    key={type}
                    className={`text-center p-3 font-medium ${
                    type === 'Assenza non retribuita' ? 'text-red-600' : 'text-[#9b9b9b]'}`
                    }>

                        {type}
                      </th>
                  )}
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Totale Ore</th>
                    <th className="text-right p-3 text-purple-600 font-medium">Totale Ore<br />(Esclusi Straordinari)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewMode === 'daily' ?
                employeeDailyBreakdown.days.length > 0 ?
                employeeDailyBreakdown.days.map((day, index) =>
                <tr
                  key={index}
                  className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">

                          <td className="p-3 sticky left-0 bg-[#e0e5ec] font-medium text-[#6b6b6b]">
                           {(() => {
                      try {
                        return format(parseISO(day.date), 'dd/MM/yyyy');
                      } catch (e) {
                        return day.date;
                      }
                    })()}
                          </td>
                          {employeeDailyBreakdown.shiftTypes.map((type) =>
                  <td
                    key={type}
                    className={`p-3 text-center ${
                    type === 'Assenza non retribuita' ? 'text-red-600 font-bold' : 'text-[#6b6b6b]'}`
                    }>

                              {day.shift_types[type] ?
                    <div className="font-bold">
                                  {minutesToHours(day.shift_types[type])}
                                </div> :

                    <span className="text-[#9b9b9b]">-</span>
                    }
                            </td>
                  )}
                          <td className="p-3 text-right">
                            <div className="font-bold text-[#6b6b6b]">
                              {minutesToHours(day.total_minutes)}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-bold text-purple-600">
                              {minutesToHours(day.total_minutes - (day.shift_types['Straordinario'] || 0))}
                            </div>
                          </td>
                        </tr>
                ) :

                <tr>
                        <td colSpan={employeeDailyBreakdown.shiftTypes.length + 3} className="p-8 text-center text-[#9b9b9b]">
                          Nessun turno trovato per questo dipendente nel periodo selezionato
                        </td>
                      </tr> :


                // Weekly view
                employeeDailyBreakdown.weeks.length > 0 ?
                employeeDailyBreakdown.weeks.map((week, index) =>
                <tr
                  key={index}
                  className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">

                          <td className="p-3 sticky left-0 bg-[#e0e5ec] font-medium text-[#6b6b6b]">
                            <div>
                              <div className="text-sm">
                                {(() => {
                          try {
                            return `Settimana ${format(week.weekStart, 'dd/MM', { locale: it })} - ${format(week.weekEnd, 'dd/MM/yyyy', { locale: it })}`;
                          } catch (e) {
                            return 'Settimana non valida';
                          }
                        })()}
                              </div>
                            </div>
                          </td>
                          {employeeDailyBreakdown.shiftTypes.map((type) =>
                  <td
                    key={type}
                    className={`p-3 text-center ${
                    type === 'Assenza non retribuita' ? 'text-red-600 font-bold' : 'text-[#6b6b6b]'}`
                    }>

                              {week.shift_types[type] ?
                    <div className="font-bold">
                                  {minutesToHours(week.shift_types[type])}
                                </div> :

                    <span className="text-[#9b9b9b]">-</span>
                    }
                            </td>
                  )}
                          <td className="p-3 text-right">
                            <div className="font-bold text-[#6b6b6b]">
                              {minutesToHours(week.total_minutes)}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-bold text-purple-600">
                              {minutesToHours(week.total_minutes - (week.shift_types['Straordinario'] || 0))}
                            </div>
                          </td>
                        </tr>
                ) :

                <tr>
                        <td colSpan={employeeDailyBreakdown.shiftTypes.length + 3} className="p-8 text-center text-[#9b9b9b]">
                          Nessun turno trovato per questo dipendente nel periodo selezionato
                        </td>
                      </tr>

                }
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
        </div>
      }

      {/* ✅ NEW: Unpaid Absence Detail Modal */}
      {showUnpaidAbsenceModal && unpaidAbsenceDetails &&
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#6b6b6b] mb-1">
                  Dettaglio Assenze Non Retribuite
                </h2>
                <p className="text-[#9b9b9b] mb-1">{unpaidAbsenceDetails.employee.employee_name}</p>
                <p className="text-sm text-[#9b9b9b]">
                  {startDate && endDate ?
                <span>
                      Periodo: {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
                    </span> :
                startDate ?
                <span>Da: {format(parseISO(startDate), 'dd/MM/yyyy')}</span> :
                endDate ?
                <span>Fino a: {format(parseISO(endDate), 'dd/MM/yyyy')}</span> :

                <span>Tutti i turni</span>
                }
                </p>
              </div>
              <button
              onClick={() => setShowUnpaidAbsenceModal(false)}
              className="neumorphic-flat p-2 rounded-lg text-[#6b6b6b] hover:text-red-600 transition-colors">

                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="neumorphic-pressed p-6 rounded-xl mb-6 text-center">
              <p className="text-sm text-[#9b9b9b] mb-2">Totale Ore Non Retribuite</p>
              <p className="text-4xl font-bold text-red-600">
                {minutesToHours(unpaidAbsenceDetails.totalMinutes)}
              </p>
              <p className="text-sm text-[#9b9b9b] mt-2">
                {unpaidAbsenceDetails.shifts.length} voci di assenza
              </p>
            </div>

            {/* Shifts List */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Dettaglio Voci</h3>
              
              {unpaidAbsenceDetails.shifts.length > 0 ?
            unpaidAbsenceDetails.shifts.map((shift, index) =>
            <div key={`${shift.id}-${index}`} className="neumorphic-flat p-4 rounded-xl hover:bg-[#e8ecf3] transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-bold text-[#6b6b6b]">
                            {(() => {
                        try {
                          return format(parseISO(shift.shift_date), 'dd/MM/yyyy');
                        } catch (e) {
                          return shift.shift_date;
                        }
                      })()}
                          </span>
                          <span className="text-sm text-[#9b9b9b]">
                            {shift.store_name}
                          </span>
                        </div>
                        
                        <div className="neumorphic-pressed px-3 py-1 rounded-lg inline-flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-bold text-red-600">
                            {shift.unpaid_reason}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          {minutesToHours(shift.unpaid_minutes)}
                        </p>
                        <p className="text-xs text-[#9b9b9b]">non retribuite</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#d1d1d1]">
                      <div>
                        <p className="text-xs text-[#9b9b9b] mb-1">Orario Previsto</p>
                        <p className="text-sm text-[#6b6b6b] font-medium">
                          {(() => {
                      try {
                        return shift.scheduled_start ? format(parseISO(shift.scheduled_start), 'HH:mm') : 'N/A';
                      } catch (e) {
                        return 'N/A';
                      }
                    })()}
                          {' - '}
                          {(() => {
                      try {
                        return shift.scheduled_end ? format(parseISO(shift.scheduled_end), 'HH:mm') : 'N/A';
                      } catch (e) {
                        return 'N/A';
                      }
                    })()}
                        </p>
                      </div>
                      
                      {shift.actual_start &&
                <div>
                          <p className="text-xs text-[#9b9b9b] mb-1">Orario Effettivo</p>
                          <p className="text-sm text-[#6b6b6b] font-medium">
                            {(() => {
                      try {
                        return format(parseISO(shift.actual_start), 'HH:mm');
                      } catch (e) {
                        return 'N/A';
                      }
                    })()}
                            {shift.actual_end ? (() => {
                      try {
                        return ` - ${format(parseISO(shift.actual_end), 'HH:mm')}`;
                      } catch (e) {
                        return '';
                      }
                    })() : ''}
                          </p>
                        </div>
                }
                      
                      <div>
                        <p className="text-xs text-[#9b9b9b] mb-1">Tipo Turno Originale</p>
                        <p className="text-sm text-[#6b6b6b] font-medium">
                          {shift.shift_type || 'Turno normale'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-[#9b9b9b] mb-1">Minuti Previsti</p>
                        <p className="text-sm text-[#6b6b6b] font-medium">
                          {shift.scheduled_minutes || 0} min
                        </p>
                      </div>
                    </div>

                    {shift.minuti_di_ritardo > 0 && shift.unpaid_reason !== 'Turno di tipo Ritardo' &&
              // Only show this specific 'ritardo' if it's not already covered by 'Turno di tipo Ritardo' reason.
              // If the originalType check above is distinct from minuti_di_ritardo check, this conditional isn't strictly needed for correct data, but for clarity.
              // For this implementation, keeping the outline's logic. This means if a shift is type 'Ritardo' AND has minuti_di_ritardo, it will appear twice for its total,
              // and this additional section will only be for the 'minuti_di_ritardo' component, not the full shift.
              <div className="mt-3 pt-3 border-t border-[#d1d1d1]">
                        <div className="flex items-center gap-2 text-red-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-bold">
                            Ritardo effettivo sul timbro: {shift.minuti_di_ritardo} minuti
                          </span>
                        </div>
                      </div>
              }

                    <div className="mt-3 pt-3 border-t border-[#d1d1d1] text-xs text-[#9b9b9b]">
                      ID Turno: {shift.id} • Creato: {(() => {
                  try {
                    return shift.created_date ? format(parseISO(shift.created_date), 'dd/MM/yyyy HH:mm') : 'N/A';
                  } catch (e) {
                    return 'N/A';
                  }
                })()}
                    </div>
                  </div>
            ) :

            <div className="text-center py-8">
                  <p className="text-[#9b9b9b]">Nessuna assenza non retribuita nel periodo selezionato</p>
                </div>
            }
            </div>

            <div className="mt-6 pt-6 border-t border-[#c1c1c1]">
              <button
              onClick={() => setShowUnpaidAbsenceModal(false)}
              className="neumorphic-flat px-6 py-3 rounded-lg text-[#6b6b6b] hover:text-[#8b7355] transition-colors mx-auto block">

                Chiudi
              </button>
            </div>
          </NeumorphicCard>
        </div>
      }

      {/* Shift Type Detail Modal */}
      {showDetailModal &&
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#6b6b6b] mb-1">
                  Dettaglio {showDetailModal.shiftType}
                </h2>
                <p className="text-[#9b9b9b] mb-1">{showDetailModal.employee.employee_name}</p>
                <p className="text-sm text-[#9b9b9b]">
                  {startDate && endDate ?
                <span>
                      Periodo: {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
                    </span> :
                startDate ?
                <span>Da: {format(parseISO(startDate), 'dd/MM/yyyy')}</span> :
                endDate ?
                <span>Fino a: {format(parseISO(endDate), 'dd/MM/yyyy')}</span> :

                <span>Tutti i turni</span>
                }
                </p>
              </div>
              <button
              onClick={() => setShowDetailModal(null)}
              className="neumorphic-flat p-2 rounded-lg text-[#6b6b6b] hover:text-red-600 transition-colors">

                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="neumorphic-pressed p-6 rounded-xl mb-6 text-center">
              <p className="text-sm text-[#9b9b9b] mb-2">Totale Ore {showDetailModal.shiftType}</p>
              <p className="text-4xl font-bold text-[#6b6b6b]">
                {minutesToHours(showDetailModal.totalMinutes)}
              </p>
              <p className="text-sm text-[#9b9b9b] mt-2">
                {showDetailModal.shifts.length} turni
              </p>
            </div>

            {/* Shifts List */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Dettaglio Turni</h3>
              
              {showDetailModal.shifts.length > 0 ?
            showDetailModal.shifts.map((shift, index) =>
            <div key={`${shift.id}-${index}`} className="neumorphic-flat p-4 rounded-xl hover:bg-[#e8ecf3] transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-bold text-[#6b6b6b]">
                            {(() => {
                        try {
                          return format(parseISO(shift.shift_date), 'dd/MM/yyyy');
                        } catch (e) {
                          return shift.shift_date;
                        }
                      })()}
                          </span>
                          <span className="text-sm text-[#9b9b9b]">
                            {shift.store_name}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#6b6b6b]">
                          {minutesToHours(shift.scheduled_minutes || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#d1d1d1]">
                      <div>
                        <p className="text-xs text-[#9b9b9b] mb-1">Orario Previsto</p>
                        <p className="text-sm text-[#6b6b6b] font-medium">
                          {(() => {
                      try {
                        return shift.scheduled_start ? format(parseISO(shift.scheduled_start), 'HH:mm') : 'N/A';
                      } catch (e) {
                        return 'N/A';
                      }
                    })()}
                          {' - '}
                          {(() => {
                      try {
                        return shift.scheduled_end ? format(parseISO(shift.scheduled_end), 'HH:mm') : 'N/A';
                      } catch (e) {
                        return 'N/A';
                      }
                    })()}
                        </p>
                      </div>
                      
                      {shift.actual_start &&
                <div>
                          <p className="text-xs text-[#9b9b9b] mb-1">Orario Effettivo</p>
                          <p className="text-sm text-[#6b6b6b] font-medium">
                            {(() => {
                      try {
                        return format(parseISO(shift.actual_start), 'HH:mm');
                      } catch (e) {
                        return 'N/A';
                      }
                    })()}
                            {shift.actual_end ? (() => {
                      try {
                        return ` - ${format(parseISO(shift.actual_end), 'HH:mm')}`;
                      } catch (e) {
                        return '';
                      }
                    })() : ''}
                          </p>
                        </div>
                }
                    </div>
                  </div>
            ) :

            <div className="text-center py-8">
                  <p className="text-[#9b9b9b]">Nessun turno trovato</p>
                </div>
            }
            </div>

            <div className="mt-6 pt-6 border-t border-[#c1c1c1]">
              <button
              onClick={() => setShowDetailModal(null)}
              className="neumorphic-flat px-6 py-3 rounded-lg text-[#6b6b6b] hover:text-[#8b7355] transition-colors mx-auto block">

                Chiudi
              </button>
            </div>
          </NeumorphicCard>
        </div>
      }

      {/* Info Card */}
      <NeumorphicCard className="p-6 bg-blue-50 border-2 border-blue-300">
        <div className="text-sm text-blue-800 space-y-2">
          <p className="font-bold">ℹ️ Note:</p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Turno normale</strong>: include tutti i turni senza tipo specifico e i turni di tipo "Affiancamento"</li>
            <li>• <strong>Assenza non retribuita</strong>: include i minuti di ritardo, i turni di tipo "Ritardo" e "Malattia (No Certificato)"</li>
            <li>• <strong>Ritardo</strong>: i minuti di ritardo sono sottratti dai turni normali e sommati alla categoria 'Assenza non retribuita'</li>
            <li>• <strong>Ore Totali (Esclusi Straordinari)</strong>: Ore totali meno i turni di tipo "Straordinario"</li>
            <li>• <strong>Ore Nette (Esclusi Straordinari)</strong>: Ore totali (esclusi straordinari) meno le ore di ritardo</li>
            <li>• Le ore sono mostrate in formato ore e minuti (es. 8h 30m)</li>
            <li>• I turni duplicati vengono automaticamente filtrati</li>
          </ul>
        </div>
      </NeumorphicCard>
    </div>);

}