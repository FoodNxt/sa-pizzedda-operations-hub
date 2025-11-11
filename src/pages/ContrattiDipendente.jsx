import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function ContrattiDipendente() {
  const [currentUser, setCurrentUser] = useState(null);
  const [viewingContratto, setViewingContratto] = useState(null);
  const [firmaNome, setFirmaNome] = useState('');
  const [signing, setSigning] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setFirmaNome(user.nome_cognome || user.full_name || '');
    };
    fetchUser();
  }, []);

  const { data: contratti = [], isLoading } = useQuery({
    queryKey: ['miei-contratti', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.Contratto.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const firmaContrattoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contratto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miei-contratti'] });
      setViewingContratto(null);
      setFirmaNome(currentUser?.nome_cognome || currentUser?.full_name || '');
    },
  });

  const handleFirmaContratto = async () => {
    if (!firmaNome.trim()) {
      alert('Inserisci il tuo nome e cognome per firmare');
      return;
    }

    if (!confirm('Confermando, dichiari di aver letto e accettato tutte le condizioni del contratto. Vuoi procedere con la firma?')) {
      return;
    }

    try {
      setSigning(true);

      await firmaContrattoMutation.mutateAsync({
        id: viewingContratto.id,
        data: {
          ...viewingContratto,
          status: 'firmato',
          data_firma: new Date().toISOString(),
          firma_dipendente: firmaNome.trim()
        }
      });

      alert('Contratto firmato con successo!');
    } catch (error) {
      console.error('Error signing contract:', error);
      alert('Errore durante la firma del contratto');
    } finally {
      setSigning(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'bozza': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza', icon: Clock },
      'inviato': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Da Firmare', icon: Clock },
      'firmato': { bg: 'bg-green-100', text: 'text-green-700', label: 'Firmato', icon: CheckCircle },
      'archiviato': { bg: 'bg-red-100', text: 'text-red-700', label: 'Archiviato', icon: AlertCircle }
    };
    const badge = badges[status] || badges.bozza;
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text} flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const contrattiInviati = contratti.filter(c => c.status === 'inviato');
  const contrattiFirmati = contratti.filter(c => c.status === 'firmato');

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <NeumorphicCard className="p-8 text-center">
          <p className="text-[#9b9b9b]">Caricamento...</p>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <FileText className="w-10 h-10 text-[#8b7355]" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">I Miei Contratti</h1>
        </div>
        <p className="text-[#9b9b9b]">Visualizza e firma i tuoi contratti di lavoro</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{contratti.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Contratti Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{contrattiInviati.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Da Firmare</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{contrattiFirmati.length}</h3>
          <p className="text-sm text-[#9b9b9b]">Firmati</p>
        </NeumorphicCard>
      </div>

      {/* Contratti in Attesa di Firma */}
      {contrattiInviati.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Contratti da Firmare
          </h2>
          <div className="space-y-3">
            {contrattiInviati.map((contratto) => (
              <div key={contratto.id} className="neumorphic-pressed p-5 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-[#6b6b6b] mb-1">
                      {contratto.template_nome || 'Contratto di Lavoro'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-[#9b9b9b]">
                      <span>Ricevuto il {new Date(contratto.data_invio).toLocaleDateString('it-IT')}</span>
                      <span>•</span>
                      <span>{contratto.employee_group} - {contratto.ore_settimanali}h/sett</span>
                    </div>
                  </div>
                  {getStatusBadge(contratto.status)}
                </div>
                <NeumorphicButton
                  onClick={() => setViewingContratto(contratto)}
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Visualizza e Firma
                </NeumorphicButton>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      )}

      {/* Contratti Firmati */}
      {contrattiFirmati.length > 0 && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Contratti Firmati
          </h2>
          <div className="space-y-3">
            {contrattiFirmati.map((contratto) => (
              <div key={contratto.id} className="neumorphic-pressed p-5 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-[#6b6b6b] mb-1">
                      {contratto.template_nome || 'Contratto di Lavoro'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-[#9b9b9b]">
                      <span>Firmato il {new Date(contratto.data_firma).toLocaleDateString('it-IT')}</span>
                      <span>•</span>
                      <span>Dal {new Date(contratto.data_inizio_contratto).toLocaleDateString('it-IT')}</span>
                      <span>•</span>
                      <span>Durata: {contratto.durata_contratto_mesi} mesi</span>
                    </div>
                  </div>
                  {getStatusBadge(contratto.status)}
                </div>
                <NeumorphicButton
                  onClick={() => setViewingContratto(contratto)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Visualizza
                </NeumorphicButton>
              </div>
            ))}
          </div>
        </NeumorphicCard>
      )}

      {/* Empty State */}
      {contratti.length === 0 && (
        <NeumorphicCard className="p-12 text-center">
          <FileText className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessun Contratto</h3>
          <p className="text-[#9b9b9b]">
            Non hai ancora ricevuto contratti. Quando l'amministratore ne invierà uno, apparirà qui.
          </p>
        </NeumorphicCard>
      )}

      {/* Viewing Modal */}
      {viewingContratto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec] z-10 pb-4">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">
                  {viewingContratto.template_nome || 'Contratto di Lavoro'}
                </h2>
                <button
                  onClick={() => {
                    setViewingContratto(null);
                    setFirmaNome(currentUser?.nome_cognome || currentUser?.full_name || '');
                  }}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              {/* Contract Content */}
              <div className="neumorphic-pressed p-6 rounded-xl mb-6 bg-white">
                <div 
                  className="prose prose-sm max-w-none text-[#6b6b6b]"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {viewingContratto.contenuto_contratto}
                </div>
              </div>

              {/* Contract Details */}
              <div className="neumorphic-flat p-5 rounded-xl mb-6">
                <h3 className="font-bold text-[#6b6b6b] mb-3">Dettagli Contratto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Tipo Contratto</p>
                    <p className="text-[#6b6b6b] font-medium">{viewingContratto.employee_group === 'FT' ? 'Full Time' : viewingContratto.employee_group === 'PT' ? 'Part Time' : 'Contratto Misto'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Ore Settimanali</p>
                    <p className="text-[#6b6b6b] font-medium">{viewingContratto.ore_settimanali}h/settimana</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Data Inizio</p>
                    <p className="text-[#6b6b6b] font-medium">
                      {new Date(viewingContratto.data_inizio_contratto).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Durata</p>
                    <p className="text-[#6b6b6b] font-medium">{viewingContratto.durata_contratto_mesi} mesi</p>
                  </div>
                </div>
              </div>

              {/* Signature Section */}
              {viewingContratto.status === 'inviato' ? (
                <div className="space-y-4">
                  <div className="neumorphic-flat p-5 rounded-xl bg-blue-50">
                    <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Firma Digitale
                    </h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Per firmare il contratto, inserisci il tuo nome e cognome completo come conferma di accettazione delle condizioni.
                    </p>
                    <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                      Nome e Cognome <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={firmaNome}
                      onChange={(e) => setFirmaNome(e.target.value)}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none mb-4"
                      placeholder="Mario Rossi"
                    />
                  </div>

                  <NeumorphicButton
                    onClick={handleFirmaContratto}
                    disabled={signing || !firmaNome.trim()}
                    variant="primary"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {signing ? (
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
                  </NeumorphicButton>
                </div>
              ) : (
                <div className="neumorphic-flat p-5 rounded-xl bg-green-50">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-green-800 mb-1">Contratto Firmato</h3>
                      <p className="text-sm text-green-700">
                        Firmato da <strong>{viewingContratto.firma_dipendente}</strong> il{' '}
                        {new Date(viewingContratto.data_firma).toLocaleDateString('it-IT')} alle{' '}
                        {new Date(viewingContratto.data_firma).toLocaleTimeString('it-IT')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </NeumorphicCard>
          </div>
        </div>
      )}
    </div>
  );
}