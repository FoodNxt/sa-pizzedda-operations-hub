import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  TrendingDown,
  Eye,
  X,
  Settings,
  Save,
  Plus,
  Trash2,
  FileClock
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

function PeriodoProvaTab() {
  const [viewingUser, setViewingUser] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [giorniPerMese, setGiorniPerMese] = useState('');

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: configs = [], isLoading: isLoadingConfig } = useQuery({
    queryKey: ['periodoProvaConfig'],
    queryFn: () => base44.entities.PeriodoProvaConfig.list(),
  });

  const currentConfig = configs[0];

  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (currentConfig) {
        return base44.entities.PeriodoProvaConfig.update(currentConfig.id, data);
      }
      return base44.entities.PeriodoProvaConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodoProvaConfig'] });
      alert('Configurazione salvata!');
    },
  });

  const dipendenteConContratto = users.filter(u => {
    if (u.user_type !== 'dipendente' && u.user_type !== 'user') return false;
    if (!u.data_inizio_contratto) return false;
    
    try {
      const dataInizio = new Date(u.data_inizio_contratto);
      const oggi = new Date();
      return dataInizio <= oggi;
    } catch(e) {
      return false;
    }
  });

  const employeeAlerts = useMemo(() => {
    if (isLoadingConfig) return [];
    
    const giorniProvaPerMese = currentConfig?.giorni_prova_per_mese || 15; // default 15 giorni per mese

    return dipendenteConContratto.map(user => {
      const dataInizio = new Date(user.data_inizio_contratto);
      const nomeCompleto = user.nome_cognome || user.full_name || '';
      
      const contractDuration = user.durata_contratto_mesi || 0;
      const giorniProvaTotali = contractDuration * giorniProvaPerMese;
      const dataFineProva = new Date(dataInizio);
      dataFineProva.setDate(dataFineProva.getDate() + giorniProvaTotali);
      
      const oggi = new Date();
      const giorniTrascorsi = Math.floor((oggi - dataInizio) / (1000 * 60 * 60 * 24));
      const giorniRimanenti = Math.max(0, giorniProvaTotali - giorniTrascorsi);
      const inPeriodoProva = oggi < dataFineProva;

      const shiftsFromContractStart = shifts.filter(shift => {
        const employeeNameMatch = shift.employee_name === nomeCompleto;
        if (!employeeNameMatch) return false;
        
        try {
          const shiftDate = new Date(shift.shift_date);
          return shiftDate >= dataInizio;
        } catch(e) { return false; }
      });

      const numeroTurni = shiftsFromContractStart.length;

      return {
        user,
        numeroTurni,
        giorniProvaTotali,
        giorniTrascorsi,
        giorniRimanenti,
        dataInizio,
        dataFineProva,
        inPeriodoProva,
        shiftsFromContractStart
      };
    }).filter(item => item.inPeriodoProva)
      .sort((a, b) => a.giorniRimanenti - b.giorniRimanenti);
  }, [dipendenteConContratto, shifts, configs, isLoadingConfig, currentConfig]);

  const stats = {
    totaleDipendenti: dipendenteConContratto.length,
    totaleInProva: employeeAlerts.length,
    critici: employeeAlerts.filter(e => e.giorniRimanenti <= 7).length,
    attenzione: employeeAlerts.filter(e => e.giorniRimanenti > 7 && e.giorniRimanenti <= 15).length
  };

  const getSeverityColor = (giorniRimanenti) => {
    if (giorniRimanenti <= 7) return 'bg-red-100 text-red-700 border-red-300';
    if (giorniRimanenti <= 15) return 'bg-orange-100 text-orange-700 border-orange-300';
    if (giorniRimanenti <= 30) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-blue-100 text-blue-700 border-blue-300';
  };

  const getSeverityLabel = (giorniRimanenti) => {
    if (giorniRimanenti <= 7) return 'CRITICO';
    if (giorniRimanenti <= 15) return 'ALTO';
    if (giorniRimanenti <= 30) return 'MEDIO';
    return 'BASSO';
  };

  return (
    <div className="space-y-6">
        <NeumorphicCard className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#6b6b6b]">Configurazione Periodo di Prova</h2>
                <NeumorphicButton onClick={() => setShowConfig(!showConfig)}>
                    <Settings className="w-4 h-4 mr-2" />
                    {showConfig ? 'Nascondi' : 'Configura'}
                </NeumorphicButton>
            </div>
            {showConfig && (
                <div className="space-y-4">
                    <div className="neumorphic-pressed p-4 rounded-xl">
                        <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                            Giorni di prova per ogni mese di contratto
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="1"
                                placeholder="Es: 15"
                                value={giorniPerMese || currentConfig?.giorni_prova_per_mese || ''}
                                onChange={(e) => setGiorniPerMese(e.target.value)}
                                className="neumorphic-pressed px-4 py-3 rounded-lg flex-1 outline-none"
                            />
                            <NeumorphicButton 
                                onClick={() => saveConfigMutation.mutate({ giorni_prova_per_mese: parseInt(giorniPerMese) || 15 })} 
                                variant="primary"
                                disabled={saveConfigMutation.isPending}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Salva
                            </NeumorphicButton>
                        </div>
                        <p className="text-xs text-[#9b9b9b] mt-2">
                            Esempio: Se imposti 15, un contratto di 6 mesi avrà 90 giorni di prova (6 × 15)
                        </p>
                    </div>
                    {currentConfig && (
                        <div className="neumorphic-flat p-3 rounded-lg bg-blue-50">
                            <p className="text-sm text-blue-800">
                                <strong>Configurazione attuale:</strong> {currentConfig.giorni_prova_per_mese} giorni per mese
                            </p>
                        </div>
                    )}
                </div>
            )}
        </NeumorphicCard>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Stats cards */}
        </div>

        <NeumorphicCard className="p-6">
            <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Dipendenti in Periodo Prova</h2>
            {employeeAlerts.length === 0 ? (
                <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-green-600 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-green-700 mb-2">Nessun Alert!</h3>
                <p className="text-[#6b6b6b]">
                    Tutti i dipendenti hanno completato i turni richiesti per il periodo di prova.
                </p>
                </div>
            ) : (
                <div className="space-y-3">{employeeAlerts.map((alert, idx) => (
                    <div key={idx} className={`neumorphic-pressed p-5 rounded-xl border-2 ${getSeverityColor(alert.numeroTurni, alert.turniRichiesti)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 rounded-full neumorphic-flat flex items-center justify-center">
                                <span className="text-lg font-bold text-[#8b7355]">
                                  {(alert.user.nome_cognome || alert.user.full_name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-[#6b6b6b]">
                                  {alert.user.nome_cognome || alert.user.full_name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-[#9b9b9b]">
                                  <span>{alert.user.email}</span>
                                  {alert.user.ruoli_dipendente && alert.user.ruoli_dipendente.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{alert.user.ruoli_dipendente.join(', ')}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(alert.numeroTurni, alert.turniRichiesti)}`}>
                                  {getSeverityLabel(alert.numeroTurni, alert.turniRichiesti)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="neumorphic-flat p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-[#9b9b9b] mb-1">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-xs">Turni Completati</span>
                                </div>
                                <p className="text-2xl font-bold text-[#6b6b6b]">{alert.numeroTurni}/{alert.turniRichiesti}</p>
                              </div>

                              <div className="neumorphic-flat p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-[#9b9b9b] mb-1">
                                  <Calendar className="w-4 h-4" />
                                  <span className="text-xs">Data Inizio</span>
                                </div>
                                <p className="text-sm font-bold text-[#6b6b6b]">
                                  {new Date(alert.dataInizio).toLocaleDateString('it-IT')}
                                </p>
                              </div>

                              <div className="neumorphic-flat p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-[#9b9b9b] mb-1">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-xs">Giorni Trascorsi</span>
                                </div>
                                <p className="text-2xl font-bold text-[#6b6b6b]">{alert.giorni}</p>
                              </div>

                              <div className="neumorphic-flat p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-[#9b9b9b] mb-1">
                                  <Users className="w-4 h-4" />
                                  <span className="text-xs">Media Turni/Sett</span>
                                </div>
                                <p className="text-2xl font-bold text-[#6b6b6b]">
                                  {alert.giorni > 0 ? ((alert.numeroTurni / alert.giorni) * 7).toFixed(1) : 0}
                                </p>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setViewingUser(alert)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-purple-50 transition-colors ml-4"
                            title="Visualizza dettagli"
                          >
                            <Eye className="w-5 h-5 text-purple-600" />
                          </button>
                        </div>
                    </div>
                ))}</div>
            )}
        </NeumorphicCard>
    </div>
  );
}

