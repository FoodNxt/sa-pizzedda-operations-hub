import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { turnoId, tipo, posizione } = await req.json();

    if (!turnoId || !tipo) {
      return Response.json({ error: 'turnoId e tipo sono richiesti' }, { status: 400 });
    }

    // Usa il timestamp del SERVER (non del client)
    const serverTimestamp = new Date().toISOString();

    // Recupera il turno esistente per validazione
    const turni = await base44.asServiceRole.entities.TurnoPlanday.filter({ id: turnoId });
    if (turni.length === 0) {
      return Response.json({ error: 'Turno non trovato' }, { status: 404 });
    }
    
    const turno = turni[0];

    // Verifica che il turno appartenga all'utente (o che l'utente sia admin)
    if (turno.dipendente_id !== user.id && user.user_type !== 'admin') {
      return Response.json({ error: 'Non puoi timbrare un turno di un altro dipendente' }, { status: 403 });
    }

    const updateData = {};
    if (tipo === 'entrata') {
      // Verifica che non ci sia già una timbratura entrata
      if (turno.timbratura_entrata) {
        return Response.json({ error: 'Timbratura entrata già registrata' }, { status: 400 });
      }
      updateData.timbratura_entrata = serverTimestamp;
      updateData.posizione_entrata = posizione;
      updateData.stato = 'in_corso';
      
      // CALCOLA RITARDO
      const clockInTime = new Date(serverTimestamp);
      const [oraInizioHH, oraInizioMM] = turno.ora_inizio.split(':').map(Number);
      const scheduledStart = new Date(clockInTime);
      scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
      const delayMs = clockInTime - scheduledStart;
      const delayMinutes = Math.floor(delayMs / 60000);
      
      // Ritardo reale
      const ritardoReale = delayMinutes > 0 ? delayMinutes : 0;
      
      // Ritardo conteggiato (policy: 1-5min = 0, 6-15min = 15, 16+ = arrotonda al quarto d'ora superiore)
      let ritardoConteggiato = 0;
      if (ritardoReale >= 1 && ritardoReale <= 5) {
        ritardoConteggiato = 0;
      } else if (ritardoReale >= 6 && ritardoReale <= 15) {
        ritardoConteggiato = 15;
      } else if (ritardoReale > 15) {
        ritardoConteggiato = Math.ceil(ritardoReale / 15) * 15;
      }
      
      updateData.in_ritardo = ritardoReale > 0;
      updateData.minuti_ritardo = ritardoReale; // backward compatibility
      updateData.minuti_ritardo_reale = ritardoReale;
      updateData.minuti_ritardo_conteggiato = ritardoConteggiato;
    } else if (tipo === 'uscita') {
      // Verifica che ci sia una timbratura entrata
      if (!turno.timbratura_entrata) {
        return Response.json({ error: 'Devi prima timbrare l\'entrata' }, { status: 400 });
      }
      // Verifica che non ci sia già una timbratura uscita
      if (turno.timbratura_uscita) {
        return Response.json({ error: 'Timbratura uscita già registrata' }, { status: 400 });
      }
      updateData.timbratura_uscita = serverTimestamp;
      updateData.posizione_uscita = posizione;
      updateData.stato = 'completato';
    } else {
      return Response.json({ error: 'tipo deve essere "entrata" o "uscita"' }, { status: 400 });
    }

    const updatedTurno = await base44.asServiceRole.entities.TurnoPlanday.update(turnoId, updateData);

    // Se è una timbratura entrata con ritardo, crea anche il record RitardoDipendente
    if (tipo === 'entrata' && updateData.in_ritardo) {
      const existingRitardo = await base44.asServiceRole.entities.RitardoDipendente.filter({ turno_id: turnoId });

      const ritardoData = {
        turno_id: turnoId,
        dipendente_id: turno.dipendente_id,
        dipendente_nome: turno.dipendente_nome,
        store_id: turno.store_id,
        store_nome: turno.store_nome,
        data: turno.data,
        ora_inizio_prevista: turno.ora_inizio,
        ora_timbratura_entrata: serverTimestamp,
        minuti_ritardo_reale: updateData.minuti_ritardo_reale,
        minuti_ritardo_conteggiato: updateData.minuti_ritardo_conteggiato,
        ruolo: turno.ruolo
      };

      if (existingRitardo.length > 0) {
        await base44.asServiceRole.entities.RitardoDipendente.update(existingRitardo[0].id, ritardoData);
      } else {
        await base44.asServiceRole.entities.RitardoDipendente.create(ritardoData);
      }
    }

    return Response.json({
      success: true,
      turno: updatedTurno,
      serverTimestamp
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});