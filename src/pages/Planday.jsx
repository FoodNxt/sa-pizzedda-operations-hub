import React, { useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import PlandayStoreView from "../components/planday/PlandayStoreView";
import PlandayEmployeeView from "../components/planday/PlandayEmployeeView";
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, X, Save, Clock, 
  User, Store as StoreIcon, Trash2, Edit, Settings, Loader2, MapPin, Users, LayoutGrid,
  CheckCircle, XCircle, AlertTriangle
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
  const [mainView, setMainView] = useState('turni'); // 'turni' or 'timbrature'
  const [selectedStore, setSelectedStore] = useState('');
  const [weekStart, setWeekStart] = useState(moment().startOf('isoWeek'));
  const [showForm, setShowForm] = useState(false);
  const [editingTurno, setEditingTurno] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [viewMode, setViewMode] = useState('calendario'); // calendario, dipendenti, singolo
  const [selectedDipendente, setSelectedDipendente] = useState(null);
  
  // Timbrature states
  const [selectedDipendenteTimbr, setSelectedDipendenteTimbr] = useState('all');
  const [selectedRuolo, setSelectedRuolo] = useState('all');
  const [dateFrom, setDateFrom] = useState(moment().subtract(7, 'days').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(moment().format('YYYY-MM-DD'));
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    enabled: false,
    minutiRitardo: 15,
    whatsappNumber: '',
    notifyManagers: true
  });
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
      if (configs[0]) {
        setAlertConfig({
          enabled: configs[0].alert_enabled || false,
          minutiRitardo: configs[0].alert_minuti_ritardo || 15,
          whatsappNumber: configs[0].alert_whatsapp_number || '',
          notifyManagers: configs[0].alert_notify_managers !== false
        });
      }
      return configs[0] || { distanza_massima_metri: 100, tolleranza_ritardo_minuti: 5, abilita_timbratura_gps: true };
    },
  });

  const { data: turniTimbrature = [] } = useQuery({
    queryKey: ['turni-timbrature', dateFrom, dateTo],
    queryFn: async () => {
      return base44.entities.TurnoPlanday.filter({
        data: { $gte: dateFrom, $lte: dateTo }
      });
    },
    enabled: mainView === 'timbrature',
  });

  const { data: allInspections = [] } = useQuery({
    queryKey: ['all-cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date'),
    enabled: mainView === 'timbrature',
  });

  const { data: formTrackerConfigs = [] } = useQuery({
    queryKey: ['form-tracker-configs'],
    queryFn: () => base44.entities.FormTrackerConfig.list(),
    enabled: mainView === 'timbrature',
  });

  const { data: allFormData = {} } = useQuery({
    queryKey: ['all-form-data'],
    queryFn: async () => {
      const [inventario, cantina, cassa, teglie, prep, impasti, precotture] = await Promise.all([
        base44.entities.RilevazioneInventario.list('-data_rilevazione'),
        base44.entities.RilevazioneInventarioCantina.list('-data_rilevazione'),
        base44.entities.ConteggioCassa.list('-data_conteggio'),
        base44.entities.TeglieButtate.list('-data_rilevazione'),
        base44.entities.Preparazioni.list('-data_rilevazione'),
        base44.entities.GestioneImpasti.list('-data_creazione'),
        base44.entities.CalcoloImpastoLog.list('-data_calcolo')
      ]);
      return {
        FormInventario: inventario,
        FormCantina: cantina,
        ConteggioCassa: cassa,
        FormTeglieButtate: teglie,
        FormPreparazioni: prep,
        Impasto: impasti,
        Precotture: precotture,
        ControlloPuliziaCassiere: allInspections.filter(i => i.inspector_role === 'Cassiere'),
        ControlloPuliziaPizzaiolo: allInspections.filter(i => i.inspector_role === 'Pizzaiolo'),
        ControlloPuliziaStoreManager: allInspections.filter(i => i.inspector_role === 'Store Manager')
      };
    },
    enabled: mainView === 'timbrature',
  });

  const { data: turniModello = [] } = useQuery({
    queryKey: ['turni-modello'],
    queryFn: () => base44.entities.TurnoModello.list(),
  });

  const [configForm, setConfigForm] = useState({
    distanza_massima_metri: 100,
    tolleranza_ritardo_minuti: 0,
    abilita_timbratura_gps: true,
    arrotonda_ritardo: false,
    arrotondamento_tipo: 'eccesso',
    arrotondamento_minuti: 15,
    penalita_timbratura_mancata: 0,
    ore_mancata_uscita: 2
  });

  const [editingTimbratura, setEditingTimbratura] = useState(null);
  const [timbrForm, setTimbrForm] = useState({ timbrata_entrata: '', timbrata_uscita: '' });

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
  
  // Modal per gestione turni
  const [showGestioneTurniModal, setShowGestioneTurniModal] = useState(false);

  React.useEffect(() => {
    if (config) {
      setConfigForm({
        distanza_massima_metri: config.distanza_massima_metri || 100,
        tolleranza_ritardo_minuti: config.tolleranza_ritardo_minuti ?? 0,
        abilita_timbratura_gps: config.abilita_timbratura_gps !== false,
        arrotonda_ritardo: config.arrotonda_ritardo || false,
        arrotondamento_tipo: config.arrotondamento_tipo || 'eccesso',
        arrotondamento_minuti: config.arrotondamento_minuti || 15,
        penalita_timbratura_mancata: config.penalita_timbratura_mancata || 0,
        ore_mancata_uscita: config.ore_mancata_uscita || 2
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

  const saveAlertMutation = useMutation({
    mutationFn: async (data) => {
      const configs = await base44.entities.TimbraturaConfig.list();
      const updateData = {
        alert_enabled: data.enabled,
        alert_minuti_ritardo: data.minutiRitardo,
        alert_whatsapp_number: data.whatsappNumber,
        alert_notify_managers: data.notifyManagers
      };
      if (configs.length > 0) {
        return base44.entities.TimbraturaConfig.update(configs[0].id, updateData);
      } else {
        return base44.entities.TimbraturaConfig.create(updateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timbratura-config'] });
      setShowAlertSettings(false);
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Store.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setEditingStore(null);
    },
  });

  const updateTimbraturaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TurnoPlanday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-timbrature'] });
      setEditingTimbratura(null);
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

  // Turni modello mutations
  const createModelloMutation = useMutation({
    mutationFn: (data) => base44.entities.TurnoModello.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-modello'] });
      setModelloForm({ nome: '', ruolo: 'Pizzaiolo', ora_inizio: '09:00', ora_fine: '17:00', tipo_turno: 'Normale' });
    },
  });

  const deleteModelloMutation = useMutation({
    mutationFn: (id) => base44.entities.TurnoModello.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-modello'] });
    },
  });

  const saveModello = () => {
    if (!modelloForm.nome) return;
    createModelloMutation.mutate(modelloForm);
  };

  const deleteModello = (id) => {
    if (confirm('Eliminare questo modello?')) {
      deleteModelloMutation.mutate(id);
    }
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
    if (tipiTurno.length <= 1) return; // Almeno 1 tipo deve rimanere
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

  // Tutti i dipendenti assegnati allo store selezionato
  const dipendentiPerStore = useMemo(() => {
    if (!turnoForm.store_id) return users.filter(u => u.ruoli_dipendente?.length > 0);
    
    return users.filter(u => {
      const assignedStores = u.assigned_stores || [];
      // Se il dipendente non ha store assegnati, mostralo comunque (per retrocompatibilità)
      if (assignedStores.length === 0) return u.ruoli_dipendente?.length > 0;
      // Altrimenti verifica che sia assegnato allo store del turno
      return assignedStores.includes(turnoForm.store_id) && u.ruoli_dipendente?.length > 0;
    });
  }, [users, turnoForm.store_id]);

  // Verifica se un dipendente può essere assegnato al ruolo del turno
  const canAssignToRole = (user, role) => {
    const ruoli = user.ruoli_dipendente || [];
    return ruoli.includes(role);
  };

  // Verifica disponibilità dipendente per il giorno/orario del turno
  const getDipendenteDisponibilita = (dipendenteId) => {
    if (!turnoForm.data || !dipendenteId) return { disponibile: true, turniGiorno: [], sovrapposizione: false };
    
    // Trova tutti i turni del dipendente in quel giorno
    const turniGiorno = turni.filter(t => 
      t.dipendente_id === dipendenteId && 
      t.data === turnoForm.data &&
      (editingTurno ? t.id !== editingTurno.id : true) // Escludi il turno che stiamo modificando
    );
    
    if (turniGiorno.length === 0) {
      return { disponibile: true, turniGiorno: [], sovrapposizione: false };
    }
    
    // Verifica sovrapposizione oraria
    const [newStartH, newStartM] = turnoForm.ora_inizio.split(':').map(Number);
    const [newEndH, newEndM] = turnoForm.ora_fine.split(':').map(Number);
    const newStart = newStartH * 60 + newStartM;
    const newEnd = newEndH * 60 + newEndM;
    
    const sovrapposizione = turniGiorno.some(t => {
      const [tStartH, tStartM] = t.ora_inizio.split(':').map(Number);
      const [tEndH, tEndM] = t.ora_fine.split(':').map(Number);
      const tStart = tStartH * 60 + tStartM;
      const tEnd = tEndH * 60 + tEndM;
      
      // Verifica sovrapposizione
      return (newStart < tEnd && newEnd > tStart);
    });
    
    return { 
      disponibile: !sovrapposizione, 
      turniGiorno, 
      sovrapposizione 
    };
  };

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
  const getDipendenteName = (dipId) => {
    const user = users.find(u => u.id === dipId);
    return user?.nome_cognome || user?.full_name || '';
  };

  // Calcola ritardo effettivo con arrotondamento
  const calcolaRitardoEffettivo = (minutiRitardo) => {
    if (!config?.arrotonda_ritardo) {
      return minutiRitardo; // Nessun arrotondamento
    }
    
    const incremento = config.arrotondamento_minuti || 15;
    const tipo = config.arrotondamento_tipo || 'eccesso';
    
    if (tipo === 'eccesso') {
      // Arrotonda per eccesso (es: 4 min → 15 min, 16 min → 30 min)
      return Math.ceil(minutiRitardo / incremento) * incremento;
    } else {
      // Arrotonda per difetto (es: 14 min → 0 min, 16 min → 15 min)
      return Math.floor(minutiRitardo / incremento) * incremento;
    }
  };

  // Calcola penalità timbratura mancata
  const calcolaPenalitaMancata = () => {
    return config?.penalita_timbratura_mancata || 0;
  };

  const getTurnoTipo = (turno) => {
    const [h] = turno.ora_inizio.split(':').map(Number);
    return h < 14 ? 'Mattina' : 'Sera';
  };

  const calcolaOreEffettive = (turno) => {
    // Se non c'è timbro entrata, non possiamo calcolare
    if (!turno.timbrata_entrata) return null;
    
    const stato = getTimbraturaTipo(turno);
    const entrata = moment(turno.timbrata_entrata);
    
    let minutiEffettivi = 0;
    
    if (turno.timbrata_uscita) {
      // Se c'è uscita, calcola normalmente
      const uscita = moment(turno.timbrata_uscita);
      minutiEffettivi = uscita.diff(entrata, 'minutes');
    } else if (stato.tipo === 'mancata_uscita') {
      // Se uscita mancata, usa l'ora fine turno prevista meno penalità
      const fineturno = moment(`${turno.data} ${turno.ora_fine}`);
      minutiEffettivi = fineturno.diff(entrata, 'minutes');
      // Sottrai la penalità per mancata uscita
      const penalita = config?.penalita_timbratura_mancata || 0;
      minutiEffettivi = Math.max(0, minutiEffettivi - penalita);
    } else {
      // Turno ancora in corso, non mostrare nulla
      return null;
    }
    
    // Sottrai anche il ritardo conteggiato se presente
    if (stato.ritardoConteggiato > 0) {
      minutiEffettivi = Math.max(0, minutiEffettivi - stato.ritardoConteggiato);
    }
    
    const ore = Math.floor(minutiEffettivi / 60);
    const minuti = minutiEffettivi % 60;
    
    return `${ore}h ${minuti}m`;
  };

  const getTimbraturaTipo = (turno) => {
    const now = moment();
    const turnoEnd = moment(`${turno.data} ${turno.ora_fine}`);
    const turnoStart = moment(`${turno.data} ${turno.ora_inizio}`);
    const oreMancataUscita = config?.ore_mancata_uscita || 2;
    const limiteUscitaMancata = turnoEnd.clone().add(oreMancataUscita, 'hours');
    
    // Turno futuro
    if (turnoStart.isAfter(now)) {
      return { tipo: 'programmato', color: 'text-slate-500', bg: 'bg-slate-100', label: 'Programmato', ritardoReale: 0, ritardoConteggiato: 0 };
    }
    
    // Mancata timbratura entrata (se il turno è finito)
    if (!turno.timbrata_entrata && turnoEnd.isBefore(now)) {
      const penalita = calcolaPenalitaMancata();
      return { 
        tipo: 'mancata', 
        color: 'text-red-600', 
        bg: 'bg-red-100', 
        label: penalita > 0 ? `Mancata (-${penalita}min)` : 'Non Timbrato',
        ritardoReale: 0,
        ritardoConteggiato: penalita,
        penalita
      };
    }
    
    // Mancata timbratura uscita (se sono passate X ore dalla fine turno)
    if (turno.timbrata_entrata && !turno.timbrata_uscita && now.isAfter(limiteUscitaMancata)) {
      const penalita = calcolaPenalitaMancata();
      return {
        tipo: 'mancata_uscita',
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: penalita > 0 ? `Mancata Uscita (-${penalita}min)` : 'Uscita Non Timbrata',
        ritardoReale: 0,
        ritardoConteggiato: penalita,
        penalita
      };
    }
    
    // Turno in corso
    if (!turno.timbrata_entrata) {
      return { tipo: 'in_corso', color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'In attesa', ritardoReale: 0, ritardoConteggiato: 0 };
    }
    
    const timbrataEntrata = moment(turno.timbrata_entrata);
    const ritardoReale = timbrataEntrata.diff(turnoStart, 'minutes');
    
    if (ritardoReale <= 0) {
      return { tipo: 'puntuale', color: 'text-green-600', bg: 'bg-green-100', label: 'Puntuale', ritardoReale: 0, ritardoConteggiato: 0 };
    }
    
    const ritardoConteggiato = calcolaRitardoEffettivo(ritardoReale);
    
    return { 
      tipo: 'ritardo', 
      color: 'text-orange-600', 
      bg: 'bg-orange-100', 
      label: ritardoConteggiato > 0 ? `+${ritardoConteggiato} min` : 'Tollerato',
      ritardoReale,
      ritardoConteggiato
    };
  };

  const filteredTurniTimbrature = useMemo(() => {
    return turniTimbrature.filter(t => {
      if (selectedStore !== 'all' && selectedStore !== '' && t.store_id !== selectedStore) return false;
      if (selectedDipendenteTimbr !== 'all' && t.dipendente_id !== selectedDipendenteTimbr) return false;
      if (selectedRuolo !== 'all' && t.ruolo !== selectedRuolo) return false;
      return true;
    }).sort((a, b) => {
      const dateA = `${a.data} ${a.ora_inizio}`;
      const dateB = `${b.data} ${b.ora_inizio}`;
      return dateB.localeCompare(dateA);
    });
  }, [turniTimbrature, selectedStore, selectedDipendenteTimbr, selectedRuolo]);

  // Helper per determinare se il turno è mattina o sera
  const getTurnoSequence = (turno, allTurniDay) => {
    const turnoRuolo = turno.ruolo;
    
    // Filtra solo i turni con lo stesso ruolo
    const turniStessoRuolo = allTurniDay.filter(t => t.ruolo === turnoRuolo);
    
    if (turniStessoRuolo.length <= 1) {
      return 'first'; // Solo un turno per questo ruolo → è il primo
    }
    
    // Ordina per ora di inizio
    const sorted = [...turniStessoRuolo].sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
    
    // Trova l'indice del turno corrente
    const index = sorted.findIndex(t => t.id === turno.id);
    
    // Il primo turno è 'first', tutti gli altri sono 'second'
    return index === 0 ? 'first' : 'second';
  };

  // Verifica form compilati usando logica FormTracker
  const getFormCompilati = (turno) => {
    if (!turno.dipendente_nome) return { dovuti: [], compilati: [] };
    
    const storeName = getStoreName(turno.store_id);
    const turnoRuolo = turno.ruolo; // Usa il ruolo del turno specifico, non i ruoli generali del dipendente
    
    // Determina tutti i turni dello stesso giorno e stesso store
    const turniStessoGiorno = turniTimbrature.filter(t => 
      t.data === turno.data && 
      t.store_id === turno.store_id
    );
    
    // Determina se questo turno è mattina o sera
    const turnoSequence = getTurnoSequence(turno, turniStessoGiorno);
    
    // Usa la logica di FormTracker
    const dateStart = new Date(turno.data);
    dateStart.setHours(0, 0, 0, 0);
    const nextDayEnd = new Date(turno.data);
    nextDayEnd.setDate(nextDayEnd.getDate() + 1);
    nextDayEnd.setHours(6, 0, 0, 0);
    
    // Determina il giorno della settimana del turno
    const turnoDayOfWeek = new Date(turno.data).getDay();
    
    const activeConfigs = formTrackerConfigs.filter(c => c.is_active);
    const dovuti = [];
    const compilati = [];
    
    activeConfigs.forEach(config => {
      const configRoles = config.assigned_roles || [];
      
      // Check if this config applies to this specific shift's role
      if (configRoles.length > 0 && !configRoles.includes(turnoRuolo)) {
        return;
      }
      
      // Check if config applies to this store
      const configStores = config.assigned_stores || [];
      if (configStores.length > 0 && !configStores.includes(turno.store_id)) {
        return;
      }
      
      // Check if config applies to this day of week
      const daysOfWeek = config.days_of_week || [];
      if (daysOfWeek.length > 0 && !daysOfWeek.includes(turnoDayOfWeek)) {
        return;
      }
      
      // Check if config applies to this shift sequence (mattina/sera)
      const configSequences = config.shift_sequences || [config.shift_sequence || 'first'];
      if (!configSequences.includes(turnoSequence)) {
        return;
      }
      
      dovuti.push(config.form_name);
      
      // Check if form was completed
      const formData = allFormData[config.form_page] || [];
      const completed = formData.some(item => {
        const itemDate = new Date(item.inspection_date || item.data_rilevazione || item.data_conteggio || item.data_creazione || item.data_calcolo);
        return (item.store_name === storeName || item.store_id === turno.store_id) &&
               (item.inspector_name === turno.dipendente_nome || item.rilevato_da === turno.dipendente_nome) &&
               itemDate >= dateStart && itemDate <= nextDayEnd;
      });
      
      if (completed) {
        compilati.push(config.form_name);
      }
    });
    
    return { dovuti, compilati };
  };

  const timbratureStats = useMemo(() => {
    const turniConTimbratura = filteredTurniTimbrature.filter(t => t.timbrata_entrata);
    const turniSenzaTimbratura = filteredTurniTimbrature.filter(t => {
      const stato = getTimbraturaTipo(t);
      return stato.tipo === 'mancata' || stato.tipo === 'mancata_uscita';
    });
    const turniInRitardo = turniConTimbratura.filter(t => {
      if (!t.timbrata_entrata) return false;
      const oraInizio = moment(`${t.data} ${t.ora_inizio}`);
      const timbrataEntrata = moment(t.timbrata_entrata);
      return timbrataEntrata.isAfter(oraInizio);
    });
    
    const totaleMinutiRitardo = turniInRitardo.reduce((sum, t) => {
      const oraInizio = moment(`${t.data} ${t.ora_inizio}`);
      const timbrataEntrata = moment(t.timbrata_entrata);
      return sum + timbrataEntrata.diff(oraInizio, 'minutes');
    }, 0);

    return {
      totale: filteredTurniTimbrature.length,
      conTimbratura: turniConTimbratura.length,
      senzaTimbratura: turniSenzaTimbratura.length,
      inRitardo: turniInRitardo.length,
      totaleMinutiRitardo
    };
  }, [filteredTurniTimbrature, config]);

  return (
    <ProtectedPage pageName="Planday">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Planday
            </h1>
            <p className="text-slate-500 mt-1">Gestione turni e timbrature</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <NeumorphicButton 
              onClick={() => setMainView('turni')}
              variant={mainView === 'turni' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Gestione Turni
            </NeumorphicButton>
            <NeumorphicButton 
              onClick={() => setMainView('timbrature')}
              variant={mainView === 'timbrature' ? 'primary' : 'default'}
              className="flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Timbrature
            </NeumorphicButton>
          </div>
        </div>

        {/* Main Content - Gestione Turni */}
        {mainView === 'turni' && (
          <>
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-4 text-center">
            <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{turni.length}</p>
            <p className="text-xs text-slate-500">Turni Settimana</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">
              {new Set(turni.map(t => t.dipendente_id).filter(Boolean)).size}
            </p>
            <p className="text-xs text-slate-500">Dipendenti Attivi</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <StoreIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">{stores.length}</p>
            <p className="text-xs text-slate-500">Locali</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">
              {Math.round(turni.reduce((sum, t) => {
                const [sh, sm] = t.ora_inizio.split(':').map(Number);
                const [eh, em] = t.ora_fine.split(':').map(Number);
                return sum + (eh - sh) + (em - sm) / 60;
              }, 0))}h
            </p>
            <p className="text-xs text-slate-500">Ore Totali</p>
          </NeumorphicCard>
        </div>

        {/* Controls and Navigation */}
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
              <NeumorphicButton onClick={() => setShowModelliModal(true)} className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Modelli
              </NeumorphicButton>
              <NeumorphicButton onClick={() => setShowSettimanaModelloModal(true)} className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Replica Settimana
              </NeumorphicButton>
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

            {/* Modello Turno Selector */}
            {turniModello.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Usa Turno Modello</label>
                <select
                  value={selectedModello}
                  onChange={(e) => {
                    applyModello(e.target.value);
                    setSelectedModello(e.target.value);
                  }}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                >
                  <option value="">-- Seleziona modello --</option>
                  {turniModello.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} ({m.ruolo}, {m.ora_inizio}-{m.ora_fine}, {m.tipo_turno})
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                {dipendentiPerStore.map(u => {
                  const canAssign = canAssignToRole(u, turnoForm.ruolo);
                  const disponibilita = getDipendenteDisponibilita(u.id);
                  const nome = u.nome_cognome || u.full_name;

                  let label = nome;
                  let statusEmoji = '';

                  if (!canAssign) {
                    statusEmoji = '🚫';
                    label = `${nome} (non è ${turnoForm.ruolo})`;
                  } else if (disponibilita.sovrapposizione) {
                    statusEmoji = '⚠️';
                    label = `${nome} (OCCUPATO - sovrapposizione orario)`;
                  } else if (disponibilita.turniGiorno.length > 0) {
                    statusEmoji = '📅';
                    const turniInfo = disponibilita.turniGiorno.map(t => `${t.ora_inizio}-${t.ora_fine}`).join(', ');
                    label = `${nome} (ha già turni: ${turniInfo})`;
                  } else {
                    statusEmoji = '✅';
                    label = `${nome} (libero)`;
                  }

                  return (
                    <option 
                      key={u.id} 
                      value={u.id}
                      disabled={!canAssign}
                      style={{ color: !canAssign ? '#999' : disponibilita.sovrapposizione ? '#dc2626' : 'inherit' }}
                    >
                      {statusEmoji} {label}
                    </option>
                  );
                })}
              </select>
              {turnoForm.dipendente_id && (() => {
                const disponibilita = getDipendenteDisponibilita(turnoForm.dipendente_id);
                if (disponibilita.sovrapposizione) {
                  return (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Attenzione: il dipendente ha già un turno che si sovrappone!
                    </p>
                  );
                }
                if (disponibilita.turniGiorno.length > 0) {
                  return (
                    <p className="text-xs text-orange-600 mt-1">
                      ℹ️ Altri turni oggi: {disponibilita.turniGiorno.map(t => `${t.ora_inizio}-${t.ora_fine}`).join(', ')}
                    </p>
                  );
                }
                return null;
              })()}
              </div>
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

                  {/* Turni posizionati in overlay */}
                  <div className="absolute top-0 left-0 right-0 grid grid-cols-8 gap-1 pointer-events-none" style={{ height: `${timeSlots.length * 25}px` }}>
                    <div />
                    {weekDays.map(day => {
                      const dayKey = day.format('YYYY-MM-DD');
                      const dayTurni = turniByDayHour[dayKey] || [];
                      const overlappingGroups = getOverlappingTurni(dayTurni);
                      const isDropTargetDay = dropTarget === dayKey;

                      return (
                        <div 
                          key={dayKey} 
                          className={`relative pointer-events-auto ${isDropTargetDay ? 'bg-blue-100 bg-opacity-50' : ''}`}
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

        {/* Vista Store */}
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
          <div className="flex flex-wrap items-center gap-4">
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
            <span className="text-xs text-slate-500 ml-4">💡 Trascina per spostare • Clicca per modificare</span>
          </div>
        </NeumorphicCard>





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
                          <button onClick={() => deleteTipoTurno(tipo)} className="text-red-500 hover:text-red-700">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lista modelli esistenti */}
              <div>
                <h3 className="font-medium text-slate-700 mb-3">Turni Modello</h3>
                
                {turniModello.length > 0 ? (
                  <div className="space-y-2 mb-4">
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
                ) : null}

                {/* Form nuovo modello */}
                <div className="neumorphic-flat p-4 rounded-xl">
                  <h4 className="font-medium text-slate-700 mb-3 text-sm">Crea Nuovo Modello</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={modelloForm.nome}
                      onChange={(e) => setModelloForm({ ...modelloForm, nome: e.target.value })}
                      className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                      placeholder="Nome modello (es: Turno Mattina)"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={modelloForm.ruolo}
                        onChange={(e) => setModelloForm({ ...modelloForm, ruolo: e.target.value })}
                        className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                      >
                        {RUOLI.map(ruolo => (
                          <option key={ruolo} value={ruolo}>{ruolo}</option>
                        ))}
                      </select>
                      <select
                        value={modelloForm.tipo_turno}
                        onChange={(e) => setModelloForm({ ...modelloForm, tipo_turno: e.target.value })}
                        className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                      >
                        {tipiTurno.map(tipo => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={modelloForm.ora_inizio}
                        onChange={(e) => setModelloForm({ ...modelloForm, ora_inizio: e.target.value })}
                        className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                      />
                      <input
                        type="time"
                        value={modelloForm.ora_fine}
                        onChange={(e) => setModelloForm({ ...modelloForm, ora_fine: e.target.value })}
                        className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                      />
                    </div>
                    <NeumorphicButton 
                      onClick={saveModello} 
                      variant="primary" 
                      className="w-full text-sm"
                      disabled={!modelloForm.nome}
                    >
                      <Plus className="w-4 h-4 inline mr-1" /> Salva Modello
                    </NeumorphicButton>
                  </div>
                </div>
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
                    {dipendentiPerStore.map(u => {
                      const canAssign = canAssignToRole(u, turnoForm.ruolo);
                      const disponibilita = getDipendenteDisponibilita(u.id);
                      const nome = u.nome_cognome || u.full_name;
                      
                      let statusEmoji = '';
                      let label = nome;
                      
                      if (!canAssign) {
                        statusEmoji = '🚫';
                        label = `${nome} (non ${turnoForm.ruolo})`;
                      } else if (disponibilita.sovrapposizione) {
                        statusEmoji = '⚠️';
                        label = `${nome} (OCCUPATO)`;
                      } else if (disponibilita.turniGiorno.length > 0) {
                        statusEmoji = '📅';
                        label = `${nome} (altri turni)`;
                      } else {
                        statusEmoji = '✅';
                        label = `${nome}`;
                      }
                      
                      return (
                        <option key={u.id} value={u.id} disabled={!canAssign}>
                          {statusEmoji} {label}
                        </option>
                      );
                    })}
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
          </>
        )}

        {/* Main Content - Timbrature */}
        {mainView === 'timbrature' && (
          <>
            {/* Settings Buttons */}
            <div className="flex justify-end gap-2">
              <NeumorphicButton 
                onClick={() => {
                  if (config) {
                    setConfigForm({
                      distanza_massima_metri: config.distanza_massima_metri || 100,
                      tolleranza_ritardo_minuti: config.tolleranza_ritardo_minuti ?? 0,
                      abilita_timbratura_gps: config.abilita_timbratura_gps !== false,
                      arrotonda_ritardo: config.arrotonda_ritardo || false,
                      arrotondamento_tipo: config.arrotondamento_tipo || 'eccesso',
                      arrotondamento_minuti: config.arrotondamento_minuti || 15,
                      penalita_timbratura_mancata: config.penalita_timbratura_mancata || 0,
                      ore_mancata_uscita: config.ore_mancata_uscita || 2
                    });
                  }
                  setShowConfigModal(true);
                }}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Impostazioni Timbratura
              </NeumorphicButton>
              <NeumorphicButton 
                onClick={() => setShowAlertSettings(true)}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Alert WhatsApp
              </NeumorphicButton>
            </div>

            {/* Filtri Timbrature */}
            <NeumorphicCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Filtri</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Store</label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
                  >
                    <option value="all">Tutti gli store</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Dipendente</label>
                  <select
                    value={selectedDipendenteTimbr}
                    onChange={(e) => setSelectedDipendenteTimbr(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
                  >
                    <option value="all">Tutti</option>
                    {users.filter(u => u.user_type === 'dipendente' || u.user_type === 'user').map(u => (
                      <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Ruolo</label>
                  <select
                    value={selectedRuolo}
                    onChange={(e) => setSelectedRuolo(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
                  >
                    <option value="all">Tutti</option>
                    <option value="Pizzaiolo">Pizzaiolo</option>
                    <option value="Cassiere">Cassiere</option>
                    <option value="Store Manager">Store Manager</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Da</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">A</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>
            </NeumorphicCard>

            {/* Statistiche Timbrature */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <NeumorphicCard className="p-4 text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">{timbratureStats.totale}</p>
                <p className="text-xs text-slate-500">Turni Totali</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{timbratureStats.conTimbratura}</p>
                <p className="text-xs text-slate-500">Timbrati</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{timbratureStats.senzaTimbratura}</p>
                <p className="text-xs text-slate-500">Non Timbrati</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{timbratureStats.inRitardo}</p>
                <p className="text-xs text-slate-500">In Ritardo</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{Math.round(timbratureStats.totaleMinutiRitardo / 60)}h</p>
                <p className="text-xs text-slate-500">Totale Ritardi</p>
              </NeumorphicCard>
            </div>

            {/* Modal Edit Timbratura */}
            {editingTimbratura && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <NeumorphicCard className="p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Modifica Timbratura</h2>
                    <button onClick={() => setEditingTimbratura(null)} className="nav-button p-2 rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                    <p className="text-sm text-slate-700">
                      <strong>{editingTimbratura.dipendente_nome}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      {moment(editingTimbratura.data).format('DD/MM/YYYY')} • {editingTimbratura.ora_inizio}-{editingTimbratura.ora_fine}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Timbratura Entrata</label>
                      <input
                        type="datetime-local"
                        value={timbrForm.timbrata_entrata}
                        onChange={(e) => setTimbrForm({ ...timbrForm, timbrata_entrata: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Timbratura Uscita</label>
                      <input
                        type="datetime-local"
                        value={timbrForm.timbrata_uscita}
                        onChange={(e) => setTimbrForm({ ...timbrForm, timbrata_uscita: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <NeumorphicButton onClick={() => setEditingTimbratura(null)} className="flex-1">
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton 
                      onClick={() => {
                        const updateData = {};
                        if (timbrForm.timbrata_entrata) {
                          updateData.timbrata_entrata = new Date(timbrForm.timbrata_entrata).toISOString();
                        } else {
                          updateData.timbrata_entrata = null;
                        }
                        if (timbrForm.timbrata_uscita) {
                          updateData.timbrata_uscita = new Date(timbrForm.timbrata_uscita).toISOString();
                        } else {
                          updateData.timbrata_uscita = null;
                        }
                        updateTimbraturaMutation.mutate({
                          id: editingTimbratura.id,
                          data: updateData
                        });
                      }}
                      variant="primary"
                      className="flex-1"
                      disabled={updateTimbraturaMutation.isPending}
                    >
                      {updateTimbraturaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
                    </NeumorphicButton>
                  </div>
                </NeumorphicCard>
              </div>
            )}

            {/* Lista Timbrature */}
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Lista Timbrature</h2>
              
              {filteredTurniTimbrature.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessuna timbratura trovata</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left p-2 text-xs font-medium text-slate-600">Data</th>
                        <th className="text-left p-2 text-xs font-medium text-slate-600">Dipendente</th>
                        <th className="text-left p-2 text-xs font-medium text-slate-600">Store</th>
                        <th className="text-left p-2 text-xs font-medium text-slate-600">Ruolo</th>
                        <th className="text-left p-2 text-xs font-medium text-slate-600">Tipo</th>
                        <th className="text-left p-2 text-xs font-medium text-slate-600">Turno</th>
                        <th className="text-left p-2 text-xs font-medium text-slate-600">Entrata</th>
                        <th className="text-left p-2 text-xs font-medium text-slate-600">Uscita</th>
                        <th className="text-center p-2 text-xs font-medium text-slate-600">Ore Eff.</th>
                        <th className="text-center p-2 text-xs font-medium text-slate-600">Rit. Reale</th>
                        <th className="text-center p-2 text-xs font-medium text-slate-600">Rit. Cont.</th>
                        <th className="text-center p-2 text-xs font-medium text-slate-600">Form</th>
                        <th className="text-center p-2 text-xs font-medium text-slate-600">Stato</th>
                        <th className="text-center p-2 text-xs font-medium text-slate-600">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTurniTimbrature.slice(0, 100).map(turno => {
                        const stato = getTimbraturaTipo(turno);
                        const turnoTipo = getTurnoTipo(turno);
                        const formStatus = getFormCompilati(turno);
                        return (
                          <tr key={turno.id} className={`border-b border-slate-100 hover:bg-slate-50 ${stato.tipo === 'mancata' || stato.tipo === 'mancata_uscita' ? 'bg-red-50' : ''}`}>
                            <td className="p-2">
                              <div className="text-xs font-medium text-slate-800 whitespace-nowrap">
                                {moment(turno.data).format('DD/MM/YY')}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {moment(turno.data).format('ddd')}
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="text-xs font-medium text-slate-800">
                                {turno.dipendente_nome || getDipendenteName(turno.dipendente_id) || '-'}
                              </div>
                            </td>
                            <td className="p-2 text-xs text-slate-600 whitespace-nowrap">
                              {getStoreName(turno.store_id)}
                            </td>
                            <td className="p-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                                turno.ruolo === 'Pizzaiolo' ? 'bg-orange-100 text-orange-700' :
                                turno.ruolo === 'Cassiere' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {turno.ruolo}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                                turnoTipo === 'Mattina' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {turnoTipo}
                              </span>
                            </td>
                            <td className="p-2 text-xs text-slate-600 whitespace-nowrap">
                              {turno.ora_inizio}-{turno.ora_fine}
                            </td>
                            <td className="p-2 text-xs">
                              {turno.timbrata_entrata ? (
                                <div className="whitespace-nowrap">
                                  <div className="font-medium text-slate-800">
                                    {moment(turno.timbrata_entrata).format('HH:mm')}
                                  </div>
                                  {turno.posizione_entrata && (
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <MapPin className="w-2 h-2" />
                                      GPS
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className={`whitespace-nowrap ${stato.tipo === 'mancata' ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                                  {stato.tipo === 'mancata' ? 'MANCATA' : '-'}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-xs whitespace-nowrap">
                              {turno.timbrata_uscita ? (
                                <div className="font-medium text-slate-800">
                                  {moment(turno.timbrata_uscita).format('HH:mm')}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-center text-xs whitespace-nowrap font-medium text-blue-700">
                              {calcolaOreEffettive(turno) || '-'}
                            </td>
                            <td className="p-2 text-center text-xs whitespace-nowrap">
                              {stato.ritardoReale > 0 ? (
                                <span className="text-orange-600 font-medium">{stato.ritardoReale}m</span>
                              ) : stato.tipo === 'mancata' ? (
                                <span className="text-red-600 font-medium">-</span>
                              ) : (
                                <span className="text-green-600">0</span>
                              )}
                            </td>
                            <td className="p-2 text-center text-xs whitespace-nowrap">
                              {stato.ritardoConteggiato > 0 ? (
                                <span className={`font-bold ${stato.tipo === 'mancata' || stato.tipo === 'mancata_uscita' ? 'text-red-600' : 'text-orange-600'}`}>
                                  {stato.ritardoConteggiato}m
                                </span>
                              ) : stato.tipo === 'ritardo' ? (
                                <span className="text-green-600 text-[10px]">OK</span>
                              ) : (
                                <span className="text-green-600">0</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {formStatus.dovuti.length > 0 ? (
                                <div className="text-[10px] space-y-0.5">
                                  {formStatus.dovuti.map((formName, idx) => {
                                    const compilato = formStatus.compilati.includes(formName);
                                    return (
                                      <div key={idx} className={`px-1.5 py-0.5 rounded whitespace-nowrap ${compilato ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {formName} {compilato ? '✓' : '✗'}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <span className={`text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap ${stato.bg} ${stato.color}`}>
                                {stato.tipo === 'mancata' ? '⚠️ Mancata' : stato.tipo === 'mancata_uscita' ? '⚠️ Uscita Mancata' : stato.label}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  setEditingTimbratura(turno);
                                  setTimbrForm({
                                    timbrata_entrata: turno.timbrata_entrata ? moment(turno.timbrata_entrata).format('YYYY-MM-DDTHH:mm') : '',
                                    timbrata_uscita: turno.timbrata_uscita ? moment(turno.timbrata_uscita).format('YYYY-MM-DDTHH:mm') : ''
                                  });
                                }}
                                className="nav-button p-1.5 rounded-lg hover:bg-blue-50"
                              >
                                <Edit className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </NeumorphicCard>
          </>
        )}

        {/* Modal Impostazioni Timbratura */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Impostazioni Timbratura</h2>
                <button onClick={() => setShowConfigModal(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* GPS Settings */}
                <div className="neumorphic-pressed p-4 rounded-xl">
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Impostazioni GPS
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Distanza massima per timbratura (metri)
                      </label>
                      <input
                        type="number"
                        value={configForm.distanza_massima_metri}
                        onChange={(e) => setConfigForm({ ...configForm, distanza_massima_metri: parseInt(e.target.value) || 100 })}
                        className="w-full neumorphic-flat px-4 py-3 rounded-xl text-slate-700 outline-none"
                      />
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
                  </div>
                </div>

                {/* Arrotondamento Ritardo */}
                <div className="neumorphic-pressed p-4 rounded-xl">
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Arrotondamento Ritardi
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="arrotonda-check"
                      checked={configForm.arrotonda_ritardo}
                      onChange={(e) => setConfigForm({ ...configForm, arrotonda_ritardo: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <label htmlFor="arrotonda-check" className="text-sm font-medium text-slate-700">
                      Abilita arrotondamento ritardi
                    </label>
                  </div>

                  {configForm.arrotonda_ritardo && (
                    <div className="space-y-3 ml-7">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo di arrotondamento</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="arrotondamento_tipo"
                              value="eccesso"
                              checked={configForm.arrotondamento_tipo === 'eccesso'}
                              onChange={(e) => setConfigForm({ ...configForm, arrotondamento_tipo: e.target.value })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-slate-700">Per eccesso (es: 4 min → 15 min)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="arrotondamento_tipo"
                              value="difetto"
                              checked={configForm.arrotondamento_tipo === 'difetto'}
                              onChange={(e) => setConfigForm({ ...configForm, arrotondamento_tipo: e.target.value })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-slate-700">Per difetto (es: 14 min → 0 min)</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                          Arrotonda a multipli di (minuti)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={configForm.arrotondamento_minuti}
                          onChange={(e) => setConfigForm({ ...configForm, arrotondamento_minuti: parseInt(e.target.value) || 15 })}
                          className="w-full neumorphic-flat px-4 py-3 rounded-xl outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Valori comuni: 5, 10, 15, 30 minuti
                        </p>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700">
                          <strong>Esempio con {configForm.arrotondamento_minuti} min per {configForm.arrotondamento_tipo}:</strong><br/>
                          {configForm.arrotondamento_tipo === 'eccesso' 
                            ? `1-${configForm.arrotondamento_minuti} min → ${configForm.arrotondamento_minuti} min | ${configForm.arrotondamento_minuti + 1}-${configForm.arrotondamento_minuti * 2} min → ${configForm.arrotondamento_minuti * 2} min`
                            : `0-${configForm.arrotondamento_minuti - 1} min → 0 min | ${configForm.arrotondamento_minuti}-${configForm.arrotondamento_minuti * 2 - 1} min → ${configForm.arrotondamento_minuti} min`
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Penalità Timbratura Mancata */}
                <div className="neumorphic-pressed p-4 rounded-xl">
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Penalità Timbratura Mancata
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Penalità mancata timbratura entrata (minuti)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={configForm.penalita_timbratura_mancata}
                        onChange={(e) => setConfigForm({ ...configForm, penalita_timbratura_mancata: parseInt(e.target.value) || 0 })}
                        className="w-full neumorphic-flat px-4 py-3 rounded-xl text-slate-700 outline-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Applicata se non c'è timbratura entrata entro la fine del turno
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Ore dopo fine turno per considerare uscita mancata
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={configForm.ore_mancata_uscita}
                        onChange={(e) => setConfigForm({ ...configForm, ore_mancata_uscita: parseFloat(e.target.value) || 2 })}
                        className="w-full neumorphic-flat px-4 py-3 rounded-xl text-slate-700 outline-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Se non c'è timbratura uscita entro X ore dalla fine turno, viene applicata la penalità
                      </p>
                    </div>
                  </div>
                </div>

                {/* GPS Locali */}
                <div className="neumorphic-pressed p-4 rounded-xl">
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Posizione GPS Locali</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {stores.map(store => (
                      <div key={store.id} className="neumorphic-flat p-3 rounded-xl">
                        {editingStore?.id === store.id ? (
                          <div className="space-y-2">
                            <div className="font-medium text-slate-800">{store.name}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                step="any"
                                value={storeCoords.latitude}
                                onChange={(e) => setStoreCoords({ ...storeCoords, latitude: e.target.value })}
                                className="neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                                placeholder="Latitudine"
                              />
                              <input
                                type="number"
                                step="any"
                                value={storeCoords.longitude}
                                onChange={(e) => setStoreCoords({ ...storeCoords, longitude: e.target.value })}
                                className="neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                                placeholder="Longitudine"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingStore(null)} className="text-sm text-slate-600">Annulla</button>
                              <button onClick={handleSaveStoreCoords} className="text-sm bg-blue-500 text-white px-3 py-1 rounded-lg">Salva</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-800">{store.name}</div>
                              <div className="text-xs text-slate-400">
                                {store.latitude && store.longitude ? `📍 ${store.latitude}, ${store.longitude}` : '⚠️ GPS non impostato'}
                              </div>
                            </div>
                            <button onClick={() => handleEditStore(store)} className="text-blue-600">
                              <Edit className="w-4 h-4" />
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
                  onClick={() => {
                    saveConfigMutation.mutate(configForm);
                  }} 
                  variant="primary" 
                  className="flex-1"
                >
                  Salva Impostazioni
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
            </div>
          </div>
        )}

        {/* Modal Alert Settings */}
        {showAlertSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Impostazioni Alert WhatsApp</h2>
                <button onClick={() => setShowAlertSettings(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="alert-enabled"
                    checked={alertConfig.enabled}
                    onChange={(e) => setAlertConfig({ ...alertConfig, enabled: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="alert-enabled" className="text-sm font-medium text-slate-700">
                    Abilita alert per mancata timbratura
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Invia alert dopo (minuti di ritardo)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={alertConfig.minutiRitardo}
                    onChange={(e) => setAlertConfig({ ...alertConfig, minutiRitardo: parseInt(e.target.value) || 15 })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Se il dipendente non timbra entro X minuti dall'inizio del turno
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Numero WhatsApp per notifiche
                  </label>
                  <input
                    type="tel"
                    value={alertConfig.whatsappNumber}
                    onChange={(e) => setAlertConfig({ ...alertConfig, whatsappNumber: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                    placeholder="+39 333 1234567"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Inserisci il numero con prefisso internazionale
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notify-managers"
                    checked={alertConfig.notifyManagers}
                    onChange={(e) => setAlertConfig({ ...alertConfig, notifyManagers: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="notify-managers" className="text-sm font-medium text-slate-700">
                    Notifica anche gli Store Manager dello store
                  </label>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">Come funziona:</p>
                      <p>Quando un dipendente non timbra entro i minuti impostati dall'inizio del turno, verrà inviato un alert WhatsApp con i dettagli del turno mancato.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <NeumorphicButton onClick={() => setShowAlertSettings(false)} className="flex-1">
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton 
                  onClick={() => saveAlertMutation.mutate(alertConfig)}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={saveAlertMutation.isPending}
                >
                  {saveAlertMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salva
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}


      </div>
    </ProtectedPage>
  );
}