import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active stores
    const stores = await base44.asServiceRole.entities.Store.filter({ status: 'active' });

    // Today's date string (Rome timezone)
    const now = new Date();
    const romeFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' });
    const oggi = romeFormatter.format(now); // YYYY-MM-DD

    // Get all inventory records for today
    const inizioGiorno = oggi + 'T00:00:00';
    const fineGiorno = oggi + 'T23:59:59';
    const rilevazioni = await base44.asServiceRole.entities.RilevazioneInventario.filter({
      data_rilevazione: { $gte: inizioGiorno, $lte: fineGiorno }
    }, '-data_rilevazione', 500);

    // Find which stores had at least one inventory record today
    const storesConInventario = new Set();
    for (const r of rilevazioni) {
      if (r.store_id) storesConInventario.add(r.store_id);
    }

    // Find stores missing inventory
    const storesMancanti = stores.filter(s => !storesConInventario.has(s.id));

    if (storesMancanti.length === 0) {
      return Response.json({ message: 'Tutti i locali hanno fatto l\'inventario oggi.', missing: [] });
    }

    // Build email
    const elenco = storesMancanti.map(s => `• ${s.name}`).join('\n');
    const subject = `⚠️ Inventario mancante - ${oggi}`;
    const body = `Buongiorno,\n\nI seguenti locali NON hanno registrato l'inventario oggi (${oggi}):\n\n${elenco}\n\nSi prega di verificare.\n\nSistema automatico Sa Pizzedda`;

    // Send to all admin users
    const users = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminEmails = users.map(u => u.email).filter(Boolean);

    for (const email of adminEmails) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject,
          body
        });
      } catch (emailErr) {
        console.error(`Errore invio email a ${email}:`, emailErr.message);
      }
    }

    return Response.json({
      message: `Notifica inviata. ${storesMancanti.length} locali senza inventario.`,
      missing: storesMancanti.map(s => s.name),
      notifiedAdmins: adminEmails
    });
  } catch (error) {
    console.error('Errore check inventario:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});