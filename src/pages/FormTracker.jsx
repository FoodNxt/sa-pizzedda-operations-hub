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
      console.log('=== FETCHING SHIFTS FOR DATE:', selectedDate);
      
      // Get all shifts around the selected date (7 days before and after for safety)
      const date = new Date(selectedDate);
      const weekBefore = new Date(date);
      weekBefore.setDate(weekBefore.getDate() - 7);
      const weekAfter = new Date(date);
      weekAfter.setDate(weekAfter.getDate() + 7);
      
      console.log('Date range:', {
        from: weekBefore.toISOString().split('T')[0],
        to: weekAfter.toISOString().split('T')[0],
        selectedDate: selectedDate
      });
      
      const shifts = await base44.entities.TurnoPlanday.filter({
        data: {
          $gte: weekBefore.toISOString().split('T')[0],
          $lte: weekAfter.toISOString().split('T')[0]
        }
      });
      
      console.log('=== LOADED SHIFTS FROM PLANDAY:', shifts.length);
      console.log('First 5 shifts:', shifts.slice(0, 5));
      console.log('Shifts for selected date:', shifts.filter(s => s.data?.split('T')[0] === selectedDate).length);
      
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

  // Get shifts for selected date - simplified to just show all shifts
  const shiftsForDate = useMemo(() => {
    if (!selectedDate) {
      console.log('❌ No selectedDate');
      return [];
    }

    console.log('\n=== FILTERING SHIFTS FOR DATE:', selectedDate);
    console.log('Total shifts available:', turniPlanday.length);

    const shifts = turniPlanday.filter(s => {
      const shiftDate = s.data ? s.data.split('T')[0] : null;
      const normalizedSelectedDate = selectedDate.split('T')[0];

      console.log('Checking shift:', {
        shiftDate,
        normalizedSelectedDate,
        match: shiftDate === normalizedSelectedDate,
        store_name: s.store_name,
        dipendente_nome: s.dipendente_nome,
        stato: s.stato,
        tipo_turno: s.tipo_turno
      });

      if (shiftDate !== normalizedSelectedDate) {
        console.log('  ❌ Date mismatch');
        return false;
      }
      if (!s.store_name || s.store_name.trim() === '') {
        console.log('  ❌ No store_name');
        return false;
      }
      if (!s.dipendente_nome || s.dipendente_nome.trim() === '') {
        console.log('  ❌ No dipendente_nome');
        return false;
      }

      const stato = (s.stato || '').toLowerCase();
      if (stato === 'cancellato' || stato === 'cancelled') {
        console.log('  ❌ Cancelled');
        return false;
      }

      const tipoTurno = (s.tipo_turno || '').toLowerCase();
      if (tipoTurno.includes('malattia') || tipoTurno.includes('ferie') || tipoTurno.includes('assenza')) {
        console.log('  ❌ Leave/absence');
        return false;
      }

      console.log('  ✅ Valid shift');
      return true;
    });

    console.log('=== FILTERED SHIFTS:', shifts.length);
    if (shifts.length > 0) {
      console.log('Sample filtered shifts:', shifts.slice(0, 3));
    }
    
    return shifts;
  }, [selectedDate, turniPlanday]);

  // Group shifts by store
  const shiftsByStore = useMemo(() => {
    const grouped = {};

    shiftsForDate.forEach(shift => {
      const storeName = shift.store_name || '';
      if (selectedStore && selectedStore !== storeName) return;

      if (!grouped[storeName]) {
        grouped[storeName] = [];
      }
      grouped[storeName].push(shift);
    });

    return grouped;
  }, [shiftsForDate, selectedStore]);

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
                  <ClipboardCheck className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-purple-600">{strutturaSchemi.length}</h3>
                <p className="text-xs text-slate-500">Schemi Attivi</p>
              </NeumorphicCard>
            </div>

            {/* Debug Info */}
            <NeumorphicCard className="p-4 bg-yellow-50 border-2 border-yellow-200">
              <p className="text-sm font-bold text-yellow-900 mb-2">🔍 Debug Info (apri la console per più dettagli)</p>
              <div className="space-y-1 text-xs text-yellow-800">
                <p>• Turni caricati da Planday: <strong>{turniPlanday.length}</strong></p>
                <p>• Data selezionata: <strong>{selectedDate}</strong></p>
                <p>• Turni dopo filtro: <strong>{shiftsForDate.length}</strong></p>
                <p>• Locali con turni: <strong>{Object.keys(shiftsByStore).length}</strong></p>
                {turniPlanday.length > 0 && (
                  <p className="mt-2 pt-2 border-t border-yellow-300">
                    📋 Esempio turno: {turniPlanday[0]?.dipendente_nome} - {turniPlanday[0]?.store_name} - {turniPlanday[0]?.data}
                  </p>
                )}
              </div>
            </NeumorphicCard>

            {/* Shifts List by Store */}
            {loadingTurni ? (
              <NeumorphicCard className="p-6 text-center">
                <p className="text-slate-500">Caricamento turni...</p>
              </NeumorphicCard>
            ) : Object.keys(shiftsByStore).length === 0 ? (
              <NeumorphicCard className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun turno trovato per questa data</p>
                <p className="text-xs text-slate-400 mt-2">
                  Verifica che ci siano turni in Planday per il {selectedDate}
                </p>
                <p className="text-xs text-blue-600 mt-4">
                  💡 Apri la console del browser (F12) per vedere i log di debug dettagliati
                </p>
              </NeumorphicCard>
            ) : (
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
                    <div className="mt-4 space-y-2">
                      {storeShifts.map((shift, idx) => (
                        <div 
                          key={idx} 
                          className="neumorphic-pressed p-4 rounded-xl"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-slate-800">{shift.dipendente_nome}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500">
                                  {shift.ruolo || 'Nessun ruolo'}
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-500">
                                  {formatShiftTime(shift.orario_inizio)} - {formatShiftTime(shift.orario_fine)}
                                </span>
                                {shift.tipo_turno && (
                                  <>
                                    <span className="text-xs text-slate-400">•</span>
                                    <span className="text-xs text-slate-500">{shift.tipo_turno}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                shift.stato === 'completato' 
                                  ? 'bg-green-100 text-green-700'
                                  : shift.stato === 'in_corso'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {shift.stato || 'programmato'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
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