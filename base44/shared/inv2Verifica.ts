// Conteggio di verifica dell'admin: confronto con la stima del sistema e con l'ultimo conteggio dei dipendenti
import { fetchAll } from './inv2.ts';
import { GIORNO, calcolaGiacenza } from './inv2Calcolo.ts';
import { preparaCalcolo } from './inv2Ricalcolo.ts';

const r3 = (n) => (n == null ? null : Math.round(n * 1000) / 1000);
const pct = (differenza, base) => (differenza != null && base > 0 ? Math.round((differenza / base) * 1000) / 10 : null);

// Da chiamare prima di salvare i conteggi: la stima è quella di adesso, senza la verifica.
// conteggi = [{ item_id, quantita }], perId = giacenze dell'ubicazione per item_id
export async function risultatoVerifica(sr, key, conteggi, perId) {
  const [{ now, soglia, coppie }, precedenti] = await Promise.all([
    preparaCalcolo(sr, [key]),
    fetchAll(sr.entities.MovimentoMagazzino, {
      ubicazione_key: key,
      tipo: 'conteggio',
      fonte: { $ne: 'verifica_admin' },
      item_id: { $in: conteggi.map((c) => c.item_id) },
      data_movimento: { $gte: new Date(Date.now() - 60 * GIORNO).toISOString() }
    }, '-data_movimento')
  ]);
  const perItem = Object.fromEntries(coppie.map((c) => [c.p.imp.item_id, c]));
  // Ultimo conteggio dei dipendenti per prodotto, senza quelli in un'altra unità
  const ultimi = {};
  precedenti.forEach((m) => {
    if (!m.unita_sospetta && !m.unita_precedente) ultimi[m.item_id] ||= m;
  });

  return conteggi.map((c) => {
    const g = perId[c.item_id];
    const coppia = perItem[c.item_id];
    // La stima è quella dell'ora in cui il prodotto è stato confermato
    const stima = coppia ? calcolaGiacenza(coppia.moves, c.ora ? Date.parse(c.ora) : now, soglia, coppia.teorico, coppia.rete, coppia.minimo, coppia.ordineAperto).giacenza : null;
    const ultimo = ultimi[c.item_id];
    const daStima = stima == null ? null : c.quantita - stima;
    const daUltimo = ultimo ? c.quantita - ultimo.quantita : null;
    return {
      item_id: c.item_id,
      nome: g.item_nome,
      unita: g.unita || '',
      quantita: c.quantita,
      stima: r3(stima),
      differenza_stima: r3(daStima),
      differenza_stima_pct: pct(daStima, stima),
      ultimo: ultimo ? { quantita: ultimo.quantita, nome: ultimo.utente_nome || ultimo.utente_email || null, data: ultimo.data_movimento } : null,
      differenza_ultimo: r3(daUltimo),
      differenza_ultimo_pct: pct(daUltimo, ultimo?.quantita)
    };
  });
}