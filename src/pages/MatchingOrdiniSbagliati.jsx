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
  Eye,
  ChevronDown,
  ChevronUp
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
  const [viewMode, setViewMode] = useState('matched'); // 'matched' or 'unmatched'
  const [showAllMatched, setShowAllMatched] = useState(false);
  const [showAllUnmatched, setShowAllUnmatched] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null); // NEW: for order details modal
  const [debugLog, setDebugLog] = useState([]); // NEW: Debug log

  const queryClient = useQueryClient();

  const { data: wrongOrders = [] } = useQuery({
    queryKey: ['wrong-orders-unmatched'],
    queryFn: async () => {
      const orders = await base44.entities.WrongOrder.list('-order_date');
      return orders.filter(o => o.store_matched);
    },
  });

  const { data: allMatches = [] } = useQuery({
    queryKey: ['wrong-order-matches'],
    queryFn: () => base44.entities.WrongOrderMatch.list('-match_date'),
  });

  // FIXED: Filter matches to only include current orders
  const currentOrderIds = new Set(wrongOrders.map(o => o.id));
  const matches = allMatches.filter(m => currentOrderIds.has(m.wrong_order_id));

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  // Load shifts from TurnoPlanday (Planday integration)
  const { data: shifts = [] } = useQuery({
    queryKey: ['planday-shifts-matching'],
    queryFn: async () => {
      const turni = await base44.entities.TurnoPlanday.list('-data', 3000);
      // Transform TurnoPlanday to match expected Shift structure
      return turni.map(turno => ({
        id: turno.id,
        shift_date: turno.data,
        scheduled_start: turno.data && turno.ora_inizio ? `${turno.data}T${turno.ora_inizio}:00` : null,
        scheduled_end: turno.data && turno.ora_fine ? `${turno.data}T${turno.ora_fine}:00` : null,
        employee_name: turno.dipendente_nome,
        store_id: turno.store_id,
        shift_type: turno.turno_tipo,
        employee_group_name: turno.employee_group_name,
        created_date: turno.created_date
      }));
    },
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

  // FIXED: Deduplicate shifts function
  const deduplicateShifts = (shiftsArray) => {
    const uniqueShiftsMap = new Map();

    shiftsArray.forEach(shift => {
      const normalizedDate = shift.shift_date ? new Date(shift.shift_date).toISOString().split('T')[0] : 'no-date';
      const normalizedStart = shift.scheduled_start ? new Date(shift.scheduled_start).toISOString().substring(11, 16) : 'no-start';
      const normalizedEnd = shift.scheduled_end ? new Date(shift.scheduled_end).toISOString().substring(11, 16) : 'no-end';
      
      // Normalize employee name (trim spaces)
      const normalizedEmployeeName = shift.employee_name?.trim() || 'no-name';
      
      const key = `${normalizedEmployeeName}|${shift.store_id || 'no-store'}|${normalizedDate}|${normalizedStart}|${normalizedEnd}`;

      if (!uniqueShiftsMap.has(key)) {
        uniqueShiftsMap.set(key, shift);
      } else {
        const existing = uniqueShiftsMap.get(key);
        // If a duplicate is found, keep the one with the earlier created_date (if available)
        // or just the first one encountered if no created_date or created_date is newer
        if (shift.created_date && existing.created_date &&
            new Date(shift.created_date) < new Date(existing.created_date)) {
          uniqueShiftsMap.set(key, shift);
        }
      }
    });

    return Array.from(uniqueShiftsMap.values());
  };


  const handleAutoMatch = async () => {
    setMatching(true);
    setMatchResult(null);
    const log = []; // Initialize log for this run

    try {
      const user = await base44.auth.me();
      let matchedCount = 0;
      let failedCount = 0;
      const excludedShiftTypes = ['Malattia (Certificato)', 'Assenza non retribuita', 'Ferie'];
      const excludedEmployeeGroups = ['Volantinaggio', 'Preparazioni'];

      log.push(`🚀 Inizio matching per ${wrongOrders.length} ordini`);
      log.push(`📊 Turni disponibili: ${shifts.length}`);

      for (const order of wrongOrders) {
        // Skip if already matched (i.e., this order ID has any match records)
        if (matches.some(m => m.wrong_order_id === order.id)) {
          log.push(`⏭️ Ordine ${order.order_id} già abbinato, skip`);
          continue;
        }

        log.push(`\n🔍 Elaboro ordine ${order.order_id} (${order.platform})`);
        log.push(`   📅 Data ordine: ${order.order_date}`);
        log.push(`   🏪 Store: ${order.store_name} (ID: ${order.store_id})`);

        const orderDateTime = new Date(order.order_date);
        if (isNaN(orderDateTime.getTime())) {
          log.push(`   ❌ Data ordine non valida per ${order.order_id}, skip`);
          failedCount++;
          continue;
        }

        const orderDateStr = orderDateTime.toISOString().split('T')[0];
        const orderTime = orderDateTime.getTime();
        
        log.push(`   🕐 Timestamp ordine (UTC): ${orderDateTime.toISOString()}`);
        log.push(`   🕐 Timestamp ordine (CET): ${orderDateTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);

        // Filter shifts for this store and date
        const sameDayShifts = shifts.filter(shift => {
          if (shift.store_id !== order.store_id) return false;
          if (!shift.shift_date) return false;
          
          const shiftDateStr = new Date(shift.shift_date).toISOString().split('T')[0];
          return shiftDateStr === orderDateStr;
        });

        log.push(`   📋 Turni stesso giorno e negozio: ${sameDayShifts.length}`);

        // FIXED: Deduplicate BEFORE filtering
        const uniqueShifts = deduplicateShifts(sameDayShifts);
        log.push(`   🔄 Turni dopo deduplicazione: ${uniqueShifts.length}`);


        // FIXED: Filter shifts with exclusions
        const relevantShifts = uniqueShifts.filter(shift => {
          // EXCLUDE certain shift types
          if (shift.shift_type && excludedShiftTypes.includes(shift.shift_type)) {
            log.push(`   ⛔ Escluso ${shift.employee_name?.trim()} (${shift.id}) - shift_type: ${shift.shift_type}`);
            return false;
          }
          
          // EXCLUDE certain employee groups
          if (shift.employee_group_name && excludedEmployeeGroups.includes(shift.employee_group_name)) {
            log.push(`   ⛔ Escluso ${shift.employee_name?.trim()} (${shift.id}) - employee_group: ${shift.employee_group_name}`);
            return false;
          }
          
          // Must have scheduled_start and scheduled_end for time-based matching
          if (!shift.scheduled_start || !shift.scheduled_end) {
            log.push(`   ⛔ Escluso ${shift.employee_name?.trim()} (${shift.id}) - mancano orari scheduled`);
            return false;
          }
          
          return true;
        });

        log.push(`   ✅ Turni validi dopo esclusioni: ${relevantShifts.length}`);

        if (relevantShifts.length === 0) {
          log.push(`   ❌ Nessun turno valido trovato per questo ordine ${order.order_id}`);
          failedCount++;
          continue;
        }

        const oneHour = 60 * 60 * 1000;
        const employeeMatches = new Map(); // FIXED: Use Map to track unique employees with their best confidence

        for (const shift of relevantShifts) {
          const shiftStart = new Date(shift.scheduled_start).getTime();
          const shiftEnd = new Date(shift.scheduled_end).getTime();
          
          const employeeName = shift.employee_name?.trim(); // Trim employee name

          log.push(`   👤 ${employeeName} (Shift ID: ${shift.id}):`);
          log.push(`      ⏰ Turno (UTC): ${new Date(shiftStart).toISOString()} → ${new Date(shiftEnd).toISOString()}`);
          log.push(`      ⏰ Turno (CET): ${new Date(shiftStart).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })} → ${new Date(shiftEnd).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);
          log.push(`      🕐 Ordine (UTC): ${orderDateTime.toISOString()}`);
          log.push(`      🕐 Ordine (CET): ${orderDateTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);


          let confidence = null;

          // High confidence: exact overlap
          if (orderTime >= shiftStart && orderTime <= shiftEnd) {
            confidence = 'high';
            log.push(`      ✅ HIGH confidence - ordine durante turno`);
          }
          // Medium confidence: within 1 hour
          else if (orderTime >= (shiftStart - oneHour) && orderTime <= (shiftEnd + oneHour)) {
            confidence = 'medium';
            log.push(`      ⚠️ MEDIUM confidence - ordine entro ±1 ora`);
          }
          // Low confidence: same day (already filtered by date, so if no time overlap, it's low)
          else {
            // SKIP LOW confidence matches as per the new requirement
            log.push(`      ⏭️ SKIP - ordine fuori orario (LOW confidence non permesso)`);
            continue; // Skip this shift, do not consider it for matching
          }

          // FIXED: Only keep the BEST confidence match per employee
          if (!employeeMatches.has(employeeName)) {
            employeeMatches.set(employeeName, { shift, confidence });
          } else {
            const existing = employeeMatches.get(employeeName);
            // FIXED: Adjust confidenceRank to only consider 'high' and 'medium'
            const confidenceRank = { high: 3, medium: 2 };
            // If the current confidence is better than the existing one for this employee
            if (confidenceRank[confidence] > confidenceRank[existing.confidence]) {
              log.push(`      🔄 Aggiornato match per ${employeeName} da ${existing.confidence} a ${confidence}`);
              employeeMatches.set(employeeName, { shift, confidence });
            }
          }
        }
        
        if (employeeMatches.size === 0) {
            log.push(`   ❌ Nessun dipendente con HIGH/MEDIUM confidence per ordine ${order.order_id}`); // Adjusted message
            failedCount++;
            continue; // Move to the next order
        }

        log.push(`   ✅ Trovati ${employeeMatches.size} dipendenti da abbinare per ordine ${order.order_id}`); // Adjusted message

        // Create matches for each unique employee who was found with a confidence level
        for (const [employeeName, { shift, confidence }] of employeeMatches) {
          const matchData = {
            wrong_order_id: order.id,
            order_id: order.order_id,
            platform: order.platform,
            order_date: order.order_date,
            store_id: order.store_id,
            store_name: order.store_name,
            matched_employee_name: employeeName,
            matched_shift_id: shift.id,
            match_confidence: confidence,
            match_method: 'auto',
            matched_by: user.email,
            match_date: new Date().toISOString()
          };
          await createMatchMutation.mutateAsync(matchData);
          log.push(`   💾 Creato match: ${employeeName} (${confidence}) per ordine ${order.order_id}`);
        }
        matchedCount++; // This order successfully found at least one match
      }

      log.push(`\n✅ Matching completato!`);
      log.push(`   ✅ Ordini abbinati: ${matchedCount}`);
      log.push(`   ❌ Ordini falliti: ${failedCount}`);
      setDebugLog(log);

      setMatchResult({
        success: true,
        matchedCount,
        failedCount,
        total: wrongOrders.length
      });

    } catch (error) {
      console.error('Error during matching:', error);
      log.push(`\n❌ ERRORE GENERALE: ${error.message}`);
      setDebugLog(log);
      
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

  // Get matched and unmatched orders
  const matchedOrderIds = new Set(matches.map(m => m.wrong_order_id));
  const matchedOrders = wrongOrders.filter(o => matchedOrderIds.has(o.id));
  const unmatchedOrders = wrongOrders.filter(o => !matchedOrderIds.has(o.id));

  const stats = {
    totalOrders: wrongOrders.length,
    matchedOrders: matchedOrders.length, // Count of unique orders that have at least one match
    unmatchedOrders: unmatchedOrders.length,
    totalMatches: matches.length, // Total number of match records (can be > matchedOrders if multiple employees per order)
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

  // Group matches by order
  const matchesByOrder = matches.reduce((acc, match) => {
    if (!acc[match.wrong_order_id]) {
      acc[match.wrong_order_id] = [];
    }
    acc[match.wrong_order_id].push(match);
    return acc;
  }, {});


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
          <p className="text-sm text-[#9b9b9b]">Ordini Abbinati</p>
          <p className="text-xs text-[#9b9b9b] mt-1">{stats.totalMatches} abbinamenti totali</p>
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

      {/* NEW: Debug Log */}
      {debugLog.length > 0 && (
        <NeumorphicCard className="p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#6b6b6b]">📋 Log Matching</h3>
            <button
              onClick={() => setDebugLog([])}
              className="neumorphic-flat p-2 rounded-lg text-xs text-[#9b9b9b] hover:text-red-600 transition-colors"
              title="Cancella log"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="neumorphic-pressed p-4 rounded-xl max-h-96 overflow-y-auto">
            <pre className="text-xs font-mono text-[#6b6b6b] whitespace-pre-wrap">
              {debugLog.join('\n')}
            </pre>
          </div>
        </NeumorphicCard>
      )}

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
                      {matchResult.failedCount} ordini non abbinati (controlla il log sopra per dettagli)
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

      {/* NEW: View Mode Slider */}
      <NeumorphicCard className="p-6">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setViewMode('matched')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              viewMode === 'matched'
                ? 'neumorphic-pressed text-[#8b7355]'
                : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            ✅ Abbinati ({stats.matchedOrders})
          </button>
          <button
            onClick={() => setViewMode('unmatched')}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              viewMode === 'unmatched'
                ? 'neumorphic-pressed text-[#8b7355]'
                : 'neumorphic-flat text-[#9b9b9b]'
            }`}
          >
            ⚠️ Non Abbinati ({stats.unmatchedOrders})
          </button>
        </div>
      </NeumorphicCard>

      {/* Matched Orders List */}
      {viewMode === 'matched' && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#6b6b6b]">Ordini Abbinati</h2>
            {matchedOrders.length > 10 && (
              <button
                onClick={() => setShowAllMatched(!showAllMatched)}
                className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
              >
                {showAllMatched ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Mostra meno
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Mostra tutti ({matchedOrders.length})
                  </>
                )}
              </button>
            )}
          </div>

          {matchedOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-[#9b9b9b] mx-auto mb-4 opacity-50" />
              <p className="text-[#6b6b6b] font-medium">Nessun ordine abbinato</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchedOrders.slice(0, showAllMatched ? undefined : 10).map((order) => {
                const orderMatches = matchesByOrder[order.id] || [];
                return (
                  <div 
                    key={order.id} 
                    className="neumorphic-flat p-5 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.platform === 'glovo' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-teal-100 text-teal-700'
                          }`}>
                            {order.platform}
                          </span>
                          <span className="font-mono text-sm text-[#6b6b6b]">{order.order_id}</span>
                          <span className="text-sm text-[#9b9b9b]">
                            {format(new Date(order.order_date), 'dd/MM HH:mm', { locale: it })}
                          </span>
                        </div>
                        <p className="text-sm text-[#9b9b9b]">{order.store_name}</p>
                        <p className="text-lg font-bold text-red-600 mt-2">
                          Rimborso: €{order.refund_value?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <Eye className="w-5 h-5 text-[#8b7355]" />
                    </div>

                    {/* Show all matched employees for this order */}
                    <div className="neumorphic-pressed p-3 rounded-lg">
                      <p className="text-xs text-[#9b9b9b] mb-2">
                        Abbinato a {orderMatches.length} dipendente/i:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {orderMatches.map((match) => (
                          <span key={match.id} className="text-sm font-medium text-[#6b6b6b] bg-blue-100 px-3 py-1 rounded-full">
                            {match.matched_employee_name}
                            <span className={`ml-2 text-xs ${getConfidenceBadgeColor(match.match_confidence).split(' ')[1]}`}>
                              ({match.match_confidence === 'high' ? 'Alta' :
                                match.match_confidence === 'medium' ? 'Media' :
                                match.match_confidence === 'low' ? 'Bassa' : 'Manuale'})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </NeumorphicCard>
      )}

      {/* Unmatched Orders List */}
      {viewMode === 'unmatched' && (
        <NeumorphicCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#6b6b6b]">Ordini Non Abbinati</h2>
            {unmatchedOrders.length > 10 && (
              <button
                onClick={() => setShowAllUnmatched(!showAllUnmatched)}
                className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-[#8b7355] hover:text-[#6b6b6b] transition-colors flex items-center gap-2"
              >
                {showAllUnmatched ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Mostra meno
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Mostra tutti ({unmatchedOrders.length})
                  </>
                )}
              </button>
            )}
          </div>

          {unmatchedOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-[#6b6b6b] font-medium">Tutti gli ordini sono abbinati! 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unmatchedOrders.slice(0, showAllUnmatched ? undefined : 10).map((order) => (
                <div 
                  key={order.id} 
                  className="neumorphic-flat p-5 rounded-xl border-2 border-orange-200 cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.platform === 'glovo' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-teal-100 text-teal-700'
                        }`}>
                          {order.platform}
                        </span>
                        <span className="font-mono text-sm text-[#6b6b6b]">{order.order_id}</span>
                        <span className="text-sm text-[#9b9b9b]">
                          {format(new Date(order.order_date), 'dd/MM HH:mm', { locale: it })}
                        </span>
                      </div>
                      <p className="text-sm text-[#9b9b9b]">{order.store_name}</p>
                      <p className="text-lg font-bold text-red-600 mt-2">
                        Rimborso: €{order.refund_value?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-orange-600 mt-2">⚠️ Nessun dipendente abbinato</p>
                    </div>
                    <Eye className="w-5 h-5 text-[#8b7355]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeumorphicCard>
      )}

      {/* NEW: Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NeumorphicCard className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
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
              {/* Order Info */}
              <div className="neumorphic-pressed p-4 rounded-xl">
                <h3 className="font-bold text-[#6b6b6b] mb-3">Informazioni Ordine</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[#9b9b9b]">Piattaforma</p>
                    <p className="font-medium text-[#6b6b6b]">{selectedOrder.platform}</p>
                  </div>
                  <div>
                    <p className="text-[#9b9b9b]">Order ID</p>
                    <p className="font-medium text-[#6b6b6b] font-mono">{selectedOrder.order_id}</p>
                  </div>
                  <div>
                    <p className="text-[#9b9b9b]">Data e Ora</p>
                    <p className="font-medium text-[#6b6b6b]">
                      {format(new Date(selectedOrder.order_date), 'dd MMMM yyyy HH:mm', { locale: it })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#9b9b9b]">Negozio</p>
                    <p className="font-medium text-[#6b6b6b]">{selectedOrder.store_name}</p>
                  </div>
                  <div>
                    <p className="text-[#9b9b9b]">Totale Ordine</p>
                    <p className="font-medium text-[#6b6b6b]">€{selectedOrder.order_total?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-[#9b9b9b]">Rimborso</p>
                    <p className="font-bold text-red-600">€{selectedOrder.refund_value?.toFixed(2) || '0.00'}</p>
                  </div>
                  {selectedOrder.customer_refund_status && (
                    <div className="col-span-2">
                      <p className="text-[#9b9b9b]">Stato Rimborso</p>
                      <p className="font-medium text-[#6b6b6b]">{selectedOrder.customer_refund_status}</p>
                    </div>
                  )}
                  {selectedOrder.complaint_reason && (
                    <div className="col-span-2">
                      <p className="text-[#9b9b9b]">Motivo Reclamo</p>
                      <p className="font-medium text-[#6b6b6b]">{selectedOrder.complaint_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Matched Employees */}
              {matchesByOrder[selectedOrder.id] && matchesByOrder[selectedOrder.id].length > 0 && (
                <div className="neumorphic-pressed p-4 rounded-xl">
                  <h3 className="font-bold text-[#6b6b6b] mb-3">
                    Dipendenti Abbinati ({matchesByOrder[selectedOrder.id].length})
                  </h3>
                  <div className="space-y-2">
                    {matchesByOrder[selectedOrder.id].map((match) => (
                      <div key={match.id} className="neumorphic-flat p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#6b6b6b]">{match.matched_employee_name}</p>
                            <p className="text-xs text-[#9b9b9b]">
                              Metodo: {match.match_method === 'auto' ? 'Automatico' : 'Manuale'}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getConfidenceBadgeColor(match.match_confidence)}`}>
                            {match.match_confidence === 'high' ? 'Alta' :
                             match.match_confidence === 'medium' ? 'Media' :
                             match.match_confidence === 'low' ? 'Bassa' :
                             'Manuale'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </NeumorphicCard>
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
              <li><strong>Esclusioni di confidenza:</strong> I match a "Bassa confidenza" (stesso giorno ma fuori orario) sono stati rimossi dal matching automatico.</li>
              <li><strong>Manuale:</strong> Modificato manualmente dall'utente</li>
              <li><strong>Abbinamento multiplo:</strong> Un ordine può essere abbinato a TUTTI i dipendenti in turno, se rientrano nei criteri di matching.</li>
              <li><strong>Esclusioni:</strong> Non vengono considerati turni di tipo "Malattia (Certificato)", "Assenza non retribuita", "Ferie", né dipendenti con "Volantinaggio" o "Preparazioni" come gruppo.</li>
              <li>Clicca su "Fai Match" e controlla il <strong>"Log Matching"</strong> sopra per vedere i dettagli del processo</li>
              <li>Clicca su un ordine per vederne i dettagli completi</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}