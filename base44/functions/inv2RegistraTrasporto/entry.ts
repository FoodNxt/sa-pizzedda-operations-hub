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

    // Solo per l'admin: data del trasporto e dipendente per conto del quale si registra
    const admin = user.role === 'admin';
    let data = new Date();
    if (admin && body.data_trasporto) {
      data = new Date(body.data_trasporto);
      const adesso = Date.now();
      if (isNaN(data.getTime())) return Response.json({ error: 'Data del trasporto non valida' }, { status: 400 });
      if (data.getTime() > adesso + 60000) return Response.json({ error: 'La data del trasporto non può essere nel futuro' }, { status: 400 });
      if (data.getTime() < adesso - 14 * 86400000) return Response.json({ error: 'La data del trasporto non può essere più vecchia di 14 giorni' }, { status: 400 });
    }
    const perConto = admin && (body.per_conto_di_email || body.per_conto_di_nome);

    const { errore, campi } = await preparaTrasporto(sr, body, true);
    if (errore) return errore;
    // Solo il riepilogo, senza salvare
    if (body.anteprima) return Response.json({ anteprima: campi });

    const trasporto = await E.TrasportoMagazzino.create({
      ...campi,
      operatore_email: perConto ? body.per_conto_di_email : user.email,
      operatore_nome: perConto ? body.per_conto_di_nome : user.nome_cognome || user.full_name,
      data_trasporto: data.toISOString(),
      note: [body.note, perConto ? `Registrato da admin ${user.email}` : ''].filter(Boolean).join(' · ')
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