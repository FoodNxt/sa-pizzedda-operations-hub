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
  const [showElementoDivisaForm, setShowElementoDivisaForm] = useState(false);
  const [editingElemento, setEditingElemento] = useState(null);
  const [showConsegnaForm, setShowConsegnaForm] = useState(false);
  const [selectedDipendente, setSelectedDipendente] = useState(null);
  const [elementoForm, setElementoForm] = useState({
    nome: '',
    tipo: 'Maglietta',
    parte_divisa_completa: false,
    ruoli_assegnati: [],
    descrizione: '',
    taglia_disponibili: [],
    attivo: true
  });
  const [consegnaForm, setConsegnaForm] = useState({
    tipo_consegna: 'elemento_singolo',
    elementi_consegnati: [],
    note: ''
  });
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

  const { data: elementiDivisa = [] } = useQuery({
    queryKey: ['elementi-divisa'],
    queryFn: () => base44.entities.ElementoDivisa.list()
  });

  const { data: consegneDivisa = [] } = useQuery({
    queryKey: ['consegne-divisa'],
    queryFn: () => base44.entities.ConsegnaDivisa.list()
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

  const createElementoMutation = useMutation({
    mutationFn: (data) => base44.entities.ElementoDivisa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elementi-divisa'] });
      resetElementoForm();
    }
  });

  const updateElementoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ElementoDivisa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elementi-divisa'] });
      resetElementoForm();
    }
  });

  const deleteElementoMutation = useMutation({
    mutationFn: (id) => base44.entities.ElementoDivisa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elementi-divisa'] });
    }
  });

  const createConsegnaMutation = useMutation({
    mutationFn: (data) => base44.entities.ConsegnaDivisa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consegne-divisa'] });
      setShowConsegnaForm(false);
      setConsegnaForm({
        tipo_consegna: 'elemento_singolo',
        elementi_consegnati: [],
        note: ''
      });
    }
  });

  const resetElementoForm = () => {
    setElementoForm({
      nome: '',
      tipo: 'Maglietta',
      parte_divisa_completa: false,
      ruoli_assegnati: [],
      descrizione: '',
      taglia_disponibili: [],
      attivo: true
    });
    setEditingElemento(null);
    setShowElementoDivisaForm(false);
  };

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
            <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>Compliance</h1>
          </div>
          <p style={{ color: '#000000' }}>Gestione requisiti e certificazioni dipendenti</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('requisiti')}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === 'requisiti' ?
            'neumorphic-pressed bg-blue-50 text-blue-700' :
            'neumorphic-flat text-slate-600 hover:text-slate-800'
          }`}>
          <Shield className="w-4 h-4" />
          Requisiti
        </button>
        <button
          onClick={() => setActiveTab('divisa')}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === 'divisa' ?
            'neumorphic-pressed bg-blue-50 text-blue-700' :
            'neumorphic-flat text-slate-600 hover:text-slate-800'
          }`}>
          <Users className="w-4 h-4" />
          Divisa
        </button>
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

      {/* TAB DIVISA */}
      {activeTab === 'divisa' && (
        <>
          {/* Header Divisa */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Gestione Divisa</h2>
            <NeumorphicButton
              onClick={() => setShowElementoDivisaForm(true)}
              variant="primary"
              className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nuovo Elemento
            </NeumorphicButton>
          </div>

          {/* Form Elemento Divisa */}
          {showElementoDivisaForm && (
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingElemento ? 'Modifica Elemento' : 'Nuovo Elemento Divisa'}
                </h3>
                <button onClick={resetElementoForm} className="text-slate-500">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (editingElemento) {
                  updateElementoMutation.mutate({ id: editingElemento.id, data: elementoForm });
                } else {
                  createElementoMutation.mutate(elementoForm);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      Nome Elemento <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={elementoForm.nome}
                      onChange={(e) => setElementoForm({ ...elementoForm, nome: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                      placeholder="Es. Maglietta nera logo"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      Tipo <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={elementoForm.tipo}
                      onChange={(e) => setElementoForm({ ...elementoForm, tipo: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                      <option value="Maglietta">Maglietta</option>
                      <option value="Grembiule">Grembiule</option>
                      <option value="Pantaloni">Pantaloni</option>
                      <option value="Scarpe">Scarpe</option>
                      <option value="Cappello">Cappello</option>
                      <option value="Altro">Altro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Descrizione</label>
                  <textarea
                    value={elementoForm.descrizione}
                    onChange={(e) => setElementoForm({ ...elementoForm, descrizione: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-20 resize-none"
                    placeholder="Descrizione elemento..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="parte_divisa_completa"
                    checked={elementoForm.parte_divisa_completa}
                    onChange={(e) => setElementoForm({ ...elementoForm, parte_divisa_completa: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="parte_divisa_completa" className="text-sm font-medium text-slate-700">
                    Fa parte della divisa completa
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Ruoli Assegnati</label>
                  <div className="flex flex-wrap gap-2">
                    {['Pizzaiolo', 'Cassiere', 'Store Manager', 'Altro'].map((ruolo) => (
                      <button
                        key={ruolo}
                        type="button"
                        onClick={() => {
                          const current = elementoForm.ruoli_assegnati;
                          setElementoForm({
                            ...elementoForm,
                            ruoli_assegnati: current.includes(ruolo) ?
                              current.filter((r) => r !== ruolo) :
                              [...current, ruolo]
                          });
                        }}
                        className={`px-3 py-2 rounded-xl text-sm transition-all ${
                          elementoForm.ruoli_assegnati.includes(ruolo) ?
                          'bg-blue-500 text-white' :
                          'neumorphic-flat text-slate-700'
                        }`}>
                        {ruolo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton type="button" onClick={resetElementoForm}>
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton type="submit" variant="primary" className="flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    {editingElemento ? 'Aggiorna' : 'Crea'} Elemento
                  </NeumorphicButton>
                </div>
              </form>
            </NeumorphicCard>
          )}

          {/* Lista Elementi Divisa */}
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Elementi Divisa</h3>
            {elementiDivisa.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nessun elemento configurato</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {elementiDivisa.map((elemento) => (
                  <div key={elemento.id} className="neumorphic-flat p-4 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800">{elemento.nome}</h4>
                        <p className="text-xs text-slate-500">{elemento.tipo}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingElemento(elemento);
                            setElementoForm({
                              nome: elemento.nome,
                              tipo: elemento.tipo,
                              parte_divisa_completa: elemento.parte_divisa_completa || false,
                              ruoli_assegnati: elemento.ruoli_assegnati || [],
                              descrizione: elemento.descrizione || '',
                              taglia_disponibili: elemento.taglia_disponibili || [],
                              attivo: elemento.attivo !== false
                            });
                            setShowElementoDivisaForm(true);
                          }}
                          className="p-1 rounded hover:bg-blue-50">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Eliminare questo elemento?')) {
                              deleteElementoMutation.mutate(elemento.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-red-50">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    {elemento.parte_divisa_completa && (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs mb-2">
                        Divisa Completa
                      </span>
                    )}
                    {elemento.ruoli_assegnati?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {elemento.ruoli_assegnati.map((r) => (
                          <span key={r} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </NeumorphicCard>

          {/* Consegna Divisa */}
          <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Consegna Divisa a Dipendente</h3>
              <NeumorphicButton
                onClick={() => setShowConsegnaForm(!showConsegnaForm)}
                variant="primary"
                className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Nuova Consegna
              </NeumorphicButton>
            </div>

            {showConsegnaForm && (
              <div className="neumorphic-pressed p-4 rounded-xl mb-4">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const dipendente = dipendenti.find(d => d.id === selectedDipendente);
                  createConsegnaMutation.mutate({
                    dipendente_id: selectedDipendente,
                    dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || dipendente?.email,
                    data_consegna: new Date().toISOString(),
                    tipo_consegna: consegnaForm.tipo_consegna,
                    elementi_consegnati: consegnaForm.elementi_consegnati,
                    consegnato_da: currentUser?.email || '',
                    note: consegnaForm.note
                  });
                }} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Dipendente</label>
                    <select
                      value={selectedDipendente || ''}
                      onChange={(e) => setSelectedDipendente(e.target.value)}
                      required
                      className="w-full neumorphic-flat px-4 py-3 rounded-xl outline-none">
                      <option value="">Seleziona dipendente...</option>
                      {dipendenti.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nome_cognome || d.full_name || d.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo Consegna</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConsegnaForm({ ...consegnaForm, tipo_consegna: 'elemento_singolo', elementi_consegnati: [] });
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          consegnaForm.tipo_consegna === 'elemento_singolo' ?
                          'bg-blue-500 text-white' :
                          'neumorphic-flat text-slate-700'
                        }`}>
                        Elemento Singolo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const divisaCompleta = elementiDivisa
                            .filter(e => e.parte_divisa_completa && e.attivo)
                            .map(e => ({ elemento_id: e.id, elemento_nome: e.nome, taglia: '', quantita: 1 }));
                          setConsegnaForm({ ...consegnaForm, tipo_consegna: 'divisa_completa', elementi_consegnati: divisaCompleta });
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          consegnaForm.tipo_consegna === 'divisa_completa' ?
                          'bg-green-500 text-white' :
                          'neumorphic-flat text-slate-700'
                        }`}>
                        Divisa Completa
                      </button>
                    </div>
                  </div>

                  {consegnaForm.tipo_consegna === 'elemento_singolo' && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Seleziona Elementi</label>
                      <div className="space-y-2">
                        {elementiDivisa.filter(e => e.attivo).map((elemento) => {
                          const isSelected = consegnaForm.elementi_consegnati.some(ec => ec.elemento_id === elemento.id);
                          return (
                            <div key={elemento.id} className="neumorphic-flat p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setConsegnaForm({
                                        ...consegnaForm,
                                        elementi_consegnati: [
                                          ...consegnaForm.elementi_consegnati,
                                          { elemento_id: elemento.id, elemento_nome: elemento.nome, taglia: '', quantita: 1 }
                                        ]
                                      });
                                    } else {
                                      setConsegnaForm({
                                        ...consegnaForm,
                                        elementi_consegnati: consegnaForm.elementi_consegnati.filter(ec => ec.elemento_id !== elemento.id)
                                      });
                                    }
                                  }}
                                  className="w-5 h-5"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-slate-800">{elemento.nome}</p>
                                  <p className="text-xs text-slate-500">{elemento.tipo}</p>
                                </div>
                                {isSelected && (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Taglia"
                                      value={consegnaForm.elementi_consegnati.find(ec => ec.elemento_id === elemento.id)?.taglia || ''}
                                      onChange={(e) => {
                                        setConsegnaForm({
                                          ...consegnaForm,
                                          elementi_consegnati: consegnaForm.elementi_consegnati.map(ec =>
                                            ec.elemento_id === elemento.id ? { ...ec, taglia: e.target.value } : ec
                                          )
                                        });
                                      }}
                                      className="w-20 neumorphic-pressed px-2 py-1 rounded text-sm"
                                    />
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="Qty"
                                      value={consegnaForm.elementi_consegnati.find(ec => ec.elemento_id === elemento.id)?.quantita || 1}
                                      onChange={(e) => {
                                        setConsegnaForm({
                                          ...consegnaForm,
                                          elementi_consegnati: consegnaForm.elementi_consegnati.map(ec =>
                                            ec.elemento_id === elemento.id ? { ...ec, quantita: parseInt(e.target.value) || 1 } : ec
                                          )
                                        });
                                      }}
                                      className="w-16 neumorphic-pressed px-2 py-1 rounded text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {consegnaForm.tipo_consegna === 'divisa_completa' && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Elementi Divisa Completa</label>
                      <div className="space-y-2">
                        {consegnaForm.elementi_consegnati.map((ec, idx) => {
                          const elemento = elementiDivisa.find(e => e.id === ec.elemento_id);
                          return (
                            <div key={idx} className="neumorphic-flat p-3 rounded-lg flex items-center justify-between">
                              <div>
                                <p className="font-medium text-slate-800">{ec.elemento_nome}</p>
                                <p className="text-xs text-slate-500">{elemento?.tipo}</p>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Taglia"
                                  value={ec.taglia || ''}
                                  onChange={(e) => {
                                    const newElementi = [...consegnaForm.elementi_consegnati];
                                    newElementi[idx] = { ...newElementi[idx], taglia: e.target.value };
                                    setConsegnaForm({ ...consegnaForm, elementi_consegnati: newElementi });
                                  }}
                                  className="w-20 neumorphic-pressed px-2 py-1 rounded text-sm"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>
                    <input
                      type="text"
                      value={consegnaForm.note}
                      onChange={(e) => setConsegnaForm({ ...consegnaForm, note: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                      placeholder="Note sulla consegna..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <NeumorphicButton type="button" onClick={() => {
                      setShowConsegnaForm(false);
                      setConsegnaForm({ tipo_consegna: 'elemento_singolo', elementi_consegnati: [], note: '' });
                      setSelectedDipendente(null);
                    }}>
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton
                      type="submit"
                      variant="primary"
                      disabled={!selectedDipendente || consegnaForm.elementi_consegnati.length === 0}
                      className="flex items-center gap-2">
                      <Save className="w-5 h-5" />
                      Registra Consegna
                    </NeumorphicButton>
                  </div>
                </form>
              </div>
            )}

            {/* Storico Consegne */}
            <div className="mt-6">
              <h4 className="text-base font-bold text-slate-800 mb-3">Storico Consegne</h4>
              {consegneDivisa.length === 0 ? (
                <p className="text-center text-slate-500 py-4">Nessuna consegna registrata</p>
              ) : (
                <div className="space-y-2">
                  {consegneDivisa.sort((a, b) => new Date(b.data_consegna) - new Date(a.data_consegna)).map((consegna) => (
                    <div key={consegna.id} className="neumorphic-flat p-4 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-blue-600" />
                            <p className="font-bold text-slate-800">{consegna.dipendente_nome}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {moment(consegna.data_consegna).format('DD/MM/YYYY HH:mm')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          consegna.tipo_consegna === 'divisa_completa' ?
                          'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {consegna.tipo_consegna === 'divisa_completa' ? 'Divisa Completa' : 'Elemento Singolo'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-slate-600 font-medium mb-1">Elementi consegnati:</p>
                        <div className="flex flex-wrap gap-1">
                          {consegna.elementi_consegnati?.map((ec, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                              {ec.elemento_nome}
                              {ec.taglia && ` (${ec.taglia})`}
                              {ec.quantita > 1 && ` x${ec.quantita}`}
                            </span>
                          ))}
                        </div>
                      </div>
                      {consegna.note && (
                        <p className="text-xs text-slate-500 mt-2 italic">{consegna.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </NeumorphicCard>
        </>
      )}

      {/* TAB REQUISITI */}
      {activeTab === 'requisiti' && (
        <>
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

          {/* Button Nuovo Requisito */}
          <div className="flex justify-end">
            <NeumorphicButton
              onClick={() => setShowRequisitoForm(true)}
              variant="primary"
              className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nuovo Requisito
            </NeumorphicButton>
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
        </>
      )}
    </div>);

}