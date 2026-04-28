import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Send, Eye, Trash2, X, Edit, Loader2, User, FileEdit } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

const AVAILABLE_VARIABLES = [
  'nome_cognome', 'phone', 'email', 'data_nascita', 'citta_nascita',
  'codice_fiscale', 'indirizzo_residenza', 'iban', 'employee_group',
  'function_name', 'ore_settimanali', 'ruoli', 'locali', 'locale_principale', 'data_oggi'
];

function replaceVariables(content, userData, stores) {
  if (!content || !userData) return content;
  const storeNames = (userData.assigned_stores || []).map(id => {
    const store = stores.find(s => s.id === id);
    return store ? store.name : id;
  });

  const vars = {
    '{{nome_cognome}}': userData.nome_cognome || userData.full_name || '',
    '{{phone}}': userData.phone || '',
    '{{email}}': userData.email || '',
    '{{data_nascita}}': userData.data_nascita ? new Date(userData.data_nascita).toLocaleDateString('it-IT') : '',
    '{{citta_nascita}}': userData.citta_nascita || '',
    '{{codice_fiscale}}': userData.codice_fiscale || '',
    '{{indirizzo_residenza}}': userData.indirizzo_residenza || '',
    '{{iban}}': userData.iban || '',
    '{{employee_group}}': userData.employee_group || '',
    '{{function_name}}': userData.function_name || '',
    '{{ore_settimanali}}': userData.ore_settimanali?.toString() || '',
    '{{ruoli}}': (userData.ruoli_dipendente || []).join(', ') || '',
    '{{locali}}': storeNames.length > 0 ? storeNames.join(', ') : 'Tutti i locali',
    '{{locale_principale}}': (() => {
      const primaryIds = userData.primary_stores || [];
      if (primaryIds.length === 0) return storeNames.length > 0 ? storeNames[0] : '';
      const primaryNames = primaryIds.map(id => {
        const store = stores.find(s => s.id === id);
        return store ? store.name : id;
      });
      return primaryNames.join(', ');
    })(),
    '{{data_oggi}}': new Date().toLocaleDateString('it-IT')
  };

  let result = content;
  Object.entries(vars).forEach(([key, val]) => {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
  });
  return result;
}

export default function AltriDocumentiSection() {
  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const templateTextareaRef = useRef(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    titolo: "", contenuto: "", user_id: "", template_id: "", richiede_firma: false
  });
  const [templateFormData, setTemplateFormData] = useState({
    nome_template: "", contenuto_template: "", descrizione: "", richiede_firma: false, attivo: true
  });

  const { data: documenti = [], isLoading } = useQuery({
    queryKey: ["altri-documenti"],
    queryFn: () => base44.entities.AltroDocumento.list("-created_date")
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["documento-templates"],
    queryFn: () => base44.entities.DocumentoTemplate.list("-created_date")
  });
  const { data: stores = [] } = useQuery({
    queryKey: ["stores-doc"],
    queryFn: () => base44.entities.Store.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      return base44.entities.AltroDocumento.create({
        ...data,
        data_invio: new Date().toISOString(),
        status: "inviato",
        inviato_da: currentUser.email,
        inviato_da_nome: currentUser.nome_cognome || currentUser.full_name || currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["altri-documenti"] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AltroDocumento.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["altri-documenti"] })
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.DocumentoTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documento-templates"] });
      resetTemplateForm();
    }
  });
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DocumentoTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documento-templates"] });
      resetTemplateForm();
    }
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentoTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documento-templates"] })
  });

  const resetForm = () => {
    setFormData({ titolo: "", contenuto: "", user_id: "", template_id: "", richiede_firma: false });
    setShowForm(false);
  };
  const resetTemplateForm = () => {
    setTemplateFormData({ nome_template: "", contenuto_template: "", descrizione: "", richiede_firma: false, attivo: true });
    setEditingTemplate(null);
    setShowTemplateForm(false);
  };

  const handleTemplateSelect = (templateId) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    const user = users.find(u => u.id === formData.user_id);
    setFormData(prev => ({
      ...prev,
      template_id: templateId,
      titolo: prev.titolo || tpl.nome_template,
      contenuto: user ? replaceVariables(tpl.contenuto_template, user, stores) : tpl.contenuto_template,
      richiede_firma: tpl.richiede_firma || false
    }));
  };

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === userId);
    setFormData(prev => {
      const tpl = templates.find(t => t.id === prev.template_id);
      return {
        ...prev,
        user_id: userId,
        contenuto: tpl && user ? replaceVariables(tpl.contenuto_template, user, stores) : prev.contenuto
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = users.find(u => u.id === formData.user_id);
    if (!user) { alert("Seleziona un dipendente"); return; }
    createMutation.mutate({
      titolo: formData.titolo,
      contenuto: formData.contenuto,
      user_id: formData.user_id,
      richiede_firma: formData.richiede_firma,
      user_email: user.email,
      user_nome: user.nome_cognome || user.full_name || user.email
    });
  };

  const handleSubmitTemplate = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateFormData });
    } else {
      createTemplateMutation.mutate(templateFormData);
    }
  };

  const insertVariable = (variable) => {
    const textarea = templateTextareaRef.current;
    const variableText = `{{${variable}}}`;
    if (!textarea) {
      setTemplateFormData(prev => ({ ...prev, contenuto_template: (prev.contenuto_template || '') + ` ${variableText} ` }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = templateFormData.contenuto_template.substring(0, start);
    const after = templateFormData.contenuto_template.substring(end);
    setTemplateFormData(prev => ({ ...prev, contenuto_template: before + variableText + after }));
    setTimeout(() => {
      textarea.focus();
      const pos = start + variableText.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const getStatusBadge = (doc) => {
    if (doc.status === "firmato") return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Firmato ✓</span>;
    if (doc.status === "visualizzato") return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Visualizzato</span>;
    return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Inviato</span>;
  };

  if (isLoading) return <NeumorphicCard className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></NeumorphicCard>;

  return (
    <>
      <div className="flex gap-3 mb-6 flex-wrap">
        <NeumorphicButton onClick={() => setShowTemplateForm(true)} className="flex items-center gap-2">
          <FileEdit className="w-5 h-5" /> Nuovo Template
        </NeumorphicButton>
        <NeumorphicButton onClick={() => setShowForm(true)} variant="primary" className="flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nuovo Documento
        </NeumorphicButton>
      </div>

      {/* Templates List */}
      {templates.length > 0 && (
        <NeumorphicCard className="p-6 mb-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            <FileEdit className="w-5 h-5" /> Templates Documenti
          </h2>
          <div className="space-y-3">
            {templates.map(t => (
              <NeumorphicCard key={t.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-[#6b6b6b]">{t.nome_template}</p>
                    <p className="text-xs text-[#9b9b9b]">
                      {t.descrizione || 'Nessuna descrizione'}
                      {t.richiede_firma && ' • Richiede firma'}
                      {!t.attivo && ' • Disattivato'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingTemplate(t);
                      setTemplateFormData({
                        nome_template: t.nome_template,
                        contenuto_template: t.contenuto_template,
                        descrizione: t.descrizione || '',
                        richiede_firma: t.richiede_firma || false,
                        attivo: t.attivo !== false
                      });
                      setShowTemplateForm(true);
                    }} className="nav-button p-2 rounded-lg">
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button onClick={() => { if (confirm('Eliminare questo template?')) deleteTemplateMutation.mutate(t.id); }} className="nav-button p-2 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        </NeumorphicCard>
      )}

      {/* Documents List */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" /> Lista Documenti ({documenti.length})
        </h2>
        {documenti.length === 0 ? (
          <p className="text-center text-[#9b9b9b] py-8">Nessun documento creato</p>
        ) : (
          <div className="space-y-3">
            {documenti.map(doc => (
              <NeumorphicCard key={doc.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#6b6b6b]">{doc.titolo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <p className="text-sm text-[#9b9b9b]">{doc.user_nome}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {doc.richiede_firma ? "Richiede firma" : "Solo lettura"} • {new Date(doc.data_invio).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(doc)}
                    <button onClick={() => setViewingDoc(doc)} className="nav-button p-2 rounded-lg">
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <button onClick={() => { if (confirm("Eliminare questo documento?")) deleteMutation.mutate(doc.id); }} className="nav-button p-2 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">{editingTemplate ? 'Modifica Template' : 'Nuovo Template'}</h2>
              <button onClick={resetTemplateForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitTemplate} className="space-y-4">
              <input type="text" placeholder="Nome template" value={templateFormData.nome_template}
                onChange={e => setTemplateFormData({ ...templateFormData, nome_template: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
              <input type="text" placeholder="Descrizione (opzionale)" value={templateFormData.descrizione}
                onChange={e => setTemplateFormData({ ...templateFormData, descrizione: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tpl-attivo" checked={templateFormData.attivo}
                    onChange={e => setTemplateFormData({ ...templateFormData, attivo: e.target.checked })} className="w-5 h-5" />
                  <label htmlFor="tpl-attivo" className="text-sm text-slate-700">Attivo</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tpl-firma" checked={templateFormData.richiede_firma}
                    onChange={e => setTemplateFormData({ ...templateFormData, richiede_firma: e.target.checked })} className="w-5 h-5" />
                  <label htmlFor="tpl-firma" className="text-sm text-slate-700">Richiede firma</label>
                </div>
              </div>
              <div className="neumorphic-pressed p-3 rounded-xl">
                <p className="text-xs mb-2 font-medium text-slate-600">Variabili disponibili (clicca per inserire):</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map(v => (
                    <button key={v} type="button" onClick={() => insertVariable(v)}
                      className="neumorphic-flat px-2 py-1 rounded text-xs hover:bg-blue-50 transition-colors">
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <textarea ref={templateTextareaRef} value={templateFormData.contenuto_template}
                onChange={e => setTemplateFormData({ ...templateFormData, contenuto_template: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-64 resize-none"
                placeholder="Contenuto del template... Usa {{nome_cognome}} per inserire il nome del dipendente" required />
              <NeumorphicButton type="submit" variant="primary" className="w-full">
                {editingTemplate ? 'Aggiorna Template' : 'Salva Template'}
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {/* Create Document Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Nuovo Documento</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {templates.filter(t => t.attivo !== false).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Template (opzionale)</label>
                  <select value={formData.template_id} onChange={e => handleTemplateSelect(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                    <option value="">Scrivi manualmente...</option>
                    {templates.filter(t => t.attivo !== false).map(t => (
                      <option key={t.id} value={t.id}>{t.nome_template}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Destinatario *</label>
                <select value={formData.user_id} onChange={e => handleUserSelect(e.target.value)}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required>
                  <option value="">Seleziona dipendente...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name || u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Titolo *</label>
                <input type="text" value={formData.titolo}
                  onChange={e => setFormData({ ...formData, titolo: e.target.value })}
                  placeholder="Titolo del documento"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Contenuto *</label>
                <textarea value={formData.contenuto}
                  onChange={e => setFormData({ ...formData, contenuto: e.target.value })}
                  placeholder="Contenuto del documento..."
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-64 resize-none" required />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="richiede-firma" checked={formData.richiede_firma}
                  onChange={e => setFormData({ ...formData, richiede_firma: e.target.checked })} className="w-5 h-5" />
                <label htmlFor="richiede-firma" className="text-sm text-slate-700">Il dipendente deve firmare questo documento</label>
              </div>
              <NeumorphicButton type="submit" variant="primary" className="w-full flex items-center justify-center gap-2">
                <Send className="w-5 h-5" /> {createMutation.isPending ? "Invio..." : "Invia Documento"}
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {/* View Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{viewingDoc.titolo}</h2>
                <p className="text-sm text-slate-500">Inviato a: {viewingDoc.user_nome} • {new Date(viewingDoc.data_invio).toLocaleDateString("it-IT")}</p>
              </div>
              <button onClick={() => setViewingDoc(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="neumorphic-pressed p-6 rounded-xl mb-4">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{viewingDoc.contenuto}</pre>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(viewingDoc)}
              <span className="text-sm text-slate-500">
                {viewingDoc.richiede_firma ? "Richiede firma" : "Solo lettura"}
              </span>
              {viewingDoc.firma_digitale && (
                <span className="text-sm text-green-600">Firma: {viewingDoc.firma_digitale}</span>
              )}
            </div>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}