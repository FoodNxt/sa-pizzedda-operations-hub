import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    
    // Validate webhook secret
    const expectedSecret = Deno.env.get('ZAPIER_PRODUTTIVITA_WEBHOOK_SECRET');
    if (!expectedSecret || body.secret !== expectedSecret) {
      return Response.json({ 
        error: 'Unauthorized: Invalid or missing webhook secret' 
      }, { status: 401 });
    }
    
    const {
      date,
      store,
      total_sum_all_slots,
      secret,
      ...slots
    } = body;

    if (!date || !store) {
      return Response.json({ 
        error: 'Missing required fields: date, store' 
      }, { status: 400 });
    }

    // Find store by name
    const stores = await base44.asServiceRole.entities.Store.list();
    const storeRecord = stores.find(s => 
      s.name.toLowerCase().trim() === store.toLowerCase().trim()
    );

    if (!storeRecord) {
      return Response.json({ 
        error: `Store not found: ${store}`,
        availableStores: stores.map(s => s.name)
      }, { status: 400 });
    }

    // Parse numeric slots
    const parsedSlots = {};
    Object.entries(slots).forEach(([key, value]) => {
      if (key.includes(':')) {
        const numValue = parseFloat(value);
        parsedSlots[key] = isNaN(numValue) ? 0 : numValue;
      }
    });

    const totalRevenue = parseFloat(total_sum_all_slots) || 
      Object.values(parsedSlots).reduce((sum, v) => sum + v, 0);

    // Check if record already exists
    const existing = await base44.asServiceRole.entities.RevenueByTimeSlot.filter({
      date,
      store_id: storeRecord.id
    });

    if (existing.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.RevenueByTimeSlot.update(existing[0].id, {
        slots: parsedSlots,
        total_revenue: totalRevenue
      });

      return Response.json({
        success: true,
        action: 'updated',
        recordId: existing[0].id,
        date,
        store: storeRecord.name,
        totalRevenue
      });
    } else {
      // Create new
      const record = await base44.asServiceRole.entities.RevenueByTimeSlot.create({
        date,
        store_id: storeRecord.id,
        store_name: storeRecord.name,
        slots: parsedSlots,
        total_revenue: totalRevenue
      });

      return Response.json({
        success: true,
        action: 'created',
        recordId: record.id,
        date,
        store: storeRecord.name,
        totalRevenue
      });
    }

  } catch (error) {
    console.error('Error importing revenue slot data:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});