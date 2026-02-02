import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Send, CheckCircle, Clock, Edit, Trash2, Save, X, AlertTriangle, ChevronDown } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function LettereRichiamo() {
  const [activeTab, setActiveTab] = useState('lettere');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showLetteraForm, setShowLetteraForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showChiusuraModal, setShowChiusuraModal] = useState(false);
  const [selectedLettera, setSelectedLettera] = useState(null);
  const [chiusuraConfig, setChiusuraConfig] = useState({ modalita: 'automatico' });
  const [expandedTemplate, setExpandedTemplate] = useState(false);
  const [filterRichiami, setFilterRichiami] = useState('inviate');
  const [filterChiusure, setFilterChiusure] = useState('inviate');
  
  const [templateForm, setTemplateForm] = useState({
    nome_template: '',
    tipo_lettera: 'lettera_richiamo',
    contenuto: '',
    attivo: true
  });

  const [letteraForm, setLetteraForm] = useState({
    user_id: '',
    tipo_lettera: 'lettera_richiamo',
    template_id: ''
  });

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['lettera-templates'],
    queryFn: () => base44.entities.LetteraRichiamoTemplate.list(),
  });

  const { data: lettere = [] } = useQuery({
    queryKey: ['lettere-richiamo'],
    queryFn: () => base44.entities.LetteraRichiamo.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-dipendenti'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.LetteraRichiamoTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettera-templates'] });
      resetTemplateForm();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LetteraRichiamoTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettera-templates'] });
      resetTemplateForm();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.LetteraRichiamoTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettera-templates'] });
    },
  });

  const deleteLetteraMutation = useMutation({
    mutationFn: (id) => base44.entities.LetteraRichiamo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
    },
  });

  const inviaChiusuraMutation = useMutation({
    mutationFn: async (data) => {
      const templateChiusura = templates.find(t => t.id === data.template_id);
      const lettera = selectedLettera;

      let contenuto = templateChiusura.contenuto;
      contenuto = contenuto.replace(/{{nome_dipendente}}/g, lettera.user_name);
      contenuto = contenuto.replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'));
      contenuto = contenuto.replace(/{{data_visualizzazione_richiamo}}/g, new Date(lettera.data_visualizzazione || lettera.data_firma).toLocaleDateString('it-IT'));
      contenuto = contenuto.replace(/{{mese_firma_richiamo}}/g, new Date(lettera.data_firma || lettera.created_date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }));

      await base44.entities.LetteraRichiamo.create({
        user_id: lettera.user_id,
        user_email: lettera.user_email,
        user_name: lettera.user_name,
        tipo_lettera: 'chiusura_procedura',
        contenuto_lettera: contenuto,
        data_invio: new Date().toISOString(),
        status: 'inviata',
        lettera_richiamo_id: lettera.id
      });

      await base44.entities.LetteraRichiamo.update(lettera.id, {
        chiusura_procedura_schedulata: true,
        chiusura_procedura_in_sospeso: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
      setShowChiusuraModal(false);
      setSelectedLettera(null);
      alert('Chiusura procedura inviata con successo!');
    },
  });

  const inviaLetteraMutation = useMutation({
    mutationFn: async (data) => {
      const template = templates.find(t => t.id === data.template_id);
      const user = users.find(u => u.id === data.user_id);
      
      let contenuto = template.contenuto;
      contenuto = contenuto.replace(/{{nome_dipendente}}/g, user.nome_cognome || user.full_name || user.email);
      contenuto = contenuto.replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'));
      
      return base44.entities.LetteraRichiamo.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.nome_cognome || user.full_name || user.email,
        tipo_lettera: data.tipo_lettera,
        contenuto_lettera: contenuto,
        data_invio: new Date().toISOString(),
        status: 'inviata'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
      alert('Lettera inviata con successo!');
      setShowLetteraForm(false);
      resetLetteraForm();
    },
  });

  const { data: config = {} } = useQuery({
    queryKey: ['lettere-config'],
    queryFn: async () => {
      const configs = await base44.entities.LetteraRichiamoTemplate.list();
      return { modalita: 'automatico' };
    }
  });

  useEffect(() => {
    const checkChiusureProcedura = async () => {
      const richiamiDaChiudere = lettere.filter(l => 
        l.tipo_lettera === 'lettera_richiamo' && 
        (l.status === 'firmata' || l.status === 'visualizzata') && 
        !l.chiusura_procedura_in_sospeso &&
        !l.chiusura_procedura_schedulata &&
        (l.data_visualizzazione || l.data_firma)
      );

      for (const richiamo of richiamiDaChiudere) {
        const dataVerifica = richiamo.data_firma || richiamo.data_visualizzazione;
        const dataVisualizzazione = new Date(dataVerifica);
        const oggi = new Date();
        const differenzaGiorni = Math.floor((oggi - dataVisualizzazione) / (1000 * 60 * 60 * 24));

        // Modalità automatica: invia dopo 5 giorni
        if (config.modalita === 'automatico' && differenzaGiorni >= 5) {
          const templateChiusura = templates.find(t => t.tipo_lettera === 'chiusura_procedura' && t.attivo);
          
          if (templateChiusura) {
            let contenuto = templateChiusura.contenuto;
            contenuto = contenuto.replace(/{{nome_dipendente}}/g, richiamo.user_name);
            contenuto = contenuto.replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'));
            contenuto = contenuto.replace(/{{data_visualizzazione_richiamo}}/g, new Date(richiamo.data_visualizzazione || richiamo.data_firma).toLocaleDateString('it-IT'));
            contenuto = contenuto.replace(/{{mese_firma_richiamo}}/g, new Date(richiamo.data_firma || richiamo.created_date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }));

            await base44.entities.LetteraRichiamo.create({
              user_id: richiamo.user_id,
              user_email: richiamo.user_email,
              user_name: richiamo.user_name,
              tipo_lettera: 'chiusura_procedura',
              contenuto_lettera: contenuto,
              data_invio: new Date().toISOString(),
              status: 'inviata',
              lettera_richiamo_id: richiamo.id
            });

            await base44.entities.LetteraRichiamo.update(richiamo.id, {
              chiusura_procedura_schedulata: true
            });

            queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
          }
        }
        // Modalità manuale: segna come in sospeso
        else if (config.modalita === 'manuale' && differenzaGiorni >= 1) {
          await base44.entities.LetteraRichiamo.update(richiamo.id, {
            chiusura_procedura_in_sospeso: true
          });
          queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
        }
      }
    };

    if (lettere.length > 0 && templates.length > 0) {
      checkChiusureProcedura();
    }
  }, [lettere, templates, config]);

  const resetTemplateForm = () => {
    setTemplateForm({
      nome_template: '',
      tipo_lettera: 'lettera_richiamo',
      contenuto: '',
      attivo: true
    });
    setEditingTemplate(null);
    setShowTemplateForm(false);
  };

  const resetLetteraForm = () => {
    setLetteraForm({
      user_id: '',
      tipo_lettera: 'lettera_richiamo',
      template_id: ''
    });
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      nome_template: template.nome_template,
      tipo_lettera: template.tipo_lettera,
      contenuto: template.contenuto,
      attivo: template.attivo !== false
    });
    setShowTemplateForm(true);
  };

  const handleSubmitTemplate = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const handleSubmitLettera = (e) => {
    e.preventDefault();
    inviaLetteraMutation.mutate(letteraForm);
  };

  const activeTemplates = templates.filter(t => t.attivo !== false);
  const richiamiTemplates = activeTemplates.filter(t => t.tipo_lettera === 'lettera_richiamo');
  const chiusureTemplates = activeTemplates.filter(t => t.tipo_lettera === 'chiusura_procedura');

  // Filtri per Lettere di Richiamo
  const richiamiInviate = lettere.filter(l => l.tipo_lettera === 'lettera_richiamo' && l.status === 'inviata');
  const richiamiVisualizzate = lettere.filter(l => l.tipo_lettera === 'lettera_richiamo' && l.status === 'visualizzata');
  const richiamiFirmate = lettere.filter(l => l.tipo_lettera === 'lettera_richiamo' && l.status === 'firmata');
  const richiamiChiusura = lettere.filter(l => l.tipo_lettera === 'lettera_richiamo' && (l.status === 'visualizzata' || l.status === 'firmata') && !l.chiusura_procedura_schedulata && !l.chiusura_procedura_in_sospeso);

  // Filtri per Chiusure Procedura
  const chiusureInviate = lettere.filter(l => l.tipo_lettera === 'chiusura_procedura' && l.status === 'inviata');
  const chiusureVisualizzate = lettere.filter(l => l.tipo_lettera === 'chiusura_procedura' && l.status === 'visualizzata');
  const chiusureFirmate = lettere.filter(l => l.tipo_lettera === 'chiusura_procedura' && l.status === 'firmata');

  const getRichiamiByFilter = () => {
    switch(filterRichiami) {
      case 'inviate': return richiamiInviate;
      case 'visualizzate': return richiamiVisualizzate;
      case 'firmate': return richiamiFirmate;
      case 'chiusura': return richiamiChiusura;
      default: return [];
    }
  };

  const getChiusureByFilter = () => {
    switch(filterChiusure) {
      case 'inviate': return chiusureInviate;
      case 'visualizzate': return chiusureVisualizzate;
      case 'firmate': return chiusureFirmate;
      default: return [];
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
            Lettere di Richiamo
          </h1>
          <p className="text-sm text-slate-500">Gestisci lettere di richiamo e chiusure procedura</p>
        </div>
      </div>

      <NeumorphicCard className="p-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('lettere')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'lettere' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                : 'nav-button text-slate-700'
            }`}
          >
            Lettere
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'template' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                : 'nav-button text-slate-700'
            }`}
          >
            Template
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          {activeTab === 'lettere' && (
            <NeumorphicButton
              onClick={() => setShowLetteraForm(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Crea Lettera
            </NeumorphicButton>
          )}
          {activeTab === 'template' && (
            <NeumorphicButton
              onClick={() => setShowTemplateForm(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Crea Template
            </NeumorphicButton>
          )}
        </div>

        {activeTab === 'lettere' && (
          <div className="space-y-4">
            {/* Lettere di Richiamo */}
            <NeumorphicCard className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800">Lettere di Richiamo</h3>
                  <div className="flex gap-2 flex-wrap">
                    {['inviate', 'visualizzate', 'firmate', 'chiusura'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setFilterRichiami(filter)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          filterRichiami === filter
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {filter === 'inviate' && 'Inviate'}
                        {filter === 'visualizzate' && 'Visualizzate'}
                        {filter === 'firmate' && 'Firmate'}
                        {filter === 'chiusura' && 'Chiusura in corso'}
                      </button>
                    ))}
                  </div>
                </div>

                {getRichiamiByFilter().length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">Nessuna lettera in questo stato</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getRichiamiByFilter().map(lettera => (
                <div key={lettera.id} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{lettera.user_name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(lettera.data_invio || lettera.created_date).toLocaleDateString('it-IT')}
                        {lettera.data_visualizzazione && ` • Vis: ${new Date(lettera.data_visualizzazione).toLocaleDateString('it-IT')}`}
                        {lettera.data_firma && ` • Fir: ${new Date(lettera.data_firma).toLocaleDateString('it-IT')}`}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {filterRichiami === 'chiusura' && (
                        <button
                          onClick={() => {
                            setSelectedLettera(lettera);
                            setShowChiusuraModal(true);
                          }}
                          className="p-1.5 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-purple-600" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Elimina lettera?')) {
                            deleteLetteraMutation.mutate(lettera.id);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
                ))}
                </div>
                )}
                </div>
                </NeumorphicCard>

                {/* Chiusure Procedura */}
                <NeumorphicCard className="p-4">
                <div className="space-y-4">
                <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800">Chiusure Procedura</h3>
                <div className="flex gap-2 flex-wrap">
                {['inviate', 'visualizzate', 'firmate'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setFilterChiusure(filter)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      filterChiusure === filter
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'inviate' && 'Inviate'}
                    {filter === 'visualizzate' && 'Visualizzate'}
                    {filter === 'firmate' && 'Firmate'}
                  </button>
                ))}
                </div>
                </div>

                {getChiusureByFilter().length === 0 ? (
                <div className="text-center py-8">
                <p className="text-slate-400 text-sm">Nessuna chiusura in questo stato</p>
                </div>
                ) : (
                <div className="space-y-3">
                {getChiusureByFilter().map(lettera => (
                  <div key={lettera.id} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{lettera.user_name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(lettera.data_invio || lettera.created_date).toLocaleDateString('it-IT')}
                          {lettera.data_visualizzazione && ` • Vis: ${new Date(lettera.data_visualizzazione).toLocaleDateString('it-IT')}`}
                          {lettera.data_firma && ` • Fir: ${new Date(lettera.data_firma).toLocaleDateString('it-IT')}`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Elimina chiusura?')) {
                            deleteLetteraMutation.mutate(lettera.id);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
                </div>
                )}
                </div>
                </NeumorphicCard>
                </div>
                )}

        {activeTab === 'template' && (
          <NeumorphicCard className="p-4">
            <button
              onClick={() => setExpandedTemplate(!expandedTemplate)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <h3 className="font-bold text-slate-800">Templates Lettere</h3>
              <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform ${expandedTemplate ? 'rotate-180' : ''}`} />
            </button>

            {expandedTemplate && (
              <div className="space-y-3 mt-4 pt-4 border-t">
                {templates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500">Nessun template creato</p>
                  </div>
                ) : (
                  templates.map(template => (
                    <div key={template.id} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-800 text-sm">{template.nome_template}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              template.tipo_lettera === 'lettera_richiamo' 
                                ? 'bg-orange-100 text-orange-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {template.tipo_lettera === 'lettera_richiamo' ? 'Richiamo' : 'Chiusura'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">{template.contenuto}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="p-1.5 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Eliminare questo template?')) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </NeumorphicCard>
        )}
      </NeumorphicCard>

      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
                </h2>
                <button onClick={resetTemplateForm} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <form onSubmit={handleSubmitTemplate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Nome Template
                  </label>
                  <input
                    type="text"
                    value={templateForm.nome_template}
                    onChange={(e) => setTemplateForm({ ...templateForm, nome_template: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Tipo Lettera
                  </label>
                  <select
                    value={templateForm.tipo_lettera}
                    onChange={(e) => setTemplateForm({ ...templateForm, tipo_lettera: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="lettera_richiamo">Lettera di Richiamo</option>
                    <option value="chiusura_procedura">Chiusura Procedura</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Contenuto Template
                  </label>
                  <textarea
                    value={templateForm.contenuto}
                    onChange={(e) => setTemplateForm({ ...templateForm, contenuto: e.target.value })}
                    rows={12}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none resize-none"
                    placeholder="Usa variabili: {{nome_dipendente}}, {{data_oggi}}"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    💡 Variabili disponibili: {'{{nome_dipendente}}'}, {'{{data_oggi}}'}, {'{{data_visualizzazione_richiamo}}'}, {'{{mese_firma_richiamo}}'}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={resetTemplateForm} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton type="submit" variant="primary" className="flex-1">
                    <Save className="w-5 h-5 mr-2" />
                    {editingTemplate ? 'Aggiorna' : 'Crea'}
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {showLetteraForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Invia Lettera</h2>
                <button onClick={() => setShowLetteraForm(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <form onSubmit={handleSubmitLettera} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Dipendente
                  </label>
                  <select
                    value={letteraForm.user_id}
                    onChange={(e) => setLetteraForm({ ...letteraForm, user_id: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    required
                  >
                    <option value="">Seleziona dipendente...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.nome_cognome || user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Tipo Lettera
                  </label>
                  <select
                    value={letteraForm.tipo_lettera}
                    onChange={(e) => setLetteraForm({ ...letteraForm, tipo_lettera: e.target.value, template_id: '' })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="lettera_richiamo">Lettera di Richiamo</option>
                    <option value="chiusura_procedura">Chiusura Procedura</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Template
                  </label>
                  <select
                    value={letteraForm.template_id}
                    onChange={(e) => setLetteraForm({ ...letteraForm, template_id: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    required
                  >
                    <option value="">Seleziona template...</option>
                    {(letteraForm.tipo_lettera === 'lettera_richiamo' ? richiamiTemplates : chiusureTemplates).map(t => (
                      <option key={t.id} value={t.id}>{t.nome_template}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={() => setShowLetteraForm(false)} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton type="submit" variant="primary" className="flex-1">
                    <Send className="w-5 h-5 mr-2" />
                    Invia Lettera
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {showChiusuraModal && selectedLettera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Chiusura Procedura - {selectedLettera.user_name}</h2>
                <button onClick={() => setShowChiusuraModal(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (chiusuraConfig.template_id) {
                  inviaChiusuraMutation.mutate(chiusuraConfig);
                }
              }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Seleziona Template Chiusura Procedura
                  </label>
                  <select
                    value={chiusuraConfig.template_id || ''}
                    onChange={(e) => setChiusuraConfig({ ...chiusuraConfig, template_id: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    required
                  >
                    <option value="">Seleziona template...</option>
                    {chiusureTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.nome_template}</option>
                    ))}
                  </select>
                </div>

                {chiusuraConfig.template_id && (() => {
                  const template = templates.find(t => t.id === chiusuraConfig.template_id);
                  if (!template) return null;

                  let preview = template.contenuto;
                  preview = preview.replace(/{{nome_dipendente}}/g, selectedLettera.user_name);
                  preview = preview.replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'));
                  preview = preview.replace(/{{data_visualizzazione_richiamo}}/g, new Date(selectedLettera.data_visualizzazione || selectedLettera.data_firma).toLocaleDateString('it-IT'));
                  preview = preview.replace(/{{mese_firma_richiamo}}/g, new Date(selectedLettera.data_firma || selectedLettera.created_date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }));

                  return (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Anteprima Lettera
                      </label>
                      <textarea
                        value={preview}
                        onChange={(e) => {
                          // Consenti edit della preview
                          setChiusuraConfig({ ...chiusuraConfig, preview_editata: e.target.value });
                        }}
                        rows={10}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none resize-none"
                      />
                    </div>
                  );
                })()}

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={() => setShowChiusuraModal(false)} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton type="submit" variant="primary" className="flex-1" disabled={!chiusuraConfig.template_id}>
                    <Send className="w-5 h-5 mr-2" />
                    Invia Chiusura Procedura
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}
    </div>
  );
}