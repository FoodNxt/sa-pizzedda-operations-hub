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
  const [selectedStoresForDate, setSelectedStoresForDate] = useState([]);
  const [missingStartDate, setMissingStartDate] = useState('');
  const [missingEndDate, setMissingEndDate] = useState('');
  const [selectedStoresForMissing, setSelectedStoresForMissing] = useState([]);
  const [configForm, setConfigForm] = useState({
    form_name: '',
    form_page: '',
    frequency_type: 'temporal',
    temporal_frequency: 'weekly',
    temporal_day_of_week: 1,
    shift_based_timing: [],
    shift_sequence: '',
    use_previous_day_shift: false,
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

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
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
      temporal_day_of_week: null,
      shift_based_timing: [],
      shift_sequence: '',
      use_previous_day_shift: false,
      is_active: true,
      assigned_roles: []
    });
    setEditingConfig(null);
    setShowConfigForm(false);
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config);
    const timing = config.shift_based_timing;
    setConfigForm({
      form_name: config.form_name,
      form_page: config.form_page,
      frequency_type: config.frequency_type,
      temporal_frequency: config.temporal_frequency || 'weekly',
      temporal_day_of_week: config.temporal_day_of_week !== undefined && config.temporal_day_of_week !== null ? config.temporal_day_of_week : null,
      shift_based_timing: Array.isArray(timing) ? timing : (timing ? [timing] : []),
      shift_sequence: config.shift_sequence || '',
      use_previous_day_shift: config.use_previous_day_shift || false,
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
        
        // Get user's store from shifts
        const userStore = shifts.find(s => s.employee_name === userName)?.store_name;
        
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

          const hasCompleted = completions.some(c => {
            if (!c.completion_date) return false;
            try {
              const compDate = parseISO(c.completion_date);
              if (isNaN(compDate.getTime())) return false;
              return c.user_id === user.id &&
                     c.form_name === config.form_name &&
                     compDate >= periodStart;
            } catch (e) {
              return false;
            }
          });

          if (!hasCompleted) {
            missing.push({
              user,
              userName,
              userStore,
              config,
              reason: `Non completato questa ${config.temporal_frequency === 'weekly' ? 'settimana' : config.temporal_frequency === 'monthly' ? 'mese' : 'giornata'}`
            });
          }
        } else if (config.frequency_type === 'shift_based') {
          const userShifts = shifts.filter(s => s.employee_name === userName);
          
          userShifts.forEach(shift => {
            if (!shift.shift_date) return;
            try {
              const shiftDate = parseISO(shift.shift_date);
              if (isNaN(shiftDate.getTime())) return;
              
              const hasCompleted = completions.some(c =>
                c.user_id === user.id &&
                c.form_name === config.form_name &&
                c.shift_id === shift.id
              );

              if (!hasCompleted && isAfter(new Date(), shiftDate)) {
                missing.push({
                  user,
                  userName,
                  userStore,
                  config,
                  shift,
                  reason: `Non completato per turno del ${shiftDate.toLocaleDateString('it-IT')}`
                });
              }
            } catch (e) {
              console.error('Error processing shift date:', e);
            }
          });
        }
      });
    });

    return missing;
  }, [configs, completions, users, shifts]);

  // Filter missing completions by date range and stores
  const filteredMissingCompletions = useMemo(() => {
    let filtered = missingCompletions;

    // Filter by date range if set
    if (missingStartDate && missingEndDate) {
      const start = startOfDay(new Date(missingStartDate));
      const end = endOfDay(new Date(missingEndDate));
      
      filtered = filtered.filter(item => {
        if (item.shift?.shift_date) {
          try {
            const shiftDate = parseISO(item.shift.shift_date);
            return isWithinInterval(shiftDate, { start, end });
          } catch (e) {
            return false;
          }
        }
        // For temporal configs, check if they fall within the date range
        return true;
      });
    }

    // Filter by stores if selected
    if (selectedStoresForMissing.length > 0) {
      filtered = filtered.filter(item => 
        item.userStore && selectedStoresForMissing.includes(item.userStore)
      );
    }

    return filtered;
  }, [missingCompletions, missingStartDate, missingEndDate, selectedStoresForMissing]);

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
        
        // Get user's shifts on selected date
        const userShiftsOnDate = shifts.filter(s => 
          s.employee_name === userName && 
          s.shift_date === selectedDate
        );
        
        // Check yesterday's shifts too (for late-loaded shifts)
        const yesterday = new Date(dateObj);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const userShiftsYesterday = shifts.filter(s => 
          s.employee_name === userName && 
          s.shift_date === yesterdayStr
        );

        if (config.frequency_type === 'temporal') {
          // For temporal configs, determine if should show based on frequency
          let shouldShow = false;
          if (config.temporal_frequency === 'daily') {
            shouldShow = true;
          } else if (config.temporal_frequency === 'weekly') {
            shouldShow = config.temporal_day_of_week === null || config.temporal_day_of_week === undefined || dayOfWeek === config.temporal_day_of_week;
          } else if (config.temporal_frequency === 'monthly') {
            shouldShow = dateObj.getDate() === 1;
          }

          if (shouldShow) {
            const userStore = userShiftsOnDate[0]?.store_name || userShiftsYesterday[0]?.store_name;
            
            // Apply store filter only if stores are selected
            if (selectedStoresForDate.length > 0) {
              if (!userStore || !selectedStoresForDate.includes(userStore)) {
                return;
              }
            }

            const hasCompleted = completions.some(c => {
              if (!c.completion_date) return false;
              const compDate = new Date(c.completion_date);
              if (isNaN(compDate.getTime())) return false;
              try {
                return c.user_id === user.id &&
                       c.form_name === config.form_name &&
                       compDate.toISOString().split('T')[0] === selectedDate;
              } catch (e) {
                return false;
              }
            });

            forms.push({
              user,
              userName,
              userStore,
              config,
              completed: hasCompleted,
              completionDate: hasCompleted ? completions.find(c => {
                if (!c.completion_date) return false;
                try {
                  const compDate = new Date(c.completion_date);
                  if (isNaN(compDate.getTime())) return false;
                  return c.user_id === user.id && 
                         c.form_name === config.form_name &&
                         compDate.toISOString().split('T')[0] === selectedDate;
                } catch (e) {
                  return false;
                }
              })?.completion_date : null
            });
          }
        } else if (config.frequency_type === 'shift_based') {
          // For shift-based, get relevant shifts
          const relevantShifts = config.use_previous_day_shift ? userShiftsYesterday : userShiftsOnDate;
          
          if (relevantShifts.length === 0) return;

          // Filter by shift sequence if specified
          let shiftsToConsider = relevantShifts;
          if (config.shift_sequence) {
            // Sort shifts by scheduled_start
            const sortedShifts = [...relevantShifts].sort((a, b) => {
              if (!a.scheduled_start || !b.scheduled_start) return 0;
              return new Date(a.scheduled_start) - new Date(b.scheduled_start);
            });
            
            if (config.shift_sequence === 'first') {
              shiftsToConsider = sortedShifts[0] ? [sortedShifts[0]] : [];
            } else if (config.shift_sequence === 'second') {
              shiftsToConsider = sortedShifts[1] ? [sortedShifts[1]] : [];
            }
          }

          shiftsToConsider.forEach(shift => {
            // Apply store filter if selected
            if (selectedStoresForDate.length > 0 && !selectedStoresForDate.includes(shift.store_name)) {
              return;
            }

            const timings = Array.isArray(config.shift_based_timing) ? config.shift_based_timing : [config.shift_based_timing];
            
            timings.forEach(timing => {
              const hasCompleted = completions.some(c => {
                if (!c.completion_date) return false;
                const compDate = new Date(c.completion_date);
                if (isNaN(compDate.getTime())) return false;
                try {
                  return c.user_id === user.id &&
                         c.form_name === config.form_name &&
                         c.shift_id === shift.id &&
                         c.timing === timing &&
                         compDate.toISOString().split('T')[0] === selectedDate;
                } catch (e) {
                  return false;
                }
              });

              forms.push({
                user,
                userName,
                userStore: shift.store_name,
                config,
                shift,
                timing,
                completed: hasCompleted,
                completionDate: hasCompleted ? completions.find(c => {
                  if (!c.completion_date) return false;
                  try {
                    const compDate = new Date(c.completion_date);
                    if (isNaN(compDate.getTime())) return false;
                    return c.user_id === user.id && 
                           c.form_name === config.form_name &&
                           c.shift_id === shift.id &&
                           c.timing === timing &&
                           compDate.toISOString().split('T')[0] === selectedDate;
                  } catch (e) {
                    return false;
                  }
                })?.completion_date : null
              });
            });
          });
        }
      });
    });

    return forms;
  }, [selectedDate, configs, users, shifts, completions, selectedStoresForDate]);

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

        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Form Non Completati
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Data Inizio
              </label>
              <input
                type="date"
                value={missingStartDate}
                onChange={(e) => setMissingStartDate(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Data Fine
              </label>
              <input
                type="date"
                value={missingEndDate}
                onChange={(e) => setMissingEndDate(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Filtra per Locali
              </label>
              <div className="neumorphic-pressed p-4 rounded-xl max-h-60 overflow-y-auto space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStoresForMissing.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStoresForMissing([]);
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-700 font-medium">Tutti i locali</span>
                </label>
                {stores.map(store => (
                  <label key={store.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStoresForMissing.includes(store.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStoresForMissing([...selectedStoresForMissing, store.name]);
                        } else {
                          setSelectedStoresForMissing(selectedStoresForMissing.filter(s => s !== store.name));
                        }
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700">{store.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {filteredMissingCompletions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-slate-600">Nessun form mancante con i filtri selezionati</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMissingCompletions.map((item, idx) => (
                <div key={idx} className="neumorphic-pressed p-4 rounded-xl border-2 border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{item.userName}</p>
                      <p className="text-sm text-slate-600">{item.config.form_name}</p>
                      {item.userStore && (
                        <p className="text-xs text-blue-600">Locale: {item.userStore}</p>
                      )}
                      <p className="text-xs text-red-600">{item.reason}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      Mancante
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeumorphicCard>

        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Form per Giorno Specifico
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Seleziona Data
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Filtra per Locali
              </label>
              <div className="neumorphic-pressed p-4 rounded-xl max-h-60 overflow-y-auto space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStoresForDate.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStoresForDate([]);
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-700 font-medium">Tutti i locali</span>
                </label>
                {stores.map(store => (
                  <label key={store.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStoresForDate.includes(store.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStoresForDate([...selectedStoresForDate, store.name]);
                        } else {
                          setSelectedStoresForDate(selectedStoresForDate.filter(s => s !== store.name));
                        }
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700">{store.name}</span>
                  </label>
                ))}
              </div>
            </div>
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
                      {item.timing && (
                        <p className="text-xs text-purple-600">
                          {item.timing === 'start' ? '🔵 Inizio turno' : '🟢 Fine turno'}
                        </p>
                      )}
                      {item.userStore && (
                        <p className="text-xs text-blue-600">Locale: {item.userStore}</p>
                      )}
                      {item.shift && (
                        <p className="text-xs text-slate-500">
                          Turno: {new Date(item.shift.scheduled_start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - {new Date(item.shift.scheduled_end).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {item.completed && item.completionDate && (
                        <p className="text-xs text-green-600 mt-1">
                          Completato: {(() => {
                            try {
                              const date = new Date(item.completionDate);
                              return isNaN(date.getTime()) ? 'Data non valida' : date.toLocaleString('it-IT');
                            } catch (e) {
                              return 'Data non valida';
                            }
                          })()}
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
                         <>
                           <p><strong>Quando:</strong> {
                             Array.isArray(config.shift_based_timing) 
                               ? config.shift_based_timing.map(t => t === 'start' ? 'Inizio' : 'Fine').join(' e ')
                               : (config.shift_based_timing === 'start' ? 'Inizio turno' : 'Fine turno')
                           }</p>
                           {config.shift_sequence && (
                             <p><strong>Turno:</strong> {config.shift_sequence === 'first' ? 'Mattina (primo turno)' : 'Sera (secondo turno)'}</p>
                           )}
                           {config.use_previous_day_shift && (
                             <p><strong>Usa turno precedente:</strong> Sì</p>
                           )}
                         </>
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
                          Giorno della Settimana (opzionale)
                        </label>
                        <select
                          value={configForm.temporal_day_of_week === null || configForm.temporal_day_of_week === undefined ? '' : configForm.temporal_day_of_week}
                          onChange={(e) => setConfigForm({ ...configForm, temporal_day_of_week: e.target.value === '' ? null : parseInt(e.target.value) })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                        >
                          <option value="">Nessun giorno specifico (tutti i giorni)</option>
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
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer neumorphic-pressed px-4 py-3 rounded-xl">
                          <input
                            type="checkbox"
                            checked={configForm.shift_based_timing.includes('start')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfigForm({ ...configForm, shift_based_timing: [...configForm.shift_based_timing, 'start'] });
                              } else {
                                setConfigForm({ ...configForm, shift_based_timing: configForm.shift_based_timing.filter(t => t !== 'start') });
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-slate-700">Inizio Turno</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer neumorphic-pressed px-4 py-3 rounded-xl">
                          <input
                            type="checkbox"
                            checked={configForm.shift_based_timing.includes('end')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfigForm({ ...configForm, shift_based_timing: [...configForm.shift_based_timing, 'end'] });
                              } else {
                                setConfigForm({ ...configForm, shift_based_timing: configForm.shift_based_timing.filter(t => t !== 'end') });
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-slate-700">Fine Turno</span>
                        </label>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Seleziona uno o entrambi i momenti in cui il form deve essere compilato
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Quale Turno (opzionale)
                      </label>
                      <select
                        value={configForm.shift_sequence}
                        onChange={(e) => setConfigForm({ ...configForm, shift_sequence: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      >
                        <option value="">Tutti i turni</option>
                        <option value="first">Turno Mattina (primo turno)</option>
                        <option value="second">Turno Sera (secondo turno)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-2">
                        Se vuoto, il form sarà richiesto per tutti i turni. Se impostato, solo per il primo o secondo turno del dipendente nella giornata.
                      </p>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configForm.use_previous_day_shift}
                          onChange={(e) => setConfigForm({ ...configForm, use_previous_day_shift: e.target.checked })}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm font-medium text-slate-700">
                          Usa turno del giorno precedente
                        </span>
                      </label>
                      <p className="text-xs text-slate-500 mt-1 ml-6">
                        Utile quando i turni vengono caricati il giorno dopo. Il form apparirà oggi ma si riferirà al turno di ieri.
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