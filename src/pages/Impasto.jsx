import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import VoiceButton from "../components/VoiceButton";
import { ChefHat, Calculator, AlertCircle, CheckCircle, Loader2, BookOpen, Plus, Edit, Save, X, Trash2 } from "lucide-react";

const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

export default function Impasto() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const redirectTo = urlParams.get('redirect');
  const turnoId = urlParams.get('turno_id');
  const attivitaNome = urlParams.get('attivita');
  const preselectedStoreId = urlParams.get('store_id');
  
  const [activeTab, setActiveTab] = useState('calcolo');
  const [selectedStore, setSelectedStore] = useState('');
  const [barelleInFrigo, setBarelleInFrigo] = useState('');
  const [calcoloConfermato, setCalcoloConfermato] = useState(false);
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

  const { data: impasti = [] } = useQuery({
    queryKey: ['gestione-impasti'],
    queryFn: () => base44.entities.GestioneImpasti.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: ricettaIngredienti = [] } = useQuery({
    queryKey: ['ricetta-impasto'],
    queryFn: () => base44.entities.RicettaImpasto.list(),
  });

  // Preselezione store da URL
  React.useEffect(() => {
    if (preselectedStoreId && !selectedStore) {
      setSelectedStore(preselectedStoreId);
    }
  }, [preselectedStoreId, selectedStore]);

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

  const logMutation = useMutation({
    mutationFn: (data) => base44.entities.CalcoloImpastoLog.create(data),
    onSuccess: async () => {
      setCalcoloConfermato(true);

      // Segna attività come completata se viene da un turno
      if (turnoId && attivitaNome && user) {
        try {
          const store = stores.find(s => s.id === selectedStore);
          await base44.entities.AttivitaCompletata.create({
            dipendente_id: user.id,
            dipendente_nome: user.nome_cognome || user.full_name,
            turno_id: turnoId,
            turno_data: new Date().toISOString().split('T')[0],
            store_id: store.id,
            attivita_nome: decodeURIComponent(attivitaNome),
            form_page: 'Impasto',
            completato_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error marking activity as completed:', error);
        }
      }

      // Redirect dopo un breve delay
      if (redirectTo) {
        setTimeout(() => {
          navigate(createPageUrl(redirectTo));
        }, 2000);
      }
    },
  });

  const risultato = useMemo(() => {
    if (!selectedStore || !barelleInFrigo) return null;

    const oggi = new Date().getDay();
    const storeImpasti = impasti.filter(i => i.store_id === selectedStore || i.store_name === selectedStore);

    let totaleProssimi3Giorni = 0;
    for (let i = 0; i < 3; i++) {
      const giornoIdx = (oggi + i) % 7;
      const giornoNome = giorni[giornoIdx];
      const data = storeImpasti.find(imp => imp.giorno_settimana === giornoNome);
      
      if (data) {
        totaleProssimi3Giorni += 
          (data.pranzo_bianche || 0) + (data.pranzo_rosse || 0) +
          (data.pomeriggio_bianche || 0) + (data.pomeriggio_rosse || 0) +
          (data.cena_bianche || 0) + (data.cena_rosse || 0);
      }
    }

    const pallinePresenti = parseInt(barelleInFrigo) * 6;
    const impastoNecessario = totaleProssimi3Giorni - pallinePresenti;
    
    // Calcola ingredienti necessari con arrotondamento
    const ingredientiNecessari = sortedIngredienti.map(ing => {
      let quantita = ing.quantita_per_pallina * Math.max(0, impastoNecessario);
      
      // Applica arrotondamento per eccesso
      if (ing.arrotondamento === 'intero') {
        quantita = Math.ceil(quantita);
      } else if (ing.arrotondamento === 'decine') {
        quantita = Math.ceil(quantita / 10) * 10;
      } else if (ing.arrotondamento === 'centinaia') {
        quantita = Math.ceil(quantita / 100) * 100;
      }
      
      return {
        ...ing,
        quantita_totale: quantita
      };
    });

    return {
      totaleProssimi3Giorni,
      barelleInFrigo: parseInt(barelleInFrigo),
      pallinePresenti,
      impastoNecessario: Math.max(0, impastoNecessario),
      ingredientiNecessari
    };
  }, [selectedStore, barelleInFrigo, impasti, sortedIngredienti]);

  const handleCalcolaImpasto = async () => {
    if (!risultato) return;
    
    const store = stores.find(s => s.id === selectedStore);
    await logMutation.mutateAsync({
      store_id: selectedStore,
      store_name: store?.name || '',
      data_calcolo: new Date().toISOString(),
      operatore: user?.full_name || user?.email || '',
      barelle_in_frigo: risultato.barelleInFrigo,
      palline_presenti: risultato.pallinePresenti,
      fabbisogno_3_giorni: risultato.totaleProssimi3Giorni,
      impasto_suggerito: risultato.impastoNecessario
    });
  };

  // Reset conferma quando cambiano i dati
  const handleStoreChange = (storeId) => {
    setSelectedStore(storeId);
    setCalcoloConfermato(false);
  };

  const handleBarelleChange = (value) => {
    setBarelleInFrigo(value);
    setCalcoloConfermato(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Gestione Impasto
          </h1>
          <p className="text-slate-500 mt-1">Calcola impasto e gestisci ricetta</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('calcolo')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'calcolo'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Calcolo
          </button>
          {(user?.user_type === 'admin' || user?.user_type === 'manager') && (
            <button
              onClick={() => setActiveTab('ricetta')}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === 'ricetta'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'neumorphic-flat text-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Ricetta
            </button>
          )}
        </div>

        {/* Tab Ricetta */}
        {activeTab === 'ricetta' && (
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Ricetta per 1 Pallina</h2>
              <NeumorphicButton
                onClick={() => setShowIngredientForm(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Aggiungi
              </NeumorphicButton>
            </div>

            {showIngredientForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-4">
                <h3 className="font-bold text-slate-700 mb-3">
                  {editingIngredient ? 'Modifica Ingrediente' : 'Nuovo Ingrediente'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nome</label>
                    <input
                      type="text"
                      value={ingredientForm.nome_ingrediente}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, nome_ingrediente: e.target.value })}
                      className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none"
                      placeholder="es. Farina"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Quantità</label>
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
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Unità</label>
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
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <NeumorphicButton onClick={resetIngredientForm}>Annulla</NeumorphicButton>
                  <NeumorphicButton onClick={handleSaveIngredient} variant="primary">
                    <Save className="w-4 h-4 inline mr-1" /> Salva
                  </NeumorphicButton>
                </div>
              </div>
            )}

            {sortedIngredienti.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nessun ingrediente configurato</p>
            ) : (
              <div className="space-y-2">
                {sortedIngredienti.map(ing => (
                  <div key={ing.id} className="neumorphic-pressed p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{ing.nome_ingrediente}</p>
                      <p className="text-sm text-slate-500">{ing.quantita_per_pallina} {ing.unita_misura}</p>
                    </div>
                    <div className="flex gap-1">
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
          </NeumorphicCard>
        )}

        {/* Tab Calcolo */}
        {activeTab === 'calcolo' && (
          <>
            <NeumorphicCard className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Seleziona Negozio
                </label>
                <div className="flex flex-wrap gap-2">
                  {stores
                    .filter(store => {
                      if (user?.user_type === 'admin' || user?.user_type === 'manager') return true;
                      if (!user?.assigned_stores || user.assigned_stores.length === 0) return false;
                      return user.assigned_stores.includes(store.id);
                    })
                    .map(store => (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => handleStoreChange(store.id)}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                          selectedStore === store.id
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                            : 'neumorphic-flat text-slate-700 hover:shadow-md'
                        }`}
                      >
                        {store.name}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Numero Barelle in frigo
                  </label>
                  <VoiceButton text="Inserisci il numero di barelle in frigo" />
                </div>
                <input
                  type="number"
                  min="0"
                  value={barelleInFrigo}
                  onChange={(e) => handleBarelleChange(e.target.value)}
                  placeholder="Inserisci numero barelle"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Ogni barella contiene 6 palline</p>
              </div>
            </NeumorphicCard>

            {risultato && !calcoloConfermato && (
              <NeumorphicCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Anteprima Calcolo</h2>
                    <p className="text-sm text-blue-600 font-medium">👇 Clicca "Conferma Calcolo Impasto" per vedere gli ingredienti</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Fabbisogno prossimi 3 giorni</p>
                    <p className="text-2xl font-bold text-slate-800">{risultato.totaleProssimi3Giorni} palline</p>
                  </div>

                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Barelle in frigo</p>
                    <p className="text-2xl font-bold text-slate-800">{risultato.barelleInFrigo} barelle</p>
                    <p className="text-sm text-slate-500 mt-1">= {risultato.pallinePresenti} palline</p>
                  </div>

                  <div className="neumorphic-card p-6 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400">
                    <div className="flex items-center gap-3 mb-2">
                      <ChefHat className="w-6 h-6 text-yellow-700" />
                      <p className="text-sm font-medium text-yellow-700">Impasto da preparare</p>
                    </div>
                    <p className="text-4xl font-bold text-yellow-800">{risultato.impastoNecessario}</p>
                    <p className="text-sm text-yellow-600 mt-1">palline di impasto</p>
                  </div>

                  {risultato.impastoNecessario > 65 && (
                    <div className="neumorphic-card p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-red-800 mb-1">⚠️ ATTENZIONE: Impasto superiore a 65 palline!</p>
                          <p className="text-sm text-red-700 mb-2">
                            Sono necessari <strong>{Math.ceil(risultato.impastoNecessario / 65)} impasti</strong> separati 
                            (max 65 palline per impasto).
                          </p>
                          <p className="text-sm text-red-600">
                            <strong>Contatta lo Store Manager</strong> per confermare la necessità di un impasto così grande.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <NeumorphicButton
                    onClick={handleCalcolaImpasto}
                    variant="primary"
                    className="w-full mt-4 flex items-center justify-center gap-2"
                    disabled={logMutation.isPending}
                  >
                    {logMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    Conferma Calcolo Impasto
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
            )}

            {calcoloConfermato && risultato && (
              <NeumorphicCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Calcolo Confermato!</h2>
                </div>

                <div className="neumorphic-card p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ChefHat className="w-6 h-6 text-green-700" />
                    <p className="text-sm font-medium text-green-700">Impasto da preparare</p>
                  </div>
                  <p className="text-4xl font-bold text-green-800">{risultato.impastoNecessario}</p>
                  <p className="text-sm text-green-600 mt-1">palline di impasto</p>
                </div>

                {risultato.impastoNecessario > 65 && (
                  <div className="neumorphic-card p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-800 mb-1">⚠️ ATTENZIONE: Impasto superiore a 65 palline!</p>
                        <p className="text-sm text-red-700 mb-2">
                          Sono necessari <strong>{Math.ceil(risultato.impastoNecessario / 65)} impasti</strong> separati 
                          (max 65 palline per impasto).
                        </p>
                        <p className="text-sm text-red-600">
                          <strong>Contatta lo Store Manager</strong> per confermare la necessità di un impasto così grande.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {risultato.ingredientiNecessari && risultato.ingredientiNecessari.length > 0 && risultato.impastoNecessario > 0 && (
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <h3 className="font-bold text-slate-700 mb-3">📋 Ingredienti Necessari</h3>
                    <div className="space-y-2">
                      {risultato.ingredientiNecessari.map((ing, idx) => {
                        // Convert to grams and round to integer
                        let displayValue = ing.quantita_totale;
                        let displayUnit = ing.unita_misura;

                        // Convert kg to g
                        if (ing.unita_misura === 'kg') {
                          displayValue = displayValue * 1000;
                          displayUnit = 'g';
                        }
                        // Convert liters to ml
                        if (ing.unita_misura === 'litri') {
                          displayValue = displayValue * 1000;
                          displayUnit = 'ml';
                        }

                        // Round to integer
                        displayValue = Math.round(displayValue);

                        return (
                          <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
                            <span className="text-slate-700 font-medium">{ing.nome_ingrediente}</span>
                            <span className="text-slate-800 font-bold">
                              {displayValue} {displayUnit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </NeumorphicCard>
            )}

            <NeumorphicCard className="p-4 bg-orange-50 border-2 border-orange-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-bold mb-1">⚠️ IMPORTANTE</p>
                  <p className="text-xs mb-2">
                    Il numero di barelle deve essere contato <strong>DOPO</strong> aver spallinato l'impasto presente in frigo.
                  </p>
                </div>
              </div>
            </NeumorphicCard>

            <NeumorphicCard className="p-4 bg-blue-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">ℹ️ Come funziona</p>
                  <p className="text-xs">
                    Il sistema calcola automaticamente quanto impasto serve per i prossimi 3 giorni
                    e sottrae le palline già presenti in negozio (6 palline per barella).
                  </p>
                </div>
              </div>
            </NeumorphicCard>
          </>
        )}
      </div>
  );
}