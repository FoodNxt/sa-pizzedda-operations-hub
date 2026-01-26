import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Edit, Save, X, Trash2, Send, CheckCircle, Clock, Eye, Download,
  AlertCircle, User, Briefcase, FileEdit, AlertTriangle, BookOpen, History, Settings, Loader2,
  Upload, DollarSign, Folder, FolderPlus
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { isValid } from 'date-fns';

export default function Documenti() {
  const [activeTab, setActiveTab] = useState('contratti');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      const normalizedType = user.user_type === 'user' ? 'dipendente' : user.user_type;
      setIsAdmin(normalizedType === 'admin' || normalizedType === 'manager');
    });
  }, []);

  if (!currentUser) {
    return (
      <ProtectedPage pageName="Documenti">
        <div className="max-w-7xl mx-auto p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </ProtectedPage>
    );
  }

  // Vista Dipendente
  if (!isAdmin) {
    return (
      <ProtectedPage pageName="Documenti">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="mb-4">
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
              I Miei Documenti
            </h1>
            <p className="text-sm text-slate-500">Contratti, lettere e regolamenti</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('contratti')}
              className={`px-3 py-2 rounded-xl font-medium transition-all text-xs whitespace-nowrap ${
                activeTab === 'contratti' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'nav-button text-slate-700'
              }`}
            >
              Contratti
            </button>
            <button
              onClick={() => setActiveTab('lettere')}
              className={`px-3 py-2 rounded-xl font-medium transition-all text-xs whitespace-nowrap ${
                activeTab === 'lettere' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'nav-button text-slate-700'
              }`}
            >
              Lettere
            </button>
            <button
              onClick={() => setActiveTab('regolamento')}
              className={`px-3 py-2 rounded-xl font-medium transition-all text-xs whitespace-nowrap ${
                activeTab === 'regolamento' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'nav-button text-slate-700'
              }`}
            >
              Regolamento
            </button>
            <button
              onClick={() => setActiveTab('buste_paga')}
              className={`px-3 py-2 rounded-xl font-medium transition-all text-xs whitespace-nowrap ${
                activeTab === 'buste_paga' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'nav-button text-slate-700'
              }`}
            >
              Buste Paga
            </button>
            <button
              onClick={() => setActiveTab('unilav')}
              className={`px-3 py-2 rounded-xl font-medium transition-all text-xs whitespace-nowrap ${
                activeTab === 'unilav' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'nav-button text-slate-700'
              }`}
            >
              Unilav
            </button>
          </div>

          {activeTab === 'contratti' && <DipendenteContrattiSection currentUser={currentUser} />}
          {activeTab === 'lettere' && <DipendenteLettereSection currentUser={currentUser} />}
          {activeTab === 'regolamento' && <DipendenteRegolamentoSection currentUser={currentUser} />}
          {activeTab === 'buste_paga' && <DipendenteBustePagaSection currentUser={currentUser} />}
          {activeTab === 'unilav' && <DipendenteUnilavSection currentUser={currentUser} />}
        </div>
      </ProtectedPage>
    );
  }

  // Vista Admin
  return (
    <ProtectedPage pageName="Documenti">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-10 h-10 text-[#8b7355]" />
              <h1 className="text-3xl font-bold text-[#6b6b6b]">Gestione Documenti</h1>
            </div>
            <p className="text-[#9b9b9b]">Contratti, lettere di richiamo e regolamento dipendenti</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('contratti')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'contratti' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Contratti
          </button>
          <button
            onClick={() => setActiveTab('lettere')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'lettere' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Lettere Richiamo
          </button>
          <button
            onClick={() => setActiveTab('regolamento')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'regolamento' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Regolamento
          </button>
          <button
            onClick={() => setActiveTab('buste_paga')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'buste_paga' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Buste Paga
          </button>
          <button
            onClick={() => setActiveTab('unilav')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'unilav' ? 'neumorphic-pressed text-[#8b7355]' : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            Unilav
          </button>
        </div>

        {activeTab === 'contratti' && <ContrattiSection />}
        {activeTab === 'lettere' && <LettereSection />}
        {activeTab === 'regolamento' && <RegolamentoSection />}
        {activeTab === 'buste_paga' && <BustePagaSection />}
        {activeTab === 'unilav' && <UnilavSection />}
      </div>
    </ProtectedPage>
  );
}

// ============= DIPENDENTE VIEWS =============

function DipendenteContrattiSection({ currentUser }) {
  const [viewingContract, setViewingContract] = useState(null);
  const [signatureName, setSignatureName] = useState(currentUser?.nome_cognome || currentUser?.full_name || '');
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const queryClient = useQueryClient();

  const downloadContrattoFirmato = async (contratto) => {
    setDownloadingPdf(contratto.id);
    try {
      const response = await base44.functions.invoke('downloadContrattoPDF', { contrattoId: contratto.id });
      if (response.data.success) {
        const byteCharacters = atob(response.data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Errore nel download');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Errore nel download del PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const { data: contratti = [], isLoading } = useQuery({
    queryKey: ['miei-contratti', currentUser?.id],
    queryFn: () => base44.entities.Contratto.filter({ user_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const signMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contratto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miei-contratti'] });
      setViewingContract(null);
      alert('Contratto firmato con successo!');
    },
  });

  const handleSign = () => {
    if (!signatureName.trim()) {
      alert('Inserisci il tuo nome per firmare');
      return;
    }
    if (!confirm('Confermi di aver letto e accettato il contratto?')) return;
    
    signMutation.mutate({
      id: viewingContract.id,
      data: { ...viewingContract, status: 'firmato', data_firma: new Date().toISOString(), firma_dipendente: signatureName.trim() }
    });
  };

  const toSign = contratti.filter(c => c.status === 'inviato');
  const signed = contratti.filter(c => c.status === 'firmato');

  if (isLoading) return <NeumorphicCard className="p-8 text-center"><p>Caricamento...</p></NeumorphicCard>;

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
                      <h3 className="font-bold text-slate-800 text-sm lg:text-base truncate">{c.template_nome}</h3>
                      <p className="text-xs text-slate-500">{c.employee_group} - {c.ore_settimanali}h/sett</p>
                    </div>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0">Da Firmare</span>
                  </div>
                </div>
                <button onClick={() => setViewingContract(c)} className="w-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-sm">
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
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base truncate">{c.template_nome}</h3>
                    <p className="text-xs text-slate-500">Firmato: {c.data_firma ? new Date(c.data_firma).toLocaleDateString('it-IT') : 'N/A'}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setViewingContract(c)} className="nav-button p-2 rounded-lg">
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <button 
                      onClick={() => downloadContrattoFirmato(c)} 
                      className="nav-button p-2 rounded-lg"
                      disabled={downloadingPdf === c.id}
                    >
                      {downloadingPdf === c.id ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {contratti.length === 0 && (
        <NeumorphicCard className="p-8 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun contratto disponibile</p>
        </NeumorphicCard>
      )}

      {viewingContract && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-0">
          <div className="w-full h-full flex flex-col bg-white">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-lg flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{viewingContract.template_nome}</h2>
              <button onClick={() => setViewingContract(null)} className="nav-button p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div className="max-w-4xl mx-auto neumorphic-pressed p-6 rounded-xl">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{viewingContract.contenuto_contratto}</pre>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-2xl">
              <div className="max-w-4xl mx-auto">
                {viewingContract.status === 'inviato' ? (
                  <div className="space-y-3">
                    <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Nome e Cognome" className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
                    <button onClick={handleSign} disabled={signMutation.isPending} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2">
                      <CheckCircle className="w-6 h-6" /> {signMutation.isPending ? 'Firma in corso...' : 'Firma Contratto'}
                    </button>
                  </div>
                ) : (
                  <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Contratto Firmato</p>
                        <p className="text-xs text-green-600">Firma: {viewingContract.firma_dipendente}</p>
                      </div>
                    </div>
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

function DipendenteLettereSection({ currentUser }) {
  const [viewingLettera, setViewingLettera] = useState(null);
  const [signatureName, setSignatureName] = useState(currentUser?.nome_cognome || currentUser?.full_name || '');
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const queryClient = useQueryClient();

  const downloadLetteraPDF = async (lettera) => {
    setDownloadingPdf(lettera.id);
    try {
      const response = await base44.functions.invoke('downloadLetteraPDF', { letteraId: lettera.id });
      if (response.data.success) {
        const byteCharacters = atob(response.data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Errore nel download');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Errore nel download del PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const { data: lettere = [], isLoading } = useQuery({
    queryKey: ['mie-lettere', currentUser?.id],
    queryFn: async () => {
      const data = await base44.entities.LetteraRichiamo.filter({ user_id: currentUser.id });
      base44.functions.invoke('processAutomaticChiusuraProcedura', {}).catch(err => 
        console.log('Background automation check:', err)
      );
      return data;
    },
    enabled: !!currentUser,
  });

  const signMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LetteraRichiamo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mie-lettere'] });
      setViewingLettera(null);
      alert('Documento firmato con successo!');
    },
  });

  const handleViewLettera = async (lettera) => {
    setViewingLettera(lettera);
    
    if (lettera.tipo_lettera === 'lettera_richiamo' && !lettera.data_visualizzazione) {
      try {
        await base44.entities.LetteraRichiamo.update(lettera.id, {
          data_visualizzazione: new Date().toISOString()
        });
        
        // Trigger automation check
        base44.functions.invoke('processAutomaticChiusuraProcedura', {})
          .catch(err => console.log('Background automation check:', err));
        
        queryClient.invalidateQueries({ queryKey: ['mie-lettere'] });
      } catch (error) {
        console.error('Error marking as viewed:', error);
      }
    }
  };

  const handleSign = () => {
    if (!signatureName.trim()) {
      alert('Inserisci il tuo nome per firmare');
      return;
    }
    if (!confirm('Confermi di aver letto e preso visione del documento?')) return;
    
    signMutation.mutate({
      id: viewingLettera.id,
      data: { ...viewingLettera, status: 'firmata', data_firma: new Date().toISOString(), firma_dipendente: signatureName.trim() }
    });
  };

  const toSign = lettere.filter(l => l.status === 'inviata');
  const signed = lettere.filter(l => l.status === 'firmata');

  const getTipoLabel = (tipo) => {
    return tipo === 'lettera_richiamo' ? 'Lettera di Richiamo' : 'Chiusura Procedura';
  };

  if (isLoading) return <NeumorphicCard className="p-8 text-center"><p>Caricamento...</p></NeumorphicCard>;

  return (
    <>
      {toSign.length > 0 && (
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" /> Da Firmare ({toSign.length})
          </h2>
          <div className="space-y-3">
            {toSign.map(l => (
              <NeumorphicCard key={l.id} className="p-3 lg:p-4 border-2 border-orange-300">
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm lg:text-base">{getTipoLabel(l.tipo_lettera)}</h3>
                      <p className="text-xs text-slate-500">Ricevuta: {l.data_invio ? new Date(l.data_invio).toLocaleDateString('it-IT') : 'N/A'}</p>
                    </div>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0">Da Firmare</span>
                  </div>
                </div>
                <button onClick={() => handleViewLettera(l)} className="w-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-sm">
                  <Eye className="w-4 h-4" /> Visualizza e Firma
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
            {signed.map(l => (
              <NeumorphicCard key={l.id} className="p-3 lg:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm lg:text-base">{getTipoLabel(l.tipo_lettera)}</h3>
                    <p className="text-xs text-slate-500">Firmato: {l.data_firma ? new Date(l.data_firma).toLocaleDateString('it-IT') : 'N/A'}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleViewLettera(l)} className="nav-button p-2 rounded-lg">
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <button 
                      onClick={() => downloadLetteraPDF(l)} 
                      className="nav-button p-2 rounded-lg"
                      disabled={downloadingPdf === l.id}
                    >
                      {downloadingPdf === l.id ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {lettere.length === 0 && (
        <NeumorphicCard className="p-8 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessuna lettera disponibile</p>
        </NeumorphicCard>
      )}

      {viewingLettera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-0">
          <div className="w-full h-full flex flex-col bg-white">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-lg flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{getTipoLabel(viewingLettera.tipo_lettera)}</h2>
              <button onClick={() => setViewingLettera(null)} className="nav-button p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div className="max-w-4xl mx-auto neumorphic-pressed p-6 rounded-xl">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{viewingLettera.contenuto_lettera}</pre>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-2xl">
              <div className="max-w-4xl mx-auto">
                {viewingLettera.status === 'inviata' ? (
                  <div className="space-y-3">
                    <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Nome e Cognome" className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
                    <button onClick={handleSign} disabled={signMutation.isPending} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2">
                      <CheckCircle className="w-6 h-6" /> {signMutation.isPending ? 'Firma in corso...' : 'Firma per Presa Visione'}
                    </button>
                  </div>
                ) : (
                  <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Documento Firmato</p>
                        <p className="text-xs text-green-600">Firma: {viewingLettera.firma_dipendente}</p>
                      </div>
                    </div>
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

function DipendenteUnilavSection({ currentUser }) {
  const { data: unilavDocs = [], isLoading } = useQuery({
    queryKey: ['unilav-docs', currentUser?.id],
    queryFn: () => base44.entities.Unilav.filter({ user_id: currentUser?.id }),
    enabled: !!currentUser,
  });

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
      {unilavDocs.length === 0 ? (
        <NeumorphicCard className="p-8 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun documento Unilav disponibile</p>
        </NeumorphicCard>
      ) : (
        <div className="space-y-3">
          {unilavDocs.map(doc => (
            <NeumorphicCard key={doc.id} className="p-3 lg:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm lg:text-base truncate">
                    {doc.descrizione || 'Documento Unilav'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {doc.data_documento 
                      ? new Date(doc.data_documento).toLocaleDateString('it-IT')
                      : new Date(doc.created_date).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <a
                  href={doc.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-sm flex-shrink-0"
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
  );
}

function DipendenteBustePagaSection({ currentUser }) {
  const { data: bustePaga = [], isLoading } = useQuery({
    queryKey: ['buste-paga'],
    queryFn: () => base44.entities.BustaPaga.list('-created_date'),
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
      {mieBustePaga.length === 0 ? (
        <NeumorphicCard className="p-8 text-center">
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessuna busta paga disponibile</p>
        </NeumorphicCard>
      ) : (
        <div className="space-y-3">
          {mieBustePaga.map(busta => (
            <NeumorphicCard key={busta.id} className="p-3 lg:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm lg:text-base">
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
                  className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-sm flex-shrink-0"
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
  );
}

function DipendenteRegolamentoSection({ currentUser }) {
  const [viewingRegolamento, setViewingRegolamento] = useState(null);
  const [signatureName, setSignatureName] = useState(currentUser?.nome_cognome || currentUser?.full_name || '');
  const queryClient = useQueryClient();

  const { data: firme = [], isLoading } = useQuery({
    queryKey: ['mie-firme-regolamento', currentUser?.id],
    queryFn: () => base44.entities.RegolamentoFirmato.filter({ user_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const { data: regolamenti = [] } = useQuery({
    queryKey: ['regolamenti-attivi'],
    queryFn: () => base44.entities.RegolamentoDipendenti.list('-versione'),
  });

  const signMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RegolamentoFirmato.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mie-firme-regolamento'] });
      setViewingRegolamento(null);
      alert('Regolamento firmato con successo!');
    },
  });

  const handleSign = () => {
    if (!signatureName.trim()) {
      alert('Inserisci il tuo nome per firmare');
      return;
    }
    if (!confirm('Confermi di aver letto e accettato il regolamento?')) return;
    
    signMutation.mutate({
      id: viewingRegolamento.id,
      data: { ...viewingRegolamento, firmato: true, data_firma: new Date().toISOString(), firma_dipendente: signatureName.trim() }
    });
  };

  const getRegolamentoContent = (regolamentoId) => {
    const reg = regolamenti.find(r => r.id === regolamentoId);
    return reg?.contenuto || 'Contenuto non disponibile';
  };

  const toSign = firme.filter(f => !f.firmato);
  const signed = firme.filter(f => f.firmato).sort((a, b) => (b.versione || 0) - (a.versione || 0));
  
  // Get the latest signed version
  const latestSigned = signed.length > 0 ? signed[0] : null;

  if (isLoading) return <NeumorphicCard className="p-8 text-center"><p>Caricamento...</p></NeumorphicCard>;

  return (
    <>
      {toSign.length > 0 && (
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" /> Da Firmare ({toSign.length})
          </h2>
          <div className="space-y-3">
            {toSign.map(f => (
              <NeumorphicCard key={f.id} className="p-3 lg:p-4 border-2 border-orange-300">
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm lg:text-base">Regolamento v{f.versione}</h3>
                      <p className="text-xs text-slate-500">Ricevuto: {f.created_date ? new Date(f.created_date).toLocaleDateString('it-IT') : 'N/A'}</p>
                    </div>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0">Da Firmare</span>
                  </div>
                </div>
                <button onClick={() => setViewingRegolamento(f)} className="w-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-sm">
                  <Eye className="w-4 h-4" /> Visualizza e Firma
                </button>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {/* Latest Signed Regulation - Always visible */}
      {latestSigned && (
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" /> Regolamento Attuale
          </h2>
          <NeumorphicCard className="p-3 lg:p-4 border-2 border-green-200">
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm lg:text-base">Regolamento v{latestSigned.versione}</h3>
                  <p className="text-xs text-green-600">✓ Firmato: {latestSigned.data_firma ? new Date(latestSigned.data_firma).toLocaleDateString('it-IT') : 'N/A'}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0">Attivo</span>
              </div>
            </div>
            <button onClick={() => setViewingRegolamento(latestSigned)} className="w-full nav-button px-4 py-3 rounded-xl text-blue-600 font-medium flex items-center justify-center gap-2 text-sm">
              <Eye className="w-4 h-4" /> Visualizza Regolamento
            </button>
          </NeumorphicCard>
        </div>
      )}

      {/* Previous versions */}
      {signed.length > 1 && (
        <div>
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <History className="w-4 h-4 lg:w-5 lg:h-5 text-slate-500" /> Versioni Precedenti ({signed.length - 1})
          </h2>
          <div className="space-y-3">
            {signed.slice(1).map(f => (
              <NeumorphicCard key={f.id} className="p-3 lg:p-4 opacity-75">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-600 text-sm lg:text-base">Regolamento v{f.versione}</h3>
                    <p className="text-xs text-slate-500">Firmato: {f.data_firma ? new Date(f.data_firma).toLocaleDateString('it-IT') : 'N/A'}</p>
                  </div>
                  <button onClick={() => setViewingRegolamento(f)} className="nav-button p-2 rounded-lg flex-shrink-0">
                    <Eye className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      )}

      {firme.length === 0 && (
        <NeumorphicCard className="p-8 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun regolamento disponibile</p>
        </NeumorphicCard>
      )}

      {viewingRegolamento && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-0">
          <div className="w-full h-full flex flex-col bg-white">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-lg flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Regolamento Dipendenti v{viewingRegolamento.versione}</h2>
              <button onClick={() => setViewingRegolamento(null)} className="nav-button p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div className="max-w-4xl mx-auto neumorphic-pressed p-6 rounded-xl">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{getRegolamentoContent(viewingRegolamento.regolamento_id)}</pre>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-2xl">
              <div className="max-w-4xl mx-auto">
                {!viewingRegolamento.firmato ? (
                  <div className="space-y-3">
                    <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Nome e Cognome" className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
                    <button onClick={handleSign} disabled={signMutation.isPending} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2">
                      <CheckCircle className="w-6 h-6" /> {signMutation.isPending ? 'Firma in corso...' : 'Firma Regolamento'}
                    </button>
                  </div>
                ) : (
                  <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Regolamento Firmato</p>
                        <p className="text-xs text-green-600">Firma: {viewingRegolamento.firma_dipendente}</p>
                      </div>
                    </div>
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

// ============= ADMIN VIEWS =============

// Contratti Section
function ContrattiSection() {
  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingContratto, setEditingContratto] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [previewContratto, setPreviewContratto] = useState(null);
  const [templateTextareaRef, setTemplateTextareaRef] = useState(null);
  
  // Drive settings
  const [showDriveSettings, setShowDriveSettings] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [driveFolders, setDriveFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '', user_email: '', user_nome_cognome: '', template_id: '', nome_cognome: '',
    phone: '', data_nascita: '', citta_nascita: '', codice_fiscale: '', indirizzo_residenza: '',
    iban: '', taglia_maglietta: '', user_type: 'dipendente', ruoli_dipendente: [],
    assigned_stores: [], employee_group: '', function_name: '', ore_settimanali: 0,
    data_inizio_contratto: '', data_fine_contratto: '', durata_contratto_mesi: 0, status: 'bozza', note: ''
  });
  const [editablePreview, setEditablePreview] = useState('');
  const [templateData, setTemplateData] = useState({
    nome_template: '', contenuto_template: '', descrizione: '', attivo: true
  });

  const queryClient = useQueryClient();
  const { data: contratti = [] } = useQuery({
    queryKey: ['contratti'],
    queryFn: () => base44.entities.Contratto.list('-created_date'),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['contratto-templates'],
    queryFn: () => base44.entities.ContrattoTemplate.list(),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: driveConfig = [] } = useQuery({
    queryKey: ['drive-config-contratti'],
    queryFn: () => base44.entities.DriveConfig.filter({ config_type: 'contratti', is_active: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contratto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contratto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contratto.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contratti'] }),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ContrattoTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratto-templates'] });
      resetTemplateForm();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContrattoTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratto-templates'] });
      resetTemplateForm();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ContrattoTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contratto-templates'] }),
  });

  const resetForm = () => {
    setFormData({
      user_id: '', user_email: '', user_nome_cognome: '', template_id: '', nome_cognome: '',
      phone: '', data_nascita: '', citta_nascita: '', codice_fiscale: '', indirizzo_residenza: '',
      iban: '', taglia_maglietta: '', user_type: 'dipendente', ruoli_dipendente: [],
      assigned_stores: [], employee_group: '', function_name: '', ore_settimanali: 0,
      data_inizio_contratto: '', data_fine_contratto: '', durata_contratto_mesi: 0, status: 'bozza', note: ''
    });
    setSelectedTemplate('');
    setEditingContratto(null);
    setShowForm(false);
    setEditablePreview('');
  };

  const resetTemplateForm = () => {
    setTemplateData({ nome_template: '', contenuto_template: '', descrizione: '', attivo: true });
    setEditingTemplate(null);
    setShowTemplateForm(false);
  };

  const replaceVariables = async (templateContent, data) => {
    let result = templateContent;
    const oggi = new Date().toLocaleDateString('it-IT');
    let dataFineContratto = '';
    if (data.data_inizio_contratto && data.durata_contratto_mesi) {
      const dataInizio = new Date(data.data_inizio_contratto);
      const dataFine = new Date(dataInizio);
      dataFine.setMonth(dataFine.getMonth() + parseInt(data.durata_contratto_mesi));
      dataFineContratto = dataFine.toLocaleDateString('it-IT');
    }
    
    // Find first contract date for this user
    let dataInizioPrimoContratto = '';
    if (data.user_id) {
      const tuttiContratti = await base44.entities.Contratto.filter({ user_id: data.user_id, status: 'firmato' });
      if (tuttiContratti.length > 0) {
        const contrattoPiuVecchio = tuttiContratti.sort((a, b) => 
          new Date(a.data_inizio_contratto) - new Date(b.data_inizio_contratto)
        )[0];
        if (contrattoPiuVecchio.data_inizio_contratto) {
          dataInizioPrimoContratto = new Date(contrattoPiuVecchio.data_inizio_contratto).toLocaleDateString('it-IT');
        }
      }
    }
    
    const variables = {
      '{{nome_cognome}}': data.nome_cognome || '', 
      '{{phone}}': data.phone || '',
      '{{data_nascita}}': data.data_nascita ? new Date(data.data_nascita).toLocaleDateString('it-IT') : '',
      '{{citta_nascita}}': data.citta_nascita || '', 
      '{{codice_fiscale}}': data.codice_fiscale || '',
      '{{indirizzo_residenza}}': data.indirizzo_residenza || '', 
      '{{iban}}': data.iban || '',
      '{{employee_group}}': data.employee_group || '', 
      '{{function_name}}': data.function_name || '',
      '{{ore_settimanali}}': data.ore_settimanali?.toString() || '',
      '{{data_inizio_contratto}}': data.data_inizio_contratto ? new Date(data.data_inizio_contratto).toLocaleDateString('it-IT') : '',
      '{{durata_contratto_mesi}}': data.durata_contratto_mesi?.toString() || '',
      '{{data_oggi}}': oggi, 
      '{{data_fine_contratto}}': dataFineContratto,
      '{{ruoli}}': (data.ruoli_dipendente || []).join(', '),
      '{{locali}}': (data.assigned_stores || []).join(', ') || 'Tutti i locali',
      '{{data_inizio_primo_contratto}}': dataInizioPrimoContratto,
      '{{ruoli_dipendente}}': (data.ruoli_dipendente || []).join(', ')
    };

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      result = result.replace(regex, variables[key]);
    });

    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) {
      alert('Seleziona un template per il contratto');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) {
      alert('Template non trovato');
      return;
    }

    // Calculate data_fine_contratto if not manually set
    let dataFineContratto = formData.data_fine_contratto;
    if (!dataFineContratto && formData.data_inizio_contratto && formData.durata_contratto_mesi > 0) {
      const dataInizio = new Date(formData.data_inizio_contratto);
      const dataFine = new Date(dataInizio);
      dataFine.setMonth(dataFine.getMonth() + parseInt(formData.durata_contratto_mesi));
      dataFineContratto = dataFine.toISOString().split('T')[0];
    }

    const contrattoData = {
      ...formData,
      data_fine_contratto: dataFineContratto,
      template_id: template.id,
      template_nome: template.nome_template,
      contenuto_contratto: editablePreview
    };

    if (editingContratto) {
      updateMutation.mutate({ id: editingContratto.id, data: contrattoData });
    } else {
      createMutation.mutate(contrattoData);
    }
  };

  const handleSubmitTemplate = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateData });
    } else {
      createTemplateMutation.mutate(templateData);
    }
  };

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setFormData({
        ...formData,
        user_id: user.id,
        user_email: user.email,
        user_nome_cognome: user.nome_cognome || user.full_name || '',
        nome_cognome: user.nome_cognome || user.full_name || '',
        phone: user.phone || '',
        data_nascita: user.data_nascita || '',
        citta_nascita: user.citta_nascita || '',
        codice_fiscale: user.codice_fiscale || '',
        indirizzo_residenza: user.indirizzo_residenza || '',
        iban: user.iban || '',
        taglia_maglietta: user.taglia_maglietta || '',
        user_type: user.user_type || 'dipendente',
        ruoli_dipendente: user.ruoli_dipendente || [],
        assigned_stores: user.assigned_stores || [],
        employee_group: user.employee_group || '',
        function_name: user.function_name || '',
        ore_settimanali: user.ore_settimanali || 0,
        data_inizio_contratto: user.data_inizio_contratto || '',
        durata_contratto_mesi: user.durata_contratto_mesi || 0
      });
    }
  };

  const handleTemplateSelect = async (templateId) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && formData.nome_cognome) {
      const preview = await replaceVariables(template.contenuto_template, formData);
      setEditablePreview(preview);
    }
  };

  const handleFormDataChange = async (newFormData) => {
    setFormData(newFormData);
    if (selectedTemplate && newFormData.nome_cognome) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        const preview = await replaceVariables(template.contenuto_template, newFormData);
        setEditablePreview(preview);
      }
    }
  };

  const insertVariable = (variable) => {
    const textarea = templateTextareaRef;
    if (!textarea) {
      setTemplateData(prev => ({
        ...prev,
        contenuto_template: (prev.contenuto_template || '') + ` {{${variable}}} `
      }));
      return;
    }
    
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = templateData.contenuto_template.substring(0, startPos);
    const textAfter = templateData.contenuto_template.substring(endPos);
    const variableText = `{{${variable}}}`;
    const newText = textBefore + variableText + textAfter;
    setTemplateData(prev => ({ ...prev, contenuto_template: newText }));
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + variableText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSendContract = async (contratto) => {
    if (!confirm('Vuoi inviare questo contratto via email?')) return;

    await base44.integrations.Core.SendEmail({
      to: contratto.user_email,
      subject: 'Contratto di Lavoro - Sa Pizzedda',
      body: `Gentile ${contratto.nome_cognome},\n\nÈ stato generato il tuo contratto di lavoro.\nPuoi visualizzarlo e firmarlo accedendo alla piattaforma.\n\nCordiali saluti,\nSa Pizzedda`
    });

    await updateMutation.mutateAsync({
      id: contratto.id,
      data: { ...contratto, status: 'inviato', data_invio: new Date().toISOString() }
    });

    alert('Contratto inviato con successo!');
  };

  const [downloadingPdf, setDownloadingPdf] = useState(null);

  const downloadContrattoFirmato = async (contratto) => {
    setDownloadingPdf(contratto.id);
    try {
      const response = await base44.functions.invoke('downloadContrattoPDF', { contrattoId: contratto.id });
      
      if (response.data.success) {
        // Convert base64 to blob
        const byteCharacters = atob(response.data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Errore nel download: ' + (response.data.error || 'Errore sconosciuto'));
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Errore nel download del PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'bozza': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza' },
      'inviato': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Inviato' },
      'firmato': { bg: 'bg-green-100', text: 'text-green-700', label: 'Firmato ✓' },
    };
    const badge = badges[status] || badges.bozza;
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  const availableVariables = [
    'nome_cognome', 'phone', 'data_nascita', 'citta_nascita', 'codice_fiscale', 'indirizzo_residenza', 'iban',
    'employee_group', 'function_name', 'ore_settimanali', 'data_inizio_contratto', 
    'durata_contratto_mesi', 'data_oggi', 'data_fine_contratto', 'ruoli', 'locali', 'data_inizio_primo_contratto', 'ruoli_dipendente'
  ];

  const handleLoadDriveFolders = async () => {
    setLoadingFolders(true);
    try {
      const response = await base44.functions.invoke('listDriveFolders', {});
      setDriveFolders(response.data.folders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
      alert('Errore nel caricamento delle cartelle Drive');
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Inserisci un nome per la cartella');
      return;
    }

    setCreatingFolder(true);
    try {
      const currentUserData = await base44.auth.me();
      const response = await base44.functions.invoke('createDriveFolder', {
        folder_name: newFolderName
      });

      const existing = driveConfig[0];
      if (existing) {
        await base44.entities.DriveConfig.update(existing.id, {
          folder_id: response.data.folder_id,
          folder_name: response.data.folder_name,
          created_by: currentUserData?.email || ''
        });
      } else {
        await base44.entities.DriveConfig.create({
          config_type: 'contratti',
          folder_id: response.data.folder_id,
          folder_name: response.data.folder_name,
          is_active: true,
          created_by: currentUserData?.email || ''
        });
      }

      queryClient.invalidateQueries({ queryKey: ['drive-config-contratti'] });
      setNewFolderName('');
      setShowDriveSettings(false);
      alert('Cartella creata e configurata con successo!');
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Errore nella creazione della cartella');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSelectExistingFolder = async (folderId, folderName) => {
    try {
      const currentUserData = await base44.auth.me();
      const existing = driveConfig[0];
      if (existing) {
        await base44.entities.DriveConfig.update(existing.id, {
          folder_id: folderId,
          folder_name: folderName
        });
      } else {
        await base44.entities.DriveConfig.create({
          config_type: 'contratti',
          folder_id: folderId,
          folder_name: folderName,
          is_active: true,
          created_by: currentUserData?.email || ''
        });
      }

      queryClient.invalidateQueries({ queryKey: ['drive-config-contratti'] });
      setShowDriveSettings(false);
      alert('Cartella configurata con successo!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Errore nel salvataggio della configurazione');
    }
  };

  return (
    <>
      <div className="flex gap-3 mb-6 flex-wrap">
        <NeumorphicButton onClick={() => setShowTemplateForm(true)} className="flex items-center gap-2">
          <FileEdit className="w-5 h-5" />
          Nuovo Template
        </NeumorphicButton>
        <NeumorphicButton onClick={() => setShowForm(true)} variant="primary" className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuovo Contratto
        </NeumorphicButton>
        <NeumorphicButton 
          onClick={async () => {
            setShowDriveSettings(true);
            await handleLoadDriveFolders();
          }} 
          className="flex items-center gap-2"
        >
          <Folder className="w-5 h-5" />
          Impostazioni Drive
        </NeumorphicButton>
      </div>

      {/* Drive Settings Section */}
      {driveConfig.length > 0 && driveConfig[0].folder_id && (
        <NeumorphicCard className="p-4 bg-green-50 mb-6">
          <div className="flex items-center gap-3">
            <Folder className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Cartella Drive configurata: <strong>{driveConfig[0].folder_name}</strong>
              </p>
              <p className="text-xs text-green-600">I contratti firmati verranno salvati automaticamente</p>
            </div>
            <button
              onClick={async () => {
                setShowDriveSettings(true);
                await handleLoadDriveFolders();
              }}
              className="nav-button p-2 rounded-lg"
            >
              <Edit className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </NeumorphicCard>
      )}

      {/* Drive Settings Modal */}
      {showDriveSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                Impostazioni Google Drive
              </h2>
              <button onClick={() => setShowDriveSettings(false)}><X className="w-5 h-5" /></button>
            </div>

            {driveConfig.length > 0 && driveConfig[0].folder_id && (
              <div className="neumorphic-flat p-4 rounded-xl mb-6 bg-green-50">
                <div className="flex items-center gap-3">
                  <Folder className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">{driveConfig[0].folder_name}</p>
                    <p className="text-xs text-green-600">Cartella attualmente configurata</p>
                  </div>
                </div>
              </div>
            )}

            <div className="neumorphic-flat p-5 rounded-xl mb-4">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-green-600" />
                Crea Nuova Cartella
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome cartella (es. Contratti Sa Pizzedda)"
                  className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                />
                <NeumorphicButton
                  onClick={handleCreateFolder}
                  disabled={creatingFolder}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  {creatingFolder ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FolderPlus className="w-5 h-5" />
                  )}
                  Crea
                </NeumorphicButton>
              </div>
            </div>

            <div className="neumorphic-flat p-5 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-blue-600" />
                  Seleziona Cartella Esistente
                </h3>
                <NeumorphicButton
                  onClick={handleLoadDriveFolders}
                  disabled={loadingFolders}
                  className="flex items-center gap-2 text-sm"
                >
                  {loadingFolders ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Carica Cartelle'
                  )}
                </NeumorphicButton>
              </div>

              {loadingFolders ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Caricamento cartelle...</p>
                </div>
              ) : driveFolders.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {driveFolders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => handleSelectExistingFolder(folder.id, folder.name)}
                      className="w-full neumorphic-pressed p-3 rounded-xl hover:bg-blue-50 transition-colors text-left flex items-center gap-3"
                    >
                      <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{folder.name}</p>
                        <p className="text-xs text-slate-500">
                          Creata: {new Date(folder.createdTime).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4 text-sm">
                  Clicca "Carica Cartelle" per visualizzare le cartelle disponibili
                </p>
              )}
            </div>

            <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50 mt-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Come funziona:</strong> Ogni contratto firmato verrà salvato automaticamente nella cartella Drive configurata.
              </p>
            </div>
          </NeumorphicCard>
        </div>
      )}

      {/* Contratti in scadenza */}
      {(() => {
        const oggi = new Date();
        const trentaGiorniFuturo = new Date();
        trentaGiorniFuturo.setDate(oggi.getDate() + 30);
        
        const contrattiInScadenza = contratti
          .filter(c => c.status === 'firmato' && c.data_inizio_contratto && c.durata_contratto_mesi)
          .map(c => {
            const dataInizio = new Date(c.data_inizio_contratto);
            const dataFine = new Date(dataInizio);
            dataFine.setMonth(dataFine.getMonth() + parseInt(c.durata_contratto_mesi));
            return { ...c, data_scadenza: dataFine };
          })
          .filter(c => c.data_scadenza >= oggi && c.data_scadenza <= trentaGiorniFuturo)
          .sort((a, b) => a.data_scadenza - b.data_scadenza);
        
        return contrattiInScadenza.length > 0 && (
          <NeumorphicCard className="p-6 mb-6 border-2 border-orange-400">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              Contratti in Scadenza (prossimi 30 giorni)
            </h2>
            <div className="space-y-3">
              {contrattiInScadenza.map((contratto) => {
                const giorniRimanenti = Math.ceil((contratto.data_scadenza - oggi) / (1000 * 60 * 60 * 24));
                return (
                  <NeumorphicCard key={contratto.id} className="p-4 border-2 border-orange-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-[#6b6b6b]">{contratto.nome_cognome}</p>
                        <p className="text-sm text-[#9b9b9b]">{contratto.function_name || 'N/A'}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Scadenza: <span className="font-bold text-orange-700">{contratto.data_scadenza.toLocaleDateString('it-IT')}</span>
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        giorniRimanenti <= 7 
                          ? 'bg-red-100 text-red-700' 
                          : giorniRimanenti <= 15
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {giorniRimanenti} giorni
                      </span>
                    </div>
                  </NeumorphicCard>
                );
              })}
            </div>
          </NeumorphicCard>
        );
      })()}

      {/* Templates Section */}
      <NeumorphicCard className="p-6 mb-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
          <FileEdit className="w-5 h-5" />
          Templates Contratti
        </h2>
        {templates.length === 0 ? (
          <p className="text-center text-[#9b9b9b] py-4">Nessun template creato</p>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <NeumorphicCard key={t.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-[#6b6b6b]">{t.nome_template}</p>
                    <p className="text-xs text-[#9b9b9b]">
                      {t.descrizione || 'Nessuna descrizione'}
                      {!t.attivo && ' • Disattivato'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingTemplate(t);
                        setTemplateData({
                          nome_template: t.nome_template,
                          contenuto_template: t.contenuto_template,
                          descrizione: t.descrizione || '',
                          attivo: t.attivo !== false
                        });
                        setShowTemplateForm(true);
                      }}
                      className="nav-button p-2 rounded-lg"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button onClick={() => deleteTemplateMutation.mutate(t.id)} className="nav-button p-2 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {/* Lista Contratti - Separati da firmare / firmati */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Lista Contratti</h2>
        {contratti.length === 0 ? (
          <p className="text-center text-[#9b9b9b] py-8">Nessun contratto creato</p>
        ) : (
          <>
            {/* Da Firmare */}
            {(() => {
              const daFirmare = contratti.filter(c => c.status !== 'firmato');
              return daFirmare.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-orange-600" />
                    Da Firmare ({daFirmare.length})
                  </h3>
                  <div className="space-y-3">
                    {daFirmare.map(c => {
                      const dataFine = c.data_inizio_contratto && c.durata_contratto_mesi
                        ? (() => {
                            const dataInizio = new Date(c.data_inizio_contratto);
                            const fine = new Date(dataInizio);
                            fine.setMonth(fine.getMonth() + parseInt(c.durata_contratto_mesi));
                            return fine.toLocaleDateString('it-IT');
                          })()
                        : 'N/A';
                      
                      return (
                        <NeumorphicCard key={c.id} className="p-4 border-l-4 border-orange-400">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-bold text-[#6b6b6b]">{c.nome_cognome}</p>
                              <p className="text-sm text-[#9b9b9b]">{c.employee_group} - {c.ore_settimanali}h/sett</p>
                              <p className="text-xs text-slate-600 mt-2">
                                <span className="font-medium">Ruolo:</span> {c.function_name || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-600">
                                <span className="font-medium">Inizio:</span> {c.data_inizio_contratto ? new Date(c.data_inizio_contratto).toLocaleDateString('it-IT') : 'N/A'}
                                {' • '}
                                <span className="font-medium">Fine:</span> {dataFine}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              {getStatusBadge(c.status)}
                              <button onClick={() => setPreviewContratto(c)} className="nav-button p-2 rounded-lg">
                                <Eye className="w-4 h-4 text-purple-600" />
                              </button>
                              {c.status === 'bozza' && (
                                <button onClick={() => handleSendContract(c)} className="nav-button p-2 rounded-lg">
                                  <Send className="w-4 h-4 text-green-600" />
                                </button>
                              )}
                              <button onClick={() => deleteMutation.mutate(c.id)} className="nav-button p-2 rounded-lg">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </NeumorphicCard>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Firmati */}
            {(() => {
              const firmati = contratti.filter(c => c.status === 'firmato');
              return firmati.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Firmati ({firmati.length})
                  </h3>
                  <div className="space-y-3">
                    {firmati.map(c => {
                      const dataFine = c.data_inizio_contratto && c.durata_contratto_mesi
                        ? (() => {
                            const dataInizio = new Date(c.data_inizio_contratto);
                            const fine = new Date(dataInizio);
                            fine.setMonth(fine.getMonth() + parseInt(c.durata_contratto_mesi));
                            return fine.toLocaleDateString('it-IT');
                          })()
                        : 'N/A';
                      
                      return (
                        <NeumorphicCard key={c.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-bold text-[#6b6b6b]">{c.nome_cognome}</p>
                              <p className="text-sm text-[#9b9b9b]">{c.employee_group} - {c.ore_settimanali}h/sett</p>
                              <p className="text-xs text-slate-600 mt-2">
                                <span className="font-medium">Ruolo:</span> {c.function_name || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-600">
                                <span className="font-medium">Inizio:</span> {c.data_inizio_contratto ? new Date(c.data_inizio_contratto).toLocaleDateString('it-IT') : 'N/A'}
                                {' • '}
                                <span className="font-medium">Fine:</span> {dataFine}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              {getStatusBadge(c.status)}
                              <button onClick={() => setPreviewContratto(c)} className="nav-button p-2 rounded-lg">
                                <Eye className="w-4 h-4 text-purple-600" />
                              </button>
                              <button 
                                onClick={() => downloadContrattoFirmato(c)} 
                                className="nav-button p-2 rounded-lg" 
                                title="Scarica contratto firmato PDF"
                                disabled={downloadingPdf === c.id}
                              >
                                {downloadingPdf === c.id ? (
                                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4 text-blue-600" />
                                )}
                              </button>
                              <button onClick={() => deleteMutation.mutate(c.id)} className="nav-button p-2 rounded-lg">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </NeumorphicCard>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </NeumorphicCard>

      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">{editingTemplate ? 'Modifica Template' : 'Nuovo Template'}</h2>
              <button onClick={resetTemplateForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitTemplate} className="space-y-4">
              <input
                type="text"
                placeholder="Nome template"
                value={templateData.nome_template}
                onChange={(e) => setTemplateData({ ...templateData, nome_template: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                required
              />
              <input
                type="text"
                placeholder="Descrizione (opzionale)"
                value={templateData.descrizione}
                onChange={(e) => setTemplateData({ ...templateData, descrizione: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
              />
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="template-attivo"
                  checked={templateData.attivo}
                  onChange={(e) => setTemplateData({ ...templateData, attivo: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="template-attivo" className="text-sm text-slate-700">Template attivo</label>
              </div>
              <div className="neumorphic-pressed p-3 rounded-xl">
                <p className="text-xs mb-2">Variabili:</p>
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map(v => (
                    <button key={v} type="button" onClick={() => insertVariable(v)}
                      className="neumorphic-flat px-2 py-1 rounded text-xs">
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                ref={(el) => setTemplateTextareaRef(el)}
                value={templateData.contenuto_template}
                onChange={(e) => setTemplateData({ ...templateData, contenuto_template: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-96 resize-none"
                placeholder="Contenuto del contratto..."
                required
              />
              <NeumorphicButton type="submit" variant="primary" className="w-full">
                {editingTemplate ? 'Aggiorna Template' : 'Salva Template'}
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[90vh] flex gap-4">
            {/* Left: Form */}
            <NeumorphicCard className="w-1/2 p-6 overflow-y-auto">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold">Nuovo Contratto</h2>
                <button onClick={resetForm}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Template *</label>
                  <select value={selectedTemplate} onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required>
                    <option value="">Seleziona template...</option>
                    {templates.filter(t => t.attivo).map(t => (
                      <option key={t.id} value={t.id}>{t.nome_template}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Dipendente</label>
                  <select value={formData.user_id} onChange={(e) => handleUserSelect(e.target.value)}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                    <option value="">Seleziona dipendente...</option>
                    {users.filter(u => u.user_type === 'dipendente').map(u => (
                      <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name || u.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Nome Cognome *</label>
                  <input type="text" placeholder="Nome Cognome" value={formData.nome_cognome}
                    onChange={(e) => handleFormDataChange({ ...formData, nome_cognome: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Data Inizio *</label>
                    <input type="date" value={formData.data_inizio_contratto}
                      onChange={(e) => handleFormDataChange({ ...formData, data_inizio_contratto: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Durata (mesi)</label>
                    <input type="number" placeholder="12" value={formData.durata_contratto_mesi}
                      onChange={(e) => handleFormDataChange({ ...formData, durata_contratto_mesi: parseInt(e.target.value) || 0, data_fine_contratto: '' })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Data Fine (opzionale)</label>
                  <input type="date" value={formData.data_fine_contratto}
                    onChange={(e) => handleFormDataChange({ ...formData, data_fine_contratto: e.target.value, durata_contratto_mesi: 0 })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" />
                  <p className="text-xs text-slate-500 mt-1">Lascia vuoto per calcolarla automaticamente dalla durata</p>
                </div>
                <NeumorphicButton type="submit" variant="primary" className="w-full">Crea Contratto</NeumorphicButton>
              </form>
            </NeumorphicCard>

            {/* Right: Preview */}
            <NeumorphicCard className="w-1/2 p-6 overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Anteprima Contratto</h2>
              {editablePreview ? (
                <textarea
                  value={editablePreview}
                  onChange={(e) => setEditablePreview(e.target.value)}
                  className="w-full h-full neumorphic-pressed px-4 py-3 rounded-xl outline-none resize-none font-mono text-sm"
                  placeholder="Seleziona un template e compila i dati per vedere l'anteprima..."
                />
              ) : (
                <div className="neumorphic-pressed p-6 rounded-xl bg-slate-50 text-center">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Seleziona un template e compila i dati per vedere l'anteprima</p>
                </div>
              )}
            </NeumorphicCard>
          </div>
        </div>
      )}

      {previewContratto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Anteprima Contratto</h2>
              <button onClick={() => setPreviewContratto(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="neumorphic-pressed p-6 rounded-xl bg-white">
              <pre className="whitespace-pre-wrap text-sm">
                {typeof previewContratto === 'string' ? previewContratto : previewContratto.contenuto_contratto}
              </pre>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}

// Lettere Section
function LettereSection() {
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showLetteraForm, setShowLetteraForm] = useState(false);
  const [showAutoConfig, setShowAutoConfig] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    nome_template: '', tipo_lettera: 'lettera_richiamo', contenuto: '', attivo: true
  });
  const [letteraForm, setLetteraForm] = useState({ user_id: '', tipo_lettera: 'lettera_richiamo', template_id: '' });
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [viewingChiusura, setViewingChiusura] = useState(null);
  const [chiusuraPreviewContent, setChiusuraPreviewContent] = useState('');
  const [downloadingPdfAdmin, setDownloadingPdfAdmin] = useState(null);
  const [viewingRichiamo, setViewingRichiamo] = useState(null);

  const downloadLetteraPDFAdmin = async (lettera) => {
    setDownloadingPdfAdmin(lettera.id);
    try {
      const response = await base44.functions.invoke('downloadLetteraPDF', { letteraId: lettera.id });
      if (response.data.success) {
        const byteCharacters = atob(response.data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Errore nel download');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Errore nel download del PDF');
    } finally {
      setDownloadingPdfAdmin(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'bozza': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza' },
      'inviato': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Inviato' },
      'firmato': { bg: 'bg-green-100', text: 'text-green-700', label: 'Firmato ✓' },
    };
    const badge = badges[status] || badges.bozza;
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  const queryClient = useQueryClient();
  const { data: templates = [] } = useQuery({
    queryKey: ['lettera-templates'],
    queryFn: () => base44.entities.LetteraRichiamoTemplate.list(),
  });
  const { data: lettere = [] } = useQuery({
    queryKey: ['lettere-richiamo'],
    queryFn: async () => {
      const data = await base44.entities.LetteraRichiamo.list('-created_date');
      base44.functions.invoke('processAutomaticChiusuraProcedura', {}).catch(err => 
        console.log('Background automation check:', err)
      );
      return data;
    },
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users-dipendenti'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.LetteraRichiamoTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettera-templates'] });
      resetTemplateForm();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LetteraRichiamoTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettera-templates'] });
      resetTemplateForm();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.LetteraRichiamoTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lettera-templates'] }),
  });

  const { data: lettereConfig = [] } = useQuery({
    queryKey: ['lettere-config'],
    queryFn: () => base44.entities.LettereConfig.list(),
  });

  const currentConfig = lettereConfig[0];

  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (currentConfig) {
        return base44.entities.LettereConfig.update(currentConfig.id, data);
      }
      return base44.entities.LettereConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettere-config'] });
      alert('Configurazione salvata!');
      setShowAutoConfig(false);
    },
  });

  const deleteLetteraMutation = useMutation({
    mutationFn: (id) => base44.entities.LetteraRichiamo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
      alert('Lettera eliminata');
    },
  });

  const generateLetteraContent = (templateId, userId, richiamoData = null) => {
    const template = templates.find(t => t.id === templateId);
    const user = users.find(u => u.id === userId);
    if (!template || !user) return '';
    
    let contenuto = template.contenuto;
    contenuto = contenuto.replace(/{{nome_dipendente}}/g, user.nome_cognome || user.full_name || user.email);
    contenuto = contenuto.replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'));
    
    if (richiamoData) {
      // Data invio richiamo
      if (richiamoData.data_invio) {
        contenuto = contenuto.replace(/{{data_invio_richiamo}}/g, new Date(richiamoData.data_invio).toLocaleDateString('it-IT'));
      }
      // Data firma richiamo
      if (richiamoData.data_firma) {
        const dataFirma = new Date(richiamoData.data_firma);
        contenuto = contenuto.replace(/{{data_firma_richiamo}}/g, dataFirma.toLocaleDateString('it-IT'));
        // Mese firma richiamo
        const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        contenuto = contenuto.replace(/{{mese_firma_richiamo}}/g, mesi[dataFirma.getMonth()] + ' ' + dataFirma.getFullYear());
      } else {
        // Fallback if no data_firma but data_invio exists
        if (richiamoData.data_invio) {
          const dataInvio = new Date(richiamoData.data_invio);
          contenuto = contenuto.replace(/{{data_firma_richiamo}}/g, dataInvio.toLocaleDateString('it-IT'));
          const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
          contenuto = contenuto.replace(/{{mese_firma_richiamo}}/g, mesi[dataInvio.getMonth()] + ' ' + dataInvio.getFullYear());
        }
      }
      // Data visualizzazione richiamo
      if (richiamoData.data_visualizzazione) {
        contenuto = contenuto.replace(/{{data_visualizzazione_richiamo}}/g, new Date(richiamoData.data_visualizzazione).toLocaleDateString('it-IT'));
      }
      // Testo lettera richiamo
      if (richiamoData.contenuto_lettera) {
        contenuto = contenuto.replace(/{{testo_lettera_richiamo}}/g, richiamoData.contenuto_lettera);
      }
    }
    return contenuto;
  };

  const handlePreviewLettera = () => {
    if (!letteraForm.template_id || !letteraForm.user_id) {
      alert('Seleziona dipendente e template');
      return;
    }
    const content = generateLetteraContent(letteraForm.template_id, letteraForm.user_id);
    setPreviewContent(content);
    setShowPreview(true);
  };

  const inviaLetteraMutation = useMutation({
    mutationFn: async (data) => {
      const user = users.find(u => u.id === data.user_id);
      
      return base44.entities.LetteraRichiamo.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.nome_cognome || user.full_name || user.email,
        tipo_lettera: data.tipo_lettera,
        contenuto_lettera: data.contenuto,
        data_invio: new Date().toISOString(),
        status: 'inviata'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
      alert('Lettera inviata con successo!');
      setShowLetteraForm(false);
      setShowPreview(false);
      setPreviewContent('');
      resetLetteraForm();
    },
  });

  const handleSendFromPreview = () => {
    if (!confirm('Confermi l\'invio della lettera?')) return;
    inviaLetteraMutation.mutate({
      ...letteraForm,
      contenuto: previewContent
    });
  };

  const generateChiusuraPreview = (richiamo) => {
    const chiusuraTemplate = templates.find(t => t.id === currentConfig?.template_chiusura_id);
    if (!chiusuraTemplate) {
      setChiusuraPreviewContent('Nessun template di chiusura configurato');
      return;
    }
    const content = generateLetteraContent(chiusuraTemplate.id, richiamo.user_id, richiamo);
    setChiusuraPreviewContent(content);
  };

  const resetTemplateForm = () => {
    setTemplateForm({ nome_template: '', tipo_lettera: 'lettera_richiamo', contenuto: '', attivo: true });
    setEditingTemplate(null);
    setShowTemplateForm(false);
  };

  const resetLetteraForm = () => {
    setLetteraForm({ user_id: '', tipo_lettera: 'lettera_richiamo', template_id: '' });
  };

  const handleSubmitTemplate = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const chiusuraTemplates = templates.filter(t => t.tipo_lettera === 'chiusura_procedura' && t.attivo);

  return (
    <>
      <div className="flex gap-3 mb-6 flex-wrap">
        <NeumorphicButton onClick={() => setShowTemplateForm(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuovo Template
        </NeumorphicButton>
        <NeumorphicButton onClick={() => setShowLetteraForm(true)} variant="primary" className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Invia Lettera
        </NeumorphicButton>
        <NeumorphicButton onClick={() => setShowAutoConfig(true)} className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Automazione
        </NeumorphicButton>
      </div>

      {/* Configurazione Automazione */}
      {showAutoConfig && (
        <NeumorphicCard className="p-6 mb-6 border-2 border-blue-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Invio Automatico Chiusura Procedura
            </h2>
            <button onClick={() => setShowAutoConfig(false)} className="nav-button p-2 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="invio-auto"
                checked={currentConfig?.invio_automatico_chiusura || false}
                onChange={(e) => saveConfigMutation.mutate({ 
                  ...currentConfig, 
                  invio_automatico_chiusura: e.target.checked 
                })}
                className="w-5 h-5"
              />
              <label htmlFor="invio-auto" className="text-sm font-medium text-slate-700">
                Invia automaticamente chiusura procedura dopo la visualizzazione della lettera di richiamo
              </label>
            </div>

            {(currentConfig?.invio_automatico_chiusura) && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Giorni di attesa dopo la visualizzazione (0 = immediato)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentConfig?.giorni_attesa_chiusura || 0}
                    onChange={(e) => saveConfigMutation.mutate({ 
                      ...currentConfig, 
                      giorni_attesa_chiusura: parseInt(e.target.value) || 0 
                    })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Template chiusura procedura da usare
                  </label>
                  <select
                    value={currentConfig?.template_chiusura_id || ''}
                    onChange={(e) => saveConfigMutation.mutate({ 
                      ...currentConfig, 
                      template_chiusura_id: e.target.value 
                    })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  >
                    <option value="">-- Seleziona template --</option>
                    {chiusuraTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.nome_template}</option>
                    ))}
                  </select>
                  {chiusuraTemplates.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ Nessun template di chiusura procedura disponibile. Creane uno prima.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="neumorphic-flat p-3 rounded-lg bg-blue-50">
              <p className="text-xs text-blue-800">
                <strong>ℹ️ Come funziona:</strong> Quando un dipendente visualizza per la prima volta una lettera di richiamo, 
                il sistema invierà automaticamente la chiusura procedura dopo i giorni di attesa impostati.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Templates Section */}
      <NeumorphicCard className="p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileEdit className="w-5 h-5" />
          Templates Lettere
        </h2>
        {templates.length === 0 ? (
          <p className="text-center text-slate-500 py-4">Nessun template creato</p>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <NeumorphicCard key={t.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800">{t.nome_template}</p>
                    <p className="text-xs text-slate-500">
                      {t.tipo_lettera === 'lettera_richiamo' ? 'Lettera di Richiamo' : 'Chiusura Procedura'}
                      {!t.attivo && ' • Disattivato'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingTemplate(t);
                        setTemplateForm({
                          nome_template: t.nome_template,
                          tipo_lettera: t.tipo_lettera,
                          contenuto: t.contenuto,
                          attivo: t.attivo !== false
                        });
                        setShowTemplateForm(true);
                      }}
                      className="nav-button p-2 rounded-lg"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button onClick={() => deleteTemplateMutation.mutate(t.id)} className="nav-button p-2 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        )}
      </NeumorphicCard>

      {/* Lettere di Richiamo */}
      <NeumorphicCard className="p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Lettere di Richiamo
        </h2>
        {(() => {
          const lettereRichiamo = lettere.filter(l => l.tipo_lettera === 'lettera_richiamo');
          const richiamiInviati = lettereRichiamo.filter(l => l.status === 'inviata' && !l.data_visualizzazione);
          const richiamiVisualizzati = lettereRichiamo.filter(l => l.data_visualizzazione && l.status !== 'firmata');
          const richiamiCompleti = lettereRichiamo.filter(l => l.status === 'firmata');

          return (
            <>
              {/* Inviate */}
              {richiamiInviati.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-600" />
                    Inviate - In Attesa Visualizzazione ({richiamiInviati.length})
                  </h3>
                  <div className="space-y-2">
                    {richiamiInviati.map(richiamo => (
                      <NeumorphicCard key={richiamo.id} className="p-4 border-l-4 border-blue-400">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-slate-800">{richiamo.user_name}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Inviata: {richiamo.data_invio ? new Date(richiamo.data_invio).toLocaleDateString('it-IT') : 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingRichiamo(richiamo)}
                              className="nav-button p-1.5 rounded-lg"
                            >
                              <Eye className="w-3.5 h-3.5 text-purple-600" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Eliminare la lettera di richiamo per ${richiamo.user_name}?`)) {
                                  deleteLetteraMutation.mutate(richiamo.id);
                                }
                              }}
                              className="nav-button p-1.5 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                              Inviata
                            </span>
                          </div>
                        </div>
                      </NeumorphicCard>
                    ))}
                  </div>
                </div>
              )}

              {/* Visualizzate */}
              {richiamiVisualizzati.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-600" />
                    Visualizzate - In Attesa Firma ({richiamiVisualizzati.length})
                  </h3>
                  <div className="space-y-2">
                    {richiamiVisualizzati.map(richiamo => {
                      const chiusura = lettere.find(l => 
                        l.tipo_lettera === 'chiusura_procedura' && 
                        l.user_id === richiamo.user_id &&
                        new Date(l.data_invio) > new Date(richiamo.data_invio)
                      );
                      
                      return (
                        <NeumorphicCard key={richiamo.id} className="p-4 border-l-4 border-purple-400">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{richiamo.user_name}</p>
                              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                <p>Inviata: {richiamo.data_invio ? new Date(richiamo.data_invio).toLocaleDateString('it-IT') : 'N/A'}</p>
                                <p className="text-purple-600 font-medium">
                                  Visualizzata: {richiamo.data_visualizzazione ? new Date(richiamo.data_visualizzazione).toLocaleDateString('it-IT') : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setViewingRichiamo(richiamo)}
                                className="nav-button p-1.5 rounded-lg"
                              >
                                <Eye className="w-3.5 h-3.5 text-purple-600" />
                              </button>
                              <button
                                onClick={() => downloadLetteraPDFAdmin(richiamo)}
                                className="nav-button p-1.5 rounded-lg"
                                disabled={downloadingPdfAdmin === richiamo.id}
                              >
                                {downloadingPdfAdmin === richiamo.id ? (
                                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Eliminare la lettera di richiamo per ${richiamo.user_name}?`)) {
                                    deleteLetteraMutation.mutate(richiamo.id);
                                  }
                                }}
                                className="nav-button p-1.5 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              </button>
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                Visualizzata
                              </span>
                            </div>
                          </div>
                        </NeumorphicCard>
                      );
                    })}
                  </div>
                </div>
              )}

              {lettereRichiamo.length === 0 && (
                <p className="text-center text-slate-500 py-8">Nessuna lettera di richiamo inviata</p>
              )}
            </>
          );
        })()}
      </NeumorphicCard>

      {/* Chiusure Procedura */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Chiusure Procedura
        </h2>
        {(() => {
          const chiusureProcedura = lettere.filter(l => l.tipo_lettera === 'chiusura_procedura');
          const chiusureInviate = chiusureProcedura.filter(l => l.status !== 'firmata');
          const chiusureFirmate = chiusureProcedura.filter(l => l.status === 'firmata');

          return (
            <>
              {/* Inviate - Da Firmare */}
              {chiusureInviate.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4 text-green-600" />
                    Inviate - In Attesa Firma ({chiusureInviate.length})
                  </h3>
                  <div className="space-y-2">
                    {chiusureInviate.map(chiusura => {
                      const richiamo = lettere.find(l => 
                        l.tipo_lettera === 'lettera_richiamo' && 
                        l.user_id === chiusura.user_id
                      );
                      
                      return (
                        <NeumorphicCard key={chiusura.id} className="p-4 border-l-4 border-green-400">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{chiusura.user_name}</p>
                              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                <p>Inviata: {chiusura.data_invio ? new Date(chiusura.data_invio).toLocaleDateString('it-IT') : 'N/A'}</p>
                                {richiamo && (
                                  <p className="text-orange-600">
                                    Richiamo firmato: {richiamo.data_firma ? new Date(richiamo.data_firma).toLocaleDateString('it-IT') : 'N/A'}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setViewingChiusura({ tipo: 'inviata', chiusura })}
                                className="nav-button p-1.5 rounded-lg"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                              <button
                                onClick={() => downloadLetteraPDFAdmin(chiusura)}
                                className="nav-button p-1.5 rounded-lg"
                                disabled={downloadingPdfAdmin === chiusura.id}
                              >
                                {downloadingPdfAdmin === chiusura.id ? (
                                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Eliminare la chiusura procedura per ${chiusura.user_name}?`)) {
                                    deleteLetteraMutation.mutate(chiusura.id);
                                  }
                                }}
                                className="nav-button p-1.5 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              </button>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                Inviata
                              </span>
                            </div>
                          </div>
                        </NeumorphicCard>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Firmate */}
              {chiusureFirmate.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Firmate - Procedura Chiusa ({chiusureFirmate.length})
                  </h3>
                  <div className="space-y-2">
                    {chiusureFirmate.map(chiusura => {
                      const richiamo = lettere.find(l => 
                        l.tipo_lettera === 'lettera_richiamo' && 
                        l.user_id === chiusura.user_id
                      );
                      
                      return (
                        <NeumorphicCard key={chiusura.id} className="p-4 border-l-4 border-green-600 bg-green-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{chiusura.user_name}</p>
                              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                <p>Inviata: {chiusura.data_invio ? new Date(chiusura.data_invio).toLocaleDateString('it-IT') : 'N/A'}</p>
                                <p className="text-green-700 font-medium">
                                  Firmata: {chiusura.data_firma ? new Date(chiusura.data_firma).toLocaleDateString('it-IT') : 'N/A'}
                                </p>
                                {richiamo && (
                                  <p className="text-orange-600">
                                    Richiamo firmato: {richiamo.data_firma ? new Date(richiamo.data_firma).toLocaleDateString('it-IT') : 'N/A'}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setViewingChiusura({ tipo: 'inviata', chiusura })}
                                className="nav-button p-1.5 rounded-lg"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                              <button
                                onClick={() => downloadLetteraPDFAdmin(chiusura)}
                                className="nav-button p-1.5 rounded-lg"
                                disabled={downloadingPdfAdmin === chiusura.id}
                              >
                                {downloadingPdfAdmin === chiusura.id ? (
                                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Eliminare la chiusura procedura per ${chiusura.user_name}?`)) {
                                    deleteLetteraMutation.mutate(chiusura.id);
                                  }
                                }}
                                className="nav-button p-1.5 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              </button>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                ✓ Firmata
                              </span>
                            </div>
                          </div>
                        </NeumorphicCard>
                      );
                    })}
                  </div>
                </div>
              )}

              {chiusureProcedura.length === 0 && (
                <p className="text-center text-slate-500 py-8">Nessuna chiusura procedura inviata</p>
              )}
            </>
          );
        })()}
      </NeumorphicCard>

      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">{editingTemplate ? 'Modifica Template' : 'Nuovo Template'}</h2>
              <button onClick={resetTemplateForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitTemplate} className="space-y-4">
              <input type="text" placeholder="Nome template" value={templateForm.nome_template}
                onChange={(e) => setTemplateForm({ ...templateForm, nome_template: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required />
              <select value={templateForm.tipo_lettera}
                onChange={(e) => setTemplateForm({ ...templateForm, tipo_lettera: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                <option value="lettera_richiamo">Lettera di Richiamo</option>
                <option value="chiusura_procedura">Chiusura Procedura</option>
              </select>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="lettera-template-attivo"
                  checked={templateForm.attivo}
                  onChange={(e) => setTemplateForm({ ...templateForm, attivo: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="lettera-template-attivo" className="text-sm text-slate-700">Template attivo</label>
              </div>
              <div className="neumorphic-pressed p-3 rounded-xl mb-2">
                <p className="text-xs text-slate-600 mb-2">Variabili disponibili:</p>
                <div className="flex flex-wrap gap-2">
                  {['nome_dipendente', 'data_oggi', ...(templateForm.tipo_lettera === 'chiusura_procedura' ? ['data_invio_richiamo', 'data_firma_richiamo', 'data_visualizzazione_richiamo', 'mese_firma_richiamo', 'testo_lettera_richiamo'] : [])].map(v => (
                    <button key={v} type="button" 
                      onClick={() => setTemplateForm({ ...templateForm, contenuto: (templateForm.contenuto || '') + ` {{${v}}} ` })}
                      className="neumorphic-flat px-2 py-1 rounded text-xs hover:bg-blue-50">
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={templateForm.contenuto}
                onChange={(e) => setTemplateForm({ ...templateForm, contenuto: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-64 resize-none"
                placeholder="Usa {{nome_dipendente}}, {{data_oggi}}, {{data_invio_richiamo}}, {{data_firma_richiamo}}, {{mese_firma_richiamo}}, {{testo_lettera_richiamo}} (solo chiusura)" required />
              <NeumorphicButton type="submit" variant="primary" className="w-full">
                {editingTemplate ? 'Aggiorna Template' : 'Salva Template'}
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {showLetteraForm && !showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-2xl w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Invia Lettera</h2>
              <button onClick={() => setShowLetteraForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handlePreviewLettera(); }} className="space-y-4">
              <select value={letteraForm.user_id} onChange={(e) => setLetteraForm({ ...letteraForm, user_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required>
                <option value="">Seleziona dipendente...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome_cognome || u.full_name || u.email}</option>
                ))}
              </select>
              <select value={letteraForm.tipo_lettera} onChange={(e) => setLetteraForm({ ...letteraForm, tipo_lettera: e.target.value, template_id: '' })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none">
                <option value="lettera_richiamo">Lettera di Richiamo</option>
                <option value="chiusura_procedura">Chiusura Procedura</option>
              </select>
              <select value={letteraForm.template_id} onChange={(e) => setLetteraForm({ ...letteraForm, template_id: e.target.value })}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none" required>
                <option value="">Seleziona template...</option>
                {templates.filter(t => t.tipo_lettera === letteraForm.tipo_lettera && t.attivo).map(t => (
                  <option key={t.id} value={t.id}>{t.nome_template}</option>
                ))}
              </select>
              <NeumorphicButton type="submit" variant="primary" className="w-full flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> Anteprima
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Anteprima Lettera</h2>
              <button onClick={() => setShowPreview(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Modifica contenuto prima dell'invio:</label>
              <textarea
                value={previewContent}
                onChange={(e) => setPreviewContent(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-80 resize-none font-mono text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPreview(false)} className="flex-1 nav-button px-4 py-3 rounded-xl font-medium">
                Indietro
              </button>
              <NeumorphicButton onClick={handleSendFromPreview} variant="primary" className="flex-1 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Invia Lettera
              </NeumorphicButton>
            </div>
          </NeumorphicCard>
        </div>
      )}

      {viewingChiusura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">
                {viewingChiusura.tipo === 'preview' ? 'Anteprima Chiusura Procedura' : 
                 viewingChiusura.tipo === 'edit' ? 'Modifica Chiusura Procedura' : 
                 'Chiusura Procedura Inviata'}
              </h2>
              <button onClick={() => setViewingChiusura(null)}><X className="w-5 h-5" /></button>
            </div>
            
            {viewingChiusura.tipo === 'edit' ? (
              <>
                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Template:</label>
                  <select
                    value={viewingChiusura.selectedTemplateId || ''}
                    onChange={(e) => {
                      const newTemplateId = e.target.value;
                      const content = generateLetteraContent(newTemplateId, viewingChiusura.richiamo.user_id, viewingChiusura.richiamo);
                      setViewingChiusura({
                        ...viewingChiusura,
                        selectedTemplateId: newTemplateId,
                        editableContent: content
                      });
                    }}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
                  >
                    {chiusuraTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.nome_template}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Contenuto:</label>
                  <textarea
                    value={viewingChiusura.editableContent || ''}
                    onChange={(e) => setViewingChiusura({
                      ...viewingChiusura,
                      editableContent: e.target.value
                    })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-80 resize-none font-mono text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setViewingChiusura(null)} className="flex-1 nav-button px-4 py-3 rounded-xl font-medium">
                    Annulla
                  </button>
                  <NeumorphicButton 
                    onClick={async () => {
                      if (!confirm('Confermi l\'invio della chiusura procedura?')) return;
                      const user = users.find(u => u.id === viewingChiusura.richiamo.user_id);
                      await base44.entities.LetteraRichiamo.create({
                        user_id: user.id,
                        user_email: user.email,
                        user_name: user.nome_cognome || user.full_name || user.email,
                        tipo_lettera: 'chiusura_procedura',
                        contenuto_lettera: viewingChiusura.editableContent,
                        data_invio: new Date().toISOString(),
                        status: 'inviata'
                      });
                      queryClient.invalidateQueries({ queryKey: ['lettere-richiamo'] });
                      setViewingChiusura(null);
                      alert('Chiusura procedura inviata!');
                    }}
                    variant="primary" 
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Invia Chiusura
                  </NeumorphicButton>
                </div>
              </>
            ) : (
              <>
                <div className="neumorphic-pressed p-6 rounded-xl bg-white">
                  <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700">
                    {viewingChiusura.tipo === 'preview' ? chiusuraPreviewContent : viewingChiusura.chiusura?.contenuto_lettera}
                  </pre>
                </div>
                {viewingChiusura.tipo === 'preview' && (
                  <div className="mt-4 neumorphic-flat p-3 rounded-lg bg-blue-50">
                    <p className="text-xs text-blue-700">
                      ℹ️ Questa è un'anteprima. La chiusura verrà inviata automaticamente secondo la configurazione.
                    </p>
                  </div>
                )}
              </>
            )}
          </NeumorphicCard>
        </div>
      )}

      {viewingRichiamo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Lettera di Richiamo - {viewingRichiamo.user_name}</h2>
              <button onClick={() => setViewingRichiamo(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="neumorphic-pressed p-6 rounded-xl bg-white">
              <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700">
                {viewingRichiamo.contenuto_lettera}
              </pre>
            </div>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}

// Buste Paga Section (Admin)
function BustePagaSection() {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const queryClient = useQueryClient();

  const { data: bustePaga = [], isLoading } = useQuery({
    queryKey: ['buste-paga'],
    queryFn: () => base44.entities.BustaPaga.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => base44.entities.User.list(),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, mese }) => {
      setUploadingFile(true);
      
      // Upload PDF
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create record
      const busta = await base44.entities.BustaPaga.create({
        mese,
        pdf_completo_url: file_url,
        status: 'processing'
      });

      // Call backend to split PDF
      const response = await base44.functions.invoke('splitBustePagaPDF', {
        bustaId: busta.id,
        pdfUrl: file_url
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buste-paga'] });
      setSelectedFile(null);
      setUploadingFile(false);
      alert('Buste paga elaborate con successo!');
    },
    onError: (error) => {
      setUploadingFile(false);
      console.error('Upload error:', error);
      alert('Errore durante l\'elaborazione: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Seleziona un file PDF');
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !selectedMonth) {
      alert('Seleziona file e mese');
      return;
    }
    uploadMutation.mutate({ file: selectedFile, mese: selectedMonth });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BustaPaga.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buste-paga'] });
    }
  });

  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  return (
    <>
      <NeumorphicCard className="p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-green-600" />
          Carica Buste Paga
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Mese di Riferimento
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              File PDF (tutte le buste paga)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
            />
            {selectedFile && (
              <p className="text-xs text-green-600 mt-2">✓ {selectedFile.name}</p>
            )}
          </div>

          <NeumorphicButton
            onClick={handleUpload}
            variant="primary"
            disabled={!selectedFile || uploadingFile}
            className="w-full flex items-center justify-center gap-2"
          >
            {uploadingFile ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Elaborazione in corso...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Carica e Splitta PDF
              </>
            )}
          </NeumorphicButton>

          <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50">
            <p className="text-xs text-blue-800">
              <strong>ℹ️ Come funziona:</strong> Il PDF verrà analizzato automaticamente.
              Ogni pagina con un codice fiscale sarà assegnata al dipendente corrispondente.
            </p>
          </div>
        </div>
      </NeumorphicCard>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Storico Buste Paga</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          </div>
        ) : bustePaga.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Nessuna busta paga caricata</p>
        ) : (
          <div className="space-y-3">
            {bustePaga.map(busta => (
              <NeumorphicCard key={busta.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">
                      {new Date(busta.mese + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Caricato: {new Date(busta.created_date).toLocaleDateString('it-IT')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {busta.status === 'completed' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          ✓ {busta.pdf_splits?.length || 0} dipendenti
                        </span>
                      )}
                      {busta.status === 'processing' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                          Elaborazione...
                        </span>
                      )}
                      {busta.status === 'failed' && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                          ✗ Errore
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={busta.pdf_completo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nav-button p-2 rounded-lg"
                      title="Scarica PDF completo"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                    </a>
                    <button
                      onClick={() => {
                        if (confirm('Eliminare questa busta paga?')) {
                          deleteMutation.mutate(busta.id);
                        }
                      }}
                      className="nav-button p-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                
                {busta.error_message && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-700">{busta.error_message}</p>
                  </div>
                )}

                {busta.status === 'completed' && busta.pdf_splits?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">File Splittati per Dipendente:</h4>
                    <div className="space-y-2">
                      {busta.pdf_splits.map((split, idx) => (
                        <div key={idx} className="neumorphic-pressed p-3 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {split.user_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{split.user_name}</p>
                              <p className="text-xs text-slate-500">Pagina {split.page_number}</p>
                            </div>
                          </div>
                          <a
                            href={split.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-button p-2 rounded-lg"
                            title="Visualizza PDF"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </NeumorphicCard>
            ))}
          </div>
        )}
      </NeumorphicCard>
    </>
  );
}

// Unilav Section (Admin)
function UnilavSection() {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [dataDocumento, setDataDocumento] = useState('');

  const queryClient = useQueryClient();

  const { data: unilavDocs = [], isLoading } = useQuery({
    queryKey: ['unilav-docs-admin'],
    queryFn: () => base44.entities.Unilav.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-dipendenti-unilav'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, userId, descrizione, dataDocumento }) => {
      setUploadingFile(true);
      const user = users.find(u => u.id === userId);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      return base44.entities.Unilav.create({
        user_id: userId,
        user_name: user?.nome_cognome || user?.full_name || user?.email,
        user_email: user?.email,
        pdf_url: file_url,
        descrizione: descrizione || 'Documento Unilav',
        data_documento: dataDocumento || new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unilav-docs-admin'] });
      setSelectedFile(null);
      setSelectedUserId('');
      setDescrizione('');
      setDataDocumento('');
      setUploadingFile(false);
      alert('Documento Unilav caricato con successo!');
    },
    onError: (error) => {
      setUploadingFile(false);
      alert('Errore: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Unilav.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unilav-docs-admin'] })
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Seleziona un file PDF');
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !selectedUserId) {
      alert('Seleziona file e dipendente');
      return;
    }
    uploadMutation.mutate({ 
      file: selectedFile, 
      userId: selectedUserId, 
      descrizione, 
      dataDocumento 
    });
  };

  return (
    <>
      <NeumorphicCard className="p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-purple-600" />
          Carica Documento Unilav
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Dipendente *</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
            >
              <option value="">Seleziona dipendente...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome_cognome || u.full_name || u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Descrizione</label>
            <input
              type="text"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Es: Unilav Assunzione"
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Data Documento</label>
            <input
              type="date"
              value={dataDocumento}
              onChange={(e) => setDataDocumento(e.target.value)}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">File PDF *</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none"
            />
            {selectedFile && (
              <p className="text-xs text-green-600 mt-2">✓ {selectedFile.name}</p>
            )}
          </div>

          <NeumorphicButton
            onClick={handleUpload}
            variant="primary"
            disabled={!selectedFile || !selectedUserId || uploadingFile}
            className="w-full flex items-center justify-center gap-2"
          >
            {uploadingFile ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Caricamento...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Carica Documento
              </>
            )}
          </NeumorphicButton>
        </div>
      </NeumorphicCard>

      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Documenti Unilav Caricati</h2>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          </div>
        ) : unilavDocs.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Nessun documento caricato</p>
        ) : (
          <div className="space-y-3">
            {unilavDocs.map(doc => (
              <NeumorphicCard key={doc.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">{doc.user_name}</h3>
                    <p className="text-sm text-slate-600">{doc.descrizione || 'Documento Unilav'}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Data: {doc.data_documento 
                        ? new Date(doc.data_documento).toLocaleDateString('it-IT')
                        : new Date(doc.created_date).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={doc.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nav-button p-2 rounded-lg"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                    </a>
                    <button
                      onClick={() => {
                        if (confirm('Eliminare questo documento?')) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      className="nav-button p-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>
        )}
      </NeumorphicCard>
    </>
  );
}

// Google Drive Settings Section (OBSOLETE - now in Contratti tab)
function DriveSettingsSection() {
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [driveFolders, setDriveFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [selectedConfigType, setSelectedConfigType] = useState('contratti');

  const queryClient = useQueryClient();

  const { data: driveConfigs = [] } = useQuery({
    queryKey: ['drive-configs-all'],
    queryFn: () => base44.entities.DriveConfig.filter({ is_active: true }),
  });

  const handleLoadDriveFolders = async () => {
    setLoadingFolders(true);
    try {
      const response = await base44.functions.invoke('listDriveFolders', {});
      setDriveFolders(response.data.folders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
      alert('Errore nel caricamento delle cartelle Drive');
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Inserisci un nome per la cartella');
      return;
    }

    setCreatingFolder(true);
    try {
      const currentUserData = await base44.auth.me();
      const response = await base44.functions.invoke('createDriveFolder', {
        folder_name: newFolderName
      });

      const existing = driveConfigs.find(c => c.config_type === selectedConfigType);
      if (existing) {
        await base44.entities.DriveConfig.update(existing.id, {
          folder_id: response.data.folder_id,
          folder_name: response.data.folder_name,
          created_by: currentUserData?.email || ''
        });
      } else {
        await base44.entities.DriveConfig.create({
          config_type: selectedConfigType,
          folder_id: response.data.folder_id,
          folder_name: response.data.folder_name,
          is_active: true,
          created_by: currentUserData?.email || ''
        });
      }

      queryClient.invalidateQueries({ queryKey: ['drive-configs-all'] });
      setNewFolderName('');
      alert('Cartella creata e configurata con successo!');
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Errore nella creazione della cartella');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSelectExistingFolder = async (folderId, folderName) => {
    try {
      const currentUserData = await base44.auth.me();
      const existing = driveConfigs.find(c => c.config_type === selectedConfigType);
      
      if (existing) {
        await base44.entities.DriveConfig.update(existing.id, {
          folder_id: folderId,
          folder_name: folderName
        });
      } else {
        await base44.entities.DriveConfig.create({
          config_type: selectedConfigType,
          folder_id: folderId,
          folder_name: folderName,
          is_active: true,
          created_by: currentUserData?.email || ''
        });
      }

      queryClient.invalidateQueries({ queryKey: ['drive-configs-all'] });
      alert('Cartella configurata con successo!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Errore nel salvataggio della configurazione');
    }
  };

  const currentConfig = driveConfigs.find(c => c.config_type === selectedConfigType);

  return (
    <div className="space-y-6">
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4 flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#8b7355]" />
          Configurazione Google Drive
        </h2>

        <div className="mb-6">
          <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
            Tipo Documento
          </label>
          <select
            value={selectedConfigType}
            onChange={(e) => setSelectedConfigType(e.target.value)}
            className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
          >
            <option value="contratti">Contratti</option>
          </select>
        </div>

        <div className="neumorphic-flat p-5 rounded-xl mb-6">
          <h3 className="font-bold text-[#6b6b6b] mb-3">Cartella di Salvataggio per {selectedConfigType}</h3>
          {currentConfig?.folder_id ? (
            <div className="flex items-center justify-between gap-3 neumorphic-pressed p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <Folder className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-[#6b6b6b]">{currentConfig.folder_name}</p>
                  <p className="text-xs text-[#9b9b9b]">Cartella configurata</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Folder className="w-12 h-12 text-[#9b9b9b] opacity-50 mx-auto mb-3" />
              <p className="text-[#9b9b9b] text-sm">Nessuna cartella configurata - i file andranno nella root</p>
            </div>
          )}
        </div>

        <div className="neumorphic-flat p-5 rounded-xl mb-4">
          <h3 className="font-bold text-[#6b6b6b] mb-3 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-green-600" />
            Crea Nuova Cartella
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome cartella (es. Contratti Sa Pizzedda)"
              className="flex-1 neumorphic-pressed px-4 py-3 rounded-xl text-[#6b6b6b] outline-none"
            />
            <NeumorphicButton
              onClick={handleCreateFolder}
              disabled={creatingFolder}
              variant="primary"
              className="flex items-center gap-2"
            >
              {creatingFolder ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FolderPlus className="w-5 h-5" />
              )}
              Crea
            </NeumorphicButton>
          </div>
        </div>

        <div className="neumorphic-flat p-5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#6b6b6b] flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-600" />
              Seleziona Cartella Esistente
            </h3>
            <NeumorphicButton
              onClick={handleLoadDriveFolders}
              disabled={loadingFolders}
              className="flex items-center gap-2 text-sm"
            >
              {loadingFolders ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Carica Cartelle'
              )}
            </NeumorphicButton>
          </div>

          {loadingFolders ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-[#9b9b9b]">Caricamento cartelle...</p>
            </div>
          ) : driveFolders.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {driveFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleSelectExistingFolder(folder.id, folder.name)}
                  className="w-full neumorphic-pressed p-3 rounded-xl hover:bg-blue-50 transition-colors text-left flex items-center gap-3"
                >
                  <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#6b6b6b] truncate">{folder.name}</p>
                    <p className="text-xs text-[#9b9b9b]">
                      Creata: {new Date(folder.createdTime).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#9b9b9b] py-4 text-sm">
              Clicca "Carica Cartelle" per visualizzare le cartelle disponibili
            </p>
          )}
        </div>

        <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50 mt-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Come funziona:</strong> Ogni documento firmato verrà salvato automaticamente nella cartella Drive configurata. Se non configuri una cartella, i file verranno salvati nella root del tuo Drive.
          </p>
        </div>
      </NeumorphicCard>
    </div>
  );
}

// Regolamento Section
function RegolamentoSection() {
  const [showForm, setShowForm] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [contenuto, setContenuto] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const queryClient = useQueryClient();
  const { data: regolamenti = [] } = useQuery({
    queryKey: ['regolamenti'],
    queryFn: () => base44.entities.RegolamentoDipendenti.list('-versione'),
  });
  const { data: firme = [] } = useQuery({
    queryKey: ['regolamenti-firmati'],
    queryFn: () => base44.entities.RegolamentoFirmato.list('-data_firma'),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users-dip'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'dipendente' || u.user_type === 'user');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const regolamentoAttivo = regolamenti.find(r => r.attivo);
      if (regolamentoAttivo) {
        await base44.entities.RegolamentoDipendenti.update(regolamentoAttivo.id, { attivo: false });
      }
      return base44.entities.RegolamentoDipendenti.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regolamenti'] });
      setShowForm(false);
      setContenuto('');
    },
  });

  const sendToEmployeesMutation = useMutation({
    mutationFn: async ({ regolamentoId, userIds }) => {
      const regolamento = regolamenti.find(r => r.id === regolamentoId);
      const firme = [];
      for (const userId of userIds) {
        const user = users.find(u => u.id === userId);
        firme.push({
          user_id: userId,
          user_email: user.email,
          user_name: user.nome_cognome || user.full_name || user.email,
          regolamento_id: regolamentoId,
          versione: regolamento.versione,
          firmato: false
        });
      }
      return Promise.all(firme.map(f => base44.entities.RegolamentoFirmato.create(f)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regolamenti-firmati'] });
      setShowSendModal(false);
      setSelectedUsers([]);
      alert('Regolamento inviato con successo!');
    },
  });

  const regolamentoAttivo = regolamenti.find(r => r.attivo);

  const handleSubmit = (e) => {
    e.preventDefault();
    const versione = (regolamentoAttivo?.versione || 0) + 1;
    createMutation.mutate({
      versione,
      contenuto,
      data_creazione: new Date().toISOString(),
      attivo: true
    });
  };

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <>
      <div className="flex gap-3 mb-6">
        <NeumorphicButton onClick={() => setShowForm(true)} variant="primary" className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuova Versione
        </NeumorphicButton>
        {regolamentoAttivo && (
          <>
            <NeumorphicButton onClick={() => setShowSendModal(true)} className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Invia ai Dipendenti
            </NeumorphicButton>
            <NeumorphicButton onClick={() => setShowHistory(true)} className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Storico
            </NeumorphicButton>
          </>
        )}
      </div>

      {regolamentoAttivo ? (
        <>
          <NeumorphicCard className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Regolamento Attivo (v{regolamentoAttivo.versione})</h2>
            <div className="neumorphic-pressed p-6 rounded-xl">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{regolamentoAttivo.contenuto}</pre>
            </div>
          </NeumorphicCard>

          {/* Stato Firme per Regolamento Attivo */}
          <NeumorphicCard className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Stato Firme (v{regolamentoAttivo.versione})</h3>
            {(() => {
              const firmeVersAttiva = firme.filter(f => f.versione === regolamentoAttivo.versione);
              const firmati = firmeVersAttiva.filter(f => f.firmato);
              const nonFirmati = firmeVersAttiva.filter(f => !f.firmato);
              const utentiConFirma = firmeVersAttiva.map(f => f.user_id);
              const nonInviati = users.filter(u => !utentiConFirma.includes(u.id));

              return (
                <div className="space-y-6">
                  {/* Firmati */}
                  {firmati.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Firmati ({firmati.length})
                      </h4>
                      <div className="space-y-2">
                        {firmati.map(f => (
                          <div key={f.id} className="neumorphic-flat p-3 rounded-lg bg-green-50 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{f.user_name}</p>
                              <p className="text-xs text-green-600">
                                Firmato: {f.data_firma ? new Date(f.data_firma).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              </p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Non Firmati (Inviati) */}
                  {nonFirmati.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> In Attesa Firma ({nonFirmati.length})
                      </h4>
                      <div className="space-y-2">
                        {nonFirmati.map(f => (
                          <div key={f.id} className="neumorphic-flat p-3 rounded-lg bg-orange-50 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{f.user_name}</p>
                              <p className="text-xs text-slate-500">
                                Inviato: {f.created_date ? new Date(f.created_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                              </p>
                            </div>
                            <Clock className="w-5 h-5 text-orange-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Non Inviati */}
                  {nonInviati.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Non Inviato ({nonInviati.length})
                        </h4>
                        <button
                          onClick={async () => {
                            if (!confirm(`Inviare il regolamento a ${nonInviati.length} dipendenti?`)) return;
                            await sendToEmployeesMutation.mutateAsync({ 
                              regolamentoId: regolamentoAttivo.id, 
                              userIds: nonInviati.map(u => u.id)
                            });
                          }}
                          className="nav-button px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 bg-blue-50 hover:bg-blue-100"
                        >
                          <Send className="w-3.5 h-3.5 text-blue-600" />
                          Invia a Tutti
                        </button>
                      </div>
                      <div className="space-y-2">
                        {nonInviati.map(u => (
                          <div key={u.id} className="neumorphic-flat p-3 rounded-lg bg-slate-50 flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-700">
                              {u.nome_cognome || u.full_name || u.email}
                            </p>
                            <button
                              onClick={async () => {
                                if (!confirm(`Inviare il regolamento a ${u.nome_cognome || u.full_name || u.email}?`)) return;
                                await sendToEmployeesMutation.mutateAsync({ 
                                  regolamentoId: regolamentoAttivo.id, 
                                  userIds: [u.id]
                                });
                              }}
                              className="nav-button p-1.5 rounded-lg hover:bg-blue-50"
                            >
                              <Send className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </NeumorphicCard>
        </>
      ) : (
        <NeumorphicCard className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nessun regolamento attivo</p>
        </NeumorphicCard>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Nuovo Regolamento</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea value={contenuto} onChange={(e) => setContenuto(e.target.value)}
                className="w-full neumorphic-pressed px-4 py-3 rounded-xl outline-none h-96 resize-none"
                placeholder="Inserisci il testo del regolamento..." required />
              <NeumorphicButton type="submit" variant="primary" className="w-full">
                Salva Versione {(regolamentoAttivo?.versione || 0) + 1}
              </NeumorphicButton>
            </form>
          </NeumorphicCard>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Seleziona Dipendenti</h2>
              <button onClick={() => setShowSendModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 mb-4">
              {users.map(u => (
                <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedUsers.includes(u.id) ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'nav-button'
                  }`}>
                  {u.nome_cognome || u.full_name || u.email}
                </button>
              ))}
            </div>
            <NeumorphicButton onClick={() => sendToEmployeesMutation.mutate({ regolamentoId: regolamentoAttivo.id, userIds: selectedUsers })}
              variant="primary" className="w-full">
              Invia a {selectedUsers.length} dipendenti
            </NeumorphicButton>
          </NeumorphicCard>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Storico Versioni</h2>
              <button onClick={() => setShowHistory(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-6">
              {regolamenti.map(r => {
                const firmeVers = firme.filter(f => f.versione === r.versione);
                const firmati = firmeVers.filter(f => f.firmato);
                const nonFirmati = firmeVers.filter(f => !f.firmato);
                const utentiConFirma = firmeVers.map(f => f.user_id);
                const nonInviati = users.filter(u => !utentiConFirma.includes(u.id));

                return (
                  <NeumorphicCard key={r.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-slate-800">Versione {r.versione}</p>
                      {r.attivo && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Attivo</span>}
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="neumorphic-pressed p-2 rounded-lg bg-green-50 text-center">
                        <p className="text-lg font-bold text-green-700">{firmati.length}</p>
                        <p className="text-xs text-green-600">Firmati</p>
                      </div>
                      <div className="neumorphic-pressed p-2 rounded-lg bg-orange-50 text-center">
                        <p className="text-lg font-bold text-orange-700">{nonFirmati.length}</p>
                        <p className="text-xs text-orange-600">In Attesa</p>
                      </div>
                      <div className="neumorphic-pressed p-2 rounded-lg bg-slate-50 text-center">
                        <p className="text-lg font-bold text-slate-700">{nonInviati.length}</p>
                        <p className="text-xs text-slate-600">Non Inviato</p>
                      </div>
                    </div>

                    {/* Dettagli utenti (collapsible) */}
                    <details className="neumorphic-pressed p-3 rounded-lg">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700">
                        Dettaglio Dipendenti
                      </summary>
                      <div className="mt-3 space-y-3">
                        {firmati.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-green-700 mb-1">✓ Firmati:</p>
                            <div className="space-y-1">
                              {firmati.map(f => (
                                <p key={f.id} className="text-xs text-slate-600 pl-2">• {f.user_name}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        {nonFirmati.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-orange-700 mb-1">⏱ In Attesa:</p>
                            <div className="space-y-1">
                              {nonFirmati.map(f => (
                                <p key={f.id} className="text-xs text-slate-600 pl-2">• {f.user_name}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        {nonInviati.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-1">✗ Non Inviato:</p>
                            <div className="space-y-1">
                              {nonInviati.map(u => (
                                <p key={u.id} className="text-xs text-slate-600 pl-2">• {u.nome_cognome || u.full_name || u.email}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  </NeumorphicCard>
                );
              })}
            </div>
          </NeumorphicCard>
        </div>
      )}
    </>
  );
}