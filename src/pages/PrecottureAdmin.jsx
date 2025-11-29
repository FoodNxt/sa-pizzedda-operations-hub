import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { ChefHat, Plus, Edit, Save, X, Calendar, History, Store, User, Trash2 } from "lucide-react";
import moment from "moment";

const giorni = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default function PrecottureAdmin() {
  const [activeTab, setActiveTab] = useState('configurazione');
  const [selectedStore, setSelectedStore] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [dateRange, setDateRange] = useState('week');
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: impasti = [] } = useQuery({
    queryKey: ['gestione-impasti'],
    queryFn: () => base44.entities.GestioneImpasti.list(),
  });

  const { data: preparazioni = [] } = useQuery({
    queryKey: ['preparazioni-storico'],
    queryFn: () => base44.entities.Preparazioni.list('-created_date', 500),
    enabled: activeTab === 'storico'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GestioneImpasti.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestione-impasti'] });
      setEditingRow(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GestioneImpasti.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestione-impasti'] });
      setEditingRow(null);
    },
  });

  const deletePreparazioneMutation = useMutation({
    mutationFn: (id) => base44.entities.Preparazioni.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparazioni-storico'] });
    },
  });

  const filteredImpasti = useMemo(() => {
    if (!selectedStore) return [];
    return impasti.filter(i => i.store_id === selectedStore || i.store_name === selectedStore);
  }, [impasti, selectedStore]);

  const getDataForDay = (giorno) => {
    return filteredImpasti.find(i => i.giorno_settimana === giorno);
  };

  const getTotaleGiornaliero = (data) => {
    if (!data) return 0;
    return (data.pranzo_rosse || 0) +
           (data.pomeriggio_rosse || 0) +
           (data.cena_rosse || 0);
  };

  const getImpastoPer3Giorni = (giornoIndex) => {
    let totale = 0;
    for (let i = 0; i < 3; i++) {
      const idx = (giornoIndex + i) % 7;
      const data = getDataForDay(giorni[idx]);
      totale += getTotaleGiornaliero(data);
    }
    return totale;
  };

  const handleEdit = (giorno, data) => {
    setEditingRow(giorno);
    setEditData(data || {
      pranzo_rosse: 0,
      pomeriggio_rosse: 0,
      cena_rosse: 0
    });
  };

  const handleSave = async (giorno) => {
    const store = stores.find(s => s.id === selectedStore);
    const existing = getDataForDay(giorno);

    const payload = {
      store_name: store?.name,
      store_id: selectedStore,
      giorno_settimana: giorno,
      ...editData
    };

    if (existing) {
      await updateMutation.mutateAsync({ id: existing.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  // Storico precotture
  const getDateFilter = () => {
    const now = moment();
    if (dateRange === 'today') return now.startOf('day');
    if (dateRange === 'week') return now.subtract(7, 'days');
    if (dateRange === 'month') return now.subtract(30, 'days');
    return null;
  };

  const filteredStorico = useMemo(() => {
    return preparazioni.filter(p => {
      if (selectedStore && p.store_id !== selectedStore) return false;
      const dateFilter = getDateFilter();
      if (dateFilter && moment(p.created_date).isBefore(dateFilter)) return false;
      return true;
    });
  }, [preparazioni, selectedStore, dateRange]);

  const storicoStats = useMemo(() => {
    if (filteredStorico.length === 0) return null;
    
    const totaleRosse = filteredStorico.reduce((sum, p) => sum + (p.rosse_preparate || 0), 0);
    const totaleBianche = filteredStorico.reduce((sum, p) => sum + (p.bianche_preparate || 0), 0);
    
    return {
      totaleForm: filteredStorico.length,
      totaleRosse,
      totaleBianche,
      mediaRosse: (totaleRosse / filteredStorico.length).toFixed(1),
      mediaBianche: (totaleBianche / filteredStorico.length).toFixed(1)
    };
  }, [filteredStorico]);

  const getStoreName = (storeId) => {
    return stores.find(s => s.id === storeId)?.name || storeId;
  };

  return (
    <ProtectedPage pageName="PrecottureAdmin" requiredUserTypes={['admin']}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Gestione Precotture
            </h1>
            <p className="text-slate-500 mt-1">Configura precotture e visualizza lo storico</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('configurazione')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'configurazione'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            Configurazione
          </button>
          <button
            onClick={() => setActiveTab('storico')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'storico'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Storico Compilazioni
          </button>
        </div>

        {/* Filtro negozio comune */}
        <NeumorphicCard className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Store className="w-4 h-4 inline mr-1" />
                Seleziona Negozio
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">-- Tutti i negozi --</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            {activeTab === 'storico' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Periodo</label>
                <div className="flex gap-2">
                  {[
                    { value: 'today', label: 'Oggi' },
                    { value: 'week', label: '7 giorni' },
                    { value: 'month', label: '30 giorni' },
                    { value: 'all', label: 'Tutto' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDateRange(opt.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        dateRange === opt.value
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'neumorphic-flat text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </NeumorphicCard>

        {/* Tab Configurazione */}
        {activeTab === 'configurazione' && selectedStore && (
          <>
            <NeumorphicCard className="p-6 bg-blue-50">
              <h3 className="text-lg font-bold text-blue-800 mb-3">ℹ️ Come funziona la colonna "Impasto 3 Giorni"</h3>
              <div className="space-y-2 text-sm text-blue-900">
                <p>
                  <strong>Calcolo:</strong> Per ogni giorno, viene calcolato il totale delle precotture necessarie per i successivi 3 giorni.
                </p>
                <p>
                  <strong>Utilizzo:</strong> Questo dato indica quante palline di impasto devono essere preparate per coprire la produzione dei prossimi 3 giorni.
                </p>
              </div>
            </NeumorphicCard>

            <NeumorphicCard className="p-6 overflow-x-auto">
              <div className="flex items-center gap-2 mb-4">
                <ChefHat className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800">Pianificazione Settimanale</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-2 font-semibold text-slate-700">Giorno</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-red-50">Pranzo<br/>Rosse</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-red-50">Pomeriggio<br/>Rosse</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-red-50">Cena<br/>Rosse</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-green-50">Totale<br/>Giornata</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-700 bg-yellow-50">Impasto<br/>3 Giorni</th>
                      <th className="text-center py-3 px-2">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giorni.map((giorno, idx) => {
                      const data = getDataForDay(giorno);
                      const isEditing = editingRow === giorno;
                      const totaleGiorno = getTotaleGiornaliero(isEditing ? editData : data);
                      const impasto3Giorni = getImpastoPer3Giorni(idx);

                      return (
                        <tr key={giorno} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-2 font-medium text-slate-700">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {giorno}
                            </div>
                          </td>
                          {isEditing ? (
                            <>
                              <td className="text-center py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={editData.pranzo_rosse || 0}
                                  onChange={(e) => setEditData({...editData, pranzo_rosse: parseInt(e.target.value) || 0})}
                                  className="w-16 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                                />
                              </td>
                              <td className="text-center py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={editData.pomeriggio_rosse || 0}
                                  onChange={(e) => setEditData({...editData, pomeriggio_rosse: parseInt(e.target.value) || 0})}
                                  className="w-16 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                                />
                              </td>
                              <td className="text-center py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={editData.cena_rosse || 0}
                                  onChange={(e) => setEditData({...editData, cena_rosse: parseInt(e.target.value) || 0})}
                                  className="w-16 text-center neumorphic-pressed px-2 py-1 rounded-lg"
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="text-center py-2 px-2 bg-red-50">{data?.pranzo_rosse || 0}</td>
                              <td className="text-center py-2 px-2 bg-red-50">{data?.pomeriggio_rosse || 0}</td>
                              <td className="text-center py-2 px-2 bg-red-50">{data?.cena_rosse || 0}</td>
                            </>
                          )}
                          <td className="text-center py-2 px-2 font-bold text-green-700 bg-green-50">{totaleGiorno}</td>
                          <td className="text-center py-2 px-2 font-bold text-yellow-700 bg-yellow-50">{impasto3Giorni}</td>
                          <td className="text-center py-2 px-2">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSave(giorno)}
                                  className="nav-button p-2 rounded-lg hover:bg-green-50"
                                  title="Salva"
                                >
                                  <Save className="w-4 h-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() => setEditingRow(null)}
                                  className="nav-button p-2 rounded-lg hover:bg-red-50"
                                  title="Annulla"
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEdit(giorno, data)}
                                className="nav-button p-2 rounded-lg hover:bg-blue-50"
                                title="Modifica"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </NeumorphicCard>
          </>
        )}

        {activeTab === 'configurazione' && !selectedStore && (
          <NeumorphicCard className="p-8 text-center">
            <Store className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">Seleziona un negozio per configurare le precotture</p>
          </NeumorphicCard>
        )}

        {/* Tab Storico */}
        {activeTab === 'storico' && (
          <>
            {storicoStats && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{storicoStats.totaleForm}</p>
                  <p className="text-xs text-slate-500">Form compilati</p>
                </NeumorphicCard>
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{storicoStats.totaleRosse}</p>
                  <p className="text-xs text-slate-500">Totale Rosse</p>
                </NeumorphicCard>
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{storicoStats.totaleBianche}</p>
                  <p className="text-xs text-slate-500">Totale Bianche</p>
                </NeumorphicCard>
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{storicoStats.mediaRosse}</p>
                  <p className="text-xs text-slate-500">Media Rosse</p>
                </NeumorphicCard>
                <NeumorphicCard className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{storicoStats.mediaBianche}</p>
                  <p className="text-xs text-slate-500">Media Bianche</p>
                </NeumorphicCard>
              </div>
            )}

            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Storico Form Precotture</h2>
              
              {filteredStorico.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Nessun form trovato</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-3 px-2 text-slate-700">Data/Ora</th>
                        <th className="text-left py-3 px-2 text-slate-700">Negozio</th>
                        <th className="text-left py-3 px-2 text-slate-700">Operatore</th>
                        <th className="text-center py-3 px-2 text-slate-700">Turno</th>
                        <th className="text-right py-3 px-2 text-red-700 bg-red-50">Rosse</th>
                        <th className="text-right py-3 px-2 text-yellow-700 bg-yellow-50">Bianche</th>
                        <th className="text-center py-3 px-2 text-slate-700">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStorico.map(prep => (
                        <tr key={prep.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-2 text-slate-700">
                            {moment(prep.created_date).format('DD/MM/YYYY HH:mm')}
                          </td>
                          <td className="py-3 px-2 font-medium text-slate-800">
                            {prep.store_name || getStoreName(prep.store_id)}
                          </td>
                          <td className="py-3 px-2 text-slate-600">
                            <User className="w-3 h-3 inline mr-1" />
                            {prep.created_by || '-'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              prep.turno === 'pranzo' ? 'bg-blue-100 text-blue-700' :
                              prep.turno === 'pomeriggio' ? 'bg-orange-100 text-orange-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {prep.turno || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-red-700 bg-red-50">
                            {prep.rosse_preparate || 0}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-yellow-700 bg-yellow-50">
                            {prep.bianche_preparate || 0}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => {
                                if (confirm('Eliminare questa registrazione?')) {
                                  deletePreparazioneMutation.mutate(prep.id);
                                }
                              }}
                              className="nav-button p-2 rounded-lg hover:bg-red-50"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </NeumorphicCard>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}