import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Store,
  User,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  X,
  AlertCircle
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function PagamentoStraordinari() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [showPagati, setShowPagati] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['planday-shifts'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data', 500)
  });

  const { data: straordinariConfigs = [] } = useQuery({
    queryKey: ['straordinari-configs'],
    queryFn: () => base44.entities.StraordinarioDipendente.list()
  });

  const { data: pagamentiStraordinari = [] } = useQuery({
    queryKey: ['pagamenti-straordinari'],
    queryFn: () => base44.entities.PagamentoStraordinario.list('-data_turno', 500)
  });

  const { data: disponibilitaConfigs = [] } = useQuery({
    queryKey: ['disponibilita-config'],
    queryFn: () => base44.entities.DisponibilitaConfig.filter({ is_active: true })
  });

  const { data: attivitaCompletate = [] } = useQuery({
    queryKey: ['attivita-completate'],
    queryFn: () => base44.entities.AttivitaCompletata.list('-completato_at', 500)
  });

  const activeConfig = disponibilitaConfigs[0] || null;

  const effettuaPagamentoMutation = useMutation({
    mutationFn: async ({ pagamentoId, importo, dipendente }) => {
      // Update payment record
      await base44.entities.PagamentoStraordinario.update(pagamentoId, {
        pagato: true,
        data_pagamento: new Date().toISOString(),
        pagato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email,
        pagato_da_id: currentUser?.id
      });

      // Create deposito to reduce saldo personale
      await base44.entities.Deposito.create({
        store_id: 'pagamento_straordinario',
        store_name: 'Pagamento Straordinario',
        rilevato_da: currentUser?.nome_cognome || currentUser?.full_name || currentUser?.email,
        importo: importo,
        data_deposito: new Date().toISOString(),
        note: `Pagamento straordinario a ${dipendente}`,
        impostato_da: currentUser?.email || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamenti-straordinari'] });
      queryClient.invalidateQueries({ queryKey: ['depositi'] });
    }
  });

  // Calculate overtime pay from shifts
  const straordinariDaTurni = useMemo(() => {
    const straordinari = [];
    
    // Get all shifts with tipo_turno = "Straordinario" or ore_straordinarie > 0
    const shiftsWithOvertime = shifts.filter(s => 
      s.tipo_turno === 'Straordinario' || (s.ore_straordinarie && s.ore_straordinarie > 0)
    );

    // Filter by store manager's stores if user is store manager
    let relevantShifts = shiftsWithOvertime;
    if (currentUser?.user_type === 'manager' && currentUser?.assigned_stores) {
      const assignedStoreIds = stores
        .filter(s => currentUser.assigned_stores.includes(s.name))
        .map(s => s.id);
      relevantShifts = shiftsWithOvertime.filter(s => assignedStoreIds.includes(s.store_id));
    }

    relevantShifts.forEach(shift => {
      // Check if payment already exists for this shift
      const existingPayment = pagamentiStraordinari.find(p => p.turno_id === shift.id);
      if (existingPayment) return; // Skip if payment already created

      // Calculate ore straordinarie from shift times if not set
      let oreStr = shift.ore_straordinarie || 0;
      if (oreStr === 0 && shift.ora_inizio && shift.ora_fine) {
        const [startH, startM] = shift.ora_inizio.split(':').map(Number);
        const [endH, endM] = shift.ora_fine.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;
        if (endMinutes < startMinutes) endMinutes += 24 * 60;
        oreStr = (endMinutes - startMinutes) / 60;
      }

      const dipConfig = straordinariConfigs.find(c => c.dipendente_id === shift.dipendente_id);
      const costoOrario = dipConfig?.costo_orario_straordinario || activeConfig?.retribuzione_oraria_straordinari || 10;
      const importoTotale = oreStr * costoOrario;

      // Check if already paid via old logic (AttivitaCompletata)
      const pagatoVecchiaLogica = attivitaCompletate.some(ac => 
        ac.turno_id === shift.id && 
        ac.attivita_nome?.includes('Pagamento straordinari') &&
        ac.importo_pagato
      );

      // Get store name from stores list if not present
      const storeName = shift.store_nome || stores.find(s => s.id === shift.store_id)?.name || '-';

      straordinari.push({
        turno_id: shift.id,
        dipendente_id: shift.dipendente_id,
        dipendente_nome: shift.dipendente_nome,
        store_id: shift.store_id,
        store_name: storeName,
        data_turno: shift.data,
        ore_straordinarie: oreStr,
        costo_orario: costoOrario,
        importo_totale: importoTotale,
        turno_data: shift,
        pagato: pagatoVecchiaLogica,
        pagato_vecchia_logica: pagatoVecchiaLogica
      });
    });

    return straordinari;
  }, [shifts, straordinariConfigs, pagamentiStraordinari, currentUser, stores, activeConfig, attivitaCompletate]);

  // Merge existing payments with calculated ones
  const allStraordinari = useMemo(() => {
    return [...pagamentiStraordinari, ...straordinariDaTurni];
  }, [pagamentiStraordinari, straordinariDaTurni]);

  const filteredStraordinari = useMemo(() => {
    let filtered = allStraordinari;

    if (!showPagati) {
      filtered = filtered.filter(s => !s.pagato);
    }

    if (selectedStore !== 'all') {
      filtered = filtered.filter(s => s.store_id === selectedStore);
    }

    if (startDate) {
      filtered = filtered.filter(s => s.data_turno >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(s => s.data_turno <= endDate);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.data_turno || 0);
      const dateB = new Date(b.data_turno || 0);
      return dateB - dateA;
    });
  }, [allStraordinari, showPagati, selectedStore, startDate, endDate]);

  const stats = useMemo(() => {
    const totale = filteredStraordinari.reduce((sum, s) => sum + (s.importo_totale || 0), 0);
    const daPagare = filteredStraordinari.filter(s => !s.pagato).reduce((sum, s) => sum + (s.importo_totale || 0), 0);
    const pagati = filteredStraordinari.filter(s => s.pagato).reduce((sum, s) => sum + (s.importo_totale || 0), 0);
    const count = filteredStraordinari.length;
    const countDaPagare = filteredStraordinari.filter(s => !s.pagato).length;

    return { totale, daPagare, pagati, count, countDaPagare };
  }, [filteredStraordinari]);

  const handleEffettuaPagamento = async (straordinario) => {
    if (!confirm(`Confermare il pagamento di €${straordinario.importo_totale.toFixed(2)} a ${straordinario.dipendente_nome}?`)) {
      return;
    }

    // If this is from turni (no id), create the payment record first
    if (!straordinario.id) {
      const newPagamento = await base44.entities.PagamentoStraordinario.create({
        turno_id: straordinario.turno_id,
        dipendente_id: straordinario.dipendente_id,
        dipendente_nome: straordinario.dipendente_nome,
        store_id: straordinario.store_id,
        store_name: straordinario.store_name,
        data_turno: straordinario.data_turno,
        ore_straordinarie: straordinario.ore_straordinarie,
        costo_orario: straordinario.costo_orario,
        importo_totale: straordinario.importo_totale
      });
      
      effettuaPagamentoMutation.mutate({
        pagamentoId: newPagamento.id,
        importo: straordinario.importo_totale,
        dipendente: straordinario.dipendente_nome
      });
    } else {
      effettuaPagamentoMutation.mutate({
        pagamentoId: straordinario.id,
        importo: straordinario.importo_totale,
        dipendente: straordinario.dipendente_nome
      });
    }
  };

  return (
    <ProtectedPage pageName="PagamentoStraordinari">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="bg-clip-text text-slate-50 mb-1 text-2xl font-bold lg:text-3xl from-slate-700 to-slate-900">
            Pagamento Straordinari
          </h1>
          <p className="text-slate-50 text-sm">Gestisci i pagamenti degli straordinari</p>
        </div>

        {/* Filters */}
        <NeumorphicCard className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base lg:text-lg font-bold text-slate-800">Filtri</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm">
              <option value="all">Tutti i Locali</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowPagati(!showPagati)}
              className={`px-4 py-3 rounded-xl text-sm font-medium ${
                showPagati ? 'bg-blue-500 text-white' : 'neumorphic-pressed text-slate-700'
              }`}>
              {showPagati ? 'Nascondi Pagati' : 'Mostra Pagati'}
            </button>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Data inizio"
              className="neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Data fine"
              className="neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none text-sm" />

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="neumorphic-flat px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </NeumorphicCard>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2 lg:mb-3 shadow-lg">
                <DollarSign className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                €{stats.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500">Totale</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-2 lg:mb-3 shadow-lg">
                <AlertCircle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-red-600 mb-1">
                €{stats.daPagare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500">Da Pagare</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-2 lg:mb-3 shadow-lg">
                <CheckCircle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-green-600 mb-1">
                €{stats.pagati.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500">Pagati</p>
            </div>
          </NeumorphicCard>

          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-2 lg:mb-3 shadow-lg">
                <Clock className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-purple-600 mb-1">
                {stats.countDaPagare}
              </h3>
              <p className="text-xs text-slate-500">In Attesa</p>
            </div>
          </NeumorphicCard>
        </div>

        {/* Elenco Straordinari */}
        <NeumorphicCard className="p-4 lg:p-6">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 mb-4">
            Straordinari {showPagati ? '(Tutti)' : '(Da Pagare)'}
          </h2>

          {filteredStraordinari.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-slate-300 opacity-50 mx-auto mb-4" />
              <p className="text-slate-500">Nessuno straordinario da mostrare</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-blue-600">
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Data</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Dipendente</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Locale</th>
                    <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Orario</th>
                    <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Ore</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">€/h</th>
                    <th className="text-right p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Totale</th>
                    <th className="text-center p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Stato</th>
                    <th className="text-left p-2 lg:p-3 text-slate-600 font-medium text-xs lg:text-sm">Pagato da</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStraordinari.map((straordinario, idx) => (
                    <tr key={straordinario.id || idx} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                      straordinario.pagato ? 'opacity-60' : ''
                    }`}>
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm">
                            {(() => {
                              try {
                                return format(parseISO(straordinario.data_turno), 'dd/MM/yyyy', { locale: it });
                              } catch (e) {
                                return straordinario.data_turno;
                              }
                            })()}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 text-sm font-medium">{straordinario.dipendente_nome}</span>
                        </div>
                      </td>
                      <td className="p-2 lg:p-3">
                       <div className="flex items-center gap-2">
                         <Store className="w-4 h-4 text-slate-400" />
                         <span className="text-slate-700 text-sm">
                           {straordinario.store_name || stores.find(s => s.id === straordinario.store_id)?.name || '-'}
                         </span>
                       </div>
                      </td>
                      <td className="p-2 lg:p-3 text-center">
                        <span className="text-slate-700 text-xs">
                          {straordinario.turno_data?.ora_inizio || '-'} - {straordinario.turno_data?.ora_fine || '-'}
                        </span>
                      </td>
                      <td className="p-2 lg:p-3 text-center">
                        <span className="text-slate-700 font-bold text-sm">
                          {straordinario.ore_straordinarie.toFixed(2)}h
                        </span>
                      </td>
                      <td className="p-2 lg:p-3 text-right">
                        <span className="text-slate-600 text-sm">
                          €{straordinario.costo_orario?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="p-2 lg:p-3 text-right">
                        <span className="text-blue-600 font-bold text-sm lg:text-base">
                          €{straordinario.importo_totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-2 lg:p-3 text-center">
                        {straordinario.pagato ? (
                          <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Pagato
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            In attesa
                          </div>
                        )}
                      </td>
                      <td className="p-2 lg:p-3 text-left">
                        {straordinario.pagato ? (
                          <div className="text-xs text-slate-700">
                            <p className="font-medium">{straordinario.pagato_da || '-'}</p>
                            {straordinario.data_pagamento && (
                              <p className="text-slate-500">
                                {(() => {
                                  try {
                                    return format(parseISO(straordinario.data_pagamento), 'dd/MM HH:mm', { locale: it });
                                  } catch (e) {
                                    return straordinario.data_pagamento;
                                  }
                                })()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <NeumorphicButton
                            onClick={() => handleEffettuaPagamento(straordinario)}
                            className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white"
                            disabled={effettuaPagamentoMutation.isPending}>
                            Paga
                          </NeumorphicButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>

        {/* Info Card */}
        <NeumorphicCard className="p-4 bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-bold mb-1">ℹ️ Informazioni</p>
              <p>
                Quando effettui un pagamento straordinario, l'importo verrà automaticamente scalato dal tuo saldo personale in "Storico Cassa - Saldo Personale".
              </p>
              <p className="mt-2">
                Gli straordinari vengono calcolati automaticamente dai turni con tipo "Straordinario" o con ore straordinarie compilate.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}