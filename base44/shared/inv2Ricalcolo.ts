import { aBlocchi, fetchAll, loadConfig, norm, ubicazionePer } from './inv2.ts';
import { GIORNO, calcolaGiacenza, giornoRoma, prossimoConteggio, senzaConteggiDoppi, unitaSospette } from './inv2Calcolo.ts';
import { consumoRete } from './inv2Rete.ts';
import { consumiTeorici, mezzanotte, ricetteEscluse } from './inv2Teorico.ts';
import { componiTeorico, teoriciDaSemilavorati } from './inv2TeoricoDerivato.ts';

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
  // 90 giorni: la finestra più lunga del consumo dai conteggi
  const dal = new Date(now - 90 * GIORNO).toISOString();
  const filtroUbic = chiavi?.length ? { ubicazione_key: { $in: chiavi } } : {};

  const [{ config, labStoreId }, stores, materie, ricette, fornitori] = await Promise.all([
    loadConfig(sr),
    E.Store.list(),
    fetchAll(E.MateriePrime),
    fetchAll(E.Ricetta),
    fetchAll(E.Fornitore)
  ]);
  const [impostazioni, esistenti, movimenti, ordiniAperti] = await Promise.all([
    fetchAll(E.ImpostazioneInventario2, { incluso: true }),
    fetchAll(E.GiacenzaStimata, filtroUbic),
    fetchAll(E.MovimentoMagazzino, { ...filtroUbic, data_movimento: { $gte: dal } }, 'data_movimento'),
    // Ordini degli ultimi 30 giorni non ancora confermati: finché restano aperti l'intervallo tra due verifiche admin non è pulito
    fetchAll(E.OrdineFornitore, { status: 'inviato', created_date: { $gte: new Date(now - 30 * GIORNO).toISOString() } })
  ]);
  // Per ubicazione e prodotto, l'invio del più vecchio ordine ancora aperto
  const laboratorio = Object.fromEntries(impostazioni.map((i) => [i.item_id, i.laboratorio]));
  const aperti = {};
  ordiniAperti.forEach((o) => (o.prodotti || []).forEach((riga) => {
    const key = o.ubicazione_key || ubicazionePer(o.store_id, laboratorio[riga.prodotto_id], labStoreId).ubicazione_key;
    const k = `${key}|${riga.prodotto_id}`;
    aperti[k] = Math.min(aperti[k] ?? Infinity, Date.parse(o.data_invio || o.created_date));
  }));

  // Semilavorati trasportabili del laboratorio: il calcolo è di rete finché non passano 14 giorni dalla data di partenza,
  // la più recente tra la prima produzione e il primo trasporto registrati
  const inclusi = new Set(impostazioni.map((i) => i.item_id));
  const trasportabili = ricette.filter((r) => r.is_semilavorato && r.trasportabile && inclusi.has(r.id)).map((r) => r.id);
  const primo = async (id, tipi) => {
    const page = await E.MovimentoMagazzino.filter({ item_id: id, tipo: { $in: tipi } }, { sort: 'data_movimento', limit: 1 });
    return page.items[0] ? Date.parse(page.items[0].data_movimento) : null;
  };
  const avvii = Object.fromEntries(await Promise.all(trasportabili.map(async (id) => {
    const [produzione, trasporto] = await Promise.all([primo(id, ['produzione_carico']), primo(id, ['trasporto_uscita', 'trasporto_entrata'])]);
    const partenza = produzione && trasporto ? Math.max(produzione, trasporto) : null;
    return [id, { produzioni: !!produzione, partenza, perNegozio: !!partenza && now - partenza >= 14 * GIORNO }];
  })));

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

  // Materie prime dei semilavorati che si contano: il loro teorico arriva da quello del semilavorato
  const daSemilavorati = teoriciDaSemilavorati({ coppie, teorici, ricette, materie, impostazioni, labStoreId });

  // Movimenti degli ultimi 90 giorni per ubicazione e prodotto
  const perCoppia = {};
  const chiave = (m) => `${m.ubicazione_key}|${m.item_id}`;
  const mossa = (m) => ({ id: m.id, sospetto: !!m.sospetto, unita_sospetta: !!m.unita_sospetta, unita_precedente: !!m.unita_precedente, unita: m.unita, tipo: m.tipo, verifica: m.fonte === 'verifica_admin', quantita: m.quantita || 0, t: Date.parse(m.data_movimento) });
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
  const calcolo = {
    now,
    oggi: giornoRoma(new Date(now)),
    soglia: config.soglia_affidabilita ?? 0.3,
    esistenti,
    venditeNonCollegate: teorici.nonCollegate,
    consumiNonConvertiti: teorici.nonConvertiti,
    coppie: coppie.map(({ u, p, k }) => {
      const unita = p.imp.unita_conteggio;
      const grezzi = (perCoppia[k] || []).sort((a, b) => a.t - b.t);
      const cambio = p.imp.data_cambio_unita_grammi ? mezzanotte(p.imp.data_cambio_unita_grammi) : 0;
      // Solo per i prodotti passati ai grammi: i conteggi prima del cambio fatti con l'unità di prima non si convertono e restano fuori
      const precedente = (m) => cambio > 0 && m.tipo === 'conteggio' && m.t < cambio && !!m.unita && !!unita && m.unita !== unita;
      // L'unità sospetta si giudica su tutti i conteggi letti, anche quelli prima dell'inizio dello storico
      const letti = senzaConteggiDoppi(grezzi.filter((m) => !precedente(m)));
      const fuori = unitaSospette(letti, unita, p.imp.conteggio_sospetto_da);
      const avvio = u.ubicazione_tipo === 'negozio' ? avvii[p.imp.item_id] : null;
      return {
      u,
      p,
      k,
      ordineAperto: aperti[k] ?? null,
      // I conteggi in unità sospetta o precedente restano fuori da consumo e giacenza
      moves: letti.filter((m) => m.t >= daQuando(u.store_id) && !fuori.has(m)),
      // Conteggi prima dell'inizio dello storico o doppi: non entrano nel calcolo ma perdono le etichette di unità
      primaStorico: grezzi.filter((m) => m.tipo === 'conteggio' && !precedente(m) && !fuori.has(m) && (m.t < daQuando(u.store_id) || !letti.includes(m))),
      unitaSospette: [...fuori],
      unitaPrecedenti: grezzi.filter(precedente),
      // Di rete: i conteggi del singolo negozio non dicono il consumo. Senza produzioni registrate lo scarto di rete è solo indicativo
      rete: avvio && !avvio.perNegozio ? { fattore: 1, produzioni: avvio.produzioni } : false,
      // La finestra del consumo non inizia prima dell'inizio dello storico, del cambio di unità e,
      // per i semilavorati tornati al calcolo per negozio, della data di partenza
      minimo: Math.max(daQuando(u.store_id), cambio, avvio?.perNegozio ? avvio.partenza : 0),
      // Consumo teorico del prodotto nell'ubicazione, giorno per giorno, dal primo giorno di vendita
      teorico: {
        ...componiTeorico(
          teorici.giorniPerStore, u.store_id, teorici.perStore[u.store_id]?.[p.imp.item_id], daSemilavorati[k] || [],
          grezzi.some((m) => m.tipo === 'produzione_scarico' && m.t >= now - 28 * GIORNO)
        ),
        // Per il teorico all'ora esatta: pesi orari dello store e se il prodotto ha vendite dirette
        ore: teorici.orario?.[u.store_id],
        itemId: p.imp.item_id,
        diretto: !!teorici.perStore[u.store_id]?.[p.imp.item_id]
      },
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

  // Con le produzioni registrate il fattore di rete corregge il teorico di ogni negozio
  const perItem = {};
  calcolo.coppie.filter((c) => c.rete?.produzioni).forEach((c) => (perItem[c.p.imp.item_id] ||= []).push(c));
  Object.values(perItem).forEach((lista) => {
    const c = consumoRete(lista, now - 28 * GIORNO);
    if (!(c.valido && c.misurabile && c.teorico > 0 && c.consumo >= 0)) return;
    const fattore = Math.min(1.5, Math.max(0.7, c.consumo / c.teorico));
    lista.forEach((x) => { x.rete.fattore = fattore; });
  });
  return calcolo;
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
  const soglie = new Set();

  coppie.forEach(({ u, p, k, moves, primaStorico, unitaSospette: fuori, unitaPrecedenti: precedenti, rete, minimo, ordineAperto, teorico, prossimo: prossimoPer }) => {
    const r = calcolaGiacenza(moves, now, soglia, teorico, rete, minimo, ordineAperto);
    primaStorico.forEach((m) => {
      if (m.id && (m.unita_sospetta || m.unita_precedente)) etichette.push({ id: m.id, sospetto: m.sospetto, unita_sospetta: false, unita_precedente: false });
    });
    // Le etichette "sospetto", "unità sospetta" e "unità precedente" sui conteggi seguono il calcolo: si scrivono solo dove sono cambiate
    moves.forEach((m) => {
      if (m.tipo !== 'conteggio' || !m.id) return;
      if (r.sospetti.has(m) !== m.sospetto || m.unita_sospetta || m.unita_precedente) {
        etichette.push({ id: m.id, sospetto: r.sospetti.has(m), unita_sospetta: false, unita_precedente: false });
      }
    });
    fuori.forEach((m) => {
      if (m.id && (!m.unita_sospetta || m.sospetto || m.unita_precedente)) etichette.push({ id: m.id, sospetto: false, unita_sospetta: true, unita_precedente: false });
    });
    precedenti.forEach((m) => {
      if (m.id && (!m.unita_precedente || m.sospetto || m.unita_sospetta)) etichette.push({ id: m.id, sospetto: false, unita_sospetta: false, unita_precedente: true });
    });
    const ultimoFuori = fuori[fuori.length - 1];
    if (r.incoerenti) conteggiIncoerenti.push({ ubicazione_key: u.ubicazione_key, item_nome: p.nome, negativi: r.negativi, totali: r.totali });
    // Soglie dei semilavorati contati in grammi nei negozi: 2 e 4 giorni di teorico a 100 g, salvo i valori messi a mano
    if (p.imp.item_tipo === 'semilavorato' && u.ubicazione_tipo === 'negozio' && p.imp.unita_conteggio === 'grammi' && r.teoricoGiorno > 0) {
      const manuali = p.imp.soglie_manuali_per_ubicazione?.[u.ubicazione_key] || {};
      [['min', 2], ['max', 4]].forEach(([campo, giorni]) => {
        const valore = Math.max(100, Math.round((giorni * r.teoricoGiorno) / 100) * 100);
        const mappa = `${campo}_per_ubicazione`;
        if (manuali[campo] || p.imp[mappa]?.[u.ubicazione_key] === valore) return;
        p.imp[mappa] = { ...(p.imp[mappa] || {}), [u.ubicazione_key]: valore };
        soglie.add(p.imp);
      });
    }
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
      unita_precedente_conteggi: precedenti.length,
      giorni_finestra_consumo: r.giorniFinestra,
      giacenza_stimata: r3(r.giacenza),
      consumo_medio_giorno: r3(r.consumo),
      consumo_teorico_giorno: r3(r.teoricoGiorno),
      teorico_dal: teorico.dal,
      teorico_provvisorio: teorico.provvisorio,
      teorico_fonte: teorico.fonte,
      fattore_correzione: r3(r.fattore),
      fonte_fattore: r.fonteFattore,
      consumo_misurato_giorno: r3(r.misurato?.consumo),
      consumo_misurato_giorni: r3(r.misurato?.giorni),
      intervalli_puliti: r.misurato?.intervalli ?? 0,
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
  for (const imp of soglie) await E.ImpostazioneInventario2.update(imp.id, { min_per_ubicazione: imp.min_per_ubicazione, max_per_ubicazione: imp.max_per_ubicazione });

  if (conteggiIncoerenti.length) console.warn('Conteggi incoerenti', JSON.stringify(conteggiIncoerenti));
  if (consumiNonConvertiti.length) console.warn('Consumo teorico non convertibile nell\'unità di conteggio', JSON.stringify(consumiNonConvertiti));
  return {
    create: nuovi.length,
    aggiornate: aggiornati.length,
    eliminate: daEliminare.length,
    soglie_aggiornate: soglie.size,
    conteggi_incoerenti: conteggiIncoerenti,
    conteggi_sospetti: etichette.filter((e) => e.sospetto).length,
    unita_sospette: etichette.filter((e) => e.unita_sospetta).length,
    unita_precedenti: etichette.filter((e) => e.unita_precedente).length,
    vendite_non_collegate: venditeNonCollegate,
    consumi_non_convertiti: consumiNonConvertiti
  };
}