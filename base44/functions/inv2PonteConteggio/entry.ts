import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { aBlocchi, fetchAll, loadConfig, soloAdmin, ubicazionePer } from '../../shared/inv2.ts';
import { DIECI_MINUTI } from '../../shared/inv2Calcolo.ts';

const FONTI = { RilevazioneInventario: 'form_inventario_v1', RilevazioneInventarioCantina: 'form_cantina_v1' };
const GIORNI_STORICO = 28;

// Un conteggio del vecchio modulo vale solo se è nella stessa unità di Inventario 2.0
const stessaUnita = (r, imp) => !imp?.unita_conteggio || !r.unita_misura || imp.unita_conteggio === r.unita_misura;

function movimento(r, fonte, isMateriaPrima, laboratorio, labStoreId) {
  return {
    ...ubicazionePer(r.store_id, laboratorio, labStoreId),
    item_tipo: isMateriaPrima ? 'materia_prima' : 'semilavorato',
    item_id: r.prodotto_id,
    item_nome: r.nome_prodotto,
    tipo: 'conteggio',
    quantita: r.quantita_rilevata,
    unita: r.unita_misura,
    data_movimento: new Date(r.data_rilevazione).toISOString(),
    utente_nome: r.rilevato_da,
    fonte,
    riferimento_id: r.id
  };
}

async function importaUna(sr, config, labStoreId, entita, id) {
  const r = await sr.entities[entita].get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  if (!r) return { creati: 0, saltato: 'rilevazione non trovata' };
  if ((config.modalita_per_store || {})[r.store_id] !== 'affiancamento') return { creati: 0, saltato: 'store non in affiancamento' };
  const [gia, materie, impostazioni] = await Promise.all([
    sr.entities.MovimentoMagazzino.filter({ riferimento_id: id }),
    sr.entities.MateriePrime.filter({ id: { $in: [r.prodotto_id] } }),
    sr.entities.ImpostazioneInventario2.filter({ item_id: r.prodotto_id })
  ]);
  if (gia.length) return { creati: 0, saltato: 'già importata' };
  if (!stessaUnita(r, impostazioni[0])) return { creati: 0, saltato: 'unità diversa da Inventario 2.0' };
  const nuovo = movimento(r, FONTI[entita], materie.length > 0, impostazioni[0]?.laboratorio, labStoreId);
  // Stesso prodotto, stessa ubicazione e stesso valore a meno di 10 minuti: è lo stesso conteggio inviato due volte
  const t = Date.parse(nuovo.data_movimento);
  const doppi = await sr.entities.MovimentoMagazzino.filter({
    ubicazione_key: nuovo.ubicazione_key,
    item_id: nuovo.item_id,
    tipo: 'conteggio',
    quantita: nuovo.quantita,
    data_movimento: { $gt: new Date(t - DIECI_MINUTI).toISOString(), $lt: new Date(t + DIECI_MINUTI).toISOString() }
  });
  if (doppi.length) return { creati: 0, saltato: 'conteggio doppio' };
  await sr.entities.MovimentoMagazzino.create(nuovo);
  return { creati: 1 };
}

async function importaStorico(sr, config, labStoreId) {
  const storeIds = Object.entries(config.modalita_per_store || {}).filter(([, m]) => m === 'affiancamento').map(([id]) => id);
  if (!storeIds.length) return { creati: 0, saltato: 'nessuno store in affiancamento' };
  const dal = new Date(Date.now() - GIORNI_STORICO * 86400000).toISOString();
  const E = sr.entities;
  const [materie, impostazioni, gia] = await Promise.all([
    fetchAll(E.MateriePrime),
    fetchAll(E.ImpostazioneInventario2),
    fetchAll(E.MovimentoMagazzino, { tipo: 'conteggio', data_movimento: { $gte: new Date(Date.parse(dal) - DIECI_MINUTI).toISOString() } })
  ]);
  const materieIds = new Set(materie.map((m) => m.id));
  const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
  const importate = new Set(gia.map((m) => m.riferimento_id));
  // Quando è stato contato ogni valore, per prodotto e ubicazione: serve a saltare i conteggi doppi
  const chiave = (m) => `${m.ubicazione_key}|${m.item_id}|${m.quantita}`;
  const tempi = {};
  gia.forEach((m) => (tempi[chiave(m)] ||= []).push(Date.parse(m.data_movimento)));
  const nuovi = [];
  for (const [entita, fonte] of Object.entries(FONTI)) {
    const rilevazioni = await fetchAll(E[entita], { store_id: { $in: storeIds }, data_rilevazione: { $gte: dal } }, 'data_rilevazione');
    rilevazioni.forEach((r) => {
      const imp = impById[r.prodotto_id];
      if (importate.has(r.id) || !stessaUnita(r, imp)) return;
      const nuovo = movimento(r, fonte, materieIds.has(r.prodotto_id), imp?.laboratorio, labStoreId);
      const t = Date.parse(nuovo.data_movimento);
      const visti = (tempi[chiave(nuovo)] ||= []);
      if (visti.some((x) => Math.abs(x - t) < DIECI_MINUTI)) return;
      visti.push(t);
      nuovi.push(nuovo);
    });
  }
  for (const blocco of aBlocchi(nuovi, 500)) await E.MovimentoMagazzino.bulkCreate(blocco);
  return { creati: nuovi.length };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { entita, rilevazione_id, importa_storico } = await req.json().catch(() => ({}));

    // La chiamata singola arriva dal workflow (anche come dipendente): legge solo quel record ed è idempotente
    if (importa_storico) {
      const { errore } = await soloAdmin(base44);
      if (errore) return errore;
    }
    const { config, labStoreId } = await loadConfig(sr);

    if (importa_storico) return Response.json(await importaStorico(sr, config, labStoreId));

    if (!FONTI[entita] || !rilevazione_id) {
      return Response.json({ error: 'Servono entita e rilevazione_id, oppure importa_storico' }, { status: 400 });
    }
    return Response.json(await importaUna(sr, config, labStoreId, entita, rilevazione_id));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}