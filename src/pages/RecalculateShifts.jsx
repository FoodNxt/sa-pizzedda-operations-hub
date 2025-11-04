
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle, AlertCircle, Clock, Info } from 'lucide-react';
import NeumorphicCard from "../components/neumorphic/NeumorphicCard";
import NeumorphicButton from "../components/neumorphic/NeumorphicButton";

export default function RecalculateShifts() {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ shiftId, data }) => base44.entities.Shift.update(shiftId, data),
  });

  const calculateDelay = (scheduledStart, actualStart) => {
    if (!actualStart || !scheduledStart) {
      return { ritardo: false, minuti_di_ritardo: 0 };
    }

    try {
      const actualStartDate = new Date(actualStart);
      const scheduledStartDate = new Date(scheduledStart);
      
      if (isNaN(actualStartDate.getTime()) || isNaN(scheduledStartDate.getTime())) {
        return { ritardo: false, minuti_di_ritardo: 0 };
      }

      const differenzaMs = actualStartDate.getTime() - scheduledStartDate.getTime();
      const minutiEffettivi = Math.round(differenzaMs / (1000 * 60));
      
      if (minutiEffettivi > 0) {
        // Arrotonda a scaglioni di 15 minuti in eccesso
        const minuti_di_ritardo = Math.ceil(minutiEffettivi / 15) * 15;
        return { ritardo: true, minuti_di_ritardo };
      }
      
      return { ritardo: false, minuti_di_ritardo: 0 };
    } catch (e) {
      console.error('Errore calcolo ritardo:', e);
      return { ritardo: false, minuti_di_ritardo: 0 };
    }
  };

  const calculateTimbraturaMancata = (actualStart, shiftType) => {
    const excludedTypes = [
      'Malattia (Certificato)',
      'Assenza non retribuita',
      'Ferie'
    ];
    
    return !actualStart && !excludedTypes.includes(shiftType || '');
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setProgress({ current: 0, total: shifts.length });
    setResults(null);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < shifts.length; i++) {
      const shift = shifts[i];
      setProgress({ current: i + 1, total: shifts.length });

      try {
        const { ritardo, minuti_di_ritardo } = calculateDelay(
          shift.scheduled_start,
          shift.actual_start
        );

        const timbratura_mancata = calculateTimbraturaMancata(
          shift.actual_start,
          shift.shift_type
        );

        // Aggiorna se qualsiasi valore è cambiato
        if (shift.ritardo !== ritardo || 
            shift.minuti_di_ritardo !== minuti_di_ritardo ||
            shift.timbratura_mancata !== timbratura_mancata) {
          await updateShiftMutation.mutateAsync({
            shiftId: shift.id,
            data: {
              ritardo,
              minuti_di_ritardo,
              timbratura_mancata
            }
          });
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Errore aggiornamento turno ${shift.id}:`, error);
        errors++;
      }

      // Piccola pausa per non sovraccaricare
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setResults({ updated, skipped, errors, total: shifts.length });
    setIsRecalculating(false);
    
    // Ricarica i turni
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
  };

  const shiftsWithDelay = shifts.filter(s => s.actual_start && s.scheduled_start);
  const shiftsNeedingUpdate = shifts.filter(s => { // Changed from shiftsWithDelay to shifts to include cases for timbratura_mancata calculation
    const calculatedDelay = calculateDelay(s.scheduled_start, s.actual_start);
    const calculatedTimbratura = calculateTimbraturaMancata(s.actual_start, s.shift_type);
    return s.ritardo !== calculatedDelay.ritardo || 
           s.minuti_di_ritardo !== calculatedDelay.minuti_di_ritardo ||
           s.timbratura_mancata !== calculatedTimbratura;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#6b6b6b] mb-2">Ricalcola Ritardi Turni</h1>
        <p className="text-[#9b9b9b]">Aggiorna i campi ritardo, minuti_di_ritardo e timbratura_mancata per tutti i turni esistenti</p>
      </div>

      {/* Info Card */}
      <NeumorphicCard className="p-6 bg-blue-50 border-2 border-blue-300">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 mt-1" />
          <div className="text-sm text-blue-800">
            <p className="font-bold mb-2">Come funziona:</p>
            <ul className="space-y-1 ml-4">
              <li>• Ricalcola ritardi e timbrature mancate per <strong>tutti i turni esistenti</strong></li>
              <li>• Vengono aggiornati solo i turni con valori diversi da quelli correnti</li>
              <li>• <strong>Ritardo:</strong> se actual_start &gt; scheduled_start</li>
              <li>• <strong>Timbratura Mancata:</strong> se actual_start è null e shift_type NON è Ferie/Malattia/Assenza</li>
              <li>• I minuti di ritardo vengono arrotondati a scaglioni di 15</li>
              <li>• L'operazione può richiedere alcuni minuti se hai molti turni</li>
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
          <p className="text-sm text-[#9b9b9b] mb-2">Con Timbri</p>
          <p className="text-3xl font-bold text-blue-600">{shiftsWithDelay.length}</p>
        </NeumorphicCard>

        <NeumorphicCard className="p-6 text-center">
          <p className="text-sm text-[#9b9b9b] mb-2">Da Aggiornare</p>
          <p className="text-3xl font-bold text-yellow-600">{shiftsNeedingUpdate.length}</p>
        </NeumorphicCard>
      </div>

      {/* Recalculate Button */}
      <NeumorphicCard className="p-6">
        <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">Avvia Ricalcolo</h2>
        
        {!isRecalculating && !results && (
          <div className="text-center">
            <p className="text-[#6b6b6b] mb-6">
              {shiftsNeedingUpdate.length > 0 ? (
                <>
                  Ci sono <strong>{shiftsNeedingUpdate.length} turni</strong> da aggiornare.
                  <br />
                  Clicca il pulsante per avviare il ricalcolo automatico.
                </>
              ) : (
                <>
                  ✅ Tutti i turni sono già aggiornati con la logica corretta!
                  <br />
                  Puoi comunque rieseguire il ricalcolo se necessario.
                </>
              )}
            </p>
            <NeumorphicButton
              onClick={handleRecalculate}
              disabled={shifts.length === 0}
              variant="primary"
              className="mx-auto flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Ricalcola Tutti i Turni ({shifts.length})
            </NeumorphicButton>
          </div>
        )}

        {/* Progress */}
        {isRecalculating && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 text-[#8b7355] animate-spin" />
              <p className="text-lg font-medium text-[#6b6b6b]">
                Ricalcolo in corso... {progress.current} / {progress.total}
              </p>
            </div>
            
            <div className="neumorphic-pressed rounded-full h-4 overflow-hidden">
              <div 
                className="bg-[#8b7355] h-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            
            <p className="text-center text-sm text-[#9b9b9b]">
              Attendere, non chiudere questa pagina...
            </p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h3 className="text-xl font-bold text-[#6b6b6b]">Ricalcolo Completato!</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Totali</p>
                <p className="text-2xl font-bold text-[#6b6b6b]">{results.total}</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Aggiornati</p>
                <p className="text-2xl font-bold text-green-600">{results.updated}</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Saltati</p>
                <p className="text-2xl font-bold text-blue-600">{results.skipped}</p>
              </div>

              <div className="neumorphic-pressed p-4 rounded-xl text-center">
                <p className="text-sm text-[#9b9b9b] mb-1">Errori</p>
                <p className="text-2xl font-bold text-red-600">{results.errors}</p>
              </div>
            </div>

            {results.errors > 0 && (
              <div className="neumorphic-flat p-4 rounded-xl bg-red-50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-bold mb-1">Attenzione:</p>
                    <p>Alcuni turni non sono stati aggiornati a causa di errori. Controlla i log o riprova.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 mt-6">
              <NeumorphicButton onClick={() => setResults(null)}>
                Chiudi
              </NeumorphicButton>
              <NeumorphicButton 
                onClick={handleRecalculate}
                variant="primary"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Ricalcola Nuovamente
              </NeumorphicButton>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Preview of Changes */}
      {shiftsNeedingUpdate.length > 0 && !isRecalculating && !results && (
        <NeumorphicCard className="p-6">
          <h2 className="text-xl font-bold text-[#6b6b6b] mb-4">
            Anteprima Modifiche ({Math.min(10, shiftsNeedingUpdate.length)} di {shiftsNeedingUpdate.length})
          </h2>
          <div className="space-y-3">
            {shiftsNeedingUpdate.slice(0, 10).map(shift => {
              const calculatedDelay = calculateDelay(shift.scheduled_start, shift.actual_start);
              const calculatedTimbratura = calculateTimbraturaMancata(shift.actual_start, shift.shift_type);
              return (
                <div key={shift.id} className="neumorphic-flat p-4 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#6b6b6b] mb-1">
                        {shift.employee_name} - {shift.store_name}
                      </p>
                      <p className="text-xs text-[#9b9b9b]">
                        {new Date(shift.shift_date).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="neumorphic-pressed p-2 rounded">
                        <p className="text-[#9b9b9b] mb-1">Attuale:</p>
                        <p className="font-bold text-red-600">
                          {shift.ritardo ? '✓ Ritardo' : '✗ Nessun Ritardo'}
                          {shift.minuti_di_ritardo > 0 && ` (${shift.minuti_di_ritardo} min)`}
                        </p>
                        <p className="font-bold text-red-600 mt-1">
                          {shift.timbratura_mancata ? '✓ Timb. Mancata' : '✗ Timb. Presente'}
                        </p>
                      </div>
                      <div className="neumorphic-pressed p-2 rounded bg-green-50">
                        <p className="text-[#9b9b9b] mb-1">Nuovo:</p>
                        <p className="font-bold text-green-600">
                          {calculatedDelay.ritardo ? '✓ Ritardo' : '✗ Nessun Ritardo'}
                          {calculatedDelay.minuti_di_ritardo > 0 && ` (${calculatedDelay.minuti_di_ritardo} min)`}
                        </p>
                        <p className="font-bold text-green-600 mt-1">
                          {calculatedTimbratura ? '✓ Timb. Mancata' : '✗ Timb. Presente'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {shiftsNeedingUpdate.length > 10 && (
            <p className="text-center text-sm text-[#9b9b9b] mt-4">
              ... e altri {shiftsNeedingUpdate.length - 10} turni
            </p>
          )}
        </NeumorphicCard>
      )}
    </div>
  );
}
