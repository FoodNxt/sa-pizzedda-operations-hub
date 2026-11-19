// Giorni di consegna dei fornitori e frequenza reale degli ordini
import { GIORNO, addGiorni, giornoRoma } from './inv2Calcolo.ts';
import { norm } from './inv2.ts';

const GIORNI = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
export const FREQUENZA_MINIMA = 3;

// Primo giorno di consegna utile dopo il tempo di consegna
export function prossimaConsegna(f, oggi) {
  let d = addGiorni(oggi, f.tempo_consegna_giorni || 0);
  const giorni = f.giorni_consegna || [];
  if (!giorni.length) return d;
  while (!giorni.includes(GIORNI[new Date(`${d}T00:00:00Z`).getUTCDay()])) d = addGiorni(d, 1);
  return d;
}

// Giorni di attesa medi ordinando in ognuno dei sette giorni della settimana: non cambiano da un giorno all'altro
export function attesaMedia(f, oggi) {
  let totale = 0;
  for (let i = 0; i < 7; i++) {
    const d = addGiorni(oggi, i);
    totale += (Date.parse(prossimaConsegna(f, d)) - Date.parse(d)) / GIORNO;
  }
  return totale / 7;
}

// Mediana dei giorni tra due ordini consecutivi, per fornitore e store {fornitore|store_id: giorni}.
// Più ordini nello stesso giorno contano una volta
export function medianeOrdini(ordini) {
  const giorni = {};
  ordini.forEach((o) => {
    const quando = o.data_invio || o.created_date;
    if (quando) (giorni[`${norm(o.fornitore)}|${o.store_id}`] ||= new Set()).add(giornoRoma(new Date(quando)));
  });
  const out = {};
  Object.entries(giorni).forEach(([k, set]) => {
    const date = [...set].sort();
    if (date.length < 2) return;
    const salti = date.slice(1).map((d, i) => (Date.parse(d) - Date.parse(date[i])) / GIORNO).sort((a, b) => a - b);
    const m = Math.floor(salti.length / 2);
    out[k] = salti.length % 2 ? salti[m] : (salti[m - 1] + salti[m]) / 2;
  });
  return out;
}

// Giorni tra ordini usati: il maggiore tra storico, frequenza minima del fornitore e intervallo tra due consegne
export function giorniTraOrdini(f, mediana) {
  const scelte = [
    ['storico', mediana ?? 0],
    ['minima impostata', f.frequenza_ordini_minima_giorni ?? FREQUENZA_MINIMA],
    ['consegne', f.giorni_consegna?.length ? 7 / f.giorni_consegna.length : 0]
  ];
  const [fonte, giorni] = scelte.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { fonte, giorni };
}