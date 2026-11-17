// Utilità comuni alle funzioni di Inventario 2.0

export const LAB_STORE_DEFAULT = '6908b4f284cb01bc8402b4ee';

export const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');

export const aBlocchi = (list, n) => {
  const out = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
};

// Legge tutte le pagine di una query
export async function fetchAll(entity, query = {}, sort = 'created_date') {
  const out = [];
  let cursor = null;
  do {
    const page = await entity.filter(query, { sort, limit: 500, ...(cursor ? { cursor } : {}) });
    out.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return out;
}

export async function soloAdmin(base44) {
  const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
  if (!user) return { errore: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (user.role !== 'admin') return { errore: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

export async function loadConfig(sr) {
  const configs = await sr.entities.ConfigInventario2.list();
  const config = configs[0] || {};
  return { config, labStoreId: config.lab_store_id || LAB_STORE_DEFAULT };
}

// Negozio dello store, oppure laboratorio se il prodotto è del laboratorio e lo store è quello del lab
export function ubicazionePer(storeId, laboratorio, labStoreId) {
  const lab = !!laboratorio && storeId === labStoreId;
  return {
    ubicazione_key: lab ? `lab:${storeId}` : storeId,
    store_id: storeId,
    ubicazione_tipo: lab ? 'laboratorio' : 'negozio'
  };
}

export function ubicazioneDaKey(key) {
  const lab = key.startsWith('lab:');
  return { ubicazione_key: key, store_id: lab ? key.slice(4) : key, ubicazione_tipo: lab ? 'laboratorio' : 'negozio' };
}