function ContrattiInScadenzaTab() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const expiringContracts = useMemo(() => {
    const oggi = new Date();
    const trentaGiorni = new Date();
    trentaGiorni.setDate(oggi.getDate() + 30);

    return users
      .filter(user => user.data_inizio_contratto && user.durata_contratto_mesi)
      .map(user => {
        const dataInizio = new Date(user.data_inizio_contratto);
        const dataFine = new Date(dataInizio.setMonth(dataInizio.getMonth() + user.durata_contratto_mesi));
        const giorniRimanenti = Math.floor((dataFine - oggi) / (1000 * 60 * 60 * 24));
        return { ...user, data_fine_contratto: dataFine, giorni_rimanenti: giorniRimanenti };
      })
      .filter(user => user.data_fine_contratto > oggi && user.data_fine_contratto <= trentaGiorni)
      .sort((a, b) => a.data_fine_contratto - b.data_fine_contratto);
  }, [users]);
  
  if (isLoading) return <div>Caricamento...</div>;

  return (
    <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Contratti in Scadenza (Prossimi 30 giorni)</h2>
        {expiringContracts.length === 0 ? (
            <div className="text-center py-12">
                <FileClock className="w-16 h-16 text-green-600 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-green-700 mb-2">Nessun contratto in scadenza!</h3>
            </div>
        ) : (
            <div className="space-y-3">
                {expiringContracts.map(user => (
                    <div key={user.id} className="neumorphic-pressed p-5 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-[#6b6b6b]">{user.nome_cognome || user.full_name}</h3>
                                <p className="text-sm text-[#9b9b9b]">{user.email}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-red-600">{user.giorni_rimanenti} giorni</p>
                                <p className="text-sm text-[#9b9b9b]">Scade il: {user.data_fine_contratto.toLocaleDateString('it-IT')}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </NeumorphicCard>
  )
}

export default function Alerts() {
  const [activeTab, setActiveTab] = useState('prova');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-10 h-10 text-orange-600" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Alerts HR</h1>
        </div>
        <p className="text-[#9b9b9b]">Monitoraggio scadenze e periodi di prova</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('prova')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'prova' ? 'neumorphic-pressed' : 'neumorphic-flat'}`}>Periodo di Prova</button>
        <button onClick={() => setActiveTab('scadenza')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'scadenza' ? 'neumorphic-pressed' : 'neumorphic-flat'}`}>Contratti in Scadenza</button>
      </div>

      {activeTab === 'prova' && <PeriodoProvaTab />}
      {activeTab === 'scadenza' && <ContrattiInScadenzaTab />}
    </div>
  );
}