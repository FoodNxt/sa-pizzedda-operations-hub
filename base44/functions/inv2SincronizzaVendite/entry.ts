import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { secrets } from 'base44:runtime';
import { aBlocchi, loadConfig } from '../../shared/inv2.ts';
import { addGiorni, giornoRoma } from '../../shared/inv2Calcolo.ts';
import { DATA, cancella, cancellaGiorno, chiaveProdotto, importaOrarie } from '../../shared/inv2VenditeOrarie.ts';

// I menu (tipo ignora) non hanno un item e restano
const SENZA_ITEM = { item_id: { $in: [null, ''] }, tipo: { $ne: 'ignora' } };
const GIORNI_BLOCCO = 10;
const TIMEOUT_MS = 120000;
// Dopo 4 minuti non si iniziano altri blocchi; la richiesta viene chiusa a 5
const LIMITE_MS = 240000;
const FINE_MS = 285000;

// Una sola richiesta per tutto il blocco: il POS scorre gli ordini dal più recente fino a date_from
async function leggiBlocco(url, segreto, da, a, timeout) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${segreto}`, 'x-inventory-secret': segreto },
    body: JSON.stringify({ action: 'get_sales', date_from: da, date_to: a }),
    signal: AbortSignal.timeout(timeout)
  });
  const testo = await res.text();
  if (!res.ok) throw new Error(`Il POS ha risposto ${res.status}: ${testo}`);
  const risposta = JSON.parse(testo);
  if (!Array.isArray(risposta.sales)) throw new Error('Risposta del POS senza "sales"');
  return risposta;
}

// Divide le righe per giorno: una riga per data + punto vendita + canale + prodotto, i duplicati si sommano
function righePerGiorno(sales, negozi, giornoUnico) {
  const perGiorno = {};
  sales.forEach((s) => {
    const data = String(s.data || giornoUnico || '').slice(0, 10);
    const locationId = String(s.location_id);
    const canale = s.canale || 'pos';
    const chiave = chiaveProdotto(s);
    const combo = !!s.combo_non_scomposto;
    const righe = (perGiorno[data] ||= {});
    const r = (righe[`${locationId}|${canale}|${chiave}|${combo}`] ||= {
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
  return perGiorno;
}

async function salvaLog(E, log) {
  await cancellaGiorno(E.SincronizzazioneVenditePOS, log.data);
  await E.SincronizzazioneVenditePOS.create(log);
}

// Sostituisce le VenditaPOS di un giorno, anche con 0 righe, e poi conta quelle salvate.
// Restituisce false se sono diverse da quelle previste: il giorno va nel log come errore
async function salvaGiorno(E, giorno, righe, extra) {
  await cancellaGiorno(E.VenditaPOS, giorno);
  for (const blocco of aBlocchi(righe, 500)) await E.VenditaPOS.bulkCreate(blocco);
  // I menu non scomposti non si collegano a una ricetta: si distribuiscono sui gusti
  const scomposte = new Set(righe.filter((r) => !r.combo_non_scomposto).map((r) => r.chiave_prodotto));
  const soloCombo = [...new Set(righe.filter((r) => r.combo_non_scomposto && !scomposte.has(r.chiave_prodotto)).map((r) => r.chiave_prodotto))];
  if (soloCombo.length) await cancella(E.ProdottoPOSRicetta, { chiave_prodotto: { $in: soloCombo } });
  const salvate = await E.VenditaPOS.count({ data: giorno });
  if (salvate !== righe.length) {
    await salvaLog(E, { ...extra, data: giorno, righe: salvate, esito: 'errore', errore: `Salvate ${salvate} righe su ${righe.length} previste` });
    return false;
  }
  await salvaLog(E, { data: giorno, righe: righe.length, esito: 'ok', ...extra });
  return true;
}

async function segnaNonImportato(E, giorno, errore) {
  // Le vendite del giorno sono rimaste com'erano: il log riuscito di prima resta valido
  if (await E.SincronizzazioneVenditePOS.count({ data: giorno, esito: 'ok' })) return;
  await salvaLog(E, { data: giorno, righe: 0, esito: 'errore', errore: String(errore).slice(0, 4000) });
}

// Giorni dal più recente, raggruppati in blocchi che coprono al massimo 10 giorni di calendario
function blocchiDi(giorni) {
  const out = [];
  giorni.forEach((g) => {
    const b = out[out.length - 1];
    if (b && addGiorni(g, GIORNI_BLOCCO - 1) >= b[0]) b.push(g);
    else out.push([g]);
  });
  return out;
}

export default async function (req) {
  try {
    const inizio = Date.now();
    const base44 = createClientFromRequest(req);
    // Admin per le chiamate manuali; l'automazione notturna non ha un utente
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const sr = base44.asServiceRole;
    const E = sr.entities;

    const body = await req.json().catch(() => ({}));
    const oggi = giornoRoma(new Date());
    const minimo = addGiorni(oggi, -59);
    let da = addGiorni(oggi, -2);
    let a = oggi;
    let giorni = null;
    // Solo l'admin sceglie i giorni o reimporta; senza utente valgono sempre gli ultimi 3 giorni
    if (body.reimporta) {
      if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 });
      da = minimo;
    } else if (user && Array.isArray(body.giorni)) {
      giorni = [...new Set(body.giorni)];
      if (!giorni.length || giorni.some((g) => !DATA.test(g || '') || g > oggi || g < minimo)) return Response.json({ error: 'Giorni non validi' }, { status: 400 });
    } else if (user && (body.date_from || body.date_to)) {
      da = body.date_from;
      a = body.date_to || oggi;
      if (!DATA.test(da || '') || !DATA.test(a) || da > a || a > oggi) return Response.json({ error: 'Date non valide' }, { status: 400 });
      if (addGiorni(da, 59) < a) return Response.json({ error: 'Si possono sincronizzare al massimo 60 giorni' }, { status: 400 });
    }
    if (!giorni) {
      giorni = [];
      for (let g = da; g <= a; g = addGiorni(g, 1)) giorni.push(g);
    }
    giorni.sort().reverse();

    const url = secrets.get('POS_SYNC_URL');
    const segreto = secrets.get('POS_SYNC_SECRET');
    if (!url || !segreto) return Response.json({ error: 'Mancano POS_SYNC_URL o POS_SYNC_SECRET nei segreti dell\'app' }, { status: 500 });

    // Vendite per ora: solo i negozi in affiancamento o attivi, al massimo 10 giorni per chiamata. solo_oggi = la giornata in corso
    if (body.orarie) {
      const lista = body.solo_oggi ? [oggi] : giorni;
      if (lista.length > 10) return Response.json({ error: 'Le vendite per ora si importano al massimo 10 giorni alla volta' }, { status: 400 });
      const { config: cfg } = await loadConfig(sr);
      const modalita = cfg.modalita_per_store || {};
      const storeIds = Object.keys(modalita).filter((id) => ['affiancamento', 'attivo'].includes(modalita[id]));
      return Response.json(await importaOrarie(E, { url, segreto, negozi: cfg.negozi_pos || {}, storeIds, giorni: lista }));
    }

    // Le vendite non si svuotano mai in blocco: ogni giorno viene sostituito solo dopo che il POS lo ha restituito
    if (body.reimporta) await cancella(E.ProdottoPOSRicetta, SENZA_ITEM);

    const { config } = await loadConfig(sr);
    const negozi = config.negozi_pos || {};
    const importati = [];
    const errori = [];
    const daFare = [];
    let righeTotali = 0;
    const scaduto = () => Date.now() - inizio > LIMITE_MS;

    // Legge il blocco con una sola richiesta e solo se riesce sostituisce i suoi giorni. Restituisce l'errore, se c'è
    const importa = async (blocco) => {
      try {
        const primo = blocco[blocco.length - 1];
        const ultimo = blocco[0];
        const risposta = await leggiBlocco(url, segreto, primo, ultimo, Math.max(1000, Math.min(TIMEOUT_MS, FINE_MS - (Date.now() - inizio))));
        const unGiorno = primo === ultimo;
        const perGiorno = righePerGiorno(risposta.sales, negozi, unGiorno ? primo : null);
        const combo = risposta.combo_non_scomposti;
        let righe = 0;
        const riusciti = [];
        const diversi = [];
        for (const gruppo of aBlocchi(blocco, 5)) {
          await Promise.all(gruppo.map(async (g) => {
            const lista = Object.values(perGiorno[g] || {});
            const salvato = await salvaGiorno(E, g, lista, {
              combo_non_scomposti: unGiorno
                ? (Array.isArray(combo) ? combo.length : Number(combo) || 0)
                : lista.filter((r) => r.combo_non_scomposto).reduce((s, r) => s + r.quantita, 0),
              ...(unGiorno ? { total_orders: Number(risposta.total_orders) || 0 } : {}),
              ...(risposta.schema_version != null ? { schema_version: String(risposta.schema_version) } : {})
            });
            if (!salvato) { diversi.push(g); return; }
            riusciti.push(g);
            righe += lista.length;
          }));
        }
        importati.push(...riusciti);
        errori.push(...diversi.map((g) => ({ giorno: g, errore: 'Righe salvate diverse da quelle previste' })));
        righeTotali += righe;
        return null;
      } catch (e) {
        return String(e.message || e);
      }
    };

    const segna = async (blocco, errore) => {
      for (const g of blocco) {
        await segnaNonImportato(E, g, errore);
        errori.push({ giorno: g, errore: errore.slice(0, 500) });
      }
    };

    // Un blocco alla volta, mai in parallelo, dal più recente
    const coda = blocchiDi(giorni);
    for (let i = 0; i < coda.length; i++) {
      if (scaduto()) {
        daFare.push(...coda.slice(i).flat());
        break;
      }
      const blocco = coda[i];
      const errore = await importa(blocco);
      if (!errore) continue;
      if (blocco.length === 1) {
        await segna(blocco, errore);
        continue;
      }
      // Un solo nuovo tentativo, diviso in due metà
      for (const meta of aBlocchi(blocco, Math.ceil(blocco.length / 2))) {
        if (scaduto()) {
          daFare.push(...meta);
          continue;
        }
        const errore2 = await importa(meta);
        if (errore2) await segna(meta, errore2);
      }
    }

    const esito = { giorni: giorni.length, importati, righe: righeTotali, errori, da_fare: daFare };
    if (errori.length) console.error('Giorni non importati', JSON.stringify(errori).slice(0, 2000));
    if (!user && !importati.length && errori.length) return Response.json({ error: errori[0].errore, ...esito }, { status: 502 });
    return Response.json(esito);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}