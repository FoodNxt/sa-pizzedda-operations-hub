import { fetchAll, norm } from '../../shared/inv2.ts';
import { giornoRoma } from '../../shared/inv2Calcolo.ts';
import { giorniAllaConsegna } from '../../shared/inv2Consegne.ts';

const r3 = (n) => Math.round(n * 1000) / 1000;

// Minimo e massimo suggeriti per le materie prime, per ubicazione (sola lettura).
// Minimo = consumo al giorno × (giorni alla prossima consegna + 1). Massimo = minimo + consumo × giorni medi tra due consegne.
// Arrotondati all'unità d'ordine, mai sotto una. I valori sono nell'unità di conteggio
export async function soglie(sr) {
  const E = sr.entities;
  const [impostazioni, giacenze, materie, fornitori] = await Promise.all([
    fetchAll(E.ImpostazioneInventario2, { incluso: true, item_tipo: 'materia_prima' }),
    fetchAll(E.GiacenzaStimata, { item_tipo: 'materia_prima' }),
    fetchAll(E.MateriePrime),
    fetchAll(E.Fornitore)
  ]);
  const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
  const mpById = Object.fromEntries(materie.map((m) => [m.id, m]));
  const fornByNome = Object.fromEntries(fornitori.map((f) => [norm(f.ragione_sociale), f]));
  const oggi = giornoRoma(new Date());

  const righe = giacenze.map((g) => {
    const imp = impById[g.item_id];
    const mp = mpById[g.item_id];
    if (!imp || !mp) return null;
    const f = fornByNome[norm(mp.fornitore)];
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
    if (!f?.giorni_consegna?.length) return { ...riga, motivo: 'giorni di consegna mancanti' };
    if (!(consumo > 0)) return { ...riga, motivo: 'consumo mancante' };
    const attesa = giorniAllaConsegna(f, oggi);
    const intervallo = 7 / f.giorni_consegna.length;
    const arrotonda = (q) => Math.max(1, Math.round(q / fattore)) * fattore;
    const minimo = consumo * (attesa + 1);
    return { ...riga, giorni_consegna: attesa, giorni_tra_consegne: r3(intervallo), min_suggerito: arrotonda(minimo), max_suggerito: arrotonda(minimo + consumo * intervallo) };
  }).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  return { righe };
}