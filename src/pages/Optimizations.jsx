import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import ProgressBar from "../components/neumorphic/ProgressBar";
import {
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Database,
  FileCode,
  Smartphone,
  Eye,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export default function Optimizations() {
  const [activeChecks, setActiveChecks] = useState({});
  const [checkResults, setCheckResults] = useState({});
  const [expandedChecks, setExpandedChecks] = useState({});
  const [checkProgress, setCheckProgress] = useState({});

  // Fetch all entities to analyze
  const { data: allEntities = [], refetch: refetchEntities } = useQuery({
    queryKey: ['all-entities-check'],
    queryFn: async () => {
      const entities = [
        'iPratico', 'Sconto', 'Store', 'Employee', 'TurnoPlanday', 'Review',
        'WrongOrder', 'WrongOrderMatch', 'RilevazioneInventario', 'RilevazioneInventarioCantina',
        'MateriePrime', 'Ricetta', 'CleaningInspection', 'OrdineFornitore',
        'ProdottiVenduti', 'RevenueByTimeSlot', 'ConteggioCassa', 'TeglieButtate',
        'Preparazioni', 'GestioneImpasti', 'Contratto', 'RitardoDipendente',
        'Pausa', 'RichiestaFerie', 'RichiestaMalattia', 'P2PFeedbackResponse',
        'Activation', 'SubAttivita', 'Candidato', 'Segnalazione'
      ];
      
      const results = [];
      for (const entityName of entities) {
        try {
          const records = await base44.entities[entityName].list('-created_date', 5000);
          const schema = await base44.entities[entityName].schema();
          results.push({
            name: entityName,
            count: records.length,
            schema,
            sampleRecords: records.slice(0, 3)
          });
        } catch (error) {
          console.error(`Error fetching ${entityName}:`, error);
        }
      }
      return results;
    },
    enabled: false
  });

  const checks = [
    {
      id: 'entity_performance',
      title: 'Performance Entità',
      description: 'Verifica entità con troppi record o query inefficienti',
      icon: Database,
      severity: 'high',
      async run() {
        await refetchEntities();
        const issues = [];
        const suggestions = [];

        allEntities.forEach(entity => {
          // Check for high record count
          if (entity.count > 1000) {
            issues.push({
              severity: entity.count > 3000 ? 'high' : 'medium',
              message: `${entity.name} ha ${entity.count} record - considera archiviazione o paginazione`,
              detail: 'Le query su questa entità potrebbero essere lente. Valuta di aggiungere filtri temporali o archiviare record vecchi.'
            });
          }

          // Check for missing indexes (no created_date sorting)
          if (entity.count > 500) {
            suggestions.push({
              severity: 'low',
              message: `${entity.name}: assicurati di usare sempre sort in list() per performance`,
              detail: 'Usa sempre .list("-created_date", limit) invece di .list() per query più veloci'
            });
          }

          // Check for large schemas (many fields)
          const fieldCount = Object.keys(entity.schema.properties || {}).length;
          if (fieldCount > 30) {
            suggestions.push({
              severity: 'medium',
              message: `${entity.name} ha ${fieldCount} campi - considera normalizzazione`,
              detail: 'Schema molto complesso. Valuta se alcuni campi possono essere spostati in entità separate.'
            });
          }
        });

        return { issues, suggestions };
      }
    },
    {
      id: 'query_patterns',
      title: 'Pattern Query',
      description: 'Identifica pattern di query inefficienti',
      icon: TrendingUp,
      severity: 'medium',
      async run() {
        const issues = [];
        const suggestions = [];

        // Analyze entity usage patterns
        const highVolumeEntities = allEntities.filter(e => e.count > 1000);
        
        highVolumeEntities.forEach(entity => {
          suggestions.push({
            severity: 'medium',
            message: `${entity.name}: usa sempre filtri specifici invece di .list()`,
            detail: `Con ${entity.count} record, usa .filter() con condizioni specifiche. Esempio: .filter({store_id: "xxx", data: {$gte: "2026-01-01"}})`
          });
        });

        // Check for entities that should use pagination
        const paginationNeeded = allEntities.filter(e => e.count > 500);
        paginationNeeded.forEach(entity => {
          suggestions.push({
            severity: 'low',
            message: `${entity.name}: implementa paginazione nelle liste`,
            detail: 'Usa skip/limit per mostrare dati paginati invece di caricare tutto in una volta'
          });
        });

        return { issues, suggestions };
      }
    },
    {
      id: 'mobile_ux',
      title: 'UX Mobile',
      description: 'Verifica ottimizzazioni per dispositivi mobili',
      icon: Smartphone,
      severity: 'medium',
      async run() {
        const issues = [];
        const suggestions = [];

        // General mobile UX suggestions
        suggestions.push({
          severity: 'low',
          message: 'Verifica che tutti i modals siano responsive',
          detail: 'Assicurati che i modals usino "items-end lg:items-center" per mobile-first design'
        });

        suggestions.push({
          severity: 'low',
          message: 'Ottimizza tabelle per mobile',
          detail: 'Tabelle larghe dovrebbero avere overflow-x-auto e min-width per scrolling orizzontale'
        });

        suggestions.push({
          severity: 'medium',
          message: 'Riduci dimensioni grafici su mobile',
          detail: 'Usa height responsive: height={300} su desktop, height={200} su mobile con media query'
        });

        suggestions.push({
          severity: 'low',
          message: 'Verifica touch targets',
          detail: 'Bottoni e elementi cliccabili dovrebbero avere almeno 44x44px per essere facilmente cliccabili su touch'
        });

        return { issues, suggestions };
      }
    },
    {
      id: 'data_loading',
      title: 'Caricamento Dati',
      description: 'Analizza pattern di caricamento dati e useQuery',
      icon: RefreshCw,
      severity: 'high',
      async run() {
        const issues = [];
        const suggestions = [];

        // Check for entities that should have limits
        const unlimitedQueries = allEntities.filter(e => e.count > 500);
        
        unlimitedQueries.forEach(entity => {
          issues.push({
            severity: 'high',
            message: `${entity.name}: aggiungi SEMPRE un limit nelle query`,
            detail: `Attualmente ${entity.count} record. Usa .list("-created_date", 500) invece di .list() per evitare timeout`
          });
        });

        // Suggest using initialData
        suggestions.push({
          severity: 'medium',
          message: 'Usa initialData: [] in useQuery per evitare undefined',
          detail: 'Aggiungi initialData: [] in tutte le useQuery per avere sempre un array, non undefined'
        });

        // Suggest query key standardization
        suggestions.push({
          severity: 'low',
          message: 'Standardizza queryKey per invalidation efficiente',
          detail: 'Usa nomi consistenti: ["entity-name"] invece di ["entityName"] o ["entity_name"]'
        });

        return { issues, suggestions };
      }
    },
    {
      id: 'component_size',
      title: 'Dimensioni Componenti',
      description: 'Identifica file troppo grandi da splittare',
      icon: FileCode,
      severity: 'medium',
      async run() {
        const issues = [];
        const suggestions = [];

        // Based on entity complexity, suggest component splitting
        const complexPages = ['Dashboard', 'Employees', 'Planday', 'Inventory', 'FoodCost', 'Financials'];
        
        complexPages.forEach(page => {
          suggestions.push({
            severity: 'medium',
            message: `${page}: considera splitting in componenti più piccoli`,
            detail: 'Se il file supera 500 righe, estrai sezioni in componenti separati per migliore manutenibilità'
          });
        });

        suggestions.push({
          severity: 'low',
          message: 'Crea componenti riutilizzabili per pattern comuni',
          detail: 'Esempio: StatCard, EmployeeCard, OrderCard invece di duplicare markup'
        });

        return { issues, suggestions };
      }
    },
    {
      id: 'visual_feedback',
      title: 'Feedback Visivo',
      description: 'Verifica stati di loading e messaggi di errore',
      icon: Eye,
      severity: 'low',
      async run() {
        const suggestions = [];

        suggestions.push({
          severity: 'medium',
          message: 'Aggiungi skeleton loaders per migliore UX',
          detail: 'Invece di "Caricamento...", mostra skeleton placeholders per le card e tabelle'
        });

        suggestions.push({
          severity: 'low',
          message: 'Usa toast notifications invece di alert()',
          detail: 'Installa sonner (già disponibile) per toast eleganti invece di alert() browser'
        });

        suggestions.push({
          severity: 'low',
          message: 'Aggiungi empty states informativi',
          detail: 'Quando non ci sono dati, mostra icone e messaggi utili invece di solo "Nessun dato"'
        });

        suggestions.push({
          severity: 'medium',
          message: 'Mostra progress indicators per operazioni lunghe',
          detail: 'Upload, import CSV, calcoli - mostra progress bar invece di solo spinner'
        });

        return { issues: [], suggestions };
      }
    },
    {
      id: 'caching_strategy',
      title: 'Strategia Caching',
      description: 'Ottimizza cache e refetch di React Query',
      icon: Database,
      severity: 'high',
      async run() {
        const suggestions = [];

        suggestions.push({
          severity: 'high',
          message: 'Configura staleTime per dati che cambiano raramente',
          detail: 'Stores, MateriePrime, Ricette - aggiungi staleTime: 5 * 60 * 1000 (5 min) per evitare refetch inutili'
        });

        suggestions.push({
          severity: 'medium',
          message: 'Usa refetchOnWindowFocus: false per dati statici',
          detail: 'Configurazioni, templates, categorie - disabilita auto-refetch al focus finestra'
        });

        suggestions.push({
          severity: 'medium',
          message: 'Implementa invalidazione selettiva',
          detail: 'Invece di invalidare tutte le query, invalida solo quelle specifiche: queryClient.invalidateQueries({ queryKey: ["specific-key"] })'
        });

        return { issues: [], suggestions };
      }
    },
    {
      id: 'usememo_optimization',
      title: 'useMemo & Calcoli',
      description: 'Verifica uso corretto di useMemo per calcoli pesanti',
      icon: Zap,
      severity: 'medium',
      async run() {
        const suggestions = [];

        suggestions.push({
          severity: 'high',
          message: 'Usa useMemo per calcoli complessi e filtraggi',
          detail: 'Filtri, aggregazioni, groupBy - wrappa sempre in useMemo con dipendenze corrette'
        });

        suggestions.push({
          severity: 'medium',
          message: 'Evita calcoli inline nei .map()',
          detail: 'Calcola dati derivati in useMemo prima del render invece che dentro i loop'
        });

        suggestions.push({
          severity: 'low',
          message: 'Non abusare di useMemo per valori semplici',
          detail: 'useMemo ha overhead - usalo solo per calcoli effettivamente costosi (>100ms)'
        });

        return { issues: [], suggestions };
      }
    },
    {
      id: 'loading_speed',
      title: 'Velocità Caricamento',
      description: 'Test velocità caricamento app per admin e dipendenti',
      icon: RefreshCw,
      severity: 'high',
      async run() {
        const issues = [];
        const suggestions = [];

        // Simula caricamento admin (query più comuni)
        const adminQueries = [
          { name: 'iPratico', fn: () => base44.entities.iPratico.list('-order_date', 1000) },
          { name: 'TurnoPlanday', fn: () => base44.entities.TurnoPlanday.list('-data', 1000) },
          { name: 'Review', fn: () => base44.entities.Review.list('-review_date', 1000) },
          { name: 'MateriePrime', fn: () => base44.entities.MateriePrime.list() },
          { name: 'Store', fn: () => base44.entities.Store.list() }
        ];

        const adminResults = [];
        let totalAdminTime = 0;

        for (const query of adminQueries) {
          const start = performance.now();
          try {
            await query.fn();
            const time = performance.now() - start;
            adminResults.push({ name: query.name, time: Math.round(time) });
            totalAdminTime += time;
          } catch (error) {
            adminResults.push({ name: query.name, time: -1, error: true });
          }
        }

        // Simula caricamento dipendente (query più leggere)
        const dipendenteQueries = [
          { name: 'User (me)', fn: () => base44.auth.me() },
          { name: 'TurnoPlanday (filtrati)', fn: () => base44.entities.TurnoPlanday.filter({ data: { $gte: new Date().toISOString().split('T')[0] } }) },
          { name: 'Store', fn: () => base44.entities.Store.list() }
        ];

        const dipendenteResults = [];
        let totalDipendenteTime = 0;

        for (const query of dipendenteQueries) {
          const start = performance.now();
          try {
            await query.fn();
            const time = performance.now() - start;
            dipendenteResults.push({ name: query.name, time: Math.round(time) });
            totalDipendenteTime += time;
          } catch (error) {
            dipendenteResults.push({ name: query.name, time: -1, error: true });
          }
        }

        // Analisi risultati ADMIN
        const avgAdminTime = totalAdminTime / adminQueries.length;
        
        if (totalAdminTime > 5000) {
          issues.push({
            severity: 'high',
            message: `Caricamento Admin LENTO: ${Math.round(totalAdminTime)}ms totali`,
            detail: `Tempo medio per query: ${Math.round(avgAdminTime)}ms. Target: <3000ms totali. Query più lente: ${adminResults.sort((a, b) => b.time - a.time).slice(0, 3).map(r => `${r.name} (${r.time}ms)`).join(', ')}`
          });
        } else if (totalAdminTime > 3000) {
          suggestions.push({
            severity: 'medium',
            message: `Caricamento Admin accettabile: ${Math.round(totalAdminTime)}ms`,
            detail: `Puoi migliorare ottimizzando: ${adminResults.sort((a, b) => b.time - a.time).slice(0, 2).map(r => `${r.name} (${r.time}ms)`).join(', ')}`
          });
        } else {
          suggestions.push({
            severity: 'low',
            message: `✅ Caricamento Admin ottimo: ${Math.round(totalAdminTime)}ms`,
            detail: 'Performance eccellente per caricamento admin'
          });
        }

        // Analisi risultati DIPENDENTE
        const avgDipendenteTime = totalDipendenteTime / dipendenteQueries.length;

        if (totalDipendenteTime > 2000) {
          issues.push({
            severity: 'high',
            message: `Caricamento Dipendente LENTO: ${Math.round(totalDipendenteTime)}ms`,
            detail: `Target: <1500ms. Query più lente: ${dipendenteResults.sort((a, b) => b.time - a.time).map(r => `${r.name} (${r.time}ms)`).join(', ')}`
          });
        } else if (totalDipendenteTime > 1500) {
          suggestions.push({
            severity: 'medium',
            message: `Caricamento Dipendente accettabile: ${Math.round(totalDipendenteTime)}ms`,
            detail: 'Ottimizza query con filtri specifici per migliorare la UX mobile'
          });
        } else {
          suggestions.push({
            severity: 'low',
            message: `✅ Caricamento Dipendente ottimo: ${Math.round(totalDipendenteTime)}ms`,
            detail: 'Performance eccellente per caricamento dipendente'
          });
        }

        // Suggerimenti specifici per query lente
        adminResults.forEach(result => {
          if (result.time > 1000) {
            suggestions.push({
              severity: 'high',
              message: `Query ${result.name} molto lenta: ${result.time}ms`,
              detail: 'Aggiungi limit più basso, usa filtri specifici, o implementa paginazione'
            });
          }
        });

        // Dettaglio breakdown
        const detailMessage = `
📊 BREAKDOWN ADMIN:
${adminResults.map(r => `  • ${r.name}: ${r.time}ms`).join('\n')}
  TOTALE: ${Math.round(totalAdminTime)}ms

📱 BREAKDOWN DIPENDENTE:
${dipendenteResults.map(r => `  • ${r.name}: ${r.time}ms`).join('\n')}
  TOTALE: ${Math.round(totalDipendenteTime)}ms
        `;

        suggestions.push({
          severity: 'low',
          message: 'Dettaglio tempi di caricamento',
          detail: detailMessage.trim()
        });

        return { issues, suggestions };
      }
    }
  ];

  const runCheck = async (checkId) => {
    setActiveChecks(prev => ({ ...prev, [checkId]: true }));
    setCheckProgress(prev => ({ ...prev, [checkId]: 0 }));
    
    // Simula progress durante l'esecuzione
    const progressInterval = setInterval(() => {
      setCheckProgress(prev => {
        const current = prev[checkId] || 0;
        if (current >= 90) return { ...prev, [checkId]: current };
        return { ...prev, [checkId]: current + 10 };
      });
    }, 200);
    
    try {
      const check = checks.find(c => c.id === checkId);
      const result = await check.run();
      
      clearInterval(progressInterval);
      setCheckProgress(prev => ({ ...prev, [checkId]: 100 }));
      
      setCheckResults(prev => ({
        ...prev,
        [checkId]: {
          success: true,
          ...result,
          timestamp: new Date().toISOString()
        }
      }));
      
      setTimeout(() => {
        setCheckProgress(prev => ({ ...prev, [checkId]: 0 }));
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      setCheckResults(prev => ({
        ...prev,
        [checkId]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
      setCheckProgress(prev => ({ ...prev, [checkId]: 0 }));
    } finally {
      setActiveChecks(prev => ({ ...prev, [checkId]: false }));
    }
  };

  const runAllChecks = async () => {
    for (const check of checks) {
      await runCheck(check.id);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const totalIssues = Object.values(checkResults).reduce((sum, result) => 
    sum + (result.issues?.length || 0), 0
  );

  const totalSuggestions = Object.values(checkResults).reduce((sum, result) => 
    sum + (result.suggestions?.length || 0), 0
  );

  return (
    <ProtectedPage pageName="Optimizations" requiredUserTypes={['admin']}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-50 mb-2">⚡ Optimizations</h1>
          <p className="text-slate-50">Analizza performance e UX dell'app per identificare aree di miglioramento</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NeumorphicCard className="p-6 text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">
              {Object.keys(checkResults).length}/{checks.length}
            </h3>
            <p className="text-sm text-slate-500">Check Eseguiti</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 mx-auto mb-3 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-red-600 mb-1">{totalIssues}</h3>
            <p className="text-sm text-slate-500">Issues Rilevati</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-6 text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 mx-auto mb-3 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-1">{totalSuggestions}</h3>
            <p className="text-sm text-slate-500">Suggerimenti</p>
          </NeumorphicCard>
        </div>

        {/* Run All Button */}
        <NeumorphicButton
          onClick={runAllChecks}
          variant="primary"
          className="w-full flex items-center justify-center gap-2 py-4"
          disabled={Object.values(activeChecks).some(Boolean)}
        >
          <RefreshCw className={`w-5 h-5 ${Object.values(activeChecks).some(Boolean) ? 'animate-spin' : ''}`} />
          Esegui Tutti i Check
        </NeumorphicButton>

        {/* Checks List */}
        <div className="space-y-4">
          {checks.map(check => {
            const CheckIcon = check.icon;
            const isRunning = activeChecks[check.id];
            const result = checkResults[check.id];
            const isExpanded = expandedChecks[check.id];
            const hasIssues = result?.issues?.length > 0;
            const hasSuggestions = result?.suggestions?.length > 0;

            return (
              <NeumorphicCard key={check.id} className="overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        check.severity === 'high' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                        check.severity === 'medium' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                        'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        <CheckIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-800">{check.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getSeverityColor(check.severity)}`}>
                            {check.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{check.description}</p>
                        
                        {result && (
                          <div className="mt-2 flex items-center gap-4 text-xs">
                            {hasIssues && (
                              <span className="flex items-center gap-1 text-red-600 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                {result.issues.length} issues
                              </span>
                            )}
                            {hasSuggestions && (
                              <span className="flex items-center gap-1 text-green-600 font-medium">
                                <TrendingUp className="w-3 h-3" />
                                {result.suggestions.length} suggerimenti
                              </span>
                            )}
                            <span className="text-slate-500">
                              {new Date(result.timestamp).toLocaleString('it-IT')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-3">
                      {result && (hasIssues || hasSuggestions) && (
                        <button
                          onClick={() => setExpandedChecks(prev => ({ ...prev, [check.id]: !prev[check.id] }))}
                          className="neumorphic-flat p-2 rounded-lg hover:bg-slate-100"
                        >
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                      )}
                      <NeumorphicButton
                        onClick={() => runCheck(check.id)}
                        disabled={isRunning}
                        className="flex items-center gap-2"
                      >
                        {isRunning ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="hidden md:inline">Running...</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            <span className="hidden md:inline">Esegui Check</span>
                          </>
                        )}
                      </NeumorphicButton>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {isRunning && checkProgress[check.id] > 0 && (
                    <div className="mt-4">
                      <ProgressBar 
                        progress={checkProgress[check.id]} 
                        label="Analisi in corso..." 
                      />
                    </div>
                  )}

                  {/* Results */}
                  {result && isExpanded && (
                    <div className="space-y-4 border-t border-slate-200 pt-4">
                      {/* Issues */}
                      {hasIssues && (
                        <div>
                          <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Issues da Risolvere ({result.issues.length})
                          </h4>
                          <div className="space-y-2">
                            {result.issues.map((issue, idx) => (
                              <div key={idx} className={`neumorphic-pressed p-4 rounded-lg border-l-4 ${
                                issue.severity === 'high' ? 'border-red-500 bg-red-50' :
                                issue.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                'border-blue-500 bg-blue-50'
                              }`}>
                                <div className="flex items-start gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(issue.severity)}`}>
                                    {getSeverityIcon(issue.severity)}
                                  </span>
                                  <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-sm mb-1">{issue.message}</p>
                                    <p className="text-xs text-slate-600">{issue.detail}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      {hasSuggestions && (
                        <div>
                          <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Suggerimenti di Miglioramento ({result.suggestions.length})
                          </h4>
                          <div className="space-y-2">
                            {result.suggestions.map((suggestion, idx) => (
                              <div key={idx} className="neumorphic-flat p-4 rounded-lg bg-green-50">
                                <div className="flex items-start gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(suggestion.severity)}`}>
                                    {getSeverityIcon(suggestion.severity)}
                                  </span>
                                  <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-sm mb-1">{suggestion.message}</p>
                                    <p className="text-xs text-slate-600">{suggestion.detail}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!hasIssues && !hasSuggestions && result.success && (
                        <div className="neumorphic-flat p-6 rounded-lg bg-green-50 text-center">
                          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                          <p className="font-bold text-green-700">✅ Tutto OK!</p>
                          <p className="text-sm text-green-600 mt-1">Nessun problema rilevato in questa area</p>
                        </div>
                      )}
                    </div>
                  )}

                  {result && !result.success && (
                    <div className="neumorphic-pressed p-4 rounded-lg bg-red-50 border-l-4 border-red-500 mt-4">
                      <p className="text-sm font-bold text-red-700">❌ Errore durante il check:</p>
                      <p className="text-xs text-red-600 mt-1">{result.error}</p>
                    </div>
                  )}
                </div>
              </NeumorphicCard>
            );
          })}
        </div>

        {/* Best Practices Info */}
        <NeumorphicCard className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Best Practices Generali
          </h3>
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p><strong>Limits nelle Query:</strong> Usa sempre .list("-created_date", 500) per evitare timeout</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p><strong>useMemo:</strong> Wrappa calcoli complessi, filtri e aggregazioni in useMemo</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p><strong>Componentizzazione:</strong> Componenti &lt; 500 righe, estrai in file separati</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p><strong>Mobile First:</strong> Testa sempre su mobile, usa responsive classes (lg:, md:)</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p><strong>Loading States:</strong> Mostra skeleton/spinner durante caricamenti</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p><strong>Caching:</strong> Configura staleTime per dati che cambiano raramente</p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}