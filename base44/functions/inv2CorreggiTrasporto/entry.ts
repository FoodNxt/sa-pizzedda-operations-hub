import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { soloAdmin, ubicazioneDaKey } from '../../shared/inv2.ts';
import { ricalcola } from '../../shared/inv2Ricalcolo.ts';
import { movimentiTrasporto, preparaTrasporto } from '../../shared/inv2Trasporto.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { errore: nonAdmin } = await soloAdmin(base44);
    if (nonAdmin) return nonAdmin;
    const sr = base44.asServiceRole;
    const E = sr.entities;

    const body = await req.json().catch(() => ({}));
    if (!body.trasporto_id) return Response.json({ error: 'trasporto_id è obbligatorio' }, { status: 400 });
    const trasporto = await E.TrasportoMagazzino.get(body.trasporto_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!trasporto) return Response.json({ error: 'Trasporto non trovato' }, { status: 404 });

    const { errore, campi } = await preparaTrasporto(sr, {
      item_id: trasporto.item_id,
      da_store_id: body.da_store_id || ubicazioneDaKey(trasporto.da_ubicazione_key).store_id,
      a_store_id: body.a_store_id || ubicazioneDaKey(trasporto.a_ubicazione_key).store_id,
      peso_kg: body.peso_kg ?? trasporto.peso_kg,
      pezzi: body.pezzi ?? trasporto.pezzi
    }, false);
    if (errore) return errore;

    const modifiche = { ...campi, note: body.note ?? trasporto.note ?? '' };
    await E.TrasportoMagazzino.update(trasporto.id, modifiche);

    // Aggiorna i due movimenti collegati (li ricrea se mancano)
    const esistenti = await E.MovimentoMagazzino.filter({ riferimento_id: trasporto.id, fonte: 'trasporto' });
    const nuovi = movimentiTrasporto({ ...trasporto, ...modifiche });
    await Promise.all(nuovi.map((n) => {
      const m = esistenti.find((x) => x.tipo === n.tipo);
      return m ? E.MovimentoMagazzino.update(m.id, n) : E.MovimentoMagazzino.create(n);
    }));

    let ricalcolato = true;
    try {
      await ricalcola(sr, [...new Set([...esistenti, ...nuovi].map((m) => m.ubicazione_key))]);
    } catch (e) {
      ricalcolato = false;
      console.error('Ricalcolo non riuscito dopo la correzione del trasporto', e.message);
    }
    return Response.json({ trasporto: { ...trasporto, ...modifiche }, ricalcolato });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}