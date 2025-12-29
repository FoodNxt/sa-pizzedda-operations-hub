import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import ProtectedPage from "../components/ProtectedPage";
import { FileText, Calendar, Clock, Briefcase, User, ArrowUpDown, AlertTriangle } from "lucide-react";
import moment from "moment";

export default function OverviewContratti() {
  const [sortField, setSortField] = useState('giorni_rimanenti');
  const [sortDirection, setSortDirection] = useState('asc');

  const { data: contratti = [], isLoading } = useQuery({
    queryKey: ['contratti-overview'],
    queryFn: () => base44.entities.Contratto.filter({ status: 'firmato' }),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-overview'],
    queryFn: () => base44.entities.User.list(),
  });

  const dipendentiConContratti = useMemo(() => {
    const oggi = new Date();
    
    // Raggruppa contratti per dipendente e prendi solo quello con scadenza più lunga
    const contrattiPerDipendente = {};
    contratti.forEach(c => {
      const userId = c.user_id;
      if (!userId) return;
      
      const dataInizio = c.data_inizio_contratto ? new Date(c.data_inizio_contratto) : null;
      const dataFine = dataInizio && c.durata_contratto_mesi 
        ? (() => {
            const fine = new Date(dataInizio);
            fine.setMonth(fine.getMonth() + parseInt(c.durata_contratto_mesi));
            return fine;
          })()
        : null;
      
      // Se il dipendente non ha ancora un contratto o questo ha scadenza più lunga
      if (!contrattiPerDipendente[userId] || 
          (dataFine && contrattiPerDipendente[userId].data_fine && dataFine > contrattiPerDipendente[userId].data_fine) ||
          (dataFine && !contrattiPerDipendente[userId].data_fine)) {
        
        const giorniRimanenti = dataFine ? Math.ceil((dataFine - oggi) / (1000 * 60 * 60 * 24)) : null;
        const tempoDeterminato = c.durata_contratto_mesi && c.durata_contratto_mesi > 0;
        
        contrattiPerDipendente[userId] = {
          ...c,
          data_inizio: dataInizio,
          data_fine: dataFine,
          giorni_rimanenti: giorniRimanenti,
          tipo_contratto_label: c.employee_group === 'FT' ? 'Full Time' : 
                               c.employee_group === 'PT' ? 'Part Time' : 
                               c.employee_group === 'CM' ? 'Contratto Misto' : 
                               c.employee_group || 'N/A',
          durata_contratto: tempoDeterminato ? 'Determinato' : 'Indeterminato',
          ruoli: (c.ruoli_dipendente || []).join(', ') || c.function_name || 'N/A'
        };
      }
    });
    
    return Object.values(contrattiPerDipendente).sort((a, b) => {
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

  const stats = useMemo(() => {
    const totale = dipendentiConContratti.length;
    const inScadenza30 = dipendentiConContratti.filter(d => d.giorni_rimanenti !== null && d.giorni_rimanenti <= 30 && d.giorni_rimanenti >= 0).length;
    const scaduti = dipendentiConContratti.filter(d => d.giorni_rimanenti !== null && d.giorni_rimanenti < 0).length;
    const fullTime = dipendentiConContratti.filter(d => d.employee_group === 'FT').length;
    const partTime = dipendentiConContratti.filter(d => d.employee_group === 'PT').length;
    
    return { totale, inScadenza30, scaduti, fullTime, partTime };
  }, [dipendentiConContratti]);

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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
        </div>

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
                          {dip.giorni_rimanenti !== null ? (
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphicCard>
      </div>
    </ProtectedPage>
  );
}