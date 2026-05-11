import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shirt, CheckCircle, Edit, Eye, X, Loader2
} from "lucide-react";
import NeumorphicCard from "../neumorphic/NeumorphicCard";

export default function ComodatoDivisaDipendente({ currentUser }) {
  const [viewingDoc, setViewingDoc] = useState(null);
  const [signatureName, setSignatureName] = useState(currentUser?.nome_cognome || currentUser?.full_name || '');
  const queryClient = useQueryClient();

  const { data: comodati = [], isLoading } = useQuery({
    queryKey: ['miei-comodati', currentUser?.id],
    queryFn: () => base44.entities.ComodatoDivisa.filter({ user_id: currentUser.id }),
    enabled: !!currentUser
  });

  const signMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComodatoDivisa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miei-comodati'] });
      setViewingDoc(null);
      alert('Contratto di comodato firmato con successo!');
    }
  });

  const handleSign = () => {
    if (!signatureName.trim()) {
      alert('Inserisci il tuo nome per firmare');
      return;
    }
    if (!confirm('Confermi di aver letto e accettato il contratto di comodato d\'uso?')) return;

    signMutation.mutate({
      id: viewingDoc.id,
      data: {
        status: 'firmato',
        data_firma: new Date().toISOString(),
        firma_dipendente: signatureName.trim()
      }
    });
  };

  const toSign = comodati.filter(c => c.status === 'inviato');
  const signed = comodati.filter(c => c.status === 'firmato');

  if (isLoading) {
    return (
      <NeumorphicCard className="p-8 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
        <p className="text-slate-500">Caricamento...</p>
      </NeumorphicCard>
    );
  }

  return (
    <>
      {toSign.length > 0 && (
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Edit className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" /> Da Firmare ({toSign.length})
          </h2>
          <div className="space-y-3">
            {toSign.map(c => (
              <NeumorphicCard key={c.id} className="p-3 lg:p-4 border-2 border-orange-300">
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm lg:text-base">Comodato d'Uso Divisa</h3>
                      <p className="text-xs text-slate-500">
                        {(c.elementi_consegnati || []).map(e => `${e.nome} x${e.quantita}`).join(', ')}
                      </p>
                      <p className="text-xs text-slate-500">Valore: € {(c.valore_totale || 0).toFixed(2)}</p>
                    </div>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0">
                      Da Firmare
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingDoc(c)}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-sm"
                >
                  <Edit className="w-4 h-4" /> Visualizza e Firma
                </button>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {signed.length > 0 && (
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" /> Firmati ({signed.length})
          </h2>
          <div className="space-y-3">
            {signed.map(c => (
              <NeumorphicCard key={c.id} className="p-3 lg:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base">Comodato d'Uso Divisa</h3>
                    <p className="text-xs text-slate-500">
                      {(c.elementi_consegnati || []).map(e => `${e.nome} x${e.quantita}`).join(', ')}
                    </p>
                    <p className="text-xs text-slate-500">
                      Firmato: {c.data_firma ? new Date(c.data_firma).toLocaleDateString('it-IT') : 'N/A'}
                    </p>
                  </div>
                  <button onClick={() => setViewingDoc(c)} className="nav-button p-2 rounded-lg flex-shrink-0">
                    <Eye className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {comodati.length === 0 && (
        <NeumorphicCard className="p-8 text-center">
          <Shirt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun contratto di comodato disponibile</p>
        </NeumorphicCard>
      )}

      {viewingDoc && (
        <div className="fixed inset-0 flex flex-col bg-white" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-lg flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Comodato d'Uso Divisa</h2>
            <button onClick={() => setViewingDoc(null)} style={{ background: 'transparent', border: 'none', padding: '8px' }}>
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Scrollable contract text */}
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            <div className="max-w-4xl mx-auto neumorphic-pressed p-4 lg:p-6 rounded-xl">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                {viewingDoc.contenuto_contratto}
              </pre>
            </div>
            {viewingDoc.status === 'firmato' && (
              <div className="max-w-4xl mx-auto mt-4 neumorphic-pressed p-4 rounded-xl bg-green-50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Contratto Firmato</p>
                    <p className="text-xs text-green-600">Firma: {viewingDoc.firma_dipendente}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed bottom signature bar - always visible on mobile */}
          {viewingDoc.status === 'inviato' && (
            <div className="flex-shrink-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={signatureName}
                    onChange={e => setSignatureName(e.target.value)}
                    placeholder="Nome e Cognome"
                    className="flex-1 border border-slate-300 px-4 py-3 rounded-xl outline-none text-sm bg-white"
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <button
                  onClick={handleSign}
                  disabled={signMutation.isPending}
                  style={{
                    background: 'linear-gradient(to right, #22c55e, #059669)',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '16px',
                    opacity: signMutation.isPending ? 0.5 : 1,
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
                  }}
                >
                  <CheckCircle className="w-6 h-6" />
                  {signMutation.isPending ? 'Firma in corso...' : 'FIRMA CONTRATTO'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}