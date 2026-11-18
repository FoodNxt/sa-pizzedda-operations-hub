// Ricevimenti di Inventario 2.0 da un ordine fornitore completato
import { ubicazioneDaKey, ubicazionePer } from './inv2.ts';

export const righeRicevute = (ordine) => (ordine.prodotti || []).filter((p) => p.prodotto_id && p.quantita_ricevuta > 0);

// Un movimento di ricevimento per ogni prodotto ricevuto, nell'unità di conteggio
export function movimentiRicevimento(ordine, materieIds, impById, labStoreId) {
  const data = ordine.data_completamento ? new Date(ordine.data_completamento).toISOString() : new Date().toISOString();
  return righeRicevute(ordine).map((p) => {
    const imp = impById[p.prodotto_id];
    const ubicazione = ordine.ubicazione_key
      ? ubicazioneDaKey(ordine.ubicazione_key)
      : ubicazionePer(ordine.store_id, imp?.laboratorio, labStoreId);
    return {
      ...ubicazione,
      item_tipo: materieIds.has(p.prodotto_id) ? 'materia_prima' : 'semilavorato',
      item_id: p.prodotto_id,
      item_nome: p.nome_prodotto,
      tipo: 'ricevimento',
      quantita: p.quantita_ricevuta * (imp?.fattore_unita_ordine || 1),
      unita: imp?.unita_conteggio || p.unita_misura,
      data_movimento: data,
      utente_email: ordine.completato_da,
      fonte: 'ordine_fornitore',
      riferimento_id: ordine.id
    };
  });
}