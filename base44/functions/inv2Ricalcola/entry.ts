import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { aBlocchi, fetchAll, loadConfig, norm, soloAdmin } from '../../shared/inv2.ts';
import { GIORNO, calcolaGiacenza, giornoRoma, prossimoConteggio } from './calcolo.ts';

const INTERVALLI_DEFAULT = {
  'Ingredienti pronti': 7, 'Ortofrutta': 7, 'Ingredienti base': 14, 'Bevande': 14, 'Dolci': 14,
  'Angolo di Sardegna': 14, 'Packaging': 30, 'Consumabili': 30, 'Pulizia': 30, 'semilavorato': 7
};
const r3 = (n) => (n == null ? null : Math.round(n * 1000) / 1000);
const senzaNull = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { errore } = await soloAdmin(base44);
    if (errore) return errore;
    const sr = base44.asServiceRole;
    const E = sr.entities;
    const { ubicazione_key } = await req.json().catch(() => ({}));

    const now = Date.now();
    const dal = new Date(now - 28 * GIORNO).toISOString();
    const filtroUbic = ubicazione_key ? { ubicazione_key } : {};

    const [{ config, labStoreId }, stores, materie, ricette, fornitori] = await Promise.all([
      loadConfig(sr),
      E.Store.list(),
      fetchAll(E.MateriePrime),
      fetchAll(E.Ricetta, { is_semilavorato: true }),
      fetchAll(E.Fornitore)
    ]);
    const [impostazioni, esistenti, movimenti] = await Promise.all([
      fetchAll(E.ImpostazioneInventario2, { incluso: true }),
      fetchAll(E.GiacenzaStimata, filtroUbic),
      fetchAll(E.MovimentoMagazzino, { ...filtroUbic, data_movimento: { $gte: dal } }, 'data_movimento')
    ]);

    // Prodotti inclusi, con i dati che servono al calcolo
    const mpById = Object.fromEntries(materie.map((m) => [m.id, m]));
    const ricById = Object.fromEntries(ricette.map((r) => [r.id, r]));
    const consegna = Object.fromEntries(fornitori.map((f) => [norm(f.ragione_sociale), f.tempo_consegna_giorni]));
    const prodotti = impostazioni.map((imp) => {
      const mp = mpById[imp.item_id];
      const ric = ricById[imp.item_id];
      if (!mp && !ric) return null;
      return {
        imp,
        nome: mp ? mp.nome_prodotto : ric.nome_prodotto,
        categoria: mp ? mp.categoria : 'semilavorato',
        tempoConsegna: mp ? (consegna[norm(mp.fornitore)] ?? 1) : 1,
        inUso: (storeId) => (mp ? mp.in_uso_per_store?.[storeId] === true : (ric.stores_form_inventario || []).includes(storeId))
      };
    }).filter(Boolean);

    const ubicazioni = [
      ...stores.map((s) => ({ ubicazione_key: s.id, store_id: s.id, ubicazione_tipo: 'negozio' })),
      { ubicazione_key: `lab:${labStoreId}`, store_id: labStoreId, ubicazione_tipo: 'laboratorio' }
    ].filter((u) => !ubicazione_key || u.ubicazione_key === ubicazione_key);

    const coppie = [];
    ubicazioni.forEach((u) => prodotti.forEach((p) => {
      const daCalcolare = u.ubicazione_tipo === 'laboratorio' ? !!p.imp.laboratorio : p.inUso(u.store_id);
      if (daCalcolare) coppie.push({ u, p, k: `${u.ubicazione_key}|${p.imp.item_id}` });
    }));

    // Movimenti degli ultimi 28 giorni per ubicazione e prodotto
    const perCoppia = {};
    const chiave = (m) => `${m.ubicazione_key}|${m.item_id}`;
    const mossa = (m) => ({ tipo: m.tipo, quantita: m.quantita || 0, t: Date.parse(m.data_movimento) });
    movimenti.forEach((m) => (perCoppia[chiave(m)] ||= []).push(mossa(m)));

    // Ultimo conteggio prima della finestra
    const senzaPrecedente = new Set(coppie.map((c) => c.k));
    let cursor = null;
    for (let pagina = 0; pagina < 10 && senzaPrecedente.size; pagina++) {
      const page = await E.MovimentoMagazzino.filter(
        { ...filtroUbic, tipo: 'conteggio', data_movimento: { $lt: dal } },
        { sort: '-data_movimento', limit: 500, ...(cursor ? { cursor } : {}) }
      );
      page.items.forEach((m) => {
        if (!senzaPrecedente.has(chiave(m))) return;
        senzaPrecedente.delete(chiave(m));
        (perCoppia[chiave(m)] ||= []).push(mossa(m));
      });
      if (!page.has_more) break;
      cursor = page.next_cursor;
    }
    // Se è più vecchio di quanto letto sopra, vale l'ultimo conteggio già salvato sulla giacenza
    const esistentiByK = Object.fromEntries(esistenti.map((g) => [chiave(g), g]));
    senzaPrecedente.forEach((k) => {
      const g = esistentiByK[k];
      if (g?.ultimo_conteggio_data && g.ultimo_conteggio_data < dal && g.ultimo_conteggio_valore != null) {
        (perCoppia[k] ||= []).push({ tipo: 'conteggio', quantita: g.ultimo_conteggio_valore, t: Date.parse(g.ultimo_conteggio_data) });
      }
    });

    const oggi = giornoRoma(new Date(now));
    const soglia = config.soglia_affidabilita ?? 0.3;
    const intervalli = { ...INTERVALLI_DEFAULT, ...(config.intervallo_max_giorni_per_categoria || {}) };
    const intervalliScartati = [];
    const nuovi = [];
    const aggiornati = [];

    coppie.forEach(({ u, p, k }) => {
      const moves = (perCoppia[k] || []).sort((a, b) => a.t - b.t);
      const r = calcolaGiacenza(moves, now, soglia);
      if (r.scartati) intervalliScartati.push({ ubicazione_key: u.ubicazione_key, item_nome: p.nome, intervalli: r.scartati });
      const prossimo = prossimoConteggio({
        fisso: p.imp.conteggio_fisso,
        r,
        oggi,
        min: p.imp.min_per_ubicazione?.[u.ubicazione_key],
        tempoConsegna: p.tempoConsegna,
        intervallo: intervalli[p.categoria]
      });
      const record = {
        ...u,
        item_tipo: p.imp.item_tipo,
        item_id: p.imp.item_id,
        item_nome: p.nome,
        unita: p.imp.unita_conteggio,
        ultimo_conteggio_valore: r.ultimo ? r.ultimo.quantita : null,
        ultimo_conteggio_data: r.ultimo ? new Date(r.ultimo.t).toISOString() : null,
        giacenza_stimata: r3(r.giacenza),
        consumo_medio_giorno: r3(r.consumo),
        uscite_registrate_giorno: r3(r.usciteGiorno),
        giorni_copertura: r3(r.giorniCopertura),
        affidabilita: r.affidabilita,
        scarto_ultimo_conteggio_pct: r.scarto == null ? null : Math.round(r.scarto * 1000) / 10,
        prossimo_conteggio_data: prossimo.data,
        prossimo_conteggio_motivo: prossimo.motivo,
        priorita: prossimo.priorita,
        aggiornato_il: new Date(now).toISOString()
      };
      const esistente = esistentiByK[k];
      if (esistente) aggiornati.push({ id: esistente.id, ...record });
      else nuovi.push(senzaNull(record));
    });

    for (const blocco of aBlocchi(nuovi, 500)) await E.GiacenzaStimata.bulkCreate(blocco);
    for (const blocco of aBlocchi(aggiornati, 500)) await E.GiacenzaStimata.bulkUpdate(blocco);

    if (intervalliScartati.length) console.warn('Intervalli scartati per residuo negativo', JSON.stringify(intervalliScartati));
    return Response.json({ create: nuovi.length, aggiornate: aggiornati.length, intervalli_scartati: intervalliScartati });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}