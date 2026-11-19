import { loadConfig } from '../../shared/inv2.ts';
import { GIORNO, confrontaConsumo, consumoMisurato, consumoTeorico } from '../../shared/inv2Calcolo.ts';
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
  coppie.forEach(({ u, p, moves, teorico, rete, ordineAperto }) => {
    const confronto = confrontaConsumo(moves, teorico, now - GIORNI * GIORNO);
    const c = confronto?.teorico > 0 ? confronto : null;
    const vendite = consumoTeorico(teorico);
    // Consumo misurato sugli intervalli puliti tra due verifiche admin, ultimi 56 giorni
    const misurato = rete ? null : consumoMisurato(moves, vendite.tra, now, 56, ordineAperto);
    if (!c && !misurato) return;
    (stores[u.ubicazione_key] ||= []).push({
      item_id: p.imp.item_id,
      nome: p.nome,
      unita: p.imp.unita_conteggio || '',
      giorni: c ? arrotonda(c.giorni, 1) : null,
      // Semilavorato di rete: il consumo dai conteggi del singolo negozio non si calcola
      conteggi: c && !rete ? arrotonda(c.conteggi, 3) : null,
      teorico: c ? arrotonda(c.teorico, 3) : vendite.media > 0 ? arrotonda(vendite.media, 3) : null,
      misurato: misurato ? arrotonda(misurato.consumo, 3) : null,
      intervalli_puliti: misurato?.intervalli ?? 0,
      rete: !!rete,
      senza_conteggi: !c,
      misurabile: !!c && c.misurabile && !rete,
      scarto_pct: c && c.misurabile && !rete ? arrotonda(((c.conteggi - c.teorico) / c.teorico) * 100, 1) : null
    });
  });
  // Prima i misurabili dallo scarto più grande, in fondo i non misurabili
  Object.values(stores).forEach((righe) => righe.sort((a, b) => b.misurabile - a.misurabile || Math.abs(b.scarto_pct) - Math.abs(a.scarto_pct)));
  return { giorni: GIORNI, stores };
}