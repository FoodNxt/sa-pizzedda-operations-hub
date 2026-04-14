import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Send, Eye, Trash2, X, CheckCircle, Clock, Edit, Loader2, User } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";
import NeumorphicButton from "../neumorphic/NeumorphicButton";

export default function AltriDocumentiSection() {
  const [showForm, setShowForm] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    titolo: "",
    contenuto: "",
    user_id: "",
    richiede_firma: false
  });

  const { data: documenti = [], isLoading } = useQuery({
    queryKey: ["altri-documenti"],
    queryFn: () => base44.entities.AltroDocumento.list("-created_date")
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
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

  const resetForm = () => {
    setFormData({ titolo: "", contenuto: "", user_id: "", richiede_firma: false });
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = users.find(u => u.id === formData.user_id);
    if (!user) { alert("Seleziona un dipendente"); return; }

    createMutation.mutate({
      ...formData,
      user_email: user.email,
      user_nome: user.nome_cognome || user.full_name || user.email
    });
  };

  const getStatusBadge = (doc) => {
    if (doc.status === "firmato") return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Firmato ✓</span>;
    if (doc.status === "visualizzato") return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Visualizzato</span>;
    return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Inviato</span>;
  };

  if (isLoading) return <NeumorphicCard className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></NeumorphicCard>;

  return (
    <>
      <div className="flex gap-3 mb-6">
        <NeumorphicButton onClick={() => setShowForm(true)} variant="primary" className="flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nuovo Documento
        </NeumorphicButton>
      </div>

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

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Nuovo Documento</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Destinatario *</label>
                <select
                  value={formData.user_id}
                  onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  required
                >
                  <option value="">Seleziona dipendente...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name || u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Titolo *</label>
                <input
                  type="text"
                  value={formData.titolo}
                  onChange={e => setFormData({ ...formData, titolo: e.target.value })}
                  placeholder="Titolo del documento"
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Contenuto *</label>
                <textarea
                  value={formData.contenuto}
                  onChange={e => setFormData({ ...formData, contenuto: e.target.value })}
                  placeholder="Incolla qui il testo del documento..."
                  className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-64 resize-none"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="richiede-firma"
                  checked={formData.richiede_firma}
                  onChange={e => setFormData({ ...formData, richiede_firma: e.target.checked })}
                  className="w-5 h-5"
                />
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