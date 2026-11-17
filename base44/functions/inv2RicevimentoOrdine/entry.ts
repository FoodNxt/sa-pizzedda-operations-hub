import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { loadConfig, ubicazioneDaKey, ubicazionePer } from '../../shared/inv2.ts';

export default async function (req) {
  try {
    // Chiamata dal workflow (anche come dipendente): legge solo l'ordine indicato ed è idempotente
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const E = sr.entities;
    const { ordine_id } = await req.json().catch(() => ({}));
    if (!ordine_id) return Response.json({ error: 'ordine_id è obbligatorio' }, { status: 400 });

    const ordine = await E.OrdineFornitore.get(ordine_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!ordine) return Response.json({ error: 'Ordine non trovato' }, { status: 404 });
    if (ordine.status !== 'completato') return Response.json({ creati: 0, saltato: 'ordine non completato' });

    const gia = await E.MovimentoMagazzino.filter({ riferimento_id: ordine_id });
    if (gia.length) return Response.json({ creati: 0, saltato: 'ricevimento già registrato' });

    const righe = (ordine.prodotti || []).filter((p) => p.prodotto_id && p.quantita_ricevuta > 0);
    if (!righe.length) return Response.json({ creati: 0 });

    const ids = [...new Set(righe.map((p) => p.prodotto_id))];
    const [{ labStoreId }, materie, impostazioni] = await Promise.all([
      loadConfig(sr),
      E.MateriePrime.filter({ id: { $in: ids } }),
      E.ImpostazioneInventario2.filter({ item_id: { $in: ids } })
    ]);
    const materieIds = new Set(materie.map((m) => m.id));
    const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
    const data = ordine.data_completamento ? new Date(ordine.data_completamento).toISOString() : new Date().toISOString();

    const movimenti = righe.map((p) => {
      const imp = impById[p.prodotto_id];
      const ubicazione = ordine.ubicazione_key
        ? ubicazioneDaKey(ordine.ubicazione_key)
        : ubicazionePer(ordine.store_id, imp?.laboratorio, labStoreId);
      return {
        ...ubicazione,
        item_tipo: materieIds.has(p.prodotto_id) ? 'materia_prima' : 'semilavorato',
        item_id: p.prodotto_id,
        item_nome: p.nome_prodotto,
        tipo: 'ricevimento',
        quantita: p.quantita_ricevuta * (imp?.fattore_unita_ordine || 1),
        unita: imp?.unita_conteggio || p.unita_misura,
        data_movimento: data,
        utente_email: ordine.completato_da,
        fonte: 'ordine_fornitore',
        riferimento_id: ordine_id
      };
    });
    await E.MovimentoMagazzino.bulkCreate(movimenti);
    return Response.json({ creati: movimenti.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}