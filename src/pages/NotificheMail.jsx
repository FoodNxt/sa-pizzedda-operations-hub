import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { Mail, Plus, Edit2, Trash2, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";

export default function NotificheMail() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('templates');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const corpoTextareaRef = React.useRef(null);
  
  const [templateForm, setTemplateForm] = useState({
    tipo_notifica: 'lettera_richiamo',
    nome_template: '',
    oggetto: '',
    corpo: '',
    attivo: true,
    note: ''
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => base44.entities.EmailNotificationTemplate.list()
  });

  // Fetch logs
  const { data: logs = [] } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => base44.entities.EmailLog.list('-data_invio')
  });

  // Create/Update template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTemplate) {
        return base44.entities.EmailNotificationTemplate.update(editingTemplate.id, data);
      }
      return base44.entities.EmailNotificationTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['email-templates']);
      setShowTemplateModal(false);
      setEditingTemplate(null);
      resetForm();
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailNotificationTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['email-templates']);
    }
  });

  const resetForm = () => {
    setTemplateForm({
      tipo_notifica: 'lettera_richiamo',
      nome_template: '',
      oggetto: '',
      corpo: '',
      attivo: true,
      note: ''
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      tipo_notifica: template.tipo_notifica,
      nome_template: template.nome_template,
      oggetto: template.oggetto,
      corpo: template.corpo,
      attivo: template.attivo,
      note: template.note || ''
    });
    setShowTemplateModal(true);
  };

  const handleSave = () => {
    if (!templateForm.nome_template || !templateForm.oggetto || !templateForm.corpo) {
      alert('Compila tutti i campi obbligatori');
      return;
    }
    saveTemplateMutation.mutate(templateForm);
  };

  const tipoNotificaLabels = {
    lettera_richiamo: 'Lettera di Richiamo',
    contratto: 'Contratto',
    turno: 'Turno',
    altro: 'Altro'
  };

  const availableVariables = [
    { key: '{{nome_dipendente}}', label: 'Nome Dipendente', description: 'Nome completo del dipendente' },
    { key: '{{data}}', label: 'Data', description: 'Data corrente' },
    { key: '{{tipo_lettera}}', label: 'Tipo Lettera', description: 'Tipo di lettera di richiamo' },
    { key: '{{motivo}}', label: 'Motivo', description: 'Motivo della lettera' },
    { key: '{{giorno_turno}}', label: 'Giorno Turno', description: 'Giorno del turno' },
    { key: '{{orario_turno}}', label: 'Orario Turno', description: 'Orario del turno' }
  ];

  const insertVariable = (variable) => {
    const textarea = corpoTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateForm.corpo;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = before + variable + after;
    setTemplateForm({ ...templateForm, corpo: newText });

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  return (
    <ProtectedPage pageName="NotificheMail">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>
            Notifiche Email
          </h1>
          <p className="text-slate-500 mt-1">Gestisci i template e visualizza il log delle email inviate</p>
        </div>

        {/* Tabs */}
        <NeumorphicCard className="p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'templates' 
                ? 'nav-button-active text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📝 Template Email
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'logs' 
                ? 'nav-button-active text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📊 Log Invii
          </button>
        </NeumorphicCard>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <>
            <div className="flex justify-end">
              <NeumorphicButton
                onClick={() => {
                  resetForm();
                  setEditingTemplate(null);
                  setShowTemplateModal(true);
                }}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuovo Template
              </NeumorphicButton>
            </div>

            <div className="grid gap-4">
              {templates.map((template) => (
                <NeumorphicCard key={template.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="text-lg font-bold text-slate-700">{template.nome_template}</h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            {tipoNotificaLabels[template.tipo_notifica]}
                          </span>
                          {!template.attivo && (
                            <span className="ml-2 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                              Disattivato
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">
                          <strong>Oggetto:</strong> {template.oggetto}
                        </p>
                        <p className="text-sm text-slate-600">
                          <strong>Corpo:</strong> {template.corpo.substring(0, 150)}...
                        </p>
                        {template.note && (
                          <p className="text-xs text-slate-500">
                            <strong>Note:</strong> {template.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Sei sicuro di voler eliminare questo template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                        className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </NeumorphicCard>
              ))}

              {templates.length === 0 && (
                <NeumorphicCard className="p-12 text-center">
                  <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun template email configurato</p>
                </NeumorphicCard>
              )}
            </div>
          </>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <>
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-700 mb-4">Storico Email Inviate</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-300">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Data/Ora</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Tipo</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Destinatario</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Oggetto</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Inviato da</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {format(new Date(log.data_invio), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            {tipoNotificaLabels[log.tipo_notifica] || log.tipo_notifica}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">
                          <div>{log.destinatario_nome}</div>
                          <div className="text-xs text-slate-500">{log.destinatario_email}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">{log.oggetto}</td>
                        <td className="py-3 px-4">
                          {log.status === 'inviata' ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Inviata
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 text-sm">
                              <XCircle className="w-4 h-4" />
                              Fallita
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{log.inviato_da}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {logs.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p>Nessuna email inviata</p>
                  </div>
                )}
              </div>
            </NeumorphicCard>
          </>
        )}

        {/* Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-slate-700 mb-4">
                {editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Tipo Notifica <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={templateForm.tipo_notifica}
                    onChange={(e) => setTemplateForm({ ...templateForm, tipo_notifica: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700"
                  >
                    <option value="lettera_richiamo">Lettera di Richiamo</option>
                    <option value="contratto">Contratto</option>
                    <option value="turno">Turno</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Nome Template <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateForm.nome_template}
                    onChange={(e) => setTemplateForm({ ...templateForm, nome_template: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700"
                    placeholder="Es: Notifica Lettera di Richiamo Standard"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Oggetto Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateForm.oggetto}
                    onChange={(e) => setTemplateForm({ ...templateForm, oggetto: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700"
                    placeholder="Es: Notifica Importante - Lettera di Richiamo"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Corpo Email <span className="text-red-600">*</span>
                  </label>
                  
                  {/* Variables Section */}
                  <div className="neumorphic-pressed p-3 rounded-xl mb-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">📌 Clicca per inserire variabili:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableVariables.map((variable) => (
                        <button
                          key={variable.key}
                          type="button"
                          onClick={() => insertVariable(variable.key)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                          title={variable.description}
                        >
                          {variable.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    ref={corpoTextareaRef}
                    value={templateForm.corpo}
                    onChange={(e) => setTemplateForm({ ...templateForm, corpo: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 min-h-[250px]"
                    placeholder="Scrivi il corpo dell'email qui. Clicca sui pulsanti sopra per inserire le variabili."
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    💡 Le variabili verranno sostituite automaticamente con i dati reali quando l'email viene inviata
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Note
                  </label>
                  <textarea
                    value={templateForm.note}
                    onChange={(e) => setTemplateForm({ ...templateForm, note: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700"
                    rows={3}
                    placeholder="Note interne sul template..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateForm.attivo}
                      onChange={(e) => setTemplateForm({ ...templateForm, attivo: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700">Template attivo</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <NeumorphicButton
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Annulla
                </NeumorphicButton>
                <NeumorphicButton
                  onClick={handleSave}
                  variant="primary"
                  className="flex-1"
                >
                  {editingTemplate ? 'Salva Modifiche' : 'Crea Template'}
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-700">Dettaglio Email</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="neumorphic-pressed p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Data/Ora Invio</p>
                  <p className="text-slate-700 font-medium">
                    {format(new Date(selectedLog.data_invio), 'dd/MM/yyyy HH:mm:ss')}
                  </p>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Destinatario</p>
                  <p className="text-slate-700 font-medium">{selectedLog.destinatario_nome}</p>
                  <p className="text-sm text-slate-600">{selectedLog.destinatario_email}</p>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Tipo Notifica</p>
                  <p className="text-slate-700 font-medium">
                    {tipoNotificaLabels[selectedLog.tipo_notifica] || selectedLog.tipo_notifica}
                  </p>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Oggetto</p>
                  <p className="text-slate-700 font-medium">{selectedLog.oggetto}</p>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-2">Corpo Email</p>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                    {selectedLog.corpo}
                  </pre>
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  {selectedLog.status === 'inviata' ? (
                    <span className="flex items-center gap-2 text-green-600 font-medium">
                      <CheckCircle className="w-5 h-5" />
                      Email Inviata con Successo
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center gap-2 text-red-600 font-medium">
                        <XCircle className="w-5 h-5" />
                        Invio Fallito
                      </span>
                      {selectedLog.errore && (
                        <p className="text-sm text-red-700 mt-2">Errore: {selectedLog.errore}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="neumorphic-pressed p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Inviato da</p>
                  <p className="text-slate-700">{selectedLog.inviato_da}</p>
                </div>
              </div>

              <div className="mt-6">
                <NeumorphicButton
                  onClick={() => setSelectedLog(null)}
                  className="w-full"
                >
                  Chiudi
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}