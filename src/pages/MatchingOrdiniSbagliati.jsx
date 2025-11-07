
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link as LinkIcon,
  Users,
  Package,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  X,
  Loader2
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function MatchingOrdiniSbagliati() {
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const queryClient = useQueryClient();

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders-unmatched'],
    queryFn: async () => {
      const orders = await base44.entities.WrongOrder.list('-order_date');
      return orders.filter(o => o.store_matched);
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['wrong-order-matches'],
    queryFn: () => base44.entities.WrongOrderMatch.list('-match_date'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date', 500),
  });

  const createMatchMutation = useMutation({
    mutationFn: (data) => base44.entities.WrongOrderMatch.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wrong-order-matches'] });
    },
  });

  const updateMatchMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WrongOrderMatch.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wrong-order-matches'] });
      setEditingMatch(null);
    },
  });

  const handleAutoMatch = async () => {
    setMatching(true);
    setMatchResult(null);

    try {
      const user = await base44.auth.me();
      let matchedCount = 0;
      let failedCount = 0;

      for (const order of wrongOrders) {
        // Skip if already matched
        if (matches.find(m => m.wrong_order_id === order.id)) {
          continue;
        }

        // Find shifts for this store on this date
        const orderDate = new Date(order.order_date);
        const orderDateStr = orderDate.toISOString().split('T')[0];

        const relevantShifts = shifts.filter(shift => {
          if (shift.store_id !== order.store_id) return false;
          const shiftDateStr = new Date(shift.shift_date).toISOString().split('T')[0];
          return shiftDateStr === orderDateStr;
        });

        if (relevantShifts.length === 0) {
          failedCount++;
          continue;
        }

        // Find shift that overlaps with order time
        const orderTime = orderDate.getTime();
        let bestShift = null;
        let bestConfidence = 'low';

        for (const shift of relevantShifts) {
          const shiftStart = new Date(shift.scheduled_start).getTime();
          const shiftEnd = new Date(shift.scheduled_end).getTime();

          if (orderTime >= shiftStart && orderTime <= shiftEnd) {
            bestShift = shift;
            bestConfidence = 'high';
            break;
          }

          // Check within 1 hour before/after shift
          const oneHour = 60 * 60 * 1000;
          if (orderTime >= (shiftStart - oneHour) && orderTime <= (shiftEnd + oneHour)) {
            if (!bestShift) {
              bestShift = shift;
              bestConfidence = 'medium';
            }
          }
        }

        if (!bestShift) {
          // Default to first shift of the day
          bestShift = relevantShifts[0];
          bestConfidence = 'low';
        }

        const matchData = {
          wrong_order_id: order.id,
          order_id: order.order_id,
          platform: order.platform,
          order_date: order.order_date,
          store_id: order.store_id,
          store_name: order.store_name,
          matched_employee_name: bestShift.employee_name,
          matched_shift_id: bestShift.id,
          match_confidence: bestConfidence,
          match_method: 'auto',
          matched_by: user.email,
          match_date: new Date().toISOString()
        };

        await createMatchMutation.mutateAsync(matchData);
        matchedCount++;
      }

      setMatchResult({
        success: true,
        matchedCount,
        failedCount,
        total: wrongOrders.length
      });

    } catch (error) {
      console.error('Error during matching:', error);
      setMatchResult({
        success: false,
        error: error.message
      });
    }

    setMatching(false);
  };

  const handleEditMatch = (match) => {
    setEditingMatch(match);
    setNewEmployeeName(match.matched_employee_name);
  };

  const handleSaveEdit = async () => {
    if (!newEmployeeName.trim()) {
      alert('Inserisci un nome dipendente');
      return;
    }

    try {
      const user = await base44.auth.me();
      await updateMatchMutation.mutateAsync({
        id: editingMatch.id,
        data: {
          matched_employee_name: newEmployeeName,
          match_confidence: 'manual',
          match_method: 'manual',
          matched_by: user.email,
          notes: `Modificato manualmente da ${editingMatch.matched_employee_name} a ${newEmployeeName}`
        }
      });
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Errore nel salvataggio');
    }
  };

  const stats = {
    totalOrders: wrongOrders.length,
    matchedOrders: matches.length,
    unmatchedOrders: wrongOrders.length - matches.filter(m => wrongOrders.find(o => o.id === m.wrong_order_id)).length,
    highConfidence: matches.filter(m => m.match_confidence === 'high').length,
    mediumConfidence: matches.filter(m => m.match_confidence === 'medium').length,
    lowConfidence: matches.filter(m => m.match_confidence === 'low').length,
    manualMatches: matches.filter(m => m.match_method === 'manual').length
  };

  const getConfidenceBadgeColor = (confidence) => {
    switch(confidence) {
      case 'high': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-orange-100 text-orange-700';
      case 'manual': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">🔗 Matching Ordini Sbagliati</h1>
            <p className="text-[#9b9b9b]">Abbina ordini sbagliati ai dipendenti in turno</p>
          </div>
          <NeumorphicButton
            onClick={handleAutoMatch}
            disabled={matching || wrongOrders.length === 0}
            variant="primary"
            className="flex items-center gap-2"
          >
            {matching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Matching...
              </>
            ) : (
              <>
                <LinkIcon className="w-5 h-5" />
                Fai Match
              </>
            )}
          </NeumorphicButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-[#8b7355]" />
          </div>
          <h3 className="text-3xl font-bold text-[#6b6b6b] mb-1">{stats.totalOrders}</h3>
          <p className="text-sm text-[#9b9b9b]">Ordini Totali</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600 mb-1">{stats.matchedOrders}</h3>
          <p className="text-sm text-[#9b9b9b]">Abbinati</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-3xl font-bold text-orange-600 mb-1">{stats.unmatchedOrders}</h3>
          <p className="text-sm text-[#9b9b9b]">Non Abbinati</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <div className="neumorphic-flat w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600 mb-1">{stats.manualMatches}</h3>
          <p className="text-sm text-[#9b9b9b]">Manuali</p>
        </NeumorphicCard>
      </div>

      {/* Match Result */}
      {matchResult && (
        <NeumorphicCard className={`p-6 ${matchResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            {matchResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
            )}
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${matchResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {matchResult.success ? '✅ Matching Completato!' : '❌ Errore Matching'}
              </h3>
              
              {matchResult.success ? (
                <div className="space-y-2">
                  <p className="text-green-700">
                    <strong>{matchResult.matchedCount}</strong> ordini abbinati con successo
                  </p>
                  {matchResult.failedCount > 0 && (
                    <p className="text-orange-600">
                      {matchResult.failedCount} ordini non abbinati (nessun turno trovato)
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-red-700">{matchResult.error}</p>
              )}
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Confidence Stats */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Affidabilità Match</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="neumorphic-pressed p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{stats.highConfidence}</div>
            <p className="text-sm text-[#9b9b9b]">Alta (Orario Esatto)</p>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">{stats.mediumConfidence}</div>
            <p className="text-sm text-[#9b9b9b]">Media (±1 ora)</p>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">{stats.lowConfidence}</div>
            <p className="text-sm text-[#9b9b9b]">Bassa (Stesso giorno)</p>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{stats.manualMatches}</div>
            <p className="text-sm text-[#9b9b9b]">Manuale</p>
          </div>
        </div>
      </NeumorphicCard>

      {/* Matches List */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-6">Abbinamenti Effettuati</h2>

        {matches.length === 0 ? (
          <div className="text-center py-12">
            <LinkIcon className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessun abbinamento</h3>
            <p className="text-[#9b9b9b]">Clicca "Fai Match" per iniziare l'abbinamento automatico</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#8b7355]">
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Piattaforma</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Order ID</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Negozio</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Dipendente</th>
                  <th className="text-left p-3 text-[#9b9b9b] font-medium">Affidabilità</th>
                  <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {matches.slice(0, 50).map((match) => (
                  <tr key={match.id} className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors">
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        match.platform === 'glovo' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-teal-100 text-teal-700'
                      }`}>
                        {match.platform}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-sm text-[#6b6b6b]">{match.order_id}</span>
                    </td>
                    <td className="p-3 text-sm text-[#6b6b6b]">
                      {format(new Date(match.order_date), 'dd/MM HH:mm', { locale: it })}
                    </td>
                    <td className="p-3 text-sm text-[#6b6b6b]">
                      {match.store_name}
                    </td>
                    <td className="p-3">
                      {editingMatch?.id === match.id ? (
                        <input
                          type="text"
                          value={newEmployeeName}
                          onChange={(e) => setNewEmployeeName(e.target.value)}
                          className="w-full neumorphic-pressed px-3 py-2 rounded-lg text-sm text-[#6b6b6b] outline-none"
                        />
                      ) : (
                        <span className="text-sm font-medium text-[#6b6b6b]">{match.matched_employee_name}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getConfidenceBadgeColor(match.match_confidence)}`}>
                        {match.match_confidence === 'high' ? 'Alta' :
                         match.match_confidence === 'medium' ? 'Media' :
                         match.match_confidence === 'low' ? 'Bassa' :
                         'Manuale'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {editingMatch?.id === match.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={updateMatchMutation.isPending}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-green-50 transition-colors"
                          >
                            <Save className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => setEditingMatch(null)}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditMatch(match)}
                          className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeumorphicCard>

      {/* Info */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">💡 Come funziona il matching</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>Alta confidenza:</strong> Ordine ricevuto durante l'orario esatto del turno</li>
              <li><strong>Media confidenza:</strong> Ordine ricevuto entro 1 ora dall'inizio/fine turno</li>
              <li><strong>Bassa confidenza:</strong> Primo turno del giorno (nessuna sovrapposizione oraria)</li>
              <li><strong>Manuale:</strong> Modificato manualmente dall'utente</li>
              <li>Puoi modificare qualsiasi abbinamento cliccando sul pulsante "Modifica"</li>
              <li>Gli abbinamenti vengono usati per analizzare responsabilità e performance</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
