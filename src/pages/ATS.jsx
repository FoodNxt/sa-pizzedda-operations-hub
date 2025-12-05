import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { UserPlus, Users, Phone, Edit, Trash2, Save, X, Loader2, Store, Briefcase } from "lucide-react";

const POSIZIONI = ["Pizzaiolo", "Cassiere", "Store Manager"];
const STATI = [
  { value: "nuovo", label: "Nuovo", color: "bg-blue-100 text-blue-700" },
  { value: "in_valutazione", label: "In Valutazione", color: "bg-yellow-100 text-yellow-700" },
  { value: "prova_programmata", label: "Prova Programmata", color: "bg-purple-100 text-purple-700" },
  { value: "assunto", label: "Assunto", color: "bg-green-100 text-green-700" },
  { value: "scartato", label: "Scartato", color: "bg-red-100 text-red-700" },
];

export default function ATS() {
  const [showForm, setShowForm] = useState(false);
  const [editingCandidato, setEditingCandidato] = useState(null);
  const [filterStato, setFilterStato] = useState("all");
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

  const getStoreName = (storeId) => stores.find((s) => s.id === storeId)?.name || "";
  const getStatoConfig = (stato) => STATI.find((s) => s.value === stato) || STATI[0];

  const filteredCandidati = candidati.filter((c) => {
    if (filterStato !== "all" && c.stato !== filterStato) return false;
    return true;
  });

  const stats = {
    totale: candidati.length,
    nuovi: candidati.filter((c) => c.stato === "nuovo").length,
    inValutazione: candidati.filter((c) => c.stato === "in_valutazione").length,
    provaProgrammata: candidati.filter((c) => c.stato === "prova_programmata").length,
    assunti: candidati.filter((c) => c.stato === "assunto").length,
  };

  return (
    <ProtectedPage pageName="ATS">
      <div className="max-w-6xl mx-auto space-y-6">
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

        {/* Filter */}
        <NeumorphicCard className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Filtra per stato:</span>
            <select
              value={filterStato}
              onChange={(e) => setFilterStato(e.target.value)}
              className="neumorphic-pressed px-4 py-2 rounded-xl outline-none"
            >
              <option value="all">Tutti</option>
              {STATI.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </NeumorphicCard>

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

        {/* Lista Candidati */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Candidati ({filteredCandidati.length})</h2>

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            </div>
          ) : filteredCandidati.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessun candidato trovato</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCandidati.map((candidato) => {
                const statoConfig = getStatoConfig(candidato.stato);
                return (
                  <div key={candidato.id} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-slate-800">
                            {candidato.nome} {candidato.cognome}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statoConfig.color}`}>
                            {statoConfig.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {candidato.telefono}
                          </span>
                          {candidato.posizione && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              {candidato.posizione}
                            </span>
                          )}
                          {candidato.store_preferito && (
                            <span className="flex items-center gap-1">
                              <Store className="w-4 h-4" />
                              {getStoreName(candidato.store_preferito)}
                            </span>
                          )}
                        </div>
                        {candidato.note && (
                          <p className="text-sm text-slate-500 mt-2">{candidato.note}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(candidato)}
                          className="nav-button p-2 rounded-lg hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Eliminare questo candidato?")) {
                              deleteMutation.mutate(candidato.id);
                            }
                          }}
                          className="nav-button p-2 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}