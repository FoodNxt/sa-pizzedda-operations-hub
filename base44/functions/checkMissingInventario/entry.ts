import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active stores
    const stores = await base44.asServiceRole.entities.Store.filter({ status: 'active' });

    // Yesterday's date (Rome timezone)
    const now = new Date();
    const romeNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
    const ieri = new Date(romeNow);
    ieri.setDate(ieri.getDate() - 1);
    const anno = ieri.getFullYear();
    const mese = String(ieri.getMonth() + 1).padStart(2, '0');
    const giorno = String(ieri.getDate()).padStart(2, '0');
    const ieriStr = `${anno}-${mese}-${giorno}`;

    // Get all inventory records for yesterday
    const inizioGiorno = ieriStr + 'T00:00:00';
    const fineGiorno = ieriStr + 'T23:59:59';
    const rilevazioni = await base44.asServiceRole.entities.RilevazioneInventario.filter({
      data_rilevazione: { $gte: inizioGiorno, $lte: fineGiorno }
    }, '-data_rilevazione', 500);

    // Find which stores had at least one inventory record yesterday
    const storesConInventario = new Set();
    for (const r of rilevazioni) {
      if (r.store_id) storesConInventario.add(r.store_id);
    }

    // Find stores missing inventory
    const storesMancanti = stores.filter(s => !storesConInventario.has(s.id));
    const storesFatti = stores.filter(s => storesConInventario.has(s.id));

    if (storesMancanti.length === 0) {
      return Response.json({ message: 'Tutti i locali hanno fatto l\'inventario ieri.', missing: [] });
    }

    // Format date for display
    const giorniSettimana = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const dataDisplay = `${giorniSettimana[ieri.getDay()]} ${parseInt(giorno)} ${mesi[ieri.getMonth()]} ${anno}`;

    // Build HTML email
    const storesMancantiHTML = storesMancanti.map(s => 
      `<tr><td style="padding:12px 16px;border-bottom:1px solid #fee2e2;font-size:15px;color:#991b1b;">❌ &nbsp;${s.name}</td></tr>`
    ).join('');

    const storesFattiHTML = storesFatti.length > 0 
      ? storesFatti.map(s => 
          `<tr><td style="padding:10px 16px;border-bottom:1px solid #dcfce7;font-size:14px;color:#166534;">✅ &nbsp;${s.name}</td></tr>`
        ).join('')
      : '';

    const subject = `🔴 Inventario mancante — ${dataDisplay}`;

    const body = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 32px 24px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">🍕</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Inventario Non Registrato</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${dataDisplay}</p>
          </td>
        </tr>

        <!-- Alert -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:15px;color:#991b1b;font-weight:600;">
                    ⚠️ ${storesMancanti.length} ${storesMancanti.length === 1 ? 'locale non ha' : 'locali non hanno'} registrato l'inventario ieri
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Missing stores -->
        <tr>
          <td style="padding:16px 32px 8px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Locali mancanti</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
              ${storesMancantiHTML}
            </table>
          </td>
        </tr>

        ${storesFatti.length > 0 ? `
        <!-- Completed stores -->
        <tr>
          <td style="padding:16px 32px 8px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Locali in regola</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
              ${storesFattiHTML}
            </table>
          </td>
        </tr>
        ` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
              <tr>
                <td style="padding:16px 20px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#94a3b8;">
                    📧 Notifica automatica · Sa Pizzedda Operations Hub<br>
                    Inviata ogni giorno a mezzanotte
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Destinatari: admin + store manager degli store mancanti
    const users = await base44.asServiceRole.entities.User.list();
    const smEmails = storesMancanti
      .filter(s => s.store_manager_id)
      .map(s => {
        const sm = users.find(u => u.id === s.store_manager_id);
        return sm?.email;
      })
      .filter(Boolean);

    const allRecipients = [...new Set(['admin@sapizzedda.it', ...smEmails])];

    for (const email of allRecipients) {
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
      message: `Notifica inviata. ${storesMancanti.length} locali senza inventario ieri (${ieriStr}).`,
      missing: storesMancanti.map(s => s.name),
      completed: storesFatti.map(s => s.name),
      notifiedTo: allRecipients
    });
  } catch (error) {
    console.error('Errore check inventario:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});