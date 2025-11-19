import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Edit,
  Save,
  X,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Phone,
  MapPin,
  CreditCard,
  Briefcase,
  Shield,
  Store,
  ShoppingBag,
  FileEdit,
  Eye,
  Copy,
  Download,
  AlertCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function Contratti() {
  const [activeTab, setActiveTab] = useState('contratti'); // 'contratti' or 'templates'
  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingContratto, setEditingContratto] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [previewContratto, setPreviewContratto] = useState(null);
  const [templateTextareaRef, setTemplateTextareaRef] = useState(null);

  const [formData, setFormData] = useState({
    user_id: '',
    user_email: '',
    user_nome_cognome: '',
    template_id: '',
    nome_cognome: '',
    phone: '',
    data_nascita: '',
    citta_nascita: '', // Added citta_nascita
    codice_fiscale: '',
    indirizzo_residenza: '',
    iban: '',
    taglia_maglietta: '',
    user_type: 'dipendente',
    ruoli_dipendente: [],
    assigned_stores: [],
    employee_group: '',
    function_name: '',
    ore_settimanali: 0,
    data_inizio_contratto: '',
    durata_contratto_mesi: 0,
    status: 'bozza',
    note: ''
  });

  const [templateData, setTemplateData] = useState({
    nome_template: '',
    contenuto_template: '',
    descrizione: '',
    attivo: true
  });

  const queryClient = useQueryClient();

  const { data: contratti = [], isLoading } = useQuery({
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

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti'] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratto-templates'] });
    },
  });

  const resetForm = () => {
    setFormData({
      user_id: '',
      user_email: '',
      user_nome_cognome: '',
      template_id: '',
      nome_cognome: '',
      phone: '',
      data_nascita: '',
      citta_nascita: '', // Added citta_nascita
      codice_fiscale: '',
      indirizzo_residenza: '',
      iban: '',
      taglia_maglietta: '',
      user_type: 'dipendente',
      ruoli_dipendente: [],
      assigned_stores: [],
      employee_group: '',
      function_name: '',
      ore_settimanali: 0,
      data_inizio_contratto: '',
      durata_contratto_mesi: 0,
      status: 'bozza',
      note: ''
    });
    setSelectedTemplate('');
    setEditingContratto(null);
    setShowForm(false);
  };

  const resetTemplateForm = () => {
    setTemplateData({
      nome_template: '',
      contenuto_template: '',
      descrizione: '',
      attivo: true
    });
    setEditingTemplate(null);
    setShowTemplateForm(false);
  };

  const handleEdit = (contratto) => {
    setEditingContratto(contratto);
    setFormData({
      user_id: contratto.user_id || '',
      user_email: contratto.user_email || '',
      user_nome_cognome: contratto.user_nome_cognome || '',
      template_id: contratto.template_id || '',
      nome_cognome: contratto.nome_cognome || '',
      phone: contratto.phone || '',
      data_nascita: contratto.data_nascita || '',
      citta_nascita: contratto.citta_nascita || '', // Added citta_nascita
      codice_fiscale: contratto.codice_fiscale || '',
      indirizzo_residenza: contratto.indirizzo_residenza || '',
      iban: contratto.iban || '',
      taglia_maglietta: contratto.taglia_maglietta || '',
      user_type: contratto.user_type || 'dipendente',
      ruoli_dipendente: contratto.ruoli_dipendente || [],
      assigned_stores: contratto.assigned_stores || [],
      employee_group: contratto.employee_group || '',
      function_name: contratto.function_name || '',
      ore_settimanali: contratto.ore_settimanali || 0,
      data_inizio_contratto: contratto.data_inizio_contratto || '',
      durata_contratto_mesi: contratto.durata_contratto_mesi || 0,
      status: contratto.status || 'bozza',
      note: contratto.note || ''
    });
    setSelectedTemplate(contratto.template_id || '');
    setShowForm(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateData({
      nome_template: template.nome_template || '',
      contenuto_template: template.contenuto_template || '',
      descrizione: template.descrizione || '',
      attivo: template.attivo ?? true
    });
    setShowTemplateForm(true);
  };

  const replaceVariables = (templateContent, data) => {
    let result = templateContent;
    
    // Calculate date variables
    const oggi = new Date().toLocaleDateString('it-IT');
    
    let dataFineContratto = '';
    if (data.data_inizio_contratto && data.durata_contratto_mesi) {
      const dataInizio = new Date(data.data_inizio_contratto);
      const dataFine = new Date(dataInizio);
      dataFine.setMonth(dataFine.getMonth() + parseInt(data.durata_contratto_mesi));
      dataFineContratto = dataFine.toLocaleDateString('it-IT');
    }
    
    const variables = {
      '{{nome_cognome}}': data.nome_cognome || '',
      '{{phone}}': data.phone || '',
      '{{data_nascita}}': data.data_nascita ? new Date(data.data_nascita).toLocaleDateString('it-IT') : '',
      '{{citta_nascita}}': data.citta_nascita || '',
      '{{codice_fiscale}}': data.codice_fiscale || '',
      '{{indirizzo_residenza}}': data.indirizzo_residenza || '',
      '{{iban}}': data.iban || '',
      '{{employee_group}}': data.employee_group || '',
      '{{function_name}}': data.function_name || '',
      '{{ore_settimanali}}': data.ore_settimanali?.toString() || '',
      '{{data_inizio_contratto}}': data.data_inizio_contratto ? new Date(data.data_inizio_contratto).toLocaleDateString('it-IT') : '',
      '{{durata_contratto_mesi}}': data.durata_contratto_mesi?.toString() || '',
      '{{data_oggi}}': oggi,
      '{{data_fine_contratto}}': dataFineContratto,
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

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo contratto?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteTemplate = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleSendContract = async (contratto) => {
    if (!confirm('Vuoi inviare questo contratto via email?')) return;

    try {
      await base44.integrations.Core.SendEmail({
        to: contratto.user_email,
        subject: 'Contratto di Lavoro - Sa Pizzedda',
        body: `Gentile ${contratto.nome_cognome},\n\nÈ stato generato il tuo contratto di lavoro.\nPuoi visualizzarlo e firmarlo accedendo alla piattaforma nella sezione "I Miei Contratti".\n\nCordiali saluti,\nSa Pizzedda`
      });

      await updateMutation.mutateAsync({
        id: contratto.id,
        data: {
          ...contratto,
          status: 'inviato',
          data_invio: new Date().toISOString()
        }
      });

      alert('Contratto inviato con successo!');
    } catch (error) {
      console.error('Error sending contract:', error);
      alert('Errore durante l\'invio del contratto');
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
        citta_nascita: user.citta_nascita || '', // Added citta_nascita
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

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const hasRole = prev.ruoli_dipendente.includes(role);
      return {
        ...prev,
        ruoli_dipendente: hasRole
          ? prev.ruoli_dipendente.filter(r => r !== role)
          : [...prev.ruoli_dipendente, role]
      };
    });
  };

  const handleStoreToggle = (storeName) => {
    setFormData(prev => {
      const isAssigned = prev.assigned_stores.includes(storeName);
      return {
        ...prev,
        assigned_stores: isAssigned
          ? prev.assigned_stores.filter(s => s !== storeName)
          : [...prev.assigned_stores, storeName]
      };
    });
  };

  const insertVariable = (variable) => {
    const textarea = templateTextareaRef;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = templateData.contenuto_template.substring(0, startPos);
    const textAfter = templateData.contenuto_template.substring(endPos);
    const variableText = `{{${variable}}}`;
    
    const newText = textBefore + variableText + textAfter;
    
    setTemplateData(prev => ({
      ...prev,
      contenuto_template: newText
    }));

    // Set cursor position after variable
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + variableText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'bozza': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza' },
      'inviato': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Inviato' },
      'firmato': { bg: 'bg-green-100', text: 'text-green-700', label: 'Firmato ✓' },
      'archiviato': { bg: 'bg-red-100', text: 'text-red-700', label: 'Archiviato' }
    };
    const badge = badges[status] || badges.bozza;
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  const stats = {
    totale: contratti.length,
    bozza: contratti.filter(c => c.status === 'bozza').length,
    inviati: contratti.filter(c => c.status === 'inviato').length,
    firmati: contratti.filter(c => c.status === 'firmato').length,
    templates: templates.filter(t => t.attivo).length
  };

  const availableVariables = [
    'nome_cognome', 'phone', 'data_nascita', 'citta_nascita', 'codice_fiscale', 'indirizzo_residenza', 'iban',
    'employee_group', 'function_name', 'ore_settimanali', 'data_inizio_contratto', 
    'durata_contratto_mesi', 'data_oggi', 'data_fine_contratto', 'ruoli', 'locali'
  ];

  const handleDownloadPDF = async (contratto) => {
    try {
      const response = await base44.functions.invoke('generateContrattoPDF', {
        contenuto: contratto.contenuto_contratto,
        nome_cognome: contratto.nome_cognome,
        status: contratto.status,
        firma_dipendente: contratto.firma_dipendente,
        data_firma: contratto.data_firma,
        contratto_id: contratto.id
      });

      // Convert base64 to blob
      const base64Data = response.data.pdf_base64;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      // Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contratto_${contratto.nome_cognome.replace(/\s/g, '_')}_${contratto.id.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      alert('Contratto PDF scaricato con successo!');
    } catch (error) {
      console.error('Error downloading contract:', error);
      alert('Errore durante il download del contratto: ' + error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-10 h-10 text-[#8b7355]" />
            <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Contratti</h1>
          </div>
          <p className="text-[#9b9b9b]">Crea template e gestisci i contratti dei dipendenti</p>
        </div>
        <div className="flex gap-3">
          <NeumorphicButton
            onClick={() => setShowTemplateForm(!showTemplateForm)}
            className="flex items-center gap-2"
          >
            <FileEdit className="w-5 h-5" />
            Nuovo Template
          </NeumorphicButton>
          <NeumorphicButton
            onClick={() => setShowForm(!showForm)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuovo Contratto
          </NeumorphicButton>
        </div>
      </div>

      {/* Tabs */}
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
          onClick={() => setActiveTab('templates')}
          className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'templates' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
          }`}
        >
          Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.totale}</h3>
          <p className="text-sm text-[#9b9b9b]">Contratti Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-3xl font-bold text-gray-600 mb-1">{stats.bozza}</h3>
          <p className="text-sm text-[#9b9b9b]">Bozze</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{stats.inviati}</h3>
          <p className="text-sm text-[#9b9b9b]">Inviati</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{stats.firmati}</h3>
          <p className="text-sm text-[#9b9b9b]">Firmati</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <FileEdit className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-3xl font-bold text-purple-600 mb-1">{stats.templates}</h3>
          <p className="text-sm text-[#9b9b9b]">Template Attivi</p>
        </NeumorphicCard>
      </div>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">
                  {editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
                </h2>
                <button onClick={resetTemplateForm} className="text-[#9b9b9b] hover:text-[#6b6b6b]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitTemplate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Nome Template <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={templateData.nome_template}
                      onChange={(e) => setTemplateData({ ...templateData, nome_template: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      placeholder="Es: Contratto Full Time Standard"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Descrizione
                    </label>
                    <input
                      type="text"
                      value={templateData.descrizione}
                      onChange={(e) => setTemplateData({ ...templateData, descrizione: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      placeholder="Breve descrizione del template"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Variabili Disponibili
                  </label>
                  <div className="neumorphic-pressed p-4 rounded-xl mb-3">
                    <p className="text-xs text-[#9b9b9b] mb-3">
                      Clicca su una variabile per inserirla nel punto del cursore:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableVariables.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          className="neumorphic-flat px-3 py-1 rounded-lg text-xs text-[#8b7355] hover:shadow-lg transition-all"
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                    Contenuto Contratto <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    ref={(el) => setTemplateTextareaRef(el)}
                    required
                    value={templateData.contenuto_template}
                    onChange={(e) => setTemplateData({ ...templateData, contenuto_template: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none h-96 resize-none font-mono text-sm"
                    placeholder="Scrivi il testo del contratto e clicca sulle variabili per inserirle..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="template-attivo"
                    checked={templateData.attivo}
                    onChange={(e) => setTemplateData({ ...templateData, attivo: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="template-attivo" className="text-sm font-medium text-[#6b6b6b]">
                    Template Attivo
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={resetTemplateForm}>
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton type="submit" variant="primary">
                    {editingTemplate ? 'Aggiorna' : 'Crea'} Template
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Contract Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">
                  {editingContratto ? 'Modifica Contratto' : 'Nuovo Contratto'}
                </h2>
                <button onClick={resetForm} className="text-[#9b9b9b] hover:text-[#6b6b6b]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Selection */}
                <div className="neumorphic-flat p-5 rounded-xl border-2 border-[#8b7355]">
                  <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                    Seleziona Template <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                  >
                    <option value="">-- Seleziona un template --</option>
                    {templates.filter(t => t.attivo).map(template => (
                      <option key={template.id} value={template.id}>
                        {template.nome_template}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="text-xs text-[#9b9b9b] mt-2">
                      {templates.find(t => t.id === selectedTemplate)?.descrizione}
                    </p>
                  )}
                </div>

                {/* User Selection */}
                {!editingContratto && (
                  <div className="neumorphic-flat p-5 rounded-xl">
                    <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                      Seleziona Dipendente (Auto-compila i campi)
                    </label>
                    <select
                      value={formData.user_id}
                      onChange={(e) => handleUserSelect(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                    >
                      <option value="">-- Seleziona un dipendente --</option>
                      {users.filter(u => u.user_type === 'dipendente').map(user => (
                        <option key={user.id} value={user.id}>
                          {user.nome_cognome || user.full_name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dati Anagrafici */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#8b7355]" />
                    Dati Anagrafici
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Nome Cognome <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nome_cognome}
                        onChange={(e) => setFormData({ ...formData, nome_cognome: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Data di Nascita <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.data_nascita}
                        onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Città di Nascita
                      </label>
                      <input
                        type="text"
                        value={formData.citta_nascita}
                        onChange={(e) => setFormData({ ...formData, citta_nascita: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Codice Fiscale <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.codice_fiscale}
                        onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value.toUpperCase() })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none uppercase"
                        maxLength={16}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Cellulare <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Indirizzo di Residenza <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.indirizzo_residenza}
                        onChange={(e) => setFormData({ ...formData, indirizzo_residenza: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        IBAN <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.iban}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none uppercase"
                        maxLength={34}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Taglia Maglietta
                      </label>
                      <select
                        value={formData.taglia_maglietta}
                        onChange={(e) => setFormData({ ...formData, taglia_maglietta: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="">-- Seleziona --</option>
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dati Lavorativi */}
                <div className="neumorphic-flat p-5 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[#8b7355]" />
                    Dati Lavorativi
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Gruppo Contrattuale <span className="text-red-600">*</span>
                      </label>
                      <select
                        required
                        value={formData.employee_group}
                        onChange={(e) => setFormData({ ...formData, employee_group: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      >
                        <option value="">-- Seleziona --</option>
                        <option value="FT">FT - Full Time</option>
                        <option value="PT">PT - Part Time</option>
                        <option value="CM">CM - Contratto Misto</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Ruolo/Funzione <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.function_name}
                        onChange={(e) => setFormData({ ...formData, function_name: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Ore Settimanali <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.5"
                        value={formData.ore_settimanali}
                        onChange={(e) => setFormData({ ...formData, ore_settimanali: parseFloat(e.target.value) || 0 })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Data Inizio Contratto <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.data_inizio_contratto}
                        onChange={(e) => setFormData({ ...formData, data_inizio_contratto: e.target.value })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                        Durata Contratto (Mesi) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.durata_contratto_mesi}
                        onChange={(e) => setFormData({ ...formData, durata_contratto_mesi: parseInt(e.target.value) || 0 })}
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {selectedTemplate && previewContratto && (
                  <div className="neumorphic-flat p-5 rounded-xl">
                    <h3 className="font-bold text-[#6b6b6b] mb-3 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-[#8b7355]" />
                      Anteprima Contratto
                    </h3>
                    <div className="neumorphic-pressed p-4 rounded-xl bg-white max-h-60 overflow-y-auto">
                      <pre className="text-xs text-[#6b6b6b] whitespace-pre-wrap font-sans">
                        {previewContratto}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Note */}
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">Note</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none h-24 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={resetForm}>
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton type="submit" variant="primary">
                    {editingContratto ? 'Aggiorna' : 'Crea'} Contratto
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Content Based on Active Tab */}
      {activeTab === 'contratti' ? (
        <>
          {/* Contratti in scadenza */}
          {(() => {
            const oggi = new Date();
            const trentaGiorniFuturo = new Date();
            trentaGiorniFuturo.setDate(oggi.getDate() + 30);
            
            const contrattiInScadenza = contratti
              .filter(c => c.status === 'firmato' && c.data_inizio_contratto && c.durata_contratto_mesi)
              .map(c => {
                const dataInizio = new Date(c.data_inizio_contratto);
                const dataFine = new Date(dataInizio);
                dataFine.setMonth(dataFine.getMonth() + parseInt(c.durata_contratto_mesi));
                return { ...c, data_scadenza: dataFine };
              })
              .filter(c => c.data_scadenza >= oggi && c.data_scadenza <= trentaGiorniFuturo)
              .sort((a, b) => a.data_scadenza - b.data_scadenza);
            
            return contrattiInScadenza.length > 0 ? (
              <NeumorphicCard className="p-6 mb-6 border-2 border-orange-400">
                <h2 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  Contratti in Scadenza (prossimi 30 giorni)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-orange-500">
                        <th className="text-left p-3 text-[#9b9b9b] font-medium">Dipendente</th>
                        <th className="text-left p-3 text-[#9b9b9b] font-medium">Contratto</th>
                        <th className="text-left p-3 text-[#9b9b9b] font-medium">Inizio</th>
                        <th className="text-left p-3 text-[#9b9b9b] font-medium">Scadenza</th>
                        <th className="text-center p-3 text-[#9b9b9b] font-medium">Giorni Rimanenti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contrattiInScadenza.map((contratto) => {
                        const giorniRimanenti = Math.ceil((contratto.data_scadenza - oggi) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={contratto.id} className="border-b border-orange-200 hover:bg-orange-50 transition-colors">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-[#6b6b6b]">{contratto.nome_cognome}</p>
                                {contratto.user_email && (
                                  <p className="text-xs text-[#9b9b9b]">{contratto.user_email}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-sm text-[#6b6b6b]">
                                {contratto.employee_group} - {contratto.ore_settimanali}h/sett
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-sm text-[#6b6b6b]">
                                {new Date(contratto.data_inizio_contratto).toLocaleDateString('it-IT')}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-sm font-bold text-orange-700">
                                {contratto.data_scadenza.toLocaleDateString('it-IT')}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                giorniRimanenti <= 7 
                                  ? 'bg-red-100 text-red-700' 
                                  : giorniRimanenti <= 15
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {giorniRimanenti} giorni
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </NeumorphicCard>
            ) : null;
          })()}

          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Lista Contratti</h2>
          
          {contratti.length === 0 ? (
            <p className="text-center text-[#9b9b9b] py-8">Nessun contratto creato</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Dipendente</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Template</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Contratto</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Inizio</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Scadenza</th>
                    <th className="text-center p-3 text-[#9b9b9b] font-medium">Stato</th>
                    <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {contratti.map((contratto) => (
                    <tr key={contratto.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-[#6b6b6b]">{contratto.nome_cognome}</p>
                          {contratto.user_email && (
                            <p className="text-xs text-[#9b9b9b]">{contratto.user_email}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[#6b6b6b]">{contratto.template_nome || '-'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[#6b6b6b]">{contratto.employee_group} - {contratto.ore_settimanali}h/sett</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[#6b6b6b]">
                          {contratto.data_inizio_contratto ? new Date(contratto.data_inizio_contratto).toLocaleDateString('it-IT') : '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[#6b6b6b]">
                          {(() => {
                            if (!contratto.data_inizio_contratto || !contratto.durata_contratto_mesi) return '-';
                            const dataInizio = new Date(contratto.data_inizio_contratto);
                            const dataFine = new Date(dataInizio);
                            dataFine.setMonth(dataFine.getMonth() + parseInt(contratto.durata_contratto_mesi));
                            return dataFine.toLocaleDateString('it-IT');
                          })()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(contratto.status)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPreviewContratto(contratto)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-purple-50 transition-colors"
                            title="Visualizza"
                          >
                            <Eye className="w-4 h-4 text-purple-600" />
                          </button>
                          {contratto.status === 'firmato' && (
                            <button
                              onClick={() => handleDownloadPDF(contratto)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-green-50 transition-colors"
                              title="Scarica Contratto"
                            >
                              <Download className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(contratto)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifica"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          {contratto.status === 'bozza' && (
                            <button
                              onClick={() => handleSendContract(contratto)}
                              className="neumorphic-flat p-2 rounded-lg hover:bg-green-50 transition-colors"
                              title="Invia"
                            >
                              <Send className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(contratto.id)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>
      ) : (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Template Contratti</h2>
          
          {templates.length === 0 ? (
            <p className="text-center text-[#9b9b9b] py-8">Nessun template creato</p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="neumorphic-pressed p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-[#6b6b6b]">{template.nome_template}</h3>
                        {!template.attivo && (
                          <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                            Non attivo
                          </span>
                        )}
                      </div>
                      {template.descrizione && (
                        <p className="text-sm text-[#9b9b9b]">{template.descrizione}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Modifica"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Elimina"
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

      {/* Preview Modal */}
      {previewContratto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">
                  Anteprima Contratto
                </h2>
                <button
                  onClick={() => setPreviewContratto(null)}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <div className="neumorphic-pressed p-6 rounded-xl bg-white">
                <div 
                  className="prose prose-sm max-w-none text-[#6b6b6b]"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {typeof previewContratto === 'string' ? previewContratto : previewContratto.contenuto_contratto}
                </div>
              </div>

              {typeof previewContratto !== 'string' && previewContratto.status === 'firmato' && previewContratto.firma_dipendente && (
                <div className="neumorphic-flat p-5 rounded-xl bg-green-50 mt-4">
                  <h3 className="font-bold text-green-800 mb-2">Firma Digitale</h3>
                  <p className="text-sm text-green-700">
                    Firmato da: <strong>{previewContratto.firma_dipendente}</strong><br />
                    Data firma: {new Date(previewContratto.data_firma).toLocaleDateString('it-IT')} alle {new Date(previewContratto.data_firma).toLocaleTimeString('it-IT')}
                  </p>
                </div>
              )}
            </NeumorphicCard>
          </div>
        </div>
      )}
    </div>
  );
}