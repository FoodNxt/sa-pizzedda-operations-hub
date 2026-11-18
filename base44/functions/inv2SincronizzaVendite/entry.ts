import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { secrets } from 'base44:runtime';
import { aBlocchi, loadConfig } from '../../shared/inv2.ts';
import { addGiorni, giornoRoma } from '../../shared/inv2Calcolo.ts';

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const SENZA_ITEM = { item_id: { $in: [null, ''] } };

const chiaveProdotto = (s) => (s.internal_product_id != null && s.internal_product_id !== ''
  ? String(s.internal_product_id)
  : `nome:${String(s.nome_prodotto || '').toLowerCase().trim().replace(/\s+/g, ' ')}`);

async function cancella(entity, query) {
  while ((await entity.deleteMany(query)).deleted > 0);
}

async function leggiGiorno(url, segreto, giorno) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${segreto}`, 'x-inventory-secret': segreto },
    body: JSON.stringify({ action: 'get_sales', date_from: giorno, date_to: giorno }),
    signal: AbortSignal.timeout(30000)
  });
  const testo = await res.text();
  if (!res.ok) throw new Error(`Il POS ha risposto ${res.status}: ${testo}`);
  const risposta = JSON.parse(testo);
  if (!Array.isArray(risposta.sales)) throw new Error('Risposta del POS senza "sales"');
  return risposta;
}

// Sostituisce le VenditaPOS di un giorno con quelle lette dal POS e salva il log del giorno
async function sincronizzaGiorno(E, url, segreto, negozi, giorno) {
  const log = { data: giorno, righe: 0, esito: 'ok' };
  try {
    const risposta = await leggiGiorno(url, segreto, giorno);
    // Una riga per data + punto vendita + canale + prodotto: i duplicati si sommano
    const righe = {};
    let altraData = 0;
    risposta.sales.forEach((s) => {
      const data = String(s.data || giorno).slice(0, 10);
      if (data !== giorno) { altraData++; return; }
      const locationId = String(s.location_id);
      const canale = s.canale || 'pos';
      const chiave = chiaveProdotto(s);
      const combo = !!s.combo_non_scomposto;
      const r = (righe[`${data}|${locationId}|${canale}|${chiave}|${combo}`] ||= {
        data,
        pos_location_id: locationId,
        pos_location_name: s.location_name || '',
        ...(negozi[locationId] ? { store_id: negozi[locationId] } : {}),
        canale,
        chiave_prodotto: chiave,
        ...(s.internal_product_id != null && s.internal_product_id !== '' ? { internal_product_id: String(s.internal_product_id) } : {}),
        nome_prodotto: s.nome_prodotto || '',
        is_pizza: !!s.is_pizza,
        combo_non_scomposto: combo,
        quantita: 0,
        fatturato: 0,
        is_free: false,
        is_b2b: false
      });
      r.quantita += Number(s.quantita) || 0;
      r.fatturato += Number(s.fatturato) || 0;
      r.is_free ||= !!s.is_free;
      r.is_b2b ||= !!s.is_b2b;
    });

    // Si cancella solo dopo aver letto il POS: se la lettura fallisce il giorno resta com'era
    await cancella(E.VenditaPOS, { data: giorno });
    for (const blocco of aBlocchi(Object.values(righe), 500)) await E.VenditaPOS.bulkCreate(blocco);
    // I menu non scomposti non si collegano a una ricetta: si distribuiscono sui gusti
    const scomposte = new Set(Object.values(righe).filter((r) => !r.combo_non_scomposto).map((r) => r.chiave_prodotto));
    const soloCombo = [...new Set(Object.values(righe).filter((r) => r.combo_non_scomposto && !scomposte.has(r.chiave_prodotto)).map((r) => r.chiave_prodotto))];
    if (soloCombo.length) await cancella(E.ProdottoPOSRicetta, { chiave_prodotto: { $in: soloCombo } });
    const combo = risposta.combo_non_scomposti;
    Object.assign(log, {
      righe: Object.keys(righe).length,
      total_orders: Number(risposta.total_orders) || 0,
      combo_non_scomposti: Array.isArray(combo) ? combo.length : Number(combo) || 0,
      ...(risposta.schema_version != null ? { schema_version: String(risposta.schema_version) } : {}),
      ...(altraData ? { errore: `${altraData} righe con una data diversa dal giorno richiesto, non salvate` } : {})
    });
  } catch (e) {
    Object.assign(log, { esito: 'errore', errore: String(e.message).slice(0, 4000) });
    // Le vendite del giorno sono rimaste com'erano: il log riuscito di prima resta valido
    if (await E.SincronizzazioneVenditePOS.count({ data: giorno, esito: 'ok' })) return log;
  }
  await cancella(E.SincronizzazioneVenditePOS, { data: giorno });
  await E.SincronizzazioneVenditePOS.create(log);
  return log;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Admin per le chiamate manuali; l'automazione notturna non ha un utente
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const sr = base44.asServiceRole;
    const E = sr.entities;

    const body = await req.json().catch(() => ({}));
    const oggi = giornoRoma(new Date());
    let da = addGiorni(oggi, -2);
    let a = oggi;
    // Solo l'admin sceglie il periodo o reimporta; senza utente valgono sempre gli ultimi 3 giorni
    if (body.reimporta) {
      if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 });
      da = addGiorni(oggi, -59);
    } else if (user && (body.date_from || body.date_to)) {
      da = body.date_from;
      a = body.date_to || oggi;
      if (!DATA.test(da || '') || !DATA.test(a) || da > a || a > oggi) return Response.json({ error: 'Date non valide' }, { status: 400 });
      if (addGiorni(da, 59) < a) return Response.json({ error: 'Si possono sincronizzare al massimo 60 giorni' }, { status: 400 });
    }

    const url = secrets.get('POS_SYNC_URL');
    const segreto = secrets.get('POS_SYNC_SECRET');
    if (!url || !segreto) return Response.json({ error: 'Mancano POS_SYNC_URL o POS_SYNC_SECRET nei segreti dell\'app' }, { status: 500 });

    if (body.reimporta) {
      await cancella(E.VenditaPOS, {});
      await cancella(E.ProdottoPOSRicetta, SENZA_ITEM);
    }

    const { config } = await loadConfig(sr);
    const negozi = config.negozi_pos || {};
    const giorni = [];
    for (let g = da; g <= a; g = addGiorni(g, 1)) giorni.push(g);

    const log = [];
    for (const blocco of aBlocchi(giorni, 5)) {
      log.push(...await Promise.all(blocco.map((g) => sincronizzaGiorno(E, url, segreto, negozi, g))));
    }
    const errori = log.filter((l) => l.esito === 'errore').map((l) => ({ giorno: l.data, errore: l.errore }));
    const esito = { giorni: giorni.length, righe: log.reduce((s, l) => s + l.righe, 0), errori };
    if (errori.length) console.error('Giorni non sincronizzati', JSON.stringify(errori).slice(0, 2000));
    if (errori.length === giorni.length) return Response.json({ error: errori[0].errore.slice(0, 500), ...esito }, { status: 502 });
    return Response.json(esito);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}