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

    return Response.json({
      success: true,
      turno: updatedTurno,
      serverTimestamp
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});