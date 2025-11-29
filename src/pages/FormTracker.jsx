import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, Edit, Trash2, Save, X, AlertTriangle, CheckCircle, Calendar, Eye, ChevronDown, ChevronUp, Store, Users } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function FormTracker() {
  const [activeTab, setActiveTab] = useState('tracking');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default: yesterday (since shifts are loaded at 1am the next day)
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  const [selectedStore, setSelectedStore] = useState('');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [viewingCompletion, setViewingCompletion] = useState(null);
  const [expandedForms, setExpandedForms] = useState({});
  const [expandedStores, setExpandedStores] = useState({});

  const [configForm, setConfigForm] = useState({
    form_name: '',
    form_page: '',
    assigned_roles: [],
    shift_timing: 'end', // 'start' or 'end'
    shift_sequences: ['first'], // array: 'first', 'second' or both
    days_of_week: [], // empty = all days, or array of 0-6 (0=Sunday)
    is_active: true
  });

  const queryClient = useQueryClient();

  // Fetch data
  const { data: configs = [] } = useQuery({
    queryKey: ['form-tracker-configs'],
    queryFn: () => base44.entities.FormTrackerConfig.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  // Fetch form-specific data for viewing completions
  const { data: cleaningInspections = [] } = useQuery({
    queryKey: ['cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date'),
  });

  const { data: inventarioRilevazioni = [] } = useQuery({
    queryKey: ['inventario-rilevazioni'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione'),
  });

  const { data: conteggiCassa = [] } = useQuery({
    queryKey: ['conteggi-cassa'],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio'),
  });

  const { data: teglieButtate = [] } = useQuery({
    queryKey: ['teglie-buttate'],
    queryFn: () => base44.entities.TeglieButtate.list('-data_rilevazione'),
  });

  const { data: preparazioni = [] } = useQuery({
    queryKey: ['preparazioni'],
    queryFn: () => base44.entities.Preparazioni.list('-data_rilevazione'),
  });

  // Mutations
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
      assigned_roles: [],
      shift_timing: 'end',
      shift_sequences: ['first'],
      days_of_week: [],
      is_active: true
    });
    setEditingConfig(null);
    setShowConfigForm(false);
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config);
    // Handle backward compatibility for shift_sequence
    let sequences = config.shift_sequences || [];
    if (sequences.length === 0 && config.shift_sequence) {
      sequences = [config.shift_sequence];
    }
    if (sequences.length === 0) {
      sequences = ['first'];
    }
    
    setConfigForm({
      form_name: config.form_name,
      form_page: config.form_page,
      assigned_roles: config.assigned_roles || [],
      shift_timing: config.shift_based_timing?.[0] || config.shift_timing || 'end',
      shift_sequences: sequences,
      days_of_week: config.days_of_week || [],
      is_active: config.is_active !== false
    });
    setShowConfigForm(true);
  };

  const handleSubmitConfig = (e) => {
    e.preventDefault();
    
    // Validate at least one shift sequence is selected
    if (!configForm.shift_sequences || configForm.shift_sequences.length === 0) {
      alert('Seleziona almeno un turno (mattina o sera)');
      return;
    }
    
    const dataToSave = {
      form_name: configForm.form_name,
      form_page: configForm.form_page,
      assigned_roles: configForm.assigned_roles,
      shift_timing: configForm.shift_timing,
      shift_sequences: configForm.shift_sequences,
      days_of_week: configForm.days_of_week,
      is_active: configForm.is_active,
      frequency_type: 'shift_based',
      shift_based_timing: [configForm.shift_timing],
      shift_sequence: configForm.shift_sequences[0] // backward compatibility
    };
    
    if (editingConfig) {
      updateConfigMutation.mutate({ id: editingConfig.id, data: dataToSave });
    } else {
      createConfigMutation.mutate(dataToSave);
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

  // Available forms
  const availableForms = [
    { name: 'Form Inventario', page: 'FormInventario' },
    { name: 'Form Cantina', page: 'FormCantina' },
    { name: 'Teglie Buttate', page: 'FormTeglieButtate' },
    { name: 'Form Preparazioni', page: 'FormPreparazioni' },
    { name: 'Conteggio Cassa', page: 'ConteggioCassa' },
    { name: 'Controllo Pulizia Cassiere', page: 'ControlloPuliziaCassiere' },
    { name: 'Controllo Pulizia Pizzaiolo', page: 'ControlloPuliziaPizzaiolo' },
    { name: 'Controllo Pulizia Store Manager', page: 'ControlloPuliziaStoreManager' }
  ];

  // Check if a specific form was completed
  const checkFormCompletion = (formPage, employeeName, storeName, date, shift) => {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    // Also check next day until 6am (for forms completed after midnight)
    const nextDayEnd = new Date(dateEnd);
    nextDayEnd.setDate(nextDayEnd.getDate() + 1);
    nextDayEnd.setHours(6, 0, 0, 0);

    switch (formPage) {
      case 'ControlloPuliziaCassiere':
      case 'ControlloPuliziaPizzaiolo':
      case 'ControlloPuliziaStoreManager': {
        const inspection = cleaningInspections.find(i => {
          const inspDate = new Date(i.inspection_date);
          return i.store_name === storeName &&
                 i.inspector_name === employeeName &&
                 inspDate >= dateStart && inspDate <= nextDayEnd;
        });
        return { completed: !!inspection, data: inspection };
      }

      case 'FormInventario': {
        const rilevazione = inventarioRilevazioni.find(r => {
          const rilDate = new Date(r.data_rilevazione);
          return r.store_name === storeName &&
                 r.rilevato_da === employeeName &&
                 rilDate >= dateStart && rilDate <= nextDayEnd;
        });
        return { completed: !!rilevazione, data: rilevazione };
      }

      case 'ConteggioCassa': {
        const conteggio = conteggiCassa.find(c => {
          const contDate = new Date(c.data_conteggio);
          return c.store_name === storeName &&
                 c.rilevato_da === employeeName &&
                 contDate >= dateStart && contDate <= nextDayEnd;
        });
        return { completed: !!conteggio, data: conteggio };
      }

      case 'FormTeglieButtate': {
        const teglie = teglieButtate.find(t => {
          const tegDate = new Date(t.data_rilevazione);
          return t.store_name === storeName &&
                 t.rilevato_da === employeeName &&
                 tegDate >= dateStart && tegDate <= nextDayEnd;
        });
        return { completed: !!teglie, data: teglie };
      }

      case 'FormPreparazioni': {
        const prep = preparazioni.find(p => {
          const prepDate = new Date(p.data_rilevazione);
          return p.store_name === storeName &&
                 p.rilevato_da === employeeName &&
                 prepDate >= dateStart && prepDate <= nextDayEnd;
        });
        return { completed: !!prep, data: prep };
      }

      default:
        return { completed: false, data: null };
    }
  };

  // Calculate expected vs completed forms for selected date and store
  const formStatus = useMemo(() => {
    if (!selectedDate) return { byStore: {}, summary: { total: 0, completed: 0, missing: 0 } };

    const activeConfigs = configs.filter(c => c.is_active);
    const byStore = {};
    let totalExpected = 0;
    let totalCompleted = 0;

    // Get shifts for selected date
    const shiftsForDate = shifts.filter(s => s.shift_date === selectedDate);

    // Group shifts by store
    const shiftsByStore = {};
    shiftsForDate.forEach(shift => {
      if (!shiftsByStore[shift.store_name]) {
        shiftsByStore[shift.store_name] = [];
      }
      shiftsByStore[shift.store_name].push(shift);
    });

    // Also include all stores even if no shifts (to show expected forms based on config)
    stores.forEach(store => {
      if (!shiftsByStore[store.name]) {
        shiftsByStore[store.name] = [];
      }
    });

    // For each store
    Object.entries(shiftsByStore).forEach(([storeName, storeShifts]) => {
      if (selectedStore && selectedStore !== storeName) return;

      byStore[storeName] = { forms: [], completed: 0, missing: 0 };

      // Group by employee and sort their shifts by start time
      const shiftsByEmployee = {};
      storeShifts.forEach(shift => {
        if (!shiftsByEmployee[shift.employee_name]) {
          shiftsByEmployee[shift.employee_name] = [];
        }
        shiftsByEmployee[shift.employee_name].push(shift);
      });
      
      // Sort each employee's shifts by start time
      Object.keys(shiftsByEmployee).forEach(emp => {
        shiftsByEmployee[emp].sort((a, b) => {
          const aStart = new Date(a.scheduled_start);
          const bStart = new Date(b.scheduled_start);
          return aStart - bStart;
        });
      });

      // For each config
      activeConfigs.forEach(config => {
        const configRoles = config.assigned_roles || [];
        const shiftSequences = config.shift_sequences || (config.shift_sequence ? [config.shift_sequence] : ['first']);
        const shiftTiming = config.shift_based_timing?.[0] || config.shift_timing || 'end';
        const daysOfWeek = config.days_of_week || [];
        
        // Check if this config applies to the selected date's day of week
        const selectedDayOfWeek = new Date(selectedDate).getDay();
        if (daysOfWeek.length > 0 && !daysOfWeek.includes(selectedDayOfWeek)) {
          return; // Skip this config for this day
        }

        // Check if config applies to this store
        const configStores = config.assigned_stores || [];
        const storeEntity = stores.find(s => s.name === storeName);
        if (configStores.length > 0 && storeEntity && !configStores.includes(storeEntity.id)) {
          return; // Skip this config for this store
        }

        // If no shifts for this store, still show expected forms for each role/sequence combo
        if (Object.keys(shiftsByEmployee).length === 0) {
          // Show expected form entries without specific employee
          shiftSequences.forEach(shiftSequence => {
            configRoles.forEach(role => {
              totalExpected++;
              
              const formEntry = {
                config,
                employeeName: `(${role} - nessun turno)`,
                user: null,
                shift: null,
                shiftTiming,
                shiftSequence,
                completed: false,
                completionData: null,
                noShift: true
              };

              byStore[storeName].forms.push(formEntry);
              byStore[storeName].missing++;
            });
          });
          return;
        }

        // Find employees who should complete this form
        Object.entries(shiftsByEmployee).forEach(([employeeName, employeeShifts]) => {
          // Get the user to check their role
          const user = users.find(u => 
            (u.nome_cognome === employeeName || u.full_name === employeeName)
          );
          
          if (!user) return;

          const userRoles = user.ruoli_dipendente || [];
          
          // Check if user has the required role
          if (configRoles.length > 0 && !configRoles.some(r => userRoles.includes(r))) {
            return;
          }

          // Process each shift sequence
          shiftSequences.forEach(shiftSequence => {
            // Determine morning vs evening based on shift start time (before/after 15:00)
            let targetShift = null;
            
            if (shiftSequence === 'first') {
              // Morning shift = starts before 15:00
              targetShift = employeeShifts.find(s => {
                const startHour = new Date(s.scheduled_start).getHours();
                return startHour < 15;
              });
            } else {
              // Evening shift = starts at 15:00 or later
              targetShift = employeeShifts.find(s => {
                const startHour = new Date(s.scheduled_start).getHours();
                return startHour >= 15;
              });
            }

            if (!targetShift) return;

            totalExpected++;

            // Check if form was completed
            const isCompleted = checkFormCompletion(
              config.form_page,
              employeeName,
              storeName,
              selectedDate,
              targetShift
            );

            const formEntry = {
              config,
              employeeName,
              user,
              shift: targetShift,
              shiftTiming,
              shiftSequence,
              completed: isCompleted.completed,
              completionData: isCompleted.data
            };

            byStore[storeName].forms.push(formEntry);

            if (isCompleted.completed) {
              byStore[storeName].completed++;
              totalCompleted++;
            } else {
              byStore[storeName].missing++;
            }
          });
        });
      });
    });

    return {
      byStore,
      summary: {
        total: totalExpected,
        completed: totalCompleted,
        missing: totalExpected - totalCompleted
      }
    };
  }, [selectedDate, selectedStore, configs, shifts, users, cleaningInspections, inventarioRilevazioni, conteggiCassa, teglieButtate, preparazioni]);

  const toggleFormExpand = (formName) => {
    setExpandedForms(prev => ({
      ...prev,
      [formName]: !prev[formName]
    }));
  };

  const formatShiftTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <ProtectedPage pageName="FormTracker">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
              Form Tracker
            </h1>
            <p className="text-sm text-slate-500">Monitora il completamento dei form per turno</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'tracking' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                : 'nav-button text-slate-700'
            }`}
          >
            <ClipboardCheck className="w-5 h-5 inline mr-2" />
            Monitoraggio
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'config' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                : 'nav-button text-slate-700'
            }`}
          >
            <Edit className="w-5 h-5 inline mr-2" />
            Configurazione
          </button>
        </div>

        {activeTab === 'tracking' && (
          <>
            {/* Filters */}
            <NeumorphicCard className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[
                      { label: 'Oggi', days: 0 },
                      { label: 'Ieri', days: 1 },
                      { label: '2 giorni fa', days: 2 },
                      { label: '3 giorni fa', days: 3 }
                    ].map(opt => (
                      <button
                        key={opt.days}
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() - opt.days);
                          setSelectedDate(d.toISOString().split('T')[0]);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          (() => {
                            const d = new Date();
                            d.setDate(d.getDate() - opt.days);
                            return d.toISOString().split('T')[0] === selectedDate;
                          })() ? 'bg-blue-500 text-white' : 'nav-button text-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {selectedDate === new Date().toISOString().split('T')[0] && (
                    <p className="text-xs text-orange-600 mt-2">
                      ⚠️ Oggi: i turni vengono caricati all'1:00 del giorno successivo, quindi potresti non vedere tutti i turni
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    <Store className="w-4 h-4 inline mr-1" />
                    Locale
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Tutti i locali</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.name}>{store.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </NeumorphicCard>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NeumorphicCard className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                  <ClipboardCheck className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{formStatus.summary.total}</h3>
                <p className="text-xs text-slate-500">Form Attesi</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-green-600">{formStatus.summary.completed}</h3>
                <p className="text-xs text-slate-500">Completati</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-red-600">{formStatus.summary.missing}</h3>
                <p className="text-xs text-slate-500">Mancanti</p>
              </NeumorphicCard>
            </div>

            {/* Results by Store */}
            {Object.keys(formStatus.byStore).length === 0 ? (
              <NeumorphicCard className="p-12 text-center">
                <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun turno trovato per questa data</p>
                <p className="text-xs text-slate-400 mt-2">
                  Ricorda: i turni vengono caricati all'1:00 del giorno successivo
                </p>
              </NeumorphicCard>
            ) : (
              Object.entries(formStatus.byStore).map(([storeName, storeData]) => (
                <NeumorphicCard key={storeName} className="p-4">
                  <button
                    onClick={() => setExpandedStores(prev => ({ ...prev, [storeName]: !prev[storeName] }))}
                    className="w-full flex items-center justify-between"
                  >
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Store className="w-5 h-5 text-blue-600" />
                      {storeName}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        ✓ {storeData.completed}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        ✗ {storeData.missing}
                      </span>
                      {expandedStores[storeName] ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                    </div>
                  </button>

                  {/* Group by form - only show when expanded */}
                  {expandedStores[storeName] && (
                    <div className="mt-4">
                      {(() => {
                        const formsByName = {};
                        storeData.forms.forEach(f => {
                          if (!formsByName[f.config.form_name]) {
                            formsByName[f.config.form_name] = [];
                          }
                          formsByName[f.config.form_name].push(f);
                        });

                        return Object.entries(formsByName).map(([formName, forms]) => {
                          const completedCount = forms.filter(f => f.completed).length;
                          const isExpanded = expandedForms[`${storeName}-${formName}`];

                          return (
                            <div key={formName} className="mb-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFormExpand(`${storeName}-${formName}`); }}
                                className={`w-full neumorphic-pressed p-4 rounded-xl flex items-center justify-between ${
                                  completedCount === forms.length ? 'border-2 border-green-200' : 'border-2 border-orange-200'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-slate-800">{formName}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    completedCount === forms.length 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {completedCount}/{forms.length}
                                  </span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 ml-4 space-y-2">
                                  {forms.map((form, idx) => (
                                    <div 
                                      key={idx} 
                                      className={`p-3 rounded-lg flex items-center justify-between ${
                                        form.completed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                      }`}
                                    >
                                      <div>
                                        <p className="font-medium text-slate-800">{form.employeeName}</p>
                                        <p className="text-xs text-slate-500">
                                          Turno {form.shiftSequence === 'first' ? 'mattina' : 'sera'}: {formatShiftTime(form.shift?.scheduled_start)} - {formatShiftTime(form.shift?.scheduled_end)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Compilazione: {form.shiftTiming === 'start' ? 'Inizio turno' : 'Fine turno'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {form.completed ? (
                                          <>
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" /> Completato
                                            </span>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setViewingCompletion({ form, storeName }); }}
                                              className="nav-button p-2 rounded-lg"
                                              title="Visualizza dettagli"
                                            >
                                              <Eye className="w-4 h-4 text-blue-600" />
                                            </button>
                                          </>
                                        ) : (
                                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Mancante
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </NeumorphicCard>
              ))
            )}
          </>
        )}

        {activeTab === 'config' && (
          <>
            <div className="flex justify-end">
              <NeumorphicButton
                onClick={() => setShowConfigForm(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuova Assegnazione
              </NeumorphicButton>
            </div>

            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Assegnazioni Form
              </h2>
              
              <p className="text-sm text-slate-600 mb-4 p-3 bg-blue-50 rounded-lg">
                ℹ️ Configura quali form devono compilare i dipendenti in base al loro ruolo, 
                al momento del turno (inizio/fine) e se è il primo o secondo turno della giornata.
              </p>

              {configs.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessuna assegnazione configurata</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {configs.map(config => (
                    <NeumorphicCard key={config.id} className={`p-4 ${!config.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800 mb-2">{config.form_name}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                            <div className="neumorphic-pressed p-2 rounded-lg">
                              <p className="text-slate-500">Ruoli</p>
                              <p className="font-medium text-slate-700">
                                {config.assigned_roles?.length > 0 
                                  ? config.assigned_roles.join(', ') 
                                  : 'Tutti'}
                              </p>
                            </div>
                            <div className="neumorphic-pressed p-2 rounded-lg">
                              <p className="text-slate-500">Momento</p>
                              <p className="font-medium text-slate-700">
                                {(config.shift_based_timing?.[0] || config.shift_timing) === 'start' 
                                  ? '🔵 Inizio turno' 
                                  : '🟢 Fine turno'}
                              </p>
                            </div>
                            <div className="neumorphic-pressed p-2 rounded-lg">
                              <p className="text-slate-500">Turno</p>
                              <p className="font-medium text-slate-700">
                                {(() => {
                                  const seqs = config.shift_sequences || (config.shift_sequence ? [config.shift_sequence] : ['first']);
                                  if (seqs.includes('first') && seqs.includes('second')) return '☀️🌙 Entrambi';
                                  if (seqs.includes('second')) return '🌙 Sera';
                                  return '☀️ Mattina';
                                })()}
                              </p>
                            </div>
                            <div className="neumorphic-pressed p-2 rounded-lg">
                              <p className="text-slate-500">Giorni</p>
                              <p className="font-medium text-slate-700 text-xs">
                                {(() => {
                                  const days = config.days_of_week || [];
                                  if (days.length === 0) return 'Tutti';
                                  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
                                  return days.map(d => dayNames[d]).join(', ');
                                })()}
                              </p>
                            </div>
                            <div className="neumorphic-pressed p-2 rounded-lg">
                              <p className="text-slate-500">Stato</p>
                              <p className={`font-medium ${config.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                {config.is_active ? '✓ Attivo' : '✗ Disattivo'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditConfig(config)}
                            className="nav-button p-2 rounded-lg"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Eliminare questa assegnazione?')) {
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
                  ))}
                </div>
              )}
            </NeumorphicCard>
          </>
        )}

        {/* Config Form Modal */}
        {showConfigForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingConfig ? 'Modifica Assegnazione' : 'Nuova Assegnazione'}
                  </h2>
                  <button onClick={resetConfigForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmitConfig} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Form da assegnare
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
                      Ruoli che devono compilare (vuoto = tutti)
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

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Momento del turno
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfigForm({ ...configForm, shift_timing: 'start' })}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          configForm.shift_timing === 'start'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'nav-button text-slate-700'
                        }`}
                      >
                        🔵 Inizio Turno
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfigForm({ ...configForm, shift_timing: 'end' })}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          configForm.shift_timing === 'end'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'nav-button text-slate-700'
                        }`}
                      >
                        🟢 Fine Turno
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Quale turno della giornata (puoi selezionare entrambi)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const seqs = configForm.shift_sequences || [];
                          if (seqs.includes('first')) {
                            setConfigForm({ ...configForm, shift_sequences: seqs.filter(s => s !== 'first') });
                          } else {
                            setConfigForm({ ...configForm, shift_sequences: [...seqs, 'first'] });
                          }
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          configForm.shift_sequences?.includes('first')
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'nav-button text-slate-700'
                        }`}
                      >
                        ☀️ Primo Turno (Mattina)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const seqs = configForm.shift_sequences || [];
                          if (seqs.includes('second')) {
                            setConfigForm({ ...configForm, shift_sequences: seqs.filter(s => s !== 'second') });
                          } else {
                            setConfigForm({ ...configForm, shift_sequences: [...seqs, 'second'] });
                          }
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          configForm.shift_sequences?.includes('second')
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'nav-button text-slate-700'
                        }`}
                      >
                        🌙 Secondo Turno (Sera)
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Per ogni dipendente, il primo turno è quello che inizia prima nella giornata
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Giorni della settimana (vuoto = tutti i giorni)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 1, label: 'Lun' },
                        { value: 2, label: 'Mar' },
                        { value: 3, label: 'Mer' },
                        { value: 4, label: 'Gio' },
                        { value: 5, label: 'Ven' },
                        { value: 6, label: 'Sab' },
                        { value: 0, label: 'Dom' }
                      ].map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const days = configForm.days_of_week || [];
                            if (days.includes(day.value)) {
                              setConfigForm({ ...configForm, days_of_week: days.filter(d => d !== day.value) });
                            } else {
                              setConfigForm({ ...configForm, days_of_week: [...days, day.value] });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            configForm.days_of_week?.includes(day.value)
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'nav-button text-slate-700'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="config-active"
                      checked={configForm.is_active}
                      onChange={(e) => setConfigForm({ ...configForm, is_active: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <label htmlFor="config-active" className="text-sm font-medium text-slate-700">
                      Assegnazione attiva
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <NeumorphicButton type="button" onClick={resetConfigForm} className="flex-1">
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton type="submit" variant="primary" className="flex-1 flex items-center justify-center gap-2">
                      <Save className="w-5 h-5" />
                      {editingConfig ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
            </div>
          </div>
        )}

        {/* View Completion Modal */}
        {viewingCompletion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800">
                    Dettaglio Compilazione
                  </h2>
                  <button onClick={() => setViewingCompletion(null)} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="neumorphic-pressed p-4 rounded-xl">
                      <p className="text-xs text-slate-500">Form</p>
                      <p className="font-bold text-slate-800">{viewingCompletion.form.config.form_name}</p>
                    </div>
                    <div className="neumorphic-pressed p-4 rounded-xl">
                      <p className="text-xs text-slate-500">Dipendente</p>
                      <p className="font-bold text-slate-800">{viewingCompletion.form.employeeName}</p>
                    </div>
                    <div className="neumorphic-pressed p-4 rounded-xl">
                      <p className="text-xs text-slate-500">Locale</p>
                      <p className="font-bold text-slate-800">{viewingCompletion.storeName}</p>
                    </div>
                    <div className="neumorphic-pressed p-4 rounded-xl">
                      <p className="text-xs text-slate-500">Turno</p>
                      <p className="font-bold text-slate-800">
                        {formatShiftTime(viewingCompletion.form.shift?.scheduled_start)} - {formatShiftTime(viewingCompletion.form.shift?.scheduled_end)}
                      </p>
                    </div>
                  </div>

                  {viewingCompletion.form.completionData && (
                    <div className="neumorphic-pressed p-4 rounded-xl">
                      <p className="text-sm font-medium text-slate-700 mb-3">Dati Compilazione:</p>
                      <div className="space-y-2 text-sm">
                        {Object.entries(viewingCompletion.form.completionData).map(([key, value]) => {
                          // Skip internal fields
                          if (['id', 'created_date', 'updated_date', 'created_by'].includes(key)) return null;
                          
                          // Format the key
                          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          
                          // Format the value
                          let formattedValue = value;
                          if (typeof value === 'boolean') {
                            formattedValue = value ? 'Sì' : 'No';
                          } else if (value === null || value === undefined) {
                            formattedValue = '-';
                          } else if (typeof value === 'object') {
                            formattedValue = JSON.stringify(value);
                          }

                          return (
                            <div key={key} className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="text-slate-600">{formattedKey}:</span>
                              <span className="font-medium text-slate-800">{String(formattedValue)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </NeumorphicCard>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}