import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { secrets } from 'base44:runtime';
import { aBlocchi, loadConfig } from '../../shared/inv2.ts';
import { addGiorni, giornoRoma } from '../../shared/inv2Calcolo.ts';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Legge le vendite di un giorno dal POS e sostituisce le VenditaPOS di quel giorno
async function sincronizzaGiorno(E, url, segreto, negozi, giorno) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${segreto}`, 'x-inventory-secret': segreto },
    body: JSON.stringify({ action: 'get_sales', date_from: giorno, date_to: giorno }),
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) throw new Error(`Il POS ha risposto ${res.status}`);
  const { sales } = await res.json();
  if (!Array.isArray(sales)) throw new Error('Risposta del POS senza "sales"');

  // Una riga per punto vendita + canale + prodotto: i duplicati si sommano
  const righe = {};
  sales.forEach((s) => {
    const locationId = String(s.location_id);
    const r = (righe[`${locationId}|${s.canale}|${s.pos_product_id}`] ||= {
      data: giorno,
      pos_location_id: locationId,
      pos_location_name: s.location_name || '',
      ...(negozi[locationId] ? { store_id: negozi[locationId] } : {}),
      canale: s.canale || '',
      pos_product_id: String(s.pos_product_id),
      nome_prodotto: s.nome_prodotto || '',
      quantita: 0,
      fatturato: 0,
      is_b2b: false
    });
    r.quantita += Number(s.quantita) || 0;
    r.fatturato += Number(s.fatturato) || 0;
    r.is_b2b ||= !!s.is_b2b;
  });

  // Si cancella solo dopo aver letto il POS: se la lettura fallisce il giorno resta com'era
  await E.VenditaPOS.deleteMany({ data: giorno });
  for (const blocco of aBlocchi(Object.values(righe), 500)) await E.VenditaPOS.bulkCreate(blocco);
  return Object.keys(righe).length;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Admin per le chiamate manuali; l'automazione notturna non ha un utente
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const sr = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const oggi = giornoRoma(new Date());
    let da = addGiorni(oggi, -2);
    let a = oggi;
    // Solo l'admin sceglie il periodo; senza utente valgono sempre gli ultimi 3 giorni
    if (user && (body.date_from || body.date_to)) {
      da = body.date_from;
      a = body.date_to || oggi;
      if (!DATA.test(da || '') || !DATA.test(a) || da > a || a > oggi) return Response.json({ error: 'Date non valide' }, { status: 400 });
      if (addGiorni(da, 59) < a) return Response.json({ error: 'Si possono sincronizzare al massimo 60 giorni' }, { status: 400 });
    }

    const url = secrets.get('POS_SYNC_URL');
    const segreto = secrets.get('POS_SYNC_SECRET');
    if (!url || !segreto) return Response.json({ error: 'Mancano POS_SYNC_URL o POS_SYNC_SECRET nei segreti dell\'app' }, { status: 500 });

    const { config } = await loadConfig(sr);
    const negozi = config.negozi_pos || {};
    const giorni = [];
    for (let g = da; g <= a; g = addGiorni(g, 1)) giorni.push(g);

    let righe = 0;
    const errori = [];
    for (const blocco of aBlocchi(giorni, 5)) {
      const esiti = await Promise.allSettled(blocco.map((g) => sincronizzaGiorno(sr.entities, url, segreto, negozi, g)));
      esiti.forEach((e, i) => {
        if (e.status === 'fulfilled') righe += e.value;
        else errori.push({ giorno: blocco[i], errore: e.reason.message });
      });
    }
    if (errori.length) console.error('Giorni non sincronizzati', JSON.stringify(errori));
    if (errori.length === giorni.length) return Response.json({ error: errori[0].errore, errori }, { status: 502 });
    return Response.json({ giorni: giorni.length, righe, errori });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}