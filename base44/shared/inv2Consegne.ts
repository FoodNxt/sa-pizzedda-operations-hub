// Giorni di consegna dei fornitori e frequenza reale degli ordini
import { GIORNO, addGiorni, giornoRoma } from './inv2Calcolo.ts';
import { norm } from './inv2.ts';

const GIORNI = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
export const FREQUENZA_MINIMA = 3;
export const ORDINI_PER_STORICO = 3;
export const GIORNI_TRA_ORDINI_MAX = 30;

// Giorni di sicurezza nel minimo suggerito, per categoria
export const SICUREZZA_DEFAULT = {
  'Ortofrutta': 1,
  'Ingredienti base': 1,
  'semilavorato': 1,
  'Ingredienti pronti': 3,
  'Bevande': 3,
  'Dolci': 3,
  'Angolo di Sardegna': 3,
  'Packaging': 3,
  'Consumabili': 3,
  'Pulizia': 3
};

// Unità d'ordine intere: per eccesso solo se la parte decimale supera 0,25, altrimenti per difetto
export function arrotondaOrdine(x) {
  const v = Math.round(x * 1e6) / 1e6;
  const giu = Math.floor(v);
  return v - giu > 0.25 ? giu + 1 : giu;
}

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
// Più ordini nello stesso giorno contano una volta; servono almeno 3 ordini
export function medianeOrdini(ordini) {
  const giorni = {};
  ordini.forEach((o) => {
    const quando = o.data_invio || o.created_date;
    if (quando) (giorni[`${norm(o.fornitore)}|${o.store_id}`] ||= new Set()).add(giornoRoma(new Date(quando)));
  });
  const out = {};
  Object.entries(giorni).forEach(([k, set]) => {
    const date = [...set].sort();
    if (date.length < ORDINI_PER_STORICO) return;
    const salti = date.slice(1).map((d, i) => (Date.parse(d) - Date.parse(date[i])) / GIORNO).sort((a, b) => a - b);
    const m = Math.floor(salti.length / 2);
    out[k] = salti.length % 2 ? salti[m] : (salti[m - 1] + salti[m]) / 2;
  });
  return out;
}

// Giorni tra ordini usati: il maggiore tra storico (se c'è), frequenza minima del fornitore e intervallo tra due consegne, mai oltre 30
export function giorniTraOrdini(f, mediana) {
  const scelte = [
    ...(mediana != null ? [['storico', mediana]] : []),
    ['minima impostata', f.frequenza_ordini_minima_giorni ?? FREQUENZA_MINIMA],
    ['consegne', f.giorni_consegna?.length ? 7 / f.giorni_consegna.length : 0]
  ];
  const [fonte, giorni] = scelte.reduce((a, b) => (b[1] > a[1] ? b : a));
  const oltre = giorni > GIORNI_TRA_ORDINI_MAX;
  return { fonte: oltre ? `${fonte}, limite ${GIORNI_TRA_ORDINI_MAX}` : fonte, giorni: oltre ? GIORNI_TRA_ORDINI_MAX : giorni, storico_insufficiente: mediana == null };
}