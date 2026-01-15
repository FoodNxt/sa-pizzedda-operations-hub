import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Calendar,
  Store,
  Plus,
  Trash2,
  Settings,
  Filter,
  X,
  ChevronDown,
  Save,
  Edit2
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function PreparazioniAdmin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('data');
  
  // Filters
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedTipo, setSelectedTipo] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Config management
  const [newTipo, setNewTipo] = useState('');
  const [editingTipo, setEditingTipo] = useState(null);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: preparazioni = [] } = useQuery({
    queryKey: ['preparazioni'],
    queryFn: () => base44.entities.Preparazioni.list('-data_rilevazione', 500),
  });

  const { data: tipiPreparazione = [] } = useQuery({
    queryKey: ['tipi-preparazione'],
    queryFn: () => base44.entities.TipoPreparazione.list('ordine', 100),
  });

  const createTipoMutation = useMutation({
    mutationFn: (data) => base44.entities.TipoPreparazione.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipi-preparazione'] });
      setNewTipo('');
    },
  });

  const updateTipoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TipoPreparazione.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipi-preparazione'] });
      setEditingTipo(null);
    },
  });

  const deleteTipoMutation = useMutation({
    mutationFn: (id) => base44.entities.TipoPreparazione.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipi-preparazione'] });
    },
  });

  const handleAddTipo = async () => {
    if (!newTipo.trim()) return;
    
    const maxOrdine = tipiPreparazione.reduce((max, t) => Math.max(max, t.ordine || 0), 0);
    
    await createTipoMutation.mutateAsync({
      nome: newTipo.trim(),
      ordine: maxOrdine + 1,
      attivo: true
    });
  };

  const handleToggleAttivo = async (tipo) => {
    await updateTipoMutation.mutateAsync({
      id: tipo.id,
      data: { ...tipo, attivo: !tipo.attivo }
    });
  };

  const handleUpdateNome = async (tipo, newNome) => {
    if (!newNome.trim()) return;
    await updateTipoMutation.mutateAsync({
      id: tipo.id,
      data: { ...tipo, nome: newNome.trim() }
    });
  };

  const handleDelete = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo tipo di preparazione?')) {
      await deleteTipoMutation.mutateAsync(id);
    }
  };

  // Filter data
  const filteredPreparazioni = useMemo(() => {
    return preparazioni.filter(p => {
      if (selectedStore !== 'all' && p.store_id !== selectedStore) return false;
      if (selectedTipo !== 'all' && p.tipo_preparazione !== selectedTipo) return false;
      
      if (startDate) {
        const pDate = new Date(p.data_rilevazione);
        const sDate = new Date(startDate);
        if (pDate < sDate) return false;
      }
      
      if (endDate) {
        const pDate = new Date(p.data_rilevazione);
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59);
        if (pDate > eDate) return false;
      }
      
      return true;
    });
  }, [preparazioni, selectedStore, selectedTipo, startDate, endDate]);

  // Statistics
  const stats = useMemo(() => {
    const totale = filteredPreparazioni.reduce((sum, p) => sum + (p.peso_grammi || 0), 0);
    const byTipo = {};
    const byStore = {};
    
    filteredPreparazioni.forEach(p => {
      byTipo[p.tipo_preparazione] = (byTipo[p.tipo_preparazione] || 0) + p.peso_grammi;
      byStore[p.store_name] = (byStore[p.store_name] || 0) + p.peso_grammi;
    });
    
    return {
      totale,
      count: filteredPreparazioni.length,
      byTipo,
      byStore,
      media: filteredPreparazioni.length > 0 ? totale / filteredPreparazioni.length : 0
    };
  }, [filteredPreparazioni]);

  const tipiAttivi = tipiPreparazione.filter(t => t.attivo);
  const uniqueTipi = [...new Set(preparazioni.map(p => p.tipo_preparazione))];

  return (
    <ProtectedPage pageName="PreparazioniAdmin">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="mb-4">
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Preparazioni
          </h1>
          <p className="text-sm text-slate-500">Gestisci e analizza le preparazioni</p>
        </div>

        {/* Tabs */}
        <NeumorphicCard className="p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'data'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Dati
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'config'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Configurazione Tipi
            </button>
          </div>
        </NeumorphicCard>

        {activeTab === 'data' ? (
          <>
            {/* Filters */}
            <NeumorphicCard className="p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-slate-600" />
                <h2 className="font-bold text-slate-800">Filtri</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Locale</label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="all">Tutti i locali</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo</label>
                  <select
                    value={selectedTipo}
                    onChange={(e) => setSelectedTipo(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="all">Tutti i tipi</option>
                    {uniqueTipi.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Data Inizio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Data Fine</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                </div>
              </div>

              {(selectedStore !== 'all' || selectedTipo !== 'all' || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSelectedStore('all');
                    setSelectedTipo('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reset filtri
                </button>
              )}
            </NeumorphicCard>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <NeumorphicCard className="p-4">
                <p className="text-sm text-slate-600 mb-1">Totale Preparazioni</p>
                <p className="text-2xl font-bold text-slate-800">{stats.count}</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-4">
                <p className="text-sm text-slate-600 mb-1">Peso Totale</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totale.toFixed(0)}g</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-4">
                <p className="text-sm text-slate-600 mb-1">Peso Medio</p>
                <p className="text-2xl font-bold text-green-600">{stats.media.toFixed(0)}g</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-4">
                <p className="text-sm text-slate-600 mb-1">Tipi Attivi</p>
                <p className="text-2xl font-bold text-purple-600">{tipiAttivi.length}</p>
              </NeumorphicCard>
            </div>

            {/* By Type */}
            {Object.keys(stats.byTipo).length > 0 && (
              <NeumorphicCard className="p-4 lg:p-6">
                <h3 className="font-bold text-slate-800 mb-4">Per Tipo</h3>
                <div className="space-y-2">
                  {Object.entries(stats.byTipo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([tipo, peso]) => (
                      <div key={tipo} className="flex items-center justify-between p-3 neumorphic-pressed rounded-lg">
                        <span className="font-medium text-slate-700">{tipo}</span>
                        <span className="font-bold text-blue-600">{peso.toFixed(0)}g</span>
                      </div>
                    ))}
                </div>
              </NeumorphicCard>
            )}

            {/* Table */}
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="font-bold text-slate-800 mb-4">
                Elenco Preparazioni ({filteredPreparazioni.length})
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b-2 border-blue-600">
                      <th className="text-left p-3 text-slate-600 font-medium text-sm">Data</th>
                      <th className="text-left p-3 text-slate-600 font-medium text-sm">Locale</th>
                      <th className="text-left p-3 text-slate-600 font-medium text-sm">Tipo</th>
                      <th className="text-right p-3 text-slate-600 font-medium text-sm">Peso (g)</th>
                      <th className="text-left p-3 text-slate-600 font-medium text-sm">Rilevato da</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPreparazioni.length > 0 ? (
                      filteredPreparazioni.map((p) => (
                        <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-700">
                                {format(new Date(p.data_rilevazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-slate-700">{p.store_name}</td>
                          <td className="p-3">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                              {p.tipo_preparazione}
                            </span>
                          </td>
                          <td className="p-3 text-right text-blue-600 font-bold">{p.peso_grammi}g</td>
                          <td className="p-3 text-sm text-slate-700">{p.rilevato_da}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="p-8 text-center">
                          <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">Nessuna preparazione trovata</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>
          </>
        ) : (
          <>
            {/* Configuration */}
            <NeumorphicCard className="p-4 lg:p-6">
              <h2 className="font-bold text-slate-800 mb-4">Tipi di Preparazione</h2>
              <p className="text-sm text-slate-500 mb-6">
                Configura quali tipi di preparazione sono disponibili nel form. Solo i tipi attivi saranno visibili.
              </p>

              {/* Add new */}
              <div className="neumorphic-pressed p-4 rounded-xl mb-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTipo()}
                    placeholder="Nome nuovo tipo preparazione..."
                    className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  />
                  <NeumorphicButton
                    onClick={handleAddTipo}
                    disabled={!newTipo.trim() || createTipoMutation.isLoading}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi
                  </NeumorphicButton>
                </div>
              </div>

              {/* List */}
              <div className="space-y-2">
                {tipiPreparazione.length > 0 ? (
                  tipiPreparazione.map((tipo) => (
                    <div
                      key={tipo.id}
                      className={`neumorphic-pressed p-4 rounded-xl flex items-center justify-between ${
                        !tipo.attivo ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => handleToggleAttivo(tipo)}
                          className={`w-6 h-6 rounded-lg transition-all ${
                            tipo.attivo
                              ? 'bg-gradient-to-r from-green-500 to-green-600'
                              : 'bg-slate-300'
                          }`}
                        >
                          {tipo.attivo && <span className="text-white text-sm">✓</span>}
                        </button>

                        {editingTipo?.id === tipo.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingTipo.nome}
                              onChange={(e) => setEditingTipo({ ...editingTipo, nome: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') handleUpdateNome(tipo, editingTipo.nome);
                              }}
                              className="flex-1 neumorphic-pressed px-3 py-2 rounded-lg text-slate-700 outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateNome(tipo, editingTipo.nome)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingTipo(null)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium text-slate-700">{tipo.nome}</span>
                            <button
                              onClick={() => setEditingTipo(tipo)}
                              className="text-slate-400 hover:text-blue-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(tipo.id)}
                        className="text-red-500 hover:text-red-600 ml-4"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Nessun tipo configurato</p>
                  </div>
                )}
              </div>
            </NeumorphicCard>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}