import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Send, CheckCircle, Clock, Edit, Trash2, Save, X, AlertTriangle } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function LettereRichiamo() {
  const [activeTab, setActiveTab] = useState('lettere');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showLetteraForm, setShowLetteraForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
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

  useEffect(() => {
    const checkChiusureProcedura = async () => {
      const richiamiDaChiudere = lettere.filter(l => 
        l.tipo_lettera === 'lettera_richiamo' && 
        l.status === 'firmata' && 
        !l.chiusura_procedura_schedulata &&
        l.data_firma
      );

      for (const richiamo of richiamiDaChiudere) {
        const dataFirma = new Date(richiamo.data_firma);
        const oggi = new Date();
        const differenzaGiorni = Math.floor((oggi - dataFirma) / (1000 * 60 * 60 * 24));

        if (differenzaGiorni >= 5) {
          const templateChiusura = templates.find(t => t.tipo_lettera === 'chiusura_procedura' && t.attivo);
          
          if (templateChiusura) {
            let contenuto = templateChiusura.contenuto;
            contenuto = contenuto.replace(/{{nome_dipendente}}/g, richiamo.user_name);
            contenuto = contenuto.replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'));

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
      }
    };

    if (lettere.length > 0 && templates.length > 0) {
      checkChiusureProcedura();
    }
  }, [lettere, templates]);

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
            {lettere.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessuna lettera inviata</p>
              </div>
            ) : (
              lettere.map(lettera => (
                <NeumorphicCard key={lettera.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          lettera.tipo_lettera === 'lettera_richiamo' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {lettera.tipo_lettera === 'lettera_richiamo' ? 'Lettera di Richiamo' : 'Chiusura Procedura'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          lettera.status === 'firmata' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {lettera.status === 'firmata' ? (
                            <><CheckCircle className="w-3 h-3 inline mr-1" />Firmata</>
                          ) : (
                            <><Clock className="w-3 h-3 inline mr-1" />In Attesa</>
                          )}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mb-1">{lettera.user_name}</p>
                      <p className="text-xs text-slate-500">
                        Inviata il {new Date(lettera.data_invio || lettera.created_date).toLocaleDateString('it-IT')}
                        {lettera.data_firma && ` • Firmata il ${new Date(lettera.data_firma).toLocaleDateString('it-IT')}`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Sei sicuro di voler eliminare questa lettera? Verrà eliminata anche per il dipendente.')) {
                          deleteLetteraMutation.mutate(lettera.id);
                        }
                      }}
                      className="nav-button p-2 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </NeumorphicCard>
              ))
            )}
          </div>
        )}

        {activeTab === 'template' && (
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun template creato</p>
              </div>
            ) : (
              templates.map(template => (
                <NeumorphicCard key={template.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-slate-800">{template.nome_template}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          template.tipo_lettera === 'lettera_richiamo' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {template.tipo_lettera === 'lettera_richiamo' ? 'Richiamo' : 'Chiusura'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{template.contenuto}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="nav-button p-2 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questo template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                        className="nav-button p-2 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </NeumorphicCard>
              ))
            )}
          </div>
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
                    💡 Variabili disponibili: {'{{nome_dipendente}}'}, {'{{data_oggi}}'}
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
    </div>
  );
}