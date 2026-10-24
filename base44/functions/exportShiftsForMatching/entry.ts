import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

const DEFAULT_CONFIG = { tipi_turno_inclusi: ['Normale'], ruoli_esclusi: ['Preparazioni', 'Volantinaggio'] };

function minusOneDay(d) {
  const dt = new Date(d + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().split('T')[0];
}

export default async function(req) {
  try {
    const expected = secrets.get('MATCHING_API_KEY');
    if (!expected) return Response.json({ error: 'MATCHING_API_KEY not configured' }, { status: 500 });

    const url = new URL(req.url);
    const provided = req.headers.get('x-api-key') || url.searchParams.get('api_key');
    if (!provided || provided !== expected) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const from = url.searchParams.get('from') || null;
    const to = url.searchParams.get('to') || null;
    const store = url.searchParams.get('store') || null;

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole.entities;

    const query = {};
    if (from || to) {
      query.data = {};
      if (from) query.data.$gte = minusOneDay(from);
      if (to) query.data.$lte = to;
    }

    const turni = [];
    let skip = 0;
    while (true) {
      const page = await sr.TurnoPlanday.filter(query, 'data', 1000, skip);
      turni.push(...page);
      if (page.length < 1000) break;
      skip += 1000;
    }

    const [storesRaw, configs] = await Promise.all([sr.Store.list(), sr.ReviewAssignmentConfig.list()]);
    const storeMap = Object.fromEntries(storesRaw.map(s => [s.id, s]));
    const active = configs.find(c => c.is_active === true);
    const config = active
      ? { tipi_turno_inclusi: active.tipi_turno_inclusi ?? DEFAULT_CONFIG.tipi_turno_inclusi, ruoli_esclusi: active.ruoli_esclusi ?? DEFAULT_CONFIG.ruoli_esclusi }
      : DEFAULT_CONFIG;

    const storeLower = store ? store.toLowerCase() : null;

    const shifts = turni
      .filter(t => t.dipendente_nome && t.data && t.ora_inizio && t.ora_fine && t.is_prova !== true)
      .map(t => ({
        turno_id: t.id,
        store_id: t.store_id || null,
        store_nome: t.store_nome || storeMap[t.store_id]?.name || null,
        data: t.data,
        ora_inizio: t.ora_inizio,
        ora_fine: t.ora_fine,
        timbratura_entrata: t.timbratura_entrata || null,
        timbratura_uscita: t.timbratura_uscita || null,
        ruolo: t.ruolo || null,
        tipo_turno: t.tipo_turno || null,
        momento_turno: t.momento_turno || null,
        stato: t.stato || null,
        dipendente_id: t.dipendente_id || null,
        dipendente_nome: t.dipendente_nome
      }))
      .filter(s => !storeLower || (s.store_nome || '').toLowerCase().includes(storeLower))
      .sort((a, b) => a.data.localeCompare(b.data) || a.ora_inizio.localeCompare(b.ora_inizio));

    return Response.json({
      source: 'ops_hr',
      timezone: 'Europe/Rome',
      generated_at: new Date().toISOString(),
      params: { from, to, store },
      config,
      stores: storesRaw.map(s => ({ id: s.id, name: s.name, address: s.address || null, status: s.status || null })),
      count: shifts.length,
      shifts
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}