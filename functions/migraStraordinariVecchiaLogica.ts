import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Get all AttivitaCompletata with "Pagamento straordinari"
    const attivitaPagamenti = await base44.asServiceRole.entities.AttivitaCompletata.filter({
      attivita_nome: { $regex: 'Pagamento straordinari' }
    });

    // Get existing PagamentoStraordinario records
    const pagamentiStraordinari = await base44.asServiceRole.entities.PagamentoStraordinario.list();

    // Get all shifts
    const shifts = await base44.asServiceRole.entities.TurnoPlanday.list();

    const results = {
      total: attivitaPagamenti.length,
      migrated: 0,
      skipped: 0,
      errors: []
    };

    for (const attivita of attivitaPagamenti) {
      try {
        // Check if already migrated
        const existingPagamento = pagamentiStraordinari.find(p => p.turno_id === attivita.turno_id);
        
        if (existingPagamento) {
          // If exists but missing pagato_da, update it
          if (!existingPagamento.pagato_da && attivita.completato_da) {
            await base44.asServiceRole.entities.PagamentoStraordinario.update(existingPagamento.id, {
              pagato_da: attivita.completato_da,
              data_pagamento: attivita.completato_at
            });
            results.migrated++;
          } else {
            results.skipped++;
          }
          continue;
        }

        // Find the related shift
        const shift = shifts.find(s => s.id === attivita.turno_id);
        if (!shift) {
          results.errors.push(`Shift not found for turno_id: ${attivita.turno_id}`);
          continue;
        }

        // Create PagamentoStraordinario record
        await base44.asServiceRole.entities.PagamentoStraordinario.create({
          turno_id: attivita.turno_id,
          dipendente_id: attivita.dipendente_pagato_id || shift.dipendente_id,
          dipendente_nome: attivita.dipendente_pagato_nome || shift.dipendente_nome,
          store_id: shift.store_id,
          store_name: shift.store_nome,
          data_turno: shift.data,
          ore_straordinarie: attivita.importo_pagato / (attivita.costo_orario || 10), // Reverse calculate hours
          costo_orario: attivita.costo_orario || 10,
          importo_totale: attivita.importo_pagato,
          pagato: true,
          data_pagamento: attivita.completato_at,
          pagato_da: attivita.dipendente_nome, // Chi ha fatto l'azione = chi ha pagato
          pagato_da_id: attivita.dipendente_id,
          note: 'Migrato da vecchia logica (AttivitaCompletata)'
        });

        results.migrated++;
      } catch (error) {
        results.errors.push(`Error migrating turno_id ${attivita.turno_id}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});