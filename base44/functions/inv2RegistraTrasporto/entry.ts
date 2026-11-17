import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { ricalcola } from '../../shared/inv2Ricalcolo.ts';
import { movimentiTrasporto, preparaTrasporto } from '../../shared/inv2Trasporto.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const E = sr.entities;

    const body = await req.json().catch(() => ({}));
    const { errore, campi } = await preparaTrasporto(sr, body, true);
    if (errore) return errore;
    // Solo il riepilogo, senza salvare
    if (body.anteprima) return Response.json({ anteprima: campi });

    const trasporto = await E.TrasportoMagazzino.create({
      ...campi,
      operatore_email: user.email,
      operatore_nome: user.nome_cognome || user.full_name,
      data_trasporto: new Date().toISOString(),
      note: body.note || ''
    });
    const movimenti = movimentiTrasporto(trasporto);
    try {
      await E.MovimentoMagazzino.bulkCreate(movimenti);
    } catch (e) {
      await E.TrasportoMagazzino.delete(trasporto.id);
      throw e;
    }

    // Il trasporto è già salvato: se il ricalcolo fallisce ci pensa quello notturno
    let ricalcolato = true;
    try {
      await ricalcola(sr, movimenti.map((m) => m.ubicazione_key));
    } catch (e) {
      ricalcolato = false;
      console.error('Ricalcolo non riuscito dopo il trasporto', e.message);
    }
    return Response.json({ trasporto, ricalcolato });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}