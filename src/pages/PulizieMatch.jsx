import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Clock, CheckCircle, AlertTriangle, Save, Settings, Eye, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function PulizieMatch() {
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showResponsibilityModal, setShowResponsibilityModal] = useState(false);
  const [responsibilities, setResponsibilities] = useState({});
  // Structure: { question_id: { primary: ['Pizzaiolo', 'Cassiere'], secondary: 'Store Manager' } }

  const queryClient = useQueryClient();

  const { data: inspections = [] } = useQuery({
    queryKey: ['cleaningInspections'],
    queryFn: async () => {
      const allInspections = await base44.entities.CleaningInspection.list('-inspection_date');
      // Exclude Store Manager form inspections (they go to ControlloStoreManager page)
      // Filter by inspector_role OR inspection_type for backward compatibility
      return allInspections.filter(i => 
        i.inspector_role !== 'Store Manager' && 
        i.inspection_type !== 'store_manager'
      );
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
    queryKey: ['cleaning-questions'],
    queryFn: () => base44.entities.DomandaPulizia.list('ordine'),
  });

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.list(),
  });

  // Filter for employee history
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');

  // Get the employee whose shift ended immediately before the inspection (by roles array)
  const getMatchingEmployeeByRoles = (inspection, roles) => {
    if (!inspection || !roles || roles.length === 0) return null;

    const inspectionDate = parseISO(inspection.inspection_date);
    const inspectionStoreId = inspection.store_id;

    // Find all shifts that ended BEFORE the inspection for this store
    const eligibleShifts = shifts.filter(shift => {
      if (shift.store_id !== inspectionStoreId) return false;
      
      const shiftEnd = shift.actual_end || shift.scheduled_end;
      if (!shiftEnd) return false;

      try {
        const shiftEndDate = parseISO(shiftEnd);
        return shiftEndDate < inspectionDate;
      } catch (e) {
        return false;
      }
    });

    // Filter by any of the roles
    const roleFilteredShifts = eligibleShifts.filter(shift => {
      const user = users.find(u => 
        (u.nome_cognome || u.full_name || u.email) === shift.employee_name
      );
      return roles.some(role => user?.ruoli_dipendente?.includes(role));
    });

    // Sort by shift end time descending (most recent first)
    const sortedShifts = roleFilteredShifts.sort((a, b) => {
      const endA = parseISO(a.actual_end || a.scheduled_end);
      const endB = parseISO(b.actual_end || b.scheduled_end);
      return endB - endA;
    });

    const matchingShift = sortedShifts[0];
    if (!matchingShift) return null;

    const user = users.find(u => 
      (u.nome_cognome || u.full_name || u.email) === matchingShift.employee_name
    );

    const shiftEnd = matchingShift.actual_end || matchingShift.scheduled_end;
    const matchedRole = roles.find(role => user?.ruoli_dipendente?.includes(role));

    return {
      employeeName: matchingShift.employee_name,
      userId: user?.id,
      shiftEndTime: shiftEnd,
      minutesBeforeInspection: differenceInMinutes(inspectionDate, parseISO(shiftEnd)),
      roles: user?.ruoli_dipendente || [],
      matchedRole
    };
  };

  // Get matching employee based on attrezzatura responsibility
  const getMatchingEmployeeForAttrezzatura = (inspection, attrezzaturaName) => {
    if (!attrezzaturaName) return null;
    
    const attrezzatura = attrezzature.find(a => a.nome === attrezzaturaName);
    if (!attrezzatura || !attrezzatura.ruolo_responsabile) return null;

    return getMatchingEmployeeByRoles(inspection, [attrezzatura.ruolo_responsabile]);
  };

  // Get all matching employees for display
  const getMatchingEmployees = (inspection) => {
    if (!inspection) return [];

    const roleMatches = [];
    const seenEmployees = new Set();

    for (const role of roleOptions) {
      const match = getMatchingEmployeeByRoles(inspection, [role]);
      if (match && !seenEmployees.has(match.employeeName)) {
        roleMatches.push({ ...match, matchedRole: role });
        seenEmployees.add(match.employeeName);
      }
    }

    return roleMatches.sort((a, b) => a.minutesBeforeInspection - b.minutesBeforeInspection);
  };

  const saveResponsibilityMutation = useMutation({
    mutationFn: async (data) => {
      // Save responsibilities configuration
      // For now, store in localStorage or create a new entity
      localStorage.setItem('cleaning_responsibilities', JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-responsibilities'] });
      alert('Responsabilità salvate con successo!');
      setShowResponsibilityModal(false);
    }
  });

  // Load responsibilities from localStorage
  useMemo(() => {
    try {
      const stored = localStorage.getItem('cleaning_responsibilities');
      if (stored) {
        setResponsibilities(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading responsibilities:', e);
    }
  }, []);

  const handleSaveResponsibilities = () => {
    saveResponsibilityMutation.mutate(responsibilities);
  };

  const roleOptions = ['Pizzaiolo', 'Cassiere', 'Store Manager'];

  // Get unique employees from all inspections
  const allMatchedEmployees = useMemo(() => {
    const employeeSet = new Set();
    inspections.forEach(inspection => {
      const employees = getMatchingEmployees(inspection);
      employees.forEach(emp => employeeSet.add(emp.employeeName));
    });
    return Array.from(employeeSet).sort();
  }, [inspections, shifts, users]);

  // Filter inspections by selected employee
  const filteredInspections = useMemo(() => {
    if (selectedEmployeeFilter === 'all') return inspections;
    
    return inspections.filter(inspection => {
      const employees = getMatchingEmployees(inspection);
      return employees.some(emp => emp.employeeName === selectedEmployeeFilter);
    });
  }, [inspections, selectedEmployeeFilter, shifts, users]);

  return (
    <ProtectedPage pageName="PulizieMatch">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
              Pulizie Match
            </h1>
            <p className="text-sm text-slate-500">Assegna valutazioni pulizie ai dipendenti in base alle attrezzature</p>
          </div>
        </div>

        {/* Employee Filter */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-slate-800">Storico per Dipendente</h2>
          </div>
          <select
            value={selectedEmployeeFilter}
            onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
          >
            <option value="all">Tutti i dipendenti</option>
            {allMatchedEmployees.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        </NeumorphicCard>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NeumorphicCard className="p-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">
                {inspections.filter(i => i.analysis_status === 'completed').length}
              </h3>
              <p className="text-xs text-slate-500">Ispezioni Completate</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-1">
                {users.length}
              </h3>
              <p className="text-xs text-slate-500">Dipendenti Attivi</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-purple-600 mb-1">
                2h
              </h3>
              <p className="text-xs text-slate-500">Finestra Matching</p>
            </div>
          </NeumorphicCard>
        </div>

        {/* Inspections List */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Ispezioni Recenti</h2>
          
          <div className="space-y-3">
            {filteredInspections
              .filter(i => i.analysis_status === 'completed')
              .slice(0, 50)
              .map(inspection => {
                const matchingEmployees = getMatchingEmployees(inspection);
                
                return (
                  <div key={inspection.id} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-800">{inspection.store_name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            inspection.overall_score >= 80 ? 'bg-green-100 text-green-700' :
                            inspection.overall_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {inspection.overall_score}%
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(parseISO(inspection.inspection_date), 'dd MMM yyyy HH:mm', { locale: it })}
                          </span>
                          {inspection.inspector_name && (
                            <span>Ispettore: {inspection.inspector_name}</span>
                          )}
                        </div>

                        {matchingEmployees.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {matchingEmployees.map((emp, idx) => (
                              <div key={idx} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                                <span className="font-medium">{emp.employeeName}</span>
                                <span className="text-purple-600 ml-1">({emp.matchedRole})</span>
                                <span className="text-blue-500 ml-1">
                                  - turno finito {emp.minutesBeforeInspection}min prima
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-lg inline-block mt-2">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Nessun dipendente con turno terminato prima del form
                          </div>
                        )}
                      </div>

                      <NeumorphicButton
                        onClick={() => setSelectedInspection(inspection)}
                        className="flex items-center gap-2 ml-4"
                      >
                        <Eye className="w-4 h-4" />
                        Dettagli
                      </NeumorphicButton>
                    </div>
                  </div>
                );
              })}
          </div>
        </NeumorphicCard>

        {/* Details Modal */}
        {selectedInspection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      Match Ispezione - {selectedInspection.store_name}
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

                {/* Overall Score */}
                <div className="neumorphic-pressed p-6 rounded-xl text-center mb-6">
                  <p className="text-sm text-slate-500 mb-2">Punteggio Complessivo</p>
                  <div className={`text-4xl font-bold ${
                    selectedInspection.overall_score >= 80 ? 'text-green-600' :
                    selectedInspection.overall_score >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {selectedInspection.overall_score}%
                  </div>
                </div>

                {/* Matching Employees */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Dipendenti in Turno</h3>
                  {(() => {
                    const matches = getMatchingEmployees(selectedInspection);
                    return matches.length > 0 ? (
                      <div className="space-y-2">
                        {matches.map((emp, idx) => (
                          <div key={idx} className="neumorphic-flat p-4 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-800">{emp.employeeName}</p>
                                <p className="text-sm text-slate-600">
                                  Turno terminato: {format(parseISO(emp.shiftEndTime), 'HH:mm', { locale: it })}
                                </p>
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
                              <div className="text-right">
                                <span className="text-sm font-bold text-blue-600">
                                  {emp.minutesBeforeInspection} min
                                </span>
                                <p className="text-xs text-slate-500">prima dell'ispezione</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="neumorphic-pressed p-8 rounded-xl text-center">
                        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                        <p className="text-slate-600">
                          Nessun dipendente trovato nelle 2 ore precedenti l'ispezione
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Domande e Responsabili */}
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Domande e Responsabili Assegnati</h3>
                  <div className="space-y-2">
                    {selectedInspection.domande_risposte?.map((risposta, idx) => {
                      const matchedEmployee = risposta.attrezzatura 
                        ? getMatchingEmployeeForAttrezzatura(selectedInspection, risposta.attrezzatura)
                        : null;
                      
                      const attrezzatura = risposta.attrezzatura 
                        ? attrezzature.find(a => a.nome === risposta.attrezzatura)
                        : null;
                      
                      return (
                        <div key={idx} className="neumorphic-flat p-3 rounded-xl">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">{risposta.domanda_testo}</p>
                              {risposta.attrezzatura && (
                                <p className="text-xs text-slate-500">({risposta.attrezzatura})</p>
                              )}
                            </div>
                            <div className="text-right">
                              {attrezzatura?.ruolo_responsabile ? (
                                <div>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    {attrezzatura.ruolo_responsabile}
                                  </span>
                                  {matchedEmployee && (
                                    <p className="text-xs mt-1 text-green-600">
                                      → {matchedEmployee.employeeName}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">Non assegnato</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </NeumorphicCard>
            </div>
          </div>
        )}



        {/* Info Card */}
        <NeumorphicCard className="p-6 bg-blue-50">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-bold text-blue-800 mb-2">Come Funziona il Matching</h3>
              <p className="text-sm text-blue-700 mb-2">
                Il sistema assegna automaticamente le ispezioni al dipendente che ha terminato il turno <strong>immediatamente prima</strong> della compilazione del form.
              </p>
              <p className="text-sm text-blue-700 mb-2">
                <strong>Esempio:</strong> Se Cassiere 1 ha turno 11:00-15:00 e Cassiere 2 ha turno 15:00-22:00, quando Cassiere 2 compila il form, la responsabilità viene assegnata a Cassiere 1.
              </p>
              <p className="text-sm text-blue-700">
                Le responsabilità sono assegnate in base al <strong>ruolo responsabile</strong> definito per ogni attrezzatura nella sezione <strong>Attrezzature</strong>.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}