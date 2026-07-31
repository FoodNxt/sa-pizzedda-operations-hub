import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Data di OGGI in timezone Italia (la funzione gira alle 23:59 dello stesso giorno)
    const now = new Date();
    const italyOffset = getItalyOffset(now);
    const italyNow = new Date(now.getTime() + italyOffset * 60000);
    const todayStr = italyNow.toISOString().split('T')[0];

    // Carica store attivi
    const stores = await base44.asServiceRole.entities.Store.filter({ status: 'active' });

    // Carica sprechi di oggi
    const startOfDay = todayStr + 'T00:00:00.000Z';
    const endOfDay = todayStr + 'T23:59:59.999Z';
    const sprechi = await base44.asServiceRole.entities.Spreco.filter({
      data_rilevazione: { $gte: startOfDay, $lte: endOfDay }
    });

    // Carica teglie buttate di oggi
    const teglieButtate = await base44.asServiceRole.entities.TeglieButtate.filter({
      data_rilevazione: { $gte: startOfDay, $lte: endOfDay }
    });

    // Trova store con almeno uno spreco O una rilevazione teglie buttate oggi
    const storeIdsConSprechi = new Set(sprechi.map(s => s.store_id));
    for (const t of teglieButtate) {
      if (t.store_id) {
        storeIdsConSprechi.add(t.store_id);
      } else if (t.store_name) {
        const match = stores.find(s => s.name === t.store_name);
        if (match) storeIdsConSprechi.add(match.id);
      }
    }

    // Store mancanti
    const storeMancanti = stores.filter(s => !storeIdsConSprechi.has(s.id));

    if (storeMancanti.length === 0) {
      return Response.json({ success: true, message: 'Tutti gli store hanno compilato il form sprechi', date: todayStr });
    }

    // Invia email di notifica
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const storeCompletati = stores.filter(s => storeIdsConSprechi.has(s.id));
    const dataFormattata = new Date(todayStr).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const subject = `⚠️ Form Sprechi non compilato - ${storeMancanti.length} store mancanti (${dataFormattata})`;
    const body = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #dc2626;">⚠️ Form Sprechi Non Compilato</h2>
        <p style="color: #374151;">In <strong>${storeMancanti.length}</strong> store non sono stati registrati né sprechi né teglie buttate per il giorno <strong>${dataFormattata}</strong>.</p>
        
        <h3 style="color: #dc2626; margin-top: 20px;">❌ Store mancanti (${storeMancanti.length})</h3>
        <ul style="color: #374151;">
          ${storeMancanti.map(s => `<li style="padding: 4px 0;"><strong>${s.name}</strong></li>`).join('')}
        </ul>

        ${storeCompletati.length > 0 ? `
        <h3 style="color: #16a34a; margin-top: 20px;">✅ Store che hanno compilato (${storeCompletati.length})</h3>
        <ul style="color: #374151;">
          ${storeCompletati.map(s => `<li style="padding: 4px 0;">${s.name}</li>`).join('')}
        </ul>
        ` : ''}

        <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">Messaggio automatico inviato dal sistema Sa Pizzedda.</p>
      </div>
    `;

    // Destinatario: solo admin
    const uniqueRecipients = ['admin@sapizzedda.it'];
    const to = uniqueRecipients.join(', ');

    const mimeMessage = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      body
    ].join('\r\n');

    const encodedMessage = btoa(unescape(encodeURIComponent(mimeMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMessage })
    });

    if (!gmailRes.ok) {
      const errText = await gmailRes.text();
      console.error('Errore invio email:', errText);
      return Response.json({ success: false, error: errText }, { status: 500 });
    }

    return Response.json({
      success: true,
      date: todayStr,
      store_mancanti: storeMancanti.map(s => s.name),
      store_completati: storeCompletati.map(s => s.name),
      email_inviata_a: uniqueRecipients
    });

  } catch (error) {
    console.error('Error in checkMissingSprechi:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getItalyOffset(date) {
  const marchLastSun = getLastSunday(date.getFullYear(), 2);
  const octLastSun = getLastSunday(date.getFullYear(), 9);
  if (date >= marchLastSun && date < octLastSun) {
    return 120; // CEST UTC+2
  }
  return 60; // CET UTC+1
}

function getLastSunday(year, month) {
  const d = new Date(Date.UTC(year, month + 1, 0, 1, 0, 0));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}