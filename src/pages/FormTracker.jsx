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
      console.log('=== FETCHING SHIFTS FROM TurnoPlanday FOR DATE:', selectedDate);
      
      // Fetch shifts for selected date
      const shifts = await base44.entities.TurnoPlanday.filter({
        data: selectedDate
      });
      
      console.log('=== LOADED SHIFTS:', shifts.length);
      if (shifts.length > 0) {
        console.log('Shifts:', shifts);
      } else {
        console.warn('❌ NO SHIFTS FOUND FOR DATE:', selectedDate);
      }
      
      return shifts;
    },
    enabled: !!selectedDate
  });

  // Just use all shifts from the query (already filtered by date)
  const shiftsForDate = turniPlanday;

  // Group shifts by store
  const shiftsByStore = useMemo(() => {
    const grouped = {};

    shiftsForDate.forEach(shift => {
      const storeName = shift.store_name || 'Senza Store';
      if (selectedStore && selectedStore !== storeName) return;

      if (!grouped[storeName]) {
        grouped[storeName] = [];
      }
      grouped[storeName].push(shift);
    });

    console.log('Shifts grouped by store:', grouped);
    return grouped;
  }, [shiftsForDate, selectedStore]);

  const toggleFormExpand = (formName) => {
    setExpandedForms(prev => ({
      ...prev,
      [formName]: !prev[formName]
    }));
  };

  const formatShiftTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    // If it's already in HH:MM format, return it
    if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
    // If it's a date-time string, extract time
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

            {/* Debug Info */}
            {!loadingTurni && (
              <NeumorphicCard className="p-4 bg-blue-50 border-2 border-blue-200">
                <p className="text-sm font-bold text-blue-900 mb-2">📊 Statistiche</p>
                <div className="space-y-1 text-xs text-blue-800">
                  <p>• Turni trovati per il <strong>{selectedDate}</strong>: <strong>{turniPlanday.length}</strong></p>
                  <p>• Locali: <strong>{Object.keys(shiftsByStore).length}</strong></p>
                  {turniPlanday.length > 0 && (
                    <p className="mt-2 pt-2 border-t border-blue-300">
                      ✅ Turni caricati correttamente dalla tabella TurnoPlanday
                    </p>
                  )}
                </div>
              </NeumorphicCard>
            )}

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
                          <div className="flex items-start justify-between gap-3">
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
                              {shift.timbrata_entrata && (
                                <span className="text-xs text-green-600">✓ Entrata</span>
                              )}
                              {shift.timbrata_uscita && (
                                <span className="text-xs text-green-600">✓ Uscita</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </NeumorphicCard>
              ))
            )}


      </div>
    </ProtectedPage>
  );
}