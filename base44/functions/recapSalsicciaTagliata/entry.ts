import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const stores = await base44.asServiceRole.entities.Store.filter({ status: 'active' });

    // Ultime rilevazioni inventario di Salsiccia Tagliata
    const rilevazioni = await base44.asServiceRole.entities.RilevazioneInventario.filter(
      { nome_prodotto: 'Salsiccia Tagliata' },
      '-data_rilevazione',
      500
    );

    const perStore = stores.map(store => {
      const ultima = rilevazioni.find(r => r.store_id === store.id || r.store_name === store.name);
      return {
        store_name: store.name,
        quantita: ultima ? ultima.quantita_rilevata : null,
        unita: ultima ? (ultima.unita_misura || '') : '',
        data: ultima ? ultima.data_rilevazione : null
      };
    }).sort((a, b) => (b.quantita ?? -1) - (a.quantita ?? -1));

    const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const rows = perStore.map(s => {
      const qtaText = s.quantita === null ? '—' : `${s.quantita} ${s.unita}`;
      const color = s.quantita === null ? '#9ca3af' : (s.quantita <= 2 ? '#dc2626' : '#111827');
      const dataText = s.data
        ? new Date(s.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
        : 'nessuna rilevazione';
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;font-size:16px;color:#111827;">${s.store_name}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;font-size:22px;font-weight:bold;text-align:right;color:${color};">${qtaText}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right;color:#6b7280;">${dataText}</td>
        </tr>`;
    }).join('');

    const subject = `🌭 Salsiccia Tagliata per locale - ${oggi}`;
    const body = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 560px;">
        <h2 style="color:#111827;margin:0 0 4px 0;">Salsiccia Tagliata</h2>
        <p style="color:#6b7280;margin:0 0 16px 0;font-size:13px;">${oggi}</p>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:20px;color:#6b7280;font-size:11px;">Quantità dall'ultima rilevazione inventario di ogni locale. In rosso le scorte ≤ 2.</p>
      </div>
    `;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const mimeMessage = [
      'To: admin@sapizzedda.it',
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

    return Response.json({ success: true, dati: perStore });

  } catch (error) {
    console.error('Error in recapSalsicciaTagliata:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});