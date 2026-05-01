import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Carica configurazione timbrature
    const configs = await base44.asServiceRole.entities.TimbraturaConfig.filter({ is_active: true });
    const config = configs[0] || { tolleranza_ritardo_minuti: 0, arrotonda_ritardo: true, arrotondamento_minuti: 15 };

    const { turnoId, tipo, posizione, oraManuale, notaAdmin } = await req.json();

    if (!turnoId || !tipo) {
      return Response.json({ error: 'turnoId e tipo sono richiesti' }, { status: 400 });
    }

    // === MANUAL TIMESTAMP VALIDATION ===
    // Only admins can use oraManuale
    if (oraManuale && user.user_type !== 'admin') {
      return Response.json({ error: 'Solo gli admin possono impostare un orario manuale' }, { status: 403 });
    }

    // Validate oraManuale format if provided
    let effectiveTimestamp;
    if (oraManuale && user.user_type === 'admin') {
      const parsed = new Date(oraManuale);
      if (isNaN(parsed.getTime())) {
        return Response.json({ error: 'Formato orario manuale non valido' }, { status: 400 });
      }
      effectiveTimestamp = parsed.toISOString();
    } else {
      // Default: server time
      effectiveTimestamp = new Date().toISOString();
    }

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

    // PHASE 3: Prevent clock-in/out before contract start date (non-admin only)
    if (user.user_type !== 'admin' && user.data_inizio_contratto) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const contractStart = new Date(user.data_inizio_contratto);
      contractStart.setHours(0, 0, 0, 0);
      if (contractStart > today) {
        return Response.json({ 
          error: 'Non puoi timbrare prima della data di inizio contratto (' + user.data_inizio_contratto + ')' 
        }, { status: 403 });
      }
    }

    // === DOCUMENT COMPLIANCE CHECK (Phase 1) - Only for clock-in, only for non-admin ===
    if (tipo === 'entrata' && user.user_type !== 'admin') {
      const employeeId = turno.dipendente_id;
      
      const [pendingContratti, pendingRichiami, pendingChiusure] = await Promise.all([
        base44.asServiceRole.entities.Contratto.filter({ user_id: employeeId, status: 'inviato' }),
        base44.asServiceRole.entities.LetteraRichiamo.filter({ user_id: employeeId, tipo_lettera: 'lettera_richiamo', status: 'inviata' }),
        base44.asServiceRole.entities.LetteraRichiamo.filter({ user_id: employeeId, tipo_lettera: 'chiusura_procedura', status: 'inviata' })
      ]);

      const [richiamiVisualizzati, chiusureVisualizzate] = pendingRichiami.length === 0 && pendingChiusure.length === 0 
        ? await Promise.all([
            base44.asServiceRole.entities.LetteraRichiamo.filter({ user_id: employeeId, tipo_lettera: 'lettera_richiamo', status: 'visualizzata' }),
            base44.asServiceRole.entities.LetteraRichiamo.filter({ user_id: employeeId, tipo_lettera: 'chiusura_procedura', status: 'visualizzata' })
          ])
        : [[], []];

      const pendingTypes = [];
      if (pendingContratti.length > 0) pendingTypes.push('Contratti');
      if (pendingRichiami.length > 0 || richiamiVisualizzati.length > 0) pendingTypes.push('Lettere di Richiamo');
      if (pendingChiusure.length > 0 || chiusureVisualizzate.length > 0) pendingTypes.push('Chiusura Procedura');

      if (pendingTypes.length > 0) {
        return Response.json({
          error: 'Hai documenti obbligatori da firmare prima di timbrare: ' + pendingTypes.join(', ') + '. Vai alla sezione Documenti per firmarli.',
          pendingDocumentTypes: pendingTypes
        }, { status: 403 });
      }
    }

    // Audit: if admin is clocking on behalf of another employee, record it
    const isAdminManualAction = user.user_type === 'admin' && turno.dipendente_id !== user.id;

    const updateData = {};
    if (isAdminManualAction) {
      updateData.timbrato_da_admin = true;
      updateData.timbrato_da = user.email;
      updateData.timbrato_da_nome = user.full_name || user.nome_cognome || user.email;
    }

    // Store admin note if provided
    if (notaAdmin && user.user_type === 'admin') {
      const existingNote = turno.note || '';
      const adminNotePrefix = `[Admin ${new Date().toISOString().split('T')[0]}] `;
      updateData.note = existingNote 
        ? existingNote + '\n' + adminNotePrefix + notaAdmin 
        : adminNotePrefix + notaAdmin;
    }

    if (tipo === 'entrata') {
      // Verifica che non ci sia già una timbratura entrata
      if (turno.timbratura_entrata) {
        return Response.json({ error: 'Timbratura entrata già registrata' }, { status: 400 });
      }

      // Admin manual clock-out validation: if oraManuale for entrata, 
      // ensure it's not after an existing uscita (shouldn't happen, but safety)
      if (oraManuale && turno.timbratura_uscita) {
        const manualTime = new Date(effectiveTimestamp);
        const uscitaTime = new Date(turno.timbratura_uscita);
        if (manualTime >= uscitaTime) {
          return Response.json({ error: 'L\'orario di entrata non può essere dopo l\'uscita già registrata' }, { status: 400 });
        }
      }

      updateData.timbratura_entrata = effectiveTimestamp;
      updateData.posizione_entrata = posizione;
      updateData.stato = 'in_corso';
      
      // CALCOLA RITARDO using effectiveTimestamp (manual or server)
      const clockInTime = new Date(effectiveTimestamp);
      
      // Build scheduled start using the SHIFT DATE, not the clock-in date
      // This is important for manual timestamps on different dates
      const [oraInizioHH, oraInizioMM] = turno.ora_inizio.split(':').map(Number);
      const shiftDate = new Date(turno.data + 'T00:00:00');
      const scheduledStart = new Date(shiftDate);
      scheduledStart.setHours(oraInizioHH, oraInizioMM, 0, 0);
      
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

      // Admin manual clock-out validation: uscita must be after entrata
      if (oraManuale) {
        const manualTime = new Date(effectiveTimestamp);
        const entrataTime = new Date(turno.timbratura_entrata);
        if (manualTime <= entrataTime) {
          return Response.json({ error: 'L\'orario di uscita deve essere dopo l\'entrata (' + entrataTime.toISOString().substring(11, 16) + ')' }, { status: 400 });
        }
      }

      updateData.timbratura_uscita = effectiveTimestamp;
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
        ora_timbratura_entrata: effectiveTimestamp,
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
      serverTimestamp: effectiveTimestamp
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});