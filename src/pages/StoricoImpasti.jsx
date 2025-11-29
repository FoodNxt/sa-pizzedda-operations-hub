import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { ChefHat, Calendar, Store, User, TrendingUp, BarChart3, BookOpen, Plus, Edit, Save, Trash2 } from "lucide-react";
import moment from "moment";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function StoricoImpasti() {
  const [activeTab, setActiveTab] = useState('storico');
  const [selectedStore, setSelectedStore] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [showIngredientForm, setShowIngredientForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [ingredientForm, setIngredientForm] = useState({
    nome_ingrediente: '',
    quantita_per_pallina: '',
    unita_misura: 'g',
    ordine: 0
  });
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['calcolo-impasto-logs'],
    queryFn: () => base44.entities.CalcoloImpastoLog.list('-data_calcolo', 500),
  });

  const { data: ricettaIngredienti = [] } = useQuery({
    queryKey: ['ricetta-impasto'],
    queryFn: () => base44.entities.RicettaImpasto.list(),
  });

  const sortedIngredienti = [...ricettaIngredienti].filter(i => i.attivo !== false).sort((a, b) => (a.ordine || 0) - (b.ordine || 0));

  const createIngredientMutation = useMutation({
    mutationFn: (data) => base44.entities.RicettaImpasto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricetta-impasto'] });
      resetIngredientForm();
    },
  });

  const updateIngredientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RicettaImpasto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricetta-impasto'] });
      resetIngredientForm();
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: (id) => base44.entities.RicettaImpasto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ricetta-impasto'] });
    },
  });

  const resetIngredientForm = () => {
    setIngredientForm({ nome_ingrediente: '', quantita_per_pallina: '', unita_misura: 'g', ordine: 0 });
    setEditingIngredient(null);
    setShowIngredientForm(false);
  };

  const handleSaveIngredient = () => {
    const data = {
      ...ingredientForm,
      quantita_per_pallina: parseFloat(ingredientForm.quantita_per_pallina),
      ordine: parseInt(ingredientForm.ordine) || 0,
      attivo: true
    };
    if (editingIngredient) {
      updateIngredientMutation.mutate({ id: editingIngredient.id, data });
    } else {
      createIngredientMutation.mutate(data);
    }
  };

  const handleEditIngredient = (ing) => {
    setEditingIngredient(ing);
    setIngredientForm({
      nome_ingrediente: ing.nome_ingrediente,
      quantita_per_pallina: ing.quantita_per_pallina,
      unita_misura: ing.unita_misura,
      ordine: ing.ordine || 0
    });
    setShowIngredientForm(true);
  };

  const getDateFilter = () => {
    const now = moment();
    if (dateRange === 'today') return now.startOf('day');
    if (dateRange === 'week') return now.subtract(7, 'days');
    if (dateRange === 'month') return now.subtract(30, 'days');
    return null;
  };

  const filteredLogs = logs.filter(log => {
    if (selectedStore && log.store_id !== selectedStore) return false;
    const dateFilter = getDateFilter();
    if (dateFilter && moment(log.data_calcolo).isBefore(dateFilter)) return false;
    return true;
  });

  const stats = {
    totaleCalcoli: filteredLogs.length,
    mediaBarelle: filteredLogs.length > 0 
      ? (filteredLogs.reduce((sum, l) => sum + (l.barelle_in_frigo || 0), 0) / filteredLogs.length).toFixed(1)
      : 0,
    mediaImpasto: filteredLogs.length > 0
      ? (filteredLogs.reduce((sum, l) => sum + (l.impasto_suggerito || 0), 0) / filteredLogs.length).toFixed(0)
      : 0,
    totaleImpasto: filteredLogs.reduce((sum, l) => sum + (l.impasto_suggerito || 0), 0)
  };

  // Trend data - grouped by date
  const trendData = useMemo(() => {
    const grouped = {};
    filteredLogs.forEach(log => {
      const date = moment(log.data_calcolo).format('DD/MM');
      if (!grouped[date]) {
        grouped[date] = { barelle: [], impasto: [] };
      }
      grouped[date].barelle.push(log.barelle_in_frigo || 0);
      grouped[date].impasto.push(log.impasto_suggerito || 0);
    });

    return Object.entries(grouped)
      .map(([date, values]) => ({
        data: date,
        mediaBarelle: values.barelle.length > 0 
          ? parseFloat((values.barelle.reduce((a, b) => a + b, 0) / values.barelle.length).toFixed(1))
          : 0,
        mediaImpasto: values.impasto.length > 0 
          ? Math.round(values.impasto.reduce((a, b) => a + b, 0) / values.impasto.length)
          : 0
      }))
      .sort((a, b) => {
        const [dayA, monthA] = a.data.split('/').map(Number);
        const [dayB, monthB] = b.data.split('/').map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
      });
  }, [filteredLogs]);

  // Data by day of week
  const dayOfWeekData = useMemo(() => {
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const grouped = {};
    giorni.forEach((g, idx) => {
      grouped[idx] = { barelle: [], impasto: [] };
    });

    filteredLogs.forEach(log => {
      const dayIndex = moment(log.data_calcolo).day();
      grouped[dayIndex].barelle.push(log.barelle_in_frigo || 0);
      grouped[dayIndex].impasto.push(log.impasto_suggerito || 0);
    });

    return giorni.map((giorno, idx) => ({
      giorno: giorno.slice(0, 3),
      mediaBarelle: grouped[idx].barelle.length > 0
        ? parseFloat((grouped[idx].barelle.reduce((a, b) => a + b, 0) / grouped[idx].barelle.length).toFixed(1))
        : 0,
      mediaImpasto: grouped[idx].impasto.length > 0
        ? Math.round(grouped[idx].impasto.reduce((a, b) => a + b, 0) / grouped[idx].impasto.length)
        : 0
    }));
  }, [filteredLogs]);

  return (
    <ProtectedPage pageName="StoricoImpasti">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Storico Impasti
          </h1>
          <p className="text-slate-500 mt-1">Visualizza lo storico dei calcoli impasto e gestisci la ricetta</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('storico')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'storico'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Storico
          </button>
          <button
            onClick={() => setActiveTab('ricetta')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'ricetta'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Ricetta Impasto
          </button>
        </div>

        {/* Tab Ricetta */}
        {activeTab === 'ricetta' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Ricetta per 1 Pallina</h2>
                <p className="text-sm text-slate-500 mt-1">Definisci gli ingredienti e le quantità per ogni pallina di impasto</p>
              </div>
              <NeumorphicButton
                onClick={() => setShowIngredientForm(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Aggiungi Ingrediente
              </NeumorphicButton>
            </div>

            {showIngredientForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-4">
                <h3 className="font-bold text-slate-700 mb-3">
                  {editingIngredient ? 'Modifica Ingrediente' : 'Nuovo Ingrediente'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nome Ingrediente</label>
                    <input
                      type="text"
                      value={ingredientForm.nome_ingrediente}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, nome_ingrediente: e.target.value })}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                      placeholder="es. Farina 00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Quantità per Pallina</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ingredientForm.quantita_per_pallina}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, quantita_per_pallina: e.target.value })}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                      placeholder="es. 150"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Unità di Misura</label>
                    <select
                      value={ingredientForm.unita_misura}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, unita_misura: e.target.value })}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                    >
                      <option value="g">grammi (g)</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="litri">litri</option>
                      <option value="unità">unità</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Ordine</label>
                    <input
                      type="number"
                      value={ingredientForm.ordine}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, ordine: e.target.value })}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <NeumorphicButton onClick={resetIngredientForm}>Annulla</NeumorphicButton>
                  <NeumorphicButton 
                    onClick={handleSaveIngredient} 
                    variant="primary"
                    disabled={!ingredientForm.nome_ingrediente || !ingredientForm.quantita_per_pallina}
                  >
                    <Save className="w-4 h-4 inline mr-1" /> Salva
                  </NeumorphicButton>
                </div>
              </div>
            )}

            {sortedIngredienti.length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun ingrediente configurato</p>
                <p className="text-sm text-slate-400 mt-1">Clicca "Aggiungi Ingrediente" per iniziare</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-200">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Ingrediente</div>
                  <div className="col-span-3 text-right">Quantità</div>
                  <div className="col-span-3 text-right">Azioni</div>
                </div>
                {sortedIngredienti.map((ing, idx) => (
                  <div key={ing.id} className="neumorphic-pressed p-3 rounded-xl grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-slate-400 text-sm">{idx + 1}</div>
                    <div className="col-span-5">
                      <p className="font-medium text-slate-800">{ing.nome_ingrediente}</p>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-lg font-bold text-blue-600">{ing.quantita_per_pallina}</span>
                      <span className="text-sm text-slate-500 ml-1">{ing.unita_misura}</span>
                    </div>
                    <div className="col-span-3 flex gap-1 justify-end">
                      <button
                        onClick={() => handleEditIngredient(ing)}
                        className="nav-button p-2 rounded-lg hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questo ingrediente?')) {
                            deleteIngredientMutation.mutate(ing.id);
                          }
                        }}
                        className="nav-button p-2 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Come funziona:</strong> Quando un pizzaiolo compila il form Impasto e conferma il calcolo, 
                il sistema mostrerà automaticamente le quantità totali di ogni ingrediente da utilizzare, 
                calcolate in base al numero di palline da preparare.
              </p>
            </div>
          </NeumorphicCard>
        )}

        {/* Tab Storico */}
        {activeTab === 'storico' && (
          <>
        {/* Filtri */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Store className="w-4 h-4 inline mr-1" />
                Negozio
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
              >
                <option value="">Tutti i negozi</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Periodo
              </label>
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
          </div>
        </NeumorphicCard>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NeumorphicCard className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totaleCalcoli}</p>
            <p className="text-xs text-slate-500">Calcoli effettuati</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 mx-auto mb-2 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.mediaBarelle}</p>
            <p className="text-xs text-slate-500">Media barelle</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 mx-auto mb-2 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.mediaImpasto}</p>
            <p className="text-xs text-slate-500">Media impasto</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-2 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totaleImpasto}</p>
            <p className="text-xs text-slate-500">Totale palline</p>
          </NeumorphicCard>
        </div>

        {/* Grafici */}
        {filteredLogs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend temporale */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">Trend Giornaliero</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="data" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#3b82f6" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#22c55e" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#f8fafc', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="mediaBarelle" 
                      name="Media Barelle"
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="mediaImpasto" 
                      name="Media Impasto"
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </NeumorphicCard>

            {/* Per giorno della settimana */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-slate-800">Media per Giorno Settimana</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="giorno" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#3b82f6" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#22c55e" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#f8fafc', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="mediaBarelle" 
                      name="Media Barelle"
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="mediaImpasto" 
                      name="Media Impasto"
                      fill="#22c55e" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </NeumorphicCard>
          </div>
        )}

        {/* Lista */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Storico Calcoli</h2>
          
          {filteredLogs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nessun calcolo trovato</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-2 text-slate-700">Data/Ora</th>
                    <th className="text-left py-3 px-2 text-slate-700">Negozio</th>
                    <th className="text-left py-3 px-2 text-slate-700">Operatore</th>
                    <th className="text-right py-3 px-2 text-slate-700">Barelle in Frigo</th>
                    <th className="text-right py-3 px-2 text-slate-700">Palline Presenti</th>
                    <th className="text-right py-3 px-2 text-slate-700">Fabbisogno 3gg</th>
                    <th className="text-right py-3 px-2 text-slate-700 bg-green-50">Impasto Suggerito</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-2 text-slate-700">
                        {moment(log.data_calcolo).format('DD/MM/YYYY HH:mm')}
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-800">{log.store_name}</td>
                      <td className="py-3 px-2 text-slate-600">
                        <User className="w-3 h-3 inline mr-1" />
                        {log.operatore || '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-700">{log.barelle_in_frigo}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{log.palline_presenti}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{log.fabbisogno_3_giorni}</td>
                      <td className="py-3 px-2 text-right font-bold text-green-700 bg-green-50">
                        {log.impasto_suggerito}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}