import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { salvaListe } from '../../shared/inv2Lista.ts';
import { ricalcola } from '../../shared/inv2Ricalcolo.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Admin per le chiamate manuali; le automazioni programmate non hanno un utente
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      // Nessun utente: automazione programmata
    }
    const { ubicazione_key } = await req.json().catch(() => ({}));
    const esito = await ricalcola(base44.asServiceRole, ubicazione_key ? [ubicazione_key] : null);
    // Ricalcolo completo (quello notturno): salva la lista prevista per la sera
    const liste_salvate = ubicazione_key ? 0 : await salvaListe(base44.asServiceRole);
    return Response.json({ ...esito, liste_salvate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}