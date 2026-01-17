import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { Clock, TrendingUp, User, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Ritardi() {
  const [selectedStore, setSelectedStore] = useState("all");
  const [dateRange, setDateRange] = useState('30'); // 30, month, 180, 365
  const [viewMode, setViewMode] = useState('store'); // 'store' or 'dipendente'

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-ritardi'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 2000)
  });

  const { data: timbraturaConfig } = useQuery({
    queryKey: ['timbratura-config'],
    queryFn: async () => {
      const configs = await base44.entities.TimbraturaConfig.filter({ is_active: true });
      return configs[0] || { tolleranza_ritardo_minuti: 0, arrotonda_ritardo: true, arrotondamento_minuti: 15 };
    }
  });

  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculateDelays = async () => {
    setIsRecalculating(true);
    try {
      const result = await base44.functions.invoke('calculateShiftDelay', {});
      alert(`✅ ${result.data.message}`);
      // Refresh data
      window.location.reload();
    } catch (error) {
      alert(`❌ Errore: ${error.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Calculate date range filter
  const dateRangeStart = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case '30': {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
      }
      case 'month':
        return startOfMonth(new Date());
      case '180':
        return subMonths(new Date(), 6);
      case '365':
        return subMonths(new Date(), 12);
      default:
        return null;
    }
  }, [dateRange]);

  // Filter turni by date and store
  const filteredTurni = useMemo(() => {
    return turni
      .map(t => {
        // Prendo minuti_ritardo_reale dal database, o lo calcolo se non c'è
        let minutiRitardoReale = t.minuti_ritardo_reale || 0;
        
        // Se non c'è ritardo reale nel database, calcolalo
        if (minutiRitardoReale === 0 && t.timbratura_entrata && t.ora_inizio) {
          try {
            const clockInTime = new Date(t.timbratura_entrata);
            const [oraInizioHH, oraInizioMM] = t.ora_inizio.split(':').map(Number);
            const scheduledStart = new Date(clockInTime);
            scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
            const delayMs = clockInTime - scheduledStart;
            minutiRitardoReale = Math.max(0, Math.floor(delayMs / 60000));
          } catch (e) {
            // Skip in caso di errore
          }
        }
        
        // SEMPRE ricalcola il conteggiato basandosi sul reale e configurazione
        let minutiRitardoConteggiato = 0;
        const tolleranza = timbraturaConfig?.tolleranza_ritardo_minuti || 0;
        
        if (minutiRitardoReale > tolleranza) {
          const ritardoDopoPenalita = minutiRitardoReale - tolleranza;
          
          if (timbraturaConfig?.arrotonda_ritardo) {
            const arrotondamento = timbraturaConfig?.arrotondamento_minuti || 15;
            minutiRitardoConteggiato = Math.ceil(ritardoDopoPenalita / arrotondamento) * arrotondamento;
          } else {
            minutiRitardoConteggiato = ritardoDopoPenalita;
          }
        }
        
        return {
          ...t,
          minuti_ritardo_reale: minutiRitardoReale,
          minuti_ritardo_conteggiato: minutiRitardoConteggiato
        };
      })
      .filter(t => {
        // Deve avere timbratura entrata
        if (!t.timbratura_entrata) return false;
        
        // Deve avere ritardo
        if (t.minuti_ritardo_reale <= 0) return false;
        
        // Filtro store
        const matchStore = selectedStore === "all" || t.store_id === selectedStore;
        if (!matchStore) return false;
        
        // Filtro data
        if (dateRangeStart) {
          const turnoDate = new Date(t.data);
          if (turnoDate < dateRangeStart) return false;
        }
        
        return true;
      });
  }, [turni, selectedStore, dateRangeStart, timbraturaConfig]);

  // Calcola statistiche per store
  const statsPerStore = useMemo(() => {
    const stats = {};

    stores.forEach(store => {
      const turniStore = filteredTurni.filter(t => t.store_id === store.id);
      const totalRitardi = turniStore.length;
      const minutiReali = turniStore.reduce((sum, t) => sum + (t.minuti_ritardo_reale || 0), 0);
      const minutiConteggiati = turniStore.reduce((sum, t) => sum + (t.minuti_ritardo_conteggiato || 0), 0);
      
      stats[store.id] = {
        storeName: store.name,
        totalRitardi,
        minutiReali,
        minutiConteggiati,
        oreReali: (minutiReali / 60).toFixed(1),
        oreConteggiate: (minutiConteggiati / 60).toFixed(1),
        mediaMinutiReali: totalRitardi > 0 ? (minutiReali / totalRitardi).toFixed(1) : 0,
        mediaMinutiConteggiati: totalRitardi > 0 ? (minutiConteggiati / totalRitardi).toFixed(1) : 0
      };
    });

    return Object.values(stats).filter(s => s.totalRitardi > 0);
  }, [stores, filteredTurni]);

  // Calcola statistiche per dipendente
  const statsPerDipendente = useMemo(() => {
    const stats = {};

    filteredTurni.forEach(turno => {
      if (!turno.dipendente_id) return;

      if (!stats[turno.dipendente_id]) {
        const user = users.find(u => u.id === turno.dipendente_id);
        stats[turno.dipendente_id] = {
          dipendenteId: turno.dipendente_id,
          dipendenteNome: turno.dipendente_nome || user?.nome_cognome || user?.full_name || 'Sconosciuto',
          totalRitardi: 0,
          minutiReali: 0,
          minutiConteggiati: 0,
          turniPerStore: {}
        };
      }

      stats[turno.dipendente_id].totalRitardi++;
      stats[turno.dipendente_id].minutiReali += turno.minuti_ritardo_reale || 0;
      stats[turno.dipendente_id].minutiConteggiati += turno.minuti_ritardo_conteggiato || 0;

      // Per store
      if (!stats[turno.dipendente_id].turniPerStore[turno.store_id]) {
        stats[turno.dipendente_id].turniPerStore[turno.store_id] = {
          storeName: stores.find(s => s.id === turno.store_id)?.name || 'Sconosciuto',
          count: 0,
          minutiReali: 0,
          minutiConteggiati: 0
        };
      }
      stats[turno.dipendente_id].turniPerStore[turno.store_id].count++;
      stats[turno.dipendente_id].turniPerStore[turno.store_id].minutiReali += turno.minuti_ritardo_reale || 0;
      stats[turno.dipendente_id].turniPerStore[turno.store_id].minutiConteggiati += turno.minuti_ritardo_conteggiato || 0;
    });

    return Object.values(stats)
      .map(s => ({
        ...s,
        oreReali: (s.minutiReali / 60).toFixed(1),
        oreConteggiate: (s.minutiConteggiati / 60).toFixed(1),
        mediaMinutiReali: s.totalRitardi > 0 ? (s.minutiReali / s.totalRitardi).toFixed(1) : 0,
        mediaMinutiConteggiati: s.totalRitardi > 0 ? (s.minutiConteggiati / s.totalRitardi).toFixed(1) : 0
      }))
      .sort((a, b) => b.minutiConteggiati - a.minutiConteggiati);
  }, [filteredTurni, users, stores]);

  // Trend temporale
  const trendData = useMemo(() => {
    const grouped = {};

    filteredTurni.forEach(turno => {
      const date = turno.data;
      if (!grouped[date]) {
        grouped[date] = {
          date,
          totalRitardi: 0,
          minutiReali: 0,
          minutiConteggiati: 0
        };
      }
      grouped[date].totalRitardi++;
      grouped[date].minutiReali += turno.minuti_ritardo_reale || 0;
      grouped[date].minutiConteggiati += turno.minuti_ritardo_conteggiato || 0;
    });

    return Object.values(grouped)
      .map(g => ({
        ...g,
        mediaMinutiReali: g.totalRitardi > 0 ? (g.minutiReali / g.totalRitardi).toFixed(1) : 0,
        mediaMinutiConteggiati: g.totalRitardi > 0 ? (g.minutiConteggiati / g.totalRitardi).toFixed(1) : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredTurni]);

  // Statistiche complessive
  const overallStats = useMemo(() => {
    const totalRitardi = filteredTurni.length;
    const minutiReali = filteredTurni.reduce((sum, t) => sum + (t.minuti_ritardo_reale || 0), 0);
    const minutiConteggiati = filteredTurni.reduce((sum, t) => sum + (t.minuti_ritardo_conteggiato || 0), 0);
    const oreReali = (minutiReali / 60).toFixed(1);
    const oreConteggiate = (minutiConteggiati / 60).toFixed(1);
    const mediaMinutiReali = totalRitardi > 0 ? (minutiReali / totalRitardi).toFixed(1) : 0;
    const mediaMinutiConteggiati = totalRitardi > 0 ? (minutiConteggiati / totalRitardi).toFixed(1) : 0;
    const dipendentiConRitardi = new Set(filteredTurni.map(t => t.dipendente_id).filter(Boolean)).size;

    return {
      totalRitardi,
      minutiReali,
      minutiConteggiati,
      oreReali,
      oreConteggiate,
      mediaMinutiReali,
      mediaMinutiConteggiati,
      dipendentiConRitardi
    };
  }, [filteredTurni]);

  return (
    <ProtectedPage pageName="Ritardi">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Analisi Ritardi
            </h1>
            <p className="text-slate-500 mt-1">Monitoraggio ritardi per locale e dipendente</p>
          </div>
          <button
            onClick={handleRecalculateDelays}
            disabled={isRecalculating}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isRecalculating ? '⏳ Ricalcolo...' : '🔄 Ricalcola Ritardi'}
          </button>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Locale
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700 outline-none"
              >
                <option value="all">Tutti i locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Periodo
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700 outline-none"
              >
                <option value="30">Ultimi 30 giorni</option>
                <option value="month">Mese in corso</option>
                <option value="180">Ultimi 6 mesi</option>
                <option value="365">Ultimi 12 mesi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Vista
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-2 rounded-lg text-slate-700 outline-none"
              >
                <option value="store">Per Locale</option>
                <option value="dipendente">Per Dipendente</option>
              </select>
            </div>
          </div>
        </NeumorphicCard>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ritardi</p>
                <p className="text-2xl font-bold text-slate-700">{overallStats.totalRitardi}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-orange-100">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Min. Reali</p>
                <p className="text-2xl font-bold text-slate-700">{overallStats.minutiReali}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Min. Cont.</p>
                <p className="text-2xl font-bold text-slate-700">{overallStats.minutiConteggiati}</p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-purple-100">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Media Cont.</p>
                <p className="text-2xl font-bold text-slate-700">{overallStats.mediaMinutiConteggiati}<span className="text-sm">m</span></p>
              </div>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="neumorphic-flat p-3 rounded-xl bg-green-100">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Dipendenti</p>
                <p className="text-2xl font-bold text-slate-700">{overallStats.dipendentiConRitardi}</p>
              </div>
            </div>
          </NeumorphicCard>
        </div>

        {/* Trend Chart */}
        {trendData.length > 0 && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-700 mb-4">Trend Temporale Ritardi</h2>
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: '600px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(date) => format(parseISO(date), 'dd/MM')}
                    />
                    <YAxis 
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Ritardi', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(248, 250, 252, 0.95)', 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                      labelFormatter={(date) => format(parseISO(date), 'dd MMMM yyyy', { locale: it })}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="totalRitardi" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Ritardi"
                      dot={{ fill: '#ef4444', r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mediaMinutiReali" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Media Min. Reali"
                      dot={{ fill: '#f59e0b', r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mediaMinutiConteggiati" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Media Min. Cont."
                      dot={{ fill: '#8b5cf6', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </NeumorphicCard>
        )}

        {/* Stats per Store */}
        {viewMode === 'store' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-600" />
              Analisi per Locale
            </h2>
            
            {statsPerStore.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nessun ritardo registrato nel periodo selezionato
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-300">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Locale</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">N° Ritardi</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Min. Reali</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Min. Cont.</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Media Reale</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Media Cont.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsPerStore.map(stat => (
                        <tr key={stat.storeName} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-700 font-medium">{stat.storeName}</td>
                          <td className="py-3 px-4 text-sm text-red-600 text-right font-bold">{stat.totalRitardi}</td>
                          <td className="py-3 px-4 text-sm text-orange-600 text-right font-medium">{stat.minutiReali}</td>
                          <td className="py-3 px-4 text-sm text-amber-600 text-right font-medium">{stat.minutiConteggiati}</td>
                          <td className="py-3 px-4 text-sm text-blue-600 text-right font-bold">{stat.mediaMinutiReali}m</td>
                          <td className="py-3 px-4 text-sm text-purple-600 text-right font-bold">{stat.mediaMinutiConteggiati}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bar Chart */}
                <div className="mt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statsPerStore}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis 
                        dataKey="storeName" 
                        stroke="#64748b"
                        tick={{ fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#64748b"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Ritardi', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(248, 250, 252, 0.95)', 
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '11px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="totalRitardi" fill="#ef4444" name="Ritardi" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Stats per Dipendente */}
        {viewMode === 'dipendente' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              Analisi per Dipendente
            </h2>
            
            {statsPerDipendente.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nessun ritardo registrato nel periodo selezionato
              </div>
            ) : (
              <div className="space-y-4">
                {statsPerDipendente.map(stat => (
                  <div key={stat.dipendenteId} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-800">{stat.dipendenteNome}</h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm">
                          <span className="text-red-600 font-bold">
                            {stat.totalRitardi} ritardi
                          </span>
                          <span className="text-orange-600 font-medium">
                            Reali: {stat.minutiReali}m
                          </span>
                          <span className="text-amber-600 font-medium">
                            Cont.: {stat.minutiConteggiati}m
                          </span>
                          <span className="text-blue-600 font-bold">
                            Media Reale: {stat.mediaMinutiReali}m
                          </span>
                          <span className="text-purple-600 font-bold">
                            Media Cont.: {stat.mediaMinutiConteggiati}m
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown per store */}
                    {Object.keys(stat.turniPerStore).length > 1 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-600 mb-2">Dettaglio per locale:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.values(stat.turniPerStore).map(storeData => (
                            <div key={storeData.storeName} className="text-xs bg-slate-50 rounded-lg p-2">
                              <p className="font-medium text-slate-700">{storeData.storeName}</p>
                              <p className="text-slate-600">{storeData.count} ritardi</p>
                              <p className="text-orange-600">Reali: {storeData.minutiReali}m</p>
                              <p className="text-amber-600">Cont.: {storeData.minutiConteggiati}m</p>
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
        )}

        {/* Top 10 worst delays */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            I 10 Ritardi Più Lunghi
          </h2>
          
          {filteredTurni.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nessun ritardo registrato
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Data</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Dipendente</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Locale</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Ruolo</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Rit. Reale</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Rit. Cont.</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredTurni]
                    .sort((a, b) => (b.minuti_ritardo_conteggiato || 0) - (a.minuti_ritardo_conteggiato || 0))
                    .slice(0, 10)
                    .map(turno => {
                      const minutiReali = turno.minuti_ritardo_reale || 0;
                      const minutiConteggiati = turno.minuti_ritardo_conteggiato || 0;
                      const store = stores.find(s => s.id === turno.store_id);
                      
                      return (
                        <tr key={turno.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {format(parseISO(turno.data), 'dd/MM/yyyy', { locale: it })}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700 font-medium">
                            {turno.dipendente_nome || 'Sconosciuto'}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {store?.name || 'Sconosciuto'}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {turno.ruolo || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            <span className="font-bold text-orange-600">
                              {minutiReali}m
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            <span className="font-bold text-amber-600">
                              {minutiConteggiati}m
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}