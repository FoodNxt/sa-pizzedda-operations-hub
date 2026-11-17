// Trasporti tra negozi (Inventario 2.0): controlli, conversione nell'unità di conteggio e movimenti
import { loadConfig, ubicazioneDaKey, ubicazionePer } from './inv2.ts';

const A_PEZZI = ['pezzi', 'pezzo', 'pz', 'unità', 'unita'];
const GRAMMI = ['g', 'gr', 'grammi'];
const IN_KG = { kg: 1, g: 0.001, litri: 1, ml: 0.001 };
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const errore = (error, status = 400) => ({ errore: Response.json({ error }, { status }) });

function converti(imp, item, nome, body) {
  const unita = imp.unita_conteggio;
  const u = String(unita || '').toLowerCase();
  if (A_PEZZI.includes(u)) {
    const pezzi = Number(body.pezzi);
    if (!(pezzi > 0)) return { messaggio: 'Scrivi il numero di pezzi' };
    return { pezzi, quantita_convertita: pezzi, unita };
  }
  const kg = Math.round(Number(body.peso_kg) * 1000) / 1000;
  if (!(kg > 0)) return { messaggio: 'Scrivi il peso in kg' };
  if (GRAMMI.includes(u)) return { peso_kg: kg, quantita_convertita: Math.round(kg * 1000), unita };
  if (u === 'kg') return { peso_kg: kg, quantita_convertita: kg, unita };
  const pesoUnita = item.peso_dimensione_unita > 0 && IN_KG[item.unita_misura_peso]
    ? item.peso_dimensione_unita * IN_KG[item.unita_misura_peso]
    : imp.peso_unita_conteggio_kg;
  if (!(pesoUnita > 0)) {
    return { messaggio: `Manca il peso di una unità di ${nome}: va impostato in Inventario 2.0 › Impostazioni` };
  }
  return { peso_kg: kg, quantita_convertita: r6(kg / pesoUnita), unita };
}

// Controlla la richiesta e restituisce i campi del TrasportoMagazzino
export async function preparaTrasporto(sr, body, soloTrasportabili) {
  const E = sr.entities;
  const { item_id, da_store_id, a_store_id } = body;
  if (!item_id || !da_store_id || !a_store_id) return errore('Servono prodotto, negozio di partenza e negozio di arrivo');
  if (da_store_id === a_store_id) return errore('Il negozio di partenza e quello di arrivo devono essere diversi');

  const [{ labStoreId }, impostazioni, stores] = await Promise.all([
    loadConfig(sr),
    E.ImpostazioneInventario2.filter({ item_id }),
    E.Store.list()
  ]);
  const imp = impostazioni[0];
  if (!imp) return errore('Prodotto non presente in Inventario 2.0', 404);
  if (!stores.some((s) => s.id === da_store_id) || !stores.some((s) => s.id === a_store_id)) return errore('Negozio non trovato', 404);

  const sorgente = imp.item_tipo === 'semilavorato' ? E.Ricetta : E.MateriePrime;
  const item = await sorgente.get(item_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!item) return errore('Prodotto non trovato', 404);
  if (soloTrasportabili && !(imp.incluso && item.trasportabile)) return errore('Questo prodotto non è trasportabile', 403);

  const { messaggio, ...quantita } = converti(imp, item, item.nome_prodotto, body);
  if (messaggio) return errore(messaggio);

  return {
    campi: {
      item_tipo: imp.item_tipo,
      item_id,
      item_nome: item.nome_prodotto,
      da_ubicazione_key: ubicazionePer(da_store_id, imp.laboratorio, labStoreId).ubicazione_key,
      a_ubicazione_key: ubicazionePer(a_store_id, imp.laboratorio, labStoreId).ubicazione_key,
      ...quantita
    }
  };
}

// I due movimenti di un trasporto: uscita dall'origine ed entrata nella destinazione
export const movimentiTrasporto = (t) =>
  [['trasporto_uscita', t.da_ubicazione_key], ['trasporto_entrata', t.a_ubicazione_key]].map(([tipo, key]) => ({
    ...ubicazioneDaKey(key),
    item_tipo: t.item_tipo,
    item_id: t.item_id,
    item_nome: t.item_nome,
    tipo,
    quantita: t.quantita_convertita,
    unita: t.unita,
    data_movimento: t.data_trasporto,
    utente_email: t.operatore_email,
    utente_nome: t.operatore_nome,
    fonte: 'trasporto',
    riferimento_id: t.id
  }));