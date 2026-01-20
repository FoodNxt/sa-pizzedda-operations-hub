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
  Folder,
  X
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
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    data_inizio: '',
    data_completamento_target: '',
    stores_ids: [],
    categorie_ids: [],
    stato: 'in_corso'
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

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
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

  const resetForm = () => {
    setFormData({
      nome: '',
      descrizione: '',
      data_inizio: '',
      data_completamento_target: '',
      stores_ids: [],
      categorie_ids: [],
      stato: 'in_corso'
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
      stato: activation.stato || 'in_corso'
    });
    setSelectAllStores(!activation.stores_ids || activation.stores_ids.length === 0);
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

  // Gantt view calculations
  const ganttData = useMemo(() => {
    if (activations.length === 0) return { items: [], minDate: null, maxDate: null, totalDays: 0, todayOffset: 0 };

    const dates = activations.map(a => {
      const start = a.data_inizio ? parseISO(a.data_inizio) : parseISO(a.data_completamento_target);
      const end = parseISO(a.data_completamento_target);
      return { start, end };
    });

    const allDates = dates.flatMap(d => [d.start, d.end]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    const totalDays = differenceInDays(maxDate, minDate) + 1;
    const todayOffset = differenceInDays(new Date(), minDate);

    const items = activations.map(a => {
      const start = a.data_inizio ? parseISO(a.data_inizio) : parseISO(a.data_completamento_target);
      const end = parseISO(a.data_completamento_target);
      const startOffset = differenceInDays(start, minDate);
      const duration = differenceInDays(end, start) + 1;

      return {
        ...a,
        startOffset,
        duration,
        progressPercent: Math.min(100, ((differenceInDays(new Date(), start) / duration) * 100))
      };
    });

    return { items, minDate, maxDate, totalDays, todayOffset };
  }, [activations]);

  // Calendar view calculations
  const calendarData = useMemo(() => {
    let start, end;
    if (calendarView === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    const days = eachDayOfInterval({ start, end });

    return { days, start, end };
  }, [currentDate, calendarView]);

  const activationsByDay = useMemo(() => {
    const map = {};
    calendarData.days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      map[dayKey] = activations.filter(a => {
        const start = a.data_inizio ? parseISO(a.data_inizio) : parseISO(a.data_completamento_target);
        const end = parseISO(a.data_completamento_target);
        return day >= start && day <= end;
      });
    });
    return map;
  }, [activations, calendarData]);

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
            onClick={() => setActiveView('gantt')}
            variant={activeView === 'gantt' ? 'primary' : 'default'}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Vista Gantt
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="max-w-2xl w-full my-8">
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

        {/* Gantt View */}
        {activeView === 'gantt' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Vista Gantt</h2>
            
            {activations.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessuna activation da visualizzare</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Timeline header */}
                  <div className="flex mb-4 pb-2 border-b-2 border-slate-200">
                    <div className="w-48 flex-shrink-0 pr-4">
                      <p className="text-sm font-bold text-slate-600">Activation</p>
                    </div>
                    <div className="flex-1 flex items-center justify-between px-4 relative">
                      <p className="text-xs text-slate-500">
                        {ganttData.minDate && format(ganttData.minDate, 'dd MMM yyyy', { locale: it })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ganttData.maxDate && format(ganttData.maxDate, 'dd MMM yyyy', { locale: it })}
                      </p>
                      {/* Today indicator */}
                      {ganttData.todayOffset >= 0 && ganttData.todayOffset <= ganttData.totalDays && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                          style={{ left: `${(ganttData.todayOffset / ganttData.totalDays) * 100}%` }}
                        >
                          <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-red-500" />
                          <div className="absolute -top-6 -left-8 text-xs text-red-600 font-bold whitespace-nowrap">
                            Oggi
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gantt bars */}
                  <div className="space-y-3">
                    {ganttData.items.map(item => {
                      const leftPercent = (item.startOffset / ganttData.totalDays) * 100;
                      const widthPercent = (item.duration / ganttData.totalDays) * 100;
                      const categoryColor = item.categorie_ids?.[0] ? categories.find(c => c.id === item.categorie_ids[0])?.colore : null;

                      return (
                        <div key={item.id} className="flex items-center">
                          <div className="w-48 flex-shrink-0 pr-4">
                            <p className="text-sm font-medium text-slate-700 truncate">{item.nome}</p>
                            <div className="flex gap-1 mt-1">
                              {item.stores_ids && item.stores_ids.length > 0 ? (
                                <span className="text-xs text-slate-500">{item.stores_ids.length} locali</span>
                              ) : (
                                <span className="text-xs text-purple-600">Tutti</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 relative h-12 neumorphic-pressed rounded-xl">
                            <div
                              className={`absolute h-full rounded-xl flex items-center px-3`}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                backgroundColor: categoryColor || (
                                  item.stato === 'completata' ? '#4ade80' :
                                  item.stato === 'annullata' ? '#f87171' :
                                  '#60a5fa'
                                )
                              }}
                            >
                              <span className="text-xs font-bold text-white truncate">
                                {format(parseISO(item.data_completamento_target), 'dd/MM', { locale: it })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Calendario View */}
        {activeView === 'calendario' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Vista Calendario</h2>
              <div className="flex items-center gap-2">
                <select
                  value={calendarView}
                  onChange={(e) => setCalendarView(e.target.value)}
                  className="neumorphic-pressed px-3 py-2 rounded-xl text-sm outline-none"
                >
                  <option value="week">Settimana</option>
                  <option value="month">Mese</option>
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

            <div className="text-center mb-4">
              <p className="text-lg font-bold text-slate-700 capitalize">
                {calendarView === 'week' 
                  ? `${format(calendarData.start, 'dd MMM', { locale: it })} - ${format(calendarData.end, 'dd MMM yyyy', { locale: it })}`
                  : format(currentDate, 'MMMM yyyy', { locale: it })}
              </p>
            </div>

            <div className={`grid ${calendarView === 'week' ? 'grid-cols-7' : 'grid-cols-7'} gap-2`}>
              {/* Header giorni */}
              {calendarView === 'week' && ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className="text-center text-sm font-bold text-slate-600 p-2">
                  {day}
                </div>
              ))}
              {calendarView === 'month' && ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-600 p-2">
                  {day}
                </div>
              ))}

              {/* Calendar cells */}
              {calendarData.days.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayActivations = activationsByDay[dayKey] || [];
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={dayKey}
                    className={`neumorphic-pressed p-2 rounded-xl min-h-24 ${
                      isToday ? 'border-2 border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className={`text-center text-sm font-bold mb-2 ${
                      isToday ? 'text-blue-600' : 'text-slate-700'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayActivations.slice(0, 3).map(act => {
                        const categoryColor = act.categorie_ids?.[0] 
                          ? categories.find(c => c.id === act.categorie_ids[0])?.colore 
                          : '#60a5fa';
                        return (
                          <div
                            key={act.id}
                            className="text-xs px-2 py-1 rounded text-white truncate cursor-pointer"
                            style={{ backgroundColor: categoryColor }}
                            title={act.nome}
                            onClick={() => handleEdit(act)}
                          >
                            {act.nome}
                          </div>
                        );
                      })}
                      {dayActivations.length > 3 && (
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
                  <div className="space-y-2">
                    {activationsByCategory[category.id]?.map(activation => (
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
                            <button onClick={() => handleEdit(activation)} className="p-2 rounded-lg hover:bg-blue-50">
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>
                        </div>
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
      </div>
    </ProtectedPage>
  );
}