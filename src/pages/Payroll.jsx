
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clock, Calendar, Users, Filter, Download, DollarSign, X, ChevronRight } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isWithinInterval, format } from 'date-fns';

export default function Payroll() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date', 10000),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Deduplicate shifts
  const deduplicateShifts = (shiftsArray) => {
    const uniqueShiftsMap = new Map();

    shiftsArray.forEach(shift => {
      const normalizedDate = shift.shift_date ? new Date(shift.shift_date).toISOString().split('T')[0] : 'no-date';
      const normalizedStart = shift.scheduled_start
        ? new Date(shift.scheduled_start).toISOString().substring(11, 16)
        : 'no-start';
      const normalizedEnd = shift.scheduled_end
        ? new Date(shift.scheduled_end).toISOString().substring(11, 16)
        : 'no-end';

      const key = `${shift.employee_name}|${shift.store_id || 'no-store'}|${normalizedDate}|${normalizedStart}|${normalizedEnd}`;

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

  // Process payroll data
  const payrollData = useMemo(() => {
    // Filter by store
    let filteredShifts = shifts;
    
    if (selectedStore !== 'all') {
      filteredShifts = filteredShifts.filter(s => s.store_id === selectedStore);
    }

    // Filter by date range
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

    // Deduplicate
    filteredShifts = deduplicateShifts(filteredShifts);

    // Group by employee
    const employeeData = {};

    filteredShifts.forEach(shift => {
      const empName = shift.employee_name || 'Unknown';
      
      if (!employeeData[empName]) {
        employeeData[empName] = {
          employee_name: empName,
          store_name: shift.store_name,
          store_id: shift.store_id,
          shift_types: {},
          total_minutes: 0,
          total_ritardo_minutes: 0
        };
      }

      // ✅ USE scheduled_minutes for duration
      let workedMinutes = shift.scheduled_minutes || 0;

      // Get shift type (null becomes "Turno normale")
      let shiftType = shift.shift_type || 'Turno normale';
      
      // ✅ Merge "Ritardo" into "Assenza non retribuita"
      if (shiftType === 'Ritardo') {
        shiftType = 'Assenza non retribuita';
      }
      
      // Initialize shift type if not exists
      if (!employeeData[empName].shift_types[shiftType]) {
        employeeData[empName].shift_types[shiftType] = 0;
      }

      // Add worked minutes to shift type
      employeeData[empName].shift_types[shiftType] += workedMinutes;
      employeeData[empName].total_minutes += workedMinutes;

      // Track ritardi separately
      if (shift.minuti_di_ritardo && shift.minuti_di_ritardo > 0) {
        employeeData[empName].total_ritardo_minutes += shift.minuti_di_ritardo;
      }
    });

    // Process each employee: subtract ritardi from "Turno normale" and add to "Assenza non retribuita"
    Object.keys(employeeData).forEach(empName => {
      const emp = employeeData[empName];
      
      if (emp.total_ritardo_minutes > 0) {
        // Subtract ritardi from "Turno normale"
        if (emp.shift_types['Turno normale']) {
          emp.shift_types['Turno normale'] -= emp.total_ritardo_minutes;
          if (emp.shift_types['Turno normale'] < 0) {
            emp.shift_types['Turno normale'] = 0;
          }
        }
        
        // ✅ Add ritardi to "Assenza non retribuita" instead of separate "Ritardo" column
        if (!emp.shift_types['Assenza non retribuita']) {
          emp.shift_types['Assenza non retribuita'] = 0;
        }
        emp.shift_types['Assenza non retribuita'] += emp.total_ritardo_minutes;
      }
    });

    // Convert to array and sort by employee name
    const employeeArray = Object.values(employeeData).sort((a, b) => 
      a.employee_name.localeCompare(b.employee_name)
    );

    // Get all unique shift types
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

  // Calculate daily breakdown for selected employee
  const employeeDailyBreakdown = useMemo(() => {
    if (!selectedEmployee) return { days: [], shiftTypes: [] };

    // Filter shifts for selected employee
    let employeeShifts = shifts.filter(s => s.employee_name === selectedEmployee.employee_name);

    // Apply store filter
    if (selectedStore !== 'all') {
      employeeShifts = employeeShifts.filter(s => s.store_id === selectedStore);
    }

    // Apply date filter
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

    // Deduplicate
    employeeShifts = deduplicateShifts(employeeShifts);

    // Group by date
    const dailyData = {};
    const allShiftTypes = new Set();

    employeeShifts.forEach(shift => {
      const date = shift.shift_date;
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          shift_types: {},
          total_minutes: 0,
          ritardo_minutes: 0
        };
      }

      // ✅ USE scheduled_minutes for duration
      let workedMinutes = shift.scheduled_minutes || 0;

      let shiftType = shift.shift_type || 'Turno normale';
      
      // ✅ Merge "Ritardo" into "Assenza non retribuita"
      if (shiftType === 'Ritardo') {
        shiftType = 'Assenza non retribuita';
      }
      
      allShiftTypes.add(shiftType);

      if (!dailyData[date].shift_types[shiftType]) {
        dailyData[date].shift_types[shiftType] = 0;
      }

      dailyData[date].shift_types[shiftType] += workedMinutes;
      dailyData[date].total_minutes += workedMinutes;

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
        // ✅ Add to "Assenza non retribuita" instead of separate "Ritardo"
        if (!day.shift_types['Assenza non retribuita']) {
          day.shift_types['Assenza non retribuita'] = 0;
        }
        day.shift_types['Assenza non retribuita'] += day.ritardo_minutes;
        allShiftTypes.add('Assenza non retribuita');
      }
    });

    // Convert to array and sort by date
    const dailyArray = Object.values(dailyData).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    return {
      days: dailyArray,
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
      csv += `"${employee.employee_name}","${employee.store_name}",`;
      
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
    
    const filename = `payroll_${startDate || 'all'}_${endDate || 'all'}.csv`;
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
    csv += `Periodo: ${startDate || 'Tutti i turni'} - ${endDate || 'Tutti i turni'}\n\n`;
    csv += 'Data,';
    
    // Add shift type columns
    employeeDailyBreakdown.shiftTypes.forEach(type => {
      csv += `"${type}",`;
    });
    csv += 'Totale Ore\n';

    // Add data rows
    employeeDailyBreakdown.days.forEach(day => {
      csv += `${format(parseISO(day.date), 'dd/MM/yyyy')},`;
      
      employeeDailyBreakdown.shiftTypes.forEach(type => {
        const minutes = day.shift_types[type] || 0;
        csv += `"${minutesToHours(minutes)}",`;
      });
      
      csv += `"${minutesToHours(day.total_minutes)}"\n`;
    });

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = `payroll_${selectedEmployee.employee_name.replace(/\s+/g, '_')}_daily_${startDate || 'all'}_${endDate || 'all'}.csv`;
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
                <th className="text-left p-3 text-[#9b9b9b] font-medium">Locale</th>
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
                      <td className="p-3 text-[#6b6b6b]">{employee.store_name}</td>
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

      {/* Employee Daily Breakdown Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#6b6b6b] mb-1">
                  {selectedEmployee.employee_name} - Dettaglio Giornaliero
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
                <p className="text-sm text-[#9b9b9b] mb-1">Giorni Lavorati</p>
                <p className="text-2xl font-bold text-[#6b6b6b]">
                  {employeeDailyBreakdown.days.length}
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

            {/* Daily Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium sticky left-0 bg-[#e0e5ec]">Data</th>
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
                  {employeeDailyBreakdown.days.length > 0 ? (
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
            <li>• <strong>Turno normale</strong>: include tutti i turni senza tipo specifico</li>
            <li>• <strong>Assenza non retribuita</strong>: include i minuti di ritardo e i turni di tipo "Ritardo"</li>
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
