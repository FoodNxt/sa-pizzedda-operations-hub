import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { UserPlus, Users, Phone, Edit, Trash2, Save, X, Loader2, Store, Briefcase, Calendar, ChevronRight, Clock, User } from "lucide-react";
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

  const getStoreName = (storeId) => stores.find((s) => s.id === storeId)?.name || "";
  const getStatoConfig = (stato) => STATI.find((s) => s.value === stato) || STATI[0];

  // Get available shifts for trial
  const getAvailableTrialShifts = (candidato) => {
    const oggi = moment().format('YYYY-MM-DD');
    const storeId = candidato.store_preferito;
    const posizione = candidato.posizione;

    // Get users enabled for trials
    const usersAbilitati = users.filter(u => u.abilitato_prove && u.ruoli_dipendente?.includes(posizione));

    // Get future shifts for enabled users at preferred store
    const shiftsDisponibili = turniPlanday.filter(t => {
      if (t.data < oggi) return false;
      if (storeId && t.store_id !== storeId) return false;
      if (posizione && t.ruolo !== posizione) return false;
      // Check if the shift belongs to an enabled user
      const turnoUser = usersAbilitati.find(u => u.id === t.dipendente_id);
      return !!turnoUser;
    }).sort((a, b) => a.data.localeCompare(b.data) || a.ora_inizio.localeCompare(b.ora_inizio));

    return shiftsDisponibili.map(t => ({
      ...t,
      dipendente: users.find(u => u.id === t.dipendente_id)
    }));
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
                  {candidatiByStato[stato.value].map(candidato => (
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

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-1">
                        {stato.value !== 'scartato' && stato.value !== 'assunto' && (
                          <button
                            onClick={() => setShowProvaModal(candidato)}
                            className="text-[10px] px-2 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            Fissa Prova
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
                  ))}
                  
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
                          onClick={() => {
                            alert(`Turno di prova programmato per ${moment(turno.data).format('DD/MM/YYYY')} dalle ${turno.ora_inizio} alle ${turno.ora_fine} con ${turno.dipendente?.nome_cognome || 'dipendente'}`);
                            handleChangeStato(showProvaModal.id, 'prova_programmata');
                            setShowProvaModal(null);
                          }}
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