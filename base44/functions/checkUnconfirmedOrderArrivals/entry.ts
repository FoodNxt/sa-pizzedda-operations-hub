import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get alert config
    const configs = await base44.asServiceRole.entities.OrderArrivalAlertConfig.filter({ attivo: true });
    if (configs.length === 0) {
      return Response.json({ message: 'Nessuna configurazione alert attiva' });
    }

    const emailDestinatario = configs[0].email_destinatario;
    if (!emailDestinatario) {
      return Response.json({ message: 'Nessuna email configurata' });
    }

    // Get sent orders
    const ordiniInviati = await base44.asServiceRole.entities.OrdineFornitore.filter({ status: 'inviato' });
    if (ordiniInviati.length === 0) {
      return Response.json({ message: 'Nessun ordine inviato' });
    }

    // Get inventory data
    const [inventory, inventoryCantina] = await Promise.all([
      base44.asServiceRole.entities.RilevazioneInventario.list('-data_rilevazione', 500),
      base44.asServiceRole.entities.RilevazioneInventarioCantina.list('-data_rilevazione', 500)
    ]);

    const allInv = [...inventory, ...inventoryCantina];
    const alertDetails = [];

    for (const ordine of ordiniInviati) {
      if (!ordine.data_invio || !ordine.prodotti) continue;
      const dataInvio = new Date(ordine.data_invio);
      const prodottiAumentati = [];

      for (const prod of ordine.prodotti) {
        if (prod.quantita_ordinata <= 0) continue;

        const readings = allInv
          .filter((r) => r.prodotto_id === prod.prodotto_id && r.store_id === ordine.store_id)
          .sort((a, b) => new Date(a.data_rilevazione) - new Date(b.data_rilevazione));

        if (readings.length < 2) continue;

        const readingsBeforeOrder = readings.filter((r) => new Date(r.data_rilevazione) <= dataInvio);
        const readingsAfterOrder = readings.filter((r) => new Date(r.data_rilevazione) > dataInvio);

        if (readingsBeforeOrder.length === 0 || readingsAfterOrder.length === 0) continue;

        const lastBefore = readingsBeforeOrder[readingsBeforeOrder.length - 1];
        const lastAfter = readingsAfterOrder[readingsAfterOrder.length - 1];

        if ((lastAfter.quantita_rilevata || 0) > (lastBefore.quantita_rilevata || 0)) {
          prodottiAumentati.push({
            nome: prod.nome_prodotto,
            prima: lastBefore.quantita_rilevata,
            dopo: lastAfter.quantita_rilevata,
            unita: prod.unita_misura
          });
        }
      }

      if (prodottiAumentati.length > 0) {
        alertDetails.push({
          store_name: ordine.store_name,
          fornitore: ordine.fornitore,
          data_invio: ordine.data_invio,
          prodotti: prodottiAumentati
        });
      }
    }

    if (alertDetails.length === 0) {
      return Response.json({ message: 'Nessun possibile arrivo non segnato' });
    }

    // Build email body
    let body = `⚠️ ATTENZIONE: Sono stati rilevati ${alertDetails.length} ordini con possibile arrivo NON SEGNATO.\n\n`;
    body += `Questo significa che l'inventario di alcuni prodotti è aumentato dopo l'invio dell'ordine, ma l'ordine non è stato confermato come ricevuto.\n\n`;
    body += `────────────────────────────\n\n`;

    for (const alert of alertDetails) {
      const dataInvio = new Date(alert.data_invio).toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      body += `📦 ${alert.store_name} - ${alert.fornitore}\n`;
      body += `   Inviato: ${dataInvio}\n`;
      for (const p of alert.prodotti) {
        body += `   • ${p.nome}: ${p.prima} → ${p.dopo} ${p.unita}\n`;
      }
      body += `\n`;
    }

    body += `────────────────────────────\n\n`;
    body += `Vai nella sezione Ordini Fornitori > Ordini Inviati per confermare la ricezione degli ordini.`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: emailDestinatario,
      subject: `⚠️ ${alertDetails.length} ordini con possibile arrivo non segnato`,
      body: body,
      from_name: 'Sa Pizzedda - Alert Ordini'
    });

    return Response.json({
      success: true,
      alertsSent: alertDetails.length,
      emailTo: emailDestinatario
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});