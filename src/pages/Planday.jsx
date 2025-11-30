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
  "Pizzaiolo": "bg-orange-500 border-orange-600 text-white",
  "Cassiere": "bg-blue-500 border-blue-600 text-white",
  "Store Manager": "bg-purple-500 border-purple-600 text-white"
};
const COLORI_RUOLO_LIGHT = {
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
  
  // Turni modello
  const [showModelliModal, setShowModelliModal] = useState(false);
  const [modelloForm, setModelloForm] = useState({
    nome: '',
    ruolo: 'Pizzaiolo',
    ora_inizio: '09:00',
    ora_fine: '17:00',
    tipo_turno: 'Normale'
  });
  const [turniModello, setTurniModello] = useState(() => {
    const saved = localStorage.getItem('turni_modello');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedModello, setSelectedModello] = useState('');

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

  // Gestione drag & drop con slot da 30 min
  const handleMouseDown = (day, slot) => {
    const slotValue = slot.hour + slot.minute / 60;
    setDragStart({ day: day.format('YYYY-MM-DD'), slot: slotValue });
    setDragEnd({ day: day.format('YYYY-MM-DD'), slot: slotValue });
    setIsDragging(true);
  };

  const handleMouseEnter = (day, slot) => {
    if (isDragging && dragStart && day.format('YYYY-MM-DD') === dragStart.day) {
      const slotValue = slot.hour + slot.minute / 60;
      setDragEnd({ day: day.format('YYYY-MM-DD'), slot: slotValue });
    }
  };

  const handleMouseUp = (day, slot) => {
    if (isDragging && dragStart) {
      const slotValue = slot.hour + slot.minute / 60;
      const startSlot = Math.min(dragStart.slot, dragEnd?.slot || slotValue);
      const endSlot = Math.max(dragStart.slot, dragEnd?.slot || slotValue) + 0.5;
      
      const startHour = Math.floor(startSlot);
      const startMin = (startSlot % 1) * 60;
      const endHour = Math.floor(endSlot);
      const endMin = (endSlot % 1) * 60;
      
      // Mostra popup per completare il turno
      setQuickTurnoPopup({
        day: dragStart.day,
        startSlot,
        endSlot
      });
      
      setTurnoForm({
        store_id: selectedStore || (stores[0]?.id || ''),
        data: dragStart.day,
        ora_inizio: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
        ora_fine: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
        ruolo: 'Pizzaiolo',
        dipendente_id: '',
        note: ''
      });
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isInDragRange = (day, slot) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    if (day.format('YYYY-MM-DD') !== dragStart.day) return false;
    const slotValue = slot.hour + slot.minute / 60;
    const minSlot = Math.min(dragStart.slot, dragEnd.slot);
    const maxSlot = Math.max(dragStart.slot, dragEnd.slot);
    return slotValue >= minSlot && slotValue <= maxSlot;
  };

  // Calcola posizione e altezza del turno nel calendario
  const getTurnoStyle = (turno) => {
    const [startH, startM] = turno.ora_inizio.split(':').map(Number);
    const [endH, endM] = turno.ora_fine.split(':').map(Number);
    
    const startSlot = (startH - 8) * 2 + (startM >= 30 ? 1 : 0);
    const endSlot = (endH - 8) * 2 + (endM >= 30 ? 1 : 0);
    const duration = endSlot - startSlot;
    
    return {
      top: `${startSlot * 25}px`,
      height: `${Math.max(duration * 25, 25)}px`,
      minHeight: '25px'
    };
  };

  // Turni modello
  const saveModello = () => {
    if (!modelloForm.nome) return;
    const newModelli = [...turniModello, { ...modelloForm, id: Date.now().toString() }];
    setTurniModello(newModelli);
    localStorage.setItem('turni_modello', JSON.stringify(newModelli));
    setModelloForm({ nome: '', ruolo: 'Pizzaiolo', ora_inizio: '09:00', ora_fine: '17:00', tipo_turno: 'Normale' });
  };

  const deleteModello = (id) => {
    const newModelli = turniModello.filter(m => m.id !== id);
    setTurniModello(newModelli);
    localStorage.setItem('turni_modello', JSON.stringify(newModelli));
  };

  const applyModello = (modelloId) => {
    const modello = turniModello.find(m => m.id === modelloId);
    if (modello) {
      setTurnoForm(prev => ({
        ...prev,
        ruolo: modello.ruolo,
        ora_inizio: modello.ora_inizio,
        ora_fine: modello.ora_fine,
        note: modello.tipo_turno !== 'Normale' ? modello.tipo_turno : prev.note
      }));
    }
    setSelectedModello(modelloId);
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

  // Ore della giornata (intervalli di 30 minuti)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 8; h <= 23; h++) {
      slots.push({ hour: h, minute: 0, label: `${h}:00` });
      slots.push({ hour: h, minute: 30, label: `${h}:30` });
    }
    return slots;
  }, []);

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
            <NeumorphicButton onClick={() => setShowModelliModal(true)} className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Turni Modello
            </NeumorphicButton>
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

              {/* Griglia oraria con slot 30 min */}
              <div className="relative">
                {/* Linee orizzontali e label ore */}
                {timeSlots.map((slot, idx) => (
                  <div key={`${slot.hour}-${slot.minute}`} className="grid grid-cols-8 gap-1" style={{ height: '25px' }}>
                    <div className="text-center text-xs text-slate-500 font-medium flex items-center justify-center">
                      {slot.minute === 0 ? slot.label : ''}
                    </div>
                    {weekDays.map(day => {
                      const dayKey = day.format('YYYY-MM-DD');
                      const inDragRange = isInDragRange(day, slot);

                      return (
                        <div 
                          key={`${dayKey}-${slot.hour}-${slot.minute}`}
                          className={`border-t border-slate-100 cursor-pointer select-none transition-colors ${
                            inDragRange ? 'bg-blue-200' : 'hover:bg-slate-50'
                          } ${slot.minute === 0 ? 'border-slate-200' : 'border-slate-100'}`}
                          onMouseDown={() => handleMouseDown(day, slot)}
                          onMouseEnter={() => handleMouseEnter(day, slot)}
                          onMouseUp={() => handleMouseUp(day, slot)}
                        />
                      );
                    })}
                  </div>
                ))}

                {/* Turni posizionati in overlay */}
                <div className="absolute top-0 left-0 right-0 grid grid-cols-8 gap-1 pointer-events-none" style={{ height: `${timeSlots.length * 25}px` }}>
                  <div /> {/* Colonna ore */}
                  {weekDays.map(day => {
                    const dayKey = day.format('YYYY-MM-DD');
                    const dayTurni = turniByDayHour[dayKey] || [];

                    return (
                      <div key={dayKey} className="relative">
                        {dayTurni.map(turno => {
                          const style = getTurnoStyle(turno);
                          return (
                            <div 
                              key={turno.id}
                              className={`absolute left-0 right-0 mx-0.5 p-1 rounded-lg border-2 text-xs cursor-pointer pointer-events-auto overflow-hidden shadow-md ${COLORI_RUOLO[turno.ruolo]}`}
                              style={style}
                              onClick={(e) => { e.stopPropagation(); handleEditTurno(turno); }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[10px]">{turno.ora_inizio}-{turno.ora_fine}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Eliminare questo turno?')) {
                                      deleteMutation.mutate(turno.id);
                                    }
                                  }}
                                  className="hover:text-red-200"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="truncate text-[10px] font-medium">{turno.ruolo}</div>
                              {turno.dipendente_nome && (
                                <div className="truncate text-[10px] font-bold">{turno.dipendente_nome}</div>
                              )}
                              {!selectedStore && (
                                <div className="truncate text-[9px] opacity-80">{getStoreName(turno.store_id)}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </NeumorphicCard>

        {/* Legenda */}
        <NeumorphicCard className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Legenda:</span>
            {RUOLI.map(ruolo => (
              <div key={ruolo} className={`px-3 py-1 rounded-lg border-2 text-sm font-medium ${COLORI_RUOLO[ruolo]}`}>
                {ruolo}
              </div>
            ))}
            <span className="text-xs text-slate-500 ml-4">💡 Trascina sul calendario per creare un turno</span>
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

        {/* Modal Turni Modello */}
        {showModelliModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Turni Modello</h2>
                <button onClick={() => setShowModelliModal(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form nuovo modello */}
              <div className="neumorphic-pressed p-4 rounded-xl mb-4">
                <h3 className="font-medium text-slate-700 mb-3">Crea Nuovo Modello</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nome Modello *</label>
                    <input
                      type="text"
                      value={modelloForm.nome}
                      onChange={(e) => setModelloForm({ ...modelloForm, nome: e.target.value })}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                      placeholder="Es: Turno Mattina Pizzaiolo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Ruolo</label>
                      <select
                        value={modelloForm.ruolo}
                        onChange={(e) => setModelloForm({ ...modelloForm, ruolo: e.target.value })}
                        className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                      >
                        {RUOLI.map(ruolo => (
                          <option key={ruolo} value={ruolo}>{ruolo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo Turno</label>
                      <select
                        value={modelloForm.tipo_turno}
                        onChange={(e) => setModelloForm({ ...modelloForm, tipo_turno: e.target.value })}
                        className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                      >
                        <option value="Normale">Normale</option>
                        <option value="Straordinario">Straordinario</option>
                        <option value="Formazione">Formazione</option>
                        <option value="Affiancamento">Affiancamento</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Inizio</label>
                      <input
                        type="time"
                        value={modelloForm.ora_inizio}
                        onChange={(e) => setModelloForm({ ...modelloForm, ora_inizio: e.target.value })}
                        className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Ora Fine</label>
                      <input
                        type="time"
                        value={modelloForm.ora_fine}
                        onChange={(e) => setModelloForm({ ...modelloForm, ora_fine: e.target.value })}
                        className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                      />
                    </div>
                  </div>
                  <NeumorphicButton 
                    onClick={saveModello} 
                    variant="primary" 
                    className="w-full"
                    disabled={!modelloForm.nome}
                  >
                    <Plus className="w-4 h-4 inline mr-1" /> Salva Modello
                  </NeumorphicButton>
                </div>
              </div>

              {/* Lista modelli esistenti */}
              {turniModello.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-700 mb-2">Modelli Salvati</h3>
                  <div className="space-y-2">
                    {turniModello.map(m => (
                      <div key={m.id} className="neumorphic-pressed p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-800">{m.nome}</div>
                          <div className="text-xs text-slate-500">
                            {m.ruolo} • {m.ora_inizio}-{m.ora_fine} • {m.tipo_turno}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteModello(m.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {turniModello.length === 0 && (
                <p className="text-center text-slate-500 py-4">
                  Nessun modello salvato. Crea il tuo primo turno modello sopra.
                </p>
              )}
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
                {/* Turni Modello */}
                {turniModello.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Usa Turno Modello</label>
                    <select
                      value={selectedModello}
                      onChange={(e) => applyModello(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">-- Seleziona modello --</option>
                      {turniModello.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} ({m.ruolo}, {m.ora_inizio}-{m.ora_fine})</option>
                      ))}
                    </select>
                  </div>
                )}

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