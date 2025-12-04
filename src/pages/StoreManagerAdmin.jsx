import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  Target,
  DollarSign,
  Star,
  AlertTriangle,
  Clock,
  Sparkles,
  Save,
  Store,
  Plus,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function StoreManagerAdmin() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingTarget, setEditingTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    store_id: '',
    target_fatturato: '',
    target_recensioni_media: '',
    target_ordini_sbagliati_max: '',
    target_ritardi_max_minuti: '',
    target_pulizie_min_score: ''
  });

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['sm-targets', selectedMonth],
    queryFn: () => base44.entities.StoreManagerTarget.filter({ mese: selectedMonth })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StoreManagerTarget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sm-targets'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StoreManagerTarget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sm-targets'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StoreManagerTarget.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sm-targets'] });
    }
  });

  const resetForm = () => {
    setFormData({
      store_id: '',
      target_fatturato: '',
      target_recensioni_media: '',
      target_ordini_sbagliati_max: '',
      target_ritardi_max_minuti: '',
      target_pulizie_min_score: ''
    });
    setEditingTarget(null);
    setShowForm(false);
  };

  const handleEdit = (target) => {
    setEditingTarget(target);
    setFormData({
      store_id: target.store_id,
      target_fatturato: target.target_fatturato || '',
      target_recensioni_media: target.target_recensioni_media || '',
      target_ordini_sbagliati_max: target.target_ordini_sbagliati_max || '',
      target_ritardi_max_minuti: target.target_ritardi_max_minuti || '',
      target_pulizie_min_score: target.target_pulizie_min_score || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const store = stores.find(s => s.id === formData.store_id);
    const data = {
      store_id: formData.store_id,
      store_manager_id: store?.store_manager_id || null,
      mese: selectedMonth,
      target_fatturato: formData.target_fatturato ? parseFloat(formData.target_fatturato) : null,
      target_recensioni_media: formData.target_recensioni_media ? parseFloat(formData.target_recensioni_media) : null,
      target_ordini_sbagliati_max: formData.target_ordini_sbagliati_max ? parseInt(formData.target_ordini_sbagliati_max) : null,
      target_ritardi_max_minuti: formData.target_ritardi_max_minuti ? parseInt(formData.target_ritardi_max_minuti) : null,
      target_pulizie_min_score: formData.target_pulizie_min_score ? parseInt(formData.target_pulizie_min_score) : null
    };

    if (editingTarget) {
      updateMutation.mutate({ id: editingTarget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Genera opzioni mesi (prossimi 12 mesi)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -2; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  // Store con Store Manager
  const storesWithSM = stores.filter(s => s.store_manager_id);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-800">Store Manager</h1>
          </div>
          <p className="text-slate-500">Gestisci i target per gli Store Manager</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="neumorphic-pressed px-4 py-2 rounded-xl outline-none"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuovo Target
          </NeumorphicButton>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              {editingTarget ? 'Modifica Target' : 'Nuovo Target'}
            </h2>
            <button onClick={resetForm} className="text-slate-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Locale <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.store_id}
                onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                required
              >
                <option value="">-- Seleziona locale --</option>
                {storesWithSM.map(store => {
                  const sm = users.find(u => u.id === store.store_manager_id);
                  return (
                    <option key={store.id} value={store.id}>
                      {store.name} - SM: {sm?.nome_cognome || sm?.full_name || 'N/A'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Target Fatturato (€)
                </label>
                <input
                  type="number"
                  value={formData.target_fatturato}
                  onChange={(e) => setFormData({ ...formData, target_fatturato: e.target.value })}
                  placeholder="es. 50000"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Media Recensioni Min
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={formData.target_recensioni_media}
                  onChange={(e) => setFormData({ ...formData, target_recensioni_media: e.target.value })}
                  placeholder="es. 4.5"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Ordini Sbagliati Max
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_ordini_sbagliati_max}
                  onChange={(e) => setFormData({ ...formData, target_ordini_sbagliati_max: e.target.value })}
                  placeholder="es. 5"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Ritardi Max (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_ritardi_max_minuti}
                  onChange={(e) => setFormData({ ...formData, target_ritardi_max_minuti: e.target.value })}
                  placeholder="es. 5"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Score Pulizie Min
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.target_pulizie_min_score}
                  onChange={(e) => setFormData({ ...formData, target_pulizie_min_score: e.target.value })}
                  placeholder="es. 80"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <NeumorphicButton type="button" onClick={resetForm}>
                Annulla
              </NeumorphicButton>
              <NeumorphicButton type="submit" variant="primary" className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                {editingTarget ? 'Aggiorna' : 'Crea'} Target
              </NeumorphicButton>
            </div>
          </form>
        </NeumorphicCard>
      )}

      {/* Lista Target */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-orange-600" />
          Target {monthOptions.find(m => m.value === selectedMonth)?.label}
        </h2>

        {isLoading ? (
          <p className="text-center text-slate-500 py-8">Caricamento...</p>
        ) : targets.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessun target configurato per questo mese</p>
          </div>
        ) : (
          <div className="space-y-4">
            {targets.map(target => {
              const store = stores.find(s => s.id === target.store_id);
              const sm = users.find(u => u.id === store?.store_manager_id);

              return (
                <div key={target.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Store className="w-6 h-6 text-purple-600" />
                      <div>
                        <h3 className="font-bold text-slate-800">{store?.name || 'N/A'}</h3>
                        <p className="text-sm text-slate-500">
                          SM: {sm?.nome_cognome || sm?.full_name || 'Non assegnato'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(target)}
                        className="nav-button p-2 rounded-lg hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questo target?')) {
                            deleteMutation.mutate(target.id);
                          }
                        }}
                        className="nav-button p-2 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="neumorphic-flat p-2 rounded-lg text-center">
                      <DollarSign className="w-4 h-4 text-green-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Fatturato</p>
                      <p className="font-bold text-slate-700">
                        {target.target_fatturato ? `€${target.target_fatturato.toLocaleString()}` : '-'}
                      </p>
                    </div>
                    <div className="neumorphic-flat p-2 rounded-lg text-center">
                      <Star className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Recensioni</p>
                      <p className="font-bold text-slate-700">
                        {target.target_recensioni_media || '-'}
                      </p>
                    </div>
                    <div className="neumorphic-flat p-2 rounded-lg text-center">
                      <AlertTriangle className="w-4 h-4 text-red-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Ordini Max</p>
                      <p className="font-bold text-slate-700">
                        {target.target_ordini_sbagliati_max ?? '-'}
                      </p>
                    </div>
                    <div className="neumorphic-flat p-2 rounded-lg text-center">
                      <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Ritardi Max</p>
                      <p className="font-bold text-slate-700">
                        {target.target_ritardi_max_minuti ? `${target.target_ritardi_max_minuti} min` : '-'}
                      </p>
                    </div>
                    <div className="neumorphic-flat p-2 rounded-lg text-center">
                      <Sparkles className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Pulizie Min</p>
                      <p className="font-bold text-slate-700">
                        {target.target_pulizie_min_score ?? '-'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </NeumorphicCard>

      {/* Store senza SM */}
      {stores.filter(s => !s.store_manager_id).length > 0 && (
        <NeumorphicCard className="p-4 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Locali senza Store Manager:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {stores.filter(s => !s.store_manager_id).map(store => (
                  <span key={store.id} className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm">
                    {store.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
}