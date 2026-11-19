// Teorico delle materie prime usate nei semilavorati che si contano, e giorni su cui si fa la media
import { aPesoOVolume, inBase, inConteggio } from './inv2Conversioni.ts';

// Senza produzioni registrate: teorico della materia prima = teorico del semilavorato × (quantità dell'ingrediente / quantità prodotta).
// Va al negozio che ha venduto se conta la materia prima, altrimenti allo store del laboratorio.
// Ritorna { chiave della coppia: [{ storeId, perGiorno }] }
export function teoriciDaSemilavorati({ coppie, teorici, ricette, materie, impostazioni, labStoreId }) {
  const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
  const mpById = Object.fromEntries(materie.map((m) => [m.id, m]));
  const perK = Object.fromEntries(coppie.map((c) => [c.k, c]));
  const esito = {};
  ricette.filter((r) => r.is_semilavorato && impById[r.id]).forEach((semi) => {
    // Quantità prodotta dalla ricetta, nell'unità di conteggio del semilavorato
    const conteggio = impById[semi.id].unita_conteggio;
    const prodotta = semi.unita_misura_prodotta || 'grammi';
    const quantita = semi.quantita_prodotta || 1;
    const lotto = aPesoOVolume(conteggio) && aPesoOVolume(prodotta) ? inBase(quantita, prodotta) / inBase(1, conteggio) : conteggio === prodotta ? quantita : null;
    if (!lotto) return;
    (semi.ingredienti || []).forEach((ing) => {
      const imp = impById[ing.materia_prima_id];
      const mp = mpById[ing.materia_prima_id];
      if (!imp || !mp) return;
      const perUnita = inConteggio(ing.quantita / lotto, ing.unita_misura, mp, imp);
      if (perUnita == null) return;
      Object.entries(teorici.perStore).forEach(([storeId, items]) => {
        if (!items[semi.id]) return;
        const destinazione = perK[`${storeId}|${imp.item_id}`] || coppie.find((c) => c.p.imp.item_id === imp.item_id && c.u.store_id === labStoreId);
        if (!destinazione) return;
        (esito[destinazione.k] ||= []).push({
          storeId,
          perGiorno: Object.fromEntries(Object.entries(items[semi.id]).map(([giorno, q]) => [giorno, q * perUnita]))
        });
      });
    });
  });
  return esito;
}

// Teorico di un prodotto in una ubicazione: somma delle vendite dirette e di quelle arrivate dai semilavorati.
// La media parte dal primo giorno con vendite che usano il prodotto, sui giorni sincronizzati di tutti i negozi coinvolti.
// Con le produzioni registrate la parte dai semilavorati non conta: la materia prima scende con gli scarichi.
export function componiTeorico(giorniPerStore, storeId, diretto, derivati, produzioni) {
  const parti = [...(diretto ? [{ storeId, perGiorno: diretto }] : []), ...(produzioni ? [] : derivati)];
  const stores = [...new Set(parti.map((p) => p.storeId))];
  let giorni = giorniPerStore[stores[0] ?? storeId] || [];
  stores.slice(1).forEach((id) => {
    const comuni = new Set((giorniPerStore[id] || []).map((g) => g.giorno));
    giorni = giorni.filter((g) => comuni.has(g.giorno));
  });
  const perGiorno = {};
  parti.forEach((p) => Object.entries(p.perGiorno).forEach(([giorno, q]) => { perGiorno[giorno] = (perGiorno[giorno] || 0) + q; }));
  const primo = giorni.find((g) => perGiorno[g.giorno] > 0);
  if (primo) giorni = giorni.filter((g) => g.giorno >= primo.giorno);
  const daSemilavorato = derivati.length > 0;
  // Con vendite dirette e semilavorati insieme vale la parte più grande
  const totale = (lista) => lista.reduce((s, p) => s + giorni.reduce((t, g) => t + (p.perGiorno[g.giorno] || 0), 0), 0);
  const soprattuttoDerivato = daSemilavorato && totale(derivati) >= (diretto ? totale([{ perGiorno: diretto }]) : 0);
  return {
    giorni,
    perGiorno,
    dal: primo ? primo.giorno : null,
    // Meno di 7 giorni di vendite: la media è provvisoria
    provvisorio: !!primo && giorni.length < 7,
    fonte: daSemilavorato && produzioni ? 'produzioni' : soprattuttoDerivato ? 'semilavorato' : primo ? 'vendite' : null
  };
}