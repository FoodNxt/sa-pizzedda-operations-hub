// Consumo teorico dalle vendite del POS: vendite × ricetta, per store, prodotto e giorno
import { aBlocchi, fetchAll } from './inv2.ts';
import { addGiorni, giornoRoma } from './inv2Calcolo.ts';
import { aPesoOVolume, espandiIngredienti, inConteggio } from './inv2Conversioni.ts';

const GIORNI = 28;

// Mezzanotte di Roma in millisecondi (ora legale o solare)
export const mezzanotte = (giorno) => {
  const utc = Date.parse(`${giorno}T00:00:00Z`);
  return [2, 1].map((ore) => utc - ore * 3600000).find((t) => giornoRoma(new Date(t)) === giorno);
};

// Ricette che non contano nel consumo dei negozi. Senza una scelta salvata vale la Pallina: le basi arrivano dal laboratorio
export const ricetteEscluse = (config, ricette) =>
  config.ricette_escluse_dal_consumo_negozio ?? ricette.filter((r) => r.nome_prodotto === 'Pallina').map((r) => r.id);

// Perché una quantità di ricetta non si converte nell'unità di conteggio
function motivoNonConvertito(unita, mp, imp) {
  const destinazione = imp.unita_conteggio;
  if (!destinazione) return 'manca l\'unità di conteggio';
  if (mp && destinazione === mp.unita_misura && aPesoOVolume(unita)) {
    if (!(mp.peso_dimensione_unita > 0)) return 'manca peso_dimensione_unita';
    if (!mp.unita_misura_peso) return 'manca unita_misura_peso';
  }
  if (aPesoOVolume(unita) && !aPesoOVolume(destinazione) && !(imp.peso_unita_conteggio_kg > 0)) return 'manca il peso di una unità di conteggio';
  return `${unita || 'unità mancante'} non si converte in ${destinazione}`;
}

// Vendite dei giorni indicati per giorno, store e prodotto. Se sono troppe per una sola lettura, i giorni si dividono a metà
async function leggiVendite(E, giorni, storeIds) {
  const { rows, truncated } = await E.VenditaPOS.aggregate({
    query: { data: { $in: giorni }, store_id: { $in: storeIds } },
    groupBy: ['data', 'store_id', 'chiave_prodotto', 'combo_non_scomposto'],
    sum: ['quantita']
  });
  if (!truncated) return rows;
  if (giorni.length === 1) throw new Error(`Troppe vendite da leggere per il ${giorni[0]}`);
  const meta = Math.ceil(giorni.length / 2);
  return [...await leggiVendite(E, giorni.slice(0, meta), storeIds), ...await leggiVendite(E, giorni.slice(meta), storeIds)];
}

// impostazioni = solo i prodotti inclusi in Inventario 2.0, escluse = id delle ricette che non contano nel consumo dei negozi,
// inizi = { store_id: giorno } da cui parte lo storico dello store: le vendite precedenti non contano
export async function consumiTeorici(E, { storeIds, now, ricette, materie, impostazioni, escluse = [], inizi = {} }) {
  // giorniPerStore: giorni che entrano nella media di ogni store. perPezzo e pezzi servono alla diagnostica
  const esito = { giorniPerStore: {}, perStore: {}, nonCollegate: 0, nonConvertiti: [], motivi: [], perPezzo: {}, pezzi: {}, vendite: [] };
  if (!storeIds.length) return esito;

  // Giorni interi con le vendite sincronizzate: oggi è escluso perché è ancora in corso
  const oggi = giornoRoma(new Date(now));
  const [log, collegamenti] = await Promise.all([
    fetchAll(E.SincronizzazioneVenditePOS, { data: { $gte: addGiorni(oggi, -GIORNI), $lt: oggi }, esito: 'ok' }, 'data'),
    fetchAll(E.ProdottoPOSRicetta)
  ]);
  const date = [...new Set(log.map((l) => l.data))];
  if (!date.length) return esito;

  // Poche letture a settimane intere: il raggruppamento accetta 4 campi, quindi le pizze si leggono a parte
  const [pagine, pizze] = await Promise.all([
    Promise.all(aBlocchi(date, 7).map((giorni) => leggiVendite(E, giorni, storeIds))),
    E.VenditaPOS.aggregate({ query: { data: { $in: date }, is_pizza: true }, groupBy: ['chiave_prodotto'] })
  ]);
  if (pizze.truncated) throw new Error('Troppi prodotti venduti da leggere');
  const sonoPizze = new Set(pizze.rows.map((r) => r.chiave_prodotto));
  const vendite = pagine.flat().map((v) => ({ ...v, is_pizza: sonoPizze.has(v.chiave_prodotto) }));
  esito.vendite = vendite;

  // Un giorno è sincronizzato per uno store solo se, oltre al log, ha almeno una vendita di quello store
  const conVendite = new Set(vendite.map((v) => `${v.store_id}|${v.data}`));
  storeIds.forEach((id) => {
    esito.giorniPerStore[id] = date
      .filter((g) => g >= (inizi[id] || '') && conVendite.has(`${id}|${g}`))
      .map((g) => ({ giorno: g, inizio: mezzanotte(g), fine: mezzanotte(addGiorni(g, 1)) }));
  });

  const perChiave = Object.fromEntries(collegamenti.map((c) => [c.chiave_prodotto, c]));
  const ricById = Object.fromEntries(ricette.map((r) => [r.id, r]));
  const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
  const mpById = Object.fromEntries(materie.map((m) => [m.id, m]));
  const mpByNome = Object.fromEntries(materie.map((m) => [m.nome_prodotto, m]));
  const esclusa = new Set(escluse);
  const nonConvertiti = new Map();
  // Un semilavorato che si conta non viene scomposto: le sue materie prime scendono solo con la produzione.
  // Anche le ricette escluse si fermano qui, e poi non contano.
  const fermati = (ricetta) => !!impById[ricetta.id] || esclusa.has(ricetta.id);

  // Consumo di un pezzo venduto: { item_id: quantità nell'unità di conteggio }
  const perPezzo = (c) => {
    const ricetta = ricById[c.item_id];
    let ingredienti = ricetta?.ingredienti;
    if (c.tipo === 'materia_prima') ingredienti = [{ materia_prima_id: c.item_id, quantita: 1, unita_misura: 'pezzi' }];
    else if (ricetta?.is_semilavorato && fermati(ricetta)) {
      ingredienti = [{ materia_prima_id: ricetta.id, quantita: ricetta.quantita_prodotta || 1, unita_misura: ricetta.unita_misura_prodotta || 'grammi' }];
    }
    // Per una materia prima quantita_per_pezzo è la quota di confezione (1 lattina = 1/24): qui torna in pezzi
    const perConfezione = c.tipo === 'materia_prima' && mpById[c.item_id]?.unita_per_confezione > 1 ? mpById[c.item_id].unita_per_confezione : 1;
    const consumo = {};
    // Senza elenco delle materie prime le quantità restano nell'unità della ricetta: le converte inConteggio
    Object.entries(espandiIngredienti(ingredienti, (c.quantita_per_pezzo || 1) * perConfezione, ricette, [], 0, fermati)).forEach(([key, voce]) => {
      if (esclusa.has(voce.id)) return;
      const mp = mpById[key] || mpByNome[key];
      const imp = impById[voce.id || mp?.id];
      if (!imp) return;
      let quantita = inConteggio(voce.quantita, voce.unita_misura, mp, imp);
      // Materia prima contata a lattine, bottiglie e simili: un pezzo venduto è una unità di conteggio
      if (quantita == null && c.tipo === 'materia_prima' && !aPesoOVolume(imp.unita_conteggio)) quantita = voce.quantita;
      if (quantita == null) nonConvertiti.set(imp.item_nome || voce.nome, motivoNonConvertito(voce.unita_misura, mp, imp));
      else consumo[imp.item_id] = (consumo[imp.item_id] || 0) + quantita;
    });
    return consumo;
  };

  const cache = esito.perPezzo;
  const aggiungi = (storeId, data, chiave, pezzi) => {
    const consumo = (cache[chiave] ||= perPezzo(perChiave[chiave]));
    const venduti = (esito.pezzi[storeId] ||= {});
    venduti[chiave] = (venduti[chiave] || 0) + pezzi;
    const store = (esito.perStore[storeId] ||= {});
    Object.entries(consumo).forEach(([itemId, quantita]) => {
      const giorni = (store[itemId] ||= {});
      giorni[data] = (giorni[data] || 0) + quantita * pezzi;
    });
  };

  // Pizze scomposte e collegate a una ricetta: { chiave: pezzi } per negozio e giorno, e per negozio su tutto il periodo
  const gustiGiorno = {};
  const gustiNegozio = {};
  const menu = [];
  vendite.forEach((v) => {
    if (v.data < (inizi[v.store_id] || '')) return;
    const pezzi = v.sum_quantita || 0;
    if (v.combo_non_scomposto) { menu.push({ ...v, pezzi }); return; }
    const c = perChiave[v.chiave_prodotto];
    if (!c) { esito.nonCollegate += pezzi; return; }
    if (c.tipo === 'ignora' || !c.item_id) return;
    aggiungi(v.store_id, v.data, v.chiave_prodotto, pezzi);
    if (!v.is_pizza || c.tipo !== 'ricetta') return;
    [(gustiGiorno[`${v.store_id}|${v.data}`] ||= {}), (gustiNegozio[v.store_id] ||= {})].forEach((gusti) => {
      gusti[v.chiave_prodotto] = (gusti[v.chiave_prodotto] || 0) + pezzi;
    });
  });

  // Menu non scomposti: distribuiti sui gusti venduti quel giorno nel negozio, altrimenti su quelli del periodo
  menu.forEach((m) => {
    const gusti = gustiGiorno[`${m.store_id}|${m.data}`] || gustiNegozio[m.store_id] || {};
    const totale = Object.values(gusti).reduce((s, q) => s + q, 0);
    if (!(totale > 0)) { esito.nonCollegate += m.pezzi; return; }
    Object.entries(gusti).forEach(([chiave, q]) => aggiungi(m.store_id, m.data, chiave, m.pezzi * (q / totale)));
  });
  esito.nonConvertiti = [...nonConvertiti.keys()];
  esito.motivi = [...nonConvertiti].map(([nome, motivo]) => ({ nome, motivo }));
  return esito;
}