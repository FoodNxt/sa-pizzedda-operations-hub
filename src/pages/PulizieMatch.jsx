import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Clock, CheckCircle, AlertTriangle, Save, Settings, Eye, X, Plus, Edit, Trash2 } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function PulizieMatch() {
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    nome_regola: '',
    store_id: '',
    ora_inizio_compilazione: '00:00',
    ora_fine_compilazione: '23:59',
    ruolo_target: 'Pizzaiolo',
    tipo_match: 'turno_precedente_stesso_ruolo',
    orario_turno_target_inizio: '',
    orario_turno_target_fine: '',
    attivo: true,
    ordine: 0
  });

  const queryClient = useQueryClient();

  const { data: inspections = [] } = useQuery({
    queryKey: ['cleaningInspections'],
    queryFn: async () => {
      const allInspections = await base44.entities.CleaningInspection.list('-inspection_date');
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

  const { data: matchConfigs = [] } = useQuery({
    queryKey: ['pulizie-match-configs'],
    queryFn: () => base44.entities.PulizieMatchConfig.list('ordine'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.PulizieMatchConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulizie-match-configs'] });
      setShowConfigModal(false);
      setEditingRule(null);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PulizieMatchConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulizie-match-configs'] });
      setShowConfigModal(false);
      setEditingRule(null);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.PulizieMatchConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulizie-match-configs'] });
    },
  });

  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');

  // Get matching employees based on configured rules
  const getMatchingEmployees = (inspection) => {
    if (!inspection) return [];

    const inspectionDate = parseISO(inspection.inspection_date);
    const inspectionHour = inspectionDate.getHours();
    const inspectionMinute = inspectionDate.getMinutes();
    const inspectionTimeStr = `${String(inspectionHour).padStart(2, '0')}:${String(inspectionMinute).padStart(2, '0')}`;
    const inspectionStoreId = inspection.store_id;

    // Find applicable rule
    const applicableRule = matchConfigs
      .filter(rule => rule.attivo !== false)
      .filter(rule => !rule.store_id || rule.store_id === inspectionStoreId)
      .find(rule => {
        if (!rule.ora_inizio_compilazione || !rule.ora_fine_compilazione) return true;
        return inspectionTimeStr >= rule.ora_inizio_compilazione && inspectionTimeStr <= rule.ora_fine_compilazione;
      });

    // Fallback to default logic
    if (!applicableRule) {
      return getDefaultMatching(inspection);
    }

    const previousDay = subDays(inspectionDate, 1);
    const previousDayStr = format(previousDay, 'yyyy-MM-dd');
    const targetRole = applicableRule.ruolo_target;
    let matchedShifts = [];

    switch (applicableRule.tipo_match) {
      case 'turno_precedente_stesso_ruolo':
        matchedShifts = shifts.filter(shift => {
          if (shift.store_id !== inspectionStoreId) return false;
          const user = users.find(u => (u.nome_cognome || u.full_name || u.email) === shift.employee_name);
          if (!user?.ruoli_dipendente?.includes(targetRole)) return false;
          
          const endTime = shift.scheduled_end || shift.actual_end;
          if (!endTime) return false;
          
          try {
            return parseISO(endTime) < inspectionDate;
          } catch { return false; }
        }).sort((a, b) => {
          const aEnd = parseISO(a.scheduled_end || a.actual_end);
          const bEnd = parseISO(b.scheduled_end || b.actual_end);
          return bEnd - aEnd;
        });
        break;

      case 'ultimo_turno_giorno_prima_stesso_ruolo':
        matchedShifts = shifts.filter(shift => {
          if (shift.store_id !== inspectionStoreId) return false;
          const shiftDateStr = shift.shift_date?.split('T')[0];
          if (shiftDateStr !== previousDayStr) return false;
          const user = users.find(u => (u.nome_cognome || u.full_name || u.email) === shift.employee_name);
          return user?.ruoli_dipendente?.includes(targetRole);
        });
        break;

      case 'turno_specifico_orario':
        if (applicableRule.orario_turno_target_inizio && applicableRule.orario_turno_target_fine) {
          matchedShifts = shifts.filter(shift => {
            if (shift.store_id !== inspectionStoreId) return false;
            const shiftDateStr = shift.shift_date?.split('T')[0];
            if (shiftDateStr !== previousDayStr) return false;
            const user = users.find(u => (u.nome_cognome || u.full_name || u.email) === shift.employee_name);
            if (!user?.ruoli_dipendente?.includes(targetRole)) return false;
            const startTime = shift.scheduled_start || shift.actual_start;
            if (!startTime) return false;
            try {
              const startDate = parseISO(startTime);
              const shiftTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
              return shiftTimeStr >= applicableRule.orario_turno_target_inizio && shiftTimeStr <= applicableRule.orario_turno_target_fine;
            } catch { return false; }
          });
        }
        break;

      case 'tutti_turni_giorno_prima':
        matchedShifts = shifts.filter(shift => {
          if (shift.store_id !== inspectionStoreId) return false;
          const shiftDateStr = shift.shift_date?.split('T')[0];
          if (shiftDateStr !== previousDayStr) return false;
          const user = users.find(u => (u.nome_cognome || u.full_name || u.email) === shift.employee_name);
          return user?.ruoli_dipendente?.includes(targetRole);
        });
        break;
    }

    const employeeMap = new Map();
    matchedShifts.forEach(shift => {
      if (!employeeMap.has(shift.employee_name)) {
        const user = users.find(u => (u.nome_cognome || u.full_name || u.email) === shift.employee_name);
        const endTime = shift.scheduled_end || shift.actual_end;
        employeeMap.set(shift.employee_name, {
          employeeName: shift.employee_name,
          userId: user?.id,
          roles: user?.ruoli_dipendente || [],
          appliedRule: applicableRule.nome_regola,
          shiftEndTime: endTime,
          minutesBeforeInspection: endTime ? differenceInMinutes(inspectionDate, parseISO(endTime)) : 0
        });
      }
    });

    return Array.from(employeeMap.values());
  };

  // Default matching logic (fallback)
  const getDefaultMatching = (inspection) => {
    const inspectionDate = parseISO(inspection.inspection_date);
    const employeeMap = new Map();
    
    const eligibleShifts = shifts.filter(shift => {
      if (shift.store_id !== inspection.store_id) return false;
      const endTime = shift.scheduled_end || shift.actual_end;
      if (!endTime) return false;
      try {
        return parseISO(endTime) < inspectionDate;
      } catch { return false; }
    }).sort((a, b) => {
      const aEnd = parseISO(a.scheduled_end || a.actual_end);
      const bEnd = parseISO(b.scheduled_end || b.actual_end);
      return bEnd - aEnd;
    });

    eligibleShifts.slice(0, 5).forEach(shift => {
      if (!employeeMap.has(shift.employee_name)) {
        const user = users.find(u => (u.nome_cognome || u.full_name || u.email) === shift.employee_name);
        const endTime = shift.scheduled_end || shift.actual_end;
        employeeMap.set(shift.employee_name, {
          employeeName: shift.employee_name,
          userId: user?.id,
          roles: user?.ruoli_dipendente || [],
          appliedRule: 'Default (turno precedente)',
          shiftEndTime: endTime,
          minutesBeforeInspection: endTime ? differenceInMinutes(inspectionDate, parseISO(endTime)) : 0
        });
      }
    });

    return Array.from(employeeMap.values());
  };

  const allMatchedEmployees = useMemo(() => {
    const employeeSet = new Set();
    inspections.forEach(inspection => {
      const employees = getMatchingEmployees(inspection);
      employees.forEach(emp => employeeSet.add(emp.employeeName));
    });
    return Array.from(employeeSet).sort();
  }, [inspections, shifts, users, matchConfigs]);

  const filteredInspections = useMemo(() => {
    if (selectedEmployeeFilter === 'all') return inspections;
    return inspections.filter(inspection => {
      const employees = getMatchingEmployees(inspection);
      return employees.some(emp => emp.employeeName === selectedEmployeeFilter);
    });
  }, [inspections, selectedEmployeeFilter, shifts, users, matchConfigs]);

  return (
    <ProtectedPage pageName="PulizieMatch">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Pulizie Match</h1>
            <p className="text-sm text-slate-500">Assegna valutazioni pulizie ai dipendenti</p>
          </div>
          <NeumorphicButton onClick={() => setShowConfigModal(true)} className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Regole Assegnazione
          </NeumorphicButton>
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
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
          >
            <option value="all">Tutti i dipendenti</option>
            {allMatchedEmployees.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        </NeumorphicCard>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NeumorphicCard className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">
              {inspections.filter(i => i.analysis_status === 'completed').length}
            </h3>
            <p className="text-xs text-slate-500">Ispezioni Completate</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-3 flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-1">{users.length}</h3>
            <p className="text-xs text-slate-500">Dipendenti Attivi</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mx-auto mb-3 flex items-center justify-center">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-purple-600 mb-1">
              {matchConfigs.filter(r => r.attivo !== false).length}
            </h3>
            <p className="text-xs text-slate-500">Regole Attive</p>
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
                        <div className="text-sm text-slate-600 mb-2">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {format(parseISO(inspection.inspection_date), 'dd MMM yyyy HH:mm', { locale: it })}
                        </div>
                        {matchingEmployees.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {matchingEmployees.map((emp, idx) => (
                              <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200" title={`Regola: ${emp.appliedRule}`}>
                                {emp.employeeName} ({emp.roles.join(', ')})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-orange-600">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Nessun match trovato
                          </div>
                        )}
                      </div>
                      <NeumorphicButton onClick={() => setSelectedInspection(inspection)} className="ml-4">
                        <Eye className="w-4 h-4" />
                      </NeumorphicButton>
                    </div>
                  </div>
                );
              })}
          </div>
        </NeumorphicCard>

        {/* Details Modal */}
        {selectedInspection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="max-w-4xl w-full my-8">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Dettagli Match - {selectedInspection.store_name}</h2>
                  <button onClick={() => setSelectedInspection(null)} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="neumorphic-pressed p-6 rounded-xl text-center mb-6">
                  <p className="text-sm text-slate-500 mb-2">Punteggio Complessivo</p>
                  <div className={`text-4xl font-bold ${
                    selectedInspection.overall_score >= 80 ? 'text-green-600' :
                    selectedInspection.overall_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {selectedInspection.overall_score}%
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Dipendenti Assegnati</h3>
                  {(() => {
                    const matches = getMatchingEmployees(selectedInspection);
                    return matches.length > 0 ? (
                      <div className="space-y-2">
                        {matches.map((emp, idx) => (
                          <div key={idx} className="neumorphic-flat p-4 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-800">{emp.employeeName}</p>
                                <p className="text-sm text-slate-600">Ruoli: {emp.roles.join(', ')}</p>
                                <p className="text-xs text-blue-600">Regola: {emp.appliedRule}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-blue-600">{emp.minutesBeforeInspection} min</span>
                                <p className="text-xs text-slate-500">prima ispezione</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="neumorphic-pressed p-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                        <p className="text-slate-600">Nessun dipendente trovato</p>
                      </div>
                    );
                  })()}
                </div>
              </NeumorphicCard>
            </div>
          </div>
        )}

        {/* Config Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="max-w-6xl w-full my-8">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Regole di Assegnazione</h2>
                  <button onClick={() => {setShowConfigModal(false); setEditingRule(null);}} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Rules List */}
                <div className="space-y-3 mb-6">
                  {matchConfigs.map(rule => (
                    <div key={rule.id} className={`neumorphic-pressed p-4 rounded-xl ${rule.attivo === false ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-slate-800">{rule.nome_regola}</h3>
                            {rule.attivo === false && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Disattivata</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                            <div><strong>Store:</strong> {rule.store_id ? stores.find(s => s.id === rule.store_id)?.name : 'Tutti'}</div>
                            <div><strong>Orario form:</strong> {rule.ora_inizio_compilazione} - {rule.ora_fine_compilazione}</div>
                            <div><strong>Ruolo:</strong> {rule.ruolo_target}</div>
                            <div><strong>Tipo:</strong> {rule.tipo_match.replace(/_/g, ' ')}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => {setEditingRule(rule); setRuleForm(rule);}} className="nav-button p-2 rounded-lg">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => {
                            if (confirm('Eliminare questa regola?')) deleteRuleMutation.mutate(rule.id);
                          }} className="nav-button p-2 rounded-lg text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {matchConfigs.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nessuna regola configurata</p>
                    </div>
                  )}
                </div>

                {/* Rule Form */}
                {editingRule && (
                  <div className="neumorphic-flat p-6 rounded-xl mb-4 bg-blue-50">
                    <h3 className="font-bold text-slate-800 mb-4">{editingRule.id === 'new' ? 'Nuova' : 'Modifica'} Regola</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-sm text-slate-600 mb-2 block">Nome Regola</label>
                        <input
                          type="text"
                          value={ruleForm.nome_regola}
                          onChange={(e) => setRuleForm({...ruleForm, nome_regola: e.target.value})}
                          className="w-full neumorphic-pressed px-4 py-2 rounded-lg outline-none"
                          placeholder="es. Controlli Mattina Pizzaiolo"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600 mb-2 block">Store</label>
                        <select value={ruleForm.store_id} onChange={(e) => setRuleForm({...ruleForm, store_id: e.target.value})} className="w-full neumorphic-pressed px-4 py-2 rounded-lg outline-none">
                          <option value="">Tutti i locali</option>
                          {stores.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600 mb-2 block">Ruolo Target</label>
                        <select value={ruleForm.ruolo_target} onChange={(e) => setRuleForm({...ruleForm, ruolo_target: e.target.value})} className="w-full neumorphic-pressed px-4 py-2 rounded-lg outline-none">
                          <option value="Pizzaiolo">Pizzaiolo</option>
                          <option value="Cassiere">Cassiere</option>
                          <option value="Store Manager">Store Manager</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600 mb-2 block">Ora Inizio Form</label>
                        <input type="time" value={ruleForm.ora_inizio_compilazione} onChange={(e) => setRuleForm({...ruleForm, ora_inizio_compilazione: e.target.value})} className="w-full neumorphic-pressed px-4 py-2 rounded-lg outline-none" />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600 mb-2 block">Ora Fine Form</label>
                        <input type="time" value={ruleForm.ora_fine_compilazione} onChange={(e) => setRuleForm({...ruleForm, ora_fine_compilazione: e.target.value})} className="w-full neumorphic-pressed px-4 py-2 rounded-lg outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm text-slate-600 mb-2 block">Tipo Match</label>
                        <select value={ruleForm.tipo_match} onChange={(e) => setRuleForm({...ruleForm, tipo_match: e.target.value})} className="w-full neumorphic-pressed px-4 py-2 rounded-lg outline-none">
                          <option value="turno_precedente_stesso_ruolo">Turno precedente stesso ruolo</option>
                          <option value="ultimo_turno_giorno_prima_stesso_ruolo">Ultimo turno giorno prima stesso ruolo</option>
                          <option value="turno_specifico_orario">Turno specifico per orario</option>
                          <option value="tutti_turni_giorno_prima">Tutti i turni giorno prima</option>
                        </select>
                      </div>
                      {ruleForm.tipo_match === 'turno_specifico_orario' && (
                        <>
                          <div>
                            <label className="text-sm text-slate-600 mb-2 block">Ora Inizio Turno Target</label>
                            <input type="time" value={ruleForm.orario_turno_target_inizio} onChange={(e) => setRuleForm({...ruleForm, orario_turno_target_inizio: e.target.value})} className="w-full neumorphic-pressed px-4 py-2 rounded-lg outline-none" />
                          </div>
                          <div>
                            <label className="text-sm text-slate-600 mb-2 block">Ora Fine Turno Target</label>
                            <input type="time" value={ruleForm.orario_turno_target_fine} onChange={(e) => setRuleForm({...ruleForm, orario_turno_target_fine: e.target.value})} className="w-full neumorphic-pressed px-4 py-2 rounded-lg outline-none" />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="text-sm text-slate-600 mb-2 block">Ordine (Priorità)</label>
                        <input type="number" value={ruleForm.ordine} onChange={(e) => setRuleForm({...ruleForm, ordine: parseInt(e.target.value)})} className="w-full neumorphic-pressed px-4 py-2 rounded-lg outline-none" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={ruleForm.attivo !== false} onChange={(e) => setRuleForm({...ruleForm, attivo: e.target.checked})} className="w-5 h-5" />
                        <label className="text-sm text-slate-700">Regola Attiva</label>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => setEditingRule(null)} className="nav-button px-4 py-2 rounded-lg text-slate-600">Annulla</button>
                      <button
                        onClick={() => {
                          if (!ruleForm.nome_regola) {alert('Inserisci nome regola'); return;}
                          if (editingRule.id === 'new') {
                            createRuleMutation.mutate(ruleForm);
                          } else {
                            updateRuleMutation.mutate({id: editingRule.id, data: ruleForm});
                          }
                        }}
                        className="flex-1 nav-button px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-medium"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        {editingRule.id === 'new' ? 'Crea' : 'Salva'}
                      </button>
                    </div>
                  </div>
                )}

                {!editingRule && (
                  <NeumorphicButton
                    onClick={() => {
                      setEditingRule({id: 'new'});
                      setRuleForm({
                        nome_regola: '',
                        store_id: '',
                        ora_inizio_compilazione: '00:00',
                        ora_fine_compilazione: '23:59',
                        ruolo_target: 'Pizzaiolo',
                        tipo_match: 'turno_precedente_stesso_ruolo',
                        orario_turno_target_inizio: '',
                        orario_turno_target_fine: '',
                        attivo: true,
                        ordine: matchConfigs.length
                      });
                    }}
                    className="w-full flex items-center justify-center gap-2"
                    variant="primary"
                  >
                    <Plus className="w-5 h-5" />
                    Aggiungi Nuova Regola
                  </NeumorphicButton>
                )}
              </NeumorphicCard>
            </div>
          </div>
        )}

        {/* Info Card */}
        <NeumorphicCard className="p-6 bg-blue-50">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-bold text-blue-800 mb-2">Come Funziona</h3>
              <p className="text-sm text-blue-700">
                {matchConfigs.filter(r => r.attivo !== false).length > 0 
                  ? `Il sistema applica ${matchConfigs.filter(r => r.attivo !== false).length} regole attive per trovare i dipendenti responsabili.`
                  : 'Nessuna regola configurata - usa logica default (turno precedente).'}
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}