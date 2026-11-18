import { loadConfig } from '../../shared/inv2.ts';
import { GIORNO, confrontaConsumo } from '../../shared/inv2Calcolo.ts';
import { preparaCalcolo } from '../../shared/inv2Ricalcolo.ts';

const GIORNI = 21;
const arrotonda = (n, decimali) => Math.round(n * 10 ** decimali) / 10 ** decimali;

// Consumo da conteggi contro consumo teorico, per prodotto, negli store in affiancamento
export async function consumi(sr) {
  const { config } = await loadConfig(sr);
  const storeIds = Object.entries(config.modalita_per_store || {}).filter(([, m]) => m === 'affiancamento').map(([id]) => id);
  const stores = {};
  if (!storeIds.length) return { giorni: GIORNI, stores };

  const { now, coppie } = await preparaCalcolo(sr, storeIds);
  coppie.forEach(({ u, p, moves, teorico }) => {
    const c = confrontaConsumo(moves, teorico, now - GIORNI * GIORNO);
    if (!c || !(c.teorico > 0)) return;
    (stores[u.ubicazione_key] ||= []).push({
      item_id: p.imp.item_id,
      nome: p.nome,
      unita: p.imp.unita_conteggio || '',
      giorni: arrotonda(c.giorni, 1),
      conteggi: arrotonda(c.conteggi, 3),
      teorico: arrotonda(c.teorico, 3),
      scarto_pct: arrotonda(((c.conteggi - c.teorico) / c.teorico) * 100, 1)
    });
  });
  Object.values(stores).forEach((righe) => righe.sort((a, b) => Math.abs(b.scarto_pct) - Math.abs(a.scarto_pct)));
  return { giorni: GIORNI, stores };
}