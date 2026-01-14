import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { CheckCircle, XCircle, Users, Calendar, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import ProtectedPage from "../components/ProtectedPage";

export default function PulizieMatch() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date', 500),
  });

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.list(),
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 1000),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    let startDate;
    
    switch(selectedPeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date(0);
        break;
    }
    
    return { startDate, endDate: now };
  };

  // Match inspections to employees
  const matchedResults = useMemo(() => {
    const { startDate, endDate } = getDateRange();
    const results = {};

    // Filter inspections by period and store
    let filteredInspections = inspections.filter(insp => {
      const inspDate = new Date(insp.inspection_date);
      const storeMatch = selectedStore === 'all' || insp.store_id === selectedStore;
      const dateMatch = inspDate >= startDate && inspDate <= endDate;
      return storeMatch && dateMatch;
    });

    console.log('Processing', filteredInspections.length, 'inspections');
    
    filteredInspections.forEach(inspection => {
      console.log('Inspection:', inspection.id, 'Store:', inspection.store_name, 'Domande:', inspection.domande_risposte?.length);
      
      inspection.domande_risposte?.forEach(domanda => {
        console.log('Domanda:', domanda.attrezzatura, 'Tipo:', domanda.tipo_controllo);
        
        // Skip if no attrezzatura or if not a foto question
        if (!domanda.attrezzatura || domanda.tipo_controllo !== 'foto') return;

        // Find attrezzatura
        const attrezzatura = attrezzature.find(a => a.nome === domanda.attrezzatura);
        if (!attrezzatura || !attrezzatura.ruoli_responsabili || attrezzatura.ruoli_responsabili.length === 0) return;

        // Get the status from inspection fields
        const normalizeAttrezzatura = (name) => {
          const map = {
            'Forno': 'forno',
            'Impastatrice': 'impastatrice',
            'Tavolo da lavoro': 'tavolo_lavoro',
            'Frigo': 'frigo',
            'Cassa': 'cassa',
            'Lavandino': 'lavandino',
            'Tavolette Takeaway': 'tavolette_takeaway'
          };
          return map[name] || name?.toLowerCase().replace(/\s+/g, '_') || '';
        };

        const normalizedName = normalizeAttrezzatura(domanda.attrezzatura);
        const statusField = `${normalizedName}_pulizia_status`;
        const correctedField = `${normalizedName}_corrected_status`;
        const statoPulizia = inspection[correctedField] || inspection[statusField];

        if (!statoPulizia) return;

        // Process each responsible role
        attrezzatura.ruoli_responsabili.forEach(ruoloResponsabile => {
        const dataCompilazione = new Date(inspection.inspection_date);

        // Find last shift before inspection for this role and store
        const lastShift = turni
          .filter(t => 
            t.store_id === inspection.store_id &&
            t.ruolo === ruoloResponsabile &&
            t.dipendente_id &&
            new Date(t.data + 'T' + t.ora_fine) <= dataCompilazione
          )
          .sort((a, b) => {
            const dateA = new Date(a.data + 'T' + a.ora_fine);
            const dateB = new Date(b.data + 'T' + b.ora_fine);
            return dateB - dateA;
          })[0];

        if (!lastShift) return;

        const employeeId = lastShift.dipendente_id;
        const employeeName = lastShift.dipendente_nome;

        if (!results[employeeId]) {
          results[employeeId] = {
            id: employeeId,
            name: employeeName,
            puliti: 0,
            sporchi: 0,
            details: []
          };
        }

        const isPulito = statoPulizia === 'pulito';
        
        if (isPulito) {
          results[employeeId].puliti++;
        } else {
          results[employeeId].sporchi++;
        }

        results[employeeId].details.push({
          attrezzatura: domanda.attrezzatura,
          stato: statoPulizia,
          data_compilazione: inspection.inspection_date,
          store_name: inspection.store_name,
          ruolo: ruoloResponsabile,
          data_turno: lastShift.data,
          ora_fine_turno: lastShift.ora_fine
        });
        });
      });
    });

    return Object.values(results);
  }, [inspections, attrezzature, turni, selectedStore, selectedPeriod]);

  // Filter by selected employee
  const filteredResults = useMemo(() => {
    if (selectedEmployee === 'all') return matchedResults;
    return matchedResults.filter(r => r.id === selectedEmployee);
  }, [matchedResults, selectedEmployee]);

  // Sort by performance (worst first)
  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      const percentA = a.puliti + a.sporchi > 0 ? (a.puliti / (a.puliti + a.sporchi)) * 100 : 0;
      const percentB = b.puliti + b.sporchi > 0 ? (b.puliti / (b.puliti + b.sporchi)) * 100 : 0;
      return percentA - percentB;
    });
  }, [filteredResults]);

  // Overall stats
  const overallStats = useMemo(() => {
    const total = filteredResults.reduce((acc, r) => ({
      puliti: acc.puliti + r.puliti,
      sporchi: acc.sporchi + r.sporchi
    }), { puliti: 0, sporchi: 0 });

    const totalChecks = total.puliti + total.sporchi;
    const percentage = totalChecks > 0 ? (total.puliti / totalChecks) * 100 : 0;

    return { ...total, totalChecks, percentage };
  }, [filteredResults]);

  return (
    <ProtectedPage pageName="PulizieMatch">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">🎯 Match Pulizie</h1>
          <p className="text-[#9b9b9b]">Performance controlli pulizia per dipendente</p>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Locale
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="all">Tutti i Locali</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Periodo
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="week">Ultima Settimana</option>
                <option value="month">Ultimo Mese</option>
                <option value="3months">Ultimi 3 Mesi</option>
                <option value="all">Tutto il Periodo</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Users className="w-4 h-4" />
                Dipendente
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
              >
                <option value="all">Tutti i Dipendenti</option>
                {matchedResults.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
        </NeumorphicCard>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-6 text-center">
            <p className="text-sm text-[#9b9b9b] mb-1">Controlli Totali</p>
            <p className="text-3xl font-bold text-blue-600">{overallStats.totalChecks}</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <p className="text-sm text-[#9b9b9b] mb-1">Puliti</p>
            <p className="text-3xl font-bold text-green-600">{overallStats.puliti}</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <p className="text-sm text-[#9b9b9b] mb-1">Sporchi</p>
            <p className="text-3xl font-bold text-red-600">{overallStats.sporchi}</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <p className="text-sm text-[#9b9b9b] mb-1">% Successo</p>
            <p className="text-3xl font-bold text-purple-600">{overallStats.percentage.toFixed(1)}%</p>
          </NeumorphicCard>
        </div>

        {/* Employee Results */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">
            Performance Dipendenti ({sortedResults.length})
          </h2>

          {sortedResults.length === 0 ? (
            <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p>
          ) : (
            <div className="space-y-4">
              {sortedResults.map(employee => {
                const total = employee.puliti + employee.sporchi;
                const percentage = total > 0 ? (employee.puliti / total) * 100 : 0;
                const isGood = percentage >= 80;

                return (
                  <div key={employee.id} className="neumorphic-pressed p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isGood ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          <Users className={`w-6 h-6 ${isGood ? 'text-green-600' : 'text-orange-600'}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[#6b6b6b]">{employee.name}</h3>
                          <p className="text-sm text-[#9b9b9b]">{total} controlli totali</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          <span className="text-2xl font-bold text-[#6b6b6b]">{percentage.toFixed(1)}%</span>
                          {isGood ? (
                            <TrendingUp className="w-6 h-6 text-green-600" />
                          ) : (
                            <TrendingDown className="w-6 h-6 text-orange-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            {employee.puliti}
                          </span>
                          <span className="text-red-600 font-medium">
                            <XCircle className="w-4 h-4 inline mr-1" />
                            {employee.sporchi}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-3">
                      <div 
                        className={`h-full transition-all ${isGood ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Details */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                        Vedi dettagli ({employee.details.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {employee.details
                          .sort((a, b) => new Date(b.data_compilazione) - new Date(a.data_compilazione))
                          .map((detail, idx) => (
                          <div key={idx} className="neumorphic-flat p-3 rounded-lg text-sm">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-[#6b6b6b]">
                                  {detail.attrezzatura}
                                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    detail.stato === 'pulito' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {detail.stato}
                                  </span>
                                </p>
                                <p className="text-xs text-[#9b9b9b] mt-1">
                                  {detail.store_name} • {detail.ruolo}
                                </p>
                                <p className="text-xs text-[#9b9b9b]">
                                  Turno: {format(parseISO(detail.data_turno), 'dd/MM/yyyy', { locale: it })} fino alle {detail.ora_fine_turno}
                                </p>
                              </div>
                              <div className="text-right text-xs text-[#9b9b9b]">
                                Rilevato:<br/>
                                {format(parseISO(detail.data_compilazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}