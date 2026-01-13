import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import {
  Home,
  Zap,
  Users,
  Package,
  CreditCard,
  TrendingUp,
  Plus,
  Trash2,
  Edit,
  X,
  Save
} from "lucide-react";
import { formatEuro } from "../components/utils/formatCurrency";

export default function Costi() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("affitto");
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({});

  // Queries
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: affitti = [] } = useQuery({
    queryKey: ['costi-affitto'],
    queryFn: () => base44.entities.CostoAffitto.list(),
  });

  const { data: utenze = [] } = useQuery({
    queryKey: ['costi-utenze'],
    queryFn: () => base44.entities.CostoUtenze.list(),
  });

  const { data: dipendenti = [] } = useQuery({
    queryKey: ['costi-dipendente'],
    queryFn: () => base44.entities.CostoDipendente.list(),
  });

  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini-fornitori'],
    queryFn: () => base44.entities.OrdineFornitore.filter({ stato: 'arrivato' }),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list(),
  });

  const { data: commissioni = [] } = useQuery({
    queryKey: ['commissioni-pagamento'],
    queryFn: () => base44.entities.CommissionePagamento.list(),
  });

  const { data: budgetAds = [] } = useQuery({
    queryKey: ['budget-marketing'],
    queryFn: () => base44.entities.BudgetMarketing.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ entity, data }) => base44.entities[entity].create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [getQueryKey(variables.entity)] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ entity, id, data }) => base44.entities[entity].update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [getQueryKey(variables.entity)] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ entity, id }) => base44.entities[entity].delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [getQueryKey(variables.entity)] });
    },
  });

  const getQueryKey = (entity) => {
    const map = {
      'CostoAffitto': 'costi-affitto',
      'CostoUtenze': 'costi-utenze',
      'CostoDipendente': 'costi-dipendente',
      'Subscription': 'subscriptions',
      'CommissionePagamento': 'commissioni-pagamento',
      'BudgetMarketing': 'budget-marketing'
    };
    return map[entity] || entity.toLowerCase();
  };

  const resetForm = () => {
    setFormData({});
    setEditingItem(null);
    setShowAddForm(false);
  };

  const handleSave = () => {
    // Validazione base
    if (activeTab === 'affitto' && (!formData.store_id || !formData.affitto_mensile)) {
      alert('Compila tutti i campi obbligatori (Store e Affitto Mensile)');
      return;
    }
    if (activeTab === 'utenze' && (!formData.store_id || !formData.costo_mensile_stimato)) {
      alert('Compila tutti i campi obbligatori (Store e Costo Mensile)');
      return;
    }
    if (activeTab === 'dipendenti' && (!formData.tipologia || !formData.costo_orario)) {
      alert('Compila tutti i campi obbligatori (Tipologia e Costo Orario)');
      return;
    }
    if (activeTab === 'subscriptions' && (!formData.nome || !formData.costo || !formData.periodo)) {
      alert('Compila tutti i campi obbligatori (Nome, Costo e Periodo)');
      return;
    }
    if (activeTab === 'commissioni' && (!formData.metodo_pagamento || !formData.percentuale)) {
      alert('Compila tutti i campi obbligatori (Metodo e Percentuale)');
      return;
    }
    if (activeTab === 'ads' && (!formData.piattaforma || !formData.budget_mensile)) {
      alert('Compila tutti i campi obbligatori (Piattaforma e Budget)');
      return;
    }

    const entityMap = {
      'affitto': 'CostoAffitto',
      'utenze': 'CostoUtenze',
      'dipendenti': 'CostoDipendente',
      'subscriptions': 'Subscription',
      'commissioni': 'CommissionePagamento',
      'ads': 'BudgetMarketing'
    };

    const entity = entityMap[activeTab];

    if (editingItem) {
      updateMutation.mutate({ entity, id: editingItem.id, data: formData });
    } else {
      createMutation.mutate({ entity, data: formData });
    }
  };

  const handleDelete = (entity, id) => {
    if (confirm('Sei sicuro di voler eliminare questo elemento?')) {
      deleteMutation.mutate({ entity, id });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowAddForm(true);
  };

  // Calculate COGS
  const totalCOGS = ordini.reduce((sum, ordine) => {
    return sum + (ordine.totale_ordine || 0);
  }, 0);

  const tabs = [
    { id: 'affitto', label: 'Affitto', icon: Home },
    { id: 'utenze', label: 'Utenze', icon: Zap },
    { id: 'dipendenti', label: 'Dipendenti', icon: Users },
    { id: 'cogs', label: 'COGS', icon: Package },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'commissioni', label: 'Commissioni', icon: CreditCard },
    { id: 'ads', label: 'Ads', icon: TrendingUp }
  ];

  return (
    <ProtectedPage pageName="Costi">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Gestione Costi
          </h1>
          <p className="text-slate-500 mt-1">Gestisci tutti i costi aziendali</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  resetForm();
                }}
                className={`px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'neumorphic-flat text-slate-700 hover:shadow-md'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Affitto */}
        {activeTab === 'affitto' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Affitti Locali</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Store</label>
                  <select
                    value={formData.store_id || ''}
                    onChange={(e) => {
                      const store = stores.find(s => s.id === e.target.value);
                      setFormData({ ...formData, store_id: e.target.value, store_name: store?.name });
                    }}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona store</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Affitto Mensile (€)</label>
                  <input
                    type="number"
                    value={formData.affitto_mensile || ''}
                    onChange={(e) => setFormData({ ...formData, affitto_mensile: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {affitti.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.store_name}</p>
                    <p className="text-sm text-slate-600">{formatEuro(item.affitto_mensile)}/mese</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('CostoAffitto', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Utenze */}
        {activeTab === 'utenze' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Utenze Locali</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Store</label>
                  <select
                    value={formData.store_id || ''}
                    onChange={(e) => {
                      const store = stores.find(s => s.id === e.target.value);
                      setFormData({ ...formData, store_id: e.target.value, store_name: store?.name });
                    }}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona store</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Costo Mensile Stimato (€)</label>
                  <input
                    type="number"
                    value={formData.costo_mensile_stimato || ''}
                    onChange={(e) => setFormData({ ...formData, costo_mensile_stimato: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {utenze.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.store_name}</p>
                    <p className="text-sm text-slate-600">{formatEuro(item.costo_mensile_stimato)}/mese</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('CostoUtenze', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Dipendenti */}
        {activeTab === 'dipendenti' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Costi Orari Dipendenti</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipologia</label>
                  <select
                    value={formData.tipologia || ''}
                    onChange={(e) => setFormData({ ...formData, tipologia: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona tipologia</option>
                    <option value="Pizzaiolo">Pizzaiolo</option>
                    <option value="Cassiere">Cassiere</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Costo Orario (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costo_orario || ''}
                    onChange={(e) => setFormData({ ...formData, costo_orario: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {dipendenti.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.tipologia}</p>
                    <p className="text-sm text-slate-600">{formatEuro(item.costo_orario)}/ora</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('CostoDipendente', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* COGS */}
        {activeTab === 'cogs' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Costo Materie Prime (COGS)</h2>
            <div className="neumorphic-flat p-6 rounded-xl text-center">
              <p className="text-sm text-slate-600 mb-2">Totale ordini arrivati</p>
              <p className="text-4xl font-bold text-slate-800">{formatEuro(totalCOGS)}</p>
              <p className="text-xs text-slate-500 mt-2">Calcolato automaticamente da "Ordini Arrivati"</p>
            </div>
          </NeumorphicCard>
        )}

        {/* Subscriptions */}
        {activeTab === 'subscriptions' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Subscriptions</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome Subscription</label>
                  <input
                    type="text"
                    value={formData.nome || ''}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Costo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costo || ''}
                    onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Periodo</label>
                  <select
                    value={formData.periodo || ''}
                    onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona periodo</option>
                    <option value="mensile">Mensile</option>
                    <option value="annuale">Annuale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {subscriptions.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.nome}</p>
                    <p className="text-sm text-slate-600">{formatEuro(item.costo)}/{item.periodo}</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('Subscription', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Commissioni */}
        {activeTab === 'commissioni' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Commissioni Pagamento</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Metodo di Pagamento</label>
                  <input
                    type="text"
                    value={formData.metodo_pagamento || ''}
                    onChange={(e) => setFormData({ ...formData, metodo_pagamento: e.target.value })}
                    placeholder="es: Carta di Credito, PayPal"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Percentuale Commissione (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.percentuale || ''}
                    onChange={(e) => setFormData({ ...formData, percentuale: parseFloat(e.target.value) })}
                    placeholder="es: 2.5"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {commissioni.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.metodo_pagamento}</p>
                    <p className="text-sm text-slate-600">{item.percentuale}%</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('CommissionePagamento', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Ads */}
        {activeTab === 'ads' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Budget Marketing</h2>
              <NeumorphicButton
                onClick={() => setShowAddForm(!showAddForm)}
                variant="primary"
                className="flex items-center gap-2"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Annulla' : 'Aggiungi'}
              </NeumorphicButton>
            </div>

            {showAddForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Piattaforma</label>
                  <input
                    type="text"
                    value={formData.piattaforma || ''}
                    onChange={(e) => setFormData({ ...formData, piattaforma: e.target.value })}
                    placeholder="es: Google Ads, Meta, TikTok"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Budget Mensile (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.budget_mensile || ''}
                    onChange={(e) => setFormData({ ...formData, budget_mensile: parseFloat(e.target.value) })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                  />
                </div>
                <NeumorphicButton onClick={handleSave} variant="primary" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </NeumorphicButton>
              </div>
            )}

            <div className="space-y-3">
              {budgetAds.map(item => (
                <div key={item.id} className="neumorphic-flat p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.piattaforma}</p>
                    <p className="text-sm text-slate-600">{formatEuro(item.budget_mensile)}/mese</p>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete('BudgetMarketing', item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}
      </div>
    </ProtectedPage>
  );
}