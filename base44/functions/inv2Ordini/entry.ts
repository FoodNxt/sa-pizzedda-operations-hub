import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { fetchAll, loadConfig, norm, soloAdmin, ubicazionePer } from '../../shared/inv2.ts';
import { giornoRoma } from '../../shared/inv2Calcolo.ts';
import { prossimaConsegna } from '../../shared/inv2Consegne.ts';

// Proposte d'ordine di Inventario 2.0 per ubicazione e fornitore (sola lettura)
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { errore } = await soloAdmin(base44);
    if (errore) return errore;
    const sr = base44.asServiceRole;
    const E = sr.entities;

    const [{ config, labStoreId }, impostazioni, giacenze, materie, fornitori, inviati, stores] = await Promise.all([
      loadConfig(sr),
      fetchAll(E.ImpostazioneInventario2, { incluso: true, item_tipo: 'materia_prima' }),
      fetchAll(E.GiacenzaStimata, { item_tipo: 'materia_prima' }),
      fetchAll(E.MateriePrime),
      fetchAll(E.Fornitore),
      fetchAll(E.OrdineFornitore, { status: 'inviato' }),
      E.Store.list()
    ]);
    const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
    const mpById = Object.fromEntries(materie.map((m) => [m.id, m]));
    const fornByNome = Object.fromEntries(fornitori.map((f) => [norm(f.ragione_sociale), f]));
    const modalita = (storeId) => config.modalita_per_store?.[storeId] || 'spento';

    // Solo gli store in affiancamento o attivi; il laboratorio solo se il suo store non è spento
    const attivi = stores.filter((s) => s.status === 'active' && modalita(s.id) !== 'spento');
    const lab = stores.find((s) => s.id === labStoreId && modalita(s.id) !== 'spento');
    const ubicazioni = [
      ...attivi.map((s) => ({ key: s.id, nome: s.name, store_id: s.id, store_name: s.name, laboratorio: false, modalita: modalita(s.id) })),
      ...(lab ? [{ key: `lab:${lab.id}`, nome: `Laboratorio (${lab.name})`, store_id: lab.id, store_name: lab.name, laboratorio: true, modalita: modalita(lab.id) }] : [])
    ];
    const chiavi = new Set(ubicazioni.map((u) => u.key));

    // In arrivo (unità di conteggio) e ordini già inviati per store e fornitore
    const inArrivo = {};
    const aperti = {};
    inviati.forEach((o) => {
      const k = `${o.store_id}|${norm(o.fornitore)}`;
      (aperti[k] ||= []).push(o.data_invio || o.created_date);
      (o.prodotti || []).forEach((p) => {
        const imp = impById[p.prodotto_id];
        if (!imp) return;
        const key = o.ubicazione_key || ubicazionePer(o.store_id, imp.laboratorio, labStoreId).ubicazione_key;
        const id = `${key}|${p.prodotto_id}`;
        inArrivo[id] = (inArrivo[id] || 0) + (p.quantita_ordinata || 0) * (imp.fattore_unita_ordine || 1);
      });
    });

    const oggi = giornoRoma(new Date());
    const gruppi = {};
    const senza = {};
    giacenze.forEach((g) => {
      const imp = impById[g.item_id];
      const mp = mpById[g.item_id];
      if (!imp || !mp || !chiavi.has(g.ubicazione_key)) return;
      const f = fornByNome[norm(mp.fornitore)];
      if (!mp.fornitore || !f) {
        senza[mp.id] = { item_id: mp.id, nome: mp.nome_prodotto, fornitore: mp.fornitore || null };
        return;
      }
      const storeId = g.store_id || g.ubicazione_key.replace('lab:', '');
      const gruppo = (gruppi[`${g.ubicazione_key}|${f.id}`] ||= {
        ubicazione_key: g.ubicazione_key,
        fornitore: { id: f.id, ragione_sociale: f.ragione_sociale, email: f.contatto_email || null, referente: f.referente_nome || null, ordine_minimo: f.ordine_minimo || 0 },
        prossima_consegna: prossimaConsegna(f, oggi),
        ordini_aperti: aperti[`${storeId}|${norm(f.ragione_sociale)}`] || [],
        prodotti: []
      });
      const min = imp.min_per_ubicazione?.[g.ubicazione_key] ?? null;
      const max = imp.max_per_ubicazione?.[g.ubicazione_key] ?? null;
      gruppo.prodotti.push({
        item_id: mp.id,
        nome: mp.nome_prodotto,
        unita_conteggio: imp.unita_conteggio || g.unita || mp.unita_misura,
        unita_ordine: mp.unita_misura,
        fattore: imp.fattore_unita_ordine || 1,
        prezzo_unitario: mp.prezzo_unitario || 0,
        iva_percentuale: mp.iva_percentuale ?? 22,
        giacenza: g.giacenza_stimata ?? null,
        ultimo_conteggio_data: g.ultimo_conteggio_data || null,
        affidabilita: g.affidabilita || 'nessun_dato',
        min,
        max,
        in_arrivo: inArrivo[`${g.ubicazione_key}|${mp.id}`] || 0,
        consumo_giorno: (g.consumo_medio_giorno || 0) + (g.uscite_registrate_giorno || 0),
        sotto_min: g.giacenza_stimata != null && min != null && g.giacenza_stimata <= min
      });
    });

    const lista = Object.values(gruppi).map((gruppo) => {
      const scatta = gruppo.prodotti.some((p) => p.sotto_min);
      const prodotti = gruppo.prodotti.map((p) => {
        const daOrdinare = scatta && p.max != null && p.giacenza != null && (p.sotto_min || p.giacenza < p.max);
        const quantita = daOrdinare ? Math.ceil(Math.round(((p.max - p.giacenza - p.in_arrivo) / p.fattore) * 1e6) / 1e6) : 0;
        return quantita >= 1
          ? { ...p, quantita, etichetta: p.sotto_min ? 'Sotto min' : 'Completamento' }
          : { ...p, quantita: 0, etichetta: null };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
      return { ...gruppo, scatta, prodotti };
    }).sort((a, b) => a.fornitore.ragione_sociale.localeCompare(b.fornitore.ragione_sociale, 'it'));

    return Response.json({ ubicazioni, gruppi: lista, senza_fornitore: Object.values(senza) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}