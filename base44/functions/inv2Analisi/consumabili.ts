import { fetchAll } from '../../shared/inv2.ts';
import { GIORNO, addGiorni, giornoRoma } from '../../shared/inv2Calcolo.ts';

const ETICHETTE = {
  giornaliera: 'giornaliera',
  due_volte_settimana: 'due volte a settimana',
  settimanale: 'settimanale',
  ogni_due_settimane: 'ogni due settimane',
  mensile: 'mensile'
};
const MARTEDI = 2;
const VENERDI = 5;

// Frequenza dalla metà dell'intervallo medio tra due ordini
function ricorrenzaDa(meta) {
  if (meta <= 1.5) return 'giornaliera';
  if (meta <= 4) return 'due_volte_settimana';
  if (meta <= 10) return 'settimanale';
  if (meta <= 21) return 'ogni_due_settimane';
  return 'mensile';
}

function proposta(ricorrenza, oggi) {
  let martedi = oggi;
  while (new Date(`${martedi}T00:00:00Z`).getUTCDay() !== MARTEDI) martedi = addGiorni(martedi, 1);
  if (ricorrenza === 'due_volte_settimana') return { attivo: true, ricorrenza, giorni_settimana: [MARTEDI, VENERDI] };
  if (ricorrenza === 'settimanale') return { attivo: true, ricorrenza, giorni_settimana: [MARTEDI] };
  if (ricorrenza === 'ogni_due_settimane') return { attivo: true, ricorrenza, giorni_settimana: [MARTEDI], data_partenza: martedi };
  if (ricorrenza === 'mensile') {
    // giorno_mese arriva fino a 28
    while (Number(martedi.slice(8)) > 28) martedi = addGiorni(martedi, 7);
    return { attivo: true, ricorrenza, giorno_mese: Number(martedi.slice(8)) };
  }
  return { attivo: true, ricorrenza };
}

export async function consumabili(sr) {
  const E = sr.entities;
  const dal = new Date(Date.now() - 90 * GIORNO).toISOString();
  const [tutte, ordini, disattivate, ricetteDisattivate] = await Promise.all([
    fetchAll(E.ImpostazioneInventario2, { consumabile: true }),
    fetchAll(E.OrdineFornitore, { status: 'completato', data_invio: { $gte: dal } }, 'data_invio'),
    fetchAll(E.MateriePrime, { attivo: false }),
    fetchAll(E.Ricetta, { attivo: false })
  ]);
  // I prodotti disattivati non si propongono
  const spenti = new Set([...disattivate, ...ricetteDisattivate].map((p) => p.id));
  const impostazioni = tutte.filter((imp) => !spenti.has(imp.item_id));

  // Date degli ordini per prodotto e store, in ordine di tempo
  const date = {};
  ordini.forEach((o) => {
    const t = Date.parse(o.data_invio);
    new Set((o.prodotti || []).map((p) => p.prodotto_id)).forEach((id) => ((date[id] ||= {})[o.store_id] ||= []).push(t));
  });

  const oggi = giornoRoma(new Date());
  const prodotti = impostazioni.map((imp) => {
    const perStore = Object.values(date[imp.item_id] || {});
    const intervalli = perStore.flatMap((ts) => ts.slice(1).map((t, i) => (t - ts[i]) / GIORNO));
    const media = intervalli.length ? intervalli.reduce((s, n) => s + n, 0) / intervalli.length : null;
    const ricorrenza = media == null ? 'mensile' : ricorrenzaDa(media / 2);
    return {
      id: imp.id,
      nome: imp.item_nome,
      ordini: perStore.reduce((s, ts) => s + ts.length, 0),
      frequenza: ETICHETTE[ricorrenza],
      motivo: media == null ? 'meno di 2 ordini negli ultimi 90 giorni' : `riordinato in media ogni ${Math.round(media)} giorni`,
      conteggio_fisso: proposta(ricorrenza, oggi),
      attuale: imp.conteggio_fisso?.attivo ? ETICHETTE[imp.conteggio_fisso.ricorrenza] || imp.conteggio_fisso.ricorrenza : null
    };
  });
  return { prodotti: prodotti.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'it')) };
}