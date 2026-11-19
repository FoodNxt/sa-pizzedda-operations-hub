import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { fetchAll, loadConfig, ubicazioneDaKey } from '../../shared/inv2.ts';
import { giornoRoma } from '../../shared/inv2Calcolo.ts';
import { limiteSera, listaSera } from '../../shared/inv2Lista.ts';
import { ricalcola } from '../../shared/inv2Ricalcolo.ts';
import { ordinaPercorso } from '../../shared/inv2Percorso.ts';
import { conteggiSospetti, simulaConteggi } from '../../shared/inv2Simula.ts';
import { risultatoVerifica } from '../../shared/inv2Verifica.ts';

const ZONA_SEMILAVORATI = 'Semilavorati';
// Dati in più per l'admin in modalità prova
const dettagliAdmin = (g) => ({
  motivo: g.prossimo_conteggio_motivo || null,
  priorita: g.priorita ?? null,
  giacenza: g.giacenza_stimata ?? null,
  consumo: (g.consumo_medio_giorno || 0) + (g.uscite_registrate_giorno || 0),
  teorico: g.consumo_teorico_giorno ?? null,
  fattore: g.fattore_correzione ?? null,
  fonte: g.fonte_consumo || null,
  copertura: g.giorni_copertura ?? null
});
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
    // Modalità prova: solo admin, non scrive niente. Per gli altri il parametro viene ignorato
    const prova = body.prova === true && user.role === 'admin';

    const [giacenze, ultime, piantine] = await Promise.all([
      fetchAll(E.GiacenzaStimata, { ubicazione_key: key }),
      E.SessioneConteggio.filter({ ubicazione_key: key, completata: true }, { sort: '-data', limit: 1 }),
      E.PiantinaInventario2.filter({ ubicazione_key: key })
    ]);
    // Con la piantina i prodotti seguono il giro più corto nel locale
    const piantina = piantine[0];
    const sessioneOggi = ultime.items.find((s) => s.data && giornoRoma(new Date(s.data)) === oggi) || null;

    const perId = Object.fromEntries(giacenze.map((g) => [g.item_id, g]));

    if (body.azione === 'lista') {
      // In prova la lista si vede sempre, anche per un altro giorno, con i dati per l'admin
      const giorno = prova && /^\d{4}-\d{2}-\d{2}$/.test(body.giorno || '') ? body.giorno : oggi;
      const lista = sessioneOggi && !prova ? [] : listaSera(giacenze, limiteSera(config), giorno);
      const inLista = new Set(lista.map((g) => g.item_id));
      const base = await righe(E, giacenze, storeId);
      const tutte = prova ? base.map((r) => ({ ...r, ...dettagliAdmin(perId[r.item_id]) })) : base;
      return Response.json({
        ubicazione_key: key,
        store_id: storeId,
        gia_fatto: !!sessioneOggi && !prova,
        righe: ordinaPercorso(tutte.filter((r) => inLista.has(r.item_id)), piantina),
        altri: tutte.filter((r) => !inLista.has(r.item_id)),
        ...(prova ? {
          giorno,
          riepilogo: {
            voci: lista.length,
            fissi: lista.filter((g) => g.priorita === 1).length,
            rinviate: listaSera(giacenze, Infinity, giorno).length - lista.length
          }
        } : {})
      });
    }

    // Inventario completo: solo admin, tutti i prodotti dell'ubicazione, senza toccare la lista della sera
    // Conteggio di verifica: solo admin, come l'inventario completo ma salvato con fonte verifica_admin. È un conteggio vero
    const verifica = body.azione === 'lista_verifica' || body.azione === 'salva_verifica';
    const completo = verifica || body.azione === 'lista_completa' || body.azione === 'salva_completo';
    if (completo && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (body.azione === 'lista_completa' || body.azione === 'lista_verifica') {
      let elenco = await righe(E, giacenze, storeId);
      if (verifica) {
        // Tara del contenitore nell'unità di conteggio, solo per i prodotti contati a peso
        const conTara = await fetchAll(E.ImpostazioneInventario2, { tara_contenitore_g: { $gt: 0 } });
        const tara = Object.fromEntries(conTara.map((i) => [i.item_id, i.tara_contenitore_g]));
        const divisore = { grammi: 1, g: 1, kg: 1000 };
        elenco = elenco.map((r) => (tara[r.item_id] && divisore[r.unita] ? { ...r, tara: tara[r.item_id] / divisore[r.unita] } : r));
      }
      return Response.json({
        ubicazione_key: key,
        righe: ordinaPercorso(elenco, piantina),
        ...(verifica ? { predefiniti: (config.prodotti_verifica || []).filter((id) => perId[id]) } : {})
      });
    }

    const simula = prova && body.azione === 'simula';
    if (body.azione !== 'salva' && !completo && !simula) return Response.json({ error: 'azione non valida' }, { status: 400 });
    const conteggi = [...new Map((Array.isArray(body.conteggi) ? body.conteggi : []).map((c) => [c.item_id, c])).values()];
    const validi = conteggi.every((c) => perId[c.item_id] && Number.isFinite(c.quantita) && c.quantita >= 0);
    if (!conteggi.length || !validi) return Response.json({ error: 'Ogni prodotto deve avere una quantità, anche 0' }, { status: 400 });
    // Verifica: ogni prodotto ha l'ora in cui l'admin lo ha confermato, nelle ultime 12 ore
    if (verifica) {
      const adesso = Date.now();
      const oraValida = (c) => { const t = Date.parse(c.ora); return Number.isFinite(t) && t <= adesso + 60000 && t >= adesso - 12 * 3600000; };
      if (!conteggi.every(oraValida)) return Response.json({ error: 'Ogni prodotto deve avere l\'ora di conferma, nelle ultime 12 ore' }, { status: 400 });
    }
    const previsti = (sessioneOggi && !simula) || completo ? [] : (Array.isArray(body.previsti) ? body.previsti : []).filter((id) => perId[id]);
    const contati = new Set(conteggi.map((c) => c.item_id));
    const mancanti = previsti.filter((id) => !contati.has(id)).length;
    if (mancanti) return Response.json({ error: `Mancano ${mancanti} prodotti della lista di stasera` }, { status: 400 });

    // Simulazione: stessi controlli di salva, poi solo il calcolo. Da qui in giù si scrive
    if (simula) return Response.json({ simulazione: await simulaConteggi(sr, key, conteggi, perId) });

    // Solo dal form della sera: i valori sospetti tornano indietro senza salvare e senza mostrare la stima.
    // I prodotti già ricontrollati si salvano comunque
    if (body.azione === 'salva') {
      const ricontrollati = new Set(Array.isArray(body.ricontrollati) ? body.ricontrollati : []);
      const daControllare = conteggi.filter((c) => !ricontrollati.has(c.item_id));
      // Se il controllo non riesce l'inventario si salva lo stesso
      const sospetti = daControllare.length
        ? await conteggiSospetti(sr, key, daControllare).catch((e) => { console.error('Controllo dei conteggi non riuscito', e.message); return []; })
        : [];
      if (sospetti.length) return Response.json({ sospetti });
    }

    // Stima e ultimo conteggio dei dipendenti si leggono prima di salvare la verifica
    const risultato = verifica ? await risultatoVerifica(sr, key, conteggi, perId) : null;

    const ora = new Date().toISOString();
    const operatoreNome = user.nome_cognome || user.full_name;
    const sessione = completo ? null : sessioneOggi || await E.SessioneConteggio.create({
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
        data_movimento: verifica ? new Date(c.ora).toISOString() : ora,
        utente_email: user.email,
        utente_nome: operatoreNome,
        fonte: verifica ? 'verifica_admin' : 'inventario_v2',
        ...(sessione ? { sessione_id: sessione.id } : { note: verifica ? 'Conteggio di verifica' : 'Inventario completo' })
      })));
    } catch (e) {
      if (sessione && !sessioneOggi) await E.SessioneConteggio.delete(sessione.id);
      throw e;
    }
    if (sessione && sessioneOggi) {
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
    return Response.json({ sessione_id: sessione?.id, conteggi: conteggi.length, ricalcolato, ...(risultato ? { risultato } : {}) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}