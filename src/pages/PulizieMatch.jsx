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

  // Get matching employees for an inspection
  const getMatchingEmployees = (inspection) => {
    if (!inspection) return [];

    const inspectionDate = parseISO(inspection.inspection_date);
    const inspectionStoreId = inspection.store_id;

    // Find shifts that ended within 2 hours before the inspection
    const matchingShifts = shifts.filter(shift => {
      if (shift.store_id !== inspectionStoreId || !shift.actual_end) return false;

      try {
        const shiftEndDate = parseISO(shift.actual_end);
        const minutesDiff = differenceInMinutes(inspectionDate, shiftEndDate);

        // Match if shift ended 0-120 minutes before inspection
        return minutesDiff >= 0 && minutesDiff <= 120;
      } catch (e) {
        return false;
      }
    });

    // Get unique employees with their shift info
    const employeeMatches = matchingShifts.map(shift => {
      const user = users.find(u => 
        (u.nome_cognome || u.full_name || u.email) === shift.employee_name
      );

      return {
        employeeName: shift.employee_name,
        userId: user?.id,
        shiftEndTime: shift.actual_end,
        minutesBeforeInspection: differenceInMinutes(
          inspectionDate, 
          parseISO(shift.actual_end)
        ),
        roles: user?.ruoli_dipendente || []
      };
    });

    return employeeMatches.sort((a, b) => a.minutesBeforeInspection - b.minutesBeforeInspection);
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

  const equipment = [
    { name: 'Forno', key: 'forno', icon: '🔥' },
    { name: 'Impastatrice', key: 'impastatrice', icon: '⚙️' },
    { name: 'Tavolo', key: 'tavolo_lavoro', icon: '📋' },
    { name: 'Frigo', key: 'frigo', icon: '❄️' },
    { name: 'Cassa', key: 'cassa', icon: '💰' },
    { name: 'Lavandino', key: 'lavandino', icon: '🚰' }
  ];

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
                                <span className="text-blue-500 ml-1">
                                  ({emp.minutesBeforeInspection}min prima)
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-lg inline-block mt-2">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Nessun dipendente trovato nelle 2h precedenti
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

                {/* Equipment Status */}
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Dettagli Attrezzature</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {equipment.map(eq => {
                      const status = selectedInspection[`${eq.key}_corrected`]
                        ? selectedInspection[`${eq.key}_corrected_status`]
                        : selectedInspection[`${eq.key}_pulizia_status`];
                      
                      const responsibleRole = responsibilities[eq.key];
                      
                      return (
                        <div key={eq.key} className={`neumorphic-pressed p-4 rounded-xl border-2 ${
                          status === 'pulito' ? 'border-green-200 bg-green-50' :
                          status === 'medio' ? 'border-yellow-200 bg-yellow-50' :
                          status === 'sporco' ? 'border-red-200 bg-red-50' :
                          'border-gray-200 bg-gray-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{eq.icon}</span>
                            {status === 'pulito' && <CheckCircle className="w-5 h-5 text-green-600" />}
                            {status === 'sporco' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                          </div>
                          <p className="text-sm font-bold text-slate-800 mb-1">{eq.name}</p>
                          <p className="text-xs text-slate-600 capitalize">{status}</p>
                          {responsibleRole && (
                            <p className="text-xs text-purple-600 mt-1">
                              👤 {responsibleRole}
                            </p>
                          )}
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
                      Assegnazione Responsabilità
                    </h2>
                    <p className="text-sm text-slate-500">
                      Assegna ogni attrezzatura/area a una tipologia di dipendente
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
                  {equipment.map(eq => (
                    <div key={eq.key} className="neumorphic-flat p-4 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{eq.icon}</span>
                        <h3 className="font-bold text-slate-800">{eq.name}</h3>
                      </div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Responsabile:
                      </label>
                      <select
                        value={responsibilities[eq.key] || ''}
                        onChange={(e) => setResponsibilities({
                          ...responsibilities,
                          [eq.key]: e.target.value
                        })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      >
                        <option value="">Nessun responsabile specifico</option>
                        {roleOptions.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {/* Cleaning Questions */}
                  <div className="neumorphic-flat p-4 rounded-xl">
                    <h3 className="font-bold text-slate-800 mb-3">Altre Domande Form</h3>
                    <div className="space-y-3">
                      {cleaningQuestions.filter(q => q.is_active).map(q => (
                        <div key={q.id} className="neumorphic-pressed p-3 rounded-lg">
                          <label className="text-sm font-medium text-slate-700 mb-2 block">
                            {q.testo_domanda}
                          </label>
                          <select
                            value={responsibilities[`question_${q.id}`] || ''}
                            onChange={(e) => setResponsibilities({
                              ...responsibilities,
                              [`question_${q.id}`]: e.target.value
                            })}
                            className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none text-sm"
                          >
                            <option value="">Nessun responsabile specifico</option>
                            {roleOptions.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
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
                    💡 Le responsabilità assegnate verranno utilizzate per identificare chi è responsabile di ogni area durante il matching delle ispezioni.
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
                Il sistema associa automaticamente le ispezioni ai dipendenti che erano in turno nelle 2 ore precedenti.
              </p>
              <p className="text-sm text-blue-700">
                Nella sezione "Assegnazione Responsabilità" puoi definire quale ruolo è responsabile di ogni attrezzatura/area.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}