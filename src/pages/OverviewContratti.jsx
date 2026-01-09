import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import ProtectedPage from "../components/ProtectedPage";
import { FileText, Calendar, Clock, Briefcase, User, ArrowUpDown, AlertTriangle, RefreshCw, X, History } from "lucide-react";
import moment from "moment";

export default function OverviewContratti() {
  const [sortField, setSortField] = useState('giorni_rimanenti');
  const [sortDirection, setSortDirection] = useState('asc');
  const [renewingContract, setRenewingContract] = useState(null);
  const [renewalData, setRenewalData] = useState({
    template_id: '',
    data_inizio: '',
    durata_mesi: 12
  });
  const [viewingHistory, setViewingHistory] = useState(null);

  const queryClient = useQueryClient();

  const { data: contratti = [], isLoading } = useQuery({
    queryKey: ['contratti-overview'],
    queryFn: () => base44.entities.Contratto.filter({ status: 'firmato' }),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-overview'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['contratto-templates'],
    queryFn: () => base44.entities.ContrattoTemplate.filter({ attivo: true }),
  });

  const createContractMutation = useMutation({
    mutationFn: (contractData) => base44.entities.Contratto.create(contractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratti-overview'] });
      setRenewingContract(null);
      setRenewalData({ template_id: '', data_inizio: '', durata_mesi: 12 });
      alert('✅ Contratto rinnovato e inviato al dipendente!');
    },
  });

  const dipendentiConContratti = useMemo(() => {
    const oggi = new Date();
    
    // Raggruppa contratti per dipendente
    const contrattiPerDipendente = {};
    contratti.forEach(c => {
      const userId = c.user_id;
      if (!userId) return;
      
      if (!contrattiPerDipendente[userId]) {
        contrattiPerDipendente[userId] = [];
      }
      contrattiPerDipendente[userId].push(c);
    });
    
    return Object.entries(contrattiPerDipendente).map(([userId, userContracts]) => {
      // Sort by start date (most recent first)
      const sortedContracts = userContracts.sort((a, b) => {
        const dateA = new Date(a.data_inizio_contratto);
        const dateB = new Date(b.data_inizio_contratto);
        return dateB - dateA;
      });

      const currentContract = sortedContracts[0];
      const dataInizio = new Date(currentContract.data_inizio_contratto);
      
      // Get user data to check for contract end date
      const userData = users.find(u => u.id === userId);
      let dataFine;
      let durataMesi = 0;
      
      if (userData?.data_fine_contratto) {
        // Use explicit end date from User entity
        dataFine = new Date(userData.data_fine_contratto);
      } else if (userData?.durata_contratto_mesi && userData.durata_contratto_mesi > 0) {
        // Calculate from months in User entity
        durataMesi = userData.durata_contratto_mesi;
        dataFine = new Date(dataInizio);
        dataFine.setMonth(dataFine.getMonth() + parseInt(durataMesi));
      } else if (currentContract.durata_contratto_mesi && currentContract.durata_contratto_mesi > 0) {
        // Fallback to contract data
        durataMesi = currentContract.durata_contratto_mesi;
        dataFine = new Date(dataInizio);
        dataFine.setMonth(dataFine.getMonth() + parseInt(durataMesi));
      } else {
        // Indeterminato
        dataFine = null;
      }

      const giorniRimanenti = dataFine ? Math.ceil((dataFine - oggi) / (1000 * 60 * 60 * 24)) : null;

      // Calculate tenure from first contract
      const primoContratto = userContracts.sort((a, b) => 
        new Date(a.data_inizio_contratto) - new Date(b.data_inizio_contratto)
      )[0];
      const dataPrimaAssunzione = new Date(primoContratto.data_inizio_contratto);
      const mesiTenure = Math.floor((oggi - dataPrimaAssunzione) / (1000 * 60 * 60 * 24 * 30.44));

      return {
        ...currentContract,
        data_inizio: dataInizio,
        data_fine: dataFine,
        giorni_rimanenti: giorniRimanenti,
        tipo_contratto_label: currentContract.employee_group === 'FT' ? 'Full Time' : 
                             currentContract.employee_group === 'PT' ? 'Part Time' : 
                             currentContract.employee_group === 'CM' ? 'Chiamata' : 
                             currentContract.employee_group || 'N/A',
        durata_contratto: dataFine ? 'Determinato' : 'Indeterminato',
        ruoli: (currentContract.ruoli_dipendente || []).join(', ') || currentContract.function_name || 'N/A',
        tenure_mesi: mesiTenure,
        tutti_contratti: sortedContracts,
        ore_settimanali: userData?.ore_settimanali ?? currentContract.ore_settimanali ?? 0
      };
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'nome_cognome') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [contratti, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
    >
      {children}
      <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-blue-600' : 'text-slate-400'}`} />
    </button>
  );

  const handleRenewContract = async () => {
    if (!renewalData.template_id || !renewalData.data_inizio) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    const template = templates.find(t => t.id === renewalData.template_id);
    if (!template) {
      alert('Template non trovato');
      return;
    }

    const user = users.find(u => u.id === renewingContract.user_id);
    if (!user) {
      alert('Utente non trovato');
      return;
    }

    // Calculate end date
    const dataInizio = new Date(renewalData.data_inizio);
    const dataFine = new Date(dataInizio);
    dataFine.setMonth(dataFine.getMonth() + parseInt(renewalData.durata_mesi));

    // Find first contract date for this user
    const tuttiContratti = await base44.entities.Contratto.filter({ user_id: renewingContract.user_id, status: 'firmato' });
    let dataInizioPrimoContratto = '';
    if (tuttiContratti.length > 0) {
      const contrattoPiuVecchio = tuttiContratti.sort((a, b) => 
        new Date(a.data_inizio_contratto) - new Date(b.data_inizio_contratto)
      )[0];
      if (contrattoPiuVecchio.data_inizio_contratto) {
        dataInizioPrimoContratto = new Date(contrattoPiuVecchio.data_inizio_contratto).toLocaleDateString('it-IT');
      }
    }

    // Replace variables in template
    let contenutoContratto = template.contenuto_template;
    const variabili = {
      '{{nome_cognome}}': user.nome_cognome || user.full_name || '',
      '{{email}}': user.email || '',
      '{{phone}}': user.phone || '',
      '{{data_nascita}}': user.data_nascita ? new Date(user.data_nascita).toLocaleDateString('it-IT') : '',
      '{{citta_nascita}}': user.citta_nascita || '',
      '{{codice_fiscale}}': user.codice_fiscale || '',
      '{{indirizzo_residenza}}': user.indirizzo_residenza || '',
      '{{iban}}': user.iban || '',
      '{{sede_lavoro}}': user.sede_lavoro || '',
      '{{ore_settimanali}}': renewingContract.ore_settimanali?.toString() || '',
      '{{data_inizio_contratto}}': new Date(renewalData.data_inizio).toLocaleDateString('it-IT'),
      '{{data_fine_contratto}}': dataFine.toLocaleDateString('it-IT'),
      '{{durata_contratto_mesi}}': renewalData.durata_mesi.toString(),
      '{{employee_group}}': renewingContract.employee_group || '',
      '{{function_name}}': renewingContract.function_name || '',
      '{{data_oggi}}': new Date().toLocaleDateString('it-IT'),
      '{{ruoli}}': (renewingContract.ruoli_dipendente || user.ruoli_dipendente || []).join(', '),
      '{{locali}}': (user.assigned_stores || []).join(', ') || 'Tutti i locali',
      '{{data_inizio_primo_contratto}}': dataInizioPrimoContratto
    };

    Object.entries(variabili).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      contenutoContratto = contenutoContratto.replace(regex, value);
    });

    const newContract = {
      user_id: renewingContract.user_id,
      user_email: user.email,
      user_nome_cognome: user.nome_cognome || user.full_name,
      template_id: template.id,
      template_nome: template.nome_template,
      contenuto_contratto: contenutoContratto,
      nome_cognome: user.nome_cognome || user.full_name,
      phone: user.phone,
      data_nascita: user.data_nascita,
      citta_nascita: user.citta_nascita,
      codice_fiscale: user.codice_fiscale,
      indirizzo_residenza: user.indirizzo_residenza,
      iban: user.iban,
      taglia_maglietta: user.taglia_maglietta,
      user_type: 'dipendente',
      ruoli_dipendente: renewingContract.ruoli_dipendente || user.ruoli_dipendente,
      assigned_stores: user.assigned_stores,
      sede_lavoro: user.sede_lavoro,
      tipo_contratto: renewingContract.tipo_contratto,
      employee_group: renewingContract.employee_group,
      function_name: renewingContract.function_name,
      ore_settimanali: renewingContract.ore_settimanali,
      data_inizio_contratto: renewalData.data_inizio,
      data_fine_contratto: dataFine.toISOString().split('T')[0],
      durata_contratto_mesi: renewalData.durata_mesi,
      status: 'inviato',
      data_invio: new Date().toISOString(),
      note: 'Rinnovo contratto'
    };

    await createContractMutation.mutateAsync(newContract);
  };

  const dipendentiSenzaContratto = useMemo(() => {
    const dipendentiConContrattoIds = new Set(dipendentiConContratti.map(d => d.user_id));
    return users.filter(u => 
      (u.user_type === 'dipendente' || u.user_type === 'user') && 
      u.status === 'active' &&
      !dipendentiConContrattoIds.has(u.id)
    );
  }, [users, dipendentiConContratti]);

  const stats = useMemo(() => {
    const totale = dipendentiConContratti.length;
    const inScadenza30 = dipendentiConContratti.filter(d => d.giorni_rimanenti !== null && d.giorni_rimanenti <= 30 && d.giorni_rimanenti >= 0).length;
    const scaduti = dipendentiConContratti.filter(d => d.giorni_rimanenti !== null && d.giorni_rimanenti < 0).length;
    const fullTime = dipendentiConContratti.filter(d => d.employee_group === 'FT').length;
    const partTime = dipendentiConContratti.filter(d => d.employee_group === 'PT').length;
    const senzaContratto = dipendentiSenzaContratto.length;
    
    return { totale, inScadenza30, scaduti, fullTime, partTime, senzaContratto };
  }, [dipendentiConContratti, dipendentiSenzaContratto]);

  return (
    <ProtectedPage pageName="OverviewContratti" requiredUserTypes={['admin', 'manager']}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">Overview Contratti</h1>
          </div>
          <p className="text-slate-500">Panoramica completa dei contratti attivi</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <NeumorphicCard className="p-4 text-center">
            <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{stats.totale}</p>
            <p className="text-xs text-slate-500">Totale Contratti</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-700">{stats.inScadenza30}</p>
            <p className="text-xs text-slate-500">In Scadenza 30gg</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700">{stats.scaduti}</p>
            <p className="text-xs text-slate-500">Scaduti</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-4 text-center">
            <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700">{stats.fullTime}</p>
            <p className="text-xs text-slate-500">Full Time</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-4 text-center">
            <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-700">{stats.partTime}</p>
            <p className="text-xs text-slate-500">Part Time</p>
          </NeumorphicCard>

          <NeumorphicCard className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-700">{stats.senzaContratto}</p>
            <p className="text-xs text-slate-500">Senza Contratto</p>
          </NeumorphicCard>
        </div>

        {/* Dipendenti Senza Contratto */}
        {dipendentiSenzaContratto.length > 0 && (
          <NeumorphicCard className="p-6 bg-yellow-50 border-2 border-yellow-300">
            <h2 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Dipendenti Attivi Senza Contratto ({dipendentiSenzaContratto.length})
            </h2>
            <div className="space-y-2">
              {dipendentiSenzaContratto.map(dip => (
                <div key={dip.id} className="bg-white p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{dip.nome_cognome || dip.full_name}</p>
                    <p className="text-sm text-slate-500">{dip.email}</p>
                  </div>
                  {dip.ruoli_dipendente && dip.ruoli_dipendente.length > 0 && (
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded">
                      {dip.ruoli_dipendente.join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </NeumorphicCard>
        )}

        {/* Contratti Table */}
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Contratti Attivi
          </h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-500 mt-3">Caricamento...</p>
            </div>
          ) : dipendentiConContratti.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessun contratto firmato trovato</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-2 font-semibold text-slate-700">
                      <SortButton field="nome_cognome">Nome</SortButton>
                    </th>
                    <th className="text-left py-3 px-2 font-semibold text-slate-700">
                      <SortButton field="tipo_contratto_label">Tipo</SortButton>
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700">
                      <SortButton field="durata_contratto">Durata</SortButton>
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700">
                      <SortButton field="ore_settimanali">Ore/sett</SortButton>
                    </th>
                    <th className="text-left py-3 px-2 font-semibold text-slate-700">
                      Ruolo
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700">
                      Data Inizio
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700">
                      Data Fine
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700">
                      <SortButton field="giorni_rimanenti">Giorni a Fine</SortButton>
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700">
                      <SortButton field="tenure_mesi">Tenure</SortButton>
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700">
                      Storico
                    </th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-700">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dipendentiConContratti.map(dip => {
                    const isScaduto = dip.giorni_rimanenti !== null && dip.giorni_rimanenti < 0;
                    const isInScadenza = dip.giorni_rimanenti !== null && dip.giorni_rimanenti >= 0 && dip.giorni_rimanenti <= 30;
                    
                    return (
                      <tr 
                        key={dip.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50 ${
                          isScaduto ? 'bg-red-50' : isInScadenza ? 'bg-orange-50' : ''
                        }`}
                      >
                        <td className="py-3 px-2 font-medium text-slate-800">
                          {dip.nome_cognome}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            dip.employee_group === 'FT' ? 'bg-green-100 text-green-700' :
                            dip.employee_group === 'PT' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {dip.tipo_contratto_label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            dip.durata_contratto === 'Determinato' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {dip.durata_contratto}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-medium text-slate-700">
                          {dip.ore_settimanali || 'N/A'}
                        </td>
                        <td className="py-3 px-2 text-slate-600">
                          {dip.ruoli}
                        </td>
                        <td className="py-3 px-2 text-center text-slate-700">
                          {dip.data_inizio ? moment(dip.data_inizio).format('DD/MM/YYYY') : 'N/A'}
                        </td>
                        <td className="py-3 px-2 text-center text-slate-700">
                          {dip.data_fine ? moment(dip.data_fine).format('DD/MM/YYYY') : 'N/A'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {dip.durata_contratto === 'Indeterminato' ? (
                            <span className="text-slate-400">-</span>
                          ) : dip.giorni_rimanenti !== null ? (
                            <span className={`font-bold ${
                              isScaduto ? 'text-red-700' :
                              isInScadenza ? 'text-orange-700' :
                              dip.giorni_rimanenti <= 60 ? 'text-yellow-700' :
                              'text-green-700'
                            }`}>
                              {isScaduto ? `Scaduto da ${Math.abs(dip.giorni_rimanenti)}gg` : `${dip.giorni_rimanenti}gg`}
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                            {dip.tenure_mesi} {dip.tenure_mesi === 1 ? 'mese' : 'mesi'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => setViewingHistory(dip)}
                            className="nav-button p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Vedi storico contratti"
                          >
                            <History className="w-4 h-4 text-blue-600" />
                          </button>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => setRenewingContract(dip)}
                            className="nav-button p-2 rounded-lg hover:bg-green-50 transition-colors"
                            title="Rinnova Contratto"
                          >
                            <RefreshCw className="w-4 h-4 text-green-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>

        {/* Rinnovo Contratto Modal */}
        {renewingContract && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <RefreshCw className="w-6 h-6 text-green-600" />
                  Rinnova Contratto - {renewingContract.nome_cognome}
                </h2>
                <button
                  onClick={() => {
                    setRenewingContract(null);
                    setRenewalData({ template_id: '', data_inizio: '', durata_mesi: 12 });
                  }}
                  className="nav-button p-2 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Info Contratto Precedente */}
                <div className="neumorphic-pressed p-4 rounded-xl bg-blue-50">
                  <p className="text-sm font-bold text-blue-800 mb-2">📄 Contratto Precedente</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                    <p>• Tipo: <strong>{renewingContract.tipo_contratto_label}</strong></p>
                    <p>• Ore/sett: <strong>{renewingContract.ore_settimanali}h</strong></p>
                    <p>• Inizio: <strong>{renewingContract.data_inizio ? moment(renewingContract.data_inizio).format('DD/MM/YYYY') : 'N/A'}</strong></p>
                    <p>• Fine: <strong>{renewingContract.data_fine ? moment(renewingContract.data_fine).format('DD/MM/YYYY') : 'N/A'}</strong></p>
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Template Contratto <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={renewalData.template_id}
                    onChange={(e) => setRenewalData({ ...renewalData, template_id: e.target.value })}
                    className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                  >
                    <option value="">Seleziona template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.nome_template}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Data Inizio */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Data Inizio <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={renewalData.data_inizio}
                      onChange={(e) => setRenewalData({ ...renewalData, data_inizio: e.target.value })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                    />
                  </div>

                  {/* Durata */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Durata (mesi) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      value={renewalData.durata_mesi}
                      onChange={(e) => setRenewalData({ ...renewalData, durata_mesi: parseInt(e.target.value) || 0 })}
                      className="w-full neumorphic-pressed px-4 py-3 rounded-xl text-slate-700 outline-none"
                      min="1"
                    />
                  </div>
                </div>

                {/* Data Fine Calcolata */}
                {renewalData.data_inizio && renewalData.durata_mesi > 0 && (
                  <div className="neumorphic-pressed p-4 rounded-xl bg-green-50">
                    <p className="text-sm text-green-700">
                      ✓ Data Fine Calcolata: <strong>
                        {(() => {
                          const inizio = new Date(renewalData.data_inizio);
                          const fine = new Date(inizio);
                          fine.setMonth(fine.getMonth() + renewalData.durata_mesi);
                          return moment(fine).format('DD/MM/YYYY');
                        })()}
                      </strong>
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <NeumorphicButton
                    onClick={() => {
                      setRenewingContract(null);
                      setRenewalData({ template_id: '', data_inizio: '', durata_mesi: 12 });
                    }}
                    className="flex-1"
                  >
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton
                    onClick={handleRenewContract}
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                    disabled={createContractMutation.isPending}
                  >
                    <RefreshCw className="w-5 h-5" />
                    Rinnova e Invia
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        )}

        {/* Contract History Modal */}
        {viewingHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NeumorphicCard className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{viewingHistory.nome_cognome}</h2>
                  <p className="text-sm text-slate-500">
                    Storico Contratti • Tenure: {viewingHistory.tenure_mesi} {viewingHistory.tenure_mesi === 1 ? 'mese' : 'mesi'}
                  </p>
                </div>
                <button
                  onClick={() => setViewingHistory(null)}
                  className="nav-button p-2 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {viewingHistory.tutti_contratti.map((contratto, idx) => {
                  const dataInizio = new Date(contratto.data_inizio_contratto);
                  const dataFine = new Date(dataInizio);
                  dataFine.setMonth(dataFine.getMonth() + parseInt(contratto.durata_contratto_mesi || 0));
                  const isCurrent = idx === 0;

                  return (
                    <div 
                      key={contratto.id} 
                      className={`neumorphic-pressed p-4 rounded-xl ${isCurrent ? 'border-2 border-green-400 bg-green-50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-slate-800">{contratto.template_nome}</h3>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white">
                                Attuale
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <p className="text-slate-600">
                              <span className="font-medium">Tipo:</span> {contratto.employee_group}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-medium">Ruolo:</span> {contratto.function_name}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-medium">Ore:</span> {contratto.ore_settimanali}h/sett
                            </p>
                            <p className="text-slate-600">
                              <span className="font-medium">Durata:</span> {contratto.durata_contratto_mesi} mesi
                            </p>
                            <p className="text-slate-600">
                              <span className="font-medium">Inizio:</span> {moment(dataInizio).format('DD/MM/YYYY')}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-medium">Fine:</span> {moment(dataFine).format('DD/MM/YYYY')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </NeumorphicCard>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}