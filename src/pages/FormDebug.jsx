import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { Play, Plus, Edit, Trash2, CheckCircle, XCircle, Loader2, AlertTriangle, Clock, Users } from "lucide-react";
import moment from "moment";

export default function FormDebug() {
  const [activeTab, setActiveTab] = useState('diagnostics');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    form_name: '',
    entity_name: '',
    test_data: '{}',
    required_role: '',
    note: ''
  });

  // Lista dei form disponibili nell'app
  const availableForms = [
    'FormInventario',
    'ConteggioCassa',
    'FormPreparazioni',
    'Precotture',
    'Impasto',
    'ControlloPuliziaCassiere',
    'ControlloPuliziaPizzaiolo',
    'ControlloPuliziaStoreManager',
    'FormCantina',
    'FormTeglieButtate',
    'FormSprechi',
    'FormDeposito',
    'FormPrelievi',
    'FormPagamentiContanti',
    'FormSpostamenti',
    'Ordini'
  ];

  // Lista delle entità disponibili
  const availableEntities = [
    'RilevazioneInventario',
    'ConteggioCassa',
    'Preparazioni',
    'GestioneImpasti',
    'CleaningInspection',
    'RilevazioneInventarioCantina',
    'TeglieButtate',
    'Spreco',
    'Deposito',
    'Prelievo',
    'PagamentoContanti',
    'Spostamento',
    'OrdineFornitore'
  ];

  const { data: testCases = [], isLoading: loadingCases } = useQuery({
    queryKey: ['form-test-cases'],
    queryFn: () => base44.entities.FormTestCase.list('-created_date'),
  });

  const { data: testResults = [], isLoading: loadingResults } = useQuery({
    queryKey: ['form-test-results'],
    queryFn: () => base44.entities.FormTestResult.list('-created_date', 500),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.list(),
  });

  const { data: domandePulizia = [] } = useQuery({
    queryKey: ['domande-pulizia'],
    queryFn: () => base44.entities.DomandaPulizia.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createTestCaseMutation = useMutation({
    mutationFn: (data) => base44.entities.FormTestCase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-test-cases'] });
      setShowAddModal(false);
      resetForm();
    },
  });

  const updateTestCaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FormTestCase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-test-cases'] });
      setEditingCase(null);
      resetForm();
    },
  });

  const deleteTestCaseMutation = useMutation({
    mutationFn: (id) => base44.entities.FormTestCase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-test-cases'] });
    },
  });

  const runTestsMutation = useMutation({
    mutationFn: ({ test_case_id }) => base44.functions.invoke('runFormTests', { test_case_id }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['form-test-results'] });
      alert(`Test completati!\nTotale: ${response.data.total_tests}\nSuccessi: ${response.data.successful}\nFallimenti: ${response.data.failed}\nSuccesso: ${response.data.success_rate}%`);
    },
  });

  const resetForm = () => {
    setFormData({
      form_name: '',
      entity_name: '',
      test_data: '{}',
      required_role: '',
      note: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let parsedData;
    try {
      parsedData = JSON.parse(formData.test_data);
    } catch (error) {
      alert('JSON non valido nei dati di test');
      return;
    }

    const dataToSave = {
      form_name: formData.form_name,
      entity_name: formData.entity_name,
      test_data: parsedData,
      required_role: formData.required_role || undefined,
      note: formData.note
    };

    if (editingCase) {
      updateTestCaseMutation.mutate({ id: editingCase.id, data: dataToSave });
    } else {
      createTestCaseMutation.mutate(dataToSave);
    }
  };

  const handleEdit = (testCase) => {
    setEditingCase(testCase);
    setFormData({
      form_name: testCase.form_name,
      entity_name: testCase.entity_name,
      test_data: JSON.stringify(testCase.test_data, null, 2),
      required_role: testCase.required_role || '',
      note: testCase.note || ''
    });
    setShowAddModal(true);
  };

  // Raggruppa risultati per test_run_id
  const groupedResults = testResults.reduce((acc, result) => {
    if (!acc[result.test_run_id]) {
      acc[result.test_run_id] = [];
    }
    acc[result.test_run_id].push(result);
    return acc;
  }, {});

  const testRuns = Object.keys(groupedResults).sort().reverse();

  // Funzione diagnostica per verificare configurazione form pulizia
  const runDiagnostics = async () => {
    setRunningDiagnostics(true);
    const results = {
      stores: [],
      attrezzature: [],
      domande: [],
      employees: [],
      criticalIssues: [],
      warnings: [],
      successChecks: []
    };

    try {
      // Check 1: Verifica stores
      if (stores.length === 0) {
        results.criticalIssues.push('❌ CRITICO: Nessun store configurato');
      } else {
        results.successChecks.push(`✅ ${stores.length} store configurati`);
        results.stores = stores.map(s => s.name);
      }

      // Check 2: Verifica attrezzature
      if (attrezzature.length === 0) {
        results.criticalIssues.push('❌ CRITICO: Nessuna attrezzatura configurata');
      } else {
        results.successChecks.push(`✅ ${attrezzature.length} attrezzature configurate`);
        
        const attrezzatureInattive = attrezzature.filter(a => a.attivo === false);
        if (attrezzatureInattive.length > 0) {
          results.warnings.push(`⚠️ ${attrezzatureInattive.length} attrezzature disattivate`);
        }

        const attrezzatureSenzaStore = attrezzature.filter(a => !a.stores_assegnati || a.stores_assegnati.length === 0);
        results.attrezzature = attrezzature.map(a => ({
          nome: a.nome,
          attivo: a.attivo,
          stores: a.stores_assegnati?.length || 0,
          global: !a.stores_assegnati || a.stores_assegnati.length === 0
        }));
      }

      // Check 3: Verifica domande pulizia
      const domandePerRuolo = {
        'Cassiere': domandePulizia.filter(d => {
          const ruoli = d.ruoli_assegnati || [];
          return ruoli.length === 0 || ruoli.includes('Cassiere');
        }),
        'Pizzaiolo': domandePulizia.filter(d => {
          const ruoli = d.ruoli_assegnati || [];
          return ruoli.length === 0 || ruoli.includes('Pizzaiolo');
        }),
        'Store Manager': domandePulizia.filter(d => {
          const ruoli = d.ruoli_assegnati || [];
          return ruoli.length === 0 || ruoli.includes('Store Manager');
        })
      };

      for (const [ruolo, domande] of Object.entries(domandePerRuolo)) {
        const domandeAttive = domande.filter(d => d.attiva !== false);
        
        if (domandeAttive.length === 0) {
          results.criticalIssues.push(`❌ CRITICO: Nessuna domanda attiva per ${ruolo}`);
        } else {
          results.successChecks.push(`✅ ${domandeAttive.length} domande attive per ${ruolo}`);
          
          // Verifica domande con attrezzature inesistenti
          for (const d of domandeAttive) {
            if (d.attrezzatura && !attrezzature.find(a => a.nome === d.attrezzatura)) {
              results.warnings.push(`⚠️ Domanda "${d.domanda_testo || d.attrezzatura}" riferisce attrezzatura inesistente: ${d.attrezzatura}`);
            }
          }

          // Simula caricamento per ogni store
          for (const store of stores) {
            const attrezzatureDelLocale = attrezzature.filter(a => {
              if (a.attivo === false) return false;
              if (!a.stores_assegnati || a.stores_assegnati.length === 0) return true;
              return a.stores_assegnati.includes(store.id);
            }).map(a => a.nome);

            const domandeVisibili = domandeAttive.filter(d => {
              if (d.attrezzatura) {
                return attrezzatureDelLocale.includes(d.attrezzatura);
              }
              return true;
            });

            if (domandeVisibili.length === 0) {
              results.criticalIssues.push(`❌ CRITICO: ${ruolo} vedrà 0 domande in ${store.name}`);
            }
          }
        }
      }

      results.domande = Object.entries(domandePerRuolo).map(([ruolo, domande]) => ({
        ruolo,
        totali: domande.length,
        attive: domande.filter(d => d.attiva !== false).length,
        conAttrezzatura: domande.filter(d => d.attrezzatura).length
      }));

      // Check 4: Verifica dipendenti con ruoli
      const dipendentiConRuoli = users.filter(u => u.user_type === 'dipendente' && u.ruoli_dipendente?.length > 0);
      if (dipendentiConRuoli.length === 0) {
        results.warnings.push('⚠️ Nessun dipendente con ruoli assegnati');
      } else {
        results.successChecks.push(`✅ ${dipendentiConRuoli.length} dipendenti con ruoli`);
        results.employees = dipendentiConRuoli.map(u => ({
          nome: u.nome_cognome || u.full_name,
          ruoli: u.ruoli_dipendente
        }));
      }

    } catch (error) {
      results.criticalIssues.push(`❌ Errore durante diagnostica: ${error.message}`);
    }

    setDiagnosticResults(results);
    setRunningDiagnostics(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
          Form Debug & Testing
        </h1>
        <p className="text-slate-500 mt-1">Sistema di test automatico per tutti i form</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NeumorphicCard className="p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{testCases.length}</p>
          <p className="text-xs text-slate-500">Test Cases</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-4 text-center">
          <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{testRuns.length}</p>
          <p className="text-xs text-slate-500">Esecuzioni</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-4 text-center">
          <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{testResults.length}</p>
          <p className="text-xs text-slate-500">Test Totali</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-orange-600">
            {testResults.filter(r => !r.success).length}
          </p>
          <p className="text-xs text-slate-500">Fallimenti</p>
        </NeumorphicCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'diagnostics'
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
              : 'neumorphic-flat text-slate-700'
          }`}
        >
          🔍 Diagnostica Form
        </button>
        <button
          onClick={() => setActiveTab('test_cases')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'test_cases'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
              : 'neumorphic-flat text-slate-700'
          }`}
        >
          Test Cases
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'results'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
              : 'neumorphic-flat text-slate-700'
          }`}
        >
          Risultati
        </button>
      </div>

      {/* Tab Diagnostica */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">🔍 Diagnostica Form Dipendenti</h2>
                <p className="text-sm text-slate-500 mt-1">Verifica la configurazione completa dei form per individuare problemi</p>
              </div>
              <NeumorphicButton
                onClick={runDiagnostics}
                disabled={runningDiagnostics}
                variant="primary"
              >
                {runningDiagnostics ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="ml-2">Analisi in corso...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span className="ml-2">Avvia Diagnostica</span>
                  </>
                )}
              </NeumorphicButton>
            </div>

            {diagnosticResults && (
              <div className="space-y-6">
                {/* Problemi Critici */}
                {diagnosticResults.criticalIssues.length > 0 && (
                  <div className="neumorphic-pressed p-6 rounded-xl bg-red-50 border-2 border-red-300">
                    <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      PROBLEMI CRITICI ({diagnosticResults.criticalIssues.length})
                    </h3>
                    <ul className="space-y-2">
                      {diagnosticResults.criticalIssues.map((issue, idx) => (
                        <li key={idx} className="text-red-700 font-medium">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {diagnosticResults.warnings.length > 0 && (
                  <div className="neumorphic-pressed p-6 rounded-xl bg-yellow-50 border-2 border-yellow-300">
                    <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      ATTENZIONI ({diagnosticResults.warnings.length})
                    </h3>
                    <ul className="space-y-2">
                      {diagnosticResults.warnings.map((warning, idx) => (
                        <li key={idx} className="text-yellow-700">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Controlli OK */}
                {diagnosticResults.successChecks.length > 0 && (
                  <div className="neumorphic-pressed p-6 rounded-xl bg-green-50 border-2 border-green-300">
                    <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      CONTROLLI PASSATI ({diagnosticResults.successChecks.length})
                    </h3>
                    <ul className="space-y-1">
                      {diagnosticResults.successChecks.map((check, idx) => (
                        <li key={idx} className="text-green-700 text-sm">{check}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dettagli Stores */}
                {diagnosticResults.stores.length > 0 && (
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <h3 className="font-bold text-slate-800 mb-2">Stores Configurati</h3>
                    <div className="flex flex-wrap gap-2">
                      {diagnosticResults.stores.map((store, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {store}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dettagli Attrezzature */}
                {diagnosticResults.attrezzature.length > 0 && (
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <h3 className="font-bold text-slate-800 mb-3">Attrezzature per Store</h3>
                    <div className="space-y-2">
                      {diagnosticResults.attrezzature.map((attr, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className={attr.attivo ? 'text-slate-700' : 'text-slate-400 line-through'}>
                            {attr.nome}
                          </span>
                          <div className="flex items-center gap-2">
                            {attr.global ? (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                                Tutti i locali
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                                {attr.stores} store
                              </span>
                            )}
                            {!attr.attivo && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                Disattivo
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dettagli Domande per Ruolo */}
                {diagnosticResults.domande.length > 0 && (
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <h3 className="font-bold text-slate-800 mb-3">Domande Pulizia per Ruolo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {diagnosticResults.domande.map((d, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                          <h4 className="font-bold text-slate-700">{d.ruolo}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Totali: {d.totali} • Attive: {d.attive}
                          </p>
                          <p className="text-sm text-slate-600">
                            Con attrezzatura: {d.conAttrezzatura}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dipendenti */}
                {diagnosticResults.employees.length > 0 && (
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <h3 className="font-bold text-slate-800 mb-3">Dipendenti con Ruoli</h3>
                    <div className="space-y-2">
                      {diagnosticResults.employees.slice(0, 10).map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{emp.nome}</span>
                          <div className="flex gap-1">
                            {emp.ruoli.map((ruolo, ridx) => (
                              <span key={ridx} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                {ruolo}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {diagnosticResults.employees.length > 10 && (
                        <p className="text-xs text-slate-500 text-center">
                          ... e altri {diagnosticResults.employees.length - 10} dipendenti
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!diagnosticResults && !runningDiagnostics && (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Clicca "Avvia Diagnostica" per verificare la configurazione</p>
              </div>
            )}
          </NeumorphicCard>
        </div>
      )}

      {/* Tab Test Cases */}
      {activeTab === 'test_cases' && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Test Cases</h2>
            <div className="flex gap-2">
              <NeumorphicButton
                onClick={() => runTestsMutation.mutate({ test_case_id: null })}
                disabled={runTestsMutation.isPending || testCases.length === 0}
                variant="primary"
              >
                {runTestsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span className="ml-2">Esegui Tutti i Test</span>
              </NeumorphicButton>
              <NeumorphicButton onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4" />
                <span className="ml-2">Nuovo Test Case</span>
              </NeumorphicButton>
            </div>
          </div>

          {loadingCases ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
            </div>
          ) : testCases.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nessun test case configurato</p>
          ) : (
            <div className="space-y-3">
              {testCases.map(testCase => (
                <div key={testCase.id} className="neumorphic-pressed p-4 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-slate-800">{testCase.form_name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {testCase.entity_name}
                        </span>
                        {testCase.required_role && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {testCase.required_role}
                          </span>
                        )}
                        {!testCase.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Disattivo
                          </span>
                        )}
                      </div>
                      {testCase.note && <p className="text-sm text-slate-600 mb-2">{testCase.note}</p>}
                      <details className="text-xs text-slate-500">
                        <summary className="cursor-pointer">Dati di test</summary>
                        <pre className="mt-2 bg-slate-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(testCase.test_data, null, 2)}
                        </pre>
                      </details>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => runTestsMutation.mutate({ test_case_id: testCase.id })}
                        disabled={runTestsMutation.isPending}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <Play className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => handleEdit(testCase)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questo test case?')) {
                            deleteTestCaseMutation.mutate(testCase.id);
                          }
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeumorphicCard>
      )}

      {/* Tab Risultati */}
      {activeTab === 'results' && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Risultati Test</h2>

          {loadingResults ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto" />
            </div>
          ) : testRuns.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nessun test eseguito</p>
          ) : (
            <div className="space-y-4">
              {testRuns.map(runId => {
                const runResults = groupedResults[runId];
                const successCount = runResults.filter(r => r.success).length;
                const failCount = runResults.filter(r => !r.success).length;
                const successRate = ((successCount / runResults.length) * 100).toFixed(1);
                const firstResult = runResults[0];
                const runDate = moment(firstResult.created_date);

                return (
                  <div key={runId} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-800">
                          Esecuzione {runDate.format('DD/MM/YYYY HH:mm')}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {runResults.length} test • {successCount} successi • {failCount} fallimenti
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          successRate === '100.0' ? 'bg-green-100 text-green-800' :
                          successRate >= '80' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {successRate}%
                        </div>
                        <button
                          onClick={() => setSelectedRun(selectedRun === runId ? null : runId)}
                          className="text-blue-600 text-sm font-medium"
                        >
                          {selectedRun === runId ? 'Nascondi' : 'Dettagli'}
                        </button>
                      </div>
                    </div>

                    {selectedRun === runId && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        {runResults.map(result => (
                          <div key={result.id} className={`p-3 rounded-lg ${
                            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {result.success ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className="font-medium text-slate-800">{result.form_name}</span>
                                  <span className="text-sm text-slate-600">• {result.dipendente_nome}</span>
                                </div>
                                {!result.success && result.error_message && (
                                  <p className="text-sm text-red-700 mt-1">❌ {result.error_message}</p>
                                )}
                                <p className="text-xs text-slate-500 mt-1">
                                  Status: {result.status_code} • Tempo: {result.execution_time_ms}ms
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </NeumorphicCard>
      )}

      {/* Modal Add/Edit Test Case */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => { setShowAddModal(false); setEditingCase(null); resetForm(); }} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {editingCase ? 'Modifica Test Case' : 'Nuovo Test Case'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Nome Form</label>
                  <select
                    value={formData.form_name}
                    onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    required
                  >
                    <option value="">Seleziona un form...</option>
                    {availableForms.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Nome Entità</label>
                  <select
                    value={formData.entity_name}
                    onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    required
                  >
                    <option value="">Seleziona un'entità...</option>
                    {availableEntities.map(entity => (
                      <option key={entity} value={entity}>{entity}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Ruolo Richiesto (opzionale)</label>
                  <select
                    value={formData.required_role}
                    onChange={(e) => setFormData({ ...formData, required_role: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Tutti i ruoli</option>
                    <option value="Pizzaiolo">Pizzaiolo</option>
                    <option value="Cassiere">Cassiere</option>
                    <option value="Store Manager">Store Manager</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Dati di Test (JSON)</label>
                  <textarea
                    value={formData.test_data}
                    onChange={(e) => setFormData({ ...formData, test_data: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none font-mono text-sm"
                    rows={10}
                    placeholder='{"store_id": "...", "quantita": 10}'
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Note</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    rows={2}
                    placeholder="Descrizione del test..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingCase(null); resetForm(); }}
                    className="flex-1 py-2 text-slate-600 hover:text-slate-800 neumorphic-flat rounded-xl"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={createTestCaseMutation.isPending || updateTestCaseMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-50"
                  >
                    {editingCase ? 'Aggiorna' : 'Crea'}
                  </button>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </>
      )}
    </div>
  );
}