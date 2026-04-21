import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { rows } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'Missing or empty rows array' }, { status: 400 });
    }

    // Load stores and cache
    const stores = await base44.asServiceRole.entities.Store.list();
    const storeMap = {};
    stores.forEach(s => { storeMap[s.name.toLowerCase().trim()] = s; });

    const results = { created: 0, updated: 0, errors: [] };

    for (const row of rows) {
      try {
        const storeName = (row.store || '').trim();
        const storeRecord = storeMap[storeName.toLowerCase()];

        if (!storeRecord) {
          results.errors.push({ row, error: `Store not found: ${storeName}` });
          continue;
        }

        const hourNum = parseInt(row.order_hour);
        if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
          results.errors.push({ row, error: `Invalid hour: ${row.order_hour}` });
          continue;
        }

        const revenue = parseFloat(row.total_revenue) || 0;
        const orders = parseInt(row.total_orders) || 0;
        const avgTicket = orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0;

        // Match cassieri
        const turni = await base44.asServiceRole.entities.TurnoPlanday.filter({
          store_id: storeRecord.id,
          data: row.order_date
        });

        const matchedEmployees = [];
        for (const turno of turni) {
          if (!turno.ruolo || !turno.ruolo.toLowerCase().includes('cassier')) continue;
          const shiftStart = parseInt((turno.ora_inizio || '0').split(':')[0]);
          const shiftEnd = parseInt((turno.ora_fine || '0').split(':')[0]);
          let isInShift = false;
          if (shiftEnd > shiftStart) {
            isInShift = hourNum >= shiftStart && hourNum < shiftEnd;
          } else if (shiftEnd < shiftStart) {
            isInShift = hourNum >= shiftStart || hourNum < shiftEnd;
          } else {
            isInShift = hourNum === shiftStart;
          }
          if (isInShift) {
            matchedEmployees.push({
              employee_name: turno.dipendente_nome || 'N/A',
              employee_id: turno.dipendente_id || '',
              shift_id: turno.id
            });
          }
        }

        // Dedup
        const existing = await base44.asServiceRole.entities.RevenueByHour.filter({
          store_id: storeRecord.id,
          order_date: row.order_date,
          order_hour: hourNum
        });

        if (existing.length > 0) {
          await base44.asServiceRole.entities.RevenueByHour.update(existing[0].id, {
            total_revenue: revenue,
            total_orders: orders,
            avg_ticket: avgTicket,
            matched_employees: matchedEmployees,
            import_date: new Date().toISOString(),
            imported_by: user.email
          });
          results.updated++;
        } else {
          await base44.asServiceRole.entities.RevenueByHour.create({
            store_name: storeRecord.name,
            store_id: storeRecord.id,
            order_date: row.order_date,
            order_hour: hourNum,
            total_revenue: revenue,
            total_orders: orders,
            avg_ticket: avgTicket,
            matched_employees: matchedEmployees,
            import_date: new Date().toISOString(),
            imported_by: user.email
          });
          results.created++;
        }
      } catch (rowError) {
        results.errors.push({ row, error: rowError.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Error in bulk import revenue by hour:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});