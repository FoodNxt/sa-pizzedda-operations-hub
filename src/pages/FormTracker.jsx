import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ClipboardCheck, Plus, Edit, Trash2, Save, X, AlertTriangle, CheckCircle, Calendar, Eye, ChevronDown, ChevronUp, Store, Users, Settings } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function FormTracker() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [selectedStore, setSelectedStore] = useState('');
  const [activeView, setActiveView] = useState('stores');
  const [expandedStores, setExpandedStores] = useState({});

  const queryClient = useQueryClient();

  // Fetch data
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: turniPlanday = [], isLoading: loadingTurni } = useQuery({
    queryKey: ['turni-planday', selectedDate],
    queryFn: async () => {
      const shifts = await base44.entities.TurnoPlanday.filter({
        data: selectedDate
      });
      return shifts;
    },
    enabled: !!selectedDate
  });

  const { data: strutturaSchemi = [] } = useQuery({
    queryKey: ['struttura-turno'],
    queryFn: () => base44.entities.StrutturaTurno.filter({ is_active: true }),
  });

  const { data: cleaningInspections = [] } = useQuery({
    queryKey: ['cleaning-inspections', selectedDate],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date', 200),
  });

  const { data: inventarioRilevazioni = [] } = useQuery({
    queryKey: ['inventario-rilevazioni', selectedDate],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 200),
  });

  const { data: conteggiCassa = [] } = useQuery({
    queryKey: ['conteggi-cassa', selectedDate],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio', 200),
  });

  const { data: teglieButtate = [] } = useQuery({
    queryKey: ['teglie-buttate', selectedDate],
    queryFn: () => base44.entities.TeglieButtate.list('-data_rilevazione', 200),
  });

  const { data: preparazioni = [] } = useQuery({
    queryKey: ['preparazioni', selectedDate],
    queryFn: () => base44.entities.Preparazioni.list('-data_rilevazione', 200),
  });

  const { data: gestioneImpasti = [] } = useQuery({
    queryKey: ['gestione-impasti', selectedDate],
    queryFn: () => base44.entities.GestioneImpasti.list('-data_creazione', 200),
  });

  const { data: attivitaCompletate = [] } = useQuery({
    queryKey: ['attivita-completate', selectedDate],
    queryFn: () => base44.entities.AttivitaCompletata.filter({
      turno_data: selectedDate
    }),
  });

  // Just use all shifts from the query (already filtered by date)
  const shiftsForDate = turniPlanday;

  const timeToMinutes = useCallback((timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  const normalizeNameForMatch = useCallback((name) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }, []);

  const namesMatch = useCallback((name1, name2) => {
    const n1 = normalizeNameForMatch(name1);
    const n2 = normalizeNameForMatch(name2);
    if (n1 === n2) return true;
    if (n1.includes(n2) || n2.includes(n1)) return true;
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');
    const matchingWords = words1.filter(w => words2.includes(w) && w.length > 2);
    if (matchingWords.length >= 2) return true;
    return false;
  }, [normalizeNameForMatch]);

  const checkFormCompletion = useCallback((formPage, employeeName, storeName, date, turnoId, posizioneTurno = null) => {
    // METODO PRINCIPALE: Controlla AttivitaCompletata per turno_id e form_page
    if (turnoId) {
      const completata = attivitaCompletate.find(ac => {
        // Match turno_id e form_page
        if (ac.turno_id !== turnoId || ac.form_page !== formPage) return false;
        
        // Se è specificata una posizione_turno (inizio/fine), deve matchare
        if (posizioneTurno) {
          return ac.posizione_turno === posizioneTurno;
        }
        
        // Se non è specificata posizione_turno, accetta qualsiasi
        return true;
      });
      if (completata) {
        return { completed: true, data: completata };
      }
    }

    // FALLBACK: Vecchio metodo per retrocompatibilità
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
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
                 namesMatch(i.inspector_name, employeeName) &&
                 inspDate >= dateStart && inspDate <= nextDayEnd;
        });
        return { completed: !!inspection, data: inspection };
      }
      case 'FormInventario': {
        const rilevazione = inventarioRilevazioni.find(r => {
          const rilDate = new Date(r.data_rilevazione);
          return r.store_name === storeName &&
                 namesMatch(r.rilevato_da, employeeName) &&
                 rilDate >= dateStart && rilDate <= nextDayEnd;
        });
        return { completed: !!rilevazione, data: rilevazione };
      }
      case 'ConteggioCassa': {
        const conteggio = conteggiCassa.find(c => {
          const contDate = new Date(c.data_conteggio);
          return c.store_name === storeName &&
                 namesMatch(c.rilevato_da, employeeName) &&
                 contDate >= dateStart && contDate <= nextDayEnd;
        });
        return { completed: !!conteggio, data: conteggio };
      }
      case 'FormTeglieButtate': {
        const teglie = teglieButtate.find(t => {
          const tegDate = new Date(t.data_rilevazione);
          return t.store_name === storeName &&
                 namesMatch(t.rilevato_da, employeeName) &&
                 tegDate >= dateStart && tegDate <= nextDayEnd;
        });
        return { completed: !!teglie, data: teglie };
      }
      case 'FormPreparazioni': {
        const prep = preparazioni.find(p => {
          const prepDate = new Date(p.data_rilevazione);
          return p.store_name === storeName &&
                 namesMatch(p.rilevato_da, employeeName) &&
                 prepDate >= dateStart && prepDate <= nextDayEnd;
        });
        return { completed: !!prep, data: prep };
      }
      case 'Impasto': {
        const impasto = gestioneImpasti.find(i => {
          const impDate = new Date(i.data_creazione);
          return i.store_name === storeName &&
                 namesMatch(i.creato_da, employeeName) &&
                 impDate >= dateStart && impDate <= nextDayEnd;
        });
        return { completed: !!impasto, data: impasto };
      }
      default:
        return { completed: false, data: null };
    }
  }, [attivitaCompletate, cleaningInspections, inventarioRilevazioni, conteggiCassa, teglieButtate, preparazioni, gestioneImpasti, namesMatch]);

  const getFormName = useCallback((formPage) => {
    const names = {
      'ControlloPuliziaCassiere': 'Pulizia Cassiere',
      'ControlloPuliziaPizzaiolo': 'Pulizia Pizzaiolo',
      'ControlloPuliziaStoreManager': 'Pulizia SM',
      'FormInventario': 'Inventario',
      'ConteggioCassa': 'Conteggio Cassa',
      'FormTeglieButtate': 'Teglie Buttate',
      'FormPreparazioni': 'Preparazioni',
      'Impasto': 'Impasto'
    };
    return names[formPage] || formPage;
  }, []);

  const getRequiredFormsForShift = useCallback((shift) => {
    if (!shift.ruolo) return [];
    
    const shiftStart = timeToMinutes(shift.ora_inizio);
    const shiftEnd = timeToMinutes(shift.ora_fine);
    const shiftDate = new Date(selectedDate);
    const dayOfWeek = shiftDate.getDay();
    
    // Find all schemas matching this shift's role and day
    const matchingSchemas = strutturaSchemi.filter(schema => {
      if (schema.ruolo !== shift.ruolo) return false;
      if (schema.giorno_settimana !== undefined && schema.giorno_settimana !== dayOfWeek) return false;
      
      // Check store assignment
      if (schema.assigned_stores && schema.assigned_stores.length > 0) {
        if (!shift.store_id || !schema.assigned_stores.includes(shift.store_id)) return false;
      }
      
      // Check tipo_turno
      if (schema.tipi_turno && schema.tipi_turno.length > 0) {
        if (!shift.tipo_turno || !schema.tipi_turno.includes(shift.tipo_turno)) return false;
      }
      
      return true;
    });
    
    const formsSet = new Set();
    
    matchingSchemas.forEach(schema => {
      if (!schema.slots) return;
      
      schema.slots.forEach(slot => {
        if (!slot.richiede_form || !slot.form_page) return;
        
        // Check if slot overlaps with shift time
        if (schema.usa_minuti_relativi) {
          // For relative minutes, always include if it's within shift duration
          if (slot.necessario_in_ogni_turno) {
            formsSet.add(slot.form_page);
          }
        } else {
          // For absolute times, check overlap
          const slotStart = timeToMinutes(slot.ora_inizio);
          const slotEnd = timeToMinutes(slot.ora_fine);
          
          // Check if there's overlap
          if (slotStart < shiftEnd && slotEnd > shiftStart) {
            formsSet.add(slot.form_page);
          }
        }
        
        // Always include if necessary in every shift
        if (slot.necessario_in_ogni_turno) {
          formsSet.add(slot.form_page);
        }
      });
    });
    
    return Array.from(formsSet).map(formPage => {
      const completion = checkFormCompletion(formPage, shift.dipendente_nome, shift.store_name, selectedDate);
      return {
        formPage,
        formName: getFormName(formPage),
        ...completion
      };
    });
  }, [strutturaSchemi, timeToMinutes, checkFormCompletion, getFormName, selectedDate]);

  // Group shifts by store (lookup store name from store_id if needed)
  const shiftsByStore = useMemo(() => {
    const grouped = {};

    shiftsForDate.forEach(shift => {
      let storeName = shift.store_name;
      
      if (!storeName && shift.store_id) {
        const store = stores.find(s => s.id === shift.store_id);
        storeName = store?.name || 'Senza Store';
      }
      
      if (!storeName) {
        storeName = 'Senza Store';
      }
      
      if (selectedStore && selectedStore !== storeName) return;

      if (!grouped[storeName]) {
        grouped[storeName] = [];
      }
      grouped[storeName].push({ ...shift, store_name: storeName });
    });

    return grouped;
  }, [shiftsForDate, selectedStore, stores]);

  const formsByStore = useMemo(() => {
    const grouped = {};

    shiftsForDate.forEach(shift => {
      let storeName = shift.store_name;
      
      if (!storeName && shift.store_id) {
        const store = stores.find(s => s.id === shift.store_id);
        storeName = store?.name || 'Senza Store';
      }
      
      if (!storeName) storeName = 'Senza Store';
      if (selectedStore && selectedStore !== storeName) return;

      const requiredForms = getRequiredFormsForShift(shift);
      
      if (!grouped[storeName]) {
        grouped[storeName] = {};
      }

      requiredForms.forEach(form => {
        if (!grouped[storeName][form.formPage]) {
          grouped[storeName][form.formPage] = {
            formPage: form.formPage,
            formName: form.formName,
            completions: []
          };
        }
        grouped[storeName][form.formPage].completions.push({
          employeeName: shift.dipendente_nome,
          completed: form.completed,
          data: form.data,
          turnoId: shift.id
        });
      });
    });

    return grouped;
  }, [shiftsForDate, selectedStore, stores, getRequiredFormsForShift]);

  const formatShiftTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
    try {
      return new Date(timeStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
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
                    <p className="text-xs text-blue-600 mt-2">
                      ℹ️ I turni sono ora caricati direttamente da Planday in tempo reale
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
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{shiftsForDate.length}</h3>
                <p className="text-xs text-slate-500">Turni Totali</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                  <Store className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-green-600">{Object.keys(shiftsByStore).length}</h3>
                <p className="text-xs text-slate-500">Locali</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-purple-600">{selectedDate}</h3>
                <p className="text-xs text-slate-500">Data Selezionata</p>
              </NeumorphicCard>
            </div>

            {/* View Tabs */}
            <NeumorphicCard className="p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveView('stores')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                    activeView === 'stores'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Store className="w-4 h-4 inline mr-2" />
                  Stores
                </button>
                <button
                  onClick={() => setActiveView('forms')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                    activeView === 'forms'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4 inline mr-2" />
                  Forms
                </button>
              </div>
            </NeumorphicCard>

            {/* Content based on active view */}
            {activeView === 'stores' && loadingTurni ? (
              <NeumorphicCard className="p-6 text-center">
                <p className="text-slate-500">Caricamento...</p>
              </NeumorphicCard>
            ) : activeView === 'stores' && Object.keys(shiftsByStore).length === 0 ? (
              <NeumorphicCard className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun turno trovato per questa data</p>
                <p className="text-xs text-slate-400 mt-2">
                  Verifica che ci siano turni in Planday per il {selectedDate}
                </p>
                <p className="text-xs text-blue-600 mt-4">
                  💡 Seleziona una data diversa o verifica che ci siano turni in Planday
                </p>
              </NeumorphicCard>
            ) : activeView === 'stores' ? (
              Object.entries(shiftsByStore).map(([storeName, storeShifts]) => (
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
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        {storeShifts.length} turni
                      </span>
                      {expandedStores[storeName] ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                    </div>
                  </button>

                  {/* Show shifts when expanded */}
                  {expandedStores[storeName] && (
                    <div className="mt-4 space-y-3">
                      {storeShifts.map((shift, idx) => {
                        const requiredForms = getRequiredFormsForShift(shift).map(form => ({
                          ...form,
                          ...checkFormCompletion(form.formPage, shift.dipendente_nome, shift.store_name || storeName, selectedDate, shift.id)
                        }));
                        const completedForms = requiredForms.filter(f => f.completed).length;
                        const totalForms = requiredForms.length;
                        
                        return (
                          <div 
                            key={idx} 
                            className="neumorphic-pressed p-4 rounded-xl"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 mb-1">{shift.dipendente_nome || 'Nessun nome'}</p>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                      {shift.ruolo || 'Nessun ruolo'}
                                    </span>
                                    {shift.tipo_turno && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                        {shift.tipo_turno}
                                      </span>
                                    )}
                                    {shift.momento_turno && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                        {shift.momento_turno}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-600 flex items-center gap-2">
                                    <span className="font-mono">{formatShiftTime(shift.ora_inizio)} - {formatShiftTime(shift.ora_fine)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                                  shift.stato === 'completato' 
                                    ? 'bg-green-100 text-green-700'
                                    : shift.stato === 'in_corso'
                                    ? 'bg-blue-100 text-blue-700'
                                    : shift.stato === 'annullato'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {shift.stato || 'programmato'}
                                </span>
                                {shift.timbratura_entrata && (
                                  <span className="text-xs text-green-600">✓ Entrata</span>
                                )}
                                {shift.timbratura_uscita && (
                                  <span className="text-xs text-green-600">✓ Uscita</span>
                                )}
                              </div>
                            </div>

                            {/* Required Forms */}
                            {totalForms > 0 && (
                              <div className="pt-3 border-t border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-medium text-slate-600">
                                    Form richiesti: {completedForms}/{totalForms}
                                  </p>
                                  <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    completedForms === totalForms 
                                      ? 'bg-green-100 text-green-700' 
                                      : completedForms > 0
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {completedForms === totalForms ? '✓ Completati' : `${completedForms}/${totalForms}`}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {requiredForms.map((form, fIdx) => (
                                    <div
                                      key={fIdx}
                                      className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                                        form.completed
                                          ? 'bg-green-50 text-green-700 border border-green-200'
                                          : 'bg-gray-50 text-gray-600 border border-gray-200'
                                      }`}
                                    >
                                      {form.completed ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                      {form.formName}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {totalForms === 0 && (
                              <div className="pt-3 border-t border-slate-200">
                                <p className="text-xs text-slate-500 italic">Nessun form richiesto per questo turno</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </NeumorphicCard>
              ))
            ) : (
              /* Forms View */
              Object.keys(formsByStore).length === 0 ? (
                <NeumorphicCard className="p-12 text-center">
                  <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun form richiesto per questa data</p>
                </NeumorphicCard>
              ) : (
                Object.entries(formsByStore).map(([storeName, forms]) => {
                  const formEntries = Object.values(forms);
                  const totalCompletions = formEntries.reduce((sum, f) => sum + f.completions.length, 0);
                  const completedCount = formEntries.reduce((sum, f) => 
                    sum + f.completions.filter(c => c.completed).length, 0
                  );
                  
                  return (
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
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            completedCount === totalCompletions
                              ? 'bg-green-100 text-green-700'
                              : completedCount > 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {completedCount}/{totalCompletions} completati
                          </span>
                          {expandedStores[storeName] ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                        </div>
                      </button>

                      {expandedStores[storeName] && (
                        <div className="mt-4 space-y-3">
                          {formEntries.map((form, idx) => {
                            const completed = form.completions.filter(c => c.completed).length;
                            const total = form.completions.length;
                            
                            return (
                              <div key={idx} className="neumorphic-pressed p-4 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-slate-800">{form.formName}</h3>
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    completed === total
                                      ? 'bg-green-100 text-green-700'
                                      : completed > 0
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {completed}/{total}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {form.completions.map((comp, cIdx) => (
                                    <div key={cIdx} className="flex items-center justify-between text-sm">
                                      <span className="text-slate-600">{comp.employeeName}</span>
                                      {comp.completed ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                          <CheckCircle className="w-4 h-4" />
                                          Completato
                                        </span>
                                      ) : (
                                        <span className="text-red-600 flex items-center gap-1">
                                          <AlertTriangle className="w-4 h-4" />
                                          Mancante
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </NeumorphicCard>
                  );
                })
              )
            )}


      </div>
    </ProtectedPage>
  );
}