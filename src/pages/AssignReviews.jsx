
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Clock, Star, MapPin, AlertCircle, CheckCircle, Users, Filter } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, isWithinInterval, parseISO } from 'date-fns';

export default function AssignReviews() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date'),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const updateReviewMutation = useMutation({
    mutationFn: ({ reviewId, data }) => base44.entities.Review.update(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  // Find matching employees for a review
  const findMatchingEmployees = (review) => {
    if (!review.review_date || !review.store_id) return [];

    const reviewDate = parseISO(review.review_date);
    
    // Track unique employees with a Map to ensure no duplicates
    const employeeMap = new Map();
    
    // Filter shifts for the same store
    shifts.forEach(shift => {
      // Same store
      if (shift.store_id !== review.store_id) return;
      
      // Skip if employee already found for this review
      if (employeeMap.has(shift.employee_name)) return;
      
      // Exclude certain shift types
      const excludedTypes = [
        'Malattia (Certificato)', 
        'Malattia (No Certificato)',
        'Ferie',
        'Assenza non retribuita'
      ];
      if (excludedTypes.includes(shift.shift_type)) return;
      
      // Exclude certain roles
      if (shift.employee_group_name === 'Preparazioni' || shift.employee_group_name === 'Volantinaggio') return;
      
      // Use ONLY scheduled times
      if (!shift.scheduled_start || !shift.scheduled_end) return;
      
      try {
        const shiftStart = parseISO(shift.scheduled_start);
        const shiftEnd = parseISO(shift.scheduled_end);
        
        // Check if review time falls within shift time
        if (isWithinInterval(reviewDate, { start: shiftStart, end: shiftEnd })) {
          // Add to map (only first occurrence per employee)
          employeeMap.set(shift.employee_name, {
            employee_name: shift.employee_name,
            shift
          });
        }
      } catch (e) {
        // Skip this shift if date parsing fails
      }
    });

    // Convert map to array
    const uniqueEmployees = Array.from(employeeMap.values());

    // Calculate confidence based on number of unique employees
    const confidence = uniqueEmployees.length === 1 ? 'high' : 
                      uniqueEmployees.length === 2 ? 'medium' : 'low';

    return uniqueEmployees.map(emp => ({
      ...emp,
      confidence
    }));
  };

  // Enriched reviews with matching employees
  const enrichedReviews = useMemo(() => {
    return reviews.map(review => {
      const matches = findMatchingEmployees(review);
      return {
        ...review,
        matchingEmployees: matches,
        hasMatches: matches.length > 0,
        isAssigned: !!review.employee_assigned_name
      };
    });
  }, [reviews, shifts]);

  // Filter reviews
  const filteredReviews = enrichedReviews.filter(review => {
    if (selectedStore !== 'all' && review.store_id !== selectedStore) return false;
    if (showOnlyUnassigned && review.isAssigned) return false;
    return true;
  });

  // Statistics
  const stats = {
    total: reviews.length,
    assigned: reviews.filter(r => r.employee_assigned_name).length,
    unassigned: reviews.filter(r => !r.employee_assigned_name).length,
    withMatches: enrichedReviews.filter(r => r.hasMatches && !r.isAssigned).length
  };

  const handleAssignReview = async (review, employeeNames) => {
    // Ensure employeeNames is an array
    if (typeof employeeNames === 'string') {
      employeeNames = [employeeNames];
    }
    
    // Remove duplicates from the array
    const uniqueNames = [...new Set(employeeNames)];
    
    const confidence = uniqueNames.length === 1 ? 'high' : 
                      uniqueNames.length === 2 ? 'medium' : 'low';
    
    await updateReviewMutation.mutateAsync({
      reviewId: review.id,
      data: {
        employee_assigned_name: uniqueNames.join(', '),
        assignment_confidence: confidence
      }
    });
  };

  const handleAutoAssignAll = async () => {
    setAutoAssigning(true);
    
    const unassignedWithMatches = enrichedReviews.filter(r => !r.isAssigned && r.hasMatches);
    
    for (const review of unassignedWithMatches) {
      // Auto-assign to ALL matching employees
      const employeeNames = review.matchingEmployees.map(m => m.employee_name);
      // Remove duplicates
      const uniqueNames = [...new Set(employeeNames)];
      const confidence = uniqueNames.length === 1 ? 'high' : 
                       uniqueNames.length === 2 ? 'medium' : 'low';
      
      await updateReviewMutation.mutateAsync({
        reviewId: review.id,
        data: {
          employee_assigned_name: uniqueNames.join(', '),
          assignment_confidence: confidence
        }
      });
    }
    
    setAutoAssigning(false);
  };

  const handleResetAllAssignments = async () => {
    if (!confirm('Sei sicuro di voler rimuovere TUTTE le assegnazioni? Questa operazione non può essere annullata.')) {
      return;
    }

    setResetting(true);

    try {
      // Get all assigned reviews
      const assignedReviews = reviews.filter(r => r.employee_assigned_name);
      
      // Reset all assignments
      for (const review of assignedReviews) {
        await updateReviewMutation.mutateAsync({
          reviewId: review.id,
          data: {
            employee_assigned_name: null,
            assignment_confidence: null
          }
        });
      }

      alert(`✅ Reset completato! ${assignedReviews.length} assegnazioni sono state rimosse. Ora puoi riassegnare con la nuova logica.`);
    } catch (error) {
      alert('Errore durante il reset: ' + error.message);
    }

    setResetting(false);
  };

  const getStoreName = (storeId) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || 'Sconosciuto';
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Assegnazione Recensioni</h1>
        <p className="text-[#9b9b9b]">Assegna automaticamente le recensioni ai dipendenti in turno</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Totale Recensioni</p>
          <p className="text-3xl font-bold text-[#6b6b6b]">{stats.total}</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Assegnate</p>
          <p className="text-3xl font-bold text-green-600">{stats.assigned}</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Da Assegnare</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.unassigned}</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Con Match Automatico</p>
          <p className="text-3xl font-bold text-blue-600">{stats.withMatches}</p>
        </NeumorphicCard>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-3">
          <NeumorphicCard className="px-4 py-2">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-transparent text-[#6b6b6b] outline-none"
            >
              <option value="all">Tutti i Locali</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </NeumorphicCard>

          <NeumorphicCard className="px-4 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyUnassigned}
                onChange={(e) => setShowOnlyUnassigned(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-[#6b6b6b]">Solo non assegnate</span>
            </label>
          </NeumorphicCard>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleResetAllAssignments}
            disabled={resetting || stats.assigned === 0}
            className="neumorphic-flat px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? '🔄 Reset...' : '🗑️ Reset Tutte Assegnazioni'}
          </button>

          <NeumorphicButton
            onClick={handleAutoAssignAll}
            disabled={autoAssigning || stats.withMatches === 0}
            variant="primary"
          >
            {autoAssigning ? 'Assegnazione...' : `Auto-Assegna Tutte (${stats.withMatches})`}
          </NeumorphicButton>
        </div>
      </div>

      {/* Warning about duplicates */}
      {stats.assigned > 0 && (
        <NeumorphicCard className="p-6 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div className="text-sm text-orange-800">
              <p className="font-bold mb-2">⚠️ Hai delle assegnazioni esistenti</p>
              <p className="mb-2">
                Se hai notato assegnazioni duplicate nei dati precedenti, ti consigliamo di:
              </p>
              <ol className="ml-4 space-y-1 list-decimal list-inside">
                <li>Cliccare su <strong>"Reset Tutte Assegnazioni"</strong> per rimuovere tutte le assegnazioni correnti</li>
                <li>Usare <strong>"Auto-Assegna Tutte"</strong> per riassegnare con la nuova logica corretta</li>
              </ol>
              <p className="mt-2 text-xs">
                💡 La nuova logica garantisce che ogni dipendente venga assegnato UNA SOLA volta per recensione, anche se ha turni sovrapposti.
              </p>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length > 0 ? (
          filteredReviews.map(review => (
            <NeumorphicCard key={review.id} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Review Info */}
                <div className="lg:col-span-2">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <span className="text-2xl font-bold text-[#6b6b6b]">{review.rating}</span>
                        <span className="text-[#9b9b9b]">•</span>
                        <span className="font-medium text-[#6b6b6b]">{review.customer_name || 'Anonimo'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#9b9b9b] mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {getStoreName(review.store_id)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(parseISO(review.review_date), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                      <div className="text-xs text-[#9b9b9b] font-mono">
                        Review ID: {review.id}
                      </div>
                    </div>

                    {review.isAssigned && (
                      <div className="neumorphic-flat px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Assegnata</span>
                        </div>
                        <p className="text-xs text-[#6b6b6b] font-medium">{review.employee_assigned_name}</p>
                        {review.assignment_confidence && (
                          <p className={`text-xs mt-1 px-2 py-1 rounded inline-block ${getConfidenceColor(review.assignment_confidence)}`}>
                            {review.assignment_confidence}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {review.comment && (
                    <div className="neumorphic-pressed p-4 rounded-lg">
                      <p className="text-sm text-[#6b6b6b]">{review.comment}</p>
                    </div>
                  )}
                </div>

                {/* Matching Employees */}
                <div>
                  <h3 className="text-sm font-bold text-[#9b9b9b] mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Dipendenti in Turno ({review.matchingEmployees.length})
                  </h3>
                  
                  {review.hasMatches ? (
                    <div className="space-y-2">
                      {review.matchingEmployees.map((match, idx) => (
                        <div key={`${review.id}-${match.employee_name}-${idx}`} className="neumorphic-flat p-3 rounded-lg">
                          <div className="mb-2">
                            <p className="font-medium text-[#6b6b6b] text-sm">{match.employee_name}</p>
                            <p className="text-xs text-[#9b9b9b]">{match.shift.employee_group_name || 'N/A'}</p>
                          </div>
                          
                          <div className="text-xs text-[#9b9b9b] space-y-1">
                            <p>
                              Turno: {format(parseISO(match.shift.scheduled_start), 'HH:mm')} - {format(parseISO(match.shift.scheduled_end), 'HH:mm')}
                            </p>
                            {match.shift.shift_type && (
                              <p>Tipo: {match.shift.shift_type}</p>
                            )}
                          </div>
                        </div>
                      ))}

                      {!review.isAssigned && (
                        <button
                          onClick={() => handleAssignReview(review, review.matchingEmployees.map(m => m.employee_name))}
                          className="w-full neumorphic-flat px-3 py-2 rounded-lg text-xs font-medium text-[#6b6b6b] hover:bg-[#8b7355] hover:text-white transition-all mt-2"
                        >
                          Assegna a {review.matchingEmployees.length === 1 ? review.matchingEmployees[0].employee_name : `tutti (${review.matchingEmployees.length})`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="neumorphic-pressed p-4 rounded-lg text-center">
                      <AlertCircle className="w-8 h-8 text-[#9b9b9b] mx-auto mb-2" />
                      <p className="text-xs text-[#9b9b9b]">Nessun dipendente in turno trovato</p>
                    </div>
                  )}
                </div>
              </div>
            </NeumorphicCard>
          ))
        ) : (
          <NeumorphicCard className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Tutte le recensioni sono state assegnate!</h3>
            <p className="text-[#9b9b9b]">Ottimo lavoro! Non ci sono recensioni da assegnare.</p>
          </NeumorphicCard>
        )}
      </div>

      {/* Info Box */}
      <NeumorphicCard className="p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="text-sm text-blue-800">
            <p className="font-bold mb-2">Come funziona l'assegnazione:</p>
            <ul className="space-y-1 ml-4 list-disc list-inside">
              <li>Ogni dipendente viene assegnato MASSIMO UNA VOLTA per recensione</li>
              <li>Le recensioni vengono assegnate a TUTTI i dipendenti in turno nell'orario della recensione</li>
              <li>Viene utilizzato l'orario pianificato (scheduled_start e scheduled_end)</li>
              <li>Vengono esclusi: "Ferie", "Malattia (Certificato)", "Malattia (No Certificato)", "Assenza non retribuita"</li>
              <li>Vengono esclusi i ruoli: "Preparazioni" e "Volantinaggio"</li>
              <li>Confidenza alta: 1 dipendente | Media: 2 dipendenti | Bassa: 3+ dipendenti</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
}
