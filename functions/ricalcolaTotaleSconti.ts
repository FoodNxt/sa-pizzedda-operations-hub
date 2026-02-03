import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all Sconto records
    const sconti = await base44.asServiceRole.entities.Sconto.list();

    let updated = 0;
    let errors = 0;

    for (const sconto of sconti) {
      try {
        // Recalculate total_discount_price as sum of sourceApp only
        const correctTotal = 
          (sconto.sourceApp_glovo || 0) +
          (sconto.sourceApp_deliveroo || 0) +
          (sconto.sourceApp_justeat || 0) +
          (sconto.sourceApp_onlineordering || 0) +
          (sconto.sourceApp_ordertable || 0) +
          (sconto.sourceApp_tabesto || 0) +
          (sconto.sourceApp_deliverect || 0) +
          (sconto.sourceApp_store || 0);

        // Only update if different
        if (Math.abs((sconto.total_discount_price || 0) - correctTotal) > 0.01) {
          await base44.asServiceRole.entities.Sconto.update(sconto.id, {
            total_discount_price: correctTotal
          });
          updated++;
        }
      } catch (error) {
        console.error(`Error updating sconto ${sconto.id}:`, error);
        errors++;
      }
    }

    return Response.json({
      success: true,
      message: `Ricalcolo completato: ${updated} record aggiornati, ${errors} errori`,
      total_records: sconti.length,
      updated,
      errors
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});