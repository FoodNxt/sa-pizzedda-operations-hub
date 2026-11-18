// Consumo teorico dalle vendite del POS: vendite × ricetta, per store, prodotto e giorno
import { aBlocchi, fetchAll } from './inv2.ts';
import { addGiorni, giornoRoma } from './inv2Calcolo.ts';
import { espandiIngredienti, inConteggio } from './inv2Conversioni.ts';

const GIORNI = 28;

// Mezzanotte di Roma in millisecondi (ora legale o solare)
const mezzanotte = (giorno) => {
  const utc = Date.parse(`${giorno}T00:00:00Z`);
  return [2, 1].map((ore) => utc - ore * 3600000).find((t) => giornoRoma(new Date(t)) === giorno);
};

// impostazioni = solo i prodotti inclusi in Inventario 2.0
export async function consumiTeorici(E, { storeIds, now, ricette, materie, impostazioni }) {
  const esito = { giorni: [], perStore: {}, nonCollegate: 0, nonConvertiti: [] };
  if (!storeIds.length) return esito;

  // Giorni interi con le vendite sincronizzate: oggi è escluso perché è ancora in corso
  const oggi = giornoRoma(new Date(now));
  const [log, collegamenti] = await Promise.all([
    fetchAll(E.SincronizzazioneVenditePOS, { data: { $gte: addGiorni(oggi, -GIORNI), $lt: oggi }, esito: 'ok' }, 'data'),
    fetchAll(E.ProdottoPOSRicetta)
  ]);
  const date = [...new Set(log.map((l) => l.data))];
  if (!date.length) return esito;
  esito.giorni = date.map((g) => ({ giorno: g, inizio: mezzanotte(g), fine: mezzanotte(addGiorni(g, 1)) }));

  const vendite = [];
  for (const blocco of aBlocchi(date, 6)) {
    const pagine = await Promise.all(blocco.map(async (data) => {
      const { rows, truncated } = await E.VenditaPOS.aggregate({
        query: { data, store_id: { $in: storeIds } },
        groupBy: ['store_id', 'chiave_prodotto', 'is_pizza', 'combo_non_scomposto'],
        sum: ['quantita']
      });
      if (truncated) throw new Error(`Troppe vendite da leggere per il ${data}`);
      return rows.map((r) => ({ ...r, data }));
    }));
    vendite.push(...pagine.flat());
  }

  const perChiave = Object.fromEntries(collegamenti.map((c) => [c.chiave_prodotto, c]));
  const ricById = Object.fromEntries(ricette.map((r) => [r.id, r]));
  const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
  const mpById = Object.fromEntries(materie.map((m) => [m.id, m]));
  const mpByNome = Object.fromEntries(materie.map((m) => [m.nome_prodotto, m]));
  const nonConvertiti = new Set();
  // Un semilavorato che si conta non viene scomposto: le sue materie prime scendono solo con la produzione
  const fermati = (ricetta) => !!impById[ricetta.id];

  // Consumo di un pezzo venduto: { item_id: quantità nell'unità di conteggio }
  const perPezzo = (c) => {
    const ricetta = ricById[c.item_id];
    let ingredienti = ricetta?.ingredienti;
    if (c.tipo === 'materia_prima') ingredienti = [{ materia_prima_id: c.item_id, quantita: 1, unita_misura: 'pezzi' }];
    else if (ricetta?.is_semilavorato && fermati(ricetta)) {
      ingredienti = [{ materia_prima_id: ricetta.id, quantita: ricetta.quantita_prodotta || 1, unita_misura: ricetta.unita_misura_prodotta || 'grammi' }];
    }
    const consumo = {};
    // Senza elenco delle materie prime le quantità restano nell'unità della ricetta: le converte inConteggio
    Object.entries(espandiIngredienti(ingredienti, c.quantita_per_pezzo || 1, ricette, [], 0, fermati)).forEach(([key, voce]) => {
      const mp = mpById[key] || mpByNome[key];
      const imp = impById[voce.id || mp?.id];
      if (!imp) return;
      const quantita = inConteggio(voce.quantita, voce.unita_misura, mp, imp);
      if (quantita == null) nonConvertiti.add(imp.item_nome || voce.nome);
      else consumo[imp.item_id] = (consumo[imp.item_id] || 0) + quantita;
    });
    return consumo;
  };

  const cache = {};
  const aggiungi = (storeId, data, chiave, pezzi) => {
    const consumo = (cache[chiave] ||= perPezzo(perChiave[chiave]));
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
  esito.nonConvertiti = [...nonConvertiti];
  return esito;
}