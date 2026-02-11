import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Recupera tutti i turni
    const allTurni = await base44.asServiceRole.entities.TurnoPlanday.list();
    
    // Raggruppa per chiave di unicità: store_id + data + ora_inizio + ora_fine + dipendente_id
    const grouped = {};
    allTurni.forEach((turno) => {
      const key = `${turno.store_id}|${turno.data}|${turno.ora_inizio}|${turno.ora_fine}|${turno.dipendente_id || ''}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(turno);
    });

    const turniDaEliminare = [];
    
    // Identifica duplicati
    for (const [key, turni] of Object.entries(grouped)) {
      if (turni.length > 1) {
        // Ordina per created_date, mantieni il più vecchio
        const sorted = turni.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        // Elimina i duplicati (tutti tranne il primo)
        turniDaEliminare.push(...sorted.slice(1));
      }
    }

    // Elimina i turni duplicati
    for (const turno of turniDaEliminare) {
      await base44.asServiceRole.entities.TurnoPlanday.delete(turno.id);
    }

    return Response.json({
      success: true,
      duplicatesFound: turniDaEliminare.length,
      deleted: turniDaEliminare.map(t => ({
        id: t.id,
        dipendente: t.dipendente_nome,
        data: t.data,
        orario: `${t.ora_inizio}-${t.ora_fine}`
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});