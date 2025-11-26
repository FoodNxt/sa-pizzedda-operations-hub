import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Users, CheckCircle, AlertTriangle, Clock, Eye, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function ControlloStoreManager() {
  const [percentuale, setPercentuale] = useState('');
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['controllo-sm-config'],
    queryFn: () => base44.entities.ControlloSMConfig.list(),
  });

  const currentConfig = configs[0];

  const { data: inspections = [] } = useQuery({
    queryKey: ['sm-inspections'],
    queryFn: async () => {
      const allInspections = await base44.entities.CleaningInspection.list('-inspection_date');
      // Filter only inspections from Store Manager form (inspector has Store Manager role)
      return allInspections.filter(i => {
        // Check if inspector_name contains hints of SM or check ruoli
        return i.inspector_name && i.analysis_status === 'completed';
      });
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['dipendenti-users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const { data: cleaningQuestions = [] } = useQuery({
    queryKey: ['cleaning-questions-sm'],
    queryFn: async () => {
      const questions = await base44.entities.DomandaPulizia.list('ordine');
      return questions.filter(q => q.attiva !== false && q.ruoli_assegnati?.includes('Store Manager'));
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (currentConfig) {
        return base44.entities.ControlloSMConfig.update(currentConfig.id, data);
      }
      return base44.entities.ControlloSMConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controllo-sm-config'] });
      alert('Configurazione salvata!');
    },
  });

  // Get employees who were on shift from 21:30 onwards the day before the inspection
  const getAssignedEmployees = (inspection) => {
    if (!inspection) return [];

    const inspectionDate = parseISO(inspection.inspection_date);
    const previousDay = subDays(inspectionDate, 1);
    const previousDayStr = format(previousDay, 'yyyy-MM-dd');
    const inspectionStoreId = inspection.store_id;

    // Find shifts from previous day that started at or after 21:30
    const eveningShifts = shifts.filter(shift => {
      if (shift.store_id !== inspectionStoreId) return false;
      if (!shift.shift_date || !shift.scheduled_start) return false;

      const shiftDateStr = shift.shift_date.split('T')[0];
      if (shiftDateStr !== previousDayStr) return false;

      // Check if shift started at or after 21:30
      const startTime = shift.scheduled_start || shift.actual_start;
      if (!startTime) return false;

      const startDate = parseISO(startTime);
      const hours = startDate.getHours();
      const minutes = startDate.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // 21:30 = 21*60 + 30 = 1290 minutes
      return totalMinutes >= 1290;
    });

    // Get unique employees
    const employeeMap = new Map();
    eveningShifts.forEach(shift => {
      if (!employeeMap.has(shift.employee_name)) {
        const user = users.find(u => 
          (u.nome_cognome || u.full_name || u.email) === shift.employee_name
        );
        employeeMap.set(shift.employee_name, {
          employeeName: shift.employee_name,
          userId: user?.id,
          shiftStart: shift.scheduled_start,
          shiftEnd: shift.scheduled_end,
          roles: user?.ruoli_dipendente || []
        });
      }
    });

    return Array.from(employeeMap.values());
  };

  // Calculate if inspection passed based on percentage
  const calculateInspectionResult = (inspection) => {
    const threshold = currentConfig?.percentuale_superamento || 70;
    const score = inspection.overall_score || 0;
    return {
      passed: score >= threshold,
      score,
      threshold
    };
  };

  // Get unique employees from all inspections for filter
  const allAssignedEmployees = useMemo(() => {
    const employeeSet = new Set();
    inspections.forEach(inspection => {
      const employees = getAssignedEmployees(inspection);
      employees.forEach(emp => employeeSet.add(emp.employeeName));
    });
    return Array.from(employeeSet).sort();
  }, [inspections, shifts, users]);

  // Filter inspections by selected employee
  const filteredInspections = useMemo(() => {
    if (selectedEmployee === 'all') return inspections;
    
    return inspections.filter(inspection => {
      const employees = getAssignedEmployees(inspection);
      return employees.some(emp => emp.employeeName === selectedEmployee);
    });
  }, [inspections, selectedEmployee, shifts, users]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredInspections.length;
    const passed = filteredInspections.filter(i => calculateInspectionResult(i).passed).length;
    const failed = total - passed;
    const avgScore = total > 0 
      ? filteredInspections.reduce((sum, i) => sum + (i.overall_score || 0), 0) / total 
      : 0;

    return { total, passed, failed, avgScore };
  }, [filteredInspections, currentConfig]);

  return (
    <ProtectedPage pageName="ControlloStoreManager">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Controllo Store Manager
          </h1>
          <p className="text-sm text-slate-500">
            Verifica controlli pulizia Store Manager e assegnazione dipendenti turno serale (dalle 21:30)
          </p>
        </div>

        {/* Config */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Configurazione</h2>
          </div>
          
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Percentuale minima di superamento (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Es: 70"
                value={percentuale || currentConfig?.percentuale_superamento || ''}
                onChange={(e) => setPercentuale(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
              />
            </div>
            <NeumorphicButton
              onClick={() => saveConfigMutation.mutate({ percentuale_superamento: parseInt(percentuale) || 70 })}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Salva
            </NeumorphicButton>
          </div>
          
          {currentConfig && (
            <p className="text-sm text-blue-600 mt-3">
              Configurazione attuale: {currentConfig.percentuale_superamento}%
            </p>
          )}
        </NeumorphicCard>

        {/* Filter by Employee */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-slate-800">Storico per Dipendente</h2>
          </div>
          
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
          >
            <option value="all">Tutti i dipendenti</option>
            {allAssignedEmployees.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        </NeumorphicCard>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-500">Controlli Totali</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
            <p className="text-xs text-slate-500">Superati</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-slate-500">Non Superati</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.avgScore.toFixed(1)}%</p>
            <p className="text-xs text-slate-500">Media Punteggio</p>
          </NeumorphicCard>
        </div>

        {/* Inspections List */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Controlli Store Manager</h2>
          
          {filteredInspections.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessun controllo trovato</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInspections.slice(0, 50).map(inspection => {
                const result = calculateInspectionResult(inspection);
                const assignedEmployees = getAssignedEmployees(inspection);
                
                return (
                  <div key={inspection.id} className={`neumorphic-pressed p-4 rounded-xl border-2 ${
                    result.passed ? 'border-green-200' : 'border-red-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-800">{inspection.store_name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            result.passed 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {result.score}% {result.passed ? '✓' : '✗'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(parseISO(inspection.inspection_date), 'dd MMM yyyy HH:mm', { locale: it })}
                          </span>
                          {inspection.inspector_name && (
                            <span>Compilato da: {inspection.inspector_name}</span>
                          )}
                        </div>

                        {/* Assigned Employees */}
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">Dipendenti assegnati (turno sera precedente):</p>
                          {assignedEmployees.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {assignedEmployees.map((emp, idx) => (
                                <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200">
                                  {emp.employeeName}
                                  {emp.roles.length > 0 && ` (${emp.roles.join(', ')})`}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-orange-600">
                              <AlertTriangle className="w-3 h-3 inline mr-1" />
                              Nessun dipendente in turno dalle 21:30 il giorno precedente
                            </span>
                          )}
                        </div>
                      </div>

                      <NeumorphicButton
                        onClick={() => setSelectedInspection(inspection)}
                        className="ml-4"
                      >
                        <Eye className="w-4 h-4" />
                      </NeumorphicButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </NeumorphicCard>

        {/* Info Card */}
        <NeumorphicCard className="p-6 bg-blue-50">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-bold text-blue-800 mb-2">Come Funziona</h3>
              <p className="text-sm text-blue-700 mb-2">
                I controlli dello Store Manager vengono assegnati ai dipendenti che erano in turno <strong>il giorno precedente dalle 21:30 in poi</strong>.
              </p>
              <p className="text-sm text-blue-700">
                Se il punteggio è inferiore alla soglia impostata, il controllo risulta non superato.
              </p>
            </div>
          </div>
        </NeumorphicCard>

        {/* Detail Modal */}
        {selectedInspection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      Dettaglio Controllo - {selectedInspection.store_name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {format(parseISO(selectedInspection.inspection_date), 'dd MMMM yyyy - HH:mm', { locale: it })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedInspection(null)}
                    className="nav-button p-2 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Result */}
                {(() => {
                  const result = calculateInspectionResult(selectedInspection);
                  return (
                    <div className={`neumorphic-pressed p-6 rounded-xl text-center mb-6 ${
                      result.passed ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <p className="text-sm text-slate-500 mb-2">Risultato</p>
                      <div className={`text-4xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {result.score}%
                      </div>
                      <p className={`text-sm mt-2 ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {result.passed ? 'SUPERATO ✓' : 'NON SUPERATO ✗'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Soglia: {result.threshold}%
                      </p>
                    </div>
                  );
                })()}

                {/* Assigned Employees */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Dipendenti Assegnati</h3>
                  {(() => {
                    const employees = getAssignedEmployees(selectedInspection);
                    return employees.length > 0 ? (
                      <div className="space-y-2">
                        {employees.map((emp, idx) => (
                          <div key={idx} className="neumorphic-flat p-4 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-800">{emp.employeeName}</p>
                                {emp.roles.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {emp.roles.map((role, ridx) => (
                                      <span key={ridx} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                        {role}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right text-sm text-slate-600">
                                <p>Turno sera precedente</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="neumorphic-pressed p-8 rounded-xl text-center">
                        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                        <p className="text-slate-600">
                          Nessun dipendente in turno dalle 21:30 il giorno precedente
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </NeumorphicCard>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}