import { useState, useMemo } from "react";
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
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date'),
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

  // Get matching employee for a question based on primary/secondary responsibility config
  // Logic: assign to primary, EXCEPT when the last shift ended was from secondary role
  const getMatchingEmployeeForQuestion = (inspection, questionId) => {
    const config = responsibilities[`question_${questionId}`];
    if (!config || !config.primary || config.primary.length === 0) return null;

    const primaryRoles = config.primary;
    const secondaryRole = config.secondary;

    // If no secondary, just match primary
    if (!secondaryRole) {
      return getMatchingEmployeeByRoles(inspection, primaryRoles);
    }

    // Check who ended their shift last (between primary and secondary)
    const lastPrimaryEmployee = getMatchingEmployeeByRoles(inspection, primaryRoles);
    const lastSecondaryEmployee = getMatchingEmployeeByRoles(inspection, [secondaryRole]);

    // If secondary role employee ended their shift AFTER all primary roles,
    // then assign to secondary, otherwise assign to primary
    if (lastSecondaryEmployee && lastPrimaryEmployee) {
      if (lastSecondaryEmployee.minutesBeforeInspection < lastPrimaryEmployee.minutesBeforeInspection) {
        // Secondary ended more recently (less minutes before inspection)
        return { ...lastSecondaryEmployee, assignedAs: 'secondary' };
      }
    } else if (lastSecondaryEmployee && !lastPrimaryEmployee) {
      return { ...lastSecondaryEmployee, assignedAs: 'secondary' };
    }

    return lastPrimaryEmployee ? { ...lastPrimaryEmployee, assignedAs: 'primary' } : null;
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

  return (
    <ProtectedPage pageName="PulizieMatch">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
              Pulizie Match
            </h1>
            <p className="text-sm text-slate-500">Assegna valutazioni pulizie ai dipendenti</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowResponsibilityModal(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Assegnazione Responsabilità
          </NeumorphicButton>
        </div>

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
            {inspections
              .filter(i => i.analysis_status === 'completed')
              .slice(0, 20)
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
                    {cleaningQuestions.filter(q => q.attiva !== false).map(q => {
                      const config = responsibilities[`question_${q.id}`];
                      const matchedEmployee = getMatchingEmployeeForQuestion(selectedInspection, q.id);
                      
                      return (
                        <div key={q.id} className="neumorphic-flat p-3 rounded-xl">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">{q.testo_domanda}</p>
                              {q.attrezzatura && (
                                <p className="text-xs text-slate-500">({q.attrezzatura})</p>
                              )}
                            </div>
                            <div className="text-right">
                              {config?.primary?.length > 0 ? (
                                <div>
                                  <div className="flex flex-wrap gap-1 justify-end mb-1">
                                    {config.primary.map(role => (
                                      <span key={role} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        {role}
                                      </span>
                                    ))}
                                    {config.secondary && (
                                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                        +{config.secondary}
                                      </span>
                                    )}
                                  </div>
                                  {matchedEmployee && (
                                    <p className={`text-xs mt-1 ${matchedEmployee.assignedAs === 'secondary' ? 'text-orange-600' : 'text-green-600'}`}>
                                      → {matchedEmployee.employeeName} 
                                      {matchedEmployee.assignedAs === 'secondary' && ' (sec.)'}
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

        {/* Responsibility Assignment Modal */}
        {showResponsibilityModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      Assegnazione Responsabilità Domande
                    </h2>
                    <p className="text-sm text-slate-500">
                      Assegna responsabili primari e secondari per ogni domanda
                    </p>
                  </div>
                  <button
                    onClick={() => setShowResponsibilityModal(false)}
                    className="nav-button p-2 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  {cleaningQuestions.filter(q => q.attiva !== false).map(q => {
                    const config = responsibilities[`question_${q.id}`] || { primary: [], secondary: '' };
                    
                    return (
                      <div key={q.id} className="neumorphic-flat p-4 rounded-xl">
                        <div className="flex items-start gap-3 mb-4">
                          <span className="text-xl">{q.tipo_controllo === 'foto' ? '📷' : '📋'}</span>
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-800">{q.testo_domanda}</h3>
                            {q.attrezzatura && (
                              <p className="text-xs text-slate-500">Attrezzatura: {q.attrezzatura}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Primary Responsibilities (multiple selection) */}
                        <div className="mb-3">
                          <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Responsabili Primari (seleziona uno o più):
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {roleOptions.map(role => {
                              const isSelected = config.primary?.includes(role);
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => {
                                    const currentPrimary = config.primary || [];
                                    const newPrimary = isSelected
                                      ? currentPrimary.filter(r => r !== role)
                                      : [...currentPrimary, role];
                                    setResponsibilities({
                                      ...responsibilities,
                                      [`question_${q.id}`]: { ...config, primary: newPrimary }
                                    });
                                  }}
                                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                    isSelected 
                                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                                      : 'neumorphic-flat text-slate-700'
                                  }`}
                                >
                                  {role}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Secondary Responsibility (optional, single selection) */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Responsabile Secondario (opzionale):
                          </label>
                          <select
                            value={config.secondary || ''}
                            onChange={(e) => setResponsibilities({
                              ...responsibilities,
                              [`question_${q.id}`]: { ...config, secondary: e.target.value }
                            })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                          >
                            <option value="">Nessun secondario</option>
                            {roleOptions.filter(r => !config.primary?.includes(r)).map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-500 mt-1">
                            Se l'ultimo turno terminato è del secondario, la responsabilità va a lui
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {cleaningQuestions.filter(q => q.attiva !== false).length === 0 && (
                    <div className="neumorphic-pressed p-8 rounded-xl text-center">
                      <p className="text-slate-500">Nessuna domanda pulizie configurata</p>
                      <p className="text-xs text-slate-400 mt-2">Vai in Controllo Pulizie Master per aggiungere domande</p>
                    </div>
                  )}
                </div>

                <NeumorphicButton
                  onClick={handleSaveResponsibilities}
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Salva Assegnazioni
                </NeumorphicButton>

                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Logica:</strong> La responsabilità viene assegnata ai ruoli primari, TRANNE quando l'ultimo dipendente che ha terminato il turno appartiene al ruolo secondario.
                  </p>
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
                Nella sezione "Assegnazione Responsabilità" puoi definire quale ruolo è responsabile di ogni domanda del form.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}