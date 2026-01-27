
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import {
  Zap,
  Plus,
  Calendar,
  Store as StoreIcon,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
  List,
  Grid,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  X,
  CheckSquare,
  Square,
  Lightbulb,
  Loader2,
  MapPin,
  User
} from 'lucide-react';
import { format, differenceInDays, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Activation() {
  const [activeView, setActiveView] = useState('lista');
  const [showForm, setShowForm] = useState(false);
  const [editingActivation, setEditingActivation] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [calendarView, setCalendarView] = useState('week'); // 'week' or 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedActivationForChecklist, setSelectedActivationForChecklist] = useState(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('Italia');
  const [selectedCity, setSelectedCity] = useState('');
  const [suggestedEvents, setSuggestedEvents] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [dismissedEvents, setDismissedEvents] = useState([]);
  const [expandedCalendarCell, setExpandedCalendarCell] = useState(null);
  const [showViewOnlyModal, setShowViewOnlyModal] = useState(false);
  const [viewOnlyActivation, setViewOnlyActivation] = useState(null);
  const [calendarCategoryFilter, setCalendarCategoryFilter] = useState('all');
  const [calendarActivationFilter, setCalendarActivationFilter] = useState('all');
  const [newSubattivitaData, setNewSubattivitaData] = useState({ titolo: '', data_target: '' });
  const [editingSubattivita, setEditingSubattivita] = useState(null);
  const [editingSubattivitaData, setEditingSubattivitaData] = useState({ titolo: '', data_target: '', assegnato_a_id: '', assegnato_a_nome: '' });
  const [expandedPersonCards, setExpandedPersonCards] = useState({});
  const [collapsedCompletedCards, setCollapsedCompletedCards] = useState({});
  const [showCompletedSection, setShowCompletedSection] = useState({});
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    data_inizio: '',
    data_completamento_target: '',
    stores_ids: [],
    categorie_ids: [],
    stato: 'in_corso',
    assegnato_a_id: '',
    assegnato_a_nome: ''
  });
  const [categoryForm, setCategoryForm] = useState({
    nome: '',
    colore: '#3B82F6',
    descrizione: '',
    ordine: 0
  });
  const [selectAllStores, setSelectAllStores] = useState(false);

  const queryClient = useQueryClient();

  const { data: activations = [] } = useQuery({
    queryKey: ['activations'],
    queryFn: () => base44.entities.Activation.list('-data_completamento_target'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['activation-categories'],
    queryFn: () => base44.entities.ActivationCategoria.list('ordine'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: subattivita = [] } = useQuery({
    queryKey: ['subattivita'],
    queryFn: () => base44.entities.SubAttivita.list('ordine'),
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type === 'admin' || u.user_type === 'manager');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Activation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activations'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Activation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activations'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Activation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activations'] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.ActivationCategoria.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activation-categories'] });
      resetCategoryForm();
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ActivationCategoria.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activation-categories'] });
      resetCategoryForm();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.ActivationCategoria.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activation-categories'] });
    },
  });

  const createSubattivitaMutation = useMutation({
    mutationFn: (data) => base44.entities.SubAttivita.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subattivita'] });
      setNewChecklistItem('');
    },
  });

  const updateSubattivitaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SubAttivita.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subattivita'] });
    },
  });

  const deleteSubattivitaMutation = useMutation({
    mutationFn: (id) => base44.entities.SubAttivita.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subattivita'] });
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descrizione: '',
      data_inizio: '',
      data_completamento_target: '',
      stores_ids: [],
      categorie_ids: [],
      stato: 'in_corso',
      assegnato_a_id: '',
      assegnato_a_nome: ''
    });
    setSelectAllStores(false);
    setEditingActivation(null);
    setShowForm(false);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      nome: '',
      colore: '#3B82F6',
      descrizione: '',
      ordine: 0
    });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const handleEdit = (activation) => {
    setEditingActivation(activation);
    setFormData({
      nome: activation.nome,
      descrizione: activation.descrizione || '',
      data_inizio: activation.data_inizio || '',
      data_completamento_target: activation.data_completamento_target,
      stores_ids: activation.stores_ids || [],
      categorie_ids: activation.categorie_ids || [],
      stato: activation.stato || 'in_corso',
      assegnato_a_id: activation.assegnato_a_id || '',
      assegnato_a_nome: activation.assegnato_a_nome || ''
    });
    setSelectAllStores(!activation.stores_ids || activation.stores_ids.length === 0);
    setSelectedActivationForChecklist(activation);
    setShowForm(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      nome: category.nome,
      colore: category.colore,
      descrizione: category.descrizione || '',
      ordine: category.ordine || 0
    });
    setShowCategoryForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const storeIds = selectAllStores ? [] : formData.stores_ids;
    const storeNames = selectAllStores ? [] : formData.stores_ids.map(id => stores.find(s => s.id === id)?.name).filter(Boolean);

    const data = {
      ...formData,
      stores_ids: storeIds,
      stores_names: storeNames,
      creato_da: user?.nome_cognome || user?.full_name || user?.email
    };

    if (editingActivation) {
      updateMutation.mutate({ id: editingActivation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCategorySubmit = (e) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const toggleStore = (storeId) => {
    setFormData(prev => ({
      ...prev,
      stores_ids: prev.stores_ids.includes(storeId)
        ? prev.stores_ids.filter(id => id !== storeId)
        : [...prev.stores_ids, storeId]
    }));
  };

  const toggleCategory = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      categorie_ids: prev.categorie_ids.includes(categoryId)
        ? prev.categorie_ids.filter(id => id !== categoryId)
        : [...prev.categorie_ids, categoryId]
    }));
  };

  const toggleAllStores = () => {
    if (selectAllStores) {
      setSelectAllStores(false);
      setFormData(prev => ({ ...prev, stores_ids: [] }));
    } else {
      setSelectAllStores(true);
      setFormData(prev => ({ ...prev, stores_ids: [] }));
    }
  };

  // Vista per persona
  const activationsByPerson = useMemo(() => {
    const grouped = {};
    
    // Group assigned activations
    activations.forEach(act => {
      if (act.assegnato_a_id && act.assegnato_a_nome) {
        if (!grouped[act.assegnato_a_id]) {
          grouped[act.assegnato_a_id] = {
            nome: act.assegnato_a_nome,
            activations: []
          };
        }
        grouped[act.assegnato_a_id].activations.push(act);
      }
    });
    
    // Add unassigned activations
    const unassigned = activations.filter(act => !act.assegnato_a_id);
    if (unassigned.length > 0) {
      grouped['unassigned'] = {
        nome: 'Non Assegnate',
        activations: unassigned
      };
    }
    
    return grouped;
  }, [activations, allUsers]);

  // Calendar view calculations
  const calendarData = useMemo(() => {
    let start, end, days;
    if (calendarView === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
      days = eachDayOfInterval({ start, end });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
      const monthDays = eachDayOfInterval({ start, end });
      
      // Add empty cells for days before the month starts (to align with weekStartsOn: 1)
      const firstDayOfMonth = start.getDay();
      const emptyCellsCount = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
      const emptyCells = Array(emptyCellsCount).fill(null);
      
      days = [...emptyCells, ...monthDays];
    }

    return { days, start, end };
  }, [currentDate, calendarView]);

  const activationsByDay = useMemo(() => {
    const map = {};
    calendarData.days.forEach(day => {
      if (!day) return; // Skip empty cells
      
      const dayKey = format(day, 'yyyy-MM-dd');
      let filtered = activations.filter(a => {
        const start = a.data_inizio ? parseISO(a.data_inizio) : parseISO(a.data_completamento_target);
        const end = parseISO(a.data_completamento_target);
        return day >= start && day <= end;
      });
      
      // Applica filtri categoria e activation
      if (calendarCategoryFilter !== 'all') {
        filtered = filtered.filter(a => a.categorie_ids?.includes(calendarCategoryFilter));
      }
      if (calendarActivationFilter !== 'all') {
        filtered = filtered.filter(a => a.id === calendarActivationFilter);
      }
      
      map[dayKey] = filtered;
    });
    return map;
  }, [activations, calendarData, calendarCategoryFilter, calendarActivationFilter]);

  const subattivitaByDay = useMemo(() => {
    const map = {};
    if (calendarActivationFilter !== 'all') {
      // Mostra sottoattività solo se filtrata per activation singola
      calendarData.days.forEach(day => {
        if (!day) return; // Skip empty cells
        
        const dayKey = format(day, 'yyyy-MM-dd');
        map[dayKey] = subattivita.filter(s => {
          const activation = activations.find(a => a.id === s.activation_id);
          return s.activation_id === calendarActivationFilter && 
                 s.data_target && 
                 format(parseISO(s.data_target), 'yyyy-MM-dd') === dayKey;
        });
      });
    }
    return map;
  }, [subattivita, activations, calendarData, calendarActivationFilter]);

  const activationsByCategory = useMemo(() => {
    const grouped = {};
    categories.forEach(cat => {
      grouped[cat.id] = activations.filter(a => a.categorie_ids?.includes(cat.id));
    });
    grouped['uncategorized'] = activations.filter(a => !a.categorie_ids || a.categorie_ids.length === 0);
    return grouped;
  }, [activations, categories]);

  const getStatoColor = (stato) => {
    switch(stato) {
      case 'in_corso': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completata': return 'bg-green-100 text-green-700 border-green-200';
      case 'annullata': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatoIcon = (stato) => {
    switch(stato) {
      case 'in_corso': return <Clock className="w-4 h-4" />;
      case 'completata': return <CheckCircle className="w-4 h-4" />;
      case 'annullata': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getCategoryName = (categoryId) => categories.find(c => c.id === categoryId)?.nome || '';

  const handleToggleSubattivita = (subattivitaId, currentStatus) => {
    const userData = user?.nome_cognome || user?.full_name || user?.email;
    updateSubattivitaMutation.mutate({
      id: subattivitaId,
      data: {
        completata: !currentStatus,
        completata_da: !currentStatus ? userData : null,
        completata_il: !currentStatus ? new Date().toISOString() : null
      }
    });
  };

  const handleAddChecklistItem = () => {
    const activationId = selectedActivationForChecklist?.id || editingActivation?.id;
    if (!newChecklistItem.trim() || !activationId) return;
    
    const maxOrdine = Math.max(
      0,
      ...subattivita
        .filter(s => s.activation_id === activationId)
        .map(s => s.ordine || 0)
    );

    createSubattivitaMutation.mutate({
      activation_id: activationId,
      titolo: newChecklistItem.trim(),
      data_target: newSubattivitaData.data_target || undefined,
      ordine: maxOrdine + 1
    });
    setNewSubattivitaData({ titolo: '', data_target: '' });
  };

  const handleEditSubattivita = (subattivita) => {
    setEditingSubattivita(subattivita);
    setEditingSubattivitaData({
      titolo: subattivita.titolo,
      data_target: subattivita.data_target || '',
      assegnato_a_id: subattivita.assegnato_a_id || '',
      assegnato_a_nome: subattivita.assegnato_a_nome || ''
    });
  };

  const handleSaveSubattivita = () => {
    if (!editingSubattivita || !editingSubattivitaData.titolo.trim()) return;
    
    updateSubattivitaMutation.mutate({
      id: editingSubattivita.id,
      data: editingSubattivitaData
    });
    setEditingSubattivita(null);
    setEditingSubattivitaData({ titolo: '', data_target: '' });
  };

  const handleMarkActivationComplete = (activationId) => {
    updateMutation.mutate({
      id: activationId,
      data: {
        stato: 'completata',
        data_completamento_effettiva: new Date().toISOString().split('T')[0]
      }
    });
  };

  const togglePersonCard = (personId) => {
    setExpandedPersonCards(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }));
  };

  const toggleCompletedCard = (activationId) => {
    setCollapsedCompletedCards(prev => ({
      ...prev,
      [activationId]: !prev[activationId]
    }));
  };

  const toggleCompletedSection = (personId) => {
    setShowCompletedSection(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }));
  };

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const monthStart = calendarView === 'week' 
        ? format(calendarData.start, 'yyyy-MM-dd')
        : format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const monthEnd = calendarView === 'week'
        ? format(calendarData.end, 'yyyy-MM-dd')
        : format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const excludedEventsText = dismissedEvents.length > 0 
        ? `\n\nNON includere i seguenti eventi già suggeriti in precedenza: ${dismissedEvents.join(', ')}`
        : '';

      const cityContext = selectedCity 
        ? `\n\nConcentrati anche su eventi locali specifici per la città di ${selectedCity}.`
        : '';

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Per il paese "${selectedCountry}"${selectedCity ? ` e in particolare per la città di ${selectedCity}` : ''}, elenca tutte le festività nazionali, ricorrenze importanti ed eventi culturali significativi tra ${monthStart} e ${monthEnd}. Per ogni evento, fornisci:
- Nome dell'evento
- Data esatta (formato YYYY-MM-DD)
- Breve descrizione (max 50 parole)
- Suggerimento per activation di marketing (max 30 parole)

Includi:
- Festività nazionali (es. 25 Aprile, 1 Maggio)
- Feste tradizionali (es. San Valentino, Festa della Mamma, Halloween)
- Eventi culturali e ricorrenze commerciali
- Giornate mondiali rilevanti (es. Giornata della Pizza)

Concentrati su eventi che possono essere utili per attività di marketing di una pizzeria.${cityContext}${excludedEventsText}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            eventi: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  data: { type: "string" },
                  descrizione: { type: "string" },
                  suggerimento_marketing: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestedEvents(response.eventi || []);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      alert('Errore nel caricamento dei suggerimenti');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleCreateActivationFromEvent = (event) => {
    setDismissedEvents(prev => [...prev, event.nome]);
    setFormData({
      nome: event.nome,
      descrizione: `${event.descrizione}\n\n${event.suggerimento_marketing}`,
      data_inizio: event.data,
      data_completamento_target: event.data,
      stores_ids: [],
      categorie_ids: [],
      stato: 'in_corso',
      assegnato_a_id: '',
      assegnato_a_nome: ''
    });
    setSelectAllStores(true);
    setSuggestedEvents(prev => prev.filter(e => e.nome !== event.nome));
    setShowSuggestionsModal(false);
    setShowForm(true);
  };

  const handleDismissEvent = async (event) => {
    setDismissedEvents(prev => [...prev, event.nome]);
    setSuggestedEvents(prev => prev.filter(e => e.nome !== event.nome));

    // Find or create "Eventi AI scartati" category
    let scartatiCategory = categories.find(c => c.nome === 'Eventi AI scartati');
    if (!scartatiCategory) {
      scartatiCategory = await base44.entities.ActivationCategoria.create({
        nome: 'Eventi AI scartati',
        colore: '#9CA3AF',
        descrizione: 'Eventi suggeriti dall\'AI ma scartati',
        ordine: 999
      });
      queryClient.invalidateQueries({ queryKey: ['activation-categories'] });
    }

    // Create activation in "Eventi AI scartati" category
    await base44.entities.Activation.create({
      nome: event.nome,
      descrizione: `${event.descrizione}\n\n${event.suggerimento_marketing}`,
      data_inizio: event.data,
      data_completamento_target: event.data,
      stores_ids: [],
      stores_names: [],
      categorie_ids: [scartatiCategory.id],
      stato: 'annullata',
      creato_da: user?.nome_cognome || user?.full_name || user?.email
    });
    queryClient.invalidateQueries({ queryKey: ['activations'] });
  };

  return (
    <ProtectedPage pageName="Activation">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Marketing Activation</h1>
            <p className="text-slate-500">Gestisci le activation di marketing</p>
          </div>
          <div className="flex gap-2">
            <NeumorphicButton
              onClick={() => setShowCategoryForm(true)}
              className="flex items-center gap-2"
            >
              <Tag className="w-5 h-5" />
              Categorie
            </NeumorphicButton>
            <NeumorphicButton
              onClick={() => setShowForm(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuova Activation
            </NeumorphicButton>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <NeumorphicButton
            onClick={() => setActiveView('lista')}
            variant={activeView === 'lista' ? 'primary' : 'default'}
            className="flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            Lista
          </NeumorphicButton>
          <NeumorphicButton
            onClick={() => setActiveView('per_persona')}
            variant={activeView === 'per_persona' ? 'primary' : 'default'}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Per Persona
          </NeumorphicButton>
          <NeumorphicButton
            onClick={() => setActiveView('calendario')}
            variant={activeView === 'calendario' ? 'primary' : 'default'}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Calendario
          </NeumorphicButton>
          <NeumorphicButton
            onClick={() => setActiveView('categorie')}
            variant={activeView === 'categorie' ? 'primary' : 'default'}
            className="flex items-center gap-2"
          >
            <Folder className="w-4 h-4" />
            Per Categoria
          </NeumorphicButton>
        </div>

        {/* Category Form Modal */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">
                {editingCategory ? 'Modifica Categoria' : 'Gestisci Categorie'}
              </h2>

              {/* Existing categories */}
              {!editingCategory && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Categorie Esistenti</h3>
                  {categories.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Nessuna categoria creata</p>
                  ) : (
                    <div className="space-y-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="neumorphic-pressed p-3 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-6 h-6 rounded-lg"
                              style={{ backgroundColor: cat.colore }}
                            />
                            <div>
                              <p className="font-medium text-slate-800">{cat.nome}</p>
                              {cat.descrizione && <p className="text-xs text-slate-500">{cat.descrizione}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCategory(cat)}
                              className="p-2 rounded-lg hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Eliminare questa categoria?')) {
                                  deleteCategoryMutation.mutate(cat.id);
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Category form */}
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Nome Categoria *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.nome}
                    onChange={(e) => setCategoryForm({ ...categoryForm, nome: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    placeholder="es. Promo Settimanali"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Colore *</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={categoryForm.colore}
                      onChange={(e) => setCategoryForm({ ...categoryForm, colore: e.target.value })}
                      className="w-16 h-12 rounded-xl cursor-pointer"
                    />
                    <input
                      type="text"
                      value={categoryForm.colore}
                      onChange={(e) => setCategoryForm({ ...categoryForm, colore: e.target.value })}
                      className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Descrizione</label>
                  <input
                    type="text"
                    value={categoryForm.descrizione}
                    onChange={(e) => setCategoryForm({ ...categoryForm, descrizione: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={resetCategoryForm} className="flex-1">
                    {editingCategory ? 'Annulla' : 'Chiudi'}
                  </NeumorphicButton>
                  {(editingCategory || categories.length === 0 || !editingCategory) && (
                    <NeumorphicButton
                      type="submit"
                      variant="primary"
                      className="flex-1"
                    >
                      {editingCategory ? 'Aggiorna' : 'Crea Categoria'}
                    </NeumorphicButton>
                  )}
                </div>
              </form>
            </NeumorphicCard>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full my-4 max-h-[90vh] overflow-y-auto">
              <NeumorphicCard className="p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">
                  {editingActivation ? 'Modifica Activation' : 'Nuova Activation'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Nome Activation *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      placeholder="es. Lancio Nuova Pizza"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Descrizione
                    </label>
                    <textarea
                      value={formData.descrizione}
                      onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none resize-none h-24"
                      placeholder="Descrivi l'activation..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Data Inizio
                      </label>
                      <input
                        type="date"
                        value={formData.data_inizio}
                        onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Data Target Completamento *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.data_completamento_target}
                        onChange={(e) => setFormData({ ...formData, data_completamento_target: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Stato
                    </label>
                    <select
                      value={formData.stato}
                      onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="in_corso">In Corso</option>
                      <option value="completata">Completata</option>
                      <option value="annullata">Annullata</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Assegnato a</label>
                    <select
                      value={formData.assegnato_a_id}
                      onChange={(e) => {
                        const selectedUser = allUsers.find(u => u.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          assegnato_a_id: e.target.value,
                          assegnato_a_nome: selectedUser ? (selectedUser.nome_cognome || selectedUser.full_name || selectedUser.email) : ''
                        });
                      }}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="">Non assegnato</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nome_cognome || u.full_name || u.email} ({u.user_type === 'admin' ? 'Admin' : 'Manager'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Categorie</label>
                    {categories.length === 0 ? (
                      <p className="text-sm text-slate-500">Nessuna categoria disponibile</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={`px-3 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                              formData.categorie_ids.includes(cat.id)
                                ? 'text-white shadow-lg'
                                : 'neumorphic-flat text-slate-700'
                            }`}
                            style={formData.categorie_ids.includes(cat.id) ? { backgroundColor: cat.colore } : {}}
                          >
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: cat.colore }}
                            />
                            {cat.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700">
                        Locali Assegnati
                      </label>
                      <button
                        type="button"
                        onClick={toggleAllStores}
                        className={`text-sm px-3 py-1 rounded-lg ${
                          selectAllStores ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {selectAllStores ? '✓ Tutti i locali' : 'Seleziona tutti'}
                      </button>
                    </div>
                    
                    {!selectAllStores && (
                      <div className="flex flex-wrap gap-2">
                        {stores.map(store => (
                          <button
                            key={store.id}
                            type="button"
                            onClick={() => toggleStore(store.id)}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                              formData.stores_ids.includes(store.id)
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                : 'neumorphic-flat text-slate-700'
                            }`}
                          >
                            {store.name}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {selectAllStores && (
                      <div className="neumorphic-pressed p-4 rounded-xl text-center">
                        <p className="text-sm text-slate-600">Tutti i locali sono selezionati</p>
                      </div>
                    )}
                  </div>

                  {/* Checklist section in form */}
                  {editingActivation && (
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4" />
                        Sottoattività / Checklist
                      </h3>
                      
                      {/* Add new item */}
                      <div className="mb-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddChecklistItem();
                              }
                            }}
                            placeholder="Aggiungi sottoattività..."
                            className="flex-1 neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={handleAddChecklistItem}
                            disabled={!newChecklistItem.trim()}
                            className="px-3 py-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="date"
                          value={newSubattivitaData.data_target}
                          onChange={(e) => setNewSubattivitaData({ ...newSubattivitaData, data_target: e.target.value })}
                          placeholder="Data target (opzionale)"
                          className="w-full neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
                        />
                      </div>

                      {/* Checklist items */}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {subattivita
                          .filter(s => s.activation_id === editingActivation.id)
                          .sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
                          .map(item => (
                            <div key={item.id}>
                              {editingSubattivita?.id === item.id ? (
                                <div className="neumorphic-pressed p-2 rounded-lg space-y-2">
                                  <input
                                    type="text"
                                    value={editingSubattivitaData.titolo}
                                    onChange={(e) => setEditingSubattivitaData({ ...editingSubattivitaData, titolo: e.target.value })}
                                    className="w-full neumorphic-pressed px-2 py-1 rounded text-sm outline-none"
                                  />
                                  <input
                                    type="date"
                                    value={editingSubattivitaData.data_target}
                                    onChange={(e) => setEditingSubattivitaData({ ...editingSubattivitaData, data_target: e.target.value })}
                                    className="w-full neumorphic-pressed px-2 py-1 rounded text-sm outline-none"
                                  />
                                  <select
                                    value={editingSubattivitaData.assegnato_a_id}
                                    onChange={(e) => {
                                      const selectedUser = allUsers.find(u => u.id === e.target.value);
                                      setEditingSubattivitaData({
                                        ...editingSubattivitaData,
                                        assegnato_a_id: e.target.value,
                                        assegnato_a_nome: selectedUser ? (selectedUser.nome_cognome || selectedUser.full_name || selectedUser.email) : ''
                                      });
                                    }}
                                    className="w-full neumorphic-pressed px-2 py-1 rounded text-sm outline-none"
                                  >
                                    <option value="">Non assegnato</option>
                                    {allUsers.map(u => (
                                      <option key={u.id} value={u.id}>
                                        {u.nome_cognome || u.full_name || u.email}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={handleSaveSubattivita}
                                      className="flex-1 px-2 py-1 rounded bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium"
                                    >
                                      Salva
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSubattivita(null)}
                                      className="flex-1 px-2 py-1 rounded bg-slate-300 text-slate-700 text-xs font-medium"
                                    >
                                      Annulla
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="neumorphic-pressed p-2 rounded-lg flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSubattivita(item.id, item.completata)}
                                    >
                                      {item.completata ? (
                                        <CheckSquare className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-400" />
                                      )}
                                    </button>
                                    <div className="flex-1">
                                      <span className={item.completata ? 'line-through text-slate-500' : 'text-slate-800'}>
                                        {item.titolo}
                                      </span>
                                      {item.data_target && (
                                        <div className="text-xs text-slate-500">
                                          📅 {format(parseISO(item.data_target), 'dd/MM/yyyy')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditSubattivita(item)}
                                      className="p-1 rounded hover:bg-blue-50"
                                    >
                                      <Edit className="w-3 h-3 text-blue-600" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteSubattivitaMutation.mutate(item.id)}
                                      className="p-1 rounded hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-600" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        {subattivita.filter(s => s.activation_id === editingActivation.id).length === 0 && (
                          <p className="text-center text-slate-400 py-4 text-xs">Nessuna sottoattività</p>
                        )}
                      </div>

                      {/* Progress */}
                      {subattivita.filter(s => s.activation_id === editingActivation.id).length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">Progresso</span>
                            <span className="text-xs font-bold text-blue-600">
                              {subattivita.filter(s => s.activation_id === editingActivation.id && s.completata).length}
                              {' / '}
                              {subattivita.filter(s => s.activation_id === editingActivation.id).length}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                              style={{
                                width: `${
                                  (subattivita.filter(s => s.activation_id === editingActivation.id && s.completata).length /
                                  subattivita.filter(s => s.activation_id === editingActivation.id).length) * 100
                                }%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <NeumorphicButton type="button" onClick={resetForm} className="flex-1">
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingActivation ? 'Aggiorna' : 'Crea'}
                    </NeumorphicButton>
                  </div>
                </form>
              </NeumorphicCard>
            </div>
          </div>
        )}

        {/* Lista View */}
        {activeView === 'lista' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Tutte le Activation</h2>
            
            {activations.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessuna activation creata</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activations.map(activation => (
                  <div key={activation.id} className="neumorphic-pressed p-5 rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-slate-800">{activation.nome}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatoColor(activation.stato)}`}>
                            {getStatoIcon(activation.stato)}
                            {activation.stato.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        {activation.descrizione && (
                          <p className="text-sm text-slate-600 mb-2">{activation.descrizione}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          {activation.data_inizio && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Inizio: {format(parseISO(activation.data_inizio), 'dd MMM yyyy', { locale: it })}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Target: {format(parseISO(activation.data_completamento_target), 'dd MMM yyyy', { locale: it })}
                          </div>
                          {activation.assegnato_a_nome && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Assegnato: {activation.assegnato_a_nome}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {activation.categorie_ids && activation.categorie_ids.length > 0 && (
                            activation.categorie_ids.map(catId => {
                              const cat = categories.find(c => c.id === catId);
                              if (!cat) return null;
                              return (
                                <span
                                  key={catId}
                                  className="text-xs px-2 py-1 rounded-full text-white font-medium"
                                  style={{ backgroundColor: cat.colore }}
                                >
                                  {cat.nome}
                                </span>
                              );
                            })
                          )}
                          {activation.stores_ids && activation.stores_ids.length > 0 ? (
                            activation.stores_names?.map((name, idx) => (
                              <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              Tutti i locali
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedActivationForChecklist(activation);
                            setShowChecklistModal(true);
                          }}
                          className="nav-button p-2 rounded-lg hover:bg-green-50"
                        >
                          <CheckSquare className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleEdit(activation)}
                          className="nav-button p-2 rounded-lg hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Eliminare questa activation?')) {
                              deleteMutation.mutate(activation.id);
                            }
                          }}
                          className="nav-button p-2 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Vista Per Persona */}
        {activeView === 'per_persona' && (
          <div className="space-y-4">
            {Object.keys(activationsByPerson).length === 0 ? (
              <NeumorphicCard className="p-12 text-center">
                <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessuna activation da visualizzare</p>
              </NeumorphicCard>
            ) : (
              Object.entries(activationsByPerson)
                .sort(([keyA], [keyB]) => {
                  // Non assegnate sempre per ultime
                  if (keyA === 'unassigned') return 1;
                  if (keyB === 'unassigned') return -1;
                  return 0;
                })
                .map(([personId, data]) => {
                  const isExpanded = expandedPersonCards[personId] ?? true;
                  const completedCount = data.activations.filter(a => a.stato === 'completata').length;
                  const inProgressCount = data.activations.filter(a => a.stato === 'in_corso' || a.stato === 'annullata').length;
                  const showCompleted = showCompletedSection[personId] ?? false;
                  
                  return (
                  <NeumorphicCard key={personId} className="p-6">
                    <button
                      onClick={() => togglePersonCard(personId)}
                      className="w-full flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        personId === 'unassigned' ? 'bg-slate-300' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h2 className="text-xl font-bold text-slate-800">{data.nome}</h2>
                        <p className="text-sm text-slate-500">
                          {inProgressCount} in corso • {completedCount} completate
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="space-y-4">
                        {/* In Corso */}
                        {data.activations.filter(a => a.stato !== 'completata').length > 0 && (
                          <div>
                            <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              In Corso ({data.activations.filter(a => a.stato !== 'completata').length})
                            </h3>
                            <div className="space-y-3">
                              {data.activations.filter(a => a.stato !== 'completata').map(activation => {
                                const subattivitaList = subattivita.filter(s => s.activation_id === activation.id);
                                const subattivitaComplete = subattivitaList.filter(s => s.completata).length;
                        
                                return (
                                  <div key={activation.id} className="neumorphic-pressed p-4 rounded-xl">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                          <h3 className="text-lg font-bold text-slate-800">{activation.nome}</h3>
                                          <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatoColor(activation.stato)}`}>
                                            {getStatoIcon(activation.stato)}
                                            {activation.stato.replace('_', ' ').toUpperCase()}
                                          </span>
                                        </div>
                                        {activation.descrizione && (
                                          <p className="text-sm text-slate-600 mb-2">{activation.descrizione}</p>
                                        )}
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                          {activation.data_inizio && (
                                            <div className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              Inizio: {format(parseISO(activation.data_inizio), 'dd MMM yyyy', { locale: it })}
                                            </div>
                                          )}
                                          <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Target: {format(parseISO(activation.data_completamento_target), 'dd MMM yyyy', { locale: it })}
                                          </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {activation.categorie_ids && activation.categorie_ids.length > 0 && (
                                            activation.categorie_ids.map(catId => {
                                              const cat = categories.find(c => c.id === catId);
                                              if (!cat) return null;
                                              return (
                                                <span
                                                  key={catId}
                                                  className="text-xs px-2 py-1 rounded-full text-white font-medium"
                                                  style={{ backgroundColor: cat.colore }}
                                                >
                                                  {cat.nome}
                                                </span>
                                              );
                                            })
                                          )}
                                          {activation.stores_ids && activation.stores_ids.length > 0 ? (
                                            activation.stores_names?.map((name, idx) => (
                                              <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                                {name}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                              Tutti i locali
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2 flex-shrink-0">
                                        <button
                                          onClick={() => {
                                            if (confirm('Segnare questa activation come completata?')) {
                                              handleMarkActivationComplete(activation.id);
                                            }
                                          }}
                                          className="nav-button p-2 rounded-lg hover:bg-green-50"
                                          title="Segna come completata"
                                        >
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedActivationForChecklist(activation);
                                            setShowChecklistModal(true);
                                          }}
                                          className="nav-button p-2 rounded-lg hover:bg-blue-50"
                                        >
                                          <CheckSquare className="w-4 h-4 text-blue-600" />
                                        </button>
                                        <button
                                          onClick={() => handleEdit(activation)}
                                          className="nav-button p-2 rounded-lg hover:bg-blue-50"
                                        >
                                          <Edit className="w-4 h-4 text-blue-600" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm('Eliminare questa activation?')) {
                                              deleteMutation.mutate(activation.id);
                                            }
                                          }}
                                          className="nav-button p-2 rounded-lg hover:bg-red-50"
                                        >
                                          <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                      </div>
                                    </div>

                                    {subattivitaList.length > 0 && (
                                      <div className="bg-slate-50 rounded-lg p-3 mt-3 border-l-2 border-slate-300">
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-xs font-medium text-slate-600">Sottoattività:</p>
                                          <p className="text-xs font-bold text-blue-600">
                                            {subattivitaComplete} / {subattivitaList.length}
                                          </p>
                                        </div>
                                        <div className="space-y-1">
                                          {subattivitaList
                                            .sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
                                            .map(item => (
                                              <div key={item.id} className="flex items-start gap-2 text-xs">
                                                <span className="mt-1">
                                                  {item.completata ? (
                                                    <CheckSquare className="w-3 h-3 text-green-600" />
                                                  ) : (
                                                    <Square className="w-3 h-3 text-slate-400" />
                                                  )}
                                                </span>
                                                <div className="flex-1">
                                                  <p className={item.completata ? 'line-through text-slate-500' : 'text-slate-700'}>
                                                    {item.titolo}
                                                  </p>
                                                  {item.data_target && (
                                                    <p className="text-slate-500">📅 {format(parseISO(item.data_target), 'dd/MM/yyyy')}</p>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                                          <div
                                            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                                            style={{ width: `${(subattivitaComplete / subattivitaList.length) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Completate */}
                        {data.activations.filter(a => a.stato === 'completata').length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleCompletedSection(personId)}
                              className="w-full flex items-center justify-between text-sm font-bold text-slate-600 mb-3 hover:bg-slate-100 p-2 rounded-lg transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Completate ({data.activations.filter(a => a.stato === 'completata').length})
                              </div>
                              {showCompleted ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            
                            {showCompleted && (
                              <div className="space-y-3">
                                {data.activations.filter(a => a.stato === 'completata').map(activation => {
                                  const subattivitaList = subattivita.filter(s => s.activation_id === activation.id);
                                  const subattivitaComplete = subattivitaList.filter(s => s.completata).length;
                                  const isCollapsed = collapsedCompletedCards[activation.id] ?? true;
                        
                                  return (
                                    <div key={activation.id} className="neumorphic-pressed p-4 rounded-xl bg-green-50/30">
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <button
                                              onClick={() => toggleCompletedCard(activation.id)}
                                              className="p-1 rounded hover:bg-slate-200 mr-1"
                                            >
                                              {isCollapsed ? (
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                              )}
                                            </button>
                                            <h3 className="text-lg font-bold text-slate-800">{activation.nome}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatoColor(activation.stato)}`}>
                                              {getStatoIcon(activation.stato)}
                                              {activation.stato.replace('_', ' ').toUpperCase()}
                                            </span>
                                          </div>
                                          {!isCollapsed && (
                                            <>
                                              {activation.descrizione && (
                                                <p className="text-sm text-slate-600 mb-2">{activation.descrizione}</p>
                                              )}
                                              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                                {activation.data_inizio && (
                                                  <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Inizio: {format(parseISO(activation.data_inizio), 'dd MMM yyyy', { locale: it })}
                                                  </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                  <Calendar className="w-3 h-3" />
                                                  Target: {format(parseISO(activation.data_completamento_target), 'dd MMM yyyy', { locale: it })}
                                                </div>
                                              </div>
                                              <div className="mt-2 flex flex-wrap gap-2">
                                                {activation.categorie_ids && activation.categorie_ids.length > 0 && (
                                                  activation.categorie_ids.map(catId => {
                                                    const cat = categories.find(c => c.id === catId);
                                                    if (!cat) return null;
                                                    return (
                                                      <span
                                                        key={catId}
                                                        className="text-xs px-2 py-1 rounded-full text-white font-medium"
                                                        style={{ backgroundColor: cat.colore }}
                                                      >
                                                        {cat.nome}
                                                      </span>
                                                    );
                                                  })
                                                )}
                                                {activation.stores_ids && activation.stores_ids.length > 0 ? (
                                                  activation.stores_names?.map((name, idx) => (
                                                    <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                                      {name}
                                                    </span>
                                                  ))
                                                ) : (
                                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                                    Tutti i locali
                                                  </span>
                                                )}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                          <button
                                            onClick={() => {
                                              setSelectedActivationForChecklist(activation);
                                              setShowChecklistModal(true);
                                            }}
                                            className="nav-button p-2 rounded-lg hover:bg-blue-50"
                                          >
                                            <CheckSquare className="w-4 h-4 text-blue-600" />
                                          </button>
                                          <button
                                            onClick={() => handleEdit(activation)}
                                            className="nav-button p-2 rounded-lg hover:bg-blue-50"
                                          >
                                            <Edit className="w-4 h-4 text-blue-600" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (confirm('Eliminare questa activation?')) {
                                                deleteMutation.mutate(activation.id);
                                              }
                                            }}
                                            className="nav-button p-2 rounded-lg hover:bg-red-50"
                                          >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                          </button>
                                        </div>
                                      </div>

                                      {!isCollapsed && subattivitaList.length > 0 && (
                                        <div className="bg-slate-50 rounded-lg p-3 mt-3 border-l-2 border-slate-300">
                                          <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-medium text-slate-600">Sottoattività:</p>
                                            <p className="text-xs font-bold text-blue-600">
                                              {subattivitaComplete} / {subattivitaList.length}
                                            </p>
                                          </div>
                                          <div className="space-y-1">
                                            {subattivitaList
                                              .sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
                                              .map(item => (
                                                <div key={item.id} className="flex items-start gap-2 text-xs">
                                                  <span className="mt-1">
                                                    {item.completata ? (
                                                      <CheckSquare className="w-3 h-3 text-green-600" />
                                                    ) : (
                                                      <Square className="w-3 h-3 text-slate-400" />
                                                    )}
                                                  </span>
                                                  <div className="flex-1">
                                                    <p className={item.completata ? 'line-through text-slate-500' : 'text-slate-700'}>
                                                      {item.titolo}
                                                    </p>
                                                    {item.data_target && (
                                                      <p className="text-slate-500">📅 {format(parseISO(item.data_target), 'dd/MM/yyyy')}</p>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                                            <div
                                              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                                              style={{ width: `${(subattivitaComplete / subattivitaList.length) * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </NeumorphicCard>
                  );
                })
            )}
          </div>
        )}

        {/* Calendario View */}
        {activeView === 'calendario' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-xl font-bold text-slate-800">Vista Calendario</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={calendarView}
                  onChange={(e) => setCalendarView(e.target.value)}
                  className="neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
                >
                  <option value="week">Settimana</option>
                  <option value="month">Mese</option>
                </select>
                <select
                  value={calendarCategoryFilter}
                  onChange={(e) => setCalendarCategoryFilter(e.target.value)}
                  className="neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
                >
                  <option value="all">Tutte le categorie</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
                <select
                  value={calendarActivationFilter}
                  onChange={(e) => setCalendarActivationFilter(e.target.value)}
                  className="neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
                >
                  <option value="all">Tutte le activation</option>
                  {activations.map(act => (
                    <option key={act.id} value={act.id}>{act.nome}</option>
                  ))}
                </select>
                <NeumorphicButton
                  onClick={() => {
                    if (calendarView === 'week') {
                      setCurrentDate(subWeeks(currentDate, 1));
                    } else {
                      setCurrentDate(subMonths(currentDate, 1));
                    }
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4"
                >
                  Oggi
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={() => {
                    if (calendarView === 'week') {
                      setCurrentDate(addWeeks(currentDate, 1));
                    } else {
                      setCurrentDate(addMonths(currentDate, 1));
                    }
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </NeumorphicButton>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-bold text-slate-700 capitalize">
                {calendarView === 'week' 
                  ? `${format(calendarData.start, 'dd MMM', { locale: it })} - ${format(calendarData.end, 'dd MMM yyyy', { locale: it })}`
                  : format(currentDate, 'MMMM yyyy', { locale: it })}
              </p>
              <NeumorphicButton
                onClick={() => setShowSuggestionsModal(true)}
                className="flex items-center gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                Suggerimenti
              </NeumorphicButton>
            </div>

            <div className={`grid ${calendarView === 'week' ? 'grid-cols-7' : 'grid-cols-7'} gap-2`}>
              {/* Header giorni */}
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className={`text-center font-bold text-slate-600 p-2 ${calendarView === 'week' ? 'text-sm' : 'text-xs'}`}>
                  {day}
                </div>
              ))}

              {/* Calendar cells */}
              {calendarData.days.map((day, idx) => {
                if (!day) {
                  // Empty cell for padding
                  return <div key={`empty-${idx}`} className="neumorphic-pressed p-2 rounded-xl min-h-24 bg-slate-100" />;
                }
                
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayActivations = activationsByDay[dayKey] || [];
                const isToday = isSameDay(day, new Date());
                const isExpanded = expandedCalendarCell === dayKey;

                return (
                  <div
                    key={dayKey}
                    className={`neumorphic-pressed p-2 rounded-xl min-h-24 relative ${
                      isToday ? 'border-2 border-blue-500 bg-blue-50' : ''
                    } ${isExpanded ? 'col-span-2 row-span-2 z-10' : ''}`}
                  >
                    <div className={`text-center text-sm font-bold mb-2 flex items-center justify-between ${
                      isToday ? 'text-blue-600' : 'text-slate-700'
                    }`}>
                      <span>{format(day, 'd')}</span>
                      {dayActivations.length > 0 && (
                        <button
                          onClick={() => setExpandedCalendarCell(isExpanded ? null : dayKey)}
                          className="text-xs hover:bg-slate-200 rounded px-1"
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                       {(isExpanded ? dayActivations : dayActivations.slice(0, 3)).map(act => {
                         const categoryColor = act.categorie_ids?.[0] 
                           ? categories.find(c => c.id === act.categorie_ids[0])?.colore 
                           : '#60a5fa';
                         return (
                           <div key={act.id}>
                             <div
                               className={`text-xs px-2 py-1 rounded text-white cursor-pointer ${
                                 isExpanded ? '' : 'truncate'
                               }`}
                               style={{ backgroundColor: categoryColor }}
                               title={act.nome}
                               onClick={() => {
                                 setViewOnlyActivation(act);
                                 setShowViewOnlyModal(true);
                               }}
                             >
                               {act.nome}
                             </div>
                             {calendarActivationFilter === act.id && (
                               <div className="text-xs space-y-0.5 mt-1 pl-1 border-l border-slate-300">
                                 {subattivita
                                   .filter(s => s.activation_id === act.id && dayKey === format(parseISO(s.data_target), 'yyyy-MM-dd'))
                                   .map(sub => (
                                     <div key={sub.id} className="text-slate-600 text-[11px]">
                                       {sub.completata ? '✓' : '○'} {sub.titolo}
                                     </div>
                                   ))}
                               </div>
                             )}
                           </div>
                         );
                       })}
                       {!isExpanded && dayActivations.length > 3 && (
                         <div className="text-xs text-slate-500 text-center">
                           +{dayActivations.length - 3}
                         </div>
                       )}
                     </div>
                  </div>
                );
              })}
            </div>
          </NeumorphicCard>
        )}

        {/* Vista per Categoria */}
        {activeView === 'categorie' && (
          <div className="space-y-4">
            {categories.map(category => (
              <NeumorphicCard key={category.id} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-xl"
                    style={{ backgroundColor: category.colore }}
                  />
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{category.nome}</h2>
                    {category.descrizione && (
                      <p className="text-sm text-slate-500">{category.descrizione}</p>
                    )}
                  </div>
                  <span className="ml-auto text-sm text-slate-500">
                    {activationsByCategory[category.id]?.length || 0} activation
                  </span>
                </div>

                {activationsByCategory[category.id]?.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">Nessuna activation in questa categoria</p>
                ) : (
                  <div className="space-y-3">
                    {activationsByCategory[category.id]?.map(activation => (
                      <div key={activation.id} className="neumorphic-pressed p-4 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-slate-800">{activation.nome}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatoColor(activation.stato)}`}>
                                {activation.stato.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
                              {activation.data_inizio && (
                                <span>Inizio: {format(parseISO(activation.data_inizio), 'dd/MM/yy')}</span>
                              )}
                              <span>Target: {format(parseISO(activation.data_completamento_target), 'dd/MM/yy')}</span>
                              {activation.assegnato_a_nome && (
                                <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                  <User className="w-3 h-3" />
                                  {activation.assegnato_a_nome}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <button onClick={() => handleEdit(activation)} className="p-2 rounded-lg hover:bg-blue-50 flex-shrink-0">
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>
                        </div>

                        {/* Sottoattività */}
                        {subattivita.filter(s => s.activation_id === activation.id).length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-3 mt-3 border-l-2 border-slate-300">
                            <p className="text-xs font-medium text-slate-600 mb-2">Sottoattività:</p>
                            <div className="space-y-1">
                              {subattivita
                                .filter(s => s.activation_id === activation.id)
                                .sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
                                .map(item => (
                                  <div key={item.id} className="flex items-start gap-2 text-xs">
                                    <span className="mt-1">
                                      {item.completata ? (
                                        <CheckSquare className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <Square className="w-3 h-3 text-slate-400" />
                                      )}
                                    </span>
                                    <div className="flex-1">
                                      <p className={item.completata ? 'line-through text-slate-500' : 'text-slate-700'}>
                                        {item.titolo}
                                      </p>
                                      {item.data_target && (
                                        <p className="text-slate-500">📅 {format(parseISO(item.data_target), 'dd/MM/yyyy')}</p>
                                      )}
                                      {item.assegnato_a_nome && (
                                        <p className="text-slate-500">👤 {item.assegnato_a_nome}</p>
                                      )}
                                      {item.completata && item.completata_da && (
                                        <p className="text-slate-400">✓ {item.completata_da}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </NeumorphicCard>
            ))}

            {/* Uncategorized */}
            {activationsByCategory['uncategorized']?.length > 0 && (
              <NeumorphicCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-slate-300" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Senza Categoria</h2>
                  </div>
                  <span className="ml-auto text-sm text-slate-500">
                    {activationsByCategory['uncategorized'].length} activation
                  </span>
                </div>

                <div className="space-y-2">
                  {activationsByCategory['uncategorized'].map(activation => (
                    <div key={activation.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-800">{activation.nome}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatoColor(activation.stato)}`}>
                              {activation.stato.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-slate-500">
                            {activation.data_inizio && (
                              <span>Inizio: {format(parseISO(activation.data_inizio), 'dd/MM/yy')}</span>
                            )}
                            <span>Target: {format(parseISO(activation.data_completamento_target), 'dd/MM/yy')}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedActivationForChecklist(activation);
                              setShowChecklistModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-green-50"
                          >
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          </button>
                          <button onClick={() => handleEdit(activation)} className="p-2 rounded-lg hover:bg-blue-50">
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </NeumorphicCard>
            )}
          </div>
        )}

        {/* View Only Modal (from calendar) */}
        {showViewOnlyModal && viewOnlyActivation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800">
                  {viewOnlyActivation.nome}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowViewOnlyModal(false);
                      handleEdit(viewOnlyActivation);
                    }}
                    className="p-2 rounded-lg hover:bg-blue-50"
                  >
                    <Edit className="w-5 h-5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => {
                      setShowViewOnlyModal(false);
                      setViewOnlyActivation(null);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="mb-4 space-y-2">
                {viewOnlyActivation.descrizione && (
                  <p className="text-sm text-slate-600">{viewOnlyActivation.descrizione}</p>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatoColor(viewOnlyActivation.stato)}`}>
                    {getStatoIcon(viewOnlyActivation.stato)}
                    {viewOnlyActivation.stato.replace('_', ' ').toUpperCase()}
                  </span>
                  {viewOnlyActivation.data_inizio && (
                    <span className="text-slate-500">
                      Inizio: {format(parseISO(viewOnlyActivation.data_inizio), 'dd/MM/yyyy')}
                    </span>
                  )}
                  <span className="text-slate-500">
                    Target: {format(parseISO(viewOnlyActivation.data_completamento_target), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>

              {/* Categories */}
              {viewOnlyActivation.categorie_ids && viewOnlyActivation.categorie_ids.length > 0 && (
                <div className="mb-4 flex gap-2">
                  {viewOnlyActivation.categorie_ids.map(catId => {
                    const cat = categories.find(c => c.id === catId);
                    if (!cat) return null;
                    return (
                      <span
                        key={catId}
                        className="text-xs px-3 py-1 rounded-full text-white font-medium"
                        style={{ backgroundColor: cat.colore }}
                      >
                        {cat.nome}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Checklist (read-only with toggle) */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Checklist
                </h3>

                {/* Add new item */}
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setSelectedActivationForChecklist(viewOnlyActivation);
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="Aggiungi sottoattività..."
                    className="flex-1 neumorphic-pressed px-3 py-2 rounded-xl text-slate-700 outline-none text-sm"
                  />
                  <button
                    onClick={() => {
                      setSelectedActivationForChecklist(viewOnlyActivation);
                      handleAddChecklistItem();
                    }}
                    disabled={!newChecklistItem.trim()}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {subattivita
                    .filter(s => s.activation_id === viewOnlyActivation.id)
                    .sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
                    .map(item => (
                      <div
                        key={item.id}
                        className="neumorphic-pressed p-3 rounded-xl flex items-center gap-3"
                      >
                        <button
                          onClick={() => handleToggleSubattivita(item.id, item.completata)}
                          className="flex-shrink-0"
                        >
                          {item.completata ? (
                            <CheckSquare className="w-5 h-5 text-green-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className={`text-sm ${item.completata ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                            {item.titolo}
                          </p>
                          {item.completata && item.completata_da && (
                            <p className="text-xs text-slate-400">
                              ✓ {item.completata_da} • {format(parseISO(item.completata_il), 'dd/MM HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  {subattivita.filter(s => s.activation_id === viewOnlyActivation.id).length === 0 && (
                    <p className="text-center text-slate-400 py-8 text-sm">Nessuna sottoattività</p>
                  )}
                </div>

                {/* Progress */}
                {subattivita.filter(s => s.activation_id === viewOnlyActivation.id).length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Progresso</span>
                      <span className="text-sm font-bold text-green-600">
                        {subattivita.filter(s => s.activation_id === viewOnlyActivation.id && s.completata).length}
                        {' / '}
                        {subattivita.filter(s => s.activation_id === viewOnlyActivation.id).length}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                        style={{
                          width: `${
                            (subattivita.filter(s => s.activation_id === viewOnlyActivation.id && s.completata).length /
                            subattivita.filter(s => s.activation_id === viewOnlyActivation.id).length) * 100
                          }%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </NeumorphicCard>
          </div>
        )}

        {/* Checklist Modal */}
        {showChecklistModal && selectedActivationForChecklist && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800">
                  Checklist: {selectedActivationForChecklist.nome}
                </h2>
                <button
                  onClick={() => {
                    setShowChecklistModal(false);
                    setSelectedActivationForChecklist(null);
                    setNewChecklistItem('');
                  }}
                  className="p-2 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add new item */}
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Aggiungi sottoattività..."
                  className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                />
                <NeumorphicButton
                  onClick={handleAddChecklistItem}
                  variant="primary"
                  disabled={!newChecklistItem.trim()}
                >
                  <Plus className="w-5 h-5" />
                </NeumorphicButton>
              </div>

              {/* Checklist items */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subattivita
                  .filter(s => s.activation_id === selectedActivationForChecklist.id)
                  .sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
                  .map(item => (
                    <div
                      key={item.id}
                      className="neumorphic-pressed p-3 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => handleToggleSubattivita(item.id, item.completata)}
                          className="flex-shrink-0"
                        >
                          {item.completata ? (
                            <CheckSquare className="w-5 h-5 text-green-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className={`text-sm ${item.completata ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                            {item.titolo}
                          </p>
                          {item.completata && item.completata_da && (
                            <p className="text-xs text-slate-400">
                              ✓ {item.completata_da} • {format(parseISO(item.completata_il), 'dd/MM HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questa sottoattività?')) {
                            deleteSubattivitaMutation.mutate(item.id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                {subattivita.filter(s => s.activation_id === selectedActivationForChecklist.id).length === 0 && (
                  <p className="text-center text-slate-500 py-8">Nessuna sottoattività. Aggiungine una!</p>
                )}
              </div>

              {/* Progress */}
              {subattivita.filter(s => s.activation_id === selectedActivationForChecklist.id).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Progresso</span>
                    <span className="text-sm font-bold text-blue-600">
                      {subattivita.filter(s => s.activation_id === selectedActivationForChecklist.id && s.completata).length}
                      {' / '}
                      {subattivita.filter(s => s.activation_id === selectedActivationForChecklist.id).length}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                      style={{
                        width: `${
                          (subattivita.filter(s => s.activation_id === selectedActivationForChecklist.id && s.completata).length /
                          subattivita.filter(s => s.activation_id === selectedActivationForChecklist.id).length) * 100
                        }%`
                      }}
                    />
                  </div>
                </div>
              )}
            </NeumorphicCard>
          </div>
        )}

        {/* Suggestions Modal */}
        {showSuggestionsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="max-w-4xl w-full my-8">
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-800">Suggerimenti Eventi</h2>
                  <button
                    onClick={() => {
                      setShowSuggestionsModal(false);
                      setSuggestedEvents([]);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Paese</label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    >
                      <option value="Italia">🇮🇹 Italia</option>
                      <option value="Francia">🇫🇷 Francia</option>
                      <option value="Spagna">🇪🇸 Spagna</option>
                      <option value="Germania">🇩🇪 Germania</option>
                      <option value="Regno Unito">🇬🇧 Regno Unito</option>
                      <option value="Stati Uniti">🇺🇸 Stati Uniti</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Città (opzionale)
                    </label>
                    <input
                      type="text"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      placeholder="Es. Milano, Roma, Napoli..."
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Specifica una città per eventi locali specifici
                    </p>
                  </div>

                  <NeumorphicButton
                    onClick={handleGetSuggestions}
                    variant="primary"
                    disabled={loadingSuggestions}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {loadingSuggestions ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Lightbulb className="w-5 h-5" />
                    )}
                    Genera Suggerimenti
                  </NeumorphicButton>
                </div>

                {loadingSuggestions && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Sto cercando eventi e festività...</p>
                  </div>
                )}

                {!loadingSuggestions && suggestedEvents.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {suggestedEvents.map((event, idx) => (
                      <div key={idx} className="neumorphic-pressed p-4 rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-800 mb-1">{event.nome}</h3>
                            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(parseISO(event.data), 'dd MMMM yyyy', { locale: it })}
                            </p>
                            <p className="text-sm text-slate-600 mb-2">{event.descrizione}</p>
                            <div className="bg-blue-50 p-2 rounded-lg">
                              <p className="text-xs text-blue-700">
                                <strong>💡 Idea:</strong> {event.suggerimento_marketing}
                              </p>
                            </div>
                          </div>
                          <div className="ml-3 flex flex-col gap-2">
                            <NeumorphicButton
                              onClick={() => handleCreateActivationFromEvent(event)}
                              variant="primary"
                              className="flex items-center gap-1 text-sm"
                            >
                              <Plus className="w-4 h-4" />
                              Crea
                            </NeumorphicButton>
                            <NeumorphicButton
                              onClick={() => handleDismissEvent(event)}
                              className="flex items-center gap-1 text-sm"
                            >
                              <X className="w-4 h-4" />
                              Scarta
                            </NeumorphicButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingSuggestions && suggestedEvents.length === 0 && (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Seleziona un paese e clicca "Genera"</p>
                  </div>
                )}
              </NeumorphicCard>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
