// Consumo di rete: per i semilavorati che girano tra i negozi senza trasporti registrati
import { consumoPeriodo, consumoTeorico, giornoRoma } from './inv2Calcolo.ts';

// serie = [{ moves, teorico }] dello stesso prodotto, una per negozio.
// Un giorno entra nel calcolo solo se tutti i negozi hanno contato: il valore di rete è la somma dei loro conteggi.
// Entrate e uscite registrate si sommano, il teorico è la somma dei teorici dei negozi
export function consumoRete(serie) {
  const perGiorno = serie.map((s) => {
    const giorni = {};
    s.moves.forEach((m) => { if (m.tipo === 'conteggio') giorni[giornoRoma(new Date(m.t))] = m; });
    return giorni;
  });
  const conteggi = Object.keys(perGiorno[0])
    .filter((g) => perGiorno.every((giorni) => giorni[g]))
    .sort()
    .map((g) => ({
      tipo: 'conteggio',
      quantita: perGiorno.reduce((s, giorni) => s + giorni[g].quantita, 0),
      t: Math.max(...perGiorno.map((giorni) => giorni[g].t))
    }));
  const movimenti = serie.flatMap((s) => s.moves.filter((m) => m.tipo !== 'conteggio'));
  const teorici = serie.map((s) => consumoTeorico(s.teorico));
  const periodo = consumoPeriodo(conteggi, movimenti, (da, a) => teorici.reduce((s, t) => s + t.tra(da, a), 0));
  return { ...periodo, punti: conteggi.length, teoricoMedio: teorici.reduce((s, t) => s + t.media, 0) };
}