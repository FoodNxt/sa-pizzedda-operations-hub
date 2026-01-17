import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Get all shifts with timbratura_entrata
    const allShifts = await base44.asServiceRole.entities.TurnoPlanday.list();
    
    let updated = 0;
    let alreadyCalculated = 0;
    
    for (const shift of allShifts) {
      // Skip if no clock-in or already calculated
      if (!shift.timbratura_entrata) continue;
      
      // Parse times
      const clockInTime = new Date(shift.timbratura_entrata);
      const [oraInizioHH, oraInizioMM] = shift.ora_inizio.split(':').map(Number);
      
      // Create scheduled start time on the same date as clock-in
      const scheduledStart = new Date(clockInTime);
      scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
      
      // Calculate delay in minutes
      const delayMs = clockInTime - scheduledStart;
      const delayMinutes = Math.floor(delayMs / 60000);
      
      // Ritardo reale
      const ritardoReale = delayMinutes > 0 ? delayMinutes : 0;
      
      // Ritardo conteggiato (policy: 1-5min = 0, 6-15min = 15, 16+ = reale)
      let ritardoConteggiato = 0;
      if (ritardoReale >= 1 && ritardoReale <= 5) {
        ritardoConteggiato = 0;
      } else if (ritardoReale >= 6 && ritardoReale <= 15) {
        ritardoConteggiato = 15;
      } else if (ritardoReale > 15) {
        ritardoConteggiato = ritardoReale;
      }
      
      const isLate = ritardoReale > 0;
      
      // Check if values need update
      const needsUpdate = 
        shift.in_ritardo !== isLate || 
        shift.minuti_ritardo_reale !== ritardoReale ||
        shift.minuti_ritardo_conteggiato !== ritardoConteggiato;
      
      if (needsUpdate) {
        await base44.asServiceRole.entities.TurnoPlanday.update(shift.id, {
          in_ritardo: isLate,
          minuti_ritardo: ritardoReale, // backward compatibility
          minuti_ritardo_reale: ritardoReale,
          minuti_ritardo_conteggiato: ritardoConteggiato
        });
        updated++;
      } else {
        alreadyCalculated++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Calcolo ritardi completato. Aggiornati: ${updated}, Già calcolati: ${alreadyCalculated}`,
      updated,
      alreadyCalculated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});