import { numeroIt } from '@/components/trasporti/trasportiUtils';

export const euro = (n) => `${numeroIt(n, 2)} €`;

export const chiaveGruppo = (g) => `${g.ubicazione_key}|${g.fornitore.id}`;

export const totaleNetto = (prodotti, qta) => prodotti.reduce((s, p) => s + p.prezzo_unitario * (qta[p.item_id] || 0), 0);

// Giorni di copertura: oggi (ordinati non passato) oppure dopo l'arrivo dell'ordine e di quello in arrivo
export function copertura(p, ordinati) {
  if (p.giacenza == null || !(p.consumo_giorno > 0)) return null;
  const extra = ordinati == null ? 0 : p.in_arrivo + ordinati * p.fattore;
  return (p.giacenza + extra) / p.consumo_giorno;
}

export function testoEmail(gruppo, ubicazione, righe, qta) {
  const elenco = righe.map((p) => `• ${p.nome}: ${qta[p.item_id]} ${p.unita_ordine}`).join('\n');
  const consegna = ubicazione.laboratorio ? `\n\nConsegna: laboratorio presso ${ubicazione.store_name}` : '';
  return {
    subject: `Ordine Sa Pizzedda - ${ubicazione.store_name}`,
    body: `Gentile ${gruppo.fornitore.referente || gruppo.fornitore.ragione_sociale},

Vi inviamo il seguente ordine per il locale ${ubicazione.store_name}:

${elenco}${consegna}

Grazie per la collaborazione.

Cordiali saluti,
Sa Pizzedda`
  };
}

export function buildOrdine(gruppo, ubicazione, righe, qta) {
  const prodotti = righe.map((p) => ({
    prodotto_id: p.item_id,
    nome_prodotto: p.nome,
    quantita_ordinata: qta[p.item_id],
    unita_misura: p.unita_ordine,
    prezzo_unitario: p.prezzo_unitario,
    iva_percentuale: p.iva_percentuale,
    quantita_ricevuta: 0
  }));
  return {
    store_id: ubicazione.store_id,
    store_name: ubicazione.store_name,
    fornitore: gruppo.fornitore.ragione_sociale,
    fornitore_email: gruppo.fornitore.email || '',
    prodotti,
    totale_ordine: prodotti.reduce((s, p) => s + p.prezzo_unitario * p.quantita_ordinata, 0),
    // La pagina ordini attuale mostra anche il totale con IVA
    totale_ordine_con_iva: prodotti.reduce((s, p) => s + p.prezzo_unitario * (1 + p.iva_percentuale / 100) * p.quantita_ordinata, 0),
    status: 'inviato',
    data_invio: new Date().toISOString(),
    origine: 'inventario_v2',
    ubicazione_key: gruppo.ubicazione_key
  };
}