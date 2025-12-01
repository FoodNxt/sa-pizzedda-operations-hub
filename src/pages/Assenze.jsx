import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { Calendar, Thermometer, Check, X, Clock, FileText, User, AlertCircle, Copy, Loader2 } from "lucide-react";
import moment from "moment";

export default function Assenze() {
  const [activeTab, setActiveTab] = useState('ferie');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalMode, setApprovalMode] = useState(null); // 'ferie_only' o 'ferie_liberi'
  const queryClient = useQueryClient();

  const { data: richiesteFerie = [], isLoading: loadingFerie } = useQuery({
    queryKey: ['richieste-ferie'],
    queryFn: () => base44.entities.RichiestaFerie.list('-created_date', 200),
  });

  const { data: richiesteMalattia = [], isLoading: loadingMalattia } = useQuery({
    queryKey: ['richieste-malattia'],
    queryFn: () => base44.entities.RichiestaMalattia.list('-created_date', 200),
  });

  const { data: turniPlanday = [] } = useQuery({
    queryKey: ['turni-planday-assenze'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 500),
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const updateFerieMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RichiestaFerie.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['richieste-ferie'] });
      setSelectedRequest(null);
      setApprovalMode(null);
    },
  });

  const updateMalattiaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RichiestaMalattia.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['richieste-malattia'] });
      setSelectedRequest(null);
    },
  });

  const updateTurnoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TurnoPlanday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-planday-assenze'] });
    },
  });

  const createTurnoMutation = useMutation({
    mutationFn: (data) => base44.entities.TurnoPlanday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni-planday-assenze'] });
    },
  });

  const handleApproveFerie = async (request, mode) => {
    // Aggiorna i turni coinvolti
    for (const turnoId of (request.turni_coinvolti || [])) {
      const turno = turniPlanday.find(t => t.id === turnoId);
      if (turno) {
        if (mode === 'ferie_liberi') {
          // Crea copia del turno come libero
          await createTurnoMutation.mutateAsync({
            ...turno,
            id: undefined,
            dipendente_id: '',
            dipendente_nome: '',
            tipo_turno: 'Normale',
            note: `Turno liberato per ferie di ${request.dipendente_nome}`
          });
        }
        // Aggiorna turno originale come Ferie
        await updateTurnoMutation.mutateAsync({
          id: turnoId,
          data: { tipo_turno: 'Ferie' }
        });
      }
    }

    // Approva la richiesta
    await updateFerieMutation.mutateAsync({
      id: request.id,
      data: {
        stato: 'approvata',
        turni_resi_liberi: mode === 'ferie_liberi',
        data_approvazione: new Date().toISOString(),
        approvato_da: user?.email
      }
    });
  };

  const handleRejectFerie = async (request) => {
    await updateFerieMutation.mutateAsync({
      id: request.id,
      data: {
        stato: 'rifiutata',
        data_approvazione: new Date().toISOString(),
        approvato_da: user?.email
      }
    });
  };

  const handleVerifyMalattia = async (request, approved) => {
    // Aggiorna i turni coinvolti
    for (const turnoId of (request.turni_coinvolti || [])) {
      await updateTurnoMutation.mutateAsync({
        id: turnoId,
        data: { 
          tipo_turno: approved ? 'Malattia (Certificata)' : 'Malattia (Non Certificata)'
        }
      });
    }

    await updateMalattiaMutation.mutateAsync({
      id: request.id,
      data: {
        stato: approved ? 'certificata' : 'rifiutata',
        data_verifica: new Date().toISOString(),
        verificato_da: user?.email
      }
    });
  };

  const getStatoColor = (stato) => {
    switch (stato) {
      case 'in_attesa': return 'bg-yellow-100 text-yellow-800';
      case 'approvata': case 'certificata': return 'bg-green-100 text-green-800';
      case 'rifiutata': return 'bg-red-100 text-red-800';
      case 'non_certificata': return 'bg-orange-100 text-orange-800';
      case 'in_attesa_verifica': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatoLabel = (stato) => {
    switch (stato) {
      case 'in_attesa': return 'In Attesa';
      case 'approvata': return 'Approvata';
      case 'rifiutata': return 'Rifiutata';
      case 'non_certificata': return 'Non Certificata';
      case 'in_attesa_verifica': return 'In Verifica';
      case 'certificata': return 'Certificata';
      default: return stato;
    }
  };

  const ferieInAttesa = richiesteFerie.filter(r => r.stato === 'in_attesa').length;
  const malattiaInAttesa = richiesteMalattia.filter(r => r.stato === 'non_certificata' || r.stato === 'in_attesa_verifica').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Gestione Assenze
          </h1>
          <p className="text-slate-500 mt-1">Ferie e malattie dei dipendenti</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NeumorphicCard className="p-4 text-center">
            <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{richiesteFerie.length}</p>
            <p className="text-xs text-slate-500">Richieste Ferie</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{ferieInAttesa}</p>
            <p className="text-xs text-slate-500">Ferie da Approvare</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <Thermometer className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{richiesteMalattia.length}</p>
            <p className="text-xs text-slate-500">Richieste Malattia</p>
          </NeumorphicCard>
          <NeumorphicCard className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{malattiaInAttesa}</p>
            <p className="text-xs text-slate-500">Malattie da Verificare</p>
          </NeumorphicCard>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ferie')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'ferie'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Ferie {ferieInAttesa > 0 && <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full">{ferieInAttesa}</span>}
          </button>
          <button
            onClick={() => setActiveTab('malattia')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'malattia'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                : 'neumorphic-flat text-slate-700'
            }`}
          >
            <Thermometer className="w-4 h-4" />
            Malattia {malattiaInAttesa > 0 && <span className="bg-orange-400 text-orange-900 text-xs px-2 py-0.5 rounded-full">{malattiaInAttesa}</span>}
          </button>
        </div>

        {/* Tab Ferie */}
        {activeTab === 'ferie' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Richieste Ferie</h2>
            
            {loadingFerie ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
              </div>
            ) : richiesteFerie.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nessuna richiesta di ferie</p>
            ) : (
              <div className="space-y-3">
                {richiesteFerie.map(request => (
                  <div key={request.id} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="font-bold text-slate-800">{request.dipendente_nome}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatoColor(request.stato)}`}>
                            {getStatoLabel(request.stato)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>📅 Dal {moment(request.data_inizio).format('DD/MM/YYYY')} al {moment(request.data_fine).format('DD/MM/YYYY')}</p>
                          {request.motivo && <p>💬 {request.motivo}</p>}
                          <p className="text-xs text-slate-400">Turni coinvolti: {request.turni_coinvolti?.length || 0}</p>
                          {request.turni_resi_liberi && <p className="text-xs text-green-600">✓ Turni resi disponibili</p>}
                        </div>
                      </div>
                      
                      {request.stato === 'in_attesa' && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => { setSelectedRequest(request); setApprovalMode('select'); }}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Approva
                          </button>
                          <button
                            onClick={() => handleRejectFerie(request)}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Rifiuta
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Tab Malattia */}
        {activeTab === 'malattia' && (
          <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Richieste Malattia</h2>
            
            {loadingMalattia ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto" />
              </div>
            ) : richiesteMalattia.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nessuna richiesta di malattia</p>
            ) : (
              <div className="space-y-3">
                {richiesteMalattia.map(request => (
                  <div key={request.id} className="neumorphic-pressed p-4 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="font-bold text-slate-800">{request.dipendente_nome}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatoColor(request.stato)}`}>
                            {getStatoLabel(request.stato)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>📅 Dal {moment(request.data_inizio).format('DD/MM/YYYY')} {request.data_fine && `al ${moment(request.data_fine).format('DD/MM/YYYY')}`}</p>
                          {request.descrizione && <p>💬 {request.descrizione}</p>}
                          <p className="text-xs text-slate-400">Turni coinvolti: {request.turni_coinvolti?.length || 0}</p>
                          {request.certificato_url && (
                            <a href={request.certificato_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Vedi Certificato
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {(request.stato === 'non_certificata' || request.stato === 'in_attesa_verifica') && request.certificato_url && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleVerifyMalattia(request, true)}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Certifica
                          </button>
                          <button
                            onClick={() => handleVerifyMalattia(request, false)}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Rifiuta
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </NeumorphicCard>
        )}

        {/* Modal Approvazione Ferie */}
        {selectedRequest && approvalMode === 'select' && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => { setSelectedRequest(null); setApprovalMode(null); }} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
              <NeumorphicCard className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Approva Ferie</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Come vuoi gestire i turni di <strong>{selectedRequest.dipendente_nome}</strong>?
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleApproveFerie(selectedRequest, 'ferie_only')}
                    disabled={updateFerieMutation.isPending}
                    className="w-full p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 bg-blue-50 text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-800">Solo Ferie</p>
                        <p className="text-xs text-slate-500">I turni verranno segnati come Ferie</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleApproveFerie(selectedRequest, 'ferie_liberi')}
                    disabled={updateFerieMutation.isPending}
                    className="w-full p-4 rounded-xl border-2 border-green-200 hover:border-green-400 bg-green-50 text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Copy className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-slate-800">Ferie + Turni Liberi</p>
                        <p className="text-xs text-slate-500">Crea copie dei turni come disponibili per altri</p>
                      </div>
                    </div>
                  </button>
                </div>
                
                <button
                  onClick={() => { setSelectedRequest(null); setApprovalMode(null); }}
                  className="w-full mt-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Annulla
                </button>
              </NeumorphicCard>
            </div>
          </>
        )}
    </div>
  );
}