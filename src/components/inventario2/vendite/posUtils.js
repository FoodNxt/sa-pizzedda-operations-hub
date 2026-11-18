export const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');

// Punti vendita del POS che non hanno il nome dello store
const ALIAS_NEGOZI = { solari: 'lanino' };

// Legge tutte le pagine di una query
export async function tutte(entity, query = {}) {
  const out = [];
  let cursor = null;
  do {
    const page = await entity.filter(query, { sort: 'created_date', limit: 500, ...(cursor ? { cursor } : {}) });
    out.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return out;
}

// Store proposto per un punto vendita del POS, dal nome
export function proponiNegozio(nome, stores) {
  const n = norm(nome);
  const store = stores.find((s) => {
    const nomeStore = norm(s.name);
    return n.includes(nomeStore) || Object.entries(ALIAS_NEGOZI).some(([alias, vero]) => n.includes(alias) && nomeStore === vero);
  });
  return store?.id || '';
}

// Collegamento proposto per un prodotto venduto: ricetta con lo stesso nome,
// poi il mapping delle bevande, poi una materia prima con lo stesso nome
export function proponi(nome, { ricette, materie, mapping }) {
  const n = norm(nome);
  const ricetta = ricette.find((r) => norm(r.nome_prodotto) === n);
  if (ricetta) return { tipo: 'ricetta', item_id: ricetta.id, quantita_per_pezzo: 1 };
  const bevanda = mapping.find((m) => norm(m.flavor_prodotto_venduto) === n);
  const materia = materie.find((m) => m.id === bevanda?.materia_prima_id)
    || materie.find((m) => norm(m.nome_prodotto) === n || norm(m.nome_interno) === n);
  return materia ? { tipo: 'materia_prima', item_id: materia.id, quantita_per_pezzo: 1 } : null;
}