import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const API_KEY = Deno.env.get("INVESTORS_API_KEY");

Deno.serve(async (req) => {
  try {
    // Auth via API key (header or query param)
    const url = new URL(req.url);
    const apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");
    
    if (!apiKey || apiKey !== API_KEY) {
      return Response.json({ error: "Unauthorized - Invalid API key" }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // Parse query params
    const startDate = url.searchParams.get("start_date"); // YYYY-MM-DD
    const endDate = url.searchParams.get("end_date");     // YYYY-MM-DD
    const storeName = url.searchParams.get("store");       // optional filter

    // Fetch all iPratico data
    const filter = {};
    if (startDate) filter.order_date = { $gte: startDate };
    if (endDate) filter.order_date = { ...filter.order_date, $lte: endDate };
    if (storeName) filter.store_name = storeName;

    const data = await base44.asServiceRole.entities.iPratico.filter(filter, "-order_date", 5000);

    // Fetch stores for metadata
    const stores = await base44.asServiceRole.entities.Store.list();
    const storeMap = {};
    stores.forEach(s => { storeMap[s.name] = { id: s.id, name: s.name, city: s.city, address: s.address }; });

    // Aggregate by store
    const byStore = {};
    data.forEach(day => {
      const sn = day.store_name;
      if (!byStore[sn]) {
        byStore[sn] = {
          store: storeMap[sn] || { name: sn },
          totals: { revenue: 0, orders: 0, days: 0 },
          channels: {
            glovo: { revenue: 0, orders: 0 },
            deliveroo: { revenue: 0, orders: 0 },
            justeat: { revenue: 0, orders: 0 },
            online_ordering: { revenue: 0, orders: 0 },
            store: { revenue: 0, orders: 0 },
            tabesto: { revenue: 0, orders: 0 },
            ordertable: { revenue: 0, orders: 0 },
          },
          order_types: {
            delivery: { revenue: 0, orders: 0 },
            takeaway: { revenue: 0, orders: 0 },
            takeaway_onsite: { revenue: 0, orders: 0 },
            store: { revenue: 0, orders: 0 },
          },
          daily: [],
        };
      }

      const entry = byStore[sn];
      entry.totals.revenue += day.total_revenue || 0;
      entry.totals.orders += day.total_orders || 0;
      entry.totals.days += 1;

      // Channels
      entry.channels.glovo.revenue += day.sourceApp_glovo || 0;
      entry.channels.glovo.orders += day.sourceApp_glovo_orders || 0;
      entry.channels.deliveroo.revenue += day.sourceApp_deliveroo || 0;
      entry.channels.deliveroo.orders += day.sourceApp_deliveroo_orders || 0;
      entry.channels.justeat.revenue += day.sourceApp_justeat || 0;
      entry.channels.justeat.orders += day.sourceApp_justeat_orders || 0;
      entry.channels.online_ordering.revenue += day.sourceApp_onlineordering || 0;
      entry.channels.online_ordering.orders += day.sourceApp_onlineordering_orders || 0;
      entry.channels.store.revenue += day.sourceApp_store || 0;
      entry.channels.store.orders += day.sourceApp_store_orders || 0;
      entry.channels.tabesto.revenue += day.sourceApp_tabesto || 0;
      entry.channels.tabesto.orders += day.sourceApp_tabesto_orders || 0;
      entry.channels.ordertable.revenue += day.sourceApp_ordertable || 0;
      entry.channels.ordertable.orders += day.sourceApp_ordertable_orders || 0;

      // Order types
      entry.order_types.delivery.revenue += day.sourceType_delivery || 0;
      entry.order_types.delivery.orders += day.sourceType_delivery_orders || 0;
      entry.order_types.takeaway.revenue += day.sourceType_takeaway || 0;
      entry.order_types.takeaway.orders += day.sourceType_takeaway_orders || 0;
      entry.order_types.takeaway_onsite.revenue += day.sourceType_takeawayOnSite || 0;
      entry.order_types.takeaway_onsite.orders += day.sourceType_takeawayOnSite_orders || 0;
      entry.order_types.store.revenue += day.sourceType_store || 0;
      entry.order_types.store.orders += day.sourceType_store_orders || 0;

      // Daily breakdown
      entry.daily.push({
        date: day.order_date,
        revenue: day.total_revenue || 0,
        orders: day.total_orders || 0,
      });
    });

    // Calculate grand totals
    let grandRevenue = 0;
    let grandOrders = 0;
    Object.values(byStore).forEach(s => {
      grandRevenue += s.totals.revenue;
      grandOrders += s.totals.orders;
      // Round all monetary values
      s.totals.revenue = Math.round(s.totals.revenue * 100) / 100;
      Object.values(s.channels).forEach(c => { c.revenue = Math.round(c.revenue * 100) / 100; });
      Object.values(s.order_types).forEach(c => { c.revenue = Math.round(c.revenue * 100) / 100; });
      // Sort daily by date
      s.daily.sort((a, b) => a.date.localeCompare(b.date));
    });

    const response = {
      period: {
        start_date: startDate || data[data.length - 1]?.order_date || null,
        end_date: endDate || data[0]?.order_date || null,
      },
      grand_totals: {
        revenue: Math.round(grandRevenue * 100) / 100,
        orders: grandOrders,
        stores_count: Object.keys(byStore).length,
      },
      stores: byStore,
    };

    return Response.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "x-api-key, Content-Type",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});