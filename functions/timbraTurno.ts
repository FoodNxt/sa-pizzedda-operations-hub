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

    const updateData = {};
    if (tipo === 'entrata') {
      updateData.timbratura_entrata = serverTimestamp;
      updateData.posizione_entrata = posizione;
      updateData.stato = 'in_corso';
    } else if (tipo === 'uscita') {
      updateData.timbratura_uscita = serverTimestamp;
      updateData.posizione_uscita = posizione;
      updateData.stato = 'completato';
    } else {
      return Response.json({ error: 'tipo deve essere "entrata" o "uscita"' }, { status: 400 });
    }

    const updatedTurno = await base44.entities.TurnoPlanday.update(turnoId, updateData);

    return Response.json({
      success: true,
      turno: updatedTurno,
      serverTimestamp
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});