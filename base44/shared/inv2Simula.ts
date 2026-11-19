// Modalità prova: cosa risulterebbe salvando questi conteggi adesso. Non scrive niente.
import { calcolaGiacenza } from './inv2Calcolo.ts';
import { preparaCalcolo } from './inv2Ricalcolo.ts';

const r3 = (n) => (n == null ? null : Math.round(n * 1000) / 1000);

// item_id dei conteggi che, salvati adesso, sarebbero sospetti. conteggi = [{ item_id, quantita }]
export async function conteggiSospetti(sr, key, conteggi) {
  const { now, soglia, coppie } = await preparaCalcolo(sr, [key]);
  const perItem = Object.fromEntries(coppie.map((c) => [c.p.imp.item_id, c]));
  return conteggi
    .filter((c) => {
      const coppia = perItem[c.item_id];
      return coppia && calcolaGiacenza(coppia.moves, now, soglia, coppia.teorico, coppia.rete).sospetto(c.quantita);
    })
    .map((c) => c.item_id);
}

// conteggi = [{ item_id, quantita }], perId = giacenze dell'ubicazione per item_id
export async function simulaConteggi(sr, key, conteggi, perId) {
  const { now, oggi, soglia, coppie } = await preparaCalcolo(sr, [key]);
  const perItem = Object.fromEntries(coppie.map((c) => [c.p.imp.item_id, c]));

  return conteggi.map((c) => {
    const g = perId[c.item_id];
    const riga = {
      item_id: c.item_id,
      nome: g.item_nome,
      unita: g.unita || '',
      quantita: c.quantita,
      giacenza_stimata: null,
      differenza: null,
      differenza_pct: null,
      affidabilita: 'nessun_dato',
      prossimo_conteggio_data: null,
      prossimo_conteggio_motivo: null
    };
    const coppia = perItem[c.item_id];
    if (!coppia) return riga;

    // Stima di adesso, poi lo stesso calcolo come se il conteggio fosse appena stato fatto
    const stima = calcolaGiacenza(coppia.moves, now, soglia, coppia.teorico, coppia.rete).giacenza;
    const dopo = calcolaGiacenza([...coppia.moves, { tipo: 'conteggio', quantita: c.quantita, t: now }], now, soglia, coppia.teorico, coppia.rete);
    const prossimo = coppia.prossimo(dopo, oggi);
    const differenza = stima == null ? null : Math.abs(c.quantita - stima);
    return {
      ...riga,
      giacenza_stimata: r3(stima),
      differenza: r3(differenza),
      differenza_pct: stima > 0 ? Math.round((differenza / stima) * 1000) / 10 : null,
      affidabilita: dopo.affidabilita,
      prossimo_conteggio_data: prossimo.data,
      prossimo_conteggio_motivo: prossimo.motivo
    };
  });
}