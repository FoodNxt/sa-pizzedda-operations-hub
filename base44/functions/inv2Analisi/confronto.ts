import { fetchAll, loadConfig } from '../../shared/inv2.ts';
import { GIORNO, giornoRoma } from '../../shared/inv2Calcolo.ts';

const GIORNI = 21;
const media = (list) => (list.length ? Math.round((list.reduce((s, n) => s + n, 0) / list.length) * 10) / 10 : null);

// Confronto degli ultimi 21 giorni per gli store in affiancamento
export async function confronto(sr) {
  const E = sr.entities;
  const { config } = await loadConfig(sr);
  const storeIds = Object.entries(config.modalita_per_store || {}).filter(([, m]) => m === 'affiancamento').map(([id]) => id);
  if (!storeIds.length) return { giorni: GIORNI, stores: [] };

  const dal = new Date(Date.now() - GIORNI * GIORNO);
  const ubicazioni = { ubicazione_key: { $in: storeIds } };
  const [conteggi, liste, giacenze] = await Promise.all([
    fetchAll(E.MovimentoMagazzino, { ...ubicazioni, tipo: 'conteggio', data_movimento: { $gte: dal.toISOString() } }, 'data_movimento'),
    fetchAll(E.ListaConteggioLog, { ...ubicazioni, data: { $gte: giornoRoma(dal) } }, 'data'),
    fetchAll(E.GiacenzaStimata, { ...ubicazioni, ultimo_conteggio_data: { $gte: dal.toISOString() } })
  ]);

  const oggi = giornoRoma(new Date());
  const inizio = config.affiancamento_dal_per_store || {};
  const listaDel = Object.fromEntries(liste.map((l) => [`${l.ubicazione_key}|${l.data}`, new Set(l.item_ids || [])]));

  const stores = storeIds.map((id) => {
    const contati = conteggi.filter((m) => m.ubicazione_key === id);
    const perSera = {};
    const zeri = {};
    const nonSegnalati = [];
    contati.forEach((m) => {
      const giorno = giornoRoma(new Date(m.data_movimento));
      perSera[giorno] = (perSera[giorno] || 0) + 1;
      if (m.quantita === 0) {
        // A zero senza che la lista di quella sera chiedesse di contarlo (solo sere con una lista salvata)
        const lista = listaDel[`${id}|${giorno}`];
        if (lista && !lista.has(m.item_id)) nonSegnalati.push({ item_id: m.item_id, nome: m.item_nome, giorno });
        const z = (zeri[m.item_id] ||= { item_id: m.item_id, nome: m.item_nome, volte: 0, ultima: giorno });
        z.volte++;
        z.ultima = giorno;
      }
    });
    const previste = liste.filter((l) => l.ubicazione_key === id);
    const scarti = giacenze.filter((g) => g.ubicazione_key === id && g.scarto_ultimo_conteggio_pct != null).map((g) => g.scarto_ultimo_conteggio_pct);
    return {
      store_id: id,
      scarto_medio_pct: media(scarti),
      prodotti_con_scarto: scarti.length,
      voci_previste_media: media(previste.map((l) => l.numero_voci || 0)),
      sere_previste: previste.length,
      voci_contate_media: media(Object.values(perSera)),
      sere_contate: Object.keys(perSera).length,
      a_zero: Object.values(zeri).sort((a, b) => b.volte - a.volte),
      a_zero_non_segnalati: nonSegnalati,
      giorni_affiancamento: inizio[id] ? Math.floor((Date.parse(oggi) - Date.parse(inizio[id])) / GIORNO) : null
    };
  });
  return { giorni: GIORNI, stores };
}