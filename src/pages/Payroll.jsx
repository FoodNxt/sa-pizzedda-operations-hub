import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clock, Calendar, Users, Filter, Download, DollarSign } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { parseISO, isWithinInterval, format } from 'date-fns';

export default function Payroll() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

      // Calculate worked minutes (use scheduled if actual not available)
      let workedMinutes = 0;
      if (shift.actual_minutes) {
        workedMinutes = shift.actual_minutes;
      } else if (shift.scheduled_minutes) {
        workedMinutes = shift.scheduled_minutes;
      }

      // Get shift type (null becomes "Turno normale")
      const shiftType = shift.shift_type || 'Turno normale';
      
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

    // Process each employee: subtract ritardi from "Turno normale" and create "Ritardo" entry
    Object.keys(employeeData).forEach(empName => {
      const emp = employeeData[empName];
      
      if (emp.total_ritardo_minutes > 0) {
        // Subtract ritardi from "Turno normale"
        if (emp.shift_types['Turno normale']) {
          emp.shift_types['Turno normale'] -= emp.total_ritardo_minutes;
          // Ensure it doesn't go negative
          if (emp.shift_types['Turno normale'] < 0) {
            emp.shift_types['Turno normale'] = 0;
          }
        }
        
        // Add "Ritardo" as a separate shift type
        emp.shift_types['Ritardo'] = emp.total_ritardo_minutes;
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

  const minutesToHours = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const minutesToDecimal = (minutes) => {
    return (minutes / 60).toFixed(2);
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
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">
            {minutesToDecimal(payrollData.totalMinutes)}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Ore Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">
            {minutesToDecimal(payrollData.totalRitardoMinutes)}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Ore Ritardo Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">
            {minutesToDecimal(payrollData.totalMinutes - payrollData.totalRitardoMinutes)}
          </h3>
          <p className="text-sm text-[#9b9b9b]">Ore Nette</p>
        </NeumorphicCard>
      </div>

      {/* Payroll Table */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#6b6b6b]">Dettaglio Ore per Dipendente</h2>
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
                      type === 'Ritardo' ? 'text-red-600' : 'text-[#9b9b9b]'
                    }`}
                  >
                    {type}
                  </th>
                ))}
                <th className="text-right p-3 text-[#9b9b9b] font-medium">Totale Ore</th>
                <th className="text-right p-3 text-green-600 font-medium">Ore Nette</th>
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
                            type === 'Ritardo' ? 'text-red-600 font-bold' : 'text-[#6b6b6b]'
                          }`}
                        >
                          {employee.shift_types[type] ? (
                            <div>
                              <div className="font-bold">
                                {minutesToDecimal(employee.shift_types[type])}h
                              </div>
                              <div className="text-xs text-[#9b9b9b]">
                                {minutesToHours(employee.shift_types[type])}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#9b9b9b]">-</span>
                          )}
                        </td>
                      ))}
                      <td className="p-3 text-right">
                        <div className="font-bold text-[#6b6b6b]">
                          {minutesToDecimal(employee.total_minutes)}h
                        </div>
                        <div className="text-xs text-[#9b9b9b]">
                          {minutesToHours(employee.total_minutes)}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-green-600">
                          {minutesToDecimal(netMinutes)}h
                        </div>
                        <div className="text-xs text-[#9b9b9b]">
                          {minutesToHours(netMinutes)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={payrollData.shiftTypes.length + 4} className="p-8 text-center text-[#9b9b9b]">
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
                        type === 'Ritardo' ? 'text-red-600' : 'text-[#6b6b6b]'
                      }`}
                    >
                      {totalForType > 0 && (
                        <div>
                          <div>{minutesToDecimal(totalForType)}h</div>
                          <div className="text-xs font-normal text-[#9b9b9b]">
                            {minutesToHours(totalForType)}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="p-3 text-right text-[#6b6b6b]">
                  <div>{minutesToDecimal(payrollData.totalMinutes)}h</div>
                  <div className="text-xs font-normal text-[#9b9b9b]">
                    {minutesToHours(payrollData.totalMinutes)}
                  </div>
                </td>
                <td className="p-3 text-right text-green-600">
                  <div>
                    {minutesToDecimal(payrollData.totalMinutes - payrollData.totalRitardoMinutes)}h
                  </div>
                  <div className="text-xs font-normal text-[#9b9b9b]">
                    {minutesToHours(payrollData.totalMinutes - payrollData.totalRitardoMinutes)}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </NeumorphicCard>

      {/* Info Card */}
      <NeumorphicCard className="p-6 bg-blue-50 border-2 border-blue-300">
        <div className="text-sm text-blue-800 space-y-2">
          <p className="font-bold">ℹ️ Note:</p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Turno normale</strong>: include tutti i turni senza tipo specifico</li>
            <li>• <strong>Ritardo</strong>: somma dei minuti di ritardo (sottratti dai turni normali)</li>
            <li>• <strong>Ore Nette</strong>: Ore totali meno ore di ritardo</li>
            <li>• Le ore sono mostrate in formato decimale (es. 8.50h = 8 ore e 30 minuti)</li>
            <li>• I turni duplicati vengono automaticamente filtrati</li>
          </ul>
        </div>
      </NeumorphicCard>
    </div>
  );
}