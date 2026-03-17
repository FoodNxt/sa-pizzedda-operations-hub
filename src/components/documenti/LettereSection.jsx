import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Edit, X, Trash2, Send, CheckCircle, Eye, Download,
  AlertTriangle, FileEdit, Settings, Loader2, BarChart3
} from 'lucide-react';
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function LettereSection() {
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showLetteraForm, setShowLetteraForm] = useState(false);
  const [showAutoConfig, setShowAutoConfig] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    nome_template: '', tipo_lettera: 'lettera_richiamo', contenuto: '', attivo: true
  });
  const [letteraForm, setLetteraForm] = useState({ user_id: '', tipo_lettera: 'lettera_richiamo', template_id: '' });
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [viewingChiusura, setViewingChiusura] = useState(null);
  const [chiusuraPreviewContent, setChiusuraPreviewContent] = useState('');
  const [downloadingPdfAdmin, setDownloadingPdfAdmin] = useState(null);
  const [viewingRichiamo, setViewingRichiamo] = useState(null);

  const downloadLetteraPDFAdmin = async (lettera) => {
    setDownloadingPdfAdmin(lettera.id);
    try {
      const response = await base44.functions.invoke('downloadLetteraPDF', { letteraId: lettera.id });
      if (response.data.success) {
        const byteCharacters = atob(response.data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Errore nel download');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Errore nel download del PDF');
    } finally {
      setDownloadingPdfAdmin(null);
    }
  };

  const queryClient = useQueryClient();
  const { data: templates = [] } = useQuery({
    queryKey: ['lettera-templates'],
    queryFn: () => base44.entities.LetteraRichiamoTemplate.list()
  });
  const { data: lettere = [] } = useQuery({
    queryKey: ['lettere-richiamo'],
    queryFn: async () => {
      const data = await base44.entities.LetteraRichiamo.list('-created_date');
      base44.functions.invoke('processAutomaticChiusuraProcedura', {}).catch((err) =>
        console.log('Background automation check:', err)
      );
      return data;
    }
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users-dipendenti'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter((u) => u.user_type === 'dipendente' || u.user_type === 'user');
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.LetteraRichiamoTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lettera-templates'] }); resetTemplateForm(); }
  });
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LetteraRichiamoTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lettera-templates'] }); resetTemplateForm(); }
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.LetteraRichiamoTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lettera-templates'] })
  });

  const { data: lettereConfig = [] } = useQuery({
    queryKey: ['lettere-config'],
    queryFn: () => base44.entities.LettereConfig.list()
  });
  const currentConfig = lettereConfig[0];

  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (currentConfig) return base44.entities.LettereConfig.update(currentConfig.id, data);
      return base44.entities.LettereConfig.create(data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lettere-config'] }); alert('Configurazione salvata!'); setShowAutoConfig(false); }
  });

  const deleteLetteraMutation = useMutation({
    mutationFn: (id) => base44.entities.LetteraRichiamo.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] }); alert('Lettera eliminata'); }
  });

  const generateLetteraContent = (templateId, userId, richiamoData = null) => {
    const template = templates.find((t) => t.id === templateId);
    const user = users.find((u) => u.id === userId);
    if (!template || !user) return '';
    let contenuto = template.contenuto;
    contenuto = contenuto.replace(/{{nome_dipendente}}/g, user.nome_cognome || user.full_name || user.email);
    contenuto = contenuto.replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'));
    if (richiamoData) {
      if (richiamoData.data_invio) contenuto = contenuto.replace(/{{data_invio_richiamo}}/g, new Date(richiamoData.data_invio).toLocaleDateString('it-IT'));
      if (richiamoData.data_firma) {
        const dataFirma = new Date(richiamoData.data_firma);
        contenuto = contenuto.replace(/{{data_firma_richiamo}}/g, dataFirma.toLocaleDateString('it-IT'));
        const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
        contenuto = contenuto.replace(/{{mese_firma_richiamo}}/g, mesi[dataFirma.getMonth()] + ' ' + dataFirma.getFullYear());
      } else if (richiamoData.data_invio) {
        const dataInvio = new Date(richiamoData.data_invio);
        contenuto = contenuto.replace(/{{data_firma_richiamo}}/g, dataInvio.toLocaleDateString('it-IT'));
        const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
        contenuto = contenuto.replace(/{{mese_firma_richiamo}}/g, mesi[dataInvio.getMonth()] + ' ' + dataInvio.getFullYear());
      }
      if (richiamoData.data_visualizzazione) contenuto = contenuto.replace(/{{data_visualizzazione_richiamo}}/g, new Date(richiamoData.data_visualizzazione).toLocaleDateString('it-IT'));
      if (richiamoData.contenuto_lettera) contenuto = contenuto.replace(/{{testo_lettera_richiamo}}/g, richiamoData.contenuto_lettera);
    }
    return contenuto;
  };

  const handlePreviewLettera = () => {
    if (!letteraForm.template_id || !letteraForm.user_id) { alert('Seleziona dipendente e template'); return; }
    setPreviewContent(generateLetteraContent(letteraForm.template_id, letteraForm.user_id));
    setShowPreview(true);
  };

  const inviaLetteraMutation = useMutation({
    mutationFn: async (data) => {
      const user = users.find((u) => u.id === data.user_id);
      return base44.entities.LetteraRichiamo.create({
        user_id: user.id, user_email: user.email,
        user_name: user.nome_cognome || user.full_name || user.email,
        tipo_lettera: data.tipo_lettera, contenuto_lettera: data.contenuto,
        data_invio: new Date().toISOString(), status: 'inviata'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
      alert('Lettera inviata con successo!');
      setShowLetteraForm(false); setShowPreview(false); setPreviewContent(''); resetLetteraForm();
    }
  });

  const handleSendFromPreview = () => {
    if (!confirm('Confermi l\'invio della lettera?')) return;
    inviaLetteraMutation.mutate({ ...letteraForm, contenuto: previewContent });
  };

  const resetTemplateForm = () => {
    setTemplateForm({ nome_template: '', tipo_lettera: 'lettera_richiamo', contenuto: '', attivo: true });
    setEditingTemplate(null); setShowTemplateForm(false);
  };
  const resetLetteraForm = () => setLetteraForm({ user_id: '', tipo_lettera: 'lettera_richiamo', template_id: '' });

  const handleSubmitTemplate = (e) => {
    e.preventDefault();
    if (editingTemplate) updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
    else createTemplateMutation.mutate(templateForm);
  };

  const chiusuraTemplates = templates.filter((t) => t.tipo_lettera === 'chiusura_procedura' && t.attivo);

  const chartData = [
    { name: 'Richiami Inviati', value: lettere.filter(l => l.tipo_lettera === 'lettera_richiamo' && l.status === 'inviata').length, fill: '#3b82f6' },
    { name: 'Richiami Visualizzati', value: lettere.filter(l => l.tipo_lettera === 'lettera_richiamo' && l.status === 'visualizzata').length, fill: '#f59e0b' },
    { name: 'Richiami Firmati', value: lettere.filter(l => l.tipo_lettera === 'lettera_richiamo' && l.status === 'firmata').length, fill: '#10b981' },
    { name: 'Chiusure Inviate', value: lettere.filter(l => l.tipo_lettera === 'chiusura_procedura' && l.status === 'inviata').length, fill: '#8b5cf6' },
    { name: 'Chiusure Visualizzate', value: lettere.filter(l => l.tipo_lettera === 'chiusura_procedura' && l.status === 'visualizzata').length, fill: '#ec4899' },
    { name: 'Chiusure Firmate', value: lettere.filter(l => l.tipo_lettera === 'chiusura_procedura' && l.status === 'firmata').length, fill: '#14b8a6' }
  ].filter(item => item.value > 0);

  return (
    <>
      {/* Grafico Overview */}
      <NeumorphicCard className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">Stato Lettere</h2>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} angle={-15} textAnchor="end" height={80} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '8px', color: '#f1f5f9' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12"><p className="text-slate-400">Nessuna lettera presente</p></div>
        )}
      </NeumorphicCard>

      <div className="flex gap-3 mb-6 flex-wrap">
        <NeumorphicButton onClick={() => setShowTemplateForm(true)} className="flex items-center gap-2"><Plus className="w-5 h-5" />Nuovo Template</NeumorphicButton>
        <NeumorphicButton onClick={() => setShowLetteraForm(true)} variant="primary" className="flex items-center gap-2"><Send className="w-5 h-5" />Invia Lettera</NeumorphicButton>
        <NeumorphicButton onClick={() => setShowAutoConfig(true)} className="flex items-center gap-2"><Settings className="w-5 h-5" />Automazione</NeumorphicButton>
      </div>

      {/* Configurazione Automazione */}
      {showAutoConfig && (
        <NeumorphicCard className="p-6 mb-6 border-2 border-blue-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-blue-600" />Invio Automatico Chiusura Procedura</h2>
            <button onClick={() => setShowAutoConfig(false)} className="nav-button p-2 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="invio-auto" checked={currentConfig?.invio_automatico_chiusura || false}
                onChange={(e) => saveConfigMutation.mutate({ ...currentConfig, invio_automatico_chiusura: e.target.checked })} className="w-5 h-5" />
              <label htmlFor="invio-auto" className="text-sm font-medium text-slate-700">Invia automaticamente chiusura procedura dopo la visualizzazione della lettera di richiamo</label>
            </div>
            {currentConfig?.invio_automatico_chiusura && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Giorni di attesa dopo la visualizzazione (0 = immediato)</label>
                  <input type="number" min="0" value={currentConfig?.giorni_attesa_chiusura || 0}
                    onChange={(e) => saveConfigMutation.mutate({ ...currentConfig, giorni_attesa_chiusura: parseInt(e.target.value) || 0 })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Template chiusura procedura da usare</label>
                  <select value={currentConfig?.template_chiusura_id || ''}
                    onChange={(e) => saveConfigMutation.mutate({ ...currentConfig, template_chiusura_id: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                    <option value="">-- Seleziona template --</option>
                    {chiusuraTemplates.map((t) => <option key={t.id} value={t.id}>{t.nome_template}</option>)}
                  </select>
                  {chiusuraTemplates.length === 0 && <p className="text-xs text-orange-600 mt-1">⚠️ Nessun template di chiusura procedura disponibile. Creane uno prima.</p>}
                </div>
              </>
            )}
            <div className="neumorphic-flat p-3 rounded-lg bg-blue-50">
              <p className="text-xs text-blue-800"><strong>ℹ️ Come funziona:</strong> Quando un dipendente visualizza per la prima volta una lettera di richiamo, il sistema invierà automaticamente la chiusura procedura dopo i giorni di attesa impostati.</p>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Templates */}
      <NeumorphicCard className="p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><FileEdit className="w-5 h-5" />Templates Lettere</h2>
        {templates.length === 0 ? <p className="text-center text-slate-500 py-4">Nessun template creato</p> : (
          <div className="space-y-3">
            {templates.map((t) => (
              <NeumorphicCard key={t.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800">{t.nome_template}</p>
                    <p className="text-xs text-slate-500">{t.tipo_lettera === 'lettera_richiamo' ? 'Lettera di Richiamo' : 'Chiusura Procedura'}{!t.attivo && ' • Disattivato'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingTemplate(t); setTemplateForm({ nome_template: t.nome_template, tipo_lettera: t.tipo_lettera, contenuto: t.contenuto, attivo: t.attivo !== false }); setShowTemplateForm(true); }} className="nav-button p-2 rounded-lg"><Edit className="w-4 h-4 text-blue-600" /></button>
                    <button onClick={() => deleteTemplateMutation.mutate(t.id)} className="nav-button p-2 rounded-lg"><Trash2 className="w-4 h-4 text-red-600" /></button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {/* Lettere di Richiamo */}
      <NeumorphicCard className="p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-600" />Lettere di Richiamo</h2>
        {(() => {
          const lettereRichiamo = lettere.filter((l) => l.tipo_lettera === 'lettera_richiamo');
          const richiamiInviati = lettereRichiamo.filter((l) => l.status === 'inviata' && !l.data_visualizzazione);
          const richiamiVisualizzati = lettereRichiamo.filter((l) => l.data_visualizzazione && l.status !== 'firmata');
          return (
            <>
              {richiamiInviati.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-blue-600" />Inviate - In Attesa Visualizzazione ({richiamiInviati.length})</h3>
                  <div className="space-y-2">
                    {richiamiInviati.map((richiamo) => (
                      <NeumorphicCard key={richiamo.id} className="p-4 border-l-4 border-blue-400">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-slate-800">{richiamo.user_name}</p>
                            <p className="text-xs text-slate-500 mt-1">Inviata: {richiamo.data_invio ? new Date(richiamo.data_invio).toLocaleDateString('it-IT') : 'N/A'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setViewingRichiamo(richiamo)} className="nav-button p-1.5 rounded-lg"><Eye className="w-3.5 h-3.5 text-purple-600" /></button>
                            <button onClick={() => { if (confirm(`Eliminare la lettera di richiamo per ${richiamo.user_name}?`)) deleteLetteraMutation.mutate(richiamo.id); }} className="nav-button p-1.5 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-600" /></button>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Inviata</span>
                          </div>
                        </div>
                      </NeumorphicCard>
                    ))}
                  </div>
                </div>
              )}
              {richiamiVisualizzati.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2"><Eye className="w-4 h-4 text-purple-600" />Visualizzate - In Attesa Firma ({richiamiVisualizzati.length})</h3>
                  <div className="space-y-2">
                    {richiamiVisualizzati.map((richiamo) => (
                      <NeumorphicCard key={richiamo.id} className="p-4 border-l-4 border-purple-400">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-slate-800">{richiamo.user_name}</p>
                            <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                              <p>Inviata: {richiamo.data_invio ? new Date(richiamo.data_invio).toLocaleDateString('it-IT') : 'N/A'}</p>
                              <p className="text-purple-600 font-medium">Visualizzata: {richiamo.data_visualizzazione ? new Date(richiamo.data_visualizzazione).toLocaleDateString('it-IT') : 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setViewingRichiamo(richiamo)} className="nav-button p-1.5 rounded-lg"><Eye className="w-3.5 h-3.5 text-purple-600" /></button>
                            <button onClick={() => downloadLetteraPDFAdmin(richiamo)} className="nav-button p-1.5 rounded-lg" disabled={downloadingPdfAdmin === richiamo.id}>
                              {downloadingPdfAdmin === richiamo.id ? <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" /> : <Download className="w-3.5 h-3.5 text-blue-600" />}
                            </button>
                            <button onClick={() => { if (confirm(`Eliminare la lettera di richiamo per ${richiamo.user_name}?`)) deleteLetteraMutation.mutate(richiamo.id); }} className="nav-button p-1.5 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-600" /></button>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Visualizzata</span>
                          </div>
                        </div>
                      </NeumorphicCard>
                    ))}
                  </div>
                </div>
              )}
              {lettereRichiamo.length === 0 && <p className="text-center text-slate-500 py-8">Nessuna lettera di richiamo inviata</p>}
            </>
          );
        })()}
      </NeumorphicCard>

      {/* Chiusure Procedura */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" />Chiusure Procedura</h2>
        {(() => {
          const chiusureProcedura = lettere.filter((l) => l.tipo_lettera === 'chiusura_procedura');
          const chiusureInviate = chiusureProcedura.filter((l) => l.status !== 'firmata');
          const chiusureFirmate = chiusureProcedura.filter((l) => l.status === 'firmata');
          return (
            <>
              {chiusureInviate.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-green-600" />Inviate - In Attesa Firma ({chiusureInviate.length})</h3>
                  <div className="space-y-2">
                    {chiusureInviate.map((chiusura) => {
                      const richiamo = lettere.find((l) => l.tipo_lettera === 'lettera_richiamo' && l.user_id === chiusura.user_id);
                      return (
                        <NeumorphicCard key={chiusura.id} className="p-4 border-l-4 border-green-400">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{chiusura.user_name}</p>
                              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                <p>Inviata: {chiusura.data_invio ? new Date(chiusura.data_invio).toLocaleDateString('it-IT') : 'N/A'}</p>
                                {richiamo && <p className="text-orange-600">Richiamo firmato: {richiamo.data_firma ? new Date(richiamo.data_firma).toLocaleDateString('it-IT') : 'N/A'}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setViewingChiusura({ tipo: 'inviata', chiusura })} className="nav-button p-1.5 rounded-lg"><Eye className="w-3.5 h-3.5 text-blue-600" /></button>
                              <button onClick={() => downloadLetteraPDFAdmin(chiusura)} className="nav-button p-1.5 rounded-lg" disabled={downloadingPdfAdmin === chiusura.id}>
                                {downloadingPdfAdmin === chiusura.id ? <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" /> : <Download className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                              <button onClick={() => { if (confirm(`Eliminare la chiusura procedura per ${chiusura.user_name}?`)) deleteLetteraMutation.mutate(chiusura.id); }} className="nav-button p-1.5 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-600" /></button>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Inviata</span>
                            </div>
                          </div>
                        </NeumorphicCard>
                      );
                    })}
                  </div>
                </div>
              )}
              {chiusureFirmate.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Firmate - Procedura Chiusa ({chiusureFirmate.length})</h3>
                  <div className="space-y-2">
                    {chiusureFirmate.map((chiusura) => {
                      const richiamo = lettere.find((l) => l.tipo_lettera === 'lettera_richiamo' && l.user_id === chiusura.user_id);
                      return (
                        <NeumorphicCard key={chiusura.id} className="p-4 border-l-4 border-green-600 bg-green-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{chiusura.user_name}</p>
                              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                <p>Inviata: {chiusura.data_invio ? new Date(chiusura.data_invio).toLocaleDateString('it-IT') : 'N/A'}</p>
                                <p className="text-green-700 font-medium">Firmata: {chiusura.data_firma ? new Date(chiusura.data_firma).toLocaleDateString('it-IT') : 'N/A'}</p>
                                {richiamo && <p className="text-orange-600">Richiamo firmato: {richiamo.data_firma ? new Date(richiamo.data_firma).toLocaleDateString('it-IT') : 'N/A'}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setViewingChiusura({ tipo: 'inviata', chiusura })} className="nav-button p-1.5 rounded-lg"><Eye className="w-3.5 h-3.5 text-blue-600" /></button>
                              <button onClick={() => downloadLetteraPDFAdmin(chiusura)} className="nav-button p-1.5 rounded-lg" disabled={downloadingPdfAdmin === chiusura.id}>
                                {downloadingPdfAdmin === chiusura.id ? <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" /> : <Download className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                              <button onClick={() => { if (confirm(`Eliminare la chiusura procedura per ${chiusura.user_name}?`)) deleteLetteraMutation.mutate(chiusura.id); }} className="nav-button p-1.5 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-600" /></button>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">✓ Firmata</span>
                            </div>
                          </div>
                        </NeumorphicCard>
                      );
                    })}
                  </div>
                </div>
              )}
              {chiusureProcedura.length === 0 && <p className="text-center text-slate-500 py-8">Nessuna chiusura procedura inviata</p>}
            </>
          );
        })()}
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
              <input type="text" placeholder="Nome template" value={templateForm.nome_template} onChange={(e) => setTemplateForm({ ...templateForm, nome_template: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
              <select value={templateForm.tipo_lettera} onChange={(e) => setTemplateForm({ ...templateForm, tipo_lettera: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                <option value="lettera_richiamo">Lettera di Richiamo</option>
                <option value="chiusura_procedura">Chiusura Procedura</option>
              </select>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="lettera-template-attivo" checked={templateForm.attivo} onChange={(e) => setTemplateForm({ ...templateForm, attivo: e.target.checked })} className="w-5 h-5" />
                <label htmlFor="lettera-template-attivo" className="text-sm text-slate-700">Template attivo</label>
              </div>
              <div className="neumorphic-pressed p-3 rounded-xl mb-2">
                <p className="text-xs text-slate-600 mb-2">Variabili disponibili:</p>
                <div className="flex flex-wrap gap-2">
                  {['nome_dipendente', 'data_oggi', ...(templateForm.tipo_lettera === 'chiusura_procedura' ? ['data_invio_richiamo', 'data_firma_richiamo', 'data_visualizzazione_richiamo', 'mese_firma_richiamo', 'testo_lettera_richiamo'] : [])].map((v) => (
                    <button key={v} type="button" onClick={() => setTemplateForm({ ...templateForm, contenuto: (templateForm.contenuto || '') + ` {{${v}}} ` })} className="neumorphic-flat px-2 py-1 rounded text-xs hover:bg-blue-50">{`{{${v}}}`}</button>
                  ))}
                </div>
              </div>
              <textarea value={templateForm.contenuto} onChange={(e) => setTemplateForm({ ...templateForm, contenuto: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-64 resize-none" placeholder="Usa variabili per personalizzare..." required />
              <NeumorphicButton type="submit" variant="primary" className="w-full">{editingTemplate ? 'Aggiorna Template' : 'Salva Template'}</NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {/* Send Letter Form */}
      {showLetteraForm && !showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-2xl w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Invia Lettera</h2>
              <button onClick={() => setShowLetteraForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handlePreviewLettera(); }} className="space-y-4">
              <select value={letteraForm.user_id} onChange={(e) => setLetteraForm({ ...letteraForm, user_id: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required>
                <option value="">Seleziona dipendente...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name || u.email}</option>)}
              </select>
              <select value={letteraForm.tipo_lettera} onChange={(e) => setLetteraForm({ ...letteraForm, tipo_lettera: e.target.value, template_id: '' })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                <option value="lettera_richiamo">Lettera di Richiamo</option>
                <option value="chiusura_procedura">Chiusura Procedura</option>
              </select>
              <select value={letteraForm.template_id} onChange={(e) => setLetteraForm({ ...letteraForm, template_id: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required>
                <option value="">Seleziona template...</option>
                {templates.filter((t) => t.tipo_lettera === letteraForm.tipo_lettera && t.attivo).map((t) => <option key={t.id} value={t.id}>{t.nome_template}</option>)}
              </select>
              <NeumorphicButton type="submit" variant="primary" className="w-full flex items-center justify-center gap-2"><Eye className="w-4 h-4" /> Anteprima</NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Anteprima Lettera</h2>
              <button onClick={() => setShowPreview(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Modifica contenuto prima dell'invio:</label>
              <textarea value={previewContent} onChange={(e) => setPreviewContent(e.target.value)} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-80 resize-none font-mono text-sm" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPreview(false)} className="flex-1 nav-button px-4 py-3 rounded-xl font-medium">Indietro</button>
              <NeumorphicButton onClick={handleSendFromPreview} variant="primary" className="flex-1 flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Invia Lettera</NeumorphicButton>
            </div>
          </NeumorphicCard>
        </div>
      )}

      {/* Viewing Chiusura */}
      {viewingChiusura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">
                {viewingChiusura.tipo === 'preview' ? 'Anteprima Chiusura Procedura' : viewingChiusura.tipo === 'edit' ? 'Modifica Chiusura Procedura' : 'Chiusura Procedura Inviata'}
              </h2>
              <button onClick={() => setViewingChiusura(null)}><X className="w-5 h-5" /></button>
            </div>
            {viewingChiusura.tipo === 'edit' ? (
              <>
                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Template:</label>
                  <select value={viewingChiusura.selectedTemplateId || ''} onChange={(e) => {
                    const content = generateLetteraContent(e.target.value, viewingChiusura.richiamo.user_id, viewingChiusura.richiamo);
                    setViewingChiusura({ ...viewingChiusura, selectedTemplateId: e.target.value, editableContent: content });
                  }} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                    {chiusuraTemplates.map((t) => <option key={t.id} value={t.id}>{t.nome_template}</option>)}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Contenuto:</label>
                  <textarea value={viewingChiusura.editableContent || ''} onChange={(e) => setViewingChiusura({ ...viewingChiusura, editableContent: e.target.value })} className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-80 resize-none font-mono text-sm" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setViewingChiusura(null)} className="flex-1 nav-button px-4 py-3 rounded-xl font-medium">Annulla</button>
                  <NeumorphicButton onClick={async () => {
                    if (!confirm('Confermi l\'invio della chiusura procedura?')) return;
                    const user = users.find((u) => u.id === viewingChiusura.richiamo.user_id);
                    await base44.entities.LetteraRichiamo.create({
                      user_id: user.id, user_email: user.email, user_name: user.nome_cognome || user.full_name || user.email,
                      tipo_lettera: 'chiusura_procedura', contenuto_lettera: viewingChiusura.editableContent,
                      data_invio: new Date().toISOString(), status: 'inviata'
                    });
                    queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
                    setViewingChiusura(null); alert('Chiusura procedura inviata!');
                  }} variant="primary" className="flex-1 flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Invia Chiusura</NeumorphicButton>
                </div>
              </>
            ) : (
              <>
                <div className="neumorphic-pressed p-6 rounded-xl bg-white">
                  <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700">
                    {viewingChiusura.tipo === 'preview' ? chiusuraPreviewContent : viewingChiusura.chiusura?.contenuto_lettera}
                  </pre>
                </div>
                {viewingChiusura.tipo === 'preview' && (
                  <div className="mt-4 neumorphic-flat p-3 rounded-lg bg-blue-50">
                    <p className="text-xs text-blue-700">ℹ️ Questa è un'anteprima. La chiusura verrà inviata automaticamente secondo la configurazione.</p>
                  </div>
                )}
              </>
            )}
          </NeumorphicCard>
        </div>
      )}

      {/* Viewing Richiamo */}
      {viewingRichiamo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Lettera di Richiamo - {viewingRichiamo.user_name}</h2>
              <button onClick={() => setViewingRichiamo(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="neumorphic-pressed p-6 rounded-xl bg-white">
              <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700">{viewingRichiamo.contenuto_lettera}</pre>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}