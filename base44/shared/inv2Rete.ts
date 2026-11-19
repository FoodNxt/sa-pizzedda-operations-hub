// Consumo di rete: per i semilavorati del laboratorio che girano tra i negozi
import { addGiorni, consumoPeriodo, consumoTeorico, giornoRoma } from './inv2Calcolo.ts';

// serie = [{ moves, teorico }] dello stesso prodotto, una per negozio. dal = istante da cui contano i conteggi.
// Un giorno è valido se ogni negozio ha un conteggio di quel giorno o del giorno prima: il valore di rete è la somma
// dell'ultimo conteggio di ciascuno. Entrate e uscite registrate si sommano, il teorico è la somma dei teorici dei negozi
export function consumoRete(serie, dal = 0) {
  const perGiorno = serie.map((s) => {
    const giorni = {};
    s.moves.forEach((m) => { if (m.tipo === 'conteggio' && m.t >= dal) giorni[giornoRoma(new Date(m.t))] = m; });
    return giorni;
  });
  const conteggi = [...new Set(perGiorno.flatMap((giorni) => Object.keys(giorni)))]
    .sort()
    .map((g) => perGiorno.map((giorni) => giorni[g] || giorni[addGiorni(g, -1)]))
    .filter((ultimi) => ultimi.every(Boolean))
    .map((ultimi) => ({
      tipo: 'conteggio',
      quantita: ultimi.reduce((s, m) => s + m.quantita, 0),
      t: Math.max(...ultimi.map((m) => m.t))
    }));
  const movimenti = serie.flatMap((s) => s.moves.filter((m) => m.tipo !== 'conteggio'));
  const teorici = serie.map((s) => consumoTeorico(s.teorico));
  const periodo = consumoPeriodo(conteggi, movimenti, (da, a) => teorici.reduce((s, t) => s + t.tra(da, a), 0));
  return { ...periodo, punti: conteggi.length, teoricoMedio: teorici.reduce((s, t) => s + t.media, 0) };
}