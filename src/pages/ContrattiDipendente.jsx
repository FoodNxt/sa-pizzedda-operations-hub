
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle,
  Eye,
  X,
  Edit // Added Edit icon
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function ContrattiDipendente() {
  const [currentUser, setCurrentUser] = useState(null);
  const [viewingContract, setViewingContract] = useState(null); // Renamed state variable
  const [signatureName, setSignatureName] = useState(''); // Renamed state variable

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setSignatureName(user.nome_cognome || user.full_name || ''); // Updated setter call
    };
    fetchUser();
  }, []);

  const { data: contratti = [], isLoading } = useQuery({
    queryKey: ['miei-contratti', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.Contratto.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const signContractMutation = useMutation({ // Renamed mutation
    mutationFn: ({ id, data }) => base44.entities.Contratto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miei-contratti'] });
      setViewingContract(null); // Updated state variable
      setSignatureName(currentUser?.nome_cognome || currentUser?.full_name || ''); // Updated setter call
      alert('Contratto firmato con successo!'); // Added success alert as per original logic
    },
    onError: (error) => { // Added error handling as per original logic
      console.error('Error signing contract:', error);
      alert('Errore durante la firma del contratto');
    }
  });

  const handleSign = async () => { // Renamed function
    if (!signatureName.trim()) { // Updated state variable
      alert('Inserisci il tuo nome e cognome per firmare');
      return;
    }

    if (!confirm('Confermando, dichiari di aver letto e accettato tutte le condizioni del contratto. Vuoi procedere con la firma?')) {
      return;
    }

    try {
      await signContractMutation.mutateAsync({ // Updated mutation call
        id: viewingContract.id, // Updated state variable
        data: {
          ...viewingContract, // Updated state variable
          status: 'firmato',
          data_firma: new Date().toISOString(),
          firma_dipendente: signatureName.trim() // Updated state variable
        }
      });
    } catch (error) {
      // Error handled by onError in useMutation
    }
  };

  // Removed getStatusBadge function as it's no longer used

  // New contract filtering logic
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
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
          I Miei Contratti
        </h1>
        <p className="text-sm text-slate-500">Visualizza e firma i tuoi contratti</p>
      </div>

      {/* Stats */}
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

      {/* Contratti da Firmare */}
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
                      Inviato: {contract.data_invio ? new Date(contract.data_invio).toLocaleDateString('it-IT') : 'N/A'}
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

      {/* Contratti Firmati */}
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
                      Firmato: {contract.data_firma ? new Date(contract.data_firma).toLocaleDateString('it-IT') : 'N/A'}
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

      {/* Contract View Modal */}
      {viewingContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <NeumorphicCard className="w-full lg:max-w-3xl max-h-[90vh] overflow-y-auto p-4 lg:p-6 rounded-t-3xl lg:rounded-2xl">
            <div className="flex items-start justify-between mb-4 sticky top-0 bg-gradient-to-br from-slate-50 to-slate-100 pb-4 -mt-4 pt-4 -mx-4 px-4 z-10">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex-1 min-w-0 truncate">
                Contratto
              </h2>
              <button
                onClick={() => {
                  setViewingContract(null);
                  setSignatureName('');
                }}
                className="nav-button p-2 rounded-lg flex-shrink-0 ml-3"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            {/* Contract Details */}
            <div className="space-y-3 mb-4">
              <div className="neumorphic-pressed p-3 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Template</p>
                <p className="text-sm font-medium text-slate-700">{viewingContract.template_nome}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="neumorphic-pressed p-3 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Gruppo</p>
                  <p className="text-sm font-bold text-slate-700">{viewingContract.employee_group}</p>
                </div>
                <div className="neumorphic-pressed p-3 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Ore/Sett</p>
                  <p className="text-sm font-bold text-slate-700">{viewingContract.ore_settimanali}h</p>
                </div>
                <div className="neumorphic-pressed p-3 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Inizio</p>
                  <p className="text-sm font-medium text-slate-700">
                    {viewingContract.data_inizio_contratto ? new Date(viewingContract.data_inizio_contratto).toLocaleDateString('it-IT') : 'N/A'}
                  </p>
                </div>
                <div className="neumorphic-pressed p-3 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Durata</p>
                  <p className="text-sm font-medium text-slate-700">{viewingContract.durata_contratto_mesi} mesi</p>
                </div>
              </div>
            </div>

            {/* Contract Content */}
            <div className="neumorphic-pressed p-4 rounded-xl mb-4 max-h-60 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs lg:text-sm text-slate-700 font-sans">
                {viewingContract.contenuto_contratto}
              </pre>
            </div>

            {/* Signature Section */}
            {viewingContract.status === 'inviato' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Firma Digitale (Nome Completo)
                  </label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Mario Rossi"
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm"
                  />
                </div>

                <button
                  onClick={handleSign}
                  disabled={!signatureName.trim() || signContractMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg text-sm"
                >
                  {signContractMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Firma in corso...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Firma Contratto
                    </>
                  )}
                </button>

                <NeumorphicCard className="p-3 bg-blue-50">
                  <p className="text-xs text-blue-800">
                    ℹ️ Firmando accetti i termini del contratto
                  </p>
                </NeumorphicCard>
              </div>
            ) : (
              <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 text-sm">Contratto Firmato</p>
                    <p className="text-xs text-green-600">
                      {viewingContract.data_firma ? new Date(viewingContract.data_firma).toLocaleString('it-IT') : 'N/A'}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Firma: {viewingContract.firma_dipendente}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </NeumorphicCard>
        </div>
      )}
    </div>
  );
}
