// Conteggio di verifica dell'admin: confronto con la stima del sistema e con l'ultimo conteggio dei dipendenti
import { fetchAll } from './inv2.ts';
import { GIORNO, calcolaGiacenza, teoricoOrario } from './inv2Calcolo.ts';
import { preparaCalcolo } from './inv2Ricalcolo.ts';

const r3 = (n) => (n == null ? null : Math.round(n * 1000) / 1000);
const pct = (differenza, base) => (differenza != null && base > 0 ? Math.round((differenza / base) * 1000) / 10 : null);

// Da chiamare prima di salvare i conteggi: la stima è senza la verifica.
// conteggi = [{ item_id, quantita, ora }], perId = giacenze dell'ubicazione per item_id
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

  return conteggi.map((c) => {
    const g = perId[c.item_id];
    const coppia = perItem[c.item_id];
    // Stima e confronto valgono all'ora in cui il prodotto è stato confermato
    const t = c.ora ? Date.parse(c.ora) : now;
    const stima = coppia ? calcolaGiacenza(coppia.moves, t, soglia, coppia.teorico, coppia.rete, coppia.minimo, coppia.ordineAperto).giacenza : null;
    // Ultimo conteggio dei dipendenti prima della verifica, senza quelli in un'altra unità
    const ultimo = precedenti.find((m) => m.item_id === c.item_id && !m.unita_sospetta && !m.unita_precedente && Date.parse(m.data_movimento) < t);
    // Atteso = conteggio del dipendente − teorico delle vendite tra i due orari
    const sottratto = ultimo && coppia ? teoricoOrario(coppia.teorico).tra(Date.parse(ultimo.data_movimento), t) : null;
    const atteso = ultimo ? Math.max(0, ultimo.quantita - (sottratto?.quantita || 0)) : null;
    const daStima = stima == null ? null : c.quantita - stima;
    const daAtteso = ultimo ? c.quantita - atteso : null;
    return {
      item_id: c.item_id,
      nome: g.item_nome,
      unita: g.unita || '',
      quantita: c.quantita,
      ora: c.ora || null,
      stima: r3(stima),
      differenza_stima: r3(daStima),
      differenza_stima_pct: pct(daStima, stima),
      ultimo: ultimo ? { quantita: ultimo.quantita, nome: ultimo.utente_nome || ultimo.utente_email || null, data: ultimo.data_movimento } : null,
      teorico_sottratto: r3(sottratto?.quantita),
      orario_stimato: !!sottratto?.stimato,
      atteso: r3(atteso),
      differenza_ultimo: r3(daAtteso),
      differenza_ultimo_pct: pct(daAtteso, atteso)
    };
  });
}