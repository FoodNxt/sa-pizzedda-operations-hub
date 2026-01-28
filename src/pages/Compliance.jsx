import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Users,
  Store,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  ChevronDown,
  ChevronRight,
  User } from
"lucide-react";
import moment from "moment";

export default function Compliance() {
  const [activeTab, setActiveTab] = useState('requisiti');
  const [showRequisitoForm, setShowRequisitoForm] = useState(false);
  const [editingRequisito, setEditingRequisito] = useState(null);
  const [showAssegnazioneForm, setShowAssegnazioneForm] = useState(null);
  const [expandedRequisito, setExpandedRequisito] = useState(null);
  const [requisitoForm, setRequisitoForm] = useState({
    nome: '',
    descrizione: '',
    tipo_copertura: 'tutti',
    numero_richiesto: '',
    ha_scadenza: false,
    giorni_preavviso_scadenza: 30,
    ruoli_applicabili: [],
    stores_applicabili: [],
    attivo: true
  });
  const [assegnazioneForm, setAssegnazioneForm] = useState({
    user_id: '',
    data_conseguimento: '',
    data_scadenza: '',
    documento_url: '',
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: requisiti = [], isLoading } = useQuery({
    queryKey: ['requisiti-compliance'],
    queryFn: () => base44.entities.RequisitoCompliance.list()
  });

  const { data: assegnazioni = [] } = useQuery({
    queryKey: ['dipendenti-compliance'],
    queryFn: () => base44.entities.DipendenteCompliance.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-compliance'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores-compliance'],
    queryFn: () => base44.entities.Store.list()
  });

  const dipendenti = users.filter((u) => u.user_type === 'dipendente' || u.user_type === 'user');

  // Mutations
  const createRequisitoMutation = useMutation({
    mutationFn: (data) => base44.entities.RequisitoCompliance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisiti-compliance'] });
      resetRequisitoForm();
    }
  });

  const updateRequisitoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RequisitoCompliance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisiti-compliance'] });
      resetRequisitoForm();
    }
  });

  const deleteRequisitoMutation = useMutation({
    mutationFn: (id) => base44.entities.RequisitoCompliance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisiti-compliance'] });
    }
  });

  const createAssegnazioneMutation = useMutation({
    mutationFn: (data) => base44.entities.DipendenteCompliance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dipendenti-compliance'] });
      setShowAssegnazioneForm(null);
      setAssegnazioneForm({ user_id: '', data_conseguimento: '', data_scadenza: '', documento_url: '', note: '' });
    }
  });

  const deleteAssegnazioneMutation = useMutation({
    mutationFn: (id) => base44.entities.DipendenteCompliance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dipendenti-compliance'] });
    }
  });

  const resetRequisitoForm = () => {
    setRequisitoForm({
      nome: '',
      descrizione: '',
      tipo_copertura: 'tutti',
      numero_richiesto: '',
      ha_scadenza: false,
      giorni_preavviso_scadenza: 30,
      ruoli_applicabili: [],
      stores_applicabili: [],
      attivo: true
    });
    setEditingRequisito(null);
    setShowRequisitoForm(false);
  };

  const handleEditRequisito = (requisito) => {
    setEditingRequisito(requisito);
    setRequisitoForm({
      nome: requisito.nome,
      descrizione: requisito.descrizione || '',
      tipo_copertura: requisito.tipo_copertura,
      numero_richiesto: requisito.numero_richiesto || '',
      ha_scadenza: requisito.ha_scadenza || false,
      giorni_preavviso_scadenza: requisito.giorni_preavviso_scadenza || 30,
      ruoli_applicabili: requisito.ruoli_applicabili || [],
      stores_applicabili: requisito.stores_applicabili || [],
      attivo: requisito.attivo !== false
    });
    setShowRequisitoForm(true);
  };

  const handleSubmitRequisito = (e) => {
    e.preventDefault();
    const data = {
      ...requisitoForm,
      numero_richiesto: requisitoForm.tipo_copertura === 'numero_specifico' ? parseInt(requisitoForm.numero_richiesto) : null
    };
    if (editingRequisito) {
      updateRequisitoMutation.mutate({ id: editingRequisito.id, data });
    } else {
      createRequisitoMutation.mutate(data);
    }
  };

  const handleSubmitAssegnazione = (requisitoId, requisitoNome, haScadenza) => {
    const user = dipendenti.find((u) => u.id === assegnazioneForm.user_id);
    const data = {
      requisito_id: requisitoId,
      requisito_nome: requisitoNome,
      user_id: assegnazioneForm.user_id,
      user_nome: user?.nome_cognome || user?.full_name || user?.email,
      data_conseguimento: assegnazioneForm.data_conseguimento,
      data_scadenza: haScadenza ? assegnazioneForm.data_scadenza : null,
      documento_url: assegnazioneForm.documento_url || null,
      note: assegnazioneForm.note || null,
      stato: 'valido'
    };
    createAssegnazioneMutation.mutate(data);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAssegnazioneForm({ ...assegnazioneForm, documento_url: file_url });
  };

  // Calculate compliance status per requisito
  const getComplianceStatus = (requisito) => {
    const requisitoAssegnazioni = assegnazioni.filter((a) => a.requisito_id === requisito.id);

    // Filtra dipendenti applicabili
    let dipendentiApplicabili = dipendenti;
    if (requisito.ruoli_applicabili?.length > 0) {
      dipendentiApplicabili = dipendenti.filter((d) =>
      d.ruoli_dipendente?.some((r) => requisito.ruoli_applicabili.includes(r))
      );
    }

    const totaleRichiesto = requisito.tipo_copertura === 'tutti' ?
    dipendentiApplicabili.length :
    requisito.tipo_copertura === 'uno_per_locale' ?
    requisito.stores_applicabili?.length || stores.length :
    requisito.numero_richiesto || 0;

    const validi = requisitoAssegnazioni.filter((a) => {
      if (!requisito.ha_scadenza) return true;
      if (!a.data_scadenza) return true;
      return moment(a.data_scadenza).isAfter(moment());
    });

    const inScadenza = requisitoAssegnazioni.filter((a) => {
      if (!requisito.ha_scadenza || !a.data_scadenza) return false;
      const giorniAllaScadenza = moment(a.data_scadenza).diff(moment(), 'days');
      return giorniAllaScadenza > 0 && giorniAllaScadenza <= (requisito.giorni_preavviso_scadenza || 30);
    });

    const scaduti = requisitoAssegnazioni.filter((a) => {
      if (!requisito.ha_scadenza || !a.data_scadenza) return false;
      return moment(a.data_scadenza).isBefore(moment());
    });

    const copertura = totaleRichiesto > 0 ? Math.round(validi.length / totaleRichiesto * 100) : 100;

    return {
      totaleRichiesto,
      validi: validi.length,
      inScadenza: inScadenza.length,
      scaduti: scaduti.length,
      copertura,
      assegnazioni: requisitoAssegnazioni
    };
  };

  // Stats
  const stats = useMemo(() => {
    const attivi = requisiti.filter((r) => r.attivo !== false);
    let totaleCopertura = 0;
    let requisitiConProblemi = 0;
    let totaleInScadenza = 0;
    let totaleScaduti = 0;

    attivi.forEach((r) => {
      const status = getComplianceStatus(r);
      totaleCopertura += status.copertura;
      if (status.copertura < 100) requisitiConProblemi++;
      totaleInScadenza += status.inScadenza;
      totaleScaduti += status.scaduti;
    });

    return {
      totaleRequisiti: attivi.length,
      coperturaMedia: attivi.length > 0 ? Math.round(totaleCopertura / attivi.length) : 100,
      requisitiConProblemi,
      totaleInScadenza,
      totaleScaduti
    };
  }, [requisiti, assegnazioni, dipendenti]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-10 h-10 text-blue-600" />
            <h1 className="text-slate-50 text-3xl font-bold">Compliance</h1>
          </div>
          <p className="text-slate-50">Gestione requisiti e certificazioni dipendenti</p>
        </div>
        <NeumorphicButton
          onClick={() => setShowRequisitoForm(true)}
          variant="primary"
          className="flex items-center gap-2">

          <Plus className="w-5 h-5" />
          Nuovo Requisito
        </NeumorphicButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <NeumorphicCard className="p-4 text-center">
          <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{stats.totaleRequisiti}</p>
          <p className="text-xs text-slate-500">Requisiti Attivi</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-4 text-center">
          <p className={`text-2xl font-bold ${stats.coperturaMedia >= 100 ? 'text-green-600' : stats.coperturaMedia >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {stats.coperturaMedia}%
          </p>
          <p className="text-xs text-slate-500">Copertura Media</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.requisitiConProblemi}</p>
          <p className="text-xs text-slate-500">Requisiti Incompleti</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.totaleInScadenza}</p>
          <p className="text-xs text-slate-500">In Scadenza</p>
        </NeumorphicCard>
        <NeumorphicCard className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.totaleScaduti}</p>
          <p className="text-xs text-slate-500">Scaduti</p>
        </NeumorphicCard>
      </div>

      {/* Form Nuovo Requisito */}
      {showRequisitoForm &&
      <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              {editingRequisito ? 'Modifica Requisito' : 'Nuovo Requisito'}
            </h2>
            <button onClick={resetRequisitoForm} className="text-slate-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmitRequisito} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Nome Requisito <span className="text-red-600">*</span>
                </label>
                <input
                type="text"
                required
                value={requisitoForm.nome}
                onChange={(e) => setRequisitoForm({ ...requisitoForm, nome: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                placeholder="Es. Corso HACCP" />

              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Tipo Copertura <span className="text-red-600">*</span>
                </label>
                <select
                value={requisitoForm.tipo_copertura}
                onChange={(e) => setRequisitoForm({ ...requisitoForm, tipo_copertura: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">

                  <option value="tutti">Tutti i dipendenti</option>
                  <option value="uno_per_locale">Uno per locale</option>
                  <option value="numero_specifico">Numero specifico</option>
                </select>
              </div>
            </div>

            {requisitoForm.tipo_copertura === 'numero_specifico' &&
          <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Numero Dipendenti Richiesti
                </label>
                <input
              type="number"
              min="1"
              value={requisitoForm.numero_richiesto}
              onChange={(e) => setRequisitoForm({ ...requisitoForm, numero_richiesto: e.target.value })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />

              </div>
          }

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Descrizione</label>
              <textarea
              value={requisitoForm.descrizione}
              onChange={(e) => setRequisitoForm({ ...requisitoForm, descrizione: e.target.value })}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-20 resize-none"
              placeholder="Descrizione dettagliata del requisito..." />

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input
                type="checkbox"
                id="ha_scadenza"
                checked={requisitoForm.ha_scadenza}
                onChange={(e) => setRequisitoForm({ ...requisitoForm, ha_scadenza: e.target.checked })}
                className="w-5 h-5" />

                <label htmlFor="ha_scadenza" className="text-sm font-medium text-slate-700">
                  Ha una data di scadenza
                </label>
              </div>
              {requisitoForm.ha_scadenza &&
            <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Giorni preavviso scadenza
                  </label>
                  <input
                type="number"
                min="1"
                value={requisitoForm.giorni_preavviso_scadenza}
                onChange={(e) => setRequisitoForm({ ...requisitoForm, giorni_preavviso_scadenza: parseInt(e.target.value) })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />

                </div>
            }
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Ruoli Applicabili (vuoto = tutti)
              </label>
              <div className="flex flex-wrap gap-2">
                {['Pizzaiolo', 'Cassiere', 'Store Manager'].map((ruolo) =>
              <button
                key={ruolo}
                type="button"
                onClick={() => {
                  const current = requisitoForm.ruoli_applicabili;
                  setRequisitoForm({
                    ...requisitoForm,
                    ruoli_applicabili: current.includes(ruolo) ?
                    current.filter((r) => r !== ruolo) :
                    [...current, ruolo]
                  });
                }}
                className={`px-3 py-2 rounded-xl text-sm transition-all ${
                requisitoForm.ruoli_applicabili.includes(ruolo) ?
                'bg-blue-500 text-white' :
                'neumorphic-flat text-slate-700'}`
                }>

                    {ruolo}
                  </button>
              )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Store Applicabili (vuoto = tutti)
              </label>
              <div className="flex flex-wrap gap-2">
                {stores.map((store) =>
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  const current = requisitoForm.stores_applicabili;
                  setRequisitoForm({
                    ...requisitoForm,
                    stores_applicabili: current.includes(store.id) ?
                    current.filter((s) => s !== store.id) :
                    [...current, store.id]
                  });
                }}
                className={`px-3 py-2 rounded-xl text-sm transition-all ${
                requisitoForm.stores_applicabili.includes(store.id) ?
                'bg-purple-500 text-white' :
                'neumorphic-flat text-slate-700'}`
                }>

                    {store.name}
                  </button>
              )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <NeumorphicButton type="button" onClick={resetRequisitoForm}>
                Annulla
              </NeumorphicButton>
              <NeumorphicButton type="submit" variant="primary" className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                {editingRequisito ? 'Aggiorna' : 'Crea'} Requisito
              </NeumorphicButton>
            </div>
          </form>
        </NeumorphicCard>
      }

      {/* Lista Requisiti */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Requisiti</h2>

        {isLoading ?
        <p className="text-center text-slate-500 py-8">Caricamento...</p> :
        requisiti.length === 0 ?
        <div className="text-center py-12">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessun requisito configurato</p>
          </div> :

        <div className="space-y-4">
            {requisiti.map((requisito) => {
            const status = getComplianceStatus(requisito);
            const isExpanded = expandedRequisito === requisito.id;

            return (
              <div key={requisito.id} className={`neumorphic-flat rounded-xl overflow-hidden ${requisito.attivo === false ? 'opacity-50' : ''}`}>
                  <div
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedRequisito(isExpanded ? null : requisito.id)}>

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                        <div>
                          <h3 className="font-bold text-slate-800">{requisito.nome}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                          requisito.tipo_copertura === 'tutti' ? 'bg-blue-100 text-blue-700' :
                          requisito.tipo_copertura === 'uno_per_locale' ? 'bg-purple-100 text-purple-700' :
                          'bg-orange-100 text-orange-700'}`
                          }>
                              {requisito.tipo_copertura === 'tutti' ? 'Tutti i dipendenti' :
                            requisito.tipo_copertura === 'uno_per_locale' ? 'Uno per locale' :
                            `${requisito.numero_richiesto} dipendenti`}
                            </span>
                            {requisito.ha_scadenza &&
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Con scadenza
                              </span>
                          }
                            {requisito.ruoli_applicabili?.map((r) =>
                          <span key={r} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{r}</span>
                          )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Copertura */}
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                        status.copertura >= 100 ? 'text-green-600' :
                        status.copertura >= 70 ? 'text-yellow-600' : 'text-red-600'}`
                        }>
                            {status.copertura}%
                          </div>
                          <p className="text-xs text-slate-500">{status.validi}/{status.totaleRichiesto} coperti</p>
                        </div>

                        {/* Alerts */}
                        {status.inScadenza > 0 &&
                      <div className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {status.inScadenza} in scadenza
                          </div>
                      }
                        {status.scaduti > 0 &&
                      <div className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {status.scaduti} scaduti
                          </div>
                      }

                        {/* Actions */}
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                          onClick={() => handleEditRequisito(requisito)}
                          className="nav-button p-2 rounded-lg hover:bg-blue-50">

                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                          onClick={() => {
                            if (confirm('Eliminare questo requisito?')) {
                              deleteRequisitoMutation.mutate(requisito.id);
                            }
                          }}
                          className="nav-button p-2 rounded-lg hover:bg-red-50">

                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded &&
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                      {requisito.descrizione &&
                  <p className="text-sm text-slate-600 mb-4">{requisito.descrizione}</p>
                  }

                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-700">Dipendenti con questo requisito</h4>
                        <NeumorphicButton
                      onClick={() => setShowAssegnazioneForm(requisito.id)}
                      className="text-sm flex items-center gap-1">

                          <Plus className="w-4 h-4" />
                          Aggiungi
                        </NeumorphicButton>
                      </div>

                      {/* Form Assegnazione */}
                      {showAssegnazioneForm === requisito.id &&
                  <div className="neumorphic-pressed p-4 rounded-xl mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium text-slate-600 mb-1 block">Dipendente</label>
                              <select
                          value={assegnazioneForm.user_id}
                          onChange={(e) => setAssegnazioneForm({ ...assegnazioneForm, user_id: e.target.value })}
                          className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none text-sm">

                                <option value="">Seleziona...</option>
                                {dipendenti.filter((d) => !status.assegnazioni.some((a) => a.user_id === d.id)).map((d) =>
                          <option key={d.id} value={d.id}>{d.nome_cognome || d.full_name || d.email}</option>
                          )}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600 mb-1 block">Data Conseguimento</label>
                              <input
                          type="date"
                          value={assegnazioneForm.data_conseguimento}
                          onChange={(e) => setAssegnazioneForm({ ...assegnazioneForm, data_conseguimento: e.target.value })}
                          className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none text-sm" />

                            </div>
                            {requisito.ha_scadenza &&
                      <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Data Scadenza</label>
                                <input
                          type="date"
                          value={assegnazioneForm.data_scadenza}
                          onChange={(e) => setAssegnazioneForm({ ...assegnazioneForm, data_scadenza: e.target.value })}
                          className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none text-sm" />

                              </div>
                      }
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="text-xs font-medium text-slate-600 mb-1 block">Documento (opzionale)</label>
                              <div className="flex gap-2">
                                <input
                            type="file"
                            onChange={handleFileUpload}
                            className="flex-1 text-sm"
                            accept=".pdf,.jpg,.png" />

                                {assegnazioneForm.documento_url &&
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          }
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600 mb-1 block">Note</label>
                              <input
                          type="text"
                          value={assegnazioneForm.note}
                          onChange={(e) => setAssegnazioneForm({ ...assegnazioneForm, note: e.target.value })}
                          className="w-full neumorphic-flat px-3 py-2 rounded-lg outline-none text-sm"
                          placeholder="Note..." />

                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <NeumorphicButton
                        onClick={() => setShowAssegnazioneForm(null)}
                        className="text-sm">

                              Annulla
                            </NeumorphicButton>
                            <NeumorphicButton
                        onClick={() => handleSubmitAssegnazione(requisito.id, requisito.nome, requisito.ha_scadenza)}
                        variant="primary"
                        className="text-sm"
                        disabled={!assegnazioneForm.user_id || !assegnazioneForm.data_conseguimento}>

                              Salva
                            </NeumorphicButton>
                          </div>
                        </div>
                  }

                      {/* Lista Assegnazioni */}
                      {status.assegnazioni.length === 0 ?
                  <p className="text-sm text-slate-500 italic">Nessun dipendente assegnato</p> :

                  <div className="space-y-2">
                          {status.assegnazioni.map((ass) => {
                      const isScaduto = requisito.ha_scadenza && ass.data_scadenza && moment(ass.data_scadenza).isBefore(moment());
                      const isInScadenza = requisito.ha_scadenza && ass.data_scadenza &&
                      moment(ass.data_scadenza).diff(moment(), 'days') > 0 &&
                      moment(ass.data_scadenza).diff(moment(), 'days') <= (requisito.giorni_preavviso_scadenza || 30);

                      return (
                        <div key={ass.id} className={`flex items-center justify-between p-3 rounded-lg ${
                        isScaduto ? 'bg-red-50 border border-red-200' :
                        isInScadenza ? 'bg-orange-50 border border-orange-200' :
                        'bg-white border border-slate-200'}`
                        }>
                                <div className="flex items-center gap-3">
                                  <User className="w-4 h-4 text-slate-500" />
                                  <div>
                                    <p className="font-medium text-slate-800 text-sm">{ass.user_nome}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <span>Conseguito: {moment(ass.data_conseguimento).format('DD/MM/YYYY')}</span>
                                      {ass.data_scadenza &&
                                <span className={isScaduto ? 'text-red-600 font-bold' : isInScadenza ? 'text-orange-600 font-bold' : ''}>
                                          Scade: {moment(ass.data_scadenza).format('DD/MM/YYYY')}
                                        </span>
                                }
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isScaduto && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Scaduto</span>}
                                  {isInScadenza && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">In scadenza</span>}
                                  {ass.documento_url &&
                            <a href={ass.documento_url} target="_blank" rel="noopener noreferrer" className="nav-button p-1 rounded">
                                      <FileText className="w-4 h-4 text-blue-600" />
                                    </a>
                            }
                                  <button
                              onClick={() => {
                                if (confirm('Rimuovere questa assegnazione?')) {
                                  deleteAssegnazioneMutation.mutate(ass.id);
                                }
                              }}
                              className="nav-button p-1 rounded hover:bg-red-50">

                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </div>);

                    })}
                        </div>
                  }
                    </div>
                }
                </div>);

          })}
          </div>
        }
      </NeumorphicCard>
    </div>);

}