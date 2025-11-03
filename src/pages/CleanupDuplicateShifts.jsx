import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2, CheckCircle, RefreshCw, Info } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";
import { format } from 'date-fns';

export default function CleanupDuplicateShifts() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [deleteResults, setDeleteResults] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (shiftId) => base44.entities.Shift.delete(shiftId),
  });

  // Find duplicates - un turno è duplicato se ha:
  // - stesso employee_name
  // - stesso store_id
  // - stessa shift_date
  // - stesso scheduled_start
  // - stesso scheduled_end
  const findDuplicates = () => {
    const shiftMap = new Map();
    const duplicates = [];

    shifts.forEach(shift => {
      // Create unique key for this shift
      const key = `${shift.employee_name}|${shift.store_id}|${shift.shift_date}|${shift.scheduled_start}|${shift.scheduled_end}`;
      
      if (!shiftMap.has(key)) {
        shiftMap.set(key, []);
      }
      
      shiftMap.get(key).push(shift);
    });

    // Find groups with more than one shift (duplicates)
    shiftMap.forEach((shiftGroup, key) => {
      if (shiftGroup.length > 1) {
        // Sort by created_date to keep the oldest
        const sorted = [...shiftGroup].sort((a, b) => 
          new Date(a.created_date) - new Date(b.created_date)
        );
        
        duplicates.push({
          key,
          shifts: sorted,
          toKeep: sorted[0], // Keep the oldest
          toDelete: sorted.slice(1), // Delete the rest
          count: sorted.length
        });
      }
    });

    return duplicates;
  };

  const duplicateGroups = findDuplicates();
  const totalDuplicatesToDelete = duplicateGroups.reduce((sum, group) => sum + group.toDelete.length, 0);

  const handleDeleteAllDuplicates = async () => {
    if (!confirm(`Sei sicuro di voler eliminare ${totalDuplicatesToDelete} turni duplicati? Questa azione non può essere annullata.`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteProgress({ current: 0, total: totalDuplicatesToDelete });
    setDeleteResults(null);

    let deleted = 0;
    let errors = 0;

    for (const group of duplicateGroups) {
      for (const shift of group.toDelete) {
        try {
          await deleteShiftMutation.mutateAsync(shift.id);
          deleted++;
          setDeleteProgress({ current: deleted + errors, total: totalDuplicatesToDelete });
        } catch (error) {
          console.error(`Errore eliminazione turno ${shift.id}:`, error);
          errors++;
          setDeleteProgress({ current: deleted + errors, total: totalDuplicatesToDelete });
        }

        // Piccola pausa per non sovraccaricare
        if ((deleted + errors) % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    setDeleteResults({ deleted, errors, total: totalDuplicatesToDelete });
    setIsDeleting(false);
    
    // Ricarica i turni
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
  };

  const handleDeleteGroup = async (group) => {
    if (!confirm(`Eliminare ${group.toDelete.length} turno/i duplicato/i per ${group.toKeep.employee_name}?`)) {
      return;
    }

    for (const shift of group.toDelete) {
      try {
        await deleteShiftMutation.mutateAsync(shift.id);
      } catch (error) {
        console.error(`Errore eliminazione turno ${shift.id}:`, error);
      }
    }

    // Ricarica i turni
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 text-[#8b7355] animate-spin mx-auto mb-4" />
          <p className="text-[#9b9b9b]">Caricamento turni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Elimina Turni Duplicati</h1>
        <p className="text-[#9b9b9b]">Trova ed elimina turni duplicati dal database</p>
      </div>

      {/* Info Card */}
      <NeumorphicCard className="p-6 bg-blue-50 border-2 border-blue-300">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 mt-1" />
          <div className="text-sm text-blue-800">
            <p className="font-bold mb-2">Come vengono identificati i duplicati:</p>
            <ul className="space-y-1 ml-4">
              <li>• Un turno è considerato duplicato se ha:</li>
              <li className="ml-4">- Stesso dipendente (employee_name)</li>
              <li className="ml-4">- Stesso locale (store_id)</li>
              <li className="ml-4">- Stessa data (shift_date)</li>
              <li className="ml-4">- Stesso orario inizio previsto (scheduled_start)</li>
              <li className="ml-4">- Stesso orario fine previsto (scheduled_end)</li>
              <li>• Viene mantenuto il turno più vecchio (prima creazione)</li>
              <li>• Vengono eliminati tutti i duplicati successivi</li>
            </ul>
          </div>
        </div>
      </NeumorphicCard>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Turni Totali</p>
          <p className="text-3xl font-bold text-[#6b6b6b]">{shifts.length}</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Gruppi con Duplicati</p>
          <p className="text-3xl font-bold text-yellow-600">{duplicateGroups.length}</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Turni da Eliminare</p>
          <p className="text-3xl font-bold text-red-600">{totalDuplicatesToDelete}</p>
        </NeumorphicCard>
      </div>

      {/* Action Button */}
      {!isDeleting && !deleteResults && duplicateGroups.length > 0 && (
        <NeumorphicCard className="p-6">
          <div className="text-center">
            <p className="text-[#6b6b6b] mb-6">
              Trovati <strong>{duplicateGroups.length} gruppi</strong> con turni duplicati.
              <br />
              Verranno eliminati <strong>{totalDuplicatesToDelete} turni duplicati</strong>.
            </p>
            <NeumorphicButton
              onClick={handleDeleteAllDuplicates}
              variant="primary"
              className="mx-auto flex items-center gap-2 bg-red-50 hover:bg-red-100"
            >
              <Trash2 className="w-5 h-5" />
              Elimina Tutti i Duplicati ({totalDuplicatesToDelete})
            </NeumorphicButton>
          </div>
        </NeumorphicCard>
      )}

      {/* Progress */}
      {isDeleting && (
        <NeumorphicCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 text-[#8b7355] animate-spin" />
              <p className="text-lg font-medium text-[#6b6b6b]">
                Eliminazione in corso... {deleteProgress.current} / {deleteProgress.total}
              </p>
            </div>
            
            <div className="neumorphic-pressed rounded-full h-4 overflow-hidden">
              <div 
                className="bg-[#8b7355] h-full transition-all duration-300"
                style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
              />
            </div>
            
            <p className="text-center text-sm text-[#9b9b9b]">
              Attendere, non chiudere questa pagina...
            </p>
          </div>
        </NeumorphicCard>
      )}

      {/* Results */}
      {deleteResults && (
        <NeumorphicCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h3 className="text-xl font-bold text-[#6b6b6b]">Pulizia Completata!</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Totali</p>
                <p className="text-2xl font-bold text-[#6b6b6b]">{deleteResults.total}</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Eliminati</p>
                <p className="text-2xl font-bold text-green-600">{deleteResults.deleted}</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Errori</p>
                <p className="text-2xl font-bold text-red-600">{deleteResults.errors}</p>
              </div>
            </div>

            {deleteResults.errors > 0 && (
              <div className="neumorphic-flat p-4 rounded-xl bg-red-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-bold mb-1">Attenzione:</p>
                    <p>Alcuni turni non sono stati eliminati. Riprova o controlla i log.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 mt-6">
              <NeumorphicButton onClick={() => setDeleteResults(null)}>
                Chiudi
              </NeumorphicButton>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {/* No Duplicates */}
      {duplicateGroups.length === 0 && !isDeleting && !deleteResults && (
        <NeumorphicCard className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#6b6b6b] mb-2">Nessun duplicato trovato! 🎉</h3>
          <p className="text-[#9b9b9b]">Il database è pulito, non ci sono turni duplicati.</p>
        </NeumorphicCard>
      )}

      {/* Duplicates List */}
      {duplicateGroups.length > 0 && !isDeleting && !deleteResults && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">
            Dettaglio Duplicati ({duplicateGroups.length} gruppi)
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {duplicateGroups.slice(0, 20).map((group, idx) => (
              <div key={idx} className="neumorphic-flat p-4 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-[#6b6b6b] mb-1">
                      {group.toKeep.employee_name} - {group.toKeep.store_name}
                    </p>
                    <p className="text-sm text-[#9b9b9b]">
                      Data: {format(new Date(group.toKeep.shift_date), 'dd/MM/yyyy')}
                      {' • '}
                      Orario: {group.toKeep.scheduled_start ? format(new Date(group.toKeep.scheduled_start), 'HH:mm') : 'N/A'} 
                      {' - '}
                      {group.toKeep.scheduled_end ? format(new Date(group.toKeep.scheduled_end), 'HH:mm') : 'N/A'}
                    </p>
                  </div>
                  <div className="neumorphic-pressed px-4 py-2 rounded-lg">
                    <span className="text-sm font-bold text-red-600">
                      {group.count} turni ({group.toDelete.length} duplicati)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Shift to Keep */}
                  <div className="neumorphic-pressed p-3 rounded-lg bg-green-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-700 font-bold mb-1">✓ DA MANTENERE (più vecchio)</p>
                        <p className="text-xs text-[#6b6b6b]">
                          ID: {group.toKeep.id}
                          {' • '}
                          Creato: {format(new Date(group.toKeep.created_date), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Shifts to Delete */}
                  {group.toDelete.map((shift, i) => (
                    <div key={shift.id} className="neumorphic-pressed p-3 rounded-lg bg-red-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-red-700 font-bold mb-1">✗ DA ELIMINARE (duplicato #{i + 1})</p>
                          <p className="text-xs text-[#6b6b6b]">
                            ID: {shift.id}
                            {' • '}
                            Creato: {format(new Date(shift.created_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleDeleteGroup(group)}
                  className="w-full mt-3 neumorphic-flat px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Elimina {group.toDelete.length} duplicato/i di questo gruppo
                </button>
              </div>
            ))}

            {duplicateGroups.length > 20 && (
              <p className="text-center text-sm text-[#9b9b9b] mt-4">
                ... e altri {duplicateGroups.length - 20} gruppi con duplicati
              </p>
            )}
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
}