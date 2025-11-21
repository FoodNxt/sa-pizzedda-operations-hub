import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, Edit, Trash2, Save, X, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { startOfWeek, startOfMonth, isAfter, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export default function FormTracker() {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [configForm, setConfigForm] = useState({
    form_name: '',
    form_page: '',
    frequency_type: 'temporal',
    temporal_frequency: 'weekly',
    temporal_day_of_week: 1,
    shift_based_timing: 'end',
    shift_time_filter: '',
    is_active: true,
    assigned_roles: []
  });

  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['form-tracker-configs'],
    queryFn: () => base44.entities.FormTrackerConfig.list(),
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['form-completions'],
    queryFn: () => base44.entities.FormCompletion.list('-completion_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['dipendenti-users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const createConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.FormTrackerConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-tracker-configs'] });
      resetConfigForm();
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FormTrackerConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-tracker-configs'] });
      resetConfigForm();
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: (id) => base44.entities.FormTrackerConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-tracker-configs'] });
    },
  });

  const resetConfigForm = () => {
    setConfigForm({
      form_name: '',
      form_page: '',
      frequency_type: 'temporal',
      temporal_frequency: 'weekly',
      temporal_day_of_week: 1,
      shift_based_timing: 'end',
      shift_time_filter: '',
      is_active: true,
      assigned_roles: []
    });
    setEditingConfig(null);
    setShowConfigForm(false);
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config);
    setConfigForm({
      form_name: config.form_name,
      form_page: config.form_page,
      frequency_type: config.frequency_type,
      temporal_frequency: config.temporal_frequency || 'weekly',
      temporal_day_of_week: config.temporal_day_of_week || 1,
      shift_based_timing: config.shift_based_timing || 'end',
      shift_time_filter: config.shift_time_filter || '',
      is_active: config.is_active !== false,
      assigned_roles: config.assigned_roles || []
    });
    setShowConfigForm(true);
  };

  const handleSubmitConfig = (e) => {
    e.preventDefault();
    if (editingConfig) {
      updateConfigMutation.mutate({ id: editingConfig.id, data: configForm });
    } else {
      createConfigMutation.mutate(configForm);
    }
  };

  const toggleRole = (role) => {
    const roles = configForm.assigned_roles || [];
    if (roles.includes(role)) {
      setConfigForm({ ...configForm, assigned_roles: roles.filter(r => r !== role) });
    } else {
      setConfigForm({ ...configForm, assigned_roles: [...roles, role] });
    }
  };

  // Calculate missing completions
  const missingCompletions = useMemo(() => {
    const missing = [];
    const activeConfigs = configs.filter(c => c.is_active);

    activeConfigs.forEach(config => {
      const eligibleUsers = users.filter(user => {
        if (!config.assigned_roles || config.assigned_roles.length === 0) return true;
        return user.ruoli_dipendente?.some(role => config.assigned_roles.includes(role));
      });

      eligibleUsers.forEach(user => {
        const userName = user.nome_cognome || user.full_name || user.email;
        
        if (config.frequency_type === 'temporal') {
          let needsCompletion = false;
          let periodStart = null;

          if (config.temporal_frequency === 'weekly') {
            periodStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          } else if (config.temporal_frequency === 'monthly') {
            periodStart = startOfMonth(new Date());
          } else if (config.temporal_frequency === 'daily') {
            periodStart = new Date();
            periodStart.setHours(0, 0, 0, 0);
          }

          const hasCompleted = completions.some(c => 
            c.user_id === user.id &&
            c.form_name === config.form_name &&
            parseISO(c.completion_date) >= periodStart
          );

          if (!hasCompleted) {
            missing.push({
              user,
              userName,
              config,
              reason: `Non completato questa ${config.temporal_frequency === 'weekly' ? 'settimana' : config.temporal_frequency === 'monthly' ? 'mese' : 'giornata'}`
            });
          }
        } else if (config.frequency_type === 'shift_based') {
          const userShifts = shifts.filter(s => s.employee_name === userName);
          
          userShifts.forEach(shift => {
            const shiftDate = parseISO(shift.shift_date);
            const hasCompleted = completions.some(c =>
              c.user_id === user.id &&
              c.form_name === config.form_name &&
              c.shift_id === shift.id
            );

            if (!hasCompleted && isAfter(new Date(), shiftDate)) {
              missing.push({
                user,
                userName,
                config,
                shift,
                reason: `Non completato per turno del ${new Date(shift.shift_date).toLocaleDateString('it-IT')}`
              });
            }
          });
        }
      });
    });

    return missing;
  }, [configs, completions, users, shifts]);

  // Calculate forms for specific date
  const formsForDate = useMemo(() => {
    if (!selectedDate) return [];
    
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();
    const forms = [];
    
    const activeConfigs = configs.filter(c => c.is_active);
    
    activeConfigs.forEach(config => {
      const eligibleUsers = users.filter(user => {
        if (!config.assigned_roles || config.assigned_roles.length === 0) return true;
        return user.ruoli_dipendente?.some(role => config.assigned_roles.includes(role));
      });

      eligibleUsers.forEach(user => {
        const userName = user.nome_cognome || user.full_name || user.email;
        let shouldShow = false;

        if (config.frequency_type === 'temporal') {
          if (config.temporal_frequency === 'daily') {
            shouldShow = true;
          } else if (config.temporal_frequency === 'weekly') {
            shouldShow = dayOfWeek === (config.temporal_day_of_week || 1);
          } else if (config.temporal_frequency === 'monthly') {
            shouldShow = dateObj.getDate() === 1;
          }
        } else if (config.frequency_type === 'shift_based') {
          const hasShift = shifts.some(s => 
            s.employee_name === userName && 
            s.shift_date === selectedDate
          );
          shouldShow = hasShift;
        }

        if (shouldShow) {
          const hasCompleted = completions.some(c => {
            const compDate = new Date(c.completion_date);
            return c.user_id === user.id &&
                   c.form_name === config.form_name &&
                   compDate.toISOString().split('T')[0] === selectedDate;
          });

          forms.push({
            user,
            userName,
            config,
            completed: hasCompleted,
            completionDate: hasCompleted ? completions.find(c => 
              c.user_id === user.id && 
              c.form_name === config.form_name &&
              new Date(c.completion_date).toISOString().split('T')[0] === selectedDate
            )?.completion_date : null
          });
        }
      });
    });

    return forms;
  }, [selectedDate, configs, users, shifts, completions]);

  const availableForms = [
    { name: 'Form Inventario', page: 'FormInventario' },
    { name: 'Form Cantina', page: 'FormCantina' },
    { name: 'Form Teglie Buttate', page: 'FormTeglieButtate' },
    { name: 'Form Preparazioni', page: 'FormPreparazioni' },
    { name: 'Conteggio Cassa', page: 'ConteggioCassa' },
    { name: 'Controllo Pulizia Cassiere', page: 'ControlloPuliziaCassiere' },
    { name: 'Controllo Pulizia Pizzaiolo', page: 'ControlloPuliziaPizzaiolo' },
    { name: 'Controllo Pulizia Store Manager', page: 'ControlloPuliziaStoreManager' }
  ];

  return (
    <ProtectedPage pageName="FormTracker">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
              Form Tracker
            </h1>
            <p className="text-sm text-slate-500">Monitora il completamento dei form</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowConfigForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Configurazione
          </NeumorphicButton>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <NeumorphicCard className="p-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <ClipboardCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">{configs.filter(c => c.is_active).length}</h3>
              <p className="text-xs text-slate-500">Form Monitorati</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-1">{completions.length}</h3>
              <p className="text-xs text-slate-500">Completamenti Totali</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-red-600 mb-1">{missingCompletions.length}</h3>
              <p className="text-xs text-slate-500">Da Completare</p>
            </div>
          </NeumorphicCard>
        </div>

        {missingCompletions.length > 0 && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Form Non Completati
            </h2>
            <div className="space-y-2">
              {missingCompletions.map((item, idx) => (
                <div key={idx} className="neumorphic-pressed p-4 rounded-xl border-2 border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{item.userName}</p>
                      <p className="text-sm text-slate-600">{item.config.form_name}</p>
                      <p className="text-xs text-red-600">{item.reason}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      Mancante
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Form per Giorno Specifico
            </h2>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Seleziona Data
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full md:w-auto neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
            />
          </div>

          {formsForDate.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessun form da completare per questa data</p>
            </div>
          ) : (
            <div className="space-y-2">
              {formsForDate.map((item, idx) => (
                <div key={idx} className={`neumorphic-pressed p-4 rounded-xl ${
                  item.completed ? 'border-2 border-green-200' : 'border-2 border-orange-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{item.userName}</p>
                      <p className="text-sm text-slate-600">{item.config.form_name}</p>
                      {item.completed && item.completionDate && (
                        <p className="text-xs text-green-600 mt-1">
                          Completato: {new Date(item.completionDate).toLocaleString('it-IT')}
                        </p>
                      )}
                    </div>
                    {item.completed ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Completato
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                        Da Completare
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Configurazioni Form</h2>
          <div className="space-y-3">
            {configs.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessuna configurazione creata</p>
              </div>
            ) : (
              configs.map(config => (
                <NeumorphicCard key={config.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 mb-1">{config.form_name}</h3>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p><strong>Tipo:</strong> {config.frequency_type === 'temporal' ? 'Temporale' : 'Basato su turni'}</p>
                        {config.frequency_type === 'temporal' && (
                          <>
                            <p><strong>Frequenza:</strong> {
                              config.temporal_frequency === 'daily' ? 'Giornaliera' :
                              config.temporal_frequency === 'weekly' ? 'Settimanale' : 'Mensile'
                            }</p>
                            {config.temporal_frequency === 'weekly' && config.temporal_day_of_week !== undefined && (
                              <p><strong>Giorno:</strong> {
                                ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][config.temporal_day_of_week]
                              }</p>
                            )}
                          </>
                        )}
                        {config.frequency_type === 'shift_based' && (
                          <p><strong>Quando:</strong> {config.shift_based_timing === 'start' ? 'Inizio turno' : 'Fine turno'}</p>
                        )}
                        {config.assigned_roles && config.assigned_roles.length > 0 && (
                          <p><strong>Ruoli:</strong> {config.assigned_roles.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditConfig(config)}
                        className="nav-button p-2 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questa configurazione?')) {
                            deleteConfigMutation.mutate(config.id);
                          }
                        }}
                        className="nav-button p-2 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </NeumorphicCard>
              ))
            )}
          </div>
        </NeumorphicCard>

        {showConfigForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {editingConfig ? 'Modifica Configurazione' : 'Nuova Configurazione'}
                  </h2>
                  <button onClick={resetConfigForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <form onSubmit={handleSubmitConfig} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Form
                    </label>
                    <select
                      value={configForm.form_page}
                      onChange={(e) => {
                        const selected = availableForms.find(f => f.page === e.target.value);
                        setConfigForm({ 
                          ...configForm, 
                          form_page: e.target.value,
                          form_name: selected?.name || ''
                        });
                      }}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      required
                    >
                      <option value="">Seleziona form...</option>
                      {availableForms.map(form => (
                        <option key={form.page} value={form.page}>{form.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Tipo Frequenza
                    </label>
                    <select
                      value={configForm.frequency_type}
                      onChange={(e) => setConfigForm({ ...configForm, frequency_type: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="temporal">Temporale</option>
                      <option value="shift_based">Basato su Turni</option>
                    </select>
                  </div>

                  {configForm.frequency_type === 'temporal' && (
                   <>
                     <div>
                       <label className="text-sm font-medium text-slate-700 mb-2 block">
                         Frequenza Temporale
                       </label>
                       <select
                         value={configForm.temporal_frequency}
                         onChange={(e) => setConfigForm({ ...configForm, temporal_frequency: e.target.value })}
                         className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                       >
                         <option value="daily">Giornaliera</option>
                         <option value="weekly">Settimanale</option>
                         <option value="monthly">Mensile</option>
                       </select>
                     </div>

                     {configForm.temporal_frequency === 'weekly' && (
                       <div>
                         <label className="text-sm font-medium text-slate-700 mb-2 block">
                           Giorno della Settimana
                         </label>
                         <select
                           value={configForm.temporal_day_of_week}
                           onChange={(e) => setConfigForm({ ...configForm, temporal_day_of_week: parseInt(e.target.value) })}
                           className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                         >
                           <option value={1}>Lunedì</option>
                           <option value={2}>Martedì</option>
                           <option value={3}>Mercoledì</option>
                           <option value={4}>Giovedì</option>
                           <option value={5}>Venerdì</option>
                           <option value={6}>Sabato</option>
                           <option value={0}>Domenica</option>
                         </select>
                       </div>
                     )}
                   </>
                  )}

                  {configForm.frequency_type === 'shift_based' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Quando Compilare
                        </label>
                        <select
                          value={configForm.shift_based_timing}
                          onChange={(e) => setConfigForm({ ...configForm, shift_based_timing: e.target.value })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                        >
                          <option value="start">Inizio Turno</option>
                          <option value="end">Fine Turno</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Orario Turno (opzionale)
                        </label>
                        <input
                          type="time"
                          value={configForm.shift_time_filter}
                          onChange={(e) => setConfigForm({ ...configForm, shift_time_filter: e.target.value })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                          placeholder="es: 12:00"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          Se vuoto, il form sarà richiesto per tutti i turni. Se impostato, solo per dipendenti in turno in questo orario.
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Ruoli Assegnati (lascia vuoto per tutti)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Pizzaiolo', 'Cassiere', 'Store Manager'].map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(role)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            configForm.assigned_roles?.includes(role)
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'nav-button text-slate-700'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <NeumorphicButton type="button" onClick={resetConfigForm} className="flex-1">
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton type="submit" variant="primary" className="flex-1">
                      <Save className="w-5 h-5 mr-2" />
                      {editingConfig ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}