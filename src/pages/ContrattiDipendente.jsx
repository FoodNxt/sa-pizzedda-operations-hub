import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle,
  Eye,
  X,
  Edit
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { isValid } from 'date-fns';

export default function ContrattiDipendente() {
  const [currentUser, setCurrentUser] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  const [signatureName, setSignatureName] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setSignatureName(user.nome_cognome || user.full_name || '');
    };
    fetchUser();
  }, []);

  const { data: contratti = [], isLoading } = useQuery({
    queryKey: ['miei-contratti', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.Contratto.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const signContractMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contratto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miei-contratti'] });
      setViewingContract(null);
      setSignatureName(currentUser?.nome_cognome || currentUser?.full_name || '');
      alert('Contratto firmato con successo!');
    },
    onError: (error) => {
      console.error('Error signing contract:', error);
      alert('Errore durante la firma del contratto');
    }
  });

  const safeFormatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'N/A';
      return date.toLocaleDateString('it-IT');
    } catch (e) {
      return 'N/A';
    }
  };

  const safeFormatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'N/A';
      return date.toLocaleString('it-IT');
    } catch (e) {
      return 'N/A';
    }
  };

  const handleSign = async () => {
    if (!signatureName.trim()) {
      alert('Inserisci il tuo nome e cognome per firmare');
      return;
    }

    if (!confirm('Confermando, dichiari di aver letto e accettato tutte le condizioni del contratto. Vuoi procedere con la firma?')) {
      return;
    }

    await signContractMutation.mutateAsync({
      id: viewingContract.id,
      data: {
        ...viewingContract,
        status: 'firmato',
        data_firma: new Date().toISOString(),
        firma_dipendente: signatureName.trim()
      }
    });
  };

  const userContracts = contratti;
  const toSignContracts = contratti.filter(c => c.status === 'inviato');
  const signedContracts = contratti.filter(c => c.status === 'firmato');

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <NeumorphicCard className="p-8">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          I Miei Contratti
        </h1>
        <p className="text-sm text-slate-500">Visualizza e firma i tuoi contratti</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-2 flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">{userContracts.length}</h3>
            <p className="text-xs text-slate-500">Totali</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 mx-auto mb-2 flex items-center justify-center shadow-lg">
              <Edit className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-orange-600">{toSignContracts.length}</h3>
            <p className="text-xs text-slate-500">Da Firmare</p>
          </div>
        </NeumorphicCard>

        <NeumorphicCard className="p-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-2 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-green-600">{signedContracts.length}</h3>
            <p className="text-xs text-slate-500">Firmati</p>
          </div>
        </NeumorphicCard>
      </div>

      {toSignContracts.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Edit className="w-5 h-5 text-orange-600" />
            Da Firmare
          </h2>
          <div className="space-y-3">
            {toSignContracts.map(contract => (
              <NeumorphicCard 
                key={contract.id} 
                className="p-4 border-2 border-orange-300 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base mb-1 truncate">
                      {contract.template_nome}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Inviato: {safeFormatDate(contract.data_invio)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold whitespace-nowrap">
                    Da Firmare
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="neumorphic-pressed p-2 rounded-lg">
                    <p className="text-xs text-slate-500">Gruppo</p>
                    <p className="text-sm font-bold text-slate-700">{contract.employee_group}</p>
                  </div>
                  <div className="neumorphic-pressed p-2 rounded-lg">
                    <p className="text-xs text-slate-500">Ore/Sett</p>
                    <p className="text-sm font-bold text-slate-700">{contract.ore_settimanali}h</p>
                  </div>
                </div>

                <button
                  onClick={() => setViewingContract(contract)}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 shadow-lg text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Visualizza e Firma
                </button>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {signedContracts.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Firmati
          </h2>
          <div className="space-y-3">
            {signedContracts.map(contract => (
              <NeumorphicCard key={contract.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base mb-1 truncate">
                      {contract.template_nome}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Firmato: {safeFormatDate(contract.data_firma)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold whitespace-nowrap">
                    Firmato
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="neumorphic-pressed p-2 rounded-lg">
                    <p className="text-xs text-slate-500">Gruppo</p>
                    <p className="text-sm font-bold text-slate-700">{contract.employee_group}</p>
                  </div>
                  <div className="neumorphic-pressed p-2 rounded-lg">
                    <p className="text-xs text-slate-500">Ore/Sett</p>
                    <p className="text-sm font-bold text-slate-700">{contract.ore_settimanali}h</p>
                  </div>
                </div>

                <button
                  onClick={() => setViewingContract(contract)}
                  className="w-full nav-button px-4 py-2.5 rounded-xl text-blue-600 font-medium flex items-center justify-center gap-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Visualizza
                </button>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {userContracts.length === 0 && (
        <NeumorphicCard className="p-8 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun contratto disponibile</p>
        </NeumorphicCard>
      )}

      {viewingContract && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-0">
          <div className="w-full h-full flex flex-col bg-white">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-lg flex items-center justify-between">
              <h2 className="text-lg lg:text-xl font-bold text-slate-800">
                {viewingContract.template_nome}
              </h2>
              <button
                onClick={() => {
                  setViewingContract(null);
                  setSignatureName('');
                }}
                className="nav-button p-2 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            {/* Contract Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="neumorphic-pressed p-6 rounded-xl mb-6">
                  <pre className="whitespace-pre-wrap text-sm lg:text-base text-slate-700 font-sans leading-relaxed">
                    {viewingContract.contenuto_contratto}
                  </pre>
                </div>
              </div>
            </div>

            {/* Signature Section - Fixed at bottom */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-2xl">
              <div className="max-w-4xl mx-auto">
                {viewingContract.status === 'inviato' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="neumorphic-pressed p-3 rounded-xl text-center">
                        <p className="text-xs text-slate-500 mb-1">Gruppo</p>
                        <p className="text-sm font-bold text-slate-700">{viewingContract.employee_group}</p>
                      </div>
                      <div className="neumorphic-pressed p-3 rounded-xl text-center">
                        <p className="text-xs text-slate-500 mb-1">Ore/Sett</p>
                        <p className="text-sm font-bold text-slate-700">{viewingContract.ore_settimanali}h</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Firma Digitale (Nome Completo)
                      </label>
                      <input
                        type="text"
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        placeholder="Mario Rossi"
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      />
                    </div>

                    <button
                      onClick={handleSign}
                      disabled={!signatureName.trim() || signContractMutation.isPending}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg text-base"
                    >
                      {signContractMutation.isPending ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Firma in corso...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6" />
                          Firma Contratto
                        </>
                      )}
                    </button>

                    <div className="neumorphic-pressed p-3 rounded-xl bg-blue-50">
                      <p className="text-xs text-blue-800 text-center">
                        ℹ️ Firmando accetti i termini del contratto
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800">Contratto Firmato</p>
                        <p className="text-xs text-green-600">
                          {safeFormatDateTime(viewingContract.data_firma)}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Firma: {viewingContract.firma_dipendente}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}