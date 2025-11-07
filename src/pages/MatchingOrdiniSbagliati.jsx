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
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function MatchingOrdiniSbagliati() {
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState('matched'); // 'matched' or 'unmatched'
  const [expandedList, setExpandedList] = useState(false);

  const queryClient = useQueryClient();

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders-all'],
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
    queryFn: () => base44.entities.Shift.list('-shift_date', 1000),
  });

  const createMatchMutation = useMutation({
    mutationFn: (data) => base44.entities.WrongOrderMatch.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wrong-order-matches'] });
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

        // Find ALL shifts that overlap with order time
        const orderTime = orderDate.getTime();
        const oneHour = 60 * 60 * 1000;
        const matchedShifts = [];
        let bestConfidence = 'low';

        for (const shift of relevantShifts) {
          const shiftStart = new Date(shift.scheduled_start).getTime();
          const shiftEnd = new Date(shift.scheduled_end).getTime();

          // Exact overlap
          if (orderTime >= shiftStart && orderTime <= shiftEnd) {
            matchedShifts.push({
              employee_name: shift.employee_name,
              shift_id: shift.id
            });
            if (bestConfidence !== 'high') bestConfidence = 'high';
          }
          // Within 1 hour
          else if (orderTime >= (shiftStart - oneHour) && orderTime <= (shiftEnd + oneHour)) {
            matchedShifts.push({
              employee_name: shift.employee_name,
              shift_id: shift.id
            });
            if (bestConfidence === 'low') bestConfidence = 'medium';
          }
        }

        // If no overlaps found, use all shifts of the day
        if (matchedShifts.length === 0) {
          relevantShifts.forEach(shift => {
            matchedShifts.push({
              employee_name: shift.employee_name,
              shift_id: shift.id
            });
          });
          bestConfidence = 'low';
        }

        const matchData = {
          wrong_order_id: order.id,
          order_id: order.order_id,
          platform: order.platform,
          order_date: order.order_date,
          store_id: order.store_id,
          store_name: order.store_name,
          matched_employees: matchedShifts,
          match_confidence: bestConfidence,
          match_method: 'auto',
          matched_by: user.email,
          match_date: new Date().toISOString(),
          order_total: order.order_total,
          refund_value: order.refund_value
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

  const matchedOrderIds = new Set(matches.map(m => m.wrong_order_id));
  const matchedOrders = wrongOrders.filter(o => matchedOrderIds.has(o.id));
  const unmatchedOrders = wrongOrders.filter(o => !matchedOrderIds.has(o.id));

  const displayedOrders = viewMode === 'matched' 
    ? (expandedList ? matchedOrders : matchedOrders.slice(0, 50))
    : (expandedList ? unmatchedOrders : unmatchedOrders.slice(0, 50));

  const stats = {
    totalOrders: wrongOrders.length,
    matchedOrders: matchedOrders.length,
    unmatchedOrders: unmatchedOrders.length,
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
            disabled={matching || unmatchedOrders.length === 0}
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

      {/* View Mode Slider */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#6b6b6b]">Visualizza Ordini</h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewMode('matched');
                setExpandedList(false);
              }}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                viewMode === 'matched'
                  ? 'neumorphic-pressed text-[#8b7355]'
                  : 'neumorphic-flat text-[#9b9b9b]'
              }`}
            >
              ✅ Abbinati ({stats.matchedOrders})
            </button>
            <button
              onClick={() => {
                setViewMode('unmatched');
                setExpandedList(false);
              }}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                viewMode === 'unmatched'
                  ? 'neumorphic-pressed text-[#8b7355]'
                  : 'neumorphic-flat text-[#9b9b9b]'
              }`}
            >
              ⚠️ Non Abbinati ({stats.unmatchedOrders})
            </button>
          </div>
        </div>

        {displayedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">
              {viewMode === 'matched' ? 'Nessun ordine abbinato' : 'Nessun ordine da abbinare'}
            </h3>
            <p className="text-[#9b9b9b]">
              {viewMode === 'matched' 
                ? 'Clicca "Fai Match" per iniziare'
                : 'Tutti gli ordini sono stati abbinati!'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#8b7355]">
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Piattaforma</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Order ID</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Data</th>
                    <th className="text-left p-3 text-[#9b9b9b] font-medium">Negozio</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Totale</th>
                    <th className="text-right p-3 text-[#9b9b9b] font-medium">Rimborso</th>
                    {viewMode === 'matched' && (
                      <>
                        <th className="text-left p-3 text-[#9b9b9b] font-medium">Dipendenti</th>
                        <th className="text-left p-3 text-[#9b9b9b] font-medium">Affidabilità</th>
                      </>
                    )}
                    <th className="text-center p-3 text-[#9b9b9b] font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.map((order) => {
                    const match = matches.find(m => m.wrong_order_id === order.id);
                    
                    return (
                      <tr 
                        key={order.id} 
                        className="border-b border-[#d1d1d1] hover:bg-[#e8ecf3] transition-colors cursor-pointer"
                        onClick={() => viewMode === 'matched' && setSelectedOrder(order)}
                      >
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.platform === 'glovo' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-teal-100 text-teal-700'
                          }`}>
                            {order.platform}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-sm text-[#6b6b6b]">{order.order_id}</span>
                        </td>
                        <td className="p-3 text-sm text-[#6b6b6b]">
                          {format(new Date(order.order_date), 'dd/MM HH:mm', { locale: it })}
                        </td>
                        <td className="p-3 text-sm text-[#6b6b6b]">
                          {order.store_name}
                        </td>
                        <td className="p-3 text-right font-medium text-[#6b6b6b]">
                          €{order.order_total?.toFixed(2) || '0.00'}
                        </td>
                        <td className="p-3 text-right font-bold text-red-600">
                          €{order.refund_value?.toFixed(2) || '0.00'}
                        </td>
                        {viewMode === 'matched' && match && (
                          <>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {match.matched_employees?.map((emp, idx) => (
                                  <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    {emp.employee_name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getConfidenceBadgeColor(match.match_confidence)}`}>
                                {match.match_confidence === 'high' ? 'Alta' :
                                 match.match_confidence === 'medium' ? 'Media' :
                                 match.match_confidence === 'low' ? 'Bassa' :
                                 'Manuale'}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="neumorphic-flat p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expand button */}
            {(viewMode === 'matched' ? matchedOrders.length : unmatchedOrders.length) > 50 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setExpandedList(!expandedList)}
                  className="neumorphic-flat px-6 py-3 rounded-xl text-[#8b7355] hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
                >
                  {expandedList ? (
                    <>
                      <ChevronUp className="w-5 h-5" />
                      Mostra meno
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-5 h-5" />
                      Mostra tutti ({viewMode === 'matched' ? matchedOrders.length : unmatchedOrders.length})
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </NeumorphicCard>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">Dettagli Ordine</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="neumorphic-flat p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9b9b9b]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-[#9b9b9b] mb-1">Piattaforma</p>
                    <p className="text-lg font-bold text-[#6b6b6b]">{selectedOrder.platform}</p>
                  </div>
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-[#9b9b9b] mb-1">Order ID</p>
                    <p className="text-lg font-mono text-[#6b6b6b]">{selectedOrder.order_id}</p>
                  </div>
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-[#9b9b9b] mb-1">Data e Ora</p>
                    <p className="text-lg font-bold text-[#6b6b6b]">
                      {format(new Date(selectedOrder.order_date), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </p>
                  </div>
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-[#9b9b9b] mb-1">Negozio</p>
                    <p className="text-lg font-bold text-[#6b6b6b]">{selectedOrder.store_name}</p>
                  </div>
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-[#9b9b9b] mb-1">Totale Ordine</p>
                    <p className="text-xl font-bold text-green-600">€{selectedOrder.order_total?.toFixed(2)}</p>
                  </div>
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-[#9b9b9b] mb-1">Valore Rimborso</p>
                    <p className="text-xl font-bold text-red-600">€{selectedOrder.refund_value?.toFixed(2)}</p>
                  </div>
                </div>

                {/* Matched Employees */}
                {(() => {
                  const match = matches.find(m => m.wrong_order_id === selectedOrder.id);
                  if (match) {
                    return (
                      <div className="neumorphic-flat p-5 rounded-xl">
                        <h3 className="font-bold text-[#6b6b6b] mb-4">Dipendenti Abbinati</h3>
                        <div className="space-y-2">
                          {match.matched_employees?.map((emp, idx) => (
                            <div key={idx} className="neumorphic-pressed p-3 rounded-lg flex items-center justify-between">
                              <span className="font-medium text-[#6b6b6b]">{emp.employee_name}</span>
                              <span className="text-xs text-[#9b9b9b]">Turno: {emp.shift_id}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-[#c1c1c1]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#9b9b9b]">Affidabilità Match:</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getConfidenceBadgeColor(match.match_confidence)}`}>
                              {match.match_confidence === 'high' ? 'Alta' :
                               match.match_confidence === 'medium' ? 'Media' :
                               match.match_confidence === 'low' ? 'Bassa' :
                               'Manuale'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Additional Info */}
                {selectedOrder.complaint_reason && (
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-[#9b9b9b] mb-2">Motivo Reclamo</p>
                    <p className="text-[#6b6b6b]">{selectedOrder.complaint_reason}</p>
                  </div>
                )}

                {selectedOrder.cancellation_reason && (
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-[#9b9b9b] mb-2">Motivo Cancellazione</p>
                    <p className="text-[#6b6b6b]">{selectedOrder.cancellation_reason}</p>
                  </div>
                )}

                {selectedOrder.customer_refund_status && (
                  <div className="neumorphic-pressed p-4 rounded-xl">
                    <p className="text-sm text-[#9b9b9b] mb-2">Stato Rimborso</p>
                    <p className="text-[#6b6b6b]">{selectedOrder.customer_refund_status}</p>
                  </div>
                )}
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}

      {/* Info */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">💡 Come funziona il matching</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>Alta confidenza:</strong> Ordine ricevuto durante l'orario esatto del turno</li>
              <li><strong>Media confidenza:</strong> Ordine ricevuto entro 1 ora dall'inizio/fine turno</li>
              <li><strong>Bassa confidenza:</strong> Tutti i dipendenti in turno quel giorno</li>
              <li><strong>Multi-match:</strong> Un ordine viene assegnato a TUTTI i dipendenti in turno</li>
              <li>Usa lo slider per visualizzare ordini abbinati o non abbinati</li>
              <li>Clicca su un ordine per vedere tutti i dettagli</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}