import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.json();

    // Support both flat payload and nested under "data"
    const body = rawBody.data ? rawBody.data : rawBody;

    // Validate webhook secret
    const expectedSecret = Deno.env.get('ZAPIER_REVENUE_BY_HOUR_WEBHOOK_SECRET');
    if (!expectedSecret || body.secret !== expectedSecret) {
      return Response.json({ error: 'Unauthorized: Invalid or missing webhook secret' }, { status: 401 });
    }

    const { store, order_date, order_hour, total_revenue, total_orders } = body;

    if (!store || !order_date || order_hour === undefined || order_hour === null) {
      return Response.json({ error: 'Missing required fields: store, order_date, order_hour' }, { status: 400 });
    }

    const hourNum = parseInt(order_hour);
    if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
      return Response.json({ error: 'order_hour must be a number between 0 and 23' }, { status: 400 });
    }

    const revenue = parseFloat(total_revenue) || 0;
    const orders = parseInt(total_orders) || 0;
    const avgTicket = orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0;

    // Find store
    const stores = await base44.asServiceRole.entities.Store.list();
    const storeRecord = stores.find(s => s.name.toLowerCase().trim() === store.toLowerCase().trim());

    if (!storeRecord) {
      return Response.json({
        error: `Store not found: ${store}`,
        availableStores: stores.map(s => s.name)
      }, { status: 400 });
    }

    // Match cassiere(i) in turno
    const turni = await base44.asServiceRole.entities.TurnoPlanday.filter({
      store_id: storeRecord.id,
      data: order_date
    });

    const matchedEmployees = [];
    for (const turno of turni) {
      // Only match Cassiere roles
      if (!turno.ruolo || !turno.ruolo.toLowerCase().includes('cassier')) continue;

      const shiftStart = parseInt((turno.ora_inizio || '0').split(':')[0]);
      const shiftEnd = parseInt((turno.ora_fine || '0').split(':')[0]);

      // Handle overnight shifts
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

    // Check for existing record (dedup)
    const existing = await base44.asServiceRole.entities.RevenueByHour.filter({
      store_id: storeRecord.id,
      order_date: order_date,
      order_hour: hourNum
    });

    if (existing.length > 0) {
      await base44.asServiceRole.entities.RevenueByHour.update(existing[0].id, {
        total_revenue: revenue,
        total_orders: orders,
        avg_ticket: avgTicket,
        matched_employees: matchedEmployees,
        import_date: new Date().toISOString()
      });

      return Response.json({
        success: true,
        action: 'updated',
        recordId: existing[0].id,
        store: storeRecord.name,
        order_date,
        order_hour: hourNum,
        avg_ticket: avgTicket,
        matched_employees: matchedEmployees.map(e => e.employee_name)
      });
    }

    const record = await base44.asServiceRole.entities.RevenueByHour.create({
      store_name: storeRecord.name,
      store_id: storeRecord.id,
      order_date,
      order_hour: hourNum,
      total_revenue: revenue,
      total_orders: orders,
      avg_ticket: avgTicket,
      matched_employees: matchedEmployees,
      import_date: new Date().toISOString(),
      imported_by: 'zapier'
    });

    return Response.json({
      success: true,
      action: 'created',
      recordId: record.id,
      store: storeRecord.name,
      order_date,
      order_hour: hourNum,
      avg_ticket: avgTicket,
      matched_employees: matchedEmployees.map(e => e.employee_name)
    });

  } catch (error) {
    console.error('Error importing revenue by hour:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});