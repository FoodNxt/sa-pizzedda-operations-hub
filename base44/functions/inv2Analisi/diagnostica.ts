import { fetchAll, loadConfig } from '../../shared/inv2.ts';
import { addGiorni, giornoRoma } from '../../shared/inv2Calcolo.ts';
import { consumiTeorici, ricetteEscluse } from '../../shared/inv2Teorico.ts';

const GIORNI = 28;
const arrotonda = (n, decimali) => Math.round(n * 10 ** decimali) / 10 ** decimali;

// Diagnostica delle vendite del POS e del consumo teorico, ultimi 28 giorni (oggi escluso)
export async function diagnostica(sr) {
  const E = sr.entities;
  const now = Date.now();
  const oggi = giornoRoma(new Date(now));
  const [{ config }, stores, materie, ricette, impostazioni, collegamenti] = await Promise.all([
    loadConfig(sr),
    E.Store.list(),
    fetchAll(E.MateriePrime),
    fetchAll(E.Ricetta),
    fetchAll(E.ImpostazioneInventario2, { incluso: true }),
    fetchAll(E.ProdottoPOSRicetta)
  ]);
  const negoziPos = config.negozi_pos || {};
  const teorici = await consumiTeorici(E, {
    storeIds: [...new Set(Object.values(negoziPos))],
    now,
    ricette,
    materie,
    impostazioni,
    escluse: ricetteEscluse(config, ricette),
    inizi: config.inizio_storico_per_store || {}
  });

  // Righe scritte secondo il log contro righe davvero presenti, ultimi 60 giorni
  const dal60 = addGiorni(oggi, -59);
  const [logGiorni, presenti] = await Promise.all([
    fetchAll(E.SincronizzazioneVenditePOS, { data: { $gte: dal60 } }, 'data'),
    E.VenditaPOS.aggregate({ query: { data: { $gte: dal60 } }, groupBy: ['data'] })
  ]);
  if (presenti.truncated) throw new Error('Troppi giorni di vendita da leggere');
  const logPer = Object.fromEntries(logGiorni.map((l) => [l.data, l]));
  const presentiPer = Object.fromEntries(presenti.rows.map((r) => [r.data, r.count]));
  const controllo = [...new Set([...Object.keys(logPer), ...Object.keys(presentiPer)])].sort().reverse().map((data) => {
    const nelLog = logPer[data]?.righe ?? null;
    const righe = presentiPer[data] || 0;
    return { data, esito: logPer[data]?.esito || null, nel_log: nelLog, presenti: righe, diverso: (nelLog || 0) !== righe };
  });

  // Righe per giorno, punto vendita e store: servono per quelle rimaste senza store
  const punti = await E.VenditaPOS.aggregate({
    query: { data: { $gte: addGiorni(oggi, -GIORNI), $lt: oggi } },
    groupBy: ['data', 'pos_location_id', 'pos_location_name', 'store_id'],
    sum: ['quantita']
  });
  if (punti.truncated) throw new Error('Troppe vendite da leggere per la diagnostica');

  const perChiave = Object.fromEntries(collegamenti.map((c) => [c.chiave_prodotto, c]));
  const nomeStore = Object.fromEntries(stores.map((s) => [s.id, s.name]));
  // Chiave = store, oppure 'pos:' + punto vendita se il punto vendita non è abbinato a uno store
  const perNegozio = {};
  const giornoDi = (chiave, data) => {
    const n = (perNegozio[chiave] ||= { giorni: {}, gusti: 0, conRicetta: 0 });
    return [n, (n.giorni[data] ||= { data, pizzedde: 0, pezzi: 0, righe_senza_store: 0, non_collegati: 0, menu: 0 })];
  };
  // Le vendite con lo store sono le stesse che usa il consumo teorico
  teorici.vendite.forEach((v) => {
    const [n, g] = giornoDi(v.store_id, v.data);
    const pezzi = v.sum_quantita || 0;
    g.pezzi += pezzi;
    if (v.is_pizza) g.pizzedde += pezzi;
    if (v.combo_non_scomposto) { g.menu += pezzi; return; }
    const c = perChiave[v.chiave_prodotto];
    if (!c) g.non_collegati += pezzi;
    if (!v.is_pizza) return;
    n.gusti += pezzi;
    if (c?.tipo === 'ricetta' && c.item_id) n.conRicetta += pezzi;
  });
  // Le righe senza store vanno sullo store abbinato al loro punto vendita, se c'è
  punti.rows.filter((p) => !p.store_id).forEach((p) => {
    const storeId = negoziPos[p.pos_location_id];
    const [n, g] = giornoDi(storeId || `pos:${p.pos_location_id}`, p.data);
    g.righe_senza_store += p.count || 0;
    if (storeId) return;
    n.nomePos ||= p.pos_location_name || p.pos_location_id;
    g.pezzi += p.sum_quantita || 0;
  });

  const negozi = Object.entries(perNegozio).map(([id, n]) => {
    const giorni = Object.values(n.giorni).sort((a, b) => b.data.localeCompare(a.data));
    const storeId = nomeStore[id] ? id : null;
    return {
      id,
      nome: nomeStore[id] || `${n.nomePos || id} (senza store)`,
      store_id: storeId,
      giorni,
      pizzedde_giorno: arrotonda(giorni.reduce((s, g) => s + g.pizzedde, 0) / giorni.length, 1),
      // Sui gusti venduti: i menu non scomposti si distribuiscono sui gusti
      quota_collegate: n.gusti > 0 ? arrotonda((n.conRicetta / n.gusti) * 100, 1) : null,
      giorni_nel_teorico: (teorici.giorniPerStore[storeId] || []).length
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  // Da dove arriva il teorico: per store e prodotto, la quantità per pezzo di ogni prodotto venduto
  const dettaglio = {};
  const conDettaglio = new Set();
  Object.entries(teorici.pezzi).forEach(([storeId, venduti]) => {
    const giorni = (teorici.giorniPerStore[storeId] || []).length;
    if (!giorni) return;
    Object.entries(venduti).forEach(([chiave, pezzi]) => {
      Object.entries(teorici.perPezzo[chiave] || {}).forEach(([itemId, quantita]) => {
        conDettaglio.add(itemId);
        ((dettaglio[storeId] ||= {})[itemId] ||= []).push({
          nome: perChiave[chiave]?.nome_prodotto || chiave,
          per_pezzo: arrotonda(quantita, 5),
          pezzi_giorno: arrotonda(pezzi / giorni, 2),
          totale_giorno: arrotonda((quantita * pezzi) / giorni, 4)
        });
      });
    });
  });

  return {
    giorni: GIORNI,
    controllo,
    negozi,
    non_convertiti: teorici.motivi,
    prodotti: impostazioni
      .filter((i) => conDettaglio.has(i.item_id))
      .map((i) => ({ id: i.item_id, nome: i.item_nome, unita: i.unita_conteggio || '' }))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'it')),
    dettaglio
  };
}