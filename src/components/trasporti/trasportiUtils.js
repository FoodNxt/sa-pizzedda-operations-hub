const A_PEZZI = ['pezzi', 'pezzo', 'pz', 'unità', 'unita'];

export const contaAPezzi = (unita) => A_PEZZI.includes(String(unita || '').toLowerCase());

// 4685 → "4.685", 4.685 → "4,685"
export const numeroIt = (n, decimali = 3) => {
  if (n == null) return '—';
  const [intero, dec] = (Math.round(n * 10 ** decimali) / 10 ** decimali).toString().split('.');
  return intero.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? `,${dec}` : '');
};

export const unitaBreve = (u) => (u === 'grammi' ? 'g' : u || '');

// Ubicazione di un prodotto in uno store: il laboratorio se il prodotto è del laboratorio
export const chiaveUbicazione = (storeId, prodotto, labStoreId) =>
  prodotto.laboratorio && storeId === labStoreId ? `lab:${storeId}` : storeId;

export const storeDaChiave = (key) => (key?.startsWith('lab:') ? key.slice(4) : key);

export const nomeUbicazione = (key, stores) => {
  const nome = stores.find((s) => s.id === storeDaChiave(key))?.name || '—';
  return key?.startsWith('lab:') ? `${nome} (laboratorio)` : nome;
};

export const campoSelect = 'w-full h-12 rounded-md border border-slate-200 px-3 text-base';