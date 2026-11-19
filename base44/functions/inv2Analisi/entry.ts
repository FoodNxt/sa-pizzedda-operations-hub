import { createClientFromRequest } from 'npm:@base44/sdk@0.8.62';
import { soloAdmin } from '../../shared/inv2.ts';
import { calendario } from './calendario.ts';
import { consumabili } from './consumabili.ts';
import { confronto } from './confronto.ts';
import { consumi } from './consumi.ts';
import { diagnostica } from './diagnostica.ts';
import { rete } from './rete.ts';
import { soglie } from './soglie.ts';

const AZIONI = { calendario, consumabili, confronto, consumi, diagnostica, rete, soglie };

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { errore } = await soloAdmin(base44);
    if (errore) return errore;
    const { azione } = await req.json().catch(() => ({}));
    if (!Object.hasOwn(AZIONI, azione)) return Response.json({ error: 'azione non valida' }, { status: 400 });
    return Response.json(await AZIONI[azione](base44.asServiceRole));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}