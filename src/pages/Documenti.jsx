import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Edit, Save, X, Trash2, Send, CheckCircle, Clock, Eye, Download,
  AlertCircle, User, Briefcase, FileEdit, AlertTriangle, BookOpen, History
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";

export default function Documenti() {
  const [activeTab, setActiveTab] = useState('contratti');

  return (
    <ProtectedPage pageName="Documenti">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-10 h-10 text-[#8b7355]" />
              <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Documenti</h1>
            </div>
            <p className="text-[#9b9b9b]">Contratti, lettere di richiamo e regolamento dipendenti</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('contratti')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'contratti' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Contratti
          </button>
          <button
            onClick={() => setActiveTab('lettere')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'lettere' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Lettere Richiamo
          </button>
          <button
            onClick={() => setActiveTab('regolamento')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'regolamento' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Regolamento
          </button>
        </div>

        {activeTab === 'contratti' && <ContrattiSection />}
        {activeTab === 'lettere' && <LettereSection />}
        {activeTab === 'regolamento' && <RegolamentoSection />}
      </div>
    </ProtectedPage>
  );
}

// Contratti Section
function ContrattiSection() {
  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingContratto, setEditingContratto] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [previewContratto, setPreviewContratto] = useState(null);
  const [templateTextareaRef, setTemplateTextareaRef] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '', user_email: '', user_nome_cognome: '', template_id: '', nome_cognome: '',
    phone: '', data_nascita: '', citta_nascita: '', codice_fiscale: '', indirizzo_residenza: '',
    iban: '', taglia_maglietta: '', user_type: 'dipendente', ruoli_dipendente: [],
    assigned_stores: [], employee_group: '', function_name: '', ore_settimanali: 0,
    data_inizio_contratto: '', durata_contratto_mesi: 0, status: 'bozza', note: ''
  });
  const [templateData, setTemplateData] = useState({
    nome_template: '', contenuto_template: '', descrizione: '', attivo: true
  });

  const queryClient = useQueryClient();
  const { data: contratti = [] } = useQuery({
    queryKey: ['contratti'],
    queryFn: () => base44.entities.Contratto.list('-created_date'),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['contratto-templates'],
    queryFn: () => base44.entities.ContrattoTemplate.list(),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contratto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contratto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contratto.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contratti'] }),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ContrattoTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratto-templates'] });
      resetTemplateForm();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContrattoTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratto-templates'] });
      resetTemplateForm();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ContrattoTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contratto-templates'] }),
  });

  const resetForm = () => {
    setFormData({
      user_id: '', user_email: '', user_nome_cognome: '', template_id: '', nome_cognome: '',
      phone: '', data_nascita: '', citta_nascita: '', codice_fiscale: '', indirizzo_residenza: '',
      iban: '', taglia_maglietta: '', user_type: 'dipendente', ruoli_dipendente: [],
      assigned_stores: [], employee_group: '', function_name: '', ore_settimanali: 0,
      data_inizio_contratto: '', durata_contratto_mesi: 0, status: 'bozza', note: ''
    });
    setSelectedTemplate('');
    setEditingContratto(null);
    setShowForm(false);
  };

  const resetTemplateForm = () => {
    setTemplateData({ nome_template: '', contenuto_template: '', descrizione: '', attivo: true });
    setEditingTemplate(null);
    setShowTemplateForm(false);
  };

  const replaceVariables = (templateContent, data) => {
    let result = templateContent;
    const oggi = new Date().toLocaleDateString('it-IT');
    let dataFineContratto = '';
    if (data.data_inizio_contratto && data.durata_contratto_mesi) {
      const dataInizio = new Date(data.data_inizio_contratto);
      const dataFine = new Date(dataInizio);
      dataFine.setMonth(dataFine.getMonth() + parseInt(data.durata_contratto_mesi));
      dataFineContratto = dataFine.toLocaleDateString('it-IT');
    }
    
    const variables = {
      '{{nome_cognome}}': data.nome_cognome || '', '{{phone}}': data.phone || '',
      '{{data_nascita}}': data.data_nascita ? new Date(data.data_nascita).toLocaleDateString('it-IT') : '',
      '{{citta_nascita}}': data.citta_nascita || '', '{{codice_fiscale}}': data.codice_fiscale || '',
      '{{indirizzo_residenza}}': data.indirizzo_residenza || '', '{{iban}}': data.iban || '',
      '{{employee_group}}': data.employee_group || '', '{{function_name}}': data.function_name || '',
      '{{ore_settimanali}}': data.ore_settimanali?.toString() || '',
      '{{data_inizio_contratto}}': data.data_inizio_contratto ? new Date(data.data_inizio_contratto).toLocaleDateString('it-IT') : '',
      '{{durata_contratto_mesi}}': data.durata_contratto_mesi?.toString() || '',
      '{{data_oggi}}': oggi, '{{data_fine_contratto}}': dataFineContratto,
      '{{ruoli}}': (data.ruoli_dipendente || []).join(', '),
      '{{locali}}': (data.assigned_stores || []).join(', ') || 'Tutti i locali'
    };

    Object.keys(variables).forEach(key => {
      result = result.split(key).join(variables[key]);
    });

    return result;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTemplate) {
      alert('Seleziona un template per il contratto');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) {
      alert('Template non trovato');
      return;
    }

    const contenutoContratto = replaceVariables(template.contenuto_template, formData);
    const contrattoData = {
      ...formData,
      template_id: template.id,
      template_nome: template.nome_template,
      contenuto_contratto: contenutoContratto
    };

    if (editingContratto) {
      updateMutation.mutate({ id: editingContratto.id, data: contrattoData });
    } else {
      createMutation.mutate(contrattoData);
    }
  };

  const handleSubmitTemplate = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateData });
    } else {
      createTemplateMutation.mutate(templateData);
    }
  };

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setFormData({
        ...formData,
        user_id: user.id,
        user_email: user.email,
        user_nome_cognome: user.nome_cognome || user.full_name || '',
        nome_cognome: user.nome_cognome || user.full_name || '',
        phone: user.phone || '',
        data_nascita: user.data_nascita || '',
        citta_nascita: user.citta_nascita || '',
        codice_fiscale: user.codice_fiscale || '',
        indirizzo_residenza: user.indirizzo_residenza || '',
        iban: user.iban || '',
        taglia_maglietta: user.taglia_maglietta || '',
        user_type: user.user_type || 'dipendente',
        ruoli_dipendente: user.ruoli_dipendente || [],
        assigned_stores: user.assigned_stores || [],
        employee_group: user.employee_group || '',
        function_name: user.function_name || '',
        ore_settimanali: user.ore_settimanali || 0,
        data_inizio_contratto: user.data_inizio_contratto || '',
        durata_contratto_mesi: user.durata_contratto_mesi || 0
      });
    }
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && formData.nome_cognome) {
      const preview = replaceVariables(template.contenuto_template, formData);
      setPreviewContratto(preview);
    }
  };

  const insertVariable = (variable) => {
    const textarea = templateTextareaRef;
    if (!textarea) {
      setTemplateData(prev => ({
        ...prev,
        contenuto_template: (prev.contenuto_template || '') + ` {{${variable}}} `
      }));
      return;
    }
    
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = templateData.contenuto_template.substring(0, startPos);
    const textAfter = templateData.contenuto_template.substring(endPos);
    const variableText = `{{${variable}}}`;
    const newText = textBefore + variableText + textAfter;
    setTemplateData(prev => ({ ...prev, contenuto_template: newText }));
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + variableText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSendContract = async (contratto) => {
    if (!confirm('Vuoi inviare questo contratto via email?')) return;

    await base44.integrations.Core.SendEmail({
      to: contratto.user_email,
      subject: 'Contratto di Lavoro - Sa Pizzedda',
      body: `Gentile ${contratto.nome_cognome},\n\nÈ stato generato il tuo contratto di lavoro.\nPuoi visualizzarlo e firmarlo accedendo alla piattaforma.\n\nCordiali saluti,\nSa Pizzedda`
    });

    await updateMutation.mutateAsync({
      id: contratto.id,
      data: { ...contratto, status: 'inviato', data_invio: new Date().toISOString() }
    });

    alert('Contratto inviato con successo!');
  };

  const getStatusBadge = (status) => {
    const badges = {
      'bozza': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza' },
      'inviato': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Inviato' },
      'firmato': { bg: 'bg-green-100', text: 'text-green-700', label: 'Firmato ✓' },
    };
    const badge = badges[status] || badges.bozza;
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  const availableVariables = [
    'nome_cognome', 'phone', 'data_nascita', 'citta_nascita', 'codice_fiscale', 'indirizzo_residenza', 'iban',
    'employee_group', 'function_name', 'ore_settimanali', 'data_inizio_contratto', 
    'durata_contratto_mesi', 'data_oggi', 'data_fine_contratto', 'ruoli', 'locali'
  ];

  return (
    <>
      <div className="flex gap-3 mb-6">
        <NeumorphicButton onClick={() => setShowTemplateForm(true)} className="flex items-center gap-2">
          <FileEdit className="w-5 h-5" />
          Nuovo Template
        </NeumorphicButton>
        <NeumorphicButton onClick={() => setShowForm(true)} variant="primary" className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuovo Contratto
        </NeumorphicButton>
      </div>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Lista Contratti</h2>
        {contratti.length === 0 ? (
          <p className="text-center text-[#9b9b9b] py-8">Nessun contratto creato</p>
        ) : (
          <div className="space-y-3">
            {contratti.map(c => (
              <NeumorphicCard key={c.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-[#6b6b6b]">{c.nome_cognome}</p>
                    <p className="text-sm text-[#9b9b9b]">{c.employee_group} - {c.ore_settimanali}h/sett</p>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(c.status)}
                    <button onClick={() => setPreviewContratto(c)} className="nav-button p-2 rounded-lg">
                      <Eye className="w-4 h-4 text-purple-600" />
                    </button>
                    {c.status === 'bozza' && (
                      <button onClick={() => handleSendContract(c)} className="nav-button p-2 rounded-lg">
                        <Send className="w-4 h-4 text-green-600" />
                      </button>
                    )}
                    <button onClick={() => deleteMutation.mutate(c.id)} className="nav-button p-2 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Template Contratto</h2>
              <button onClick={resetTemplateForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitTemplate} className="space-y-4">
              <input
                type="text"
                placeholder="Nome template"
                value={templateData.nome_template}
                onChange={(e) => setTemplateData({ ...templateData, nome_template: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                required
              />
              <div className="neumorphic-pressed p-3 rounded-xl">
                <p className="text-xs mb-2">Variabili:</p>
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map(v => (
                    <button key={v} type="button" onClick={() => insertVariable(v)}
                      className="neumorphic-flat px-2 py-1 rounded text-xs">
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                ref={(el) => setTemplateTextareaRef(el)}
                value={templateData.contenuto_template}
                onChange={(e) => setTemplateData({ ...templateData, contenuto_template: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-96 resize-none"
                placeholder="Contenuto del contratto..."
                required
              />
              <NeumorphicButton type="submit" variant="primary" className="w-full">Salva Template</NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Nuovo Contratto</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select value={selectedTemplate} onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required>
                <option value="">Seleziona template...</option>
                {templates.filter(t => t.attivo).map(t => (
                  <option key={t.id} value={t.id}>{t.nome_template}</option>
                ))}
              </select>
              <select value={formData.user_id} onChange={(e) => handleUserSelect(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                <option value="">Seleziona dipendente...</option>
                {users.filter(u => u.user_type === 'dipendente').map(u => (
                  <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name || u.email}</option>
                ))}
              </select>
              <input type="text" placeholder="Nome Cognome" value={formData.nome_cognome}
                onChange={(e) => setFormData({ ...formData, nome_cognome: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
              <input type="date" value={formData.data_inizio_contratto}
                onChange={(e) => setFormData({ ...formData, data_inizio_contratto: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
              <NeumorphicButton type="submit" variant="primary" className="w-full">Crea Contratto</NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {previewContratto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Anteprima Contratto</h2>
              <button onClick={() => setPreviewContratto(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="neumorphic-pressed p-6 rounded-xl bg-white">
              <pre className="whitespace-pre-wrap text-sm">
                {typeof previewContratto === 'string' ? previewContratto : previewContratto.contenuto_contratto}
              </pre>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}

// Lettere Section
function LettereSection() {
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showLetteraForm, setShowLetteraForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    nome_template: '', tipo_lettera: 'lettera_richiamo', contenuto: '', attivo: true
  });
  const [letteraForm, setLetteraForm] = useState({ user_id: '', tipo_lettera: 'lettera_richiamo', template_id: '' });

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lettera-templates'] }),
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

  const resetTemplateForm = () => {
    setTemplateForm({ nome_template: '', tipo_lettera: 'lettera_richiamo', contenuto: '', attivo: true });
    setEditingTemplate(null);
    setShowTemplateForm(false);
  };

  const resetLetteraForm = () => {
    setLetteraForm({ user_id: '', tipo_lettera: 'lettera_richiamo', template_id: '' });
  };

  const handleSubmitTemplate = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  return (
    <>
      <div className="flex gap-3 mb-6">
        <NeumorphicButton onClick={() => setShowTemplateForm(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuovo Template
        </NeumorphicButton>
        <NeumorphicButton onClick={() => setShowLetteraForm(true)} variant="primary" className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Invia Lettera
        </NeumorphicButton>
      </div>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Lettere Inviate</h2>
        {lettere.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Nessuna lettera inviata</p>
        ) : (
          <div className="space-y-3">
            {lettere.map(l => (
              <NeumorphicCard key={l.id} className="p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">{l.user_name}</p>
                    <p className="text-xs text-slate-500">{l.tipo_lettera === 'lettera_richiamo' ? 'Lettera di Richiamo' : 'Chiusura Procedura'}</p>
                  </div>
                  {getStatusBadge(l.status === 'firmata' ? 'firmato' : 'inviato')}
                </div>
              </NeumorphicCard>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Template Lettera</h2>
              <button onClick={resetTemplateForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitTemplate} className="space-y-4">
              <input type="text" placeholder="Nome template" value={templateForm.nome_template}
                onChange={(e) => setTemplateForm({ ...templateForm, nome_template: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
              <select value={templateForm.tipo_lettera}
                onChange={(e) => setTemplateForm({ ...templateForm, tipo_lettera: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                <option value="lettera_richiamo">Lettera di Richiamo</option>
                <option value="chiusura_procedura">Chiusura Procedura</option>
              </select>
              <textarea value={templateForm.contenuto}
                onChange={(e) => setTemplateForm({ ...templateForm, contenuto: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-64 resize-none"
                placeholder="Usa {{nome_dipendente}}, {{data_oggi}}" required />
              <NeumorphicButton type="submit" variant="primary" className="w-full">Salva Template</NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {showLetteraForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-2xl w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Invia Lettera</h2>
              <button onClick={() => setShowLetteraForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); inviaLetteraMutation.mutate(letteraForm); }} className="space-y-4">
              <select value={letteraForm.user_id} onChange={(e) => setLetteraForm({ ...letteraForm, user_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required>
                <option value="">Seleziona dipendente...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name || u.email}</option>
                ))}
              </select>
              <select value={letteraForm.tipo_lettera} onChange={(e) => setLetteraForm({ ...letteraForm, tipo_lettera: e.target.value, template_id: '' })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                <option value="lettera_richiamo">Lettera di Richiamo</option>
                <option value="chiusura_procedura">Chiusura Procedura</option>
              </select>
              <select value={letteraForm.template_id} onChange={(e) => setLetteraForm({ ...letteraForm, template_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required>
                <option value="">Seleziona template...</option>
                {templates.filter(t => t.tipo_lettera === letteraForm.tipo_lettera && t.attivo).map(t => (
                  <option key={t.id} value={t.id}>{t.nome_template}</option>
                ))}
              </select>
              <NeumorphicButton type="submit" variant="primary" className="w-full">Invia Lettera</NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}

// Regolamento Section
function RegolamentoSection() {
  const [showForm, setShowForm] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [contenuto, setContenuto] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const queryClient = useQueryClient();
  const { data: regolamenti = [] } = useQuery({
    queryKey: ['regolamenti'],
    queryFn: () => base44.entities.RegolamentoDipendenti.list('-versione'),
  });
  const { data: firme = [] } = useQuery({
    queryKey: ['regolamenti-firmati'],
    queryFn: () => base44.entities.RegolamentoFirmato.list('-data_firma'),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users-dip'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const regolamentoAttivo = regolamenti.find(r => r.attivo);
      if (regolamentoAttivo) {
        await base44.entities.RegolamentoDipendenti.update(regolamentoAttivo.id, { attivo: false });
      }
      return base44.entities.RegolamentoDipendenti.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regolamenti'] });
      setShowForm(false);
      setContenuto('');
    },
  });

  const sendToEmployeesMutation = useMutation({
    mutationFn: async ({ regolamentoId, userIds }) => {
      const regolamento = regolamenti.find(r => r.id === regolamentoId);
      const firme = [];
      for (const userId of userIds) {
        const user = users.find(u => u.id === userId);
        firme.push({
          user_id: userId,
          user_email: user.email,
          user_name: user.nome_cognome || user.full_name || user.email,
          regolamento_id: regolamentoId,
          versione: regolamento.versione
        });
      }
      return Promise.all(firme.map(f => base44.entities.RegolamentoFirmato.create(f)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regolamenti-firmati'] });
      setShowSendModal(false);
      setSelectedUsers([]);
      alert('Regolamento inviato con successo!');
    },
  });

  const regolamentoAttivo = regolamenti.find(r => r.attivo);

  const handleSubmit = (e) => {
    e.preventDefault();
    const versione = (regolamentoAttivo?.versione || 0) + 1;
    createMutation.mutate({
      versione,
      contenuto,
      data_creazione: new Date().toISOString(),
      attivo: true
    });
  };

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <>
      <div className="flex gap-3 mb-6">
        <NeumorphicButton onClick={() => setShowForm(true)} variant="primary" className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuova Versione
        </NeumorphicButton>
        {regolamentoAttivo && (
          <>
            <NeumorphicButton onClick={() => setShowSendModal(true)} className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Invia ai Dipendenti
            </NeumorphicButton>
            <NeumorphicButton onClick={() => setShowHistory(true)} className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Storico
            </NeumorphicButton>
          </>
        )}
      </div>

      {regolamentoAttivo ? (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold mb-4">Regolamento Attivo (v{regolamentoAttivo.versione})</h2>
          <div className="neumorphic-pressed p-6 rounded-xl">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{regolamentoAttivo.contenuto}</pre>
          </div>
        </NeumorphicCard>
      ) : (
        <NeumorphicCard className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun regolamento attivo</p>
        </NeumorphicCard>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Nuovo Regolamento</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea value={contenuto} onChange={(e) => setContenuto(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-96 resize-none"
                placeholder="Inserisci il testo del regolamento..." required />
              <NeumorphicButton type="submit" variant="primary" className="w-full">
                Salva Versione {(regolamentoAttivo?.versione || 0) + 1}
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Seleziona Dipendenti</h2>
              <button onClick={() => setShowSendModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 mb-4">
              {users.map(u => (
                <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedUsers.includes(u.id) ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'nav-button'
                  }`}>
                  {u.nome_cognome || u.full_name || u.email}
                </button>
              ))}
            </div>
            <NeumorphicButton onClick={() => sendToEmployeesMutation.mutate({ regolamentoId: regolamentoAttivo.id, userIds: selectedUsers })}
              variant="primary" className="w-full">
              Invia a {selectedUsers.length} dipendenti
            </NeumorphicButton>
          </NeumorphicCard>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Storico Versioni</h2>
              <button onClick={() => setShowHistory(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {regolamenti.filter(r => !r.attivo).map(r => (
                <NeumorphicCard key={r.id} className="p-4">
                  <p className="font-bold text-slate-800 mb-2">Versione {r.versione}</p>
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <pre className="whitespace-pre-wrap text-xs text-slate-600 font-sans line-clamp-3">{r.contenuto}</pre>
                  </div>
                </NeumorphicCard>
              ))}
            </div>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}