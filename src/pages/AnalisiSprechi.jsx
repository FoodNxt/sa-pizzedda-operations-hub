import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2,
  TrendingUp,
  Store,
  Calendar,
  Euro,
  AlertTriangle,
  BarChart3,
  Settings,
  Plus,
  X,
  Save,
  Pizza
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { format, parseISO, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalisiSprechi() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [activeTab, setActiveTab] = useState('teglie');
  const [showSprechiConfig, setShowSprechiConfig] = useState(false);
  const [sprechiConfigForm, setSprechiConfigForm] = useState({
    prodotti_abilitati: [],
    motivi_disponibili: []
  });
  const [newMotivo, setNewMotivo] = useState('');

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: teglieButtate = [] } = useQuery({
    queryKey: ['teglie-buttate'],
    queryFn: () => base44.entities.TeglieButtate.list('-data_rilevazione'),
  });

  const { data: ricette = [] } = useQuery({
    queryKey: ['ricette'],
    queryFn: () => base44.entities.Ricetta.list(),
  });

  const { data: sprechi = [] } = useQuery({
    queryKey: ['sprechi'],
    queryFn: () => base44.entities.Spreco.list('-data_rilevazione'),
  });

  const { data: materiePrime = [] } = useQuery({
    queryKey: ['materie-prime'],
    queryFn: () => base44.entities.MateriePrime.list(),
  });

  const { data: sprechiConfigs = [] } = useQuery({
    queryKey: ['sprechi-configs'],
    queryFn: () => base44.entities.SprechiConfig.list(),
  });

  const activeSprechiConfig = sprechiConfigs.find(c => c.is_active) || null;

  const saveConfigMutation = useMutation({
    mutationFn: async (configData) => {
      const existing = await base44.entities.SprechiConfig.list();
      for (const config of existing) {
        await base44.entities.SprechiConfig.update(config.id, { is_active: false });
      }
      return base44.entities.SprechiConfig.create({ 
        config_name: 'default_config',
        ...configData, 
        is_active: true 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprechi-configs'] });
      setShowSprechiConfig(false);
    },
  });

  React.useEffect(() => {
    if (activeSprechiConfig) {
      setSprechiConfigForm({
        prodotti_abilitati: activeSprechiConfig.prodotti_abilitati || [],
        motivi_disponibili: activeSprechiConfig.motivi_disponibili || []
      });
    }
  }, [activeSprechiConfig]);

  // Filter teglie by date range
  const filteredData = useMemo(() => {
    const now = new Date();
    const daysAgo = parseInt(dateRange);
    const cutoffDate = subDays(now, daysAgo);

    return teglieButtate.filter(t => {
      const dataRilevazione = parseISO(t.data_rilevazione);
      if (dataRilevazione < cutoffDate) return false;
      if (selectedStore !== 'all' && t.store_id !== selectedStore) return false;
      return true;
    });
  }, [teglieButtate, dateRange, selectedStore]);

  // Filter sprechi by date range
  const filteredSprechi = useMemo(() => {
    const now = new Date();
    const daysAgo = parseInt(dateRange);
    const cutoffDate = subDays(now, daysAgo);

    return sprechi.filter(s => {
      const dataRilevazione = parseISO(s.data_rilevazione);
      if (dataRilevazione < cutoffDate) return false;
      if (selectedStore !== 'all' && s.store_id !== selectedStore) return false;
      return true;
    });
  }, [sprechi, dateRange, selectedStore]);

  // Calculate average costs per tray type
  const averageCosts = useMemo(() => {
    const ricetteRosse = ricette.filter(r => r.tipo_teglia === 'rossa' && r.costo_unitario);
    const ricetteBianche = ricette.filter(r => r.tipo_teglia === 'bianca' && r.costo_unitario);

    const avgRossa = ricetteRosse.length > 0
      ? ricetteRosse.reduce((sum, r) => sum + r.costo_unitario, 0) / ricetteRosse.length
      : 0;

    const avgBianca = ricetteBianche.length > 0
      ? ricetteBianche.reduce((sum, r) => sum + r.costo_unitario, 0) / ricetteBianche.length
      : 0;

    return { rossa: avgRossa, bianca: avgBianca };
  }, [ricette]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRosse = filteredData.reduce((sum, t) => sum + (t.teglie_rosse_buttate || 0), 0);
    const totalBianche = filteredData.reduce((sum, t) => sum + (t.teglie_bianche_buttate || 0), 0);
    const totalTeglie = totalRosse + totalBianche;
    const costoTotale = (totalRosse * averageCosts.rossa) + (totalBianche * averageCosts.bianca);

    return {
      totalRosse,
      totalBianche,
      totalTeglie,
      costoTotale
    };
  }, [filteredData, averageCosts]);

  // Chart data by date
  const chartDataByDate = useMemo(() => {
    const dataByDate = {};

    filteredData.forEach(t => {
      const date = format(parseISO(t.data_rilevazione), 'dd/MM/yyyy');
      if (!dataByDate[date]) {
        dataByDate[date] = { date, rosse: 0, bianche: 0, costo: 0 };
      }
      dataByDate[date].rosse += t.teglie_rosse_buttate || 0;
      dataByDate[date].bianche += t.teglie_bianche_buttate || 0;
      dataByDate[date].costo += (t.teglie_rosse_buttate || 0) * averageCosts.rossa + 
                                  (t.teglie_bianche_buttate || 0) * averageCosts.bianca;
    });

    return Object.values(dataByDate).sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split('/');
      const [dayB, monthB, yearB] = b.date.split('/');
      return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });
  }, [filteredData, averageCosts]);

  // Chart data by store
  const chartDataByStore = useMemo(() => {
    const dataByStore = {};

    filteredData.forEach(t => {
      if (!dataByStore[t.store_name]) {
        dataByStore[t.store_name] = { store: t.store_name, rosse: 0, bianche: 0, costo: 0 };
      }
      dataByStore[t.store_name].rosse += t.teglie_rosse_buttate || 0;
      dataByStore[t.store_name].bianche += t.teglie_bianche_buttate || 0;
      dataByStore[t.store_name].costo += (t.teglie_rosse_buttate || 0) * averageCosts.rossa + 
                                          (t.teglie_bianche_buttate || 0) * averageCosts.bianca;
    });

    return Object.values(dataByStore).sort((a, b) => b.costo - a.costo);
  }, [filteredData, averageCosts]);

  // Chart data by day of week
  const chartDataByDayOfWeek = useMemo(() => {
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const dataByDay = {};

    giorni.forEach(day => {
      dataByDay[day] = { giorno: day, totale: 0, costo: 0, count: 0 };
    });

    filteredData.forEach(t => {
      const date = parseISO(t.data_rilevazione);
      const dayIndex = date.getDay();
      const dayName = giorni[dayIndex];
      
      const totalTeglie = (t.teglie_rosse_buttate || 0) + (t.teglie_bianche_buttate || 0);
      const costo = (t.teglie_rosse_buttate || 0) * averageCosts.rossa + 
                    (t.teglie_bianche_buttate || 0) * averageCosts.bianca;

      dataByDay[dayName].totale += totalTeglie;
      dataByDay[dayName].costo += costo;
      dataByDay[dayName].count += 1;
    });

    // Calculate averages
    return giorni.map(day => ({
      giorno: day,
      media: dataByDay[day].count > 0 ? (dataByDay[day].totale / dataByDay[day].count).toFixed(1) : 0,
      costoMedio: dataByDay[day].count > 0 ? (dataByDay[day].costo / dataByDay[day].count).toFixed(2) : 0
    }));
  }, [filteredData, averageCosts]);

  // Chart data by day of week per store
  const chartDataByDayPerStore = useMemo(() => {
    if (selectedStore === 'all') return [];

    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const dataByDay = {};

    giorni.forEach(day => {
      dataByDay[day] = { giorno: day, totale: 0, costo: 0, count: 0 };
    });

    filteredData.forEach(t => {
      const date = parseISO(t.data_rilevazione);
      const dayIndex = date.getDay();
      const dayName = giorni[dayIndex];
      
      const totalTeglie = (t.teglie_rosse_buttate || 0) + (t.teglie_bianche_buttate || 0);
      const costo = (t.teglie_rosse_buttate || 0) * averageCosts.rossa + 
                    (t.teglie_bianche_buttate || 0) * averageCosts.bianca;

      dataByDay[dayName].totale += totalTeglie;
      dataByDay[dayName].costo += costo;
      dataByDay[dayName].count += 1;
    });

    return giorni.map(day => ({
      giorno: day,
      media: dataByDay[day].count > 0 ? (dataByDay[day].totale / dataByDay[day].count).toFixed(1) : 0,
      costoMedio: dataByDay[day].count > 0 ? (dataByDay[day].costo / dataByDay[day].count).toFixed(2) : 0
    }));
  }, [filteredData, averageCosts, selectedStore]);

  // Sprechi stats
  const sprechiStats = useMemo(() => {
    const totalQuantitaGrammi = filteredSprechi.reduce((sum, s) => sum + (s.quantita_grammi || 0), 0);
    const totalQuantitaKg = totalQuantitaGrammi / 1000;
    const costoTotale = filteredSprechi.reduce((sum, s) => {
      const quantitaKg = (s.quantita_grammi || 0) / 1000;
      return sum + (quantitaKg * (s.costo_unitario || 0));
    }, 0);

    // Group by motivo
    const byMotivo = {};
    filteredSprechi.forEach(s => {
      if (!byMotivo[s.motivo]) {
        byMotivo[s.motivo] = { motivo: s.motivo, count: 0, quantita: 0, costo: 0 };
      }
      byMotivo[s.motivo].count++;
      byMotivo[s.motivo].quantita += (s.quantita_grammi || 0) / 1000;
      const quantitaKg = (s.quantita_grammi || 0) / 1000;
      byMotivo[s.motivo].costo += quantitaKg * (s.costo_unitario || 0);
    });

    return {
      totalQuantitaKg,
      costoTotale,
      totalRegistrazioni: filteredSprechi.length,
      byMotivo: Object.values(byMotivo).sort((a, b) => b.costo - a.costo)
    };
  }, [filteredSprechi]);

  const handleOpenSprechiConfig = () => {
    setShowSprechiConfig(true);
  };

  const handleSaveSprechiConfig = () => {
    saveConfigMutation.mutate(sprechiConfigForm);
  };

  const handleAddProdotto = (prodotto, tipo) => {
    const alreadyExists = sprechiConfigForm.prodotti_abilitati.some(
      p => p.prodotto_id === prodotto.id
    );
    if (alreadyExists) return;

    setSprechiConfigForm({
      ...sprechiConfigForm,
      prodotti_abilitati: [
        ...sprechiConfigForm.prodotti_abilitati,
        {
          prodotto_id: prodotto.id,
          nome: prodotto.nome_prodotto,
          tipo: tipo
        }
      ]
    });
  };

  const handleRemoveProdotto = (prodottoId) => {
    setSprechiConfigForm({
      ...sprechiConfigForm,
      prodotti_abilitati: sprechiConfigForm.prodotti_abilitati.filter(
        p => p.prodotto_id !== prodottoId
      )
    });
  };

  const handleAddMotivo = () => {
    if (!newMotivo.trim()) return;
    if (sprechiConfigForm.motivi_disponibili.includes(newMotivo.trim())) return;

    setSprechiConfigForm({
      ...sprechiConfigForm,
      motivi_disponibili: [...sprechiConfigForm.motivi_disponibili, newMotivo.trim()]
    });
    setNewMotivo('');
  };

  const handleRemoveMotivo = (motivo) => {
    setSprechiConfigForm({
      ...sprechiConfigForm,
      motivi_disponibili: sprechiConfigForm.motivi_disponibili.filter(m => m !== motivo)
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Trash2 className="w-10 h-10 text-orange-600" />
            <h1 className="text-3xl font-bold text-[#6b6b6b]">Analisi Sprechi</h1>
          </div>
          {activeTab === 'sprechi' && (
            <button
              onClick={handleOpenSprechiConfig}
              className="neumorphic-flat px-4 py-2 rounded-xl text-[#6b6b6b] hover:text-blue-600 transition-colors flex items-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Configura Sprechi
            </button>
          )}
        </div>
        <p className="text-[#9b9b9b]">Analizza l'andamento delle teglie buttate e degli sprechi</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('teglie')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'teglie'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
              : 'neumorphic-flat text-slate-600'
          }`}
        >
          <Pizza className="w-5 h-5 inline mr-2" />
          Teglie Buttate
        </button>
        <button
          onClick={() => setActiveTab('sprechi')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'sprechi'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
              : 'neumorphic-flat text-slate-600'
          }`}
        >
          <Trash2 className="w-5 h-5 inline mr-2" />
          Sprechi
        </button>
      </div>

      {/* Section: Teglie Buttate */}
      {activeTab === 'teglie' && (
        <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <NeumorphicCard className="px-4 py-2">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="all">Tutti i Locali</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </NeumorphicCard>

        <NeumorphicCard className="px-4 py-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent text-[#6b6b6b] outline-none"
          >
            <option value="7">Ultimi 7 giorni</option>
            <option value="30">Ultimi 30 giorni</option>
            <option value="60">Ultimi 60 giorni</option>
            <option value="90">Ultimi 90 giorni</option>
          </select>
        </NeumorphicCard>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-3xl font-bold text-orange-600 mb-1">{stats.totalTeglie}</h3>
          <p className="text-sm text-[#9b9b9b]">Teglie Buttate</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">{stats.totalRosse}</h3>
          <p className="text-sm text-[#9b9b9b]">Teglie Rosse</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
          </div>
          <h3 className="text-3xl font-bold text-gray-600 mb-1">{stats.totalBianche}</h3>
          <p className="text-sm text-[#9b9b9b]">Teglie Bianche</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center bg-red-50">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-100">
            <Euro className="w-8 h-8 text-red-700" />
          </div>
          <h3 className="text-3xl font-bold text-red-700 mb-1">€{stats.costoTotale.toFixed(2)}</h3>
          <p className="text-sm text-red-600 font-medium">Impatto Economico</p>
        </NeumorphicCard>
      </div>

      {/* Trend temporale */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Andamento Temporale
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartDataByDate}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="rosse" stroke="#dc2626" name="Teglie Rosse" strokeWidth={2} />
            <Line yAxisId="left" type="monotone" dataKey="bianche" stroke="#9ca3af" name="Teglie Bianche" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="costo" stroke="#ea580c" name="Costo (€)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </NeumorphicCard>

      {/* Confronto per negozio */}
      {selectedStore === 'all' && chartDataByStore.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-6 flex items-center gap-2">
            <Store className="w-6 h-6 text-purple-600" />
            Confronto per Negozio
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartDataByStore}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="store" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="rosse" fill="#dc2626" name="Teglie Rosse" />
              <Bar yAxisId="left" dataKey="bianche" fill="#9ca3af" name="Teglie Bianche" />
              <Bar yAxisId="right" dataKey="costo" fill="#ea580c" name="Costo (€)" />
            </BarChart>
          </ResponsiveContainer>
        </NeumorphicCard>
      )}

      {/* Analisi per giorno della settimana - Tutti i negozi */}
      {selectedStore === 'all' && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-green-600" />
            Analisi per Giorno della Settimana (Tutti i Locali)
          </h2>
          <p className="text-sm text-[#9b9b9b] mb-6">Media sprechi per giorno della settimana</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartDataByDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="giorno" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="media" fill="#3b82f6" name="Media Teglie" />
              <Bar yAxisId="right" dataKey="costoMedio" fill="#ea580c" name="Costo Medio (€)" />
            </BarChart>
          </ResponsiveContainer>

          {/* Insights */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const maxWaste = chartDataByDayOfWeek.reduce((max, day) => 
                parseFloat(day.media) > parseFloat(max.media) ? day : max
              , chartDataByDayOfWeek[0]);
              
              const minWaste = chartDataByDayOfWeek.reduce((min, day) => 
                parseFloat(day.media) < parseFloat(min.media) ? day : min
              , chartDataByDayOfWeek[0]);

              return (
                <>
                  <div className="neumorphic-pressed p-4 rounded-xl bg-red-50">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-red-800">Giorno con più sprechi</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-700">{maxWaste.giorno}</p>
                    <p className="text-sm text-red-600">Media: {maxWaste.media} teglie (€{maxWaste.costoMedio})</p>
                  </div>

                  <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                      <h3 className="font-bold text-green-800">Giorno con meno sprechi</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{minWaste.giorno}</p>
                    <p className="text-sm text-green-600">Media: {minWaste.media} teglie (€{minWaste.costoMedio})</p>
                  </div>
                </>
              );
            })()}
          </div>
        </NeumorphicCard>
      )}

      {/* Analisi per giorno della settimana - Singolo negozio */}
      {selectedStore !== 'all' && chartDataByDayPerStore.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-green-600" />
            Analisi per Giorno della Settimana ({stores.find(s => s.id === selectedStore)?.name})
          </h2>
          <p className="text-sm text-[#9b9b9b] mb-6">Media sprechi per giorno della settimana</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartDataByDayPerStore}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="giorno" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="media" fill="#3b82f6" name="Media Teglie" />
              <Bar yAxisId="right" dataKey="costoMedio" fill="#ea580c" name="Costo Medio (€)" />
            </BarChart>
          </ResponsiveContainer>

          {/* Insights per negozio */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const maxWaste = chartDataByDayPerStore.reduce((max, day) => 
                parseFloat(day.media) > parseFloat(max.media) ? day : max
              , chartDataByDayPerStore[0]);
              
              const minWaste = chartDataByDayPerStore.reduce((min, day) => 
                parseFloat(day.media) < parseFloat(min.media) ? day : min
              , chartDataByDayPerStore[0]);

              return (
                <>
                  <div className="neumorphic-pressed p-4 rounded-xl bg-red-50">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-red-800">Giorno con più sprechi</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-700">{maxWaste.giorno}</p>
                    <p className="text-sm text-red-600">Media: {maxWaste.media} teglie (€{maxWaste.costoMedio})</p>
                  </div>

                  <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                      <h3 className="font-bold text-green-800">Giorno con meno sprechi</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{minWaste.giorno}</p>
                    <p className="text-sm text-green-600">Media: {minWaste.media} teglie (€{minWaste.costoMedio})</p>
                  </div>
                </>
              );
            })()}
          </div>
        </NeumorphicCard>
      )}

      {/* Info box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-bold text-blue-800 mb-2">Come viene calcolato l'impatto economico</h3>
            <p className="text-sm text-blue-700">
              Il costo delle teglie buttate è calcolato usando il costo medio delle ricette per tipo di teglia:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• <strong>Teglie Rosse:</strong> €{averageCosts.rossa.toFixed(2)} (media da {ricette.filter(r => r.tipo_teglia === 'rossa').length} ricette)</li>
              <li>• <strong>Teglie Bianche:</strong> €{averageCosts.bianca.toFixed(2)} (media da {ricette.filter(r => r.tipo_teglia === 'bianca').length} ricette)</li>
            </ul>
            <p className="text-xs text-blue-600 mt-3">
              💡 Assegna le ricette alle teglie nella pagina "Ricette" per migliorare la precisione del calcolo
            </p>
          </div>
        </div>
      </NeumorphicCard>
        </>
      )}

      {/* Section: Sprechi */}
      {activeTab === 'sprechi' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <NeumorphicCard className="px-4 py-2">
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-transparent text-[#6b6b6b] outline-none"
              >
                <option value="all">Tutti i Locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </NeumorphicCard>

            <NeumorphicCard className="px-4 py-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent text-[#6b6b6b] outline-none"
              >
                <option value="7">Ultimi 7 giorni</option>
                <option value="30">Ultimi 30 giorni</option>
                <option value="60">Ultimi 60 giorni</option>
                <option value="90">Ultimi 90 giorni</option>
              </select>
            </NeumorphicCard>
          </div>

          {/* Sprechi Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NeumorphicCard className="p-6 text-center">
              <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-red-600 mb-1">{sprechiStats.totalRegistrazioni}</h3>
              <p className="text-sm text-[#9b9b9b]">Sprechi Registrati</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-6 text-center">
              <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-3xl font-bold text-purple-600 mb-1">{sprechiStats.totalQuantitaKg.toFixed(2)} kg</h3>
              <p className="text-sm text-[#9b9b9b]">Quantità Totale</p>
            </NeumorphicCard>

            <NeumorphicCard className="p-6 text-center bg-red-50">
              <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-100">
                <Euro className="w-8 h-8 text-red-700" />
              </div>
              <h3 className="text-3xl font-bold text-red-700 mb-1">€{sprechiStats.costoTotale.toFixed(2)}</h3>
              <p className="text-sm text-red-600 font-medium">Impatto Economico</p>
            </NeumorphicCard>
          </div>

          {/* Sprechi by Motivo */}
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-6 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              Sprechi per Motivo
            </h2>
            {sprechiStats.byMotivo.length > 0 ? (
              <div className="space-y-3">
                {sprechiStats.byMotivo.map((item, idx) => (
                  <div key={idx} className="neumorphic-flat p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-[#6b6b6b]">{item.motivo}</h3>
                      <span className="text-sm font-medium text-red-600">€{item.costo.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#9b9b9b]">
                      <span>{item.count} registrazioni</span>
                      <span>•</span>
                      <span>{item.quantita.toFixed(2)} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#9b9b9b] py-8">Nessuno spreco registrato nel periodo selezionato</p>
            )}
          </NeumorphicCard>

          {/* Recent Sprechi List */}
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Sprechi Recenti</h2>
            {filteredSprechi.length > 0 ? (
              <div className="space-y-3">
                {filteredSprechi.slice(0, 20).map((spreco) => (
                  <div key={spreco.id} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-[#6b6b6b]">{spreco.prodotto_nome}</h3>
                        <p className="text-sm text-[#9b9b9b]">{spreco.store_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{(spreco.quantita_grammi / 1000).toFixed(2)} kg</p>
                        <p className="text-sm text-[#9b9b9b]">
                          €{((spreco.quantita_grammi / 1000) * (spreco.costo_unitario || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#9b9b9b]">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg">{spreco.motivo}</span>
                      <span>•</span>
                      <span>{format(parseISO(spreco.data_rilevazione), 'dd MMM yyyy HH:mm', { locale: it })}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#9b9b9b] py-8">Nessuno spreco registrato</p>
            )}
          </NeumorphicCard>
        </>
      )}

      {/* Sprechi Config Modal */}
      {showSprechiConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="bg-white p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#6b6b6b]">Configurazione Sprechi</h2>
              <button
                onClick={() => setShowSprechiConfig(false)}
                className="neumorphic-flat p-2 rounded-lg text-[#9b9b9b] hover:text-[#6b6b6b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Motivi Section */}
              <div>
                <h3 className="text-lg font-bold text-[#6b6b6b] mb-3">Motivi Spreco</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newMotivo}
                    onChange={(e) => setNewMotivo(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddMotivo()}
                    placeholder="Nuovo motivo..."
                    className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  />
                  <button
                    onClick={handleAddMotivo}
                    className="neumorphic-flat px-4 py-3 rounded-xl text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sprechiConfigForm.motivi_disponibili.map((motivo, idx) => (
                    <div key={idx} className="neumorphic-flat px-3 py-2 rounded-lg flex items-center gap-2">
                      <span className="text-sm text-[#6b6b6b]">{motivo}</span>
                      <button
                        onClick={() => handleRemoveMotivo(motivo)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prodotti Section */}
              <div>
                <h3 className="text-lg font-bold text-[#6b6b6b] mb-3">Prodotti Abilitati</h3>
                
                {/* Selected Products */}
                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-2">Prodotti selezionati:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sprechiConfigForm.prodotti_abilitati.map((prodotto) => (
                      <div key={prodotto.prodotto_id} className="neumorphic-pressed p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-[#6b6b6b]">{prodotto.nome}</span>
                          <span className="text-xs text-[#9b9b9b] ml-2">({prodotto.tipo})</span>
                        </div>
                        <button
                          onClick={() => handleRemoveProdotto(prodotto.prodotto_id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Available Products */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Materie Prime */}
                  <div>
                    <h4 className="text-sm font-bold text-[#6b6b6b] mb-2">Materie Prime</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {materiePrime.filter(m => m.attivo).map(mp => (
                        <button
                          key={mp.id}
                          onClick={() => handleAddProdotto(mp, 'materia_prima')}
                          disabled={sprechiConfigForm.prodotti_abilitati.some(p => p.prodotto_id === mp.id)}
                          className={`w-full text-left p-2 rounded-lg text-sm transition-all ${
                            sprechiConfigForm.prodotti_abilitati.some(p => p.prodotto_id === mp.id)
                              ? 'bg-green-100 text-green-700'
                              : 'neumorphic-flat text-[#6b6b6b] hover:bg-blue-50'
                          }`}
                        >
                          {mp.nome_prodotto}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ricette */}
                  <div>
                    <h4 className="text-sm font-bold text-[#6b6b6b] mb-2">Ricette</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {ricette.filter(r => r.attivo && !r.is_semilavorato).map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleAddProdotto(r, 'ricetta')}
                          disabled={sprechiConfigForm.prodotti_abilitati.some(p => p.prodotto_id === r.id)}
                          className={`w-full text-left p-2 rounded-lg text-sm transition-all ${
                            sprechiConfigForm.prodotti_abilitati.some(p => p.prodotto_id === r.id)
                              ? 'bg-green-100 text-green-700'
                              : 'neumorphic-flat text-[#6b6b6b] hover:bg-blue-50'
                          }`}
                        >
                          {r.nome_prodotto}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Semilavorati */}
                  <div>
                    <h4 className="text-sm font-bold text-[#6b6b6b] mb-2">Semilavorati</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {ricette.filter(r => r.attivo && r.is_semilavorato).map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleAddProdotto(r, 'semilavorato')}
                          disabled={sprechiConfigForm.prodotti_abilitati.some(p => p.prodotto_id === r.id)}
                          className={`w-full text-left p-2 rounded-lg text-sm transition-all ${
                            sprechiConfigForm.prodotti_abilitati.some(p => p.prodotto_id === r.id)
                              ? 'bg-green-100 text-green-700'
                              : 'neumorphic-flat text-[#6b6b6b] hover:bg-blue-50'
                          }`}
                        >
                          {r.nome_prodotto}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowSprechiConfig(false)}
                  className="neumorphic-flat px-6 py-3 rounded-xl text-[#6b6b6b] hover:text-[#9b9b9b]"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveSprechiConfig}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  Salva Configurazione
                </button>
              </div>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}