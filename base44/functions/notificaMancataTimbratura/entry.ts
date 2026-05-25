import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Ora corrente in timezone Italia
    const now = new Date();
    const italyOffset = getItalyOffset(now);
    const italyNow = new Date(now.getTime() + italyOffset * 60000);
    const today = italyNow.toISOString().split('T')[0];
    const currentMinutes = italyNow.getHours() * 60 + italyNow.getMinutes();

    // Carica turni di oggi non ancora timbrati
    const turni = await base44.asServiceRole.entities.TurnoPlanday.filter({
      data: today,
      stato: 'programmato'
    });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Carica store per trovare gli store manager
    const stores = await base44.asServiceRole.entities.Store.list();
    const users = await base44.asServiceRole.entities.User.list();
    
    let emailsSent = 0;
    const notified = [];

    for (const turno of turni) {
      // Salta se già timbrato o già notificato
      if (turno.timbratura_entrata) continue;
      if (turno.notifica_email_mancata_timbratura) continue;
      
      // Salta turni di prova
      if (turno.is_prova) continue;

      // Salta turni di ferie, malattia o annullati
      const tipoLower = (turno.tipo_turno || '').toLowerCase();
      if (tipoLower.includes('ferie') || tipoLower.includes('malattia') || tipoLower.includes('permesso') || turno.stato === 'annullato') continue;

      // Calcola minuti dall'inizio turno
      const [hh, mm] = turno.ora_inizio.split(':').map(Number);
      const turnoStartMinutes = hh * 60 + mm;
      const minutiPassati = currentMinutes - turnoStartMinutes;

      // Invia email solo se sono passati almeno 10 minuti
      if (minutiPassati < 10) continue;
      // Non inviare se il turno è iniziato da più di 2 ore (evita spam per turni vecchi)
      if (minutiPassati > 120) continue;

      const dipendenteNome = turno.dipendente_nome || 'Dipendente sconosciuto';
      const storeName = turno.store_nome || '';
      const ruolo = turno.ruolo || '';

      const subject = `⚠️ Timbratura mancante - ${dipendenteNome} (${storeName})`;
      const body = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #dc2626;">⚠️ Timbratura Entrata Mancante</h2>
          <table style="border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px; font-weight: bold;">Dipendente:</td><td style="padding: 8px;">${dipendenteNome}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Locale:</td><td style="padding: 8px;">${storeName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Ruolo:</td><td style="padding: 8px;">${ruolo}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Data:</td><td style="padding: 8px;">${new Date(turno.data).toLocaleDateString('it-IT')}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Turno:</td><td style="padding: 8px;">${turno.ora_inizio} - ${turno.ora_fine}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Ritardo:</td><td style="padding: 8px; color: #dc2626; font-weight: bold;">${minutiPassati} minuti</td></tr>
          </table>
          <p style="margin-top: 16px; color: #6b7280;">Questo è un messaggio automatico inviato perché il dipendente non ha timbrato entro 10 minuti dall'inizio del turno.</p>
        </div>
      `;

      // Trova email dello store manager di questo store
      const store = stores.find(s => s.id === turno.store_id);
      const storeManagerEmails = [];
      if (store) {
        const sms = users.filter(u => 
          u.user_type === 'manager' || 
          (u.ruoli_dipendente && u.ruoli_dipendente.includes('Store Manager') && 
           u.assigned_stores && u.assigned_stores.includes(store.name))
        );
        for (const sm of sms) {
          if (sm.email) storeManagerEmails.push(sm.email);
        }
      }

      // Invia a info, admin e store manager
      const recipients = ['info@sapizzedda.it', 'admin@sapizzedda.it', ...storeManagerEmails];
      const uniqueRecipients = [...new Set(recipients)];
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

      if (gmailRes.ok) {
        // Segna come notificato per evitare duplicati
        await base44.asServiceRole.entities.TurnoPlanday.update(turno.id, {
          notifica_email_mancata_timbratura: true
        });
        emailsSent++;
        notified.push(dipendenteNome);
      } else {
        const errText = await gmailRes.text();
        console.error(`Errore invio email per ${dipendenteNome}:`, errText);
      }
    }

    return Response.json({
      success: true,
      today,
      turni_controllati: turni.length,
      email_inviate: emailsSent,
      notificati: notified
    });

  } catch (error) {
    console.error('Error in notificaMancataTimbratura:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getItalyOffset(date) {
  // CET = UTC+1, CEST = UTC+2
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  // Check if DST is active
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