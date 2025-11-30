import React, { useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import PlandayStoreView from "../components/planday/PlandayStoreView";
import PlandayEmployeeView from "../components/planday/PlandayEmployeeView";
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, X, Save, Clock, 
  User, Store as StoreIcon, Trash2, Edit, Settings, Loader2, MapPin, Users, LayoutGrid
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

const DEFAULT_TIPI_TURNO = ["Normale", "Straordinario", "Formazione", "Affiancamento", "Apertura", "Chiusura"];

export default function Planday() {
  const [selectedStore, setSelectedStore] = useState('');
  const [weekStart, setWeekStart] = useState(moment().startOf('isoWeek'));
  const [showForm, setShowForm] = useState(false);
  const [editingTurno, setEditingTurno] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [viewMode, setViewMode] = useState('calendario'); // calendario, dipendenti, singolo
  const [selectedDipendente, setSelectedDipendente] = useState(null);
  const [turnoForm, setTurnoForm] = useState({
    store_id: '',
    data: '',
    ora_inizio: '09:00',
    ora_fine: '17:00',
    ruolo: 'Pizzaiolo',
    dipendente_id: '',
    tipo_turno: 'Normale',
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

  // Turni per dipendente specifico (per la vista singolo dipendente)
  const { data: turniDipendente = [] } = useQuery({
    queryKey: ['turni-dipendente', selectedDipendente],
    queryFn: async () => {
      if (!selectedDipendente) return [];
      // Carica turni ultimi 3 mesi
      const startDate = moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
      const endDate = moment().add(2, 'months').endOf('month').format('YYYY-MM-DD');
      return base44.entities.TurnoPlanday.filter({
        dipendente_id: selectedDipendente,
        data: { $gte: startDate, $lte: endDate }
      });
    },
    enabled: !!selectedDipendente && viewMode === 'singolo',
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

  // Stato per drag and drop (creazione nuovi turni)
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [quickTurnoPopup, setQuickTurnoPopup] = useState(null);
  
  // Stato per drag and drop turni esistenti
  const [draggingTurno, setDraggingTurno] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
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
  
  // Tipi turno personalizzati
  const [tipiTurno, setTipiTurno] = useState(() => {
    const saved = localStorage.getItem('tipi_turno');
    return saved ? JSON.parse(saved) : DEFAULT_TIPI_TURNO;
  });
  const [newTipoTurno, setNewTipoTurno] = useState('');
  const [showTipiTurnoSection, setShowTipiTurnoSection] = useState(false);
  
  // Colori per tipo turno
  const [coloriTipoTurno, setColoriTipoTurno] = useState(() => {
    const saved = localStorage.getItem('colori_tipo_turno');
    return saved ? JSON.parse(saved) : {
      'Normale': '#94a3b8',
      'Straordinario': '#ef4444',
      'Formazione': '#22c55e',
      'Affiancamento': '#f59e0b',
      'Apertura': '#3b82f6',
      'Chiusura': '#8b5cf6'
    };
  });
  const [showColoriSection, setShowColoriSection] = useState(false);
  
  // Colori per ruolo
  const [coloriRuolo, setColoriRuolo] = useState(() => {
    const saved = localStorage.getItem('colori_ruolo');
    return saved ? JSON.parse(saved) : {
      'Pizzaiolo': '#f97316',
      'Cassiere': '#3b82f6',
      'Store Manager': '#a855f7'
    };
  });
  const [showColoriRuoloSection, setShowColoriRuoloSection] = useState(false);
  
  // Settimana modello
  const [showSettimanaModelloModal, setShowSettimanaModelloModal] = useState(false);
  const [settimanaModelloRange, setSettimanaModelloRange] = useState({
    dataInizio: '',
    dataFine: '',
    applicaSenzaFine: false
  });

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
      tipo_turno: 'Normale',
      note: ''
    });
    setEditingTurno(null);
    setShowForm(false);
    setSelectedModello('');
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
      tipo_turno: turno.tipo_turno || 'Normale',
      note: turno.note || ''
    });
    setShowForm(true);
  };

  const handleSaveTurno = () => {
    const dipendente = users.find(u => u.id === turnoForm.dipendente_id);
    const dataToSave = {
      ...turnoForm,
      dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || '',
      tipo_turno: turnoForm.tipo_turno || 'Normale'
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
        tipo_turno: 'Normale',
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

  // Calcola posizione e altezza del turno nel calendario con gestione sovrapposizioni
  const getTurnoStyle = (turno, index, total) => {
    const [startH, startM] = turno.ora_inizio.split(':').map(Number);
    const [endH, endM] = turno.ora_fine.split(':').map(Number);
    
    const startSlot = (startH - 8) * 2 + (startM >= 30 ? 1 : 0);
    const endSlot = (endH - 8) * 2 + (endM >= 30 ? 1 : 0);
    const duration = endSlot - startSlot;
    
    // Calcola larghezza e posizione per turni sovrapposti
    const width = total > 1 ? `${100 / total}%` : '100%';
    const left = total > 1 ? `${(index * 100) / total}%` : '0';
    
    return {
      top: `${startSlot * 25}px`,
      height: `${Math.max(duration * 25, 25)}px`,
      minHeight: '25px',
      width,
      left
    };
  };

  // Raggruppa turni sovrapposti per lo stesso giorno
  const getOverlappingTurni = (dayTurni) => {
    // Ordina per ora inizio
    const sorted = [...dayTurni].sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
    const groups = [];
    
    sorted.forEach(turno => {
      const [startH, startM] = turno.ora_inizio.split(':').map(Number);
      const [endH, endM] = turno.ora_fine.split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;
      
      // Trova gruppo esistente che si sovrappone
      let foundGroup = false;
      for (const group of groups) {
        const overlaps = group.some(t => {
          const [tStartH, tStartM] = t.ora_inizio.split(':').map(Number);
          const [tEndH, tEndM] = t.ora_fine.split(':').map(Number);
          const tStart = tStartH * 60 + tStartM;
          const tEnd = tEndH * 60 + tEndM;
          return (start < tEnd && end > tStart);
        });
        if (overlaps) {
          group.push(turno);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        groups.push([turno]);
      }
    });
    
    return groups;
  };

  // Funzione per aggiungere turno da vista dipendenti
  const handleAddTurnoFromStoreView = (day, dipendenteId) => {
    const dipendente = users.find(u => u.id === dipendenteId);
    setTurnoForm({
      store_id: selectedStore || (stores[0]?.id || ''),
      data: day.format('YYYY-MM-DD'),
      ora_inizio: '09:00',
      ora_fine: '17:00',
      ruolo: dipendente?.ruoli_dipendente?.[0] || 'Pizzaiolo',
      dipendente_id: dipendenteId,
      tipo_turno: 'Normale',
      note: ''
    });
    setShowForm(true);
  };

  // Drag and drop turni esistenti
  const handleTurnoDragStart = (e, turno) => {
    e.stopPropagation();
    setDraggingTurno(turno);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', turno.id);
  };

  const handleTurnoDragEnd = () => {
    setDraggingTurno(null);
    setDropTarget(null);
  };

  const handleDayDragOver = (e, day) => {
    e.preventDefault();
    if (draggingTurno) {
      setDropTarget(day.format('YYYY-MM-DD'));
    }
  };

  const handleDayDrop = (e, day) => {
    e.preventDefault();
    if (draggingTurno && draggingTurno.data !== day.format('YYYY-MM-DD')) {
      // Sposta il turno al nuovo giorno
      updateMutation.mutate({
        id: draggingTurno.id,
        data: { ...draggingTurno, data: day.format('YYYY-MM-DD') }
      });
    }
    setDraggingTurno(null);
    setDropTarget(null);
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
        tipo_turno: modello.tipo_turno || 'Normale',
        note: prev.note
      }));
    }
    setSelectedModello(modelloId);
  };

  // Gestione tipi turno
  const addTipoTurno = () => {
    if (newTipoTurno.trim() && !tipiTurno.includes(newTipoTurno.trim())) {
      const updated = [...tipiTurno, newTipoTurno.trim()];
      setTipiTurno(updated);
      localStorage.setItem('tipi_turno', JSON.stringify(updated));
      setNewTipoTurno('');
    }
  };

  const deleteTipoTurno = (tipo) => {
    if (DEFAULT_TIPI_TURNO.includes(tipo)) return;
    const updated = tipiTurno.filter(t => t !== tipo);
    setTipiTurno(updated);
    localStorage.setItem('tipi_turno', JSON.stringify(updated));
  };

  const updateColoreTipoTurno = (tipo, colore) => {
    const updated = { ...coloriTipoTurno, [tipo]: colore };
    setColoriTipoTurno(updated);
    localStorage.setItem('colori_tipo_turno', JSON.stringify(updated));
  };

  const updateColoreRuolo = (ruolo, colore) => {
    const updated = { ...coloriRuolo, [ruolo]: colore };
    setColoriRuolo(updated);
    localStorage.setItem('colori_ruolo', JSON.stringify(updated));
  };

  const getRuoloStyle = (ruolo) => {
    const color = coloriRuolo[ruolo] || '#94a3b8';
    return {
      backgroundColor: color,
      borderColor: color,
      color: '#fff'
    };
  };

  // Funzione per salvare turno da componenti figli
  const handleSaveTurnoFromChild = (turnoData, existingId = null) => {
    const dipendente = users.find(u => u.id === turnoData.dipendente_id);
    const dataToSave = {
      ...turnoData,
      dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || '',
      stato: 'programmato'
    };
    
    if (existingId) {
      updateMutation.mutate({ id: existingId, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  // Applica settimana modello
  const applySettimanaModello = async () => {
    if (!settimanaModelloRange.dataInizio) {
      alert('Seleziona una data di inizio');
      return;
    }

    const startApply = moment(settimanaModelloRange.dataInizio);
    const endApply = settimanaModelloRange.applicaSenzaFine 
      ? moment(settimanaModelloRange.dataInizio).add(52, 'weeks') // Max 1 anno
      : moment(settimanaModelloRange.dataFine);

    if (!settimanaModelloRange.applicaSenzaFine && !settimanaModelloRange.dataFine) {
      alert('Seleziona una data di fine o attiva "Applica senza fine"');
      return;
    }

    // Ottieni tutti i turni della settimana corrente come modello
    const turniSettimana = turni.filter(t => {
      const turnoDate = moment(t.data);
      return turnoDate.isSameOrAfter(weekStart) && turnoDate.isSameOrBefore(weekStart.clone().add(6, 'days'));
    });

    if (turniSettimana.length === 0) {
      alert('Nessun turno nella settimana corrente da usare come modello');
      return;
    }

    const turniDaCreare = [];
    let currentWeekStart = startApply.clone().startOf('isoWeek');

    while (currentWeekStart.isSameOrBefore(endApply)) {
      // Salta la settimana modello stessa
      if (!currentWeekStart.isSame(weekStart)) {
        for (const turno of turniSettimana) {
          const turnoDay = moment(turno.data).isoWeekday(); // 1=Lun, 7=Dom
          const newDate = currentWeekStart.clone().isoWeekday(turnoDay);
          
          if (newDate.isSameOrAfter(startApply) && newDate.isSameOrBefore(endApply)) {
            turniDaCreare.push({
              store_id: turno.store_id,
              data: newDate.format('YYYY-MM-DD'),
              ora_inizio: turno.ora_inizio,
              ora_fine: turno.ora_fine,
              ruolo: turno.ruolo,
              dipendente_id: turno.dipendente_id || '',
              dipendente_nome: turno.dipendente_nome || '',
              tipo_turno: turno.tipo_turno || 'Normale',
              note: turno.note || '',
              stato: 'programmato'
            });
          }
        }
      }
      currentWeekStart.add(1, 'week');
    }

    if (turniDaCreare.length === 0) {
      alert('Nessun turno da creare nel range selezionato');
      return;
    }

    if (!confirm(`Verranno creati ${turniDaCreare.length} turni. Continuare?`)) {
      return;
    }

    // Crea i turni in batch
    for (const turno of turniDaCreare) {
      await base44.entities.TurnoPlanday.create(turno);
    }

    queryClient.invalidateQueries({ queryKey: ['turni-planday'] });
    setShowSettimanaModelloModal(false);
    alert(`Creati ${turniDaCreare.length} turni con successo!`);
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
          <div className="flex gap-2 flex-wrap">
            <NeumorphicButton onClick={() => setShowSettimanaModelloModal(true)} className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Usa come Modello
            </NeumorphicButton>
            <div className="flex rounded-xl overflow-hidden neumorphic-pressed">
              <button
                onClick={() => setViewMode('calendario')}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${viewMode === 'calendario' ? 'bg-blue-500 text-white' : 'text-slate-700'}`}
              >
                <LayoutGrid className="w-4 h-4" /> Calendario
              </button>
              <button
                onClick={() => setViewMode('dipendenti')}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${viewMode === 'dipendenti' ? 'bg-blue-500 text-white' : 'text-slate-700'}`}
              >
                <StoreIcon className="w-4 h-4" /> Store
              </button>
              <button
                onClick={() => setViewMode('singolo')}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${viewMode === 'singolo' ? 'bg-blue-500 text-white' : 'text-slate-700'}`}
              >
                <User className="w-4 h-4" /> Singolo
              </button>
            </div>
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

            <div className="flex items-center gap-2">
              {turniModello.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const modello = turniModello.find(m => m.id === e.target.value);
                      if (modello) {
                        setTurnoForm({
                          store_id: selectedStore || (stores[0]?.id || ''),
                          data: moment().format('YYYY-MM-DD'),
                          ora_inizio: modello.ora_inizio,
                          ora_fine: modello.ora_fine,
                          ruolo: modello.ruolo,
                          dipendente_id: '',
                          tipo_turno: modello.tipo_turno || 'Normale',
                          note: ''
                        });
                        setSelectedModello(e.target.value);
                        setShowForm(true);
                      }
                    }
                  }}
                  className="neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
                >
                  <option value="">+ da Modello</option>
                  {turniModello.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              )}
              <NeumorphicButton 
                onClick={() => {
                  setTurnoForm({ 
                    store_id: selectedStore || (stores[0]?.id || ''),
                    data: moment().format('YYYY-MM-DD'),
                    ora_inizio: '09:00',
                    ora_fine: '17:00',
                    ruolo: 'Pizzaiolo',
                    dipendente_id: '',
                    tipo_turno: 'Normale',
                    note: ''
                  });
                  setShowForm(true);
                }} 
                variant="primary" 
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuovo Turno
              </NeumorphicButton>
            </div>
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
              <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo Turno</label>
              <select
                value={turnoForm.tipo_turno}
                onChange={(e) => setTurnoForm({ ...turnoForm, tipo_turno: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                {tipiTurno.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
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

        {/* Vista Calendario */}
        {viewMode === 'calendario' && (
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
                          onMouseDown={(e) => { e.preventDefault(); handleMouseDown(day, slot); }}
                          onMouseEnter={() => handleMouseEnter(day, slot)}
                          onMouseUp={() => handleMouseUp(day, slot)}
                        />
                      );
                      })}
                    </div>
                  ))}

                  {/* Turni posizionati in overlay con gestione sovrapposizioni e drag&drop */}
                  <div className="absolute top-0 left-0 right-0 grid grid-cols-8 gap-1 pointer-events-none" style={{ height: `${timeSlots.length * 25}px` }}>
                    <div /> {/* Colonna ore */}
                    {weekDays.map(day => {
                      const dayKey = day.format('YYYY-MM-DD');
                      const dayTurni = turniByDayHour[dayKey] || [];
                      const overlappingGroups = getOverlappingTurni(dayTurni);
                      const isDropTarget = dropTarget === dayKey;

                      return (
                        <div 
                          key={dayKey} 
                          className={`relative pointer-events-auto ${isDropTarget ? 'bg-blue-100 bg-opacity-50' : ''}`}
                          onDragOver={(e) => handleDayDragOver(e, day)}
                          onDrop={(e) => handleDayDrop(e, day)}
                        >
                          {overlappingGroups.map((group, groupIdx) => 
                            group.map((turno, idx) => {
                              const style = getTurnoStyle(turno, idx, group.length);
                              return (
                                <div 
                                  key={turno.id}
                                  draggable
                                  onDragStart={(e) => handleTurnoDragStart(e, turno)}
                                  onDragEnd={handleTurnoDragEnd}
                                  className={`absolute p-1 rounded-lg border-2 text-xs cursor-grab pointer-events-auto overflow-hidden shadow-md text-white ${draggingTurno?.id === turno.id ? 'opacity-50' : ''}`}
                                  style={{
                                    ...style,
                                    marginLeft: '1px',
                                    marginRight: '1px',
                                    ...getRuoloStyle(turno.ruolo)
                                  }}
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
                                  {turno.tipo_turno && turno.tipo_turno !== 'Normale' && (
                                    <div 
                                      className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-l-[12px] border-l-transparent"
                                      style={{ borderTopColor: coloriTipoTurno[turno.tipo_turno] || '#94a3b8' }}
                                    />
                                  )}
                                  <div className="truncate text-[10px] font-medium">{turno.ruolo}</div>
                                  {turno.dipendente_nome && (
                                    <div className="truncate text-[10px] font-bold">{turno.dipendente_nome}</div>
                                  )}
                                  {!selectedStore && (
                                    <div className="truncate text-[9px] opacity-80">{getStoreName(turno.store_id)}</div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Vista Store (dipendenti) */}
        {viewMode === 'dipendenti' && (
          <PlandayStoreView
            turni={turni}
            users={users}
            stores={stores}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            weekStart={weekStart}
            setWeekStart={setWeekStart}
            onEditTurno={handleEditTurno}
            onAddTurno={handleAddTurnoFromStoreView}
            onSaveTurno={handleSaveTurnoFromChild}
            onDeleteTurno={(id) => deleteMutation.mutate(id)}
            getStoreName={getStoreName}
            tipiTurno={tipiTurno}
            coloriTipoTurno={coloriTipoTurno}
            coloriRuolo={coloriRuolo}
          />
        )}

        {/* Vista Singolo Dipendente */}
        {viewMode === 'singolo' && (
          <PlandayEmployeeView
            selectedDipendente={selectedDipendente}
            setSelectedDipendente={setSelectedDipendente}
            turniDipendente={turniDipendente}
            users={users}
            stores={stores}
            isLoading={isLoading}
            onEditTurno={handleEditTurno}
            onSaveTurno={handleSaveTurnoFromChild}
            onDeleteTurno={(id) => deleteMutation.mutate(id)}
            getStoreName={getStoreName}
            coloriTipoTurno={coloriTipoTurno}
            coloriRuolo={coloriRuolo}
          />
        )}

        {/* Legenda */}
        <NeumorphicCard className="p-4">
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <span className="text-sm font-medium text-slate-700">Ruoli:</span>
            {RUOLI.map(ruolo => (
              <div 
                key={ruolo} 
                className="px-3 py-1 rounded-lg border-2 text-sm font-medium text-white"
                style={{ backgroundColor: coloriRuolo[ruolo], borderColor: coloriRuolo[ruolo] }}
              >
                {ruolo}
              </div>
            ))}
            <button
              onClick={() => setShowColoriRuoloSection(!showColoriRuoloSection)}
              className="text-xs text-blue-600 hover:underline"
            >
              Modifica
            </button>
          </div>
          {showColoriRuoloSection && (
            <div className="mb-3 p-3 bg-slate-50 rounded-xl">
              <div className="grid grid-cols-3 gap-2">
                {RUOLI.map(ruolo => (
                  <div key={ruolo} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={coloriRuolo[ruolo] || '#94a3b8'}
                      onChange={(e) => updateColoreRuolo(ruolo, e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-700">{ruolo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Tipi Turno:</span>
            {tipiTurno.map(tipo => (
              <div key={tipo} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-0 h-0 border-t-[10px] border-l-[10px] border-l-transparent"
                  style={{ borderTopColor: coloriTipoTurno[tipo] || '#94a3b8' }}
                />
                <span className="text-slate-600">{tipo}</span>
              </div>
            ))}
            <button
              onClick={() => setShowColoriSection(!showColoriSection)}
              className="text-xs text-blue-600 hover:underline ml-2"
            >
              Modifica
            </button>
          </div>
          {showColoriSection && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {tipiTurno.map(tipo => (
                  <div key={tipo} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={coloriTipoTurno[tipo] || '#94a3b8'}
                      onChange={(e) => updateColoreTipoTurno(tipo, e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-700">{tipo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-xs text-slate-500 mt-2">💡 Trascina i turni per spostarli</div>
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

              {/* Sezione Tipi Turno */}
              <div className="mb-4">
                <button 
                  onClick={() => setShowTipiTurnoSection(!showTipiTurnoSection)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {showTipiTurnoSection ? '▼' : '▶'} Gestisci Tipi Turno
                </button>
                {showTipiTurnoSection && (
                  <div className="neumorphic-pressed p-3 rounded-xl mt-2">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTipoTurno}
                        onChange={(e) => setNewTipoTurno(e.target.value)}
                        className="flex-1 neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                        placeholder="Nuovo tipo turno..."
                        onKeyDown={(e) => e.key === 'Enter' && addTipoTurno()}
                      />
                      <NeumorphicButton onClick={addTipoTurno} className="text-sm px-3 py-1">
                        <Plus className="w-4 h-4" />
                      </NeumorphicButton>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tipiTurno.map(tipo => (
                        <span key={tipo} className="px-2 py-1 bg-slate-100 rounded-lg text-xs flex items-center gap-1">
                          {tipo}
                          {!DEFAULT_TIPI_TURNO.includes(tipo) && (
                            <button onClick={() => deleteTipoTurno(tipo)} className="text-red-500 hover:text-red-700">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                        {tipiTurno.map(tipo => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
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
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo Turno</label>
                  <select
                    value={turnoForm.tipo_turno}
                    onChange={(e) => setTurnoForm({ ...turnoForm, tipo_turno: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-slate-700 outline-none"
                  >
                    {tipiTurno.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
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

        {/* Modal Settimana Modello */}
        {showSettimanaModelloModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Usa Settimana come Modello</h2>
                <button onClick={() => setShowSettimanaModelloModal(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-800">
                  <strong>Settimana Modello:</strong><br/>
                  {weekStart.format('DD MMM')} - {weekStart.clone().add(6, 'days').format('DD MMM YYYY')}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {turni.length} turni in questa settimana
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Applica da *</label>
                  <input
                    type="date"
                    value={settimanaModelloRange.dataInizio}
                    onChange={(e) => setSettimanaModelloRange({ ...settimanaModelloRange, dataInizio: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="senza-fine"
                    checked={settimanaModelloRange.applicaSenzaFine}
                    onChange={(e) => setSettimanaModelloRange({ ...settimanaModelloRange, applicaSenzaFine: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="senza-fine" className="text-sm font-medium text-slate-700">
                    Applica indefinitamente (max 1 anno)
                  </label>
                </div>

                {!settimanaModelloRange.applicaSenzaFine && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Fino a *</label>
                    <input
                      type="date"
                      value={settimanaModelloRange.dataFine}
                      onChange={(e) => setSettimanaModelloRange({ ...settimanaModelloRange, dataFine: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  I turni della settimana corrente verranno replicati per ogni settimana nel periodo selezionato.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <NeumorphicButton onClick={() => setShowSettimanaModelloModal(false)} className="flex-1">
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton 
                  onClick={applySettimanaModello} 
                  variant="primary" 
                  className="flex-1"
                  disabled={turni.length === 0}
                >
                  Applica Modello
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}