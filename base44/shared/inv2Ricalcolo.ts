import { aBlocchi, fetchAll, loadConfig, norm } from './inv2.ts';
import { GIORNO, calcolaGiacenza, giornoRoma, prossimoConteggio, senzaConteggiDoppi, unitaSospette } from './inv2Calcolo.ts';
import { consumiTeorici, mezzanotte, ricetteEscluse } from './inv2Teorico.ts';

const INTERVALLI_DEFAULT = {
  'Ingredienti pronti': 7, 'Ortofrutta': 7, 'Ingredienti base': 14, 'Bevande': 14, 'Dolci': 14,
  'Angolo di Sardegna': 14, 'Packaging': 30, 'Consumabili': 30, 'Pulizia': 30, 'semilavorato': 7
};
const r3 = (n) => (n == null ? null : Math.round(n * 1000) / 1000);
const senzaNull = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));

// Legge prodotti e movimenti che servono al calcolo, senza scrivere niente.
// chiavi = elenco di ubicazione_key da considerare, vuoto = tutte.
export async function preparaCalcolo(sr, chiavi) {
  const E = sr.entities;
  const now = Date.now();
  const dal = new Date(now - 28 * GIORNO).toISOString();
  const filtroUbic = chiavi?.length ? { ubicazione_key: { $in: chiavi } } : {};

  const [{ config, labStoreId }, stores, materie, ricette, fornitori] = await Promise.all([
    loadConfig(sr),
    E.Store.list(),
    fetchAll(E.MateriePrime),
    fetchAll(E.Ricetta),
    fetchAll(E.Fornitore)
  ]);
  const [impostazioni, esistenti, movimenti] = await Promise.all([
    fetchAll(E.ImpostazioneInventario2, { incluso: true }),
    fetchAll(E.GiacenzaStimata, filtroUbic),
    fetchAll(E.MovimentoMagazzino, { ...filtroUbic, data_movimento: { $gte: dal } }, 'data_movimento')
  ]);

  // Semilavorati trasportabili: finché produzioni e trasporti non sono registrati per tutta la finestra
  // (almeno uno di ciascuno prima dell'inizio e almeno uno dentro) il consumo dai conteggi vale solo per la rete
  const trasportabili = ricette.filter((r) => r.is_semilavorato && r.trasportabile).map((r) => r.id);
  const registrati = async (data) => {
    const { rows } = await E.MovimentoMagazzino.aggregate({
      query: { item_id: { $in: trasportabili }, tipo: { $in: ['produzione_carico', 'trasporto_uscita', 'trasporto_entrata'] }, data_movimento: data },
      groupBy: ['item_id', 'tipo']
    });
    const tipi = (id) => rows.filter((r) => r.item_id === id).map((r) => r.tipo);
    return new Set(trasportabili.filter((id) => tipi(id).includes('produzione_carico') && tipi(id).some((t) => t.startsWith('trasporto'))));
  };
  const [prima, dentro] = trasportabili.length ? await Promise.all([registrati({ $lt: dal }), registrati({ $gte: dal })]) : [new Set(), new Set()];
  const diRete = new Set(trasportabili.filter((id) => !(prima.has(id) && dentro.has(id))));

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

  // Solo gli store in affiancamento o attivi; il laboratorio segue lo store che lo ospita.
  // Le giacenze degli store esclusi vengono eliminate più sotto, perché non sono più previste.
  const acceso = (storeId) => ['affiancamento', 'attivo'].includes(config.modalita_per_store?.[storeId]);
  const ubicazioni = [
    ...stores.map((s) => ({ ubicazione_key: s.id, store_id: s.id, ubicazione_tipo: 'negozio' })),
    { ubicazione_key: `lab:${labStoreId}`, store_id: labStoreId, ubicazione_tipo: 'laboratorio' }
  ].filter((u) => acceso(u.store_id) && (!chiavi?.length || chiavi.includes(u.ubicazione_key)));

  // Inizio dello storico per store: quello che è successo prima non conta, il primo conteggio da lì in poi fa da partenza
  const inizi = config.inizio_storico_per_store || {};
  const daQuando = (storeId) => (inizi[storeId] ? mezzanotte(inizi[storeId]) : 0);

  // Consumo teorico dalle vendite del POS, per store acceso
  const teorici = await consumiTeorici(E, {
    storeIds: [...new Set(ubicazioni.map((u) => u.store_id))],
    now,
    ricette,
    materie,
    impostazioni,
    escluse: ricetteEscluse(config, ricette),
    inizi
  });

  // I prodotti del laboratorio hanno la giacenza nel laboratorio e non nel negozio dello stesso store
  const coppie = [];
  ubicazioni.forEach((u) => prodotti.forEach((p) => {
    const delLab = !!p.imp.laboratorio;
    const daCalcolare = u.ubicazione_tipo === 'laboratorio' ? delLab : p.inUso(u.store_id) && !(delLab && (p.imp.solo_laboratorio || u.store_id === labStoreId));
    if (daCalcolare) coppie.push({ u, p, k: `${u.ubicazione_key}|${p.imp.item_id}` });
  }));

  // Movimenti degli ultimi 28 giorni per ubicazione e prodotto
  const perCoppia = {};
  const chiave = (m) => `${m.ubicazione_key}|${m.item_id}`;
  const mossa = (m) => ({ id: m.id, sospetto: !!m.sospetto, unita_sospetta: !!m.unita_sospetta, tipo: m.tipo, quantita: m.quantita || 0, t: Date.parse(m.data_movimento) });
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

  const intervalli = { ...INTERVALLI_DEFAULT, ...(config.intervallo_max_giorni_per_categoria || {}) };
  return {
    now,
    oggi: giornoRoma(new Date(now)),
    soglia: config.soglia_affidabilita ?? 0.3,
    esistenti,
    venditeNonCollegate: teorici.nonCollegate,
    consumiNonConvertiti: teorici.nonConvertiti,
    coppie: coppie.map(({ u, p, k }) => {
      // L'unità sospetta si giudica su tutti i conteggi letti, anche quelli prima dell'inizio dello storico
      const letti = senzaConteggiDoppi((perCoppia[k] || []).sort((a, b) => a.t - b.t));
      const sospette = unitaSospette(letti, p.imp.unita_conteggio);
      const tutti = letti.filter((m) => m.t >= daQuando(u.store_id));
      const fuori = sospette;
      return {
      u,
      p,
      k,
      // I conteggi in unità sospetta restano fuori da consumo e giacenza
      moves: tutti.filter((m) => !fuori.has(m)),
      unitaSospette: [...fuori],
      rete: u.ubicazione_tipo === 'negozio' && diRete.has(p.imp.item_id),
      // Consumo teorico del prodotto nello store, giorno per giorno
      teorico: { giorni: teorici.giorniPerStore[u.store_id] || [], perGiorno: teorici.perStore[u.store_id]?.[p.imp.item_id] || {} },
      // Prossimo conteggio a partire dal risultato di calcolaGiacenza
      prossimo: (r, oggi) => prossimoConteggio({
        fisso: p.imp.conteggio_fisso_per_ubicazione?.[u.ubicazione_key] ?? p.imp.conteggio_fisso,
        r,
        oggi,
        min: p.imp.min_per_ubicazione?.[u.ubicazione_key],
        tempoConsegna: p.tempoConsegna,
        intervallo: intervalli[p.categoria]
      })
      };
    })
  };
}

