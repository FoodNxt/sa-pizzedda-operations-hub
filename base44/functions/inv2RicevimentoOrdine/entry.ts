import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { aBlocchi, fetchAll, loadConfig, soloAdmin } from '../../shared/inv2.ts';
import { movimentiRicevimento, righeRicevute } from '../../shared/inv2Ricevimento.ts';

const GIORNI_STORICO = 60;

// Ordini completati negli ultimi 60 giorni che non hanno ancora un movimento nel registro
async function importaStorico(sr) {
  const E = sr.entities;
  const dal = new Date(Date.now() - GIORNI_STORICO * 86400000).toISOString();
  const [{ labStoreId }, ordini, gia, materie, impostazioni] = await Promise.all([
    loadConfig(sr),
    fetchAll(E.OrdineFornitore, { status: 'completato', data_completamento: { $gte: dal } }, 'data_completamento'),
    fetchAll(E.MovimentoMagazzino, { fonte: 'ordine_fornitore', data_movimento: { $gte: dal } }, 'data_movimento'),
    fetchAll(E.MateriePrime),
    fetchAll(E.ImpostazioneInventario2)
  ]);
  const registrati = new Set(gia.map((m) => m.riferimento_id));
  const materieIds = new Set(materie.map((m) => m.id));
  const impById = Object.fromEntries(impostazioni.map((i) => [i.item_id, i]));
  const daImportare = ordini.filter((o) => !registrati.has(o.id) && righeRicevute(o).length);
  const movimenti = daImportare.flatMap((o) => movimentiRicevimento(o, materieIds, impById, labStoreId));
  for (const blocco of aBlocchi(movimenti, 500)) await E.MovimentoMagazzino.bulkCreate(blocco);
  return { ordini: daImportare.length, righe: movimenti.length, gia_registrati: ordini.filter((o) => registrati.has(o.id)).length };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const E = sr.entities;
    const { ordine_id, importa_storico } = await req.json().catch(() => ({}));

    if (importa_storico) {
      const { errore } = await soloAdmin(base44);
      if (errore) return errore;
      return Response.json(await importaStorico(sr));
    }

    // Chiamata dal workflow (anche come dipendente): legge solo l'ordine indicato ed è idempotente
    if (!ordine_id) return Response.json({ error: 'ordine_id è obbligatorio' }, { status: 400 });

    const ordine = await E.OrdineFornitore.get(ordine_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!ordine) return Response.json({ error: 'Ordine non trovato' }, { status: 404 });
    if (ordine.status !== 'completato') return Response.json({ creati: 0, saltato: 'ordine non completato' });

    const gia = await E.MovimentoMagazzino.filter({ riferimento_id: ordine_id });
    if (gia.length) return Response.json({ creati: 0, saltato: 'ricevimento già registrato' });

    const ids = [...new Set(righeRicevute(ordine).map((p) => p.prodotto_id))];
    if (!ids.length) return Response.json({ creati: 0 });

    const [{ labStoreId }, materie, impostazioni] = await Promise.all([
      loadConfig(sr),
      E.MateriePrime.filter({ id: { $in: ids } }),
      E.ImpostazioneInventario2.filter({ item_id: { $in: ids } })
    ]);
    const movimenti = movimentiRicevimento(
      ordine,
      new Set(materie.map((m) => m.id)),
      Object.fromEntries(impostazioni.map((i) => [i.item_id, i])),
      labStoreId
    );
    await E.MovimentoMagazzino.bulkCreate(movimenti);
    return Response.json({ creati: movimenti.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}