import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Edit, Trash2, Save, X, Copy, Clock, Users, Store, FileText, GraduationCap, Sparkles } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const RUOLI = ['Pizzaiolo', 'Cassiere', 'Store Manager'];
// Tipi turno caricati da database
const COLORI = [
  { value: 'blue', label: 'Blu', class: 'bg-blue-200 border-blue-400' },
  { value: 'green', label: 'Verde', class: 'bg-green-200 border-green-400' },
  { value: 'yellow', label: 'Giallo', class: 'bg-yellow-200 border-yellow-400' },
  { value: 'red', label: 'Rosso', class: 'bg-red-200 border-red-400' },
  { value: 'purple', label: 'Viola', class: 'bg-purple-200 border-purple-400' },
  { value: 'orange', label: 'Arancione', class: 'bg-orange-200 border-orange-400' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-200 border-pink-400' },
  { value: 'gray', label: 'Grigio', class: 'bg-gray-200 border-gray-400' },
];

const AVAILABLE_FORMS = [
  { value: '', label: 'Nessun form' },
  { value: 'FormInventario', label: 'Inventario' },
  { value: 'FormCantina', label: 'Cantina' },
  { value: 'FormTeglieButtate', label: 'Teglie Buttate' },
  { value: 'FormPreparazioni', label: 'Preparazioni' },
  { value: 'ConteggioCassa', label: 'Conteggio Cassa' },
  { value: 'ControlloPuliziaCassiere', label: 'Pulizia Cassiere' },
  { value: 'ControlloPuliziaPizzaiolo', label: 'Pulizia Pizzaiolo' },
  { value: 'ControlloPuliziaStoreManager', label: 'Pulizia Store Manager' },
  { value: 'Impasto', label: 'Impasto' },
  { value: 'Precotture', label: 'Precotture' },
];

// Generate time slots from 06:00 to 02:00 (next day) in 5-minute increments
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 6; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  // Add slots for 00:00 to 02:00
  for (let h = 0; h <= 2; h++) {
    for (let m = 0; m < 60; m += 5) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export default function StrutturaTurno() {
  const [selectedGiorno, setSelectedGiorno] = useState(1); // Default: Lunedì
  const [selectedRuolo, setSelectedRuolo] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSchema, setEditingSchema] = useState(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [schemaToCopy, setSchemaToCopy] = useState(null);
  const [copyTargetDays, setCopyTargetDays] = useState([]);

  const [formData, setFormData] = useState({
    nome_schema: '',
    giorno_settimana: 1,
    ruolo: 'Pizzaiolo',
    assigned_stores: [],
    tipi_turno: [],
    slots: [],
    is_active: true,
    usa_minuti_relativi: false
  });

  const [newSlot, setNewSlot] = useState({
    ora_inizio: '09:00',
    ora_fine: '09:15',
    attivita: '',
    colore: 'blue',
    richiede_form: false,
    form_page: '',
    corsi_ids: [],
    attrezzature_pulizia: [],
    minuti_inizio: 0,
    minuti_fine: 15
  });
  const [editingSlotIndex, setEditingSlotIndex] = useState(null);
  const [newAttrezzatura, setNewAttrezzatura] = useState('');

  const queryClient = useQueryClient();

  const { data: schemi = [] } = useQuery({
    queryKey: ['struttura-turno'],
    queryFn: () => base44.entities.StrutturaTurno.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: corsi = [] } = useQuery({
    queryKey: ['corsi'],
    queryFn: () => base44.entities.Corso.list(),
  });

  const { data: domandePulizia = [] } = useQuery({
    queryKey: ['domande-pulizia'],
    queryFn: () => base44.entities.DomandaPulizia.filter({ attiva: true }),
  });

  const { data: tipoTurnoConfigs = [] } = useQuery({
    queryKey: ['tipo-turno-configs'],
    queryFn: () => base44.entities.TipoTurnoConfig.list(),
  });

  // Derive tipi turno from configs in database
  const TIPI_TURNO = tipoTurnoConfigs.length > 0
    ? tipoTurnoConfigs.map(c => c.tipo_turno)
    : ['Normale', 'Straordinario', 'Formazione', 'Affiancamento', 'Prova e Affiancamento', 'Apertura', 'Chiusura'];

  // Get unique equipment names from cleaning questions
  const attrezzatureDisponibili = [...new Set(
    domandePulizia
      .filter(d => d.tipo_controllo === 'foto' && d.attrezzatura)
      .map(d => d.attrezzatura)
  )].sort();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StrutturaTurno.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['struttura-turno'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StrutturaTurno.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['struttura-turno'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StrutturaTurno.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['struttura-turno'] });
    },
  });

  const resetForm = () => {
    setFormData({
      nome_schema: '',
      giorno_settimana: selectedGiorno,
      ruolo: 'Pizzaiolo',
      assigned_stores: [],
      tipi_turno: [],
      slots: [],
      is_active: true,
      usa_minuti_relativi: false
    });
    setNewSlot({ ora_inizio: '09:00', ora_fine: '09:15', attivita: '', colore: 'blue', richiede_form: false, form_page: '', corsi_ids: [], attrezzature_pulizia: [], minuti_inizio: 0, minuti_fine: 15 });
    setEditingSchema(null);
    setShowForm(false);
  };

  // Check if selected tipi_turno includes "Prova" or "Affiancamento"
  const isProvaAffiancamento = (formData.tipi_turno || []).some(t => {
    const lower = t.toLowerCase();
    return lower.includes('prova') || lower.includes('affiancamento');
  });

  const handleEdit = (schema) => {
    setEditingSchema(schema);
    setFormData({
      nome_schema: schema.nome_schema,
      giorno_settimana: schema.giorno_settimana,
      ruolo: schema.ruolo,
      assigned_stores: schema.assigned_stores || [],
      tipi_turno: schema.tipi_turno || [],
      slots: schema.slots || [],
      is_active: schema.is_active !== false,
      usa_minuti_relativi: schema.usa_minuti_relativi || false
    });
    setShowForm(true);
  };
  
  const toggleTipoTurno = (tipo) => {
    const current = formData.tipi_turno || [];
    if (current.includes(tipo)) {
      setFormData({ ...formData, tipi_turno: current.filter(t => t !== tipo) });
    } else {
      setFormData({ ...formData, tipi_turno: [...current, tipo] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSchema) {
      updateMutation.mutate({ id: editingSchema.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addSlot = () => {
    if (!newSlot.attivita.trim()) {
      alert('Inserisci una descrizione per l\'attività');
      return;
    }
    const slotToAdd = isProvaAffiancamento ? {
      minuti_inizio: newSlot.minuti_inizio,
      minuti_fine: newSlot.minuti_fine,
      attivita: newSlot.attivita,
      colore: newSlot.colore,
      richiede_form: newSlot.richiede_form || false,
      form_page: newSlot.richiede_form ? newSlot.form_page : '',
      corsi_ids: newSlot.corsi_ids || [],
      attrezzature_pulizia: newSlot.attrezzature_pulizia || []
    } : {
      ora_inizio: newSlot.ora_inizio,
      ora_fine: newSlot.ora_fine,
      attivita: newSlot.attivita,
      colore: newSlot.colore,
      richiede_form: newSlot.richiede_form || false,
      form_page: newSlot.richiede_form ? newSlot.form_page : '',
      corsi_ids: newSlot.corsi_ids || [],
      attrezzature_pulizia: newSlot.attrezzature_pulizia || []
    };
    
    if (editingSlotIndex !== null) {
      // Update existing slot
      const updatedSlots = [...formData.slots];
      updatedSlots[editingSlotIndex] = slotToAdd;
      setFormData({
        ...formData,
        slots: isProvaAffiancamento 
          ? updatedSlots.sort((a, b) => (a.minuti_inizio || 0) - (b.minuti_inizio || 0))
          : updatedSlots.sort((a, b) => (a.ora_inizio || '').localeCompare(b.ora_inizio || ''))
      });
      setEditingSlotIndex(null);
    } else {
      // Add new slot
      setFormData({
        ...formData,
        slots: isProvaAffiancamento
          ? [...formData.slots, slotToAdd].sort((a, b) => (a.minuti_inizio || 0) - (b.minuti_inizio || 0))
          : [...formData.slots, slotToAdd].sort((a, b) => (a.ora_inizio || '').localeCompare(b.ora_inizio || ''))
      });
    }
    setNewSlot({ 
      ora_inizio: newSlot.ora_fine, 
      ora_fine: newSlot.ora_fine, 
      attivita: '', 
      colore: 'blue', 
      richiede_form: false, 
      form_page: '', 
      corsi_ids: [], 
      attrezzature_pulizia: [],
      minuti_inizio: newSlot.minuti_fine,
      minuti_fine: newSlot.minuti_fine + 15
    });
  };

  const startEditSlot = (index) => {
    const slot = formData.slots[index];
    // Handle backward compatibility: convert corso_id to corsi_ids
    let corsiIds = slot.corsi_ids || [];
    if (corsiIds.length === 0 && slot.corso_id) {
      corsiIds = [slot.corso_id];
    }
    setNewSlot({
      ora_inizio: slot.ora_inizio,
      ora_fine: slot.ora_fine,
      attivita: slot.attivita,
      colore: slot.colore || 'blue',
      richiede_form: slot.richiede_form || false,
      form_page: slot.form_page || '',
      corsi_ids: corsiIds,
      attrezzature_pulizia: slot.attrezzature_pulizia || []
    });
    setEditingSlotIndex(index);
  };

  const cancelEditSlot = () => {
    setEditingSlotIndex(null);
    setNewSlot({ ora_inizio: '09:00', ora_fine: '09:15', attivita: '', colore: 'blue', richiede_form: false, form_page: '', corsi_ids: [], attrezzature_pulizia: [] });
  };

  const getCorsoName = (corsoId) => {
    return corsi.find(c => c.id === corsoId)?.nome_corso || '';
  };

  const toggleCorso = (corsoId) => {
    const current = newSlot.corsi_ids || [];
    if (current.includes(corsoId)) {
      setNewSlot({ ...newSlot, corsi_ids: current.filter(id => id !== corsoId) });
    } else {
      setNewSlot({ ...newSlot, corsi_ids: [...current, corsoId] });
    }
  };

  const getSlotCorsi = (slot) => {
    // Handle backward compatibility
    if (slot.corsi_ids && slot.corsi_ids.length > 0) {
      return slot.corsi_ids;
    }
    if (slot.corso_id) {
      return [slot.corso_id];
    }
    return [];
  };

  const toggleAttrezzatura = (attr) => {
    const current = newSlot.attrezzature_pulizia || [];
    if (current.includes(attr)) {
      setNewSlot({ ...newSlot, attrezzature_pulizia: current.filter(a => a !== attr) });
    } else {
      setNewSlot({ ...newSlot, attrezzature_pulizia: [...current, attr] });
    }
  };

  const addNewAttrezzatura = () => {
    const trimmed = newAttrezzatura.trim();
    if (!trimmed) return;
    if (!(newSlot.attrezzature_pulizia || []).includes(trimmed)) {
      setNewSlot({ ...newSlot, attrezzature_pulizia: [...(newSlot.attrezzature_pulizia || []), trimmed] });
    }
    setNewAttrezzatura('');
  };

  const getFormLabel = (formPage) => {
    return AVAILABLE_FORMS.find(f => f.value === formPage)?.label || formPage;
  };

  const removeSlot = (index) => {
    setFormData({
      ...formData,
      slots: formData.slots.filter((_, i) => i !== index)
    });
  };

  const toggleStore = (storeId) => {
    const current = formData.assigned_stores || [];
    if (current.includes(storeId)) {
      setFormData({ ...formData, assigned_stores: current.filter(id => id !== storeId) });
    } else {
      setFormData({ ...formData, assigned_stores: [...current, storeId] });
    }
  };

  const [copyTargetStores, setCopyTargetStores] = useState([]);

  const openCopyModal = (schema) => {
    setSchemaToCopy(schema);
    setCopyTargetDays([]);
    setCopyTargetStores([]);
    setShowCopyModal(true);
  };

  const handleCopy = async () => {
    // Copia su altri giorni
    if (copyTargetDays.length > 0) {
      for (const giorno of copyTargetDays) {
        await createMutation.mutateAsync({
          nome_schema: `${schemaToCopy.nome_schema} (${GIORNI[giorno]})`,
          giorno_settimana: giorno,
          ruolo: schemaToCopy.ruolo,
          assigned_stores: schemaToCopy.assigned_stores || [],
          slots: schemaToCopy.slots || [],
          is_active: true
        });
      }
    }

    // Copia su altri store (stesso giorno)
    if (copyTargetStores.length > 0) {
      for (const storeId of copyTargetStores) {
        const storeName = getStoreName(storeId);
        await createMutation.mutateAsync({
          nome_schema: `${schemaToCopy.nome_schema} (${storeName})`,
          giorno_settimana: schemaToCopy.giorno_settimana,
          ruolo: schemaToCopy.ruolo,
          assigned_stores: [storeId],
          slots: schemaToCopy.slots || [],
          is_active: true
        });
      }
    }

    if (copyTargetDays.length === 0 && copyTargetStores.length === 0) {
      alert('Seleziona almeno un giorno o uno store');
      return;
    }

    setShowCopyModal(false);
    setSchemaToCopy(null);
    setCopyTargetDays([]);
    setCopyTargetStores([]);
  };

  const getColoreClass = (colore) => {
    return COLORI.find(c => c.value === colore)?.class || 'bg-gray-200 border-gray-400';
  };

  const getStoreName = (storeId) => {
    return stores.find(s => s.id === storeId)?.name || storeId;
  };

  // Filter schemas
  const filteredSchemi = schemi.filter(s => {
    if (s.giorno_settimana !== selectedGiorno) return false;
    if (selectedRuolo && s.ruolo !== selectedRuolo) return false;
    if (selectedStoreFilter && !(s.assigned_stores || []).includes(selectedStoreFilter)) return false;
    return true;
  });

  return (
    <ProtectedPage pageName="StrutturaTurno">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
              Struttura Turno
            </h1>
            <p className="text-sm text-slate-500">Gestisci gli schemi dei turni per giorno e ruolo</p>
          </div>
          <NeumorphicButton
            onClick={() => {
              setFormData({ ...formData, giorno_settimana: selectedGiorno });
              setShowForm(true);
            }}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuovo Schema
          </NeumorphicButton>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Giorno
              </label>
              <div className="flex flex-wrap gap-1">
                {GIORNI.map((giorno, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedGiorno(idx)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedGiorno === idx
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'nav-button text-slate-700'
                    }`}
                  >
                    {giorno.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Users className="w-4 h-4 inline mr-1" />
                Ruolo
              </label>
              <select
                value={selectedRuolo}
                onChange={(e) => setSelectedRuolo(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Tutti i ruoli</option>
                {RUOLI.map(ruolo => (
                  <option key={ruolo} value={ruolo}>{ruolo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Store className="w-4 h-4 inline mr-1" />
                Locale
              </label>
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Tutti i locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          </div>
        </NeumorphicCard>

        {/* Schema List */}
        {filteredSchemi.length === 0 ? (
          <NeumorphicCard className="p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessuno schema per {GIORNI[selectedGiorno]}</p>
            <p className="text-xs text-slate-400 mt-2">Crea un nuovo schema per iniziare</p>
          </NeumorphicCard>
        ) : (
          <div className="space-y-4">
            {filteredSchemi.map(schema => (
              <NeumorphicCard key={schema.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{schema.nome_schema}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      📅 {GIORNI[schema.giorno_settimana]}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {schema.ruolo}
                      </span>
                      {(schema.assigned_stores || []).map(storeId => (
                        <span key={storeId} className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {getStoreName(storeId)}
                        </span>
                      ))}
                      {(!schema.assigned_stores || schema.assigned_stores.length === 0) && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Tutti i locali
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openCopyModal(schema)} className="nav-button p-2 rounded-lg" title="Copia su altri giorni">
                      <Copy className="w-4 h-4 text-purple-600" />
                    </button>
                    <button onClick={() => handleEdit(schema)} className="nav-button p-2 rounded-lg">
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Eliminare questo schema?')) {
                          deleteMutation.mutate(schema.id);
                        }
                      }}
                      className="nav-button p-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Timeline View */}
                <div className="mt-4 overflow-x-auto">
                  <div className="min-w-[600px]">
                    {(schema.slots || []).length === 0 ? (
                      <p className="text-sm text-slate-500 italic">Nessuno slot configurato</p>
                    ) : (
                      <div className="space-y-2">
                        {(schema.slots || []).map((slot, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-2 ${getColoreClass(slot.colore)} flex items-center gap-4`}
                          >
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Clock className="w-4 h-4 text-slate-600" />
                              <span className="font-mono font-bold text-slate-700">
                                {slot.minuti_inizio !== undefined 
                                  ? `${slot.minuti_inizio}-${slot.minuti_fine} min`
                                  : `${slot.ora_inizio} - ${slot.ora_fine}`}
                              </span>
                            </div>
                            <span className="text-slate-800 font-medium">{slot.attivita}</span>
                            {slot.richiede_form && slot.form_page && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {getFormLabel(slot.form_page)}
                              </span>
                            )}
                            {getSlotCorsi(slot).length > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" />
                                {getSlotCorsi(slot).length === 1 
                                  ? getCorsoName(getSlotCorsi(slot)[0])
                                  : `${getSlotCorsi(slot).length} corsi`
                                }
                              </span>
                            )}
                            {(slot.attrezzature_pulizia || []).length > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1" title={slot.attrezzature_pulizia.join(', ')}>
                                <Sparkles className="w-3 h-3" />
                                {slot.attrezzature_pulizia.length} attrezz.
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingSchema ? 'Modifica Schema' : 'Nuovo Schema'}
                  </h2>
                  <button onClick={resetForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Nome Schema</label>
                      <input
                        type="text"
                        value={formData.nome_schema}
                        onChange={(e) => setFormData({ ...formData, nome_schema: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                        placeholder="es. Turno Mattina Pizzaiolo"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Giorno</label>
                      <select
                        value={formData.giorno_settimana}
                        onChange={(e) => setFormData({ ...formData, giorno_settimana: parseInt(e.target.value) })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      >
                        {GIORNI.map((giorno, idx) => (
                          <option key={idx} value={idx}>{giorno}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Ruolo</label>
                    <div className="flex flex-wrap gap-2">
                      {RUOLI.map(ruolo => (
                        <button
                          key={ruolo}
                          type="button"
                          onClick={() => setFormData({ ...formData, ruolo })}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            formData.ruolo === ruolo
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'nav-button text-slate-700'
                          }`}
                        >
                          {ruolo}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Locali (vuoto = tutti)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {stores.map(store => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => toggleStore(store.id)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            (formData.assigned_stores || []).includes(store.id)
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'nav-button text-slate-700'
                          }`}
                        >
                          {store.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Tipi Turno (vuoto = tutti)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TIPI_TURNO.map(tipo => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => toggleTipoTurno(tipo)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            (formData.tipi_turno || []).includes(tipo)
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                              : 'nav-button text-slate-700'
                          }`}
                        >
                          {tipo}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Le attività saranno mostrate solo per questi tipi di turno</p>
                  </div>

                  {/* Slots Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                      Slot Temporali
                      {editingSlotIndex !== null && (
                        <span className="ml-2 text-sm font-normal text-blue-600">(Modifica slot #{editingSlotIndex + 1})</span>
                      )}
                    </h3>

                    {/* Add Slot Form */}
                    <div className="neumorphic-pressed p-4 rounded-xl mb-4">
                      {isProvaAffiancamento && (
                        <div className="mb-3 p-2 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-700">
                            ⏱️ Per "Prova e Affiancamento" gli slot usano minuti relativi dall'inizio del turno
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end mb-3">
                        {isProvaAffiancamento ? (
                          <>
                            <div>
                              <label className="text-xs font-medium text-slate-600 mb-1 block">Inizio (min)</label>
                              <input
                                type="number"
                                min="0"
                                step="5"
                                value={newSlot.minuti_inizio}
                                onChange={(e) => setNewSlot({ ...newSlot, minuti_inizio: parseInt(e.target.value) || 0 })}
                                className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600 mb-1 block">Fine (min)</label>
                              <input
                                type="number"
                                min="0"
                                step="5"
                                value={newSlot.minuti_fine}
                                onChange={(e) => setNewSlot({ ...newSlot, minuti_fine: parseInt(e.target.value) || 0 })}
                                className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="text-xs font-medium text-slate-600 mb-1 block">Inizio</label>
                              <select
                                value={newSlot.ora_inizio}
                                onChange={(e) => setNewSlot({ ...newSlot, ora_inizio: e.target.value })}
                                className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                              >
                                {TIME_SLOTS.map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600 mb-1 block">Fine</label>
                              <select
                                value={newSlot.ora_fine}
                                onChange={(e) => setNewSlot({ ...newSlot, ora_fine: e.target.value })}
                                className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                              >
                                {TIME_SLOTS.map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                        <div>
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Attività</label>
                          <input
                            type="text"
                            value={newSlot.attivita}
                            onChange={(e) => setNewSlot({ ...newSlot, attivita: e.target.value })}
                            className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                            placeholder="Descrizione..."
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Colore</label>
                          <select
                            value={newSlot.colore}
                            onChange={(e) => setNewSlot({ ...newSlot, colore: e.target.value })}
                            className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                          >
                            {COLORI.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="richiede-form"
                            checked={newSlot.richiede_form}
                            onChange={(e) => setNewSlot({ ...newSlot, richiede_form: e.target.checked, form_page: e.target.checked ? newSlot.form_page : '' })}
                            className="w-4 h-4"
                          />
                          <label htmlFor="richiede-form" className="text-xs font-medium text-slate-600">
                            Richiede Form
                          </label>
                        </div>
                        {newSlot.richiede_form && (
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Form</label>
                            <select
                              value={newSlot.form_page}
                              onChange={(e) => setNewSlot({ ...newSlot, form_page: e.target.value })}
                              className="w-full neumorphic-flat px-3 py-2 rounded-lg text-sm outline-none"
                            >
                              {AVAILABLE_FORMS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="col-span-2 md:col-span-3">
                          <label className="text-xs font-medium text-slate-600 mb-1 block">
                            <GraduationCap className="w-3 h-3 inline mr-1" />
                            Corsi
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {corsi.filter(c => c.attivo !== false).map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleCorso(c.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                  (newSlot.corsi_ids || []).includes(c.id)
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                    : 'nav-button text-slate-700'
                                }`}
                              >
                                {c.nome_corso}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Attrezzature da pulire */}
                      <div className="mt-3">
                        <label className="text-xs font-medium text-slate-600 mb-2 block">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          Attrezzature da pulire
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {attrezzatureDisponibili.map(attr => (
                            <button
                              key={attr}
                              type="button"
                              onClick={() => toggleAttrezzatura(attr)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                (newSlot.attrezzature_pulizia || []).includes(attr)
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                  : 'nav-button text-slate-700'
                              }`}
                            >
                              {attr}
                            </button>
                          ))}
                          {/* Show custom attrezzature not in disponibili list */}
                          {(newSlot.attrezzature_pulizia || []).filter(a => !attrezzatureDisponibili.includes(a)).map(attr => (
                            <button
                              key={attr}
                              type="button"
                              onClick={() => toggleAttrezzatura(attr)}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white"
                            >
                              {attr}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={newAttrezzatura}
                            onChange={(e) => setNewAttrezzatura(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewAttrezzatura(); } }}
                            placeholder="Nuova attrezzatura..."
                            className="neumorphic-flat px-3 py-1 rounded-lg text-xs outline-none flex-1"
                          />
                          <button
                            type="button"
                            onClick={addNewAttrezzatura}
                            className="nav-button px-3 py-1 rounded-lg text-xs font-medium text-green-600"
                          >
                            <Plus className="w-3 h-3 inline" /> Aggiungi
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {editingSlotIndex !== null ? (
                          <>
                            <button
                              type="button"
                              onClick={cancelEditSlot}
                              className="nav-button px-3 py-2 rounded-lg text-sm font-medium text-slate-600 flex items-center justify-center gap-1"
                            >
                              <X className="w-4 h-4" /> Annulla
                            </button>
                            <button
                              type="button"
                              onClick={addSlot}
                              className="nav-button px-3 py-2 rounded-lg text-sm font-medium text-green-600 flex items-center justify-center gap-1"
                            >
                              <Save className="w-4 h-4" /> Salva
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={addSlot}
                            className="nav-button px-4 py-2 rounded-lg text-sm font-medium text-blue-600 flex items-center justify-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> Aggiungi
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Slots List */}
                    {formData.slots.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">Nessuno slot aggiunto</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.slots.map((slot, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-2 ${getColoreClass(slot.colore)} flex items-center justify-between ${editingSlotIndex === idx ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="font-mono font-bold text-slate-700">
                                {slot.minuti_inizio !== undefined 
                                  ? `${slot.minuti_inizio}-${slot.minuti_fine} min`
                                  : `${slot.ora_inizio} - ${slot.ora_fine}`}
                              </span>
                              <span className="text-slate-800">{slot.attivita}</span>
                              {slot.richiede_form && slot.form_page && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {getFormLabel(slot.form_page)}
                                </span>
                              )}
                              {getSlotCorsi(slot).length > 0 && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1" title={getSlotCorsi(slot).map(id => getCorsoName(id)).join(', ')}>
                                  <GraduationCap className="w-3 h-3" />
                                  {getSlotCorsi(slot).length === 1 
                                    ? getCorsoName(getSlotCorsi(slot)[0])
                                    : `${getSlotCorsi(slot).length} corsi`
                                  }
                                </span>
                              )}
                              {(slot.attrezzature_pulizia || []).length > 0 && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  {slot.attrezzature_pulizia.length} attrezz.
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditSlot(idx)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Modifica"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSlot(idx)}
                                className="text-red-600 hover:text-red-800"
                                title="Elimina"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <NeumorphicButton type="button" onClick={resetForm} className="flex-1">
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton type="submit" variant="primary" className="flex-1 flex items-center justify-center gap-2">
                      <Save className="w-5 h-5" />
                      {editingSchema ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
            </div>
          </div>
        )}

        {/* Copy Modal */}
        {showCopyModal && schemaToCopy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Copia Schema</h2>
                <button onClick={() => setShowCopyModal(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-2">
                Copia "{schemaToCopy.nome_schema}" su altri giorni:
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {GIORNI.map((giorno, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (idx === schemaToCopy.giorno_settimana) return;
                      if (copyTargetDays.includes(idx)) {
                        setCopyTargetDays(copyTargetDays.filter(d => d !== idx));
                      } else {
                        setCopyTargetDays([...copyTargetDays, idx]);
                      }
                    }}
                    disabled={idx === schemaToCopy.giorno_settimana}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      idx === schemaToCopy.giorno_settimana
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : copyTargetDays.includes(idx)
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'nav-button text-slate-700'
                    }`}
                  >
                    {giorno}
                  </button>
                ))}
              </div>

              {/* Copia su altri store (stesso giorno) */}
              {(schemaToCopy.assigned_stores || []).length > 0 && (
                <>
                  <p className="text-sm text-slate-600 mb-2 mt-4 pt-4 border-t">
                    Oppure copia su altri store (stesso giorno, {GIORNI[schemaToCopy.giorno_settimana]}):
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {stores
                      .filter(s => !(schemaToCopy.assigned_stores || []).includes(s.id))
                      .map(store => {
                        // Controlla se esiste già uno schema per questo store/giorno/ruolo
                        const exists = schemi.some(s => 
                          s.giorno_settimana === schemaToCopy.giorno_settimana &&
                          s.ruolo === schemaToCopy.ruolo &&
                          (s.assigned_stores || []).includes(store.id)
                        );
                        return (
                          <button
                            key={store.id}
                            onClick={() => {
                              if (exists) return;
                              if (copyTargetStores.includes(store.id)) {
                                setCopyTargetStores(copyTargetStores.filter(id => id !== store.id));
                              } else {
                                setCopyTargetStores([...copyTargetStores, store.id]);
                              }
                            }}
                            disabled={exists}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              exists
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : copyTargetStores.includes(store.id)
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                : 'nav-button text-slate-700'
                            }`}
                            title={exists ? 'Schema già esistente per questo store/giorno/ruolo' : ''}
                          >
                            {store.name}
                            {exists && ' ✓'}
                          </button>
                        );
                      })}
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <NeumorphicButton onClick={() => setShowCopyModal(false)} className="flex-1">
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleCopy}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={copyTargetDays.length === 0 && copyTargetStores.length === 0}
                >
                  <Copy className="w-5 h-5" />
                  Copia ({copyTargetDays.length + copyTargetStores.length})
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}