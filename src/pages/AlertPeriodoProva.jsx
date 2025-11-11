import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  TrendingDown,
  Eye,
  X
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";

export default function AlertPeriodoProva() {
  const [viewingUser, setViewingUser] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: contratti = [] } = useQuery({
    queryKey: ['contratti'],
    queryFn: () => base44.entities.Contratto.list(),
  });

  // Filter dipendenti with contracts that have started
  const dipendenteConContratto = users.filter(u => {
    if (u.user_type !== 'dipendente') return false;
    if (!u.data_inizio_contratto) return false;
    
    const dataInizio = new Date(u.data_inizio_contratto);
    const oggi = new Date();
    
    // Contract must have started
    return dataInizio <= oggi;
  });

  // Calculate shifts per employee since contract start
  const employeeAlerts = dipendenteConContratto.map(user => {
    const dataInizio = new Date(user.data_inizio_contratto);
    const nomeCompleto = user.nome_cognome || user.full_name || '';
    
    // Count shifts since contract start for this employee
    const shiftsFromContractStart = shifts.filter(shift => {
      // Match by employee name
      const employeeNameMatch = shift.employee_name === nomeCompleto;
      if (!employeeNameMatch) return false;
      
      // Check if shift is after contract start date
      const shiftDate = new Date(shift.shift_date);
      return shiftDate >= dataInizio;
    });

    const numeroTurni = shiftsFromContractStart.length;
    const giorni = Math.floor((new Date() - dataInizio) / (1000 * 60 * 60 * 24));

    // Get contract info
    const contratto = contratti.find(c => c.user_id === user.id && c.status === 'firmato');

    return {
      user,
      numeroTurni,
      giorni,
      dataInizio,
      contratto,
      shiftsFromContractStart
    };
  }).filter(item => item.numeroTurni < 10) // Only employees with less than 10 shifts
    .sort((a, b) => a.numeroTurni - b.numeroTurni); // Sort by number of shifts (ascending)

  const stats = {
    totaleDipendenti: dipendenteConContratto.length,
    totaleAlert: employeeAlerts.length,
    critici: employeeAlerts.filter(e => e.numeroTurni <= 5).length,
    attenzione: employeeAlerts.filter(e => e.numeroTurni > 5 && e.numeroTurni < 10).length
  };

  const getSeverityColor = (numeroTurni) => {
    if (numeroTurni === 0) return 'bg-red-100 text-red-700 border-red-300';
    if (numeroTurni <= 3) return 'bg-orange-100 text-orange-700 border-orange-300';
    if (numeroTurni <= 5) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-blue-100 text-blue-700 border-blue-300';
  };

  const getSeverityLabel = (numeroTurni) => {
    if (numeroTurni === 0) return 'CRITICO';
    if (numeroTurni <= 3) return 'ALTO';
    if (numeroTurni <= 5) return 'MEDIO';
    return 'BASSO';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-10 h-10 text-orange-600" />
          <h1 className="text-3xl font-bold text-[#6b6b6b]">Alert Periodo Prova</h1>
        </div>
        <p className="text-[#9b9b9b]">Dipendenti con meno di 10 turni dalla data di inizio contratto</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.totaleDipendenti}</h3>
          <p className="text-sm text-[#9b9b9b]">Dipendenti con Contratto</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-3xl font-bold text-orange-600 mb-1">{stats.totaleAlert}</h3>
          <p className="text-sm text-[#9b9b9b]">Totale Alert</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-3xl font-bold text-red-600 mb-1">{stats.critici}</h3>
          <p className="text-sm text-[#9b9b9b]">Critici (≤5 turni)</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-3xl font-bold text-yellow-600 mb-1">{stats.attenzione}</h3>
          <p className="text-sm text-[#9b9b9b]">Attenzione (6-9 turni)</p>
        </NeumorphicCard>
      </div>

      {/* Alerts List */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Dipendenti in Periodo Prova</h2>
        
        {employeeAlerts.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-green-600 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-green-700 mb-2">Nessun Alert!</h3>
            <p className="text-[#6b6b6b]">
              Tutti i dipendenti hanno completato almeno 10 turni dal loro inizio contratto.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {employeeAlerts.map((alert, idx) => (
              <div 
                key={idx} 
                className={`neumorphic-pressed p-5 rounded-xl border-2 ${getSeverityColor(alert.numeroTurni)}`}
              >
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
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(alert.numeroTurni)}`}>
                          {getSeverityLabel(alert.numeroTurni)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="neumorphic-flat p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-[#9b9b9b] mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">Turni Completati</span>
                        </div>
                        <p className="text-2xl font-bold text-[#6b6b6b]">{alert.numeroTurni}/10</p>
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
            ))}
          </div>
        )}
      </NeumorphicCard>

      {/* Detail Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6 my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">
                  Dettagli Turni - {viewingUser.user.nome_cognome || viewingUser.user.full_name}
                </h2>
                <button
                  onClick={() => setViewingUser(null)}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              {/* Summary */}
              <div className="neumorphic-flat p-5 rounded-xl mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Turni Completati</p>
                    <p className="text-3xl font-bold text-[#6b6b6b]">{viewingUser.numeroTurni}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Data Inizio Contratto</p>
                    <p className="text-lg font-bold text-[#6b6b6b]">
                      {new Date(viewingUser.dataInizio).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#9b9b9b]">Giorni Trascorsi</p>
                    <p className="text-3xl font-bold text-[#6b6b6b]">{viewingUser.giorni}</p>
                  </div>
                </div>
              </div>

              {/* Shifts List */}
              <h3 className="font-bold text-[#6b6b6b] mb-3">Turni Effettuati</h3>
              {viewingUser.shiftsFromContractStart.length === 0 ? (
                <div className="neumorphic-pressed p-8 rounded-xl text-center">
                  <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                  <p className="text-red-700 font-bold">Nessun turno completato!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {viewingUser.shiftsFromContractStart.map((shift, idx) => (
                    <div key={idx} className="neumorphic-pressed p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-[#6b6b6b]">
                            {shift.store_name || 'Locale non specificato'}
                          </p>
                          <p className="text-sm text-[#9b9b9b]">
                            {new Date(shift.shift_date).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#6b6b6b]">
                            {shift.scheduled_start ? new Date(shift.scheduled_start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '-'} 
                            {' → '}
                            {shift.scheduled_end ? new Date(shift.scheduled_end).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </p>
                          <p className="text-xs text-[#9b9b9b]">
                            {shift.scheduled_minutes ? `${Math.floor(shift.scheduled_minutes / 60)}h ${shift.scheduled_minutes % 60}m` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">ℹ️ Come funziona l'Alert Periodo Prova</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Vengono monitorati SOLO i dipendenti con contratto già iniziato</li>
              <li>Vengono contati i turni completati DALLA DATA DI INIZIO CONTRATTO</li>
              <li>L'alert scatta quando un dipendente ha fatto MENO DI 10 turni</li>
              <li><strong>CRITICO (0-3 turni):</strong> Richiede attenzione immediata</li>
              <li><strong>ALTO (4-5 turni):</strong> Situazione da monitorare attentamente</li>
              <li><strong>MEDIO (6-9 turni):</strong> In fase di integrazione</li>
              <li>Il matching dei turni avviene tramite il campo "nome_cognome" identico a Planday</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}