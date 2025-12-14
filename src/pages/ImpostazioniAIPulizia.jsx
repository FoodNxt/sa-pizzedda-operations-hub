import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { Sparkles, Save, RotateCcw, AlertCircle, Edit, AlertTriangle, Plus, X, Trash2 } from 'lucide-react';

const defaultPrompts = {
  'Pulizia': `Analizza questa foto di attrezzatura in una pizzeria e valuta lo stato di pulizia.

Rispondi in formato JSON con questa struttura esatta:
{
  "pulizia_status": "pulito" | "medio" | "sporco" | "non_valutabile",
  "note": "Descrizione dettagliata dello stato di pulizia, specifica ESATTAMENTE dove si trova lo sporco (es. 'angolo in basso a sinistra', 'superficie superiore', 'maniglie', 'bordi laterali', ecc.)",
  "problemi_critici": ["lista", "di", "problemi"] oppure []
}

Criteri di valutazione:
- "pulito": Attrezzatura perfettamente pulita, senza residui visibili
- "medio": Presenza di piccoli residui o macchie, ma condizioni accettabili
- "sporco": Sporco evidente, incrostazioni, residui di cibo, necessita pulizia urgente
- "non_valutabile": Foto non chiara o non mostra l'attrezzatura

IMPORTANTE: Nelle note, specifica sempre la POSIZIONE ESATTA dello sporco (es. "Residui di farina nell'angolo in alto a destra", "Macchie di unto sulla superficie centrale", "Incrostazioni sul bordo inferiore").

Sii molto critico e attento ai dettagli di igiene in una cucina professionale.`,

  'Divisa corretta': `Analizza questa foto e verifica se il dipendente indossa la divisa corretta della pizzeria.

Rispondi in formato JSON:
{
  "pulizia_status": "pulito" | "medio" | "sporco" | "non_valutabile",
  "note": "Descrizione dettagliata della divisa",
  "problemi_critici": []
}

Divisa corretta include:
- Cappellino aziendale (obbligatorio)
- Maglietta/polo aziendale (obbligatoria)

Valutazioni:
- "pulito": Divisa completa e in ordine (cappellino + maglietta)
- "medio": Divisa parziale (solo 1 elemento presente) o non perfettamente in ordine
- "sporco": Divisa assente o completamente inadeguata
- "non_valutabile": Foto non chiara o dipendente non visibile

Nelle note, specifica ESATTAMENTE cosa manca o è sbagliato.`,

  'Frigo bibite': `Analizza questa foto del frigo bibite e verifica:
1. Il frigo è pieno e ben rifornito
2. Le bibite sono disposte nell'ordine corretto

Rispondi in formato JSON:
{
  "pulizia_status": "pulito" | "medio" | "sporco" | "non_valutabile",
  "note": "Descrizione dettagliata dello stato del frigo",
  "problemi_critici": []
}

Valutazioni:
- "pulito": Frigo pieno, bibite nell'ordine corretto
- "medio": Frigo non completamente pieno OPPURE ordine non perfetto
- "sporco": Frigo vuoto o quasi vuoto, ordine completamente sbagliato
- "non_valutabile": Foto non chiara

Specifica nelle note quali bibite mancano o sono nell'ordine sbagliato.`,

  'Presenza etichette': `Analizza questa foto e verifica la presenza di etichette sui prodotti/contenitori.

Rispondi in formato JSON:
{
  "pulizia_status": "pulito" | "medio" | "sporco" | "non_valutabile",
  "note": "Descrizione delle etichette trovate",
  "problemi_critici": []
}

Valutazioni:
- "pulito": Tutte le etichette sono presenti, leggibili, con data visibile
- "medio": Alcune etichette mancanti o parzialmente leggibili
- "sporco": Etichette assenti o illeggibili
- "non_valutabile": Foto non chiara

Specifica nelle note quali etichette sono presenti e quali mancano.`
};

export default function ImpostazioniAIPulizia() {
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState(null);
  const [promptText, setPromptText] = useState('');
  const [rispostePossibili, setRispostePossibili] = useState(['pulito', 'medio', 'sporco', 'non_valutabile']);
  const [rispostaCorretta, setRispostaCorretta] = useState('pulito');
  const [punteggiRisposte, setPunteggiRisposte] = useState({ pulito: 100, medio: 50, sporco: 0, non_valutabile: 50 });
  const [newRisposta, setNewRisposta] = useState('');
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const { data: prompts = [] } = useQuery({
    queryKey: ['prompt-ai-pulizia'],
    queryFn: () => base44.entities.PromptAIPulizia.list(),
  });

  const { data: domande = [] } = useQuery({
    queryKey: ['domande-pulizia-settings'],
    queryFn: () => base44.entities.DomandaPulizia.list('ordine'),
  });

  const createPromptMutation = useMutation({
    mutationFn: (data) => base44.entities.PromptAIPulizia.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-ai-pulizia'] });
      setEditingCategory(null);
    },
  });

  const updatePromptMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PromptAIPulizia.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-ai-pulizia'] });
      setEditingCategory(null);
    },
  });

  const allCategories = [...new Set([
    'Pulizia', 
    'Divisa corretta', 
    'Frigo bibite', 
    'Presenza etichette',
    ...prompts.map(p => p.categoria)
  ])];

  const getPromptForCategory = (category) => {
    const existing = prompts.find(p => p.categoria === category && p.attivo !== false);
    return existing?.prompt || defaultPrompts[category] || '';
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    const existing = prompts.find(p => p.categoria === category);
    setPromptText(getPromptForCategory(category));
    setRispostePossibili(existing?.risposte_possibili || ['pulito', 'medio', 'sporco', 'non_valutabile']);
    setRispostaCorretta(existing?.risposta_corretta || 'pulito');
    setPunteggiRisposte(existing?.punteggi_risposte || { pulito: 100, medio: 50, sporco: 0, non_valutabile: 50 });
  };

  const handleSave = () => {
    const existing = prompts.find(p => p.categoria === editingCategory);
    
    const data = {
      categoria: editingCategory,
      prompt: promptText,
      risposte_possibili: rispostePossibili,
      risposta_corretta: rispostaCorretta,
      punteggi_risposte: punteggiRisposte,
      attivo: true
    };

    if (existing) {
      updatePromptMutation.mutate({ id: existing.id, data });
    } else {
      createPromptMutation.mutate(data);
    }
  };

  const handleAddRisposta = () => {
    if (newRisposta.trim() && !rispostePossibili.includes(newRisposta.trim())) {
      const nuovaRisposta = newRisposta.trim();
      setRispostePossibili([...rispostePossibili, nuovaRisposta]);
      setPunteggiRisposte({ ...punteggiRisposte, [nuovaRisposta]: 50 });
      setNewRisposta('');
    }
  };

  const handleRemoveRisposta = (risposta) => {
    setRispostePossibili(rispostePossibili.filter(r => r !== risposta));
    const newPunteggi = { ...punteggiRisposte };
    delete newPunteggi[risposta];
    setPunteggiRisposte(newPunteggi);
    if (rispostaCorretta === risposta) {
      setRispostaCorretta(rispostePossibili[0] || '');
    }
  };

  const handleCreateNewCategory = () => {
    if (newCategoryName.trim()) {
      setEditingCategory(newCategoryName.trim());
      setPromptText('');
      setRispostePossibili(['pulito', 'medio', 'sporco', 'non_valutabile']);
      setRispostaCorretta('pulito');
      setPunteggiRisposte({ pulito: 100, medio: 50, sporco: 0, non_valutabile: 50 });
      setShowNewCategoryForm(false);
      setNewCategoryName('');
    }
  };

  const deletePromptMutation = useMutation({
    mutationFn: (id) => base44.entities.PromptAIPulizia.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-ai-pulizia'] });
    },
  });

  const handleReset = (category) => {
    if (confirm(`Vuoi ripristinare il prompt predefinito per ${category}?`)) {
      setPromptText(defaultPrompts[category] || '');
    }
  };

  // Count domande using each category
  const getDomandeCount = (category) => {
    const categoryMap = {
      'Pulizia': 'pulizia',
      'Divisa corretta': 'divisa',
      'Frigo bibite': 'frigo_bibite',
      'Presenza etichette': 'etichette'
    };
    
    const key = categoryMap[category];
    return domande.filter(d => d.tipo_controllo === 'foto' && d.tipo_controllo_ai === key).length;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Impostazioni AI Pulizia</h1>
        <p className="text-[#9b9b9b]">Configura i prompt AI per analizzare le foto dei controlli pulizia</p>
      </div>

      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-bold mb-2">Come funzionano i prompt AI</p>
            <p className="mb-2">
              Ogni categoria di controllo foto ha un prompt AI che guida l'analisi. Puoi personalizzare questi prompt per migliorare l'accuratezza.
            </p>
            <p className="text-xs">
              💡 I prompt predefiniti sono ottimizzati per i controlli standard. Modificali solo se necessario.
            </p>
          </div>
        </div>
      </NeumorphicCard>

      {/* New Category Button */}
      <NeumorphicCard className="p-4">
        {showNewCategoryForm ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nome nuova categoria..."
              className="flex-1 neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateNewCategory()}
            />
            <NeumorphicButton onClick={handleCreateNewCategory} variant="primary">
              <Plus className="w-4 h-4" />
            </NeumorphicButton>
            <NeumorphicButton onClick={() => setShowNewCategoryForm(false)}>
              <X className="w-4 h-4" />
            </NeumorphicButton>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCategoryForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Nuova Categoria Prompt</span>
          </button>
        )}
      </NeumorphicCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {allCategories.map(category => {
          const isEditing = editingCategory === category;
          const domandeCount = getDomandeCount(category);
          const currentPrompt = getPromptForCategory(category);
          const isCustom = prompts.some(p => p.categoria === category && p.attivo !== false);

          return (
            <NeumorphicCard key={category} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#6b6b6b] mb-1">{category}</h3>
                  <p className="text-xs text-[#9b9b9b]">
                    {domandeCount} {domandeCount === 1 ? 'domanda' : 'domande'} {domandeCount === 1 ? 'usa' : 'usano'} questa categoria
                  </p>
                  {isCustom && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full inline-block mt-1">
                      Personalizzato
                    </span>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="neumorphic-flat p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    {isCustom && (
                      <button
                        onClick={() => {
                          const existing = prompts.find(p => p.categoria === category);
                          if (confirm(`Eliminare la categoria "${category}"?`)) {
                            deletePromptMutation.mutate(existing.id);
                          }
                        }}
                        className="neumorphic-flat p-2 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Prompt AI</label>
                    <textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none h-40 resize-none text-sm"
                      placeholder="Inserisci il prompt per l'AI..."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Risposte Possibili</label>
                    <div className="space-y-2">
                      {rispostePossibili.map(risposta => (
                        <div key={risposta} className="flex items-center gap-2 neumorphic-pressed p-2 rounded-lg">
                          <input
                            type="text"
                            value={risposta}
                            disabled
                            className="flex-1 bg-transparent text-[#6b6b6b] text-sm outline-none"
                          />
                          <input
                            type="number"
                            value={punteggiRisposte[risposta] || 0}
                            onChange={(e) => setPunteggiRisposte({...punteggiRisposte, [risposta]: parseInt(e.target.value) || 0})}
                            className="w-16 neumorphic-pressed px-2 py-1 rounded text-sm text-center outline-none"
                            placeholder="pts"
                          />
                          <span className="text-xs text-[#9b9b9b]">pts</span>
                          <button
                            onClick={() => handleRemoveRisposta(risposta)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newRisposta}
                          onChange={(e) => setNewRisposta(e.target.value)}
                          placeholder="Aggiungi risposta..."
                          className="flex-1 neumorphic-pressed px-3 py-2 rounded-lg text-sm outline-none"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddRisposta()}
                        />
                        <NeumorphicButton onClick={handleAddRisposta} className="text-sm">
                          <Plus className="w-4 h-4" />
                        </NeumorphicButton>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Risposta Corretta (100%)</label>
                    <select
                      value={rispostaCorretta}
                      onChange={(e) => setRispostaCorretta(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
                    >
                      {rispostePossibili.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    {defaultPrompts[category] && (
                      <NeumorphicButton
                        onClick={() => handleReset(category)}
                        className="flex items-center gap-2 text-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Ripristina
                      </NeumorphicButton>
                    )}
                    <NeumorphicButton
                      onClick={() => setEditingCategory(null)}
                      className="text-sm"
                    >
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton
                      onClick={handleSave}
                      variant="primary"
                      className="flex items-center gap-2 text-sm ml-auto"
                    >
                      <Save className="w-4 h-4" />
                      Salva
                    </NeumorphicButton>
                  </div>
                </div>
              ) : (
                <div className="neumorphic-pressed p-4 rounded-xl bg-slate-50 max-h-40 overflow-y-auto">
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">
                    {currentPrompt.substring(0, 200)}...
                  </p>
                </div>
              )}
            </NeumorphicCard>
          );
        })}
      </div>

      <NeumorphicCard className="p-6 bg-orange-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
          <div className="text-sm text-orange-800">
            <p className="font-bold mb-2">⚠️ Nota Importante</p>
            <p className="mb-2">
              Le modifiche ai prompt influenzano solo le NUOVE analisi. Le ispezioni già completate mantengono i risultati originali.
            </p>
            <p className="text-xs">
              Per vedere l'effetto delle modifiche, crea un nuovo controllo pulizia dopo aver salvato i prompt.
            </p>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}