import React, { useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, X, Save, Clock, 
  User, Store as StoreIcon, Trash2, Edit, Settings, Loader2, MapPin
} from "lucide-react";
import moment from "moment";
import "moment/locale/it";

moment.locale('it');

const RUOLI = ["Pizzaiolo", "Cassiere", "Store Manager"];
const COLORI_RUOLO = {
  "Pizzaiolo": "bg-orange-100 border-orange-300 text-orange-800",
  "Cassiere": "bg-blue-100 border-blue-300 text-blue-800",
  "Store Manager": "bg-purple-100 border-purple-300 text-purple-800"
};

export default function Planday() {
  const [selectedStore, setSelectedStore] = useState('');
  const [weekStart, setWeekStart] = useState(moment().startOf('isoWeek'));
  const [showForm, setShowForm] = useState(false);
  const [editingTurno, setEditingTurno] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [turnoForm, setTurnoForm] = useState({
    store_id: '',
    data: '',
    ora_inizio: '09:00',
    ora_fine: '17:00',
    ruolo: 'Pizzaiolo',
    dipendente_id: '',
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: turni = [], isLoading } = useQuery({
    queryKey: ['turni-planday', selectedStore, weekStart.format('YYYY-MM-DD')],
    queryFn: async () => {
      const startDate = weekStart.format('YYYY-MM-DD');
      const endDate = weekStart.clone().add(6, 'days').format('YYYY-MM-DD');
      
      const filters = {
        data: { $gte: startDate, $lte: endDate }
      };
      if (selectedStore) {
        filters.store_id = selectedStore;
      }
      return base44.entities.TurnoPlanday.filter(filters);
    },
    enabled: true,
  });

  const { data: config = null } = useQuery({
    queryKey: ['timbratura-config'],
    queryFn: async () => {
      const configs = await base44.entities.TimbraturaConfig.list();
      return configs[0] || { distanza_massima_metri: 100, tolleranza_ritardo_minuti: 5, abilita_timbratura_gps: true };
    },
  });

  const [configForm, setConfigForm] = useState({
    distanza_massima_metri: 100,
    tolleranza_ritardo_minuti: 0,
    abilita_timbratura_gps: true
  });

  // Stato per drag and drop
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [quickTurnoPopup, setQuickTurnoPopup] = useState(null);
  const [editingStore, setEditingStore] = useState(null);
  const [storeCoords, setStoreCoords] = useState({ latitude: '', longitude: '', address: '' });

  React.useEffect(() => {
    if (config) {
      setConfigForm({
        distanza_massima_metri: config.distanza_massima_metri || 100,
        tolleranza_ritardo_minuti: config.tolleranza_ritardo_minuti ?? 0,
        abilita_timbratura_gps: config.abilita_timbratura_gps !== false
      });
    }
  }, [config]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TurnoPlanday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-planday'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TurnoPlanday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-planday'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TurnoPlanday.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-planday'] });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      const configs = await base44.entities.TimbraturaConfig.list();
      if (configs.length > 0) {
        return base44.entities.TimbraturaConfig.update(configs[0].id, data);
      } else {
        return base44.entities.TimbraturaConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timbratura-config'] });
      setShowConfigModal(false);
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Store.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setEditingStore(null);
    },
  });

  const resetForm = () => {
    setTurnoForm({
      store_id: selectedStore || '',
      data: '',
      ora_inizio: '09:00',
      ora_fine: '17:00',
      ruolo: 'Pizzaiolo',
      dipendente_id: '',
      note: ''
    });
    setEditingTurno(null);
    setShowForm(false);
  };

  const handleEditTurno = (turno) => {
    setEditingTurno(turno);
    setTurnoForm({
      store_id: turno.store_id,
      data: turno.data,
      ora_inizio: turno.ora_inizio,
      ora_fine: turno.ora_fine,
      ruolo: turno.ruolo,
      dipendente_id: turno.dipendente_id || '',
      note: turno.note || ''
    });
    setShowForm(true);
  };

  const handleSaveTurno = () => {
    const dipendente = users.find(u => u.id === turnoForm.dipendente_id);
    const dataToSave = {
      ...turnoForm,
      dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || ''
    };

    if (editingTurno) {
      updateMutation.mutate({ id: editingTurno.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const handleCellClick = (date, hour) => {
    setTurnoForm({
      store_id: selectedStore || (stores[0]?.id || ''),
      data: date.format('YYYY-MM-DD'),
      ora_inizio: `${hour.toString().padStart(2, '0')}:00`,
      ora_fine: `${(hour + 4).toString().padStart(2, '0')}:00`,
      ruolo: 'Pizzaiolo',
      dipendente_id: '',
      note: ''
    });
    setShowForm(true);
  };

  // Gestione drag & drop
  const handleMouseDown = (day, hour) => {
    setDragStart({ day: day.format('YYYY-MM-DD'), hour });
    setDragEnd({ day: day.format('YYYY-MM-DD'), hour });
    setIsDragging(true);
  };

  const handleMouseEnter = (day, hour) => {
    if (isDragging && dragStart && day.format('YYYY-MM-DD') === dragStart.day) {
      setDragEnd({ day: day.format('YYYY-MM-DD'), hour });
    }
  };

  const handleMouseUp = (day, hour) => {
    if (isDragging && dragStart) {
      const startHour = Math.min(dragStart.hour, dragEnd?.hour || hour);
      const endHour = Math.max(dragStart.hour, dragEnd?.hour || hour) + 1;
      
      // Mostra popup per completare il turno
      setQuickTurnoPopup({
        day: dragStart.day,
        startHour,
        endHour
      });
      
      setTurnoForm({
        store_id: selectedStore || (stores[0]?.id || ''),
        data: dragStart.day,
        ora_inizio: `${startHour.toString().padStart(2, '0')}:00`,
        ora_fine: `${endHour.toString().padStart(2, '0')}:00`,
        ruolo: 'Pizzaiolo',
        dipendente_id: '',
        note: ''
      });
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isInDragRange = (day, hour) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    if (day.format('YYYY-MM-DD') !== dragStart.day) return false;
    const minHour = Math.min(dragStart.hour, dragEnd.hour);
    const maxHour = Math.max(dragStart.hour, dragEnd.hour);
    return hour >= minHour && hour <= maxHour;
  };

  const handleQuickSave = () => {
    const dipendente = users.find(u => u.id === turnoForm.dipendente_id);
    const dataToSave = {
      ...turnoForm,
      dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || ''
    };
    createMutation.mutate(dataToSave);
    setQuickTurnoPopup(null);
  };

  const handleEditStore = (store) => {
    setEditingStore(store);
    setStoreCoords({
      latitude: store.latitude || '',
      longitude: store.longitude || '',
      address: store.address || ''
    });
  };

  const handleSaveStoreCoords = () => {
    updateStoreMutation.mutate({
      id: editingStore.id,
      data: {
        latitude: storeCoords.latitude ? parseFloat(storeCoords.latitude) : null,
        longitude: storeCoords.longitude ? parseFloat(storeCoords.longitude) : null,
        address: storeCoords.address
      }
    });
  };

  // Filtra dipendenti per ruolo
  const filteredDipendenti = useMemo(() => {
    return users.filter(u => {
      const ruoli = u.ruoli_dipendente || [];
      return ruoli.includes(turnoForm.ruolo);
    });
  }, [users, turnoForm.ruolo]);

  // Genera giorni della settimana
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.clone().add(i, 'days'));
    }
    return days;
  }, [weekStart]);

  // Ore della giornata
  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 8:00 - 23:00

  // Raggruppa turni per giorno e ora
  const turniByDayHour = useMemo(() => {
    const grouped = {};
    turni.forEach(turno => {
      const key = `${turno.data}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(turno);
    });
    return grouped;
  }, [turni]);

  const getStoreName = (storeId) => stores.find(s => s.id === storeId)?.name || '';

  return (
    <ProtectedPage pageName="Planday">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Planday - Gestione Turni
            </h1>
            <p className="text-slate-500 mt-1">Pianifica i turni settimanali</p>
          </div>
          <div className="flex gap-2">
            <NeumorphicButton onClick={() => setShowConfigModal(true)} className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Impostazioni
            </NeumorphicButton>
          </div>
        </div>

        {/* Filtri e navigazione */}
        <NeumorphicCard className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Tutti i locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().subtract(1, 'week'))}>
                <ChevronLeft className="w-4 h-4" />
              </NeumorphicButton>
              <span className="px-4 py-2 font-medium text-slate-700">
                {weekStart.format('DD MMM')} - {weekStart.clone().add(6, 'days').format('DD MMM YYYY')}
              </span>
              <NeumorphicButton onClick={() => setWeekStart(weekStart.clone().add(1, 'week'))}>
                <ChevronRight className="w-4 h-4" />
              </NeumorphicButton>
              <NeumorphicButton onClick={() => setWeekStart(moment().startOf('isoWeek'))}>
                Oggi
              </NeumorphicButton>
            </div>

            <NeumorphicButton 
              onClick={() => {
                setTurnoForm({ ...turnoForm, store_id: selectedStore || (stores[0]?.id || '') });
                setShowForm(true);
              }} 
              variant="primary" 
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuovo Turno
            </NeumorphicButton>
          </div>
        </NeumorphicCard>

        {/* Form Turno */}
        {showForm && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {editingTurno ? 'Modifica Turno' : 'Nuovo Turno'}
              </h2>
              <button onClick={resetForm} className="nav-button p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Locale *</label>
                <select
                  value={turnoForm.store_id}
                  onChange={(e) => setTurnoForm({ ...turnoForm, store_id: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                >
                  <option value="">Seleziona locale</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Data *</label>
                <input
                  type="date"
                  value={turnoForm.data}
                  onChange={(e) => setTurnoForm({ ...turnoForm, data: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ruolo *</label>
                <select
                  value={turnoForm.ruolo}
                  onChange={(e) => setTurnoForm({ ...turnoForm, ruolo: e.target.value, dipendente_id: '' })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                >
                  {RUOLI.map(ruolo => (
                    <option key={ruolo} value={ruolo}>{ruolo}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Inizio *</label>
                <input
                  type="time"
                  value={turnoForm.ora_inizio}
                  onChange={(e) => setTurnoForm({ ...turnoForm, ora_inizio: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Fine *</label>
                <input
                  type="time"
                  value={turnoForm.ora_fine}
                  onChange={(e) => setTurnoForm({ ...turnoForm, ora_fine: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Dipendente</label>
                <select
                  value={turnoForm.dipendente_id}
                  onChange={(e) => setTurnoForm({ ...turnoForm, dipendente_id: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                >
                  <option value="">Non assegnato</option>
                  {filteredDipendenti.map(u => (
                    <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>
              <input
                type="text"
                value={turnoForm.note}
                onChange={(e) => setTurnoForm({ ...turnoForm, note: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                placeholder="Note opzionali..."
              />
            </div>

            <div className="flex gap-3">
              <NeumorphicButton onClick={resetForm} className="flex-1">Annulla</NeumorphicButton>
              <NeumorphicButton 
                onClick={handleSaveTurno} 
                variant="primary" 
                className="flex-1 flex items-center justify-center gap-2"
                disabled={!turnoForm.store_id || !turnoForm.data || !turnoForm.ora_inizio || !turnoForm.ora_fine}
              >
                <Save className="w-4 h-4" />
                Salva
              </NeumorphicButton>
            </div>
          </NeumorphicCard>
        )}

        {/* Calendario settimanale */}
        <NeumorphicCard className="p-4 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="min-w-[900px]">
              {/* Header giorni */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="p-2 text-center font-medium text-slate-500 text-sm">Ora</div>
                {weekDays.map(day => (
                  <div 
                    key={day.format('YYYY-MM-DD')} 
                    className={`p-2 text-center rounded-lg ${
                      day.isSame(moment(), 'day') ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-700">{day.format('ddd')}</div>
                    <div className="text-lg font-bold text-slate-800">{day.format('DD')}</div>
                  </div>
                ))}
              </div>

              {/* Griglia oraria */}
              <div className="space-y-1">
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-8 gap-1">
                    <div className="p-2 text-center text-sm text-slate-500 font-medium">
                      {hour}:00
                    </div>
                    {weekDays.map(day => {
                      const dayKey = day.format('YYYY-MM-DD');
                      const dayTurni = turniByDayHour[dayKey] || [];
                      const hourTurni = dayTurni.filter(t => {
                        const startHour = parseInt(t.ora_inizio.split(':')[0]);
                        return startHour === hour;
                      });
                      const inDragRange = isInDragRange(day, hour);

                      return (
                        <div 
                          key={`${dayKey}-${hour}`}
                          className={`min-h-[50px] neumorphic-pressed rounded-lg p-1 cursor-pointer select-none transition-colors ${
                            inDragRange ? 'bg-blue-100 border-2 border-blue-400' : 'hover:bg-slate-50'
                          }`}
                          onMouseDown={() => hourTurni.length === 0 && handleMouseDown(day, hour)}
                          onMouseEnter={() => handleMouseEnter(day, hour)}
                          onMouseUp={() => handleMouseUp(day, hour)}
                        >
                          {hourTurni.map(turno => (
                            <div 
                              key={turno.id}
                              className={`p-1.5 rounded-lg border text-xs mb-1 cursor-pointer ${COLORI_RUOLO[turno.ruolo]}`}
                              onClick={(e) => { e.stopPropagation(); handleEditTurno(turno); }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{turno.ora_inizio}-{turno.ora_fine}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Eliminare questo turno?')) {
                                      deleteMutation.mutate(turno.id);
                                    }
                                  }}
                                  className="hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="truncate">{turno.ruolo}</div>
                              {turno.dipendente_nome && (
                                <div className="truncate font-medium">{turno.dipendente_nome}</div>
                              )}
                              {!selectedStore && (
                                <div className="truncate text-[10px] opacity-70">{getStoreName(turno.store_id)}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </NeumorphicCard>

        {/* Legenda */}
        <NeumorphicCard className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Legenda:</span>
            {RUOLI.map(ruolo => (
              <div key={ruolo} className={`px-3 py-1 rounded-lg border text-sm ${COLORI_RUOLO[ruolo]}`}>
                {ruolo}
              </div>
            ))}
          </div>
        </NeumorphicCard>

        {/* Modal Impostazioni */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <NeumorphicCard className="p-6 max-w-2xl w-full my-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Impostazioni Timbratura</h2>
                <button onClick={() => setShowConfigModal(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Distanza massima per timbratura (metri)
                  </label>
                  <input
                    type="number"
                    value={configForm.distanza_massima_metri}
                    onChange={(e) => setConfigForm({ ...configForm, distanza_massima_metri: parseInt(e.target.value) || 100 })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Il dipendente deve trovarsi entro questa distanza dal locale per timbrare
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Tolleranza ritardo (minuti)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={configForm.tolleranza_ritardo_minuti}
                    onChange={(e) => setConfigForm({ ...configForm, tolleranza_ritardo_minuti: parseInt(e.target.value) ?? 0 })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    0 = nessuna tolleranza, il ritardo viene conteggiato da subito
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="gps-check"
                    checked={configForm.abilita_timbratura_gps}
                    onChange={(e) => setConfigForm({ ...configForm, abilita_timbratura_gps: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="gps-check" className="text-sm font-medium text-slate-700">
                    Abilita verifica GPS per timbratura
                  </label>
                </div>

                {/* Sezione Coordinate GPS Locali */}
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Posizione GPS Locali
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Le coordinate GPS sono usate per verificare la posizione del dipendente durante la timbratura
                  </p>
                  
                  <div className="space-y-3">
                    {stores.map(store => (
                      <div key={store.id} className="neumorphic-pressed p-3 rounded-xl">
                        {editingStore?.id === store.id ? (
                          <div className="space-y-2">
                            <div className="font-medium text-slate-800">{store.name}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-slate-500">Latitudine</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={storeCoords.latitude}
                                  onChange={(e) => setStoreCoords({ ...storeCoords, latitude: e.target.value })}
                                  className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                                  placeholder="45.4642"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500">Longitudine</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={storeCoords.longitude}
                                  onChange={(e) => setStoreCoords({ ...storeCoords, longitude: e.target.value })}
                                  className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                                  placeholder="9.1900"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-slate-500">Indirizzo</label>
                              <input
                                type="text"
                                value={storeCoords.address}
                                onChange={(e) => setStoreCoords({ ...storeCoords, address: e.target.value })}
                                className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                                placeholder="Via Roma 1, Milano"
                              />
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => setEditingStore(null)}
                                className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800"
                              >
                                Annulla
                              </button>
                              <button
                                onClick={handleSaveStoreCoords}
                                disabled={updateStoreMutation.isPending}
                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1"
                              >
                                {updateStoreMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Salva
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-800">{store.name}</div>
                              <div className="text-xs text-slate-500">
                                {store.address || 'Indirizzo non impostato'}
                              </div>
                              <div className="text-xs text-slate-400">
                                {store.latitude && store.longitude 
                                  ? `📍 ${store.latitude}, ${store.longitude}`
                                  : '⚠️ Coordinate GPS non impostate'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEditStore(store)}
                              className="nav-button p-2 rounded-lg hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <NeumorphicButton onClick={() => setShowConfigModal(false)} className="flex-1">
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton 
                  onClick={() => saveConfigMutation.mutate(configForm)} 
                  variant="primary" 
                  className="flex-1"
                >
                  Salva Impostazioni
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}

        {/* Quick Turno Popup */}
        {quickTurnoPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Nuovo Turno</h2>
                <button onClick={() => setQuickTurnoPopup(null)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-3 p-3 bg-blue-50 rounded-xl">
                <div className="text-sm text-blue-800">
                  <strong>Data:</strong> {moment(quickTurnoPopup.day).format('dddd DD MMMM YYYY')}
                </div>
                <div className="text-sm text-blue-800">
                  <strong>Orario:</strong> {turnoForm.ora_inizio} - {turnoForm.ora_fine}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Locale *</label>
                  <select
                    value={turnoForm.store_id}
                    onChange={(e) => setTurnoForm({ ...turnoForm, store_id: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona locale</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Inizio</label>
                    <input
                      type="time"
                      value={turnoForm.ora_inizio}
                      onChange={(e) => setTurnoForm({ ...turnoForm, ora_inizio: e.target.value })}
                      className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Fine</label>
                    <input
                      type="time"
                      value={turnoForm.ora_fine}
                      onChange={(e) => setTurnoForm({ ...turnoForm, ora_fine: e.target.value })}
                      className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Ruolo *</label>
                  <select
                    value={turnoForm.ruolo}
                    onChange={(e) => setTurnoForm({ ...turnoForm, ruolo: e.target.value, dipendente_id: '' })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  >
                    {RUOLI.map(ruolo => (
                      <option key={ruolo} value={ruolo}>{ruolo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Dipendente</label>
                  <select
                    value={turnoForm.dipendente_id}
                    onChange={(e) => setTurnoForm({ ...turnoForm, dipendente_id: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Non assegnato</option>
                    {filteredDipendenti.map(u => (
                      <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>
                  <input
                    type="text"
                    value={turnoForm.note}
                    onChange={(e) => setTurnoForm({ ...turnoForm, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                    placeholder="Note opzionali..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <NeumorphicButton onClick={() => setQuickTurnoPopup(null)} className="flex-1">
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton 
                  onClick={handleQuickSave} 
                  variant="primary" 
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={!turnoForm.store_id}
                >
                  <Save className="w-4 h-4" />
                  Salva Turno
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}