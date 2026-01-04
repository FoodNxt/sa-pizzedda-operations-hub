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
      
      const isLate = delayMinutes > 0;
      const minutesLate = isLate ? delayMinutes : 0;
      
      // Check if values need update
      const needsUpdate = shift.in_ritardo !== isLate || shift.minuti_ritardo !== minutesLate;
      
      if (needsUpdate) {
        await base44.asServiceRole.entities.TurnoPlanday.update(shift.id, {
          in_ritardo: isLate,
          minuti_ritardo: minutesLate
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