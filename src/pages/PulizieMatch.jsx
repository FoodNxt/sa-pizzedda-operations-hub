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
  const [sortBy, setSortBy] = useState('percentage');
  const [viewMode, setViewMode] = useState('list');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['cleaning-inspections'],
    queryFn: () => base44.entities.CleaningInspection.list('-inspection_date', 500)
  });

  const { data: domande = [] } = useQuery({
    queryKey: ['domande-pulizia'],
    queryFn: () => base44.entities.DomandaPulizia.list()
  });

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.list()
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 5000)
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    let startDate;

    switch (selectedPeriod) {
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
    let filteredInspections = inspections.filter((insp) => {
      const inspDate = new Date(insp.inspection_date);
      const storeMatch = selectedStore === 'all' || insp.store_id === selectedStore;
      const dateMatch = inspDate >= startDate && inspDate <= endDate;
      return storeMatch && dateMatch;
    });

    console.log('Processing', filteredInspections.length, 'inspections');
    console.log('Total attrezzature:', attrezzature.length);
    console.log('Total turni:', turni.length);

    filteredInspections.forEach((inspection) => {
      console.log('Inspection:', inspection.id, 'Store:', inspection.store_name, 'Date:', inspection.inspection_date, 'Domande:', inspection.domande_risposte?.length);

      inspection.domande_risposte?.forEach((domanda) => {
        console.log('Domanda:', domanda.domanda_testo, 'Tipo:', domanda.tipo_controllo);

        // Trova l'attrezzatura - per scelta multipla cerca nella domanda originale
        let nomeAttrezzatura = domanda.attrezzatura;

        if (!nomeAttrezzatura && domanda.tipo_controllo === 'scelta_multipla') {
          // Cerca la domanda originale per trovare l'attrezzatura
          const originalQuestion = domande.find((d) => d.id === domanda.domanda_id);
          nomeAttrezzatura = originalQuestion?.attrezzatura;

          // Se ancora non trovata, prova a estrarre dal testo
          if (!nomeAttrezzatura) {
            const domandaLower = domanda.domanda_testo?.toLowerCase() || '';
            for (const attr of attrezzature) {
              const attrLower = attr.nome.toLowerCase();
              if (domandaLower.includes(attrLower)) {
                nomeAttrezzatura = attr.nome;
                break;
              }
            }
          }
        }

        // Skip if no attrezzatura found
        if (!nomeAttrezzatura) {
          console.log('Skipped - no attrezzatura found');
          return;
        }

        // Find attrezzatura
        const attrezzatura = attrezzature.find((a) => a.nome === nomeAttrezzatura);
        console.log('Found attrezzatura:', attrezzatura?.nome, 'Ruoli:', attrezzatura?.ruoli_responsabili);

        if (!attrezzatura || !attrezzatura.ruoli_responsabili || attrezzatura.ruoli_responsabili.length === 0) {
          console.log('Skipped - no attrezzatura config or no ruoli');
          return;
        }

        // Determina lo stato in base al tipo di domanda
        let statoPulizia = null;

        if (domanda.tipo_controllo === 'foto') {
          // Per domande foto, usa i campi di stato nell'inspection
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

          const normalizedName = normalizeAttrezzatura(nomeAttrezzatura);
          const statusField = `${normalizedName}_pulizia_status`;
          const correctedField = `${normalizedName}_corrected_status`;
          statoPulizia = inspection[correctedField] || inspection[statusField];
        } else if (domanda.tipo_controllo === 'scelta_multipla') {
          // Per scelta multipla, verifica se la risposta è corretta
          const originalQuestion = domande.find((d) => d.id === domanda.domanda_id);
          const isCorrect = domanda.risposta?.toLowerCase() === originalQuestion?.risposta_corretta?.toLowerCase();
          statoPulizia = isCorrect ? 'pulito' : 'sporco';
        }

        console.log('Status:', statoPulizia);

        if (!statoPulizia) {
          console.log('Skipped - no status found');
          return;
        }

        // Process each responsible role
        attrezzatura.ruoli_responsabili.forEach((ruoloResponsabile) => {
          const dataCompilazione = new Date(inspection.inspection_date);

          console.log('🔍 Match per attrezzatura:', domanda.attrezzatura, 'Ruolo richiesto:', ruoloResponsabile, 'Store:', inspection.store_id, 'Data ispezione:', dataCompilazione);

          // Find all shifts for this role and store that ENDED BEFORE inspection time
          const candidateShifts = turni.filter((t) => {
            if (t.store_id !== inspection.store_id) return false;
            if (t.ruolo !== ruoloResponsabile) return false;
            if (!t.dipendente_nome) return false;
            if (!t.data || !t.ora_fine) return false;

            // Controlla che il turno sia finito prima della compilazione
            const shiftEndTime = t.timbratura_uscita ?
            new Date(t.timbratura_uscita) :
            new Date(t.data + 'T' + t.ora_fine);

            return shiftEndTime <= dataCompilazione;
          });

          console.log('✅ Turni candidati trovati:', candidateShifts.length);
          if (candidateShifts.length > 0) {
            console.log('Turni:', candidateShifts.map((t) => ({
              nome: t.dipendente_nome,
              data: t.data,
              inizio: t.ora_inizio,
              fine: t.ora_fine,
              timbratura_uscita: t.timbratura_uscita
            })));
          }

          // Ordina per ora di fine turno (più recente prima) - prendi l'ultimo turno finito prima dell'ispezione
          const lastShift = candidateShifts.sort((a, b) => {
            const endA = a.timbratura_uscita ? new Date(a.timbratura_uscita) : new Date(a.data + 'T' + a.ora_fine);
            const endB = b.timbratura_uscita ? new Date(b.timbratura_uscita) : new Date(b.data + 'T' + b.ora_fine);
            return endB - endA;
          })[0];

          if (!lastShift) {
            console.log('❌ Nessun turno trovato per ruolo:', ruoloResponsabile);
            return;
          }

          const oraFineTurno = lastShift.timbratura_uscita ?
          new Date(lastShift.timbratura_uscita).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) :
          lastShift.ora_fine;
          console.log('✅ Turno selezionato:', lastShift.dipendente_nome, 'Data:', lastShift.data, 'Finito alle:', oraFineTurno);

          const employeeName = lastShift.dipendente_nome;

          if (!results[employeeName]) {
            results[employeeName] = {
              id: employeeName,
              name: employeeName,
              puliti: 0,
              sporchi: 0,
              details: []
            };
          }

          const isPulito = statoPulizia === 'pulito';

          if (isPulito) {
            results[employeeName].puliti++;
          } else {
            results[employeeName].sporchi++;
          }

          results[employeeName].details.push({
            attrezzatura: domanda.attrezzatura,
            stato: statoPulizia,
            data_compilazione: inspection.inspection_date,
            store_name: inspection.store_name,
            ruolo: ruoloResponsabile,
            data_turno: lastShift.data,
            ora_fine_turno: oraFineTurno,
            compilato_da: inspection.inspector_name || 'N/A'
          });
        });
      });
    });

    return Object.values(results);
  }, [inspections, attrezzature, turni, selectedStore, selectedPeriod]);

  // Filter by selected employee
  const filteredResults = useMemo(() => {
    if (selectedEmployee === 'all') return matchedResults;
    return matchedResults.filter((r) => r.id === selectedEmployee);
  }, [matchedResults, selectedEmployee]);

  // Sort by performance based on selected sort option
  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      if (sortBy === 'percentage') {
        const percentA = a.puliti + a.sporchi > 0 ? a.puliti / (a.puliti + a.sporchi) * 100 : 0;
        const percentB = b.puliti + b.sporchi > 0 ? b.puliti / (b.puliti + b.sporchi) * 100 : 0;
        return percentA - percentB;
      } else {
        return b.sporchi - a.sporchi;
      }
    });
  }, [filteredResults, sortBy]);

  // Overall stats
  const overallStats = useMemo(() => {
    const total = filteredResults.reduce((acc, r) => ({
      puliti: acc.puliti + r.puliti,
      sporchi: acc.sporchi + r.sporchi
    }), { puliti: 0, sporchi: 0 });

    const totalChecks = total.puliti + total.sporchi;
    const percentage = totalChecks > 0 ? total.puliti / totalChecks * 100 : 0;

    return { ...total, totalChecks, percentage };
  }, [filteredResults]);

  return (
    <ProtectedPage pageName="PulizieMatch">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold" style={{ color: '#000000' }}>🎯 Match Pulizie</h1>
          <p style={{ color: '#000000' }}>Performance controlli pulizia per dipendente</p>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Locale
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none">

                <option value="all">Tutti i Locali</option>
                {stores.map((store) =>
                <option key={store.id} value={store.id}>{store.name}</option>
                )}
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
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none">

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
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none">

                <option value="all">Tutti i Dipendenti</option>
                {matchedResults.map((r) =>
                <option key={r.id} value={r.id}>{r.name}</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#6b6b6b] mb-2 block flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Ordina per
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none">

                <option value="percentage">% Successo (basso)</option>
                <option value="errors">Errori (alto)</option>
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

        {/* Repeated Failures Summary */}
        {(() => {
          const allFailures = {};
          sortedResults.forEach(employee => {
            employee.details.filter(d => d.stato === 'sporco').forEach(detail => {
              const key = `${employee.name}|${detail.attrezzatura}`;
              if (!allFailures[key]) {
                allFailures[key] = {
                  employeeName: employee.name,
                  attrezzatura: detail.attrezzatura,
                  count: 0,
                  details: []
                };
              }
              allFailures[key].count++;
              allFailures[key].details.push(detail);
            });
          });
          
          const repeatedFailures = Object.values(allFailures).filter(f => f.count > 1);
          
          if (repeatedFailures.length > 0) {
            return (
              <NeumorphicCard className="p-6 bg-red-50 border-2 border-red-300">
                <h2 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                  ⚠️ Controlli Falliti Ripetutamente
                </h2>
                <div className="space-y-3">
                  {repeatedFailures.sort((a, b) => b.count - a.count).map((failure, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 border-l-4 border-red-500">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-[#6b6b6b]">{failure.employeeName}</p>
                          <p className="text-sm text-[#9b9b9b]">{failure.attrezzatura}</p>
                        </div>
                        <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                          {failure.count}x fallito
                        </span>
                      </div>
                      <div className="text-xs text-[#9b9b9b] space-y-1">
                        {failure.details.map((detail, detailIdx) => (
                          <div key={detailIdx}>
                            • {detail.store_name} - {format(parseISO(detail.data_compilazione), 'dd/MM/yyyy', { locale: it })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </NeumorphicCard>
            );
          }
          return null;
        })()}

        {/* Employee Results */}
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#6b6b6b]">
              Score Pulizia ({sortedResults.length})
            </h2>
            {selectedEmployee !== 'all' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-200 text-[#6b6b6b] hover:bg-slate-300'
                  }`}
                >
                  Lista
                </button>
                <button
                  onClick={() => setViewMode('detail')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'detail' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-200 text-[#6b6b6b] hover:bg-slate-300'
                  }`}
                >
                  Dettaglio
                </button>
              </div>
            )}
          </div>

          {sortedResults.length === 0 ?
          <p className="text-center text-[#9b9b9b] py-8">Nessun dato disponibile</p> :

          viewMode === 'detail' && selectedEmployee !== 'all' ? (
            <div className="space-y-4">
              {sortedResults.map((employee) => {
                const failedDetails = employee.details.filter(d => d.stato === 'sporco');
                if (failedDetails.length === 0) {
                  return (
                    <div key={employee.id} className="neumorphic-pressed p-5 rounded-xl text-center">
                      <p className="text-green-600 font-medium">✓ Nessun controllo non passato</p>
                    </div>
                  );
                }
                
                // Group failed details by equipment and count occurrences
                const groupedByEquipment = {};
                failedDetails.forEach(detail => {
                  if (!groupedByEquipment[detail.attrezzatura]) {
                    groupedByEquipment[detail.attrezzatura] = [];
                  }
                  groupedByEquipment[detail.attrezzatura].push(detail);
                });
                
                return (
                  <div key={employee.id} className="space-y-3">
                    <h3 className="font-bold text-[#6b6b6b] text-lg">{employee.name} - Controlli Non Passati ({failedDetails.length})</h3>
                    {Object.entries(groupedByEquipment).map(([equipment, details]) => (
                      <div key={equipment} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#6b6b6b]">{equipment}</p>
                          {details.length > 1 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              {details.length}x non passato
                            </span>
                          )}
                        </div>
                        {details.map((detail, idx) => (
                          <div key={idx} className="neumorphic-pressed p-4 rounded-xl border-l-4 border-red-500 ml-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs text-[#9b9b9b]">{detail.store_name} • {detail.ruolo}</p>
                                <p className="text-xs text-[#9b9b9b]">Turno: {format(parseISO(detail.data_turno), 'dd/MM/yyyy', { locale: it })} fino alle {detail.ora_fine_turno}</p>
                                <p className="text-xs text-[#9b9b9b]">Rilevato da: <span className="font-medium">{detail.compilato_da}</span></p>
                              </div>
                              <div className="text-right text-xs">
                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Non passato</span>
                                <p className="text-[#9b9b9b] mt-2">{format(parseISO(detail.data_compilazione), 'dd/MM/yyyy HH:mm', { locale: it })}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
          <div className="space-y-4">
              {sortedResults.map((employee) => {
              const total = employee.puliti + employee.sporchi;
              const percentage = total > 0 ? employee.puliti / total * 100 : 0;
              const isGood = percentage >= 80;

              return (
                <div key={employee.id} className="neumorphic-pressed p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isGood ? 'bg-green-100' : 'bg-orange-100'}`
                      }>
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
                          {isGood ?
                        <TrendingUp className="w-6 h-6 text-green-600" /> :

                        <TrendingDown className="w-6 h-6 text-orange-600" />
                        }
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
                      style={{ width: `${percentage}%` }} />

                    </div>

                    {/* Details */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                        Vedi dettagli ({employee.details.length})
                      </summary>
                      <div className="mt-3 space-y-3">
                        {/* Controlli Non Passati Multipli */}
                        {(() => {
                          const failedDetails = employee.details.filter(d => d.stato === 'sporco');
                          const groupedFailed = {};
                          failedDetails.forEach(detail => {
                            if (!groupedFailed[detail.attrezzatura]) {
                              groupedFailed[detail.attrezzatura] = [];
                            }
                            groupedFailed[detail.attrezzatura].push(detail);
                          });
                          const multipleFailures = Object.entries(groupedFailed).filter(([_, details]) => details.length > 1);
                          
                          if (multipleFailures.length > 0) {
                            return (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                                <p className="text-sm font-bold text-red-700 mb-2">⚠️ Controlli Falliti Ripetutamente</p>
                                {multipleFailures.map(([equipment, details]) => (
                                  <div key={equipment} className="text-xs text-red-600 mb-1">
                                    <span className="font-medium">{equipment}</span>: fallito {details.length} volte
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Tutti i Dettagli */}
                        {employee.details
                          .sort((a, b) => new Date(b.data_compilazione) - new Date(a.data_compilazione))
                          .map((detail, idx) => (
                            <div key={idx} className="neumorphic-flat p-3 rounded-lg text-sm">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-[#6b6b6b]">
                                    {detail.attrezzatura}
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                      detail.stato === 'pulito' ?
                                      'bg-green-100 text-green-700' :
                                      'bg-red-100 text-red-700'
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
                                  <p className="text-xs text-[#9b9b9b]">
                                    Rilevato da: <span className="font-medium text-slate-700">{detail.compilato_da}</span>
                                  </p>
                                </div>
                                <div className="text-right text-xs text-[#9b9b9b]">
                                  Rilevato:<br />
                                  {format(parseISO(detail.data_compilazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </details>
                  </div>);

            })}
            </div>
            )}
            </NeumorphicCard>
            </div>
            </ProtectedPage>);

}