import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle,
  Eye,
  X,
  Edit,
  Download,
  AlertTriangle,
  BookOpen,
  Mail,
  CheckSquare,
  DollarSign
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import { isValid } from 'date-fns';

export default function ContrattiDipendente() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('contratti');
  const [viewingContract, setViewingContract] = useState(null);
  const [viewingLetter, setViewingLetter] = useState(null);
  const [viewingRegolamento, setViewingRegolamento] = useState(null);
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

  const { data: lettere = [] } = useQuery({
    queryKey: ['mie-lettere', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.LetteraRichiamo.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const { data: regolamentiFirmati = [] } = useQuery({
    queryKey: ['miei-regolamenti-firmati', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.RegolamentoFirmato.filter({ user_id: currentUser.id }) : [],
    enabled: !!currentUser,
  });

  const { data: regolamenti = [] } = useQuery({
    queryKey: ['regolamenti'],
    queryFn: () => base44.entities.RegolamentoDipendenti.list('-created_date'),
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

  const signLetterMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LetteraRichiamo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mie-lettere'] });
      setViewingLetter(null);
      setSignatureName(currentUser?.nome_cognome || currentUser?.full_name || '');
      alert('Lettera firmata con successo!');
    },
  });

  const signRegolamentoMutation = useMutation({
    mutationFn: (data) => base44.entities.RegolamentoFirmato.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miei-regolamenti-firmati'] });
      setViewingRegolamento(null);
      setSignatureName(currentUser?.nome_cognome || currentUser?.full_name || '');
      alert('Regolamento firmato con successo!');
    },
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

  const handleSignLetter = async () => {
    if (!signatureName.trim()) {
      alert('Inserisci il tuo nome e cognome per firmare');
      return;
    }

    if (!confirm('Confermando, dichiari di aver preso visione della lettera. Vuoi procedere con la firma?')) {
      return;
    }

    await signLetterMutation.mutateAsync({
      id: viewingLetter.id,
      data: {
        status: 'firmata',
        data_firma: new Date().toISOString(),
        firma_dipendente: signatureName.trim()
      }
    });
  };

  const handleSignRegolamento = async () => {
    if (!signatureName.trim()) {
      alert('Inserisci il tuo nome e cognome per firmare');
      return;
    }

    if (!confirm('Confermando, dichiari di aver letto e accettato il regolamento. Vuoi procedere con la firma?')) {
      return;
    }

    await signRegolamentoMutation.mutateAsync({
      user_id: currentUser.id,
      user_name: currentUser.nome_cognome || currentUser.full_name,
      regolamento_id: viewingRegolamento.id,
      regolamento_versione: viewingRegolamento.versione,
      data_firma: new Date().toISOString(),
      firma_dipendente: signatureName.trim()
    });
  };

  const userContracts = contratti;
  const toSignContracts = contratti.filter(c => c.status === 'inviato');
  const signedContracts = contratti.filter(c => c.status === 'firmato');

  // Lettere di richiamo e chiusura procedura
  const lettereRichiamo = lettere.filter(l => l.tipo !== 'chiusura_procedura');
  const chiusureProcedura = lettere.filter(l => l.tipo === 'chiusura_procedura');
  const lettereDaFirmare = lettere.filter(l => l.status === 'inviata' || l.status === 'visualizzata');
  const lettereFirmate = lettere.filter(l => l.status === 'firmata');

  // Regolamenti da firmare
  const regolamentoAttivo = regolamenti.find(r => r.attivo);
  const regolamentiInviati = regolamenti.filter(r => 
    r.inviato_a?.includes(currentUser?.id) || r.inviato_a?.includes(currentUser?.email)
  );
  const regolamentiFirmatiIds = regolamentiFirmati.map(rf => rf.regolamento_id);
  const regolamentiDaFirmare = regolamentiInviati.filter(r => !regolamentiFirmatiIds.includes(r.id));

  const { data: bustePaga = [] } = useQuery({
    queryKey: ['buste-paga'],
    queryFn: () => base44.entities.BustaPaga.list('-created_date'),
    enabled: !!currentUser
  });

  const mieBustePaga = bustePaga
    .filter(b => b.status === 'completed' && b.pdf_splits?.some(s => s.user_id === currentUser?.id))
    .map(b => {
      const mioSplit = b.pdf_splits.find(s => s.user_id === currentUser.id);
      return {
        ...b,
        mio_pdf_url: mioSplit?.pdf_url,
        page_number: mioSplit?.page_number
      };
    });

  const tabs = [
    { id: 'contratti', label: 'Contratti', icon: FileText, count: toSignContracts.length },
    { id: 'lettere', label: 'Lettere', icon: AlertTriangle, count: lettereDaFirmare.length },
    { id: 'regolamento', label: 'Regolamento', icon: BookOpen, count: regolamentiDaFirmare.length },
    { id: 'buste_paga', label: 'Buste Paga', icon: FileText, count: 0 }
  ];

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
          I Miei Documenti
        </h1>
        <p className="text-sm text-slate-500">Visualizza e firma i tuoi documenti</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'neumorphic-pressed bg-blue-50 text-blue-700'
                : 'neumorphic-flat text-slate-600 hover:text-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contratti Tab */}
      {activeTab === 'contratti' && (
        <>
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

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingContract(contract)}
                    className="flex-1 nav-button px-4 py-2.5 rounded-xl text-blue-600 font-medium flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizza
                  </button>
                  <button
                    onClick={() => {
                      const content = contract.contenuto_contratto || '';
                      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${contract.template_nome || 'Contratto'}_firmato.txt`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      a.remove();
                    }}
                    className="nav-button px-4 py-2.5 rounded-xl text-green-600 font-medium flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Scarica
                  </button>
                </div>
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
        </>
      )}

      {/* Lettere Tab */}
      {activeTab === 'lettere' && (
        <>
          {/* Lettere di Richiamo */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Lettere di Richiamo
            </h2>
            
            {lettereRichiamo.length === 0 ? (
              <NeumorphicCard className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nessuna lettera di richiamo</p>
              </NeumorphicCard>
            ) : (
              <div className="space-y-3">
                {lettereRichiamo.map(lettera => (
                  <NeumorphicCard 
                    key={lettera.id} 
                    className={`p-4 ${lettera.status === 'inviata' ? 'border-2 border-orange-300' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 text-sm mb-1">
                          {lettera.template_nome || 'Lettera di Richiamo'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {lettera.motivo || 'Motivo non specificato'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Inviata: {safeFormatDate(lettera.data_invio)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        lettera.status === 'firmata' 
                          ? 'bg-green-100 text-green-700'
                          : lettera.status === 'visualizzata'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {lettera.status === 'firmata' ? 'Firmata' : lettera.status === 'visualizzata' ? 'Visualizzata' : 'Da Firmare'}
                      </span>
                    </div>
                    
                    <button
                      onClick={async () => {
                        // Marca come visualizzata se è la prima volta
                        if (!lettera.data_visualizzazione) {
                          await base44.entities.LetteraRichiamo.update(lettera.id, {
                            data_visualizzazione: new Date().toISOString(),
                            status: 'visualizzata'
                          });
                          queryClient.invalidateQueries({ queryKey: ['mie-lettere'] });
                        }
                        setViewingLetter(lettera);
                        setSignatureName(currentUser?.nome_cognome || currentUser?.full_name || '');
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm ${
                        lettera.status === 'inviata' || lettera.status === 'visualizzata'
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                          : 'nav-button text-blue-600'
                      }`}
                    >
                      {lettera.status === 'inviata' || lettera.status === 'visualizzata' ? (
                        <>
                          <Edit className="w-4 h-4" />
                          Visualizza e Firma
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Visualizza
                        </>
                      )}
                    </button>
                  </NeumorphicCard>
                ))}
              </div>
            )}
          </div>

          {/* Chiusura Procedura */}
          <div className="mt-6">
            <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-600" />
              Chiusura Procedura
            </h2>
            
            {chiusureProcedura.length === 0 ? (
              <NeumorphicCard className="p-6 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nessuna chiusura procedura</p>
              </NeumorphicCard>
            ) : (
              <div className="space-y-3">
                {chiusureProcedura.map(lettera => (
                  <NeumorphicCard 
                    key={lettera.id} 
                    className={`p-4 ${lettera.status === 'inviata' ? 'border-2 border-green-300' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 text-sm mb-1">
                          Chiusura Procedura
                        </h3>
                        <p className="text-xs text-slate-500">
                          {lettera.motivo || 'Procedura conclusa'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Inviata: {safeFormatDate(lettera.data_invio)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        lettera.status === 'firmata' 
                          ? 'bg-green-100 text-green-700'
                          : lettera.status === 'visualizzata'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {lettera.status === 'firmata' ? 'Firmata' : lettera.status === 'visualizzata' ? 'Visualizzata' : 'Da Firmare'}
                      </span>
                    </div>
                    
                    <button
                      onClick={async () => {
                        // Marca come visualizzata se è la prima volta
                        if (!lettera.data_visualizzazione) {
                          await base44.entities.LetteraRichiamo.update(lettera.id, {
                            data_visualizzazione: new Date().toISOString(),
                            status: lettera.status === 'inviata' ? 'visualizzata' : lettera.status
                          });
                          queryClient.invalidateQueries({ queryKey: ['mie-lettere'] });
                        }
                        setViewingLetter(lettera);
                        setSignatureName(currentUser?.nome_cognome || currentUser?.full_name || '');
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm ${
                        lettera.status === 'inviata' || lettera.status === 'visualizzata'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          : 'nav-button text-blue-600'
                      }`}
                    >
                      {lettera.status === 'inviata' || lettera.status === 'visualizzata' ? (
                        <>
                          <Edit className="w-4 h-4" />
                          Visualizza e Firma
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Visualizza
                        </>
                      )}
                    </button>
                  </NeumorphicCard>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Buste Paga Tab */}
      {activeTab === 'buste_paga' && (
        <>
          {mieBustePaga.length === 0 ? (
            <NeumorphicCard className="p-8 text-center">
              <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessuna busta paga disponibile</p>
            </NeumorphicCard>
          ) : (
            <div className="space-y-3">
              {mieBustePaga.map(busta => (
                <NeumorphicCard key={busta.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800">
                        {new Date(busta.mese + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Disponibile dal: {new Date(busta.created_date).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <a
                      href={busta.mio_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 rounded-xl text-white font-medium flex items-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Scarica
                    </a>
                  </div>
                </NeumorphicCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* Regolamento Tab */}
      {activeTab === 'regolamento' && (
        <>
          {regolamentiDaFirmare.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Edit className="w-5 h-5 text-orange-600" />
                Da Firmare
              </h2>
              <div className="space-y-3">
                {regolamentiDaFirmare.map(reg => (
                  <NeumorphicCard 
                    key={reg.id} 
                    className="p-4 border-2 border-orange-300"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 text-sm mb-1">
                          {reg.titolo || 'Regolamento Dipendenti'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Versione {reg.versione}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                        Da Firmare
                      </span>
                    </div>
                    
                    <button
                      onClick={() => {
                        setViewingRegolamento(reg);
                        setSignatureName(currentUser?.nome_cognome || currentUser?.full_name || '');
                      }}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2.5 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Visualizza e Firma
                    </button>
                  </NeumorphicCard>
                ))}
              </div>
            </div>
          )}

          {regolamentiFirmati.length > 0 && (
            <div className="mt-4">
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Firmati
              </h2>
              <div className="space-y-3">
                {regolamentiFirmati.map(rf => {
                  const reg = regolamenti.find(r => r.id === rf.regolamento_id);
                  return (
                    <NeumorphicCard key={rf.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-800 text-sm mb-1">
                            {reg?.titolo || 'Regolamento Dipendenti'}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Versione {rf.regolamento_versione}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Firmato: {safeFormatDate(rf.data_firma)}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          Firmato
                        </span>
                      </div>
                    </NeumorphicCard>
                  );
                })}
              </div>
            </div>
          )}

          {regolamentiDaFirmare.length === 0 && regolamentiFirmati.length === 0 && (
            <NeumorphicCard className="p-8 text-center">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessun regolamento disponibile</p>
            </NeumorphicCard>
          )}
        </>
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

      {/* Letter Viewing Modal */}
      {viewingLetter && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-0">
          <div className="w-full h-full flex flex-col bg-white">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-lg flex items-center justify-between">
              <h2 className="text-lg lg:text-xl font-bold text-slate-800">
                {viewingLetter.tipo === 'chiusura_procedura' ? 'Chiusura Procedura' : 'Lettera di Richiamo'}
              </h2>
              <button
                onClick={() => {
                  setViewingLetter(null);
                  setSignatureName('');
                }}
                className="nav-button p-2 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="neumorphic-pressed p-6 rounded-xl mb-6">
                  <pre className="whitespace-pre-wrap text-sm lg:text-base text-slate-700 font-sans leading-relaxed">
                    {viewingLetter.contenuto}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-2xl">
              <div className="max-w-4xl mx-auto">
                {viewingLetter.status === 'inviata' || viewingLetter.status === 'visualizzata' ? (
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
                        className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      />
                    </div>

                    <button
                      onClick={handleSignLetter}
                      disabled={!signatureName.trim() || signLetterMutation.isPending}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg text-base"
                    >
                      {signLetterMutation.isPending ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Firma in corso...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6" />
                          Firma per Presa Visione
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800">Lettera Firmata</p>
                        <p className="text-xs text-green-600">
                          {safeFormatDateTime(viewingLetter.data_firma)}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Firma: {viewingLetter.firma_dipendente}
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

      {/* Regolamento Viewing Modal */}
      {viewingRegolamento && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-0">
          <div className="w-full h-full flex flex-col bg-white">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-lg flex items-center justify-between">
              <h2 className="text-lg lg:text-xl font-bold text-slate-800">
                {viewingRegolamento.titolo || 'Regolamento Dipendenti'}
              </h2>
              <button
                onClick={() => {
                  setViewingRegolamento(null);
                  setSignatureName('');
                }}
                className="nav-button p-2 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="neumorphic-pressed p-6 rounded-xl mb-6">
                  <pre className="whitespace-pre-wrap text-sm lg:text-base text-slate-700 font-sans leading-relaxed">
                    {viewingRegolamento.contenuto}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-2xl">
              <div className="max-w-4xl mx-auto">
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
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>

                  <button
                    onClick={handleSignRegolamento}
                    disabled={!signatureName.trim() || signRegolamentoMutation.isPending}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg text-base"
                  >
                    {signRegolamentoMutation.isPending ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Firma in corso...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-6 h-6" />
                        Accetto e Firmo il Regolamento
                      </>
                    )}
                  </button>

                  <div className="neumorphic-pressed p-3 rounded-xl bg-blue-50">
                    <p className="text-xs text-blue-800 text-center">
                      ℹ️ Firmando accetti i termini del regolamento aziendale
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}