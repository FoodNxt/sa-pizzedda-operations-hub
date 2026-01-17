import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Carica configurazione timbrature
    const configs = await base44.asServiceRole.entities.TimbraturaConfig.filter({ is_active: true });
    const config = configs[0] || { tolleranza_ritardo_minuti: 0, arrotonda_ritardo: true, arrotondamento_minuti: 15 };

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
      
      // Ritardo conteggiato: usa tolleranza e arrotondamento dalle impostazioni
      let ritardoConteggiato = 0;
      const tolleranza = config.tolleranza_ritardo_minuti || 0;
      
      if (ritardoReale > tolleranza) {
        const ritardoDopoPenalita = ritardoReale - tolleranza;
        
        if (config.arrotonda_ritardo) {
          const arrotondamento = config.arrotondamento_minuti || 15;
          ritardoConteggiato = Math.ceil(ritardoDopoPenalita / arrotondamento) * arrotondamento;
        } else {
          ritardoConteggiato = ritardoDopoPenalita;
        }
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
      
      // SEMPRE crea/aggiorna RitardoDipendente se c'è ritardo (indipendentemente da needsUpdate)
      if (isLate) {
        const existingRitardo = await base44.asServiceRole.entities.RitardoDipendente.filter({ turno_id: shift.id });
        
        const ritardoData = {
          turno_id: shift.id,
          dipendente_id: shift.dipendente_id,
          dipendente_nome: shift.dipendente_nome,
          store_id: shift.store_id,
          store_nome: shift.store_nome,
          data: shift.data,
          ora_inizio_prevista: shift.ora_inizio,
          ora_timbratura_entrata: shift.timbratura_entrata,
          minuti_ritardo_reale: ritardoReale,
          minuti_ritardo_conteggiato: ritardoConteggiato,
          ruolo: shift.ruolo
        };
        
        if (existingRitardo.length > 0) {
          await base44.asServiceRole.entities.RitardoDipendente.update(existingRitardo[0].id, ritardoData);
        } else {
          await base44.asServiceRole.entities.RitardoDipendente.create(ritardoData);
        }
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