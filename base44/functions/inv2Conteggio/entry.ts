import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { fetchAll, loadConfig, ubicazioneDaKey } from '../../shared/inv2.ts';
import { giornoRoma } from '../../shared/inv2Calcolo.ts';
import { limiteSera, listaSera } from '../../shared/inv2Lista.ts';
import { ricalcola } from '../../shared/inv2Ricalcolo.ts';

const ZONA_SEMILAVORATI = 'Semilavorati';
const maiuscola = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Righe senza valore precedente né stima: al telefono arrivano solo foto, nome, unità e zona
async function righe(E, giacenze, storeId) {
  const [materie, mappe] = await Promise.all([fetchAll(E.MateriePrime), E.MappaLocale.filter({ store_id: storeId })]);
  const mpById = Object.fromEntries(materie.map((m) => [m.id, m]));
  const aree = Object.fromEntries((mappe[0]?.storage_areas || []).map((a) => [a.id, a.nome]));
  const zona = (g) => {
    if (g.item_tipo === 'semilavorato') return ZONA_SEMILAVORATI;
    const mp = mpById[g.item_id];
    return aree[mp?.storage_area_per_store?.[storeId]] || (mp?.posizione ? maiuscola(mp.posizione) : 'Altro');
  };
  const ultima = (z) => (z === ZONA_SEMILAVORATI ? 1 : 0);
  return giacenze
    .map((g) => ({ item_id: g.item_id, nome: g.item_nome, unita: g.unita || '', foto: mpById[g.item_id]?.foto_url || null, zona: zona(g) }))
    .sort((a, b) => ultima(a.zona) - ultima(b.zona) || a.zona.localeCompare(b.zona, 'it') || a.nome.localeCompare(b.nome, 'it'));
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const E = sr.entities;

    const body = await req.json().catch(() => ({}));
    const { config, labStoreId } = await loadConfig(sr);
    const lab = body.ubicazione === 'laboratorio';
    const storeId = lab ? labStoreId : body.store_id;
    if (!storeId) return Response.json({ error: 'store_id è obbligatorio' }, { status: 400 });
    const key = lab ? `lab:${labStoreId}` : storeId;
    const oggi = giornoRoma(new Date());

    const [giacenze, ultime] = await Promise.all([
      fetchAll(E.GiacenzaStimata, { ubicazione_key: key }),
      E.SessioneConteggio.filter({ ubicazione_key: key, completata: true }, { sort: '-data', limit: 1 })
    ]);
    const sessioneOggi = ultime.items.find((s) => s.data && giornoRoma(new Date(s.data)) === oggi) || null;

    if (body.azione === 'lista') {
      const lista = sessioneOggi ? [] : listaSera(giacenze, limiteSera(config), oggi);
      const inLista = new Set(lista.map((g) => g.item_id));
      const tutte = await righe(E, giacenze, storeId);
      return Response.json({
        ubicazione_key: key,
        store_id: storeId,
        gia_fatto: !!sessioneOggi,
        righe: tutte.filter((r) => inLista.has(r.item_id)),
        altri: tutte.filter((r) => !inLista.has(r.item_id))
      });
    }

    if (body.azione !== 'salva') return Response.json({ error: 'azione non valida' }, { status: 400 });
    const perId = Object.fromEntries(giacenze.map((g) => [g.item_id, g]));
    const conteggi = [...new Map((Array.isArray(body.conteggi) ? body.conteggi : []).map((c) => [c.item_id, c])).values()];
    const validi = conteggi.every((c) => perId[c.item_id] && Number.isFinite(c.quantita) && c.quantita >= 0);
    if (!conteggi.length || !validi) return Response.json({ error: 'Ogni prodotto deve avere una quantità, anche 0' }, { status: 400 });
    const previsti = sessioneOggi ? [] : (Array.isArray(body.previsti) ? body.previsti : []).filter((id) => perId[id]);
    const contati = new Set(conteggi.map((c) => c.item_id));
    const mancanti = previsti.filter((id) => !contati.has(id)).length;
    if (mancanti) return Response.json({ error: `Mancano ${mancanti} prodotti della lista di stasera` }, { status: 400 });

    const ora = new Date().toISOString();
    const operatoreNome = user.nome_cognome || user.full_name;
    const sessione = sessioneOggi || await E.SessioneConteggio.create({
      ...ubicazioneDaKey(key),
      data: ora,
      operatore_email: user.email,
      operatore_nome: operatoreNome,
      ...(body.turno_id ? { turno_id: body.turno_id } : {}),
      prodotti_previsti: previsti,
      prodotti_contati: conteggi.length,
      completata: true
    });
    try {
      await E.MovimentoMagazzino.bulkCreate(conteggi.map((c) => ({
        ...ubicazioneDaKey(key),
        item_tipo: perId[c.item_id].item_tipo,
        item_id: c.item_id,
        item_nome: perId[c.item_id].item_nome,
        tipo: 'conteggio',
        quantita: c.quantita,
        unita: perId[c.item_id].unita,
        data_movimento: ora,
        utente_email: user.email,
        utente_nome: operatoreNome,
        fonte: 'inventario_v2',
        sessione_id: sessione.id
      })));
    } catch (e) {
      if (!sessioneOggi) await E.SessioneConteggio.delete(sessione.id);
      throw e;
    }
    if (sessioneOggi) {
      await E.SessioneConteggio.update(sessione.id, { prodotti_contati: (sessione.prodotti_contati || 0) + conteggi.length });
    }

    // I conteggi sono già salvati: se il ricalcolo fallisce ci pensa quello notturno
    let ricalcolato = true;
    try {
      await ricalcola(sr, [key]);
    } catch (e) {
      ricalcolato = false;
      console.error('Ricalcolo non riuscito dopo il conteggio', e.message);
    }
    return Response.json({ sessione_id: sessione.id, conteggi: conteggi.length, ricalcolato });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}