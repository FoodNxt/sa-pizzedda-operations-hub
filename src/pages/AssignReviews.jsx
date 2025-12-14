import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Clock, Star, MapPin, AlertCircle, CheckCircle, Users, Filter, RefreshCw, Settings, X } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format, isWithinInterval, parseISO } from 'date-fns';

export default function AssignReviews() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [configForm, setConfigForm] = useState({
    tipi_turno_inclusi: ['Normale'],
    ruoli_esclusi: ['Preparazioni', 'Volantinaggio']
  });
  
  const queryClient = useQueryClient();

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-review_date'),
  });

  const { data: turniPlanday = [] } = useQuery({
    queryKey: ['turni-planday'],
    queryFn: () => base44.entities.TurnoPlanday.list('-data'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['review-assignment-config'],
    queryFn: () => base44.entities.ReviewAssignmentConfig.list(),
  });

  const activeConfig = configs.find(c => c.is_active) || {
    tipi_turno_inclusi: ['Normale'],
    ruoli_esclusi: ['Preparazioni', 'Volantinaggio']
  };

  const updateReviewMutation = useMutation({
    mutationFn: ({ reviewId, data }) => base44.entities.Review.update(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReviewAssignmentConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-assignment-config'] });
      setShowSettings(false);
    },
  });

  const createConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.ReviewAssignmentConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-assignment-config'] });
      setShowSettings(false);
    },
  });

  // Find matching employees for a review using TurnoPlanday
  const findMatchingEmployees = (review) => {
    if (!review.review_date || !review.store_id) return [];

    try {
      const reviewDate = parseISO(review.review_date);
      if (isNaN(reviewDate.getTime())) return [];
      
      const employeeMap = new Map();
      
      turniPlanday.forEach(turno => {
        if (turno.store_id !== review.store_id) return;
        
        const normalizedName = (turno.dipendente_nome || '').trim();
        const mapKey = normalizedName.toLowerCase();
        
        if (!normalizedName) return;
        if (employeeMap.has(mapKey)) return;
        
        // Check tipo_turno against config
        if (!activeConfig.tipi_turno_inclusi.includes(turno.tipo_turno || 'Normale')) return;
        
        // Exclude certain roles
        if (activeConfig.ruoli_esclusi.includes(turno.ruolo)) return;
        
        if (!turno.data || !turno.ora_inizio || !turno.ora_fine) return;
        
        try {
          const turnoDate = turno.data;
          const reviewDateStr = format(reviewDate, 'yyyy-MM-dd');
          
          if (turnoDate !== reviewDateStr) return;
          
          const [startHour, startMin] = turno.ora_inizio.split(':').map(Number);
          const [endHour, endMin] = turno.ora_fine.split(':').map(Number);
          
          const shiftStart = new Date(reviewDate);
          shiftStart.setHours(startHour, startMin, 0, 0);
          
          const shiftEnd = new Date(reviewDate);
          shiftEnd.setHours(endHour, endMin, 0, 0);
          
          if (isWithinInterval(reviewDate, { start: shiftStart, end: shiftEnd })) {
            employeeMap.set(mapKey, {
              employee_name: normalizedName,
              turno
            });
          }
        } catch (e) {
          // Skip this turno if parsing fails
        }
      });

      const uniqueEmployees = Array.from(employeeMap.values());
      const confidence = uniqueEmployees.length === 1 ? 'high' : 
                        uniqueEmployees.length === 2 ? 'medium' : 'low';

      return uniqueEmployees.map(emp => ({
        ...emp,
        confidence
      }));
    } catch (e) {
      return [];
    }
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
  }, [reviews, turniPlanday, activeConfig]);

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
    
    // ROBUST: Remove duplicates and normalize names
    const uniqueNames = [...new Set(
      employeeNames
        .map(name => (name || '').trim())
        .filter(name => name.length > 0)
    )];
    
    if (uniqueNames.length === 0) {
      alert('Errore: nessun dipendente valido da assegnare');
      return;
    }
    
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
      // Get employee names from matchingEmployees
      const employeeNames = review.matchingEmployees.map(m => m.employee_name);
      
      // ROBUST: Remove duplicates with Set and normalize
      const uniqueNames = [...new Set(
        employeeNames
          .map(name => (name || '').trim())
          .filter(name => name.length > 0)
      )];
      
      if (uniqueNames.length === 0) continue; // Skip if no valid names after normalization
      
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
    if (!confirm('Sei sicuro di voler resettare TUTTE le assegnazioni? Questa azione non può essere annullata.')) {
      return;
    }

    setResetting(true);
    
    const assignedReviews = reviews.filter(r => r.employee_assigned_name);
    
    for (const review of assignedReviews) {
      await updateReviewMutation.mutateAsync({
        reviewId: review.id,
        data: {
          employee_assigned_name: null,
          assignment_confidence: null
        }
      });
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

  const handleSaveConfig = async () => {
    const configData = {
      is_active: true,
      tipi_turno_inclusi: configForm.tipi_turno_inclusi,
      ruoli_esclusi: configForm.ruoli_esclusi
    };

    if (activeConfig.id) {
      await updateConfigMutation.mutateAsync({ id: activeConfig.id, data: configData });
    } else {
      await createConfigMutation.mutateAsync(configData);
    }
  };

  const handleUnassignReview = async (reviewId) => {
    await updateReviewMutation.mutateAsync({
      reviewId,
      data: {
        employee_assigned_name: null,
        assignment_confidence: null
      }
    });
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
          <NeumorphicButton
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Impostazioni
          </NeumorphicButton>

          <NeumorphicButton
            onClick={handleResetAllAssignments}
            disabled={resetting || stats.assigned === 0}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resettando...' : `Reset (${stats.assigned})`}
          </NeumorphicButton>

          <NeumorphicButton
            onClick={handleAutoAssignAll}
            disabled={autoAssigning || stats.withMatches === 0}
            variant="primary"
          >
            {autoAssigning ? 'Assegnazione...' : `Auto-Assegna (${stats.withMatches})`}
          </NeumorphicButton>
        </div>
      </div>

      {/* Reset Warning */}
      {stats.assigned > 0 && (
        <NeumorphicCard className="p-4 bg-yellow-50 border-2 border-yellow-400">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-700 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-bold mb-1">⚠️ Problema Rilevato</p>
              <p className="mb-2">
                Ci sono <strong>{stats.assigned} recensioni già assegnate</strong>. Se noti assegnazioni doppie o errate, usa il pulsante <strong>"Reset Assegnazioni"</strong> per rimuovere tutte le assegnazioni esistenti e poi riassegnale con la logica corretta usando <strong>"Auto-Assegna Tutte"</strong>.
              </p>
              <p className="text-xs">
                Il reset rimuoverà TUTTE le assegnazioni e potrai riassegnare le recensioni con la nuova logica che previene i duplicati.
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
                          {(() => {
                            try {
                              return format(parseISO(review.review_date), 'dd/MM/yyyy HH:mm');
                            } catch (e) {
                              return review.review_date;
                            }
                          })()}
                        </div>
                      </div>
                      <div className="text-xs text-[#9b9b9b] font-mono">
                        Review ID: {review.id}
                      </div>
                    </div>

                    {review.isAssigned && (
                      <div className="neumorphic-flat px-4 py-2 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Assegnata</span>
                          </div>
                          <button
                            onClick={() => handleUnassignReview(review.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Rimuovi
                          </button>
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
                            <p className="text-xs text-[#9b9b9b]">{match.turno.ruolo || 'N/A'}</p>
                          </div>
                          
                          <div className="text-xs text-[#9b9b9b] space-y-1">
                            <p>
                              Turno: {match.turno.ora_inizio} - {match.turno.ora_fine}
                            </p>
                            {match.turno.tipo_turno && (
                              <p>Tipo: {match.turno.tipo_turno}</p>
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
            <p className="font-bold mb-2">Come funziona l'assegnazione automatica:</p>
            <ul className="space-y-1 ml-4">
              <li>• Le recensioni vengono assegnate automaticamente in base ai turni Planday</li>
              <li>• Solo i turni con tipologie configurate nelle impostazioni vengono considerati</li>
              <li>• Tipologie incluse: {activeConfig.tipi_turno_inclusi.join(', ')}</li>
              <li>• Ruoli esclusi: {activeConfig.ruoli_esclusi.join(', ')}</li>
              <li>• Puoi modificare manualmente le assegnazioni cliccando su "Rimuovi"</li>
              <li>• Confidenza: Alta (1 dipendente) | Media (2 dipendenti) | Bassa (3+ dipendenti)</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <NeumorphicCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#6b6b6b]">Impostazioni Assegnazione</h2>
                <button onClick={() => setShowSettings(false)} className="nav-button p-2 rounded-lg">
                  <X className="w-5 h-5 text-[#6b6b6b]" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                    Tipologie di Turno da Includere
                  </label>
                  <div className="space-y-2">
                    {['Normale', 'Straordinario', 'Prova', 'Affiancamento', 'Ferie', 'Malattia'].map(tipo => (
                      <label key={tipo} className="flex items-center gap-3 p-3 neumorphic-flat rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configForm.tipi_turno_inclusi.includes(tipo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfigForm({
                                ...configForm,
                                tipi_turno_inclusi: [...configForm.tipi_turno_inclusi, tipo]
                              });
                            } else {
                              setConfigForm({
                                ...configForm,
                                tipi_turno_inclusi: configForm.tipi_turno_inclusi.filter(t => t !== tipo)
                              });
                            }
                          }}
                          className="w-5 h-5"
                        />
                        <span className="text-[#6b6b6b] font-medium">{tipo}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#6b6b6b] mb-3 block">
                    Ruoli da Escludere
                  </label>
                  <div className="space-y-2">
                    {['Pizzaiolo', 'Cassiere', 'Store Manager', 'Preparazioni', 'Volantinaggio'].map(ruolo => (
                      <label key={ruolo} className="flex items-center gap-3 p-3 neumorphic-flat rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configForm.ruoli_esclusi.includes(ruolo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfigForm({
                                ...configForm,
                                ruoli_esclusi: [...configForm.ruoli_esclusi, ruolo]
                              });
                            } else {
                              setConfigForm({
                                ...configForm,
                                ruoli_esclusi: configForm.ruoli_esclusi.filter(r => r !== ruolo)
                              });
                            }
                          }}
                          className="w-5 h-5"
                        />
                        <span className="text-[#6b6b6b] font-medium">{ruolo}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <NeumorphicButton onClick={() => setShowSettings(false)} className="flex-1">
                    Annulla
                  </NeumorphicButton>
                  <NeumorphicButton onClick={handleSaveConfig} variant="primary" className="flex-1">
                    Salva Impostazioni
                  </NeumorphicButton>
                </div>
              </div>
            </NeumorphicCard>
          </div>
        </div>
      )}
    </div>
  );
}