import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { Camera, ClipboardCheck, Users, ChefHat, UserCheck, Plus, Edit, Trash2, X, Save, AlertTriangle } from 'lucide-react';

export default function FormPulizia() {
  const [activeSection, setActiveSection] = useState('master');
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    domanda_testo: '',
    tipo_controllo: 'scelta_multipla',
    attrezzatura: '',
    opzioni_risposta: [''],
    risposta_corretta: '',
    ruoli_assegnati: [],
    stores_assegnati: [],
    ordine: 0,
    richiesto: true,
    attivo: true,
    tipo_controllo_ai: 'pulizia',
    prompt_ai: '',
    ordine_bibite: ''
  });

  const queryClient = useQueryClient();

  const { data: domande = [] } = useQuery({
    queryKey: ['domande-pulizia'],
    queryFn: () => base44.entities.DomandaPulizia.list('ordine'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: attrezzature = [] } = useQuery({
    queryKey: ['attrezzature'],
    queryFn: () => base44.entities.Attrezzatura.filter({ attivo: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DomandaPulizia.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domande-pulizia'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DomandaPulizia.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domande-pulizia'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DomandaPulizia.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domande-pulizia'] });
    },
  });

  const resetForm = () => {
    setQuestionForm({
      domanda_testo: '',
      tipo_controllo: 'scelta_multipla',
      attrezzatura: '',
      opzioni_risposta: [''],
      risposta_corretta: '',
      ruoli_assegnati: [],
      stores_assegnati: [],
      ordine: 0,
      richiesto: true,
      attivo: true,
      tipo_controllo_ai: 'pulizia',
      prompt_ai: '',
      ordine_bibite: ''
    });
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  const handleEdit = (domanda) => {
    setEditingQuestion(domanda);
    setQuestionForm({
      domanda_testo: domanda.domanda_testo || '',
      tipo_controllo: domanda.tipo_controllo || 'multipla',
      attrezzatura: domanda.attrezzatura || '',
      opzioni_risposta: domanda.opzioni_risposta || [''],
      risposta_corretta: domanda.risposta_corretta || '',
      ruoli_assegnati: domanda.ruoli_assegnati || [],
      stores_assegnati: domanda.stores_assegnati || [],
      ordine: domanda.ordine || 0,
      richiesto: domanda.richiesto !== false,
      attivo: domanda.attivo !== false,
      tipo_controllo_ai: domanda.tipo_controllo_ai || 'pulizia',
      prompt_ai: domanda.prompt_ai || '',
      ordine_bibite: domanda.ordine_bibite || ''
    });
    setShowQuestionForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...questionForm,
      opzioni_risposta: questionForm.tipo_controllo === 'scelta_multipla' ? questionForm.opzioni_risposta.filter(o => o.trim()) : []
    };
    // Rimuovi campi non necessari per tipo scelta_multipla
    if (questionForm.tipo_controllo === 'scelta_multipla') {
      delete data.tipo_controllo_ai;
      delete data.prompt_ai;
      delete data.ordine_bibite;
    }
    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRoleToggle = (role) => {
    setQuestionForm(prev => ({
      ...prev,
      ruoli_assegnati: prev.ruoli_assegnati.includes(role)
        ? prev.ruoli_assegnati.filter(r => r !== role)
        : [...prev.ruoli_assegnati, role]
    }));
  };

  const handleStoreToggle = (storeId) => {
    setQuestionForm(prev => ({
      ...prev,
      stores_assegnati: prev.stores_assegnati.includes(storeId)
        ? prev.stores_assegnati.filter(s => s !== storeId)
        : [...prev.stores_assegnati, storeId]
    }));
  };

  const addOpzioneRisposta = () => {
    setQuestionForm(prev => ({
      ...prev,
      opzioni_risposta: [...prev.opzioni_risposta, '']
    }));
  };

  const removeOpzioneRisposta = (index) => {
    setQuestionForm(prev => ({
      ...prev,
      opzioni_risposta: prev.opzioni_risposta.filter((_, i) => i !== index)
    }));
  };

  const updateOpzioneRisposta = (index, value) => {
    setQuestionForm(prev => ({
      ...prev,
      opzioni_risposta: prev.opzioni_risposta.map((o, i) => i === index ? value : o)
    }));
  };

  const sections = [
    { id: 'master', label: 'Gestione Domande', icon: ClipboardCheck, description: 'Crea e assegna domande per i form di controllo pulizia' },
    { id: 'cassiere', label: 'Form Cassiere', icon: Users, page: 'ControlloPuliziaCassiere', description: 'Controllo pulizia per cassieri' },
    { id: 'pizzaiolo', label: 'Form Pizzaiolo', icon: ChefHat, page: 'ControlloPuliziaPizzaiolo', description: 'Controllo pulizia per pizzaioli' },
    { id: 'store_manager', label: 'Form Store Manager', icon: UserCheck, page: 'ControlloPuliziaStoreManager', description: 'Controllo pulizia per Store Manager' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Camera className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Form Pulizia</h1>
        </div>
        <p className="text-[#9b9b9b]">Seleziona il form di controllo pulizia da compilare</p>
      </div>

      {/* Section Tabs */}
      <NeumorphicCard className="p-4">
        <div className="flex flex-wrap gap-2">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeSection === section.id 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                    : 'neumorphic-flat text-[#6b6b6b] hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {section.label}
              </button>
            );
          })}
        </div>
      </NeumorphicCard>

      {/* Selected Section Content */}
      {activeSection === 'master' ? (
        /* Gestione Domande */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#6b6b6b]">Gestione Domande Form</h2>
            <NeumorphicButton 
              onClick={() => setShowQuestionForm(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuova Domanda
            </NeumorphicButton>
          </div>

          {/* Lista tutte le domande */}
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-[#6b6b6b] mb-4">Tutte le Domande ({domande.length})</h3>
            {domande.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Nessuna domanda creata</p>
            ) : (
              <div className="space-y-3">
                {domande.map((domanda, index) => (
                  <div key={domanda.id} className={`neumorphic-pressed p-4 rounded-xl ${
                    domanda.attivo === false ? 'opacity-50' : ''
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-500">#{domanda.ordine || index + 1}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            domanda.tipo_controllo === 'foto' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {domanda.tipo_controllo === 'foto' ? 'Foto' : 'Multipla'}
                          </span>
                          {domanda.attivo === false && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              Disattivata
                            </span>
                          )}
                          {!domanda.richiesto && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              Opzionale
                            </span>
                          )}
                          {/* Ruoli assegnati */}
                          {domanda.ruoli_assegnati?.map(ruolo => (
                            <span key={ruolo} className={`text-xs px-2 py-1 rounded-full ${
                              ruolo === 'Pizzaiolo' ? 'bg-orange-100 text-orange-700' :
                              ruolo === 'Cassiere' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {ruolo}
                            </span>
                          ))}
                        </div>
                        <p className="font-medium text-[#6b6b6b] mb-1">{domanda.domanda_testo}</p>
                        {domanda.attrezzatura && (
                          <p className="text-sm text-[#9b9b9b]">
                            🔧 Attrezzatura: <span className="font-medium">{domanda.attrezzatura}</span>
                          </p>
                        )}
                        {domanda.tipo_controllo === 'foto' && domanda.tipo_controllo_ai && (
                          <p className="text-xs text-purple-600 mt-1">
                            🤖 Controllo AI: {
                              domanda.tipo_controllo_ai === 'pulizia' ? 'Pulizia' :
                              domanda.tipo_controllo_ai === 'divisa' ? 'Divisa Corretta' :
                              domanda.tipo_controllo_ai === 'frigo_bibite' ? 'Frigo Bibite' :
                              domanda.tipo_controllo_ai === 'etichette' ? 'Presenza Etichette' :
                              'Personalizzato'
                            }
                          </p>
                        )}
                        {domanda.tipo_controllo === 'scelta_multipla' && domanda.opzioni_risposta && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {domanda.opzioni_risposta.map((opz, idx) => (
                              <span 
                                key={idx} 
                                className={`text-xs px-2 py-1 rounded ${
                                  domanda.risposta_corretta === opz 
                                    ? 'bg-green-100 text-green-700 font-bold' 
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {opz}
                                {domanda.risposta_corretta === opz && ' ✓'}
                              </span>
                            ))}
                          </div>
                        )}
                        {domanda.stores_assegnati?.length > 0 && (
                          <p className="text-xs text-[#9b9b9b] mt-1">
                            Store: {domanda.stores_assegnati.map(sid => stores.find(s => s.id === sid)?.name).filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(domanda)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Eliminare questa domanda?')) {
                                deleteMutation.mutate(domanda.id);
                              }
                            }}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
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

          {domande.length === 0 && (
            <NeumorphicCard className="p-12 text-center">
              <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-[#9b9b9b]">Nessuna domanda creata</p>
            </NeumorphicCard>
          )}

          {/* Form Modal */}
          {showQuestionForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <NeumorphicCard className="p-6 my-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-[#6b6b6b]">
                      {editingQuestion ? 'Modifica Domanda' : 'Nuova Domanda'}
                    </h2>
                    <button onClick={resetForm} className="text-[#9b9b9b] hover:text-[#6b6b6b]">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Testo Domanda <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={questionForm.domanda_testo}
                        onChange={(e) => setQuestionForm({ ...questionForm, domanda_testo: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        placeholder="Es: Il forno è pulito?"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Tipo Controllo <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={questionForm.tipo_controllo}
                        onChange={(e) => setQuestionForm({ ...questionForm, tipo_controllo: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="scelta_multipla">Risposta Multipla</option>
                        <option value="foto">Foto Attrezzatura</option>
                      </select>
                    </div>

                    {questionForm.tipo_controllo === 'foto' && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                            Attrezzatura <span className="text-red-600">*</span>
                          </label>
                          <select
                            required
                            value={questionForm.attrezzatura}
                            onChange={(e) => setQuestionForm({ ...questionForm, attrezzatura: e.target.value })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          >
                            <option value="">Seleziona attrezzatura...</option>
                            {attrezzature.map(attr => (
                              <option key={attr.id} value={attr.nome}>{attr.nome}</option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-500 mt-1">
                            Seleziona da <a href="/attrezzature" target="_blank" className="text-blue-600 underline">Attrezzature</a>
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                            Tipo di Controllo AI
                          </label>
                          <select
                            value={questionForm.tipo_controllo_ai || 'pulizia'}
                            onChange={(e) => {
                              const tipo = e.target.value;
                              let prompt = '';
                              if (tipo === 'pulizia') {
                                prompt = 'Analizza la foto e valuta lo stato di pulizia. Rispondi con: pulito, medio, sporco. Descrivi eventuali problemi riscontrati.';
                              } else if (tipo === 'divisa') {
                                prompt = 'Analizza la foto del dipendente e verifica se indossa la divisa corretta: cappellino e maglietta aziendale. Rispondi con: conforme, non conforme. Specifica cosa manca se non conforme.';
                              } else if (tipo === 'frigo_bibite') {
                                prompt = questionForm.ordine_bibite 
                                  ? `Analizza la foto del frigo bibite. Verifica che sia pieno e che le bibite siano nell'ordine corretto: ${questionForm.ordine_bibite}. Rispondi con: conforme, non conforme. Specifica eventuali problemi.`
                                  : 'Analizza la foto del frigo bibite. Verifica che sia pieno e ordinato. Rispondi con: conforme, non conforme.';
                              } else if (tipo === 'etichette') {
                                prompt = 'Analizza la foto e verifica la presenza di etichette su prodotti o contenitori. Controlla che siano presenti, leggibili e con data/informazioni visibili. Rispondi con: conforme, non conforme. Specifica quali etichette mancano o sono illeggibili.';
                              } else if (tipo === 'personalizzato') {
                                prompt = questionForm.prompt_ai || '';
                              }
                              setQuestionForm({ ...questionForm, tipo_controllo_ai: tipo, prompt_ai: prompt });
                            }}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          >
                            <option value="pulizia">🧹 Pulizia (Pulito/Sporco)</option>
                            <option value="divisa">👕 Divisa Corretta (Cappellino + Maglietta)</option>
                            <option value="frigo_bibite">🥤 Frigo Bibite (Pieno + Ordine)</option>
                            <option value="etichette">🏷️ Presenza Etichette</option>
                            <option value="personalizzato">✏️ Personalizzato</option>
                          </select>
                        </div>

                        {questionForm.tipo_controllo_ai === 'frigo_bibite' && (
                          <div>
                            <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                              Ordine Bibite nel Frigo (dall'alto verso il basso)
                            </label>
                            <textarea
                              value={questionForm.ordine_bibite || ''}
                              onChange={(e) => {
                                const ordine = e.target.value;
                                setQuestionForm({ 
                                  ...questionForm, 
                                  ordine_bibite: ordine,
                                  prompt_ai: `Analizza la foto del frigo bibite. Verifica che sia pieno e che le bibite siano nell'ordine corretto: ${ordine}. Rispondi con: conforme, non conforme. Specifica eventuali problemi.`
                                });
                              }}
                              className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none h-24"
                              placeholder="Es: Ripiano 1: Coca Cola, Fanta&#10;Ripiano 2: Acqua naturale, Acqua frizzante&#10;Ripiano 3: Birra, Energy drink"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                            Prompt per l'AI
                          </label>
                          <textarea
                            value={questionForm.prompt_ai || ''}
                            onChange={(e) => setQuestionForm({ ...questionForm, prompt_ai: e.target.value, tipo_controllo_ai: 'personalizzato' })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none h-32"
                            placeholder="Descrivi cosa l'AI deve controllare nella foto..."
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Istruzioni dettagliate su cosa l'AI deve verificare nella foto
                          </p>
                        </div>
                      </>
                    )}



                    {questionForm.tipo_controllo === 'scelta_multipla' && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                            Opzioni di Risposta
                          </label>
                          <div className="space-y-2">
                            {questionForm.opzioni_risposta.map((opzione, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={opzione}
                                  onChange={(e) => updateOpzioneRisposta(index, e.target.value)}
                                  className="flex-1 neumorphic-pressed px-4 py-2 rounded-xl text-[#6b6b6b] outline-none"
                                  placeholder={`Opzione ${index + 1}`}
                                />
                                {questionForm.opzioni_risposta.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOpzioneRisposta(index)}
                                    className="neumorphic-flat p-2 rounded-lg text-red-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <NeumorphicButton type="button" onClick={addOpzioneRisposta} className="text-sm">
                              <Plus className="w-4 h-4 inline mr-1" /> Aggiungi Opzione
                            </NeumorphicButton>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                            Risposta Corretta (opzionale)
                          </label>
                          <select
                            value={questionForm.risposta_corretta}
                            onChange={(e) => setQuestionForm({ ...questionForm, risposta_corretta: e.target.value })}
                            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                          >
                            <option value="">Nessuna risposta corretta</option>
                            {questionForm.opzioni_risposta.filter(o => o.trim()).map((opz, idx) => (
                              <option key={idx} value={opz}>{opz}</option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-500 mt-1">
                            Seleziona quale risposta è quella corretta (per scopi di feedback/valutazione futura)
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Ruoli Assegnati <span className="text-red-600">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Pizzaiolo', 'Cassiere', 'Store Manager'].map(role => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => handleRoleToggle(role)}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                              questionForm.ruoli_assegnati.includes(role)
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                : 'neumorphic-flat text-[#6b6b6b]'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Store Assegnati (lascia vuoto per tutti)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {stores.map(store => (
                          <button
                            key={store.id}
                            type="button"
                            onClick={() => handleStoreToggle(store.id)}
                            className={`px-3 py-2 rounded-xl text-sm transition-all ${
                              questionForm.stores_assegnati.includes(store.id)
                                ? 'bg-purple-500 text-white'
                                : 'neumorphic-flat text-[#6b6b6b]'
                            }`}
                          >
                            {store.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                          Ordine di visualizzazione
                        </label>
                        <input
                          type="number"
                          value={questionForm.ordine}
                          onChange={(e) => setQuestionForm({ ...questionForm, ordine: parseInt(e.target.value) || 0 })}
                          className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="richiesto"
                          checked={questionForm.richiesto}
                          onChange={(e) => setQuestionForm({ ...questionForm, richiesto: e.target.checked })}
                          className="w-5 h-5"
                        />
                        <label htmlFor="richiesto" className="text-sm font-medium text-[#6b6b6b]">
                          Domanda Obbligatoria
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <NeumorphicButton type="button" onClick={resetForm}>
                        Annulla
                      </NeumorphicButton>
                      <NeumorphicButton 
                        type="submit" 
                        variant="primary"
                        disabled={
                          !questionForm.domanda_testo || 
                          questionForm.ruoli_assegnati.length === 0 ||
                          (questionForm.tipo_controllo === 'foto' && !questionForm.attrezzatura)
                        }
                      >
                        {editingQuestion ? 'Aggiorna' : 'Crea'} Domanda
                      </NeumorphicButton>
                    </div>
                  </form>
                </NeumorphicCard>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Altri form */
        sections.filter(s => s.id === activeSection && s.page).map(section => {
          const Icon = section.icon;
          
          return (
            <NeumorphicCard key={section.id} className="p-8 text-center">
              <div className="neumorphic-flat w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Icon className="w-10 h-10 text-[#8b7355]" />
              </div>
              <h2 className="text-2xl font-bold text-[#6b6b6b] mb-2">{section.label}</h2>
              <p className="text-[#9b9b9b] mb-6">{section.description}</p>
              <Link to={createPageUrl(section.page)}>
                <NeumorphicButton variant="primary" className="px-8 py-4 text-lg">
                  Apri Form
                </NeumorphicButton>
              </Link>
            </NeumorphicCard>
          );
        })
      )}
    </div>
  );
}