// Aggiorna le GiacenzaStimata. chiavi = elenco di ubicazione_key da ricalcolare, vuoto = tutte.
export async function ricalcola(sr, chiavi) {
  const E = sr.entities;
  const { now, oggi, soglia, esistenti, coppie, venditeNonCollegate, consumiNonConvertiti } = await preparaCalcolo(sr, chiavi);
  const chiave = (m) => `${m.ubicazione_key}|${m.item_id}`;
  const esistentiByK = Object.fromEntries(esistenti.map((g) => [chiave(g), g]));
  const conteggiIncoerenti = [];
  const nuovi = [];
  const aggiornati = [];
  const etichette = [];

  coppie.forEach(({ u, p, k, moves, unitaSospette: fuori, rete, teorico, prossimo: prossimoPer }) => {
    const r = calcolaGiacenza(moves, now, soglia, teorico, rete);
    // Le etichette "sospetto" e "unità sospetta" sui conteggi seguono il calcolo: si scrivono solo dove sono cambiate
    moves.forEach((m) => {
      if (m.tipo !== 'conteggio' || !m.id) return;
      if (r.sospetti.has(m) !== m.sospetto || m.unita_sospetta) etichette.push({ id: m.id, sospetto: r.sospetti.has(m), unita_sospetta: false });
    });
    fuori.forEach((m) => {
      if (m.id && (!m.unita_sospetta || m.sospetto)) etichette.push({ id: m.id, sospetto: false, unita_sospetta: true });
    });
    const ultimoFuori = fuori[fuori.length - 1];
    if (r.incoerenti) conteggiIncoerenti.push({ ubicazione_key: u.ubicazione_key, item_nome: p.nome, negativi: r.negativi, totali: r.totali });
    const prossimo = prossimoPer(r, oggi);
    const record = {
      ...u,
      item_tipo: p.imp.item_tipo,
      item_id: p.imp.item_id,
      item_nome: p.nome,
      unita: p.imp.unita_conteggio,
      ultimo_conteggio_valore: r.ultimo ? r.ultimo.quantita : null,
      ultimo_conteggio_data: r.ultimo ? new Date(r.ultimo.t).toISOString() : null,
      unita_sospetta_conteggi: fuori.length,
      unita_sospetta_valore: ultimoFuori ? ultimoFuori.quantita : null,
      unita_sospetta_data: ultimoFuori ? new Date(ultimoFuori.t).toISOString() : null,
      giacenza_stimata: r3(r.giacenza),
      consumo_medio_giorno: r3(r.consumo),
      consumo_teorico_giorno: r3(r.teoricoGiorno),
      fattore_correzione: r3(r.fattore),
      fonte_consumo: r.fonte,
      uscite_registrate_giorno: r3(r.usciteGiorno),
      intervalli_negativi: r.negativi,
      intervalli_totali: r.totali,
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

  // Giacenze di prodotti non più previsti in quell'ubicazione (esclusi, spostati in laboratorio, non più in uso)
  const previste = new Set(coppie.map((c) => c.k));
  const daEliminare = esistenti.filter((g) => !previste.has(chiave(g))).map((g) => g.id);

  for (const blocco of aBlocchi(nuovi, 500)) await E.GiacenzaStimata.bulkCreate(blocco);
  for (const blocco of aBlocchi(aggiornati, 500)) await E.GiacenzaStimata.bulkUpdate(blocco);
  for (const blocco of aBlocchi(daEliminare, 200)) await E.GiacenzaStimata.deleteMany({ id: { $in: blocco } });
  for (const blocco of aBlocchi(etichette, 500)) await E.MovimentoMagazzino.bulkUpdate(blocco);

  if (conteggiIncoerenti.length) console.warn('Conteggi incoerenti', JSON.stringify(conteggiIncoerenti));
  if (consumiNonConvertiti.length) console.warn('Consumo teorico non convertibile nell\'unità di conteggio', JSON.stringify(consumiNonConvertiti));
  return {
    create: nuovi.length,
    aggiornate: aggiornati.length,
    eliminate: daEliminare.length,
    conteggi_incoerenti: conteggiIncoerenti,
    conteggi_sospetti: etichette.filter((e) => e.sospetto).length,
    unita_sospette: etichette.filter((e) => e.unita_sospetta).length,
    vendite_non_collegate: venditeNonCollegate,
    consumi_non_convertiti: consumiNonConvertiti
  };
}