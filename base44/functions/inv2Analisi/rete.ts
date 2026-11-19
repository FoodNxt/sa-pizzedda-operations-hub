import { GIORNO, calcolaGiacenza } from '../../shared/inv2Calcolo.ts';
import { preparaCalcolo } from '../../shared/inv2Ricalcolo.ts';
import { consumoRete } from '../../shared/inv2Rete.ts';

const arrotonda = (n, decimali) => (n == null ? null : Math.round(n * 10 ** decimali) / 10 ** decimali);

// Riga "rete" dei semilavorati trasportabili senza produzioni e trasporti registrati: tutti i negozi accesi insieme
export async function rete(sr) {
  const { now, soglia, coppie } = await preparaCalcolo(sr);
  const perItem = {};
  coppie.filter((c) => c.rete).forEach((c) => (perItem[c.p.imp.item_id] ||= []).push(c));
  const righe = Object.values(perItem).map((lista) => {
    const c = consumoRete(lista, now - 28 * GIORNO);
    const giacenze = lista.map((x) => calcolaGiacenza(x.moves, now, soglia, x.teorico, x.rete, x.minimo, x.ordineAperto).giacenza).filter((g) => g != null);
    const confrontabile = c.valido && c.teorico > 0;
    return {
      // Senza produzioni registrate lo scarto è solo indicativo e non corregge il teorico
      indicativo: !lista[0].rete.produzioni,
      item_id: lista[0].p.imp.item_id,
      nome: lista[0].p.nome,
      unita: lista[0].p.imp.unita_conteggio || '',
      negozi: lista.length,
      giacenza: giacenze.length ? arrotonda(giacenze.reduce((s, g) => s + g, 0), 2) : null,
      conteggi: c.valido ? arrotonda(c.consumo, 3) : null,
      teorico: arrotonda(c.valido ? c.teorico : c.teoricoMedio, 3),
      fattore: confrontabile ? arrotonda(c.consumo / c.teorico, 2) : null,
      scarto_pct: confrontabile && c.misurabile ? arrotonda(((c.consumo - c.teorico) / c.teorico) * 100, 1) : null,
      giorni: arrotonda(c.giorni, 1),
      punti: c.punti
    };
  });
  return { righe: righe.sort((a, b) => a.nome.localeCompare(b.nome, 'it')) };
}