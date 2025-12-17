import React, { useState, useMemo } from "react";
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
    // Default: today (shifts are now loaded from Planday directly)
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [selectedStore, setSelectedStore] = useState('');
  const [viewingCompletion, setViewingCompletion] = useState(null);
  const [expandedForms, setExpandedForms] = useState({});
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
      // Get all shifts around the selected date (7 days before and after for safety)
      const date = new Date(selectedDate);
      const weekBefore = new Date(date);
      weekBefore.setDate(weekBefore.getDate() - 7);
      const weekAfter = new Date(date);
      weekAfter.setDate(weekAfter.getDate() + 7);
      
      const shifts = await base44.entities.TurnoPlanday.filter({
        data: {
          $gte: weekBefore.toISOString().split('T')[0],
          $lte: weekAfter.toISOString().split('T')[0]
        }
      });
      
      console.log('Loaded shifts from Planday:', shifts.length);
      console.log('Sample shifts:', shifts.slice(0, 3));
      
      return shifts;
    },
  });

  const { data: strutturaSchemi = [] } = useQuery({
    queryKey: ['struttura-turno'],
    queryFn: () => base44.entities.StrutturaTurno.filter({ is_active: true }),
  });

  // Fetch form completions data
  const { data: cleaningInspections = [] } = useQuery({
    queryKey: ['cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date', 500),
  });

  const { data: inventarioRilevazioni = [] } = useQuery({
    queryKey: ['inventario-rilevazioni'],
    queryFn: () => base44.entities.RilevazioneInventario.list('-data_rilevazione', 500),
  });

  const { data: conteggiCassa = [] } = useQuery({
    queryKey: ['conteggi-cassa'],
    queryFn: () => base44.entities.ConteggioCassa.list('-data_conteggio', 500),
  });

  const { data: teglieButtate = [] } = useQuery({
    queryKey: ['teglie-buttate'],
    queryFn: () => base44.entities.TeglieButtate.list('-data_rilevazione', 500),
  });

  const { data: preparazioni = [] } = useQuery({
    queryKey: ['preparazioni'],
    queryFn: () => base44.entities.Preparazioni.list('-data_rilevazione', 500),
  });

  const { data: gestioneImpasti = [] } = useQuery({
    queryKey: ['gestione-impasti'],
    queryFn: () => base44.entities.GestioneImpasti.list('-data_creazione', 500),
  });

  // Helper to normalize names for matching
  const normalizeNameForMatch = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  // Check if two names match (exact or partial)
  const namesMatch = (name1, name2) => {
    const n1 = normalizeNameForMatch(name1);
    const n2 = normalizeNameForMatch(name2);
    
    if (n1 === n2) return true;
    
    // Check if one contains the other
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Check word-by-word match (first name, last name)
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');
    
    // If at least 2 words match, consider it a match
    const matchingWords = words1.filter(w => words2.includes(w) && w.length > 2);
    if (matchingWords.length >= 2) return true;
    
    return false;
  };

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
  };

  // Calculate expected vs completed forms based on StrutturaTurno
  const formStatus = useMemo(() => {
    if (!selectedDate) return { byStore: {}, summary: { total: 0, completed: 0, missing: 0 } };

    const byStore = {};
    let totalExpected = 0;
    let totalCompleted = 0;
    const selectedDayOfWeek = new Date(selectedDate).getDay();

    console.log('FormTracker - Selected date:', selectedDate);
    console.log('FormTracker - Total shifts in Planday:', turniPlanday.length);
    console.log('FormTracker - Sample shift:', turniPlanday[0]);

    // Get shifts for selected date
    const shiftsForDate = turniPlanday.filter(s => {
      // Normalize both dates to YYYY-MM-DD format for comparison
      const shiftDate = s.data ? s.data.split('T')[0] : null;
      const normalizedSelectedDate = selectedDate.split('T')[0];
      
      if (shiftDate !== normalizedSelectedDate) return false;
      if (!s.store_name || s.store_name.trim() === '') return false;
      if (!s.dipendente_nome || s.dipendente_nome.trim() === '') return false;
      const stato = (s.stato || '').toLowerCase();
      const tipoTurno = (s.tipo_turno || '').toLowerCase();
      if (stato === 'cancellato' || stato === 'cancelled') return false;
      if (tipoTurno.includes('malattia') || tipoTurno.includes('ferie') || tipoTurno.includes('assenza')) {
        return false;
      }
      return true;
    });

    console.log('FormTracker - Filtered shifts for date:', shiftsForDate.length);
    console.log('FormTracker - Sample filtered shift:', shiftsForDate[0]);

    // Group shifts by store
    const shiftsByStore = {};
    shiftsForDate.forEach(shift => {
      const storeName = shift.store_name || '';
      if (!shiftsByStore[storeName]) {
        shiftsByStore[storeName] = [];
      }
      shiftsByStore[storeName].push(shift);
    });

    // For each store with shifts
    Object.entries(shiftsByStore).forEach(([storeName, storeShifts]) => {
      if (selectedStore && selectedStore !== storeName) return;

      byStore[storeName] = { forms: [], completed: 0, missing: 0 };

      // Process each shift
      storeShifts.forEach(shift => {
        const employeeName = shift.dipendente_nome;
        const ruolo = shift.ruolo;
        const storeEntity = stores.find(s => s.name === storeName);

        console.log(`\n=== Analyzing shift ===`);
        console.log('Employee:', employeeName);
        console.log('Role:', ruolo);
        console.log('Store:', storeName, 'Store ID:', storeEntity?.id);
        console.log('Day of week:', selectedDayOfWeek, '(0=Sunday)');
        console.log('Tipo turno:', shift.tipo_turno);

        // Find applicable struttura schemas for this shift
        const applicableSchemas = strutturaSchemi.filter(schema => {
          console.log('\nChecking schema:', schema.nome_schema);
          console.log('  Schema day:', schema.giorno_settimana, 'vs Shift day:', selectedDayOfWeek);
          
          // Check day of week
          if (schema.giorno_settimana !== selectedDayOfWeek) {
            console.log('  ❌ Day mismatch');
            return false;
          }
          
          console.log('  Schema role:', schema.ruolo, 'vs Shift role:', ruolo);
          
          // Check role
          if (schema.ruolo !== ruolo) {
            console.log('  ❌ Role mismatch');
            return false;
          }
          
          // Check store assignment
          const assignedStores = schema.assigned_stores || [];
          console.log('  Schema stores:', assignedStores.length === 0 ? 'ALL' : assignedStores);
          if (assignedStores.length > 0 && storeEntity && !assignedStores.includes(storeEntity.id)) {
            console.log('  ❌ Store not assigned');
            return false;
          }
          
          // Check tipo turno (if specified in schema)
          const tipiTurno = schema.tipi_turno || [];
          console.log('  Schema tipo turni:', tipiTurno.length === 0 ? 'ALL' : tipiTurno);
          if (tipiTurno.length > 0 && shift.tipo_turno && !tipiTurno.includes(shift.tipo_turno)) {
            console.log('  ❌ Tipo turno mismatch');
            return false;
          }
          
          console.log('  ✅ Schema matches!');
          return true;
        });

        console.log(`\n➡️ Found ${applicableSchemas.length} matching schemas for ${employeeName}`);

        // For each schema, extract slots that require forms
        applicableSchemas.forEach(schema => {
          const slots = schema.slots || [];
          console.log(`  Schema ${schema.nome_schema} has ${slots.length} slots`);
          
          const formSlots = slots.filter(s => s.richiede_form && s.form_page);
          console.log(`    ${formSlots.length} slots require forms`);
          
          slots.forEach(slot => {
            if (slot.richiede_form && slot.form_page) {
              console.log(`    📋 Form required: ${slot.form_page} (${slot.attivita})`);
              totalExpected++;
              
              // Check if form was completed
              const isCompleted = checkFormCompletion(
                slot.form_page,
                employeeName,
                storeName,
                selectedDate,
                shift
              );

              const formEntry = {
                formName: slot.attivita || slot.form_page,
                formPage: slot.form_page,
                employeeName,
                shift,
                slot,
                schema,
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
  }, [selectedDate, selectedStore, strutturaSchemi, turniPlanday, stores, cleaningInspections, inventarioRilevazioni, conteggiCassa, teglieButtate, preparazioni, gestioneImpasti]);

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

            {/* Debug info */}
            {loadingTurni && (
              <NeumorphicCard className="p-6 text-center">
                <p className="text-slate-500">Caricamento turni...</p>
              </NeumorphicCard>
            )}

            {!loadingTurni && (
              <NeumorphicCard className="p-4 bg-blue-50">
                <p className="text-xs text-slate-600">
                  <strong>Debug Info:</strong><br/>
                  Turni totali caricati: {turniPlanday.length}<br/>
                  Turni per {selectedDate}: {turniPlanday.filter(s => s.data?.split('T')[0] === selectedDate.split('T')[0]).length}<br/>
                  Schemi StrutturaTurno attivi: {strutturaSchemi.length}<br/>
                  Form trovati: {formStatus.summary.total}
                </p>
              </NeumorphicCard>
            )}

            {/* Results by Store */}
            {!loadingTurni && Object.keys(formStatus.byStore).length === 0 ? (
              <NeumorphicCard className="p-12 text-center">
                <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun turno trovato per questa data</p>
                <p className="text-xs text-slate-400 mt-2">
                  Verifica che ci siano turni in Planday per il {selectedDate} e che esistano schemi in StrutturaTurno
                </p>
              </NeumorphicCard>
            ) : !loadingTurni && (
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
                         const name = f.formName || 'Form senza nome';
                         if (!formsByName[name]) {
                           formsByName[name] = [];
                         }
                         formsByName[name].push(f);
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
                        <div className="flex-1">
                        <p className="font-medium text-slate-800">{form.employeeName}</p>
                        <p className="text-xs text-slate-500">
                          {form.shift?.ruolo} - {formatShiftTime(form.shift?.orario_inizio)} - {formatShiftTime(form.shift?.orario_fine)}
                        </p>
                        {form.slot && (
                          <p className="text-xs text-slate-400">
                            {form.slot.attivita} {form.slot.ora_inizio && `(${form.slot.ora_inizio})`}
                          </p>
                        )}
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
                      <p className="font-bold text-slate-800">{viewingCompletion.form.formName}</p>
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
                        {formatShiftTime(viewingCompletion.form.shift?.orario_inizio)} - {formatShiftTime(viewingCompletion.form.shift?.orario_fine)}
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