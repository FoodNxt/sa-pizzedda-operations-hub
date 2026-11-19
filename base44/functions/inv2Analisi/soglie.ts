import { fetchAll, norm, ubicazioneDaKey } from '../../shared/inv2.ts';
import { GIORNO, giornoRoma } from '../../shared/inv2Calcolo.ts';
import { attesaMedia, giorniTraOrdini, medianeOrdini } from '../../shared/inv2Consegne.ts';

const r3 = (n) => Math.round(n * 1000) / 1000;

// Minimo e massimo suggeriti per le materie prime, per ubicazione (sola lettura).
// Minimo = consumo al giorno × (giorni di attesa medi + 1). Massimo = minimo + consumo × giorni tra ordini usati,
// almeno minimo + quantità d'ordine e almeno minimo + 1 unità d'ordine. I valori sono nell'unità di conteggio
export async function soglie(sr) {
  const E = sr.entities;
  const da = new Date(Date.now() - 90 * GIORNO).toISOString();
  const [impostazioni, giacenze, materie, fornitori, ordini] = await Promise.all([
    fetchAll(E.ImpostazioneInventario2, { incluso: true, item_tipo: 'materia_prima' }),
    fetchAll(E.GiacenzaStimata, { item_tipo: 'materia_prima' }),
    fetchAll(E.MateriePrime),
    fetchAll(E.Fornitore),
    fetchAll(E.OrdineFornitore, { data_invio: { $gte: da } })
  ]);
  const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
  const mpById = Object.fromEntries(materie.map((m) => [m.id, m]));
  const fornByNome = Object.fromEntries(fornitori.map((f) => [norm(f.ragione_sociale), f]));
  const mediane = medianeOrdini(ordini);
  const oggi = giornoRoma(new Date());

  const righe = giacenze.map((g) => {
    const imp = impById[g.item_id];
    const mp = mpById[g.item_id];
    if (!imp || !mp) return null;
    const f = fornByNome[norm(mp.fornitore)];
    const storeId = ubicazioneDaKey(g.ubicazione_key).store_id;
    const consumo = (g.consumo_medio_giorno || 0) + (g.uscite_registrate_giorno || 0);
    const fattore = imp.fattore_unita_ordine || 1;
    const riga = {
      item_id: g.item_id,
      ubicazione_key: g.ubicazione_key,
      nome: mp.nome_prodotto,
      fornitore: mp.fornitore || null,
      unita: imp.unita_conteggio || mp.unita_misura,
      unita_ordine: mp.unita_misura,
      fattore,
      consumo: r3(consumo),
      min: imp.min_per_ubicazione?.[g.ubicazione_key] ?? null,
      max: imp.max_per_ubicazione?.[g.ubicazione_key] ?? null
    };
    if (!f) return { ...riga, motivo: 'fornitore mancante' };
    const mediana = mediane[`${norm(f.ragione_sociale)}|${storeId}`] ?? null;
    const senzaGiorni = !f.giorni_consegna?.length;
    // Senza giorni di consegna si suggerisce solo con lo storico ordini e i giorni di attesa del fornitore
    if (senzaGiorni && (mediana == null || f.tempo_consegna_giorni == null)) return { ...riga, motivo: 'giorni di consegna mancanti' };
    if (!(consumo > 0)) return { ...riga, motivo: 'consumo mancante' };

    const attesa = attesaMedia(f, oggi);
    const tra = giorniTraOrdini(f, mediana);
    const quantitaOrdine = (mp.store_specific_quantita_ordine?.[storeId] || mp.quantita_ordine || 0) * fattore;
    const arrotonda = (q) => Math.max(1, Math.round(q / fattore)) * fattore;
    const min = arrotonda(consumo * (attesa + 1));
    const max = Math.max(arrotonda(min + consumo * tra.giorni), min + quantitaOrdine, min + fattore);
    return {
      ...riga,
      giorni_attesa: r3(attesa),
      giorni_tra_ordini: r3(tra.giorni),
      fonte: tra.fonte,
      mediana_storico: mediana,
      stima_da_storico: senzaGiorni,
      quantita_ordine: quantitaOrdine,
      min_suggerito: min,
      max_suggerito: arrotonda(max)
    };
  }).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  return { righe };
}