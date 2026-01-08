import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Award,
  AlertCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Disponibilita() {
  const [timeRange, setTimeRange] = useState('month');

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

  return (
    <ProtectedPage pageName="Disponibilita">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">📊 Disponibilità Dipendenti</h1>
          <p className="text-[#9b9b9b]">Ore straordinario fatte vs potenziali per ogni dipendente</p>
        </div>

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
      </div>
    </ProtectedPage>
  );
}