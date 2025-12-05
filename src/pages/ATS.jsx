import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { 
  UserPlus, Users, Phone, Edit, Trash2, Save, X, Loader2, Store, Briefcase, 
  Calendar, Clock, User, CheckCircle, XCircle, Plus, Link as LinkIcon, 
  ClipboardList, ChevronDown, ChevronRight, Eye
} from "lucide-react";
import moment from "moment";

const POSIZIONI = ["Pizzaiolo", "Cassiere", "Store Manager"];
const STATI = [
  { value: "nuovo", label: "Nuovo", color: "bg-blue-100 text-blue-800 border-blue-300", headerColor: "bg-blue-600" },
  { value: "in_valutazione", label: "In Valutazione", color: "bg-yellow-100 text-yellow-800 border-yellow-300", headerColor: "bg-yellow-500" },
  { value: "prova_programmata", label: "Prova Programmata", color: "bg-purple-100 text-purple-800 border-purple-300", headerColor: "bg-purple-600" },
  { value: "assunto", label: "Assunto", color: "bg-green-100 text-green-800 border-green-300", headerColor: "bg-green-600" },
  { value: "scartato", label: "Scartato", color: "bg-red-100 text-red-800 border-red-300", headerColor: "bg-red-600" },
];

export default function ATS() {
  const [showForm, setShowForm] = useState(false);
  const [editingCandidato, setEditingCandidato] = useState(null);
  const [showProvaModal, setShowProvaModal] = useState(null);
  const [activeTab, setActiveTab] = useState('candidati');
  const [showValutazioneForm, setShowValutazioneForm] = useState(false);
  const [valutazioneConfig, setValutazioneConfig] = useState({ domande: [] });
  const [newDomanda, setNewDomanda] = useState({ testo: '', opzioni: ['', '', '', ''], obbligatoria: true });
  const [expandedValutazione, setExpandedValutazione] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    telefono: "",
    posizione: "",
    store_preferito: "",
    stato: "nuovo",
    note: "",
  });

  const queryClient = useQueryClient();

  const { data: candidati = [], isLoading } = useQuery({
    queryKey: ["candidati"],
    queryFn: () => base44.entities.Candidato.list("-created_date"),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: turniPlanday = [] } = useQuery({
    queryKey: ["turni-planday-ats"],
    queryFn: () => base44.entities.TurnoPlanday.filter({}),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-ats"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: valutazioniConfig = [] } = useQuery({
    queryKey: ["valutazioni-config"],
    queryFn: () => base44.entities.ValutazioneProvaConfig.list(),
  });

  const { data: valutazioni = [] } = useQuery({
    queryKey: ["valutazioni-prove"],
    queryFn: () => base44.entities.ValutazioneProva.list("-created_date"),
  });

  const activeConfig = valutazioniConfig.find(c => c.attivo) || { domande: [] };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Candidato.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidati"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Candidato.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidati"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Candidato.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidati"] });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (config) => {
      // Deactivate existing configs
      for (const c of valutazioniConfig) {
        if (c.attivo) {
          await base44.entities.ValutazioneProvaConfig.update(c.id, { attivo: false });
        }
      }
      // Create new active config
      return base44.entities.ValutazioneProvaConfig.create({ ...config, attivo: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["valutazioni-config"] });
      setShowValutazioneForm(false);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      cognome: "",
      telefono: "",
      posizione: "",
      store_preferito: "",
      stato: "nuovo",
      note: "",
    });
    setEditingCandidato(null);
    setShowForm(false);
  };

  const handleEdit = (candidato) => {
    setEditingCandidato(candidato);
    setFormData({
      nome: candidato.nome,
      cognome: candidato.cognome,
      telefono: candidato.telefono,
      posizione: candidato.posizione || "",
      store_preferito: candidato.store_preferito || "",
      stato: candidato.stato || "nuovo",
      note: candidato.note || "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.nome || !formData.cognome || !formData.telefono) {
      alert("Compila i campi obbligatori");
      return;
    }
    if (editingCandidato) {
      updateMutation.mutate({ id: editingCandidato.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChangeStato = (candidatoId, nuovoStato) => {
    updateMutation.mutate({ id: candidatoId, data: { stato: nuovoStato } });
  };

  const handleAssumi = (candidato) => {
    // Generate registration link (using the app URL)
    const baseUrl = window.location.origin;
    const link = `${baseUrl}`;
    
    updateMutation.mutate({ 
      id: candidato.id, 
      data: { 
        stato: 'assunto',
        link_registrazione: link
      } 
    });
    
    // Copy link to clipboard
    navigator.clipboard.writeText(link);
    alert(`Candidato segnato come assunto!\n\nLink per la registrazione copiato negli appunti:\n${link}\n\nInvialo al candidato per completare la registrazione.`);
  };

  const handleScarta = (candidatoId) => {
    if (confirm('Sei sicuro di voler scartare questo candidato?')) {
      handleChangeStato(candidatoId, 'scartato');
    }
  };

  const handleSelectProva = async (candidato, turno) => {
    try {
      const dipendente = users.find(u => u.id === turno.dipendente_id);
      const nomeCompleto = `${candidato.nome} ${candidato.cognome}`;
      
      // Create trial shift in Planday
      await base44.entities.TurnoPlanday.create({
        store_id: turno.store_id,
        data: turno.data,
        ora_inizio: turno.ora_inizio,
        ora_fine: turno.ora_fine,
        ruolo: candidato.posizione || turno.ruolo,
        tipo_turno: 'Prova',
        momento_turno: turno.momento_turno,
        turno_sequence: turno.turno_sequence,
        stato: 'programmato',
        is_prova: true,
        candidato_id: candidato.id,
        dipendente_nome: nomeCompleto,
        note: `Turno di prova con ${dipendente?.nome_cognome || dipendente?.full_name || ''}`
      });
      
      // Update candidato
      await updateMutation.mutateAsync({ 
        id: candidato.id, 
        data: { 
          stato: 'prova_programmata',
          prova_data: turno.data,
          prova_ora_inizio: turno.ora_inizio,
          prova_ora_fine: turno.ora_fine,
          prova_store_id: turno.store_id,
          prova_dipendente_id: turno.dipendente_id,
          prova_dipendente_nome: dipendente?.nome_cognome || dipendente?.full_name || ''
        } 
      });
      
      setShowProvaModal(null);
      queryClient.invalidateQueries({ queryKey: ['turni-planday-ats'] });
      alert(`Prova programmata per il ${moment(turno.data).format('DD/MM/YYYY')} dalle ${turno.ora_inizio} alle ${turno.ora_fine}`);
    } catch (error) {
      console.error('Error creating trial shift:', error);
      alert('Errore nella programmazione della prova');
    }
  };

  const getStoreName = (storeId) => stores.find((s) => s.id === storeId)?.name || "";
  const getStatoConfig = (stato) => STATI.find((s) => s.value === stato) || STATI[0];

  // Get available shifts for trial
  const getAvailableTrialShifts = (candidato) => {
    const oggi = moment().format('YYYY-MM-DD');
    const storeId = candidato.store_preferito;
    const posizione = candidato.posizione;

    const usersAbilitati = users.filter(u => u.abilitato_prove && u.ruoli_dipendente?.includes(posizione));

    const shiftsDisponibili = turniPlanday.filter(t => {
      if (t.data < oggi) return false;
      if (storeId && t.store_id !== storeId) return false;
      if (posizione && t.ruolo !== posizione) return false;
      const turnoUser = usersAbilitati.find(u => u.id === t.dipendente_id);
      return !!turnoUser;
    }).sort((a, b) => a.data.localeCompare(b.data) || a.ora_inizio.localeCompare(b.ora_inizio));

    return shiftsDisponibili.map(t => ({
      ...t,
      dipendente: users.find(u => u.id === t.dipendente_id)
    }));
  };

  // Check if prova is passed (date is in the past)
  const isProvaPassata = (candidato) => {
    if (!candidato.prova_data) return false;
    return moment(candidato.prova_data).isBefore(moment(), 'day');
  };

  // Group candidati by stato
  const candidatiByStato = useMemo(() => {
    const grouped = {};
    STATI.forEach(s => grouped[s.value] = []);
    candidati.forEach(c => {
      const stato = c.stato || 'nuovo';
      if (grouped[stato]) {
        grouped[stato].push(c);
      }
    });
    return grouped;
  }, [candidati]);

  // Add new domanda
  const handleAddDomanda = () => {
    if (!newDomanda.testo.trim()) return;
    const validOpzioni = newDomanda.opzioni.filter(o => o.trim());
    if (validOpzioni.length < 2) {
      alert('Inserisci almeno 2 opzioni');
      return;
    }
    setValutazioneConfig(prev => ({
      ...prev,
      domande: [...prev.domande, { ...newDomanda, opzioni: validOpzioni }]
    }));
    setNewDomanda({ testo: '', opzioni: ['', '', '', ''], obbligatoria: true });
  };

  const handleRemoveDomanda = (index) => {
    setValutazioneConfig(prev => ({
      ...prev,
      domande: prev.domande.filter((_, i) => i !== index)
    }));
  };

  const stats = {
    totale: candidati.length,
    nuovi: candidati.filter((c) => c.stato === "nuovo").length,
    inValutazione: candidati.filter((c) => c.stato === "in_valutazione").length,
    provaProgrammata: candidati.filter((c) => c.stato === "prova_programmata").length,
    assunti: candidati.filter((c) => c.stato === "assunto").length,
  };

  return (
    <ProtectedPage pageName="ATS" requiredUserTypes={["admin", "manager"]}>
      <div className="max-w-full mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              ATS - Candidati
            </h1>
            <p className="text-slate-500 mt-1">Gestione candidati per turni di prova</p>
          </div>
          <NeumorphicButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Nuovo Candidato
          </NeumorphicButton>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('candidati')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'candidati' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'neumorphic-flat text-slate-700'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Candidati
          </button>
          <button
            onClick={() => setActiveTab('valutazioni')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'valutazioni' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'neumorphic-flat text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4 inline mr-2" />
            Valutazioni Prove
          </button>
        </div>

        {activeTab === 'candidati' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <NeumorphicCard className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">{stats.totale}</p>
                <p className="text-xs text-slate-500">Totali</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.nuovi}</p>
                <p className="text-xs text-slate-500">Nuovi</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.inValutazione}</p>
                <p className="text-xs text-slate-500">In Valutazione</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.provaProgrammata}</p>
                <p className="text-xs text-slate-500">Prova Programmata</p>
              </NeumorphicCard>
              <NeumorphicCard className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.assunti}</p>
                <p className="text-xs text-slate-500">Assunti</p>
              </NeumorphicCard>
            </div>

            {/* Form */}
            {showForm && (
              <NeumorphicCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingCandidato ? "Modifica Candidato" : "Nuovo Candidato"}
                  </h2>
                  <button onClick={resetForm} className="nav-button p-2 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nome *</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                      placeholder="Nome"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Cognome *</label>
                    <input
                      type="text"
                      value={formData.cognome}
                      onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                      placeholder="Cognome"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Telefono *</label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                      placeholder="+39 333 1234567"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Posizione</label>
                    <select
                      value={formData.posizione}
                      onChange={(e) => setFormData({ ...formData, posizione: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                    >
                      <option value="">Seleziona posizione</option>
                      {POSIZIONI.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Negozio Preferito</label>
                    <select
                      value={formData.store_preferito}
                      onChange={(e) => setFormData({ ...formData, store_preferito: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                    >
                      <option value="">Nessuna preferenza</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Stato</label>
                    <select
                      value={formData.stato}
                      onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                    >
                      {STATI.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-24 resize-none"
                      placeholder="Note sul candidato..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <NeumorphicButton onClick={resetForm} className="flex-1">Annulla</NeumorphicButton>
                  <NeumorphicButton
                    onClick={handleSave}
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salva
                  </NeumorphicButton>
                </div>
              </NeumorphicCard>
            )}

            {/* Kanban Board */}
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
                {STATI.map(stato => (
                  <div key={stato.value} className="min-w-[280px]">
                    <div className={`${stato.headerColor} text-white px-4 py-2 rounded-t-xl font-bold text-sm flex items-center justify-between`}>
                      <span>{stato.label}</span>
                      <span className="bg-white bg-opacity-30 px-2 py-0.5 rounded-full text-xs">
                        {candidatiByStato[stato.value].length}
                      </span>
                    </div>
                    <div className="bg-slate-100 rounded-b-xl p-2 min-h-[400px] space-y-2">
                      {candidatiByStato[stato.value].map(candidato => {
                        const provaPassata = isProvaPassata(candidato);
                        
                        return (
                          <div 
                            key={candidato.id} 
                            className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${stato.color} hover:shadow-md transition-shadow`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-bold text-slate-800 text-sm">
                                {candidato.nome} {candidato.cognome}
                              </h4>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEdit(candidato)}
                                  className="p-1 hover:bg-blue-50 rounded"
                                >
                                  <Edit className="w-3 h-3 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm("Eliminare questo candidato?")) {
                                      deleteMutation.mutate(candidato.id);
                                    }
                                  }}
                                  className="p-1 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-xs text-slate-600 mb-3">
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {candidato.telefono}
                              </div>
                              {candidato.posizione && (
                                <div className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  {candidato.posizione}
                                </div>
                              )}
                              {candidato.store_preferito && (
                                <div className="flex items-center gap-1">
                                  <Store className="w-3 h-3" />
                                  {getStoreName(candidato.store_preferito)}
                                </div>
                              )}
                            </div>

                            {/* Prova Details for prova_programmata */}
                            {stato.value === 'prova_programmata' && candidato.prova_data && (
                              <div className="mb-3 p-2 bg-purple-50 rounded-lg text-xs">
                                <p className="font-bold text-purple-800 mb-1">📅 Dettagli Prova:</p>
                                <div className="space-y-0.5 text-purple-700">
                                  <p><Calendar className="w-3 h-3 inline mr-1" />{moment(candidato.prova_data).format('ddd DD MMM YYYY')}</p>
                                  <p><Clock className="w-3 h-3 inline mr-1" />{candidato.prova_ora_inizio} - {candidato.prova_ora_fine}</p>
                                  <p><Store className="w-3 h-3 inline mr-1" />{getStoreName(candidato.prova_store_id)}</p>
                                  <p><User className="w-3 h-3 inline mr-1" />Con: {candidato.prova_dipendente_nome}</p>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-1">
                              {/* Show "Fissa Prova" only for nuovo and in_valutazione */}
                              {(stato.value === 'nuovo' || stato.value === 'in_valutazione') && (
                                <button
                                  onClick={() => setShowProvaModal(candidato)}
                                  className="text-[10px] px-2 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 flex items-center gap-1"
                                >
                                  <Calendar className="w-3 h-3" />
                                  Fissa Prova
                                </button>
                              )}

                              {/* Show Assumi/Scarta buttons after prova is passed */}
                              {stato.value === 'prova_programmata' && provaPassata && (
                                <>
                                  <button
                                    onClick={() => handleAssumi(candidato)}
                                    className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Assumi
                                  </button>
                                  <button
                                    onClick={() => handleScarta(candidato.id)}
                                    className="text-[10px] px-2 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Scarta
                                  </button>
                                </>
                              )}

                              {/* Show link for assunti */}
                              {stato.value === 'assunto' && candidato.link_registrazione && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(candidato.link_registrazione);
                                    alert('Link copiato negli appunti!');
                                  }}
                                  className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 flex items-center gap-1"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                  Copia Link
                                </button>
                              )}
                            </div>

                            {/* Change Status */}
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <select
                                value={candidato.stato}
                                onChange={(e) => handleChangeStato(candidato.id, e.target.value)}
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                              >
                                {STATI.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                      
                      {candidatiByStato[stato.value].length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          Nessun candidato
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Valutazioni Tab */}
        {activeTab === 'valutazioni' && (
          <div className="space-y-6">
            {/* Config Form */}
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Configurazione Form Valutazione</h2>
                <NeumorphicButton
                  onClick={() => {
                    setValutazioneConfig({ domande: activeConfig.domande || [] });
                    setShowValutazioneForm(!showValutazioneForm);
                  }}
                  variant={showValutazioneForm ? 'default' : 'primary'}
                  className="flex items-center gap-2"
                >
                  {showValutazioneForm ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  {showValutazioneForm ? 'Chiudi' : 'Modifica Form'}
                </NeumorphicButton>
              </div>

              {!showValutazioneForm && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 mb-3">
                    {activeConfig.domande?.length || 0} domande configurate
                  </p>
                  {activeConfig.domande?.map((d, i) => (
                    <div key={i} className="neumorphic-pressed p-3 rounded-lg">
                      <p className="font-medium text-slate-800">{i + 1}. {d.testo}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {d.opzioni.map((o, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 bg-slate-100 rounded">{o}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!activeConfig.domande || activeConfig.domande.length === 0) && (
                    <p className="text-slate-400 italic">Nessuna domanda configurata. Clicca "Modifica Form" per aggiungere domande.</p>
                  )}
                </div>
              )}

              {showValutazioneForm && (
                <div className="space-y-4">
                  {/* Existing questions */}
                  {valutazioneConfig.domande.map((domanda, index) => (
                    <div key={index} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{index + 1}. {domanda.testo}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {domanda.opzioni.map((o, j) => (
                              <span key={j} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{o}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveDomanda(index)}
                          className="p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add new question */}
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
                    <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Aggiungi Domanda
                    </h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newDomanda.testo}
                        onChange={(e) => setNewDomanda({ ...newDomanda, testo: e.target.value })}
                        placeholder="Testo della domanda..."
                        className="w-full neumorphic-pressed px-3 py-2 rounded-lg outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {newDomanda.opzioni.map((opt, i) => (
                          <input
                            key={i}
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...newDomanda.opzioni];
                              newOpts[i] = e.target.value;
                              setNewDomanda({ ...newDomanda, opzioni: newOpts });
                            }}
                            placeholder={`Opzione ${i + 1}`}
                            className="neumorphic-pressed px-3 py-2 rounded-lg outline-none text-sm"
                          />
                        ))}
                      </div>
                      <NeumorphicButton onClick={handleAddDomanda} className="w-full">
                        <Plus className="w-4 h-4 inline mr-2" />
                        Aggiungi
                      </NeumorphicButton>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <NeumorphicButton onClick={() => setShowValutazioneForm(false)} className="flex-1">
                      Annulla
                    </NeumorphicButton>
                    <NeumorphicButton
                      onClick={() => saveConfigMutation.mutate(valutazioneConfig)}
                      variant="primary"
                      className="flex-1"
                      disabled={saveConfigMutation.isPending}
                    >
                      {saveConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 inline mr-2" />}
                      Salva Configurazione
                    </NeumorphicButton>
                  </div>
                </div>
              )}
            </NeumorphicCard>

            {/* Valutazioni Results */}
            <NeumorphicCard className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Valutazioni Ricevute ({valutazioni.length})</h2>
              
              {valutazioni.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessuna valutazione ricevuta</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {valutazioni.map(val => (
                    <div key={val.id} className="neumorphic-pressed p-4 rounded-xl">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedValutazione(expandedValutazione === val.id ? null : val.id)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedValutazione === val.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div>
                            <p className="font-bold text-slate-800">{val.candidato_nome}</p>
                            <p className="text-xs text-slate-500">
                              Valutato da: {val.dipendente_nome} • {moment(val.prova_data || val.created_date).format('DD/MM/YYYY')}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          val.consiglio_assunzione === 'si' ? 'bg-green-100 text-green-700' :
                          val.consiglio_assunzione === 'no' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {val.consiglio_assunzione === 'si' ? '✓ Consigliato' :
                           val.consiglio_assunzione === 'no' ? '✗ Non consigliato' :
                           '? Forse'}
                        </span>
                      </div>

                      {expandedValutazione === val.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                          {val.risposte?.map((r, i) => (
                            <div key={i} className="bg-slate-50 p-3 rounded-lg">
                              <p className="text-sm text-slate-600">{r.domanda}</p>
                              <p className="font-medium text-slate-800">{r.risposta}</p>
                            </div>
                          ))}
                          {val.note_aggiuntive && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm text-blue-600">Note aggiuntive:</p>
                              <p className="text-blue-800">{val.note_aggiuntive}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </NeumorphicCard>
          </div>
        )}

        {/* Prova Modal */}
        {showProvaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">
                  Fissa Prova per {showProvaModal.nome} {showProvaModal.cognome}
                </h2>
                <button onClick={() => setShowProvaModal(null)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Posizione:</strong> {showProvaModal.posizione || 'Non specificata'}
                  <br />
                  <strong>Negozio preferito:</strong> {getStoreName(showProvaModal.store_preferito) || 'Nessuna preferenza'}
                </p>
              </div>

              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Turni disponibili con dipendenti abilitati
              </h3>

              {(() => {
                const shifts = getAvailableTrialShifts(showProvaModal);
                if (shifts.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">Nessun turno disponibile con dipendenti abilitati</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Verifica che ci siano dipendenti con "Abilitato Prove" attivo in Gestione Utenti
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {shifts.slice(0, 20).map(turno => (
                      <div 
                        key={turno.id} 
                        className="neumorphic-pressed p-3 rounded-lg flex items-center justify-between hover:bg-blue-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {moment(turno.data).format('ddd DD MMM YYYY')}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {turno.ora_inizio} - {turno.ora_fine}
                            </span>
                            <span className="flex items-center gap-1">
                              <Store className="w-3 h-3" />
                              {getStoreName(turno.store_id)}
                            </span>
                          </div>
                          {turno.dipendente && (
                            <p className="text-xs text-purple-600 mt-1">
                              👤 Con: {turno.dipendente.nome_cognome || turno.dipendente.full_name}
                            </p>
                          )}
                        </div>
                        <NeumorphicButton
                          onClick={() => handleSelectProva(showProvaModal, turno)}
                          variant="primary"
                          className="text-xs px-3 py-1"
                        >
                          Seleziona
                        </NeumorphicButton>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}