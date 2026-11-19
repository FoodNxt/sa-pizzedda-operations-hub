// Vendite del POS per ora: importazione e pesi orari per il teorico all'ora esatta
import { aBlocchi, fetchAll } from './inv2.ts';

export const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const chiaveProdotto = (s) => (s.internal_product_id != null && s.internal_product_id !== ''
  ? String(s.internal_product_id)
  : `nome:${String(s.nome_prodotto || '').toLowerCase().trim().replace(/\s+/g, ' ')}`);

export async function cancella(entity, query) {
  while ((await entity.deleteMany(query)).deleted > 0);
}

// Si cancella sempre e solo un giorno preciso: senza una data valida il filtro sarebbe vuoto e cancellerebbe tutto
export async function cancellaGiorno(entity, giorno) {
  if (!DATA.test(giorno || '')) throw new Error(`Data non valida: ${giorno}`);
  await cancella(entity, { data: giorno });
}

// Vendite dei giorni indicati raggruppate per i campi dati. Se sono troppe per una sola lettura, i giorni si dividono a metà
export async function leggiVendite(entity, campi, giorni, storeIds) {
  const { rows, truncated } = await entity.aggregate({
    query: { data: { $in: giorni }, store_id: { $in: storeIds } },
    groupBy: campi,
    sum: ['quantita']
  });
  if (!truncated) return rows;
  if (giorni.length === 1) throw new Error(`Troppe vendite da leggere per il ${giorni[0]}`);
  const meta = Math.ceil(giorni.length / 2);
  return [...await leggiVendite(entity, campi, giorni.slice(0, meta), storeIds), ...await leggiVendite(entity, campi, giorni.slice(meta), storeIds)];
}

// Legge dal POS le vendite per ora dei giorni indicati (una sola richiesta) e sostituisce ogni giorno solo dopo averlo letto.
// Solo i negozi in storeIds. negozi = { pos_location_id: store_id }
export async function importaOrarie(E, { url, segreto, negozi, storeIds, giorni }) {
  const ordinati = [...giorni].sort();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${segreto}`, 'x-inventory-secret': segreto },
    body: JSON.stringify({ action: 'get_sales_hourly', date_from: ordinati[0], date_to: ordinati[ordinati.length - 1] }),
    signal: AbortSignal.timeout(200000)
  });
  if (!res.ok) throw new Error(`Il POS ha risposto ${res.status}`);
  const risposta = await res.json();
  if (!Array.isArray(risposta.sales)) throw new Error('Risposta del POS senza "sales"');

  const adesso = new Date();
  const sincronizzato = adesso.toISOString();
  // Del giorno in corso si tengono solo le ore già chiuse
  const oggi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(adesso);
  const oraAdesso = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(adesso));
  const attivi = new Set(storeIds);
  const perGiorno = Object.fromEntries(ordinati.map((g) => [g, {}]));
  risposta.sales.forEach((s) => {
    const data = String(s.data || '').slice(0, 10);
    const locationId = String(s.location_id);
    const storeId = negozi[locationId];
    const ora = Number(s.ora);
    if (!perGiorno[data] || !attivi.has(storeId) || !(ora >= 0 && ora <= 23) || (data === oggi && ora >= oraAdesso)) return;
    const canale = s.canale || 'pos';
    const chiave = chiaveProdotto(s);
    const combo = !!s.combo_non_scomposto;
    const r = (perGiorno[data][`${ora}|${locationId}|${canale}|${chiave}|${combo}`] ||= {
      data,
      ora,
      pos_location_id: locationId,
      pos_location_name: s.location_name || '',
      store_id: storeId,
      canale,
      chiave_prodotto: chiave,
      ...(s.internal_product_id != null && s.internal_product_id !== '' ? { internal_product_id: String(s.internal_product_id) } : {}),
      nome_prodotto: s.nome_prodotto || '',
      is_pizza: !!s.is_pizza,
      combo_non_scomposto: combo,
      quantita: 0,
      fatturato: 0,
      is_free: false,
      is_b2b: false,
      sincronizzato_il: sincronizzato
    });
    r.quantita += Number(s.quantita) || 0;
    r.fatturato += Number(s.fatturato) || 0;
    r.is_free ||= !!s.is_free;
    r.is_b2b ||= !!s.is_b2b;
  });

  const esito = { giorni: ordinati, righe: 0, ultima_ora: {}, errori: [] };
  for (const giorno of ordinati) {
    const righe = Object.values(perGiorno[giorno]);
    await cancellaGiorno(E.VenditaPOSOraria, giorno);
    for (const blocco of aBlocchi(righe, 500)) await E.VenditaPOSOraria.bulkCreate(blocco);
    const salvate = await E.VenditaPOSOraria.count({ data: giorno });
    if (salvate !== righe.length) esito.errori.push({ giorno, errore: `Salvate ${salvate} righe su ${righe.length} previste` });
    esito.righe += salvate;
    esito.ultima_ora[giorno] = righe.length ? Math.max(...righe.map((r) => r.ora)) : null;
  }
  return esito;
}

const vuoto = () => Array(24).fill(0);

// Pesi orari per store: { giorni: { giorno: { store: [24], items: { item_id: [24] } } }, media: [24], oggi }.
// I pesi dei giorni passati servono solo a ripartire il teorico del giorno tra le ore.
// oggi = { inizio, fine, items: { item_id: [24 quantità] } }: consumo delle ore di oggi già lette dal POS, fino a `fine`.
// consumoDi(chiave) = consumo di un pezzo { item_id: quantità } o null, ricetta(chiave) = il prodotto è collegato a una ricetta
export async function pesiOrari(E, { storeIds, date, oggi, inizioOggi, consumoDi, ricetta, gustiNegozio }) {
  const [storico, righeOggi] = await Promise.all([
    Promise.all(aBlocchi(date, 7).map((giorni) => leggiVendite(E.VenditaPOSOraria, ['data', 'ora', 'store_id', 'chiave_prodotto'], giorni, storeIds))),
    fetchAll(E.VenditaPOSOraria, { data: oggi, store_id: { $in: storeIds } })
  ]);
  const out = Object.fromEntries(storeIds.map((id) => [id, { giorni: {}, media: vuoto(), oggi: null }]));
  const somma = (ore, ora, consumo, pezzi) => Object.entries(consumo).forEach(([id, q]) => { (ore[id] ||= vuoto())[ora] += q * pezzi; });

  storico.flat().forEach((v) => {
    const s = out[v.store_id];
    const pezzi = Math.max(0, v.sum_quantita || 0);
    if (!s || !pezzi) return;
    const g = (s.giorni[v.data] ||= { store: vuoto(), items: {} });
    g.store[v.ora] += pezzi;
    s.media[v.ora] += pezzi;
    const consumo = consumoDi(v.chiave_prodotto);
    if (consumo) somma(g.items, v.ora, consumo, pezzi);
  });

  // Oggi: stessa regola del giornaliero, i menu non scomposti si distribuiscono sui gusti venduti
  const gustiOggi = {};
  righeOggi.forEach((v) => {
    if (v.combo_non_scomposto || !v.is_pizza || !ricetta(v.chiave_prodotto)) return;
    const gusti = (gustiOggi[v.store_id] ||= {});
    gusti[v.chiave_prodotto] = (gusti[v.chiave_prodotto] || 0) + (v.quantita || 0);
  });
  righeOggi.forEach((v) => {
    const s = out[v.store_id];
    if (!s) return;
    const o = (s.oggi ||= { inizio: inizioOggi, fine: 0, items: {} });
    // Le vendite di oggi arrivano fino all'inizio dell'ora in cui sono state lette
    o.fine = Math.max(o.fine, Math.floor((Date.parse(v.sincronizzato_il) || 0) / 3600000) * 3600000);
    const aggiungi = (chiave, pezzi) => {
      const consumo = consumoDi(chiave);
      if (consumo) somma(o.items, v.ora, consumo, pezzi);
    };
    if (!v.combo_non_scomposto) { aggiungi(v.chiave_prodotto, v.quantita || 0); return; }
    const gusti = gustiOggi[v.store_id] || gustiNegozio[v.store_id] || {};
    const totale = Object.values(gusti).reduce((t, q) => t + q, 0);
    if (totale > 0) Object.entries(gusti).forEach(([chiave, q]) => aggiungi(chiave, (v.quantita || 0) * (q / totale)));
  });
  return out;
}