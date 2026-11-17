import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { soloAdmin } from '../../shared/inv2.ts';
import { ricalcola } from '../../shared/inv2Ricalcolo.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { errore } = await soloAdmin(base44);
    if (errore) return errore;
    const { ubicazione_key } = await req.json().catch(() => ({}));
    return Response.json(await ricalcola(base44.asServiceRole, ubicazione_key ? [ubicazione_key] : null));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}