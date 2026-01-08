import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Award,
  AlertCircle,
  DollarSign,
  Settings,
  X,
  CheckCircle,
  XCircle,
  Save
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Disponibilita() {
  const [activeTab, setActiveTab] = useState('disponibilita');
  const [timeRange, setTimeRange] = useState('month');
  const [showSettings, setShowSettings] = useState(false);
  const [retribuzioneOraria, setRetribuzioneOraria] = useState(10);

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list(),
  });

  const { data: accessiStore = [] } = useQuery({
    queryKey: ['accessi-store'],
    queryFn: () => base44.entities.AccessoStore.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: disponibilitaConfigs = [] } = useQuery({
    queryKey: ['disponibilita-config'],
    queryFn: () => base44.entities.DisponibilitaConfig.list(),
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (configData) => {
      const existing = await base44.entities.DisponibilitaConfig.list();
      for (const config of existing) {
        await base44.entities.DisponibilitaConfig.update(config.id, { is_active: false });
      }
      return base44.entities.DisponibilitaConfig.create({ ...configData, is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilita-config'] });
      setShowSettings(false);
    },
  });

  const updateTurnoMutation = useMutation({
    mutationFn: ({ turnoId, data }) => base44.entities.TurnoPlanday.update(turnoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-planday'] });
    },
  });

  React.useEffect(() => {
    const activeConfig = disponibilitaConfigs.find(c => c.is_active);
    if (activeConfig) {
      setRetribuzioneOraria(activeConfig.retribuzione_oraria_straordinari || 10);
    }
  }, [disponibilitaConfigs]);

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start, end;

    switch (timeRange) {
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case '2weeks':
        start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case '3months':
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        break;
      case '6months':
        start = startOfMonth(subMonths(now, 5));
        end = endOfMonth(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [timeRange]);

  // Filter turni by date range
  const filteredTurni = useMemo(() => {
    return turni.filter(t => t.data >= startDate && t.data <= endDate && t.tipo_turno === 'Straordinario');
  }, [turni, startDate, endDate]);

  // Calculate disponibilità for each employee
  const disponibilitaData = useMemo(() => {
    const dipendenti = users.filter(u => {
      const userType = u.user_type === 'user' ? 'dipendente' : u.user_type;
      return userType === 'dipendente' && u.ruoli_dipendente && u.ruoli_dipendente.length > 0;
    });

    return dipendenti.map(dipendente => {
      const ruoli = dipendente.ruoli_dipendente || [];
      
      // Find stores this employee has access to
      const storeIdsAssegnati = users
        .filter(u => u.id === dipendente.id && u.stores_assegnati)
        .flatMap(u => u.stores_assegnati || []);

      // Se non ci sono store assegnati esplicitamente, consideriamo tutti gli store
      const storesAbilitati = storeIdsAssegnati.length > 0 
        ? storeIdsAssegnati 
        : stores.map(s => s.id);

      // Calculate overtime hours done by this employee
      const oreStraordinarioFatte = filteredTurni
        .filter(t => t.dipendente_id === dipendente.id)
        .reduce((sum, t) => {
          if (!t.timbratura_entrata || !t.timbratura_uscita) return sum;
          const start = new Date(t.timbratura_entrata);
          const end = new Date(t.timbratura_uscita);
          const hours = (end - start) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);

      // Calculate potential overtime hours
      // Consider only straordinari done by this employee OR other employees with same role
      // in stores where this employee is enabled to work
      const oreStraordinarioPotenziali = filteredTurni
        .filter(t => {
          // Must be in an assigned store
          if (!storesAbilitati.includes(t.store_id)) return false;
          
          // Must be same role as employee
          return ruoli.includes(t.ruolo);
        })
        .reduce((sum, t) => {
          if (!t.timbratura_entrata || !t.timbratura_uscita) return sum;
          const start = new Date(t.timbratura_entrata);
          const end = new Date(t.timbratura_uscita);
          const hours = (end - start) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);

      const percentuale = oreStraordinarioPotenziali > 0 
        ? (oreStraordinarioFatte / oreStraordinarioPotenziali) * 100 
        : 0;

      return {
        dipendente,
        oreStraordinarioFatte,
        oreStraordinarioPotenziali,
        percentuale,
        ruoli,
        storesAbilitati
      };
    });
  }, [users, filteredTurni, stores]);

  const sortedData = [...disponibilitaData].sort((a, b) => b.percentuale - a.percentuale);

  // Straordinari data
  const straordinariData = useMemo(() => {
    return filteredTurni.map(turno => {
      if (!turno.timbratura_entrata || !turno.timbratura_uscita) {
        return null;
      }
      
      const start = new Date(turno.timbratura_entrata);
      const end = new Date(turno.timbratura_uscita);
      const ore = (end - start) / (1000 * 60 * 60);
      const retribuzione = ore * retribuzioneOraria;

      return {
        ...turno,
        ore,
        retribuzione,
        isPagato: turno.straordinario_pagato || false
      };
    }).filter(t => t !== null).sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [filteredTurni, retribuzioneOraria]);

  const straordinariStats = useMemo(() => {
    const totaleOre = straordinariData.reduce((sum, t) => sum + t.ore, 0);
    const totaleRetribuzione = straordinariData.reduce((sum, t) => sum + t.retribuzione, 0);
    const pagati = straordinariData.filter(t => t.isPagato).length;
    const daPagare = straordinariData.filter(t => !t.isPagato).length;
    const importoDaPagare = straordinariData.filter(t => !t.isPagato).reduce((sum, t) => sum + t.retribuzione, 0);

    return {
      totaleOre,
      totaleRetribuzione,
      totaleTurni: straordinariData.length,
      pagati,
      daPagare,
      importoDaPagare
    };
  }, [straordinariData]);

  const togglePagamento = (turnoId, currentStatus) => {
    updateTurnoMutation.mutate({
      turnoId,
      data: { straordinario_pagato: !currentStatus }
    });
  };

  const handleSaveSettings = () => {
    saveConfigMutation.mutate({
      retribuzione_oraria_straordinari: retribuzioneOraria
    });
  };

  return (
    <ProtectedPage pageName="Disponibilita">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📊 Disponibilità Dipendenti</h1>
          <p className="text-[#9b9b9b]">Ore straordinario fatte vs potenziali per ogni dipendente</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('disponibilita')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === 'disponibilita'
                ? 'neumorphic-pressed bg-blue-50 text-blue-700'
                : 'neumorphic-flat text-slate-600 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Disponibilità
          </button>
          <button
            onClick={() => setActiveTab('straordinari')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === 'straordinari'
                ? 'neumorphic-pressed bg-blue-50 text-blue-700'
                : 'neumorphic-flat text-slate-600 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Straordinari
          </button>
        </div>

        {activeTab === 'disponibilita' && (
          <>
        {/* Filters */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Periodo Temporale
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="week">Ultima Settimana</option>
                <option value="2weeks">Ultime 2 Settimane</option>
                <option value="month">Ultimo Mese</option>
                <option value="3months">Ultimi 3 Mesi</option>
                <option value="6months">Ultimi 6 Mesi</option>
              </select>
            </div>
            <div className="neumorphic-pressed p-4 rounded-xl flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-[#9b9b9b]">Periodo Selezionato</p>
                <p className="text-sm font-bold text-[#6b6b6b]">
                  {format(parseISO(startDate), 'dd MMM yyyy', { locale: it })} - {format(parseISO(endDate), 'dd MMM yyyy', { locale: it })}
                </p>
              </div>
            </div>
          </div>
        </NeumorphicCard>

        {/* Info Card */}
        <NeumorphicCard className="p-4 bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-bold mb-1">📌 Come funziona il calcolo</p>
              <p>
                Le ore potenziali sono calcolate considerando SOLO gli straordinari fatti dal dipendente stesso 
                o da altri dipendenti con lo stesso ruolo (Pizzaiolo/Cassiere) nei negozi in cui il dipendente 
                è abilitato a lavorare (in base ad Assegnazione Locali).
              </p>
            </div>
          </div>
        </NeumorphicCard>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NeumorphicCard className="p-6 text-center">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-[#9b9b9b] mb-1">Dipendenti Totali</p>
            <p className="text-3xl font-bold text-blue-600">{disponibilitaData.length}</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <Clock className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-sm text-[#9b9b9b] mb-1">Ore Straordinario Fatte</p>
            <p className="text-3xl font-bold text-green-600">
              {disponibilitaData.reduce((sum, d) => sum + d.oreStraordinarioFatte, 0).toFixed(1)}h
            </p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-[#9b9b9b] mb-1">Ore Straordinario Potenziali</p>
            <p className="text-3xl font-bold text-purple-600">
              {disponibilitaData.reduce((sum, d) => sum + d.oreStraordinarioPotenziali, 0).toFixed(1)}h
            </p>
          </NeumorphicCard>
        </div>

        {/* Employee List */}
        <div className="space-y-3">
          {sortedData.length === 0 ? (
            <NeumorphicCard className="p-12 text-center">
              <Users className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessun dipendente trovato</h3>
              <p className="text-[#9b9b9b]">Non ci sono dipendenti con ruoli assegnati</p>
            </NeumorphicCard>
          ) : (
            sortedData.map((data) => {
              const { dipendente, oreStraordinarioFatte, oreStraordinarioPotenziali, percentuale, ruoli, storesAbilitati } = data;
              const nome = dipendente.nome_cognome || dipendente.full_name || dipendente.email;

              return (
                <NeumorphicCard key={dipendente.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#6b6b6b]">{nome}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {ruoli.map(ruolo => (
                            <span
                              key={ruolo}
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                ruolo === 'Pizzaiolo' ? 'bg-orange-100 text-orange-700' :
                                ruolo === 'Cassiere' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {ruolo}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-[#9b9b9b] mt-2">
                          Negozi abilitati: {storesAbilitati.length === stores.length 
                            ? 'Tutti' 
                            : storesAbilitati.map(sid => stores.find(s => s.id === sid)?.name || 'N/A').join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-4xl font-bold ${
                        percentuale >= 80 ? 'text-green-600' :
                        percentuale >= 50 ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {percentuale.toFixed(0)}%
                      </div>
                      <p className="text-xs text-[#9b9b9b] mt-1">disponibilità</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          percentuale >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          percentuale >= 50 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                          'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                        style={{ width: `${Math.min(percentuale, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="neumorphic-pressed p-4 rounded-xl text-center">
                      <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-xs text-[#9b9b9b] mb-1">Ore Fatte</p>
                      <p className="text-2xl font-bold text-green-600">{oreStraordinarioFatte.toFixed(1)}h</p>
                    </div>

                    <div className="neumorphic-pressed p-4 rounded-xl text-center">
                      <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-xs text-[#9b9b9b] mb-1">Ore Potenziali</p>
                      <p className="text-2xl font-bold text-purple-600">{oreStraordinarioPotenziali.toFixed(1)}h</p>
                    </div>
                  </div>
                </NeumorphicCard>
              );
            })
          )}
        </div>
        </>
        )}

        {/* Straordinari Tab */}
        {activeTab === 'straordinari' && (
          <>
            {/* Filters */}
            <NeumorphicCard className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Periodo Temporale
                  </label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  >
                    <option value="week">Ultima Settimana</option>
                    <option value="2weeks">Ultime 2 Settimane</option>
                    <option value="month">Ultimo Mese</option>
                    <option value="3months">Ultimi 3 Mesi</option>
                    <option value="6months">Ultimi 6 Mesi</option>
                  </select>
                </div>
                <div className="neumorphic-pressed p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-[#9b9b9b]">Periodo Selezionato</p>
                      <p className="text-sm font-bold text-[#6b6b6b]">
                        {format(parseISO(startDate), 'dd MMM yyyy', { locale: it })} - {format(parseISO(endDate), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>
            </NeumorphicCard>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <NeumorphicCard className="p-6 text-center">
                <Clock className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <p className="text-xs text-[#9b9b9b] mb-1">Turni Totali</p>
                <p className="text-2xl font-bold text-blue-600">{straordinariStats.totaleTurni}</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <TrendingUp className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <p className="text-xs text-[#9b9b9b] mb-1">Ore Totali</p>
                <p className="text-2xl font-bold text-purple-600">{straordinariStats.totaleOre.toFixed(1)}h</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <DollarSign className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <p className="text-xs text-[#9b9b9b] mb-1">Totale €</p>
                <p className="text-2xl font-bold text-green-600">€{straordinariStats.totaleRetribuzione.toFixed(2)}</p>
              </NeumorphicCard>

              <NeumorphicCard className="p-6 text-center">
                <AlertCircle className="w-10 h-10 text-orange-600 mx-auto mb-3" />
                <p className="text-xs text-[#9b9b9b] mb-1">Da Pagare</p>
                <p className="text-2xl font-bold text-orange-600">€{straordinariStats.importoDaPagare.toFixed(2)}</p>
              </NeumorphicCard>
            </div>

            {/* Info Card */}
            <NeumorphicCard className="p-4 bg-blue-50">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-bold mb-1">💰 Retribuzione Straordinari</p>
                  <p>
                    Retribuzione oraria attuale: <strong>€{retribuzioneOraria.toFixed(2)}/h</strong> 
                    ({straordinariStats.pagati} pagati, {straordinariStats.daPagare} da pagare)
                  </p>
                </div>
              </div>
            </NeumorphicCard>

            {/* Turni List */}
            <NeumorphicCard className="p-6">
              <h2 className="text-lg font-bold text-[#6b6b6b] mb-4">Turni Straordinari</h2>
              
              {straordinariData.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun turno straordinario nel periodo selezionato</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {straordinariData.map(turno => {
                    const storeName = stores.find(s => s.id === turno.store_id)?.name || turno.store_nome || 'N/A';
                    
                    return (
                      <div
                        key={turno.id}
                        className={`neumorphic-pressed p-4 rounded-xl transition-all ${
                          turno.isPagato ? 'bg-green-50 border-2 border-green-200' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-slate-800">{turno.dipendente_nome}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                turno.ruolo === 'Pizzaiolo' ? 'bg-orange-100 text-orange-700' :
                                turno.ruolo === 'Cassiere' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {turno.ruolo}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(turno.data), 'dd MMM yyyy', { locale: it })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {turno.ora_inizio} - {turno.ora_fine}
                              </div>
                              <div className="flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                {storeName}
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {turno.ore.toFixed(2)}h lavorate
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-2">
                            <div>
                              <p className="text-2xl font-bold text-green-600">€{turno.retribuzione.toFixed(2)}</p>
                              <p className="text-xs text-slate-500">({retribuzioneOraria}€/h)</p>
                            </div>
                            <button
                              onClick={() => togglePagamento(turno.id, turno.isPagato)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                turno.isPagato
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-orange-500 text-white hover:bg-orange-600'
                              }`}
                            >
                              {turno.isPagato ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Pagato
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4" />
                                  Da Pagare
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </NeumorphicCard>
          </>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">Configurazione Straordinari</h2>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="p-2 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Retribuzione Oraria (€/h)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={retribuzioneOraria}
                    onChange={(e) => setRetribuzioneOraria(parseFloat(e.target.value) || 0)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Questa tariffa verrà applicata a tutti i turni straordinari
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 px-4 py-3 rounded-xl neumorphic-flat text-slate-700 font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salva
                  </button>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}