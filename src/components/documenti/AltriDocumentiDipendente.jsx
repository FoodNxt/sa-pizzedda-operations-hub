import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Eye, X, CheckCircle, Edit, Clock, Loader2 } from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";

export default function AltriDocumentiDipendente({ currentUser }) {
  const [viewingDoc, setViewingDoc] = useState(null);
  const [signatureName, setSignatureName] = useState(currentUser?.nome_cognome || currentUser?.full_name || "");
  const queryClient = useQueryClient();

  const { data: documenti = [], isLoading } = useQuery({
    queryKey: ["miei-altri-documenti", currentUser?.id],
    queryFn: () => base44.entities.AltroDocumento.filter({ user_id: currentUser.id }),
    enabled: !!currentUser
  });

  const signMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AltroDocumento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["miei-altri-documenti"] });
      setViewingDoc(null);
      alert("Documento firmato con successo!");
    }
  });

  const handleView = async (doc) => {
    setViewingDoc(doc);
    if (doc.status === "inviato") {
      await base44.entities.AltroDocumento.update(doc.id, {
        status: "visualizzato",
        data_visualizzazione: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ["miei-altri-documenti"] });
    }
  };

  const handleSign = () => {
    if (!signatureName.trim()) { alert("Inserisci il tuo nome per firmare"); return; }
    if (!confirm("Confermi di aver letto il documento e vuoi procedere con la firma?")) return;

    signMutation.mutate({
      id: viewingDoc.id,
      data: {
        status: "firmato",
        data_firma: new Date().toISOString(),
        firma_digitale: signatureName.trim()
      }
    });
  };

  const daFirmare = documenti.filter(d => d.richiede_firma && d.status !== "firmato");
  const altri = documenti.filter(d => !d.richiede_firma || d.status === "firmato");

  if (isLoading) return <NeumorphicCard className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></NeumorphicCard>;

  if (documenti.length === 0) {
    return (
      <NeumorphicCard className="p-8 text-center">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Nessun altro documento disponibile</p>
      </NeumorphicCard>
    );
  }

  return (
    <>
      {daFirmare.length > 0 && (
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Edit className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" /> Da Firmare ({daFirmare.length})
          </h2>
          <div className="space-y-3">
            {daFirmare.map(doc => (
              <NeumorphicCard key={doc.id} className="p-3 lg:p-4 border-2 border-orange-300">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base">{doc.titolo}</h3>
                    <p className="text-xs text-slate-500">Ricevuto: {new Date(doc.data_invio).toLocaleDateString("it-IT")}</p>
                  </div>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold whitespace-nowrap">Da Firmare</span>
                </div>
                <button onClick={() => handleView(doc)} className="w-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-sm">
                  <Edit className="w-4 h-4" /> Visualizza e Firma
                </button>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {altri.length > 0 && (
        <div className={daFirmare.length > 0 ? "mt-4" : ""}>
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" /> Documenti ({altri.length})
          </h2>
          <div className="space-y-3">
            {altri.map(doc => (
              <NeumorphicCard key={doc.id} className="p-3 lg:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base">{doc.titolo}</h3>
                    <p className="text-xs text-slate-500">
                      {doc.data_firma ? `Firmato: ${new Date(doc.data_firma).toLocaleDateString("it-IT")}` : new Date(doc.data_invio).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.status === "firmato" && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Firmato</span>}
                    <button onClick={() => handleView(doc)} className="nav-button p-2 rounded-lg">
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {/* Full-screen viewer */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-0">
          <div className="w-full h-full flex flex-col bg-white">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-lg flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{viewingDoc.titolo}</h2>
              <button onClick={() => setViewingDoc(null)} className="nav-button p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div className="max-w-4xl mx-auto neumorphic-pressed p-6 rounded-xl">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{viewingDoc.contenuto}</pre>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-2xl">
              <div className="max-w-4xl mx-auto">
                {viewingDoc.richiede_firma && viewingDoc.status !== "firmato" ? (
                  <div className="space-y-3">
                    <input type="text" value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="Nome e Cognome" className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
                    <button onClick={handleSign} disabled={signMutation.isPending} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2">
                      <CheckCircle className="w-6 h-6" /> {signMutation.isPending ? "Firma in corso..." : "Firma Documento"}
                    </button>
                  </div>
                ) : viewingDoc.status === "firmato" ? (
                  <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Documento Firmato</p>
                        <p className="text-xs text-green-600">Firma: {viewingDoc.firma_digitale}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50">
                    <p className="text-sm text-blue-800 text-center">Documento di sola lettura</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}