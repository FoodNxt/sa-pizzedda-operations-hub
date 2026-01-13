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
  List
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Activation() {
  const [activeView, setActiveView] = useState('lista');
  const [showForm, setShowForm] = useState(false);
  const [editingActivation, setEditingActivation] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    data_inizio: '',
    data_completamento_target: '',
    stores_ids: [],
    stato: 'in_corso'
  });
  const [selectAllStores, setSelectAllStores] = useState(false);

  const queryClient = useQueryClient();

  const { data: activations = [] } = useQuery({
    queryKey: ['activations'],
    queryFn: () => base44.entities.Activation.list('-data_completamento_target'),
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

  const resetForm = () => {
    setFormData({
      nome: '',
      descrizione: '',
      data_inizio: '',
      data_completamento_target: '',
      stores_ids: [],
      stato: 'in_corso'
    });
    setSelectAllStores(false);
    setEditingActivation(null);
    setShowForm(false);
  };

  const handleEdit = (activation) => {
    setEditingActivation(activation);
    setFormData({
      nome: activation.nome,
      descrizione: activation.descrizione || '',
      data_inizio: activation.data_inizio || '',
      data_completamento_target: activation.data_completamento_target,
      stores_ids: activation.stores_ids || [],
      stato: activation.stato || 'in_corso'
    });
    setSelectAllStores(!activation.stores_ids || activation.stores_ids.length === 0);
    setShowForm(true);
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

  const toggleStore = (storeId) => {
    setFormData(prev => ({
      ...prev,
      stores_ids: prev.stores_ids.includes(storeId)
        ? prev.stores_ids.filter(id => id !== storeId)
        : [...prev.stores_ids, storeId]
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
    if (activations.length === 0) return { items: [], minDate: null, maxDate: null, totalDays: 0 };

    const dates = activations.map(a => {
      const start = a.data_inizio ? parseISO(a.data_inizio) : parseISO(a.data_completamento_target);
      const end = parseISO(a.data_completamento_target);
      return { start, end };
    });

    const allDates = dates.flatMap(d => [d.start, d.end]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    const totalDays = differenceInDays(maxDate, minDate) + 1;

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

    return { items, minDate, maxDate, totalDays };
  }, [activations]);

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

  return (
    <ProtectedPage pageName="Activation">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Marketing Activation</h1>
            <p className="text-slate-500">Gestisci le activation di marketing</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Activation
          </NeumorphicButton>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
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
        </div>

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
                        <div className="mt-2">
                          {activation.stores_ids && activation.stores_ids.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {activation.stores_names?.map((name, idx) => (
                                <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {name}
                                </span>
                              ))}
                            </div>
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
                    <div className="flex-1 flex items-center justify-between px-4">
                      <p className="text-xs text-slate-500">
                        {ganttData.minDate && format(ganttData.minDate, 'dd MMM yyyy', { locale: it })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ganttData.maxDate && format(ganttData.maxDate, 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                  </div>

                  {/* Gantt bars */}
                  <div className="space-y-3">
                    {ganttData.items.map(item => {
                      const leftPercent = (item.startOffset / ganttData.totalDays) * 100;
                      const widthPercent = (item.duration / ganttData.totalDays) * 100;

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
                              className={`absolute h-full rounded-xl flex items-center px-3 ${
                                item.stato === 'completata' ? 'bg-green-400' :
                                item.stato === 'annullata' ? 'bg-red-400' :
                                'bg-blue-400'
                              }`}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`
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
      </div>
    </ProtectedPage>
  );
}