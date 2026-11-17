import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { ricalcola } from '../../shared/inv2Ricalcolo.ts';

const ORE_24 = 24 * 3600000;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const E = sr.entities;

    const { produzione_id } = await req.json().catch(() => ({}));
    if (!produzione_id) return Response.json({ error: 'produzione_id è obbligatorio' }, { status: 400 });
    const produzione = await E.ProduzioneLab.get(produzione_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!produzione) return Response.json({ error: 'Produzione non trovata' }, { status: 404 });

    // Gli admin annullano sempre; l'operatore solo le proprie produzioni, entro 24 ore
    if (user.role !== 'admin') {
      const propria = produzione.operatore_email === user.email;
      const recente = Date.now() - Date.parse(produzione.created_date) <= ORE_24;
      if (!propria || !recente) {
        return Response.json({ error: 'Puoi annullare solo le tue produzioni, entro 24 ore' }, { status: 403 });
      }
    }

    const movimenti = await E.MovimentoMagazzino.filter({ riferimento_id: produzione_id });
    const ubicazioni = [...new Set(movimenti.map((m) => m.ubicazione_key))];
    await E.ProduzioneLab.update(produzione_id, { annullata: true });
    if (movimenti.length) await E.MovimentoMagazzino.deleteMany({ riferimento_id: produzione_id });

    let ricalcolato = true;
    if (ubicazioni.length) {
      try {
        await ricalcola(sr, ubicazioni);
      } catch (e) {
        ricalcolato = false;
        console.error('Ricalcolo non riuscito dopo l\'annullamento', e.message);
      }
    }
    return Response.json({ annullata: true, movimenti_eliminati: movimenti.length, ricalcolato });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}