import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Parse the request body
    const body = await req.json();
    
    // Validate webhook secret
    const secret = body.secret || new URL(req.url).searchParams.get('secret');
    const expectedSecret = Deno.env.get('ZAPIER_SCONTI_WEBHOOK_SECRET');
    
    if (!expectedSecret) {
      return Response.json({ error: 'ZAPIER_SCONTI_WEBHOOK_SECRET not configured' }, { status: 500 });
    }
    
    if (secret !== expectedSecret) {
      return Response.json({ error: 'Invalid secret' }, { status: 403 });
    }

    // Initialize Base44 client with service role (webhook, no user auth)
    const base44 = createClientFromRequest(req);
    
    // Match channel to store
    let store_id = null;
    let store_name = null;
    
    if (body.channel) {
      const stores = await base44.asServiceRole.entities.Store.list();
      const matchedStore = stores.find(s => 
        s.name?.toLowerCase().trim() === body.channel.toLowerCase().trim()
      );
      
      if (matchedStore) {
        store_id = matchedStore.id;
        store_name = matchedStore.name;
      }
    }
    
    // Log body for debugging
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Extract sconto data - try multiple field name variations
    const totalDiscount = parseFloat(body.total_discount_price) || 
                          parseFloat(body.totalDiscountPrice) || 
                          parseFloat(body.Total_Discount_Price) || 0;
    
    const scontoData = {
      order_date: body.order_date || body.orderDate,
      total_discount_price: totalDiscount,
      channel: body.channel || body.store_name || '',
      store_id: store_id,
      store_name: store_name || body.channel,
      sourceApp_glovo: parseFloat(body.sourceApp_glovo || body.Glovo) || 0,
      sourceApp_deliveroo: parseFloat(body.sourceApp_deliveroo || body.Deliveroo) || 0,
      sourceApp_justeat: parseFloat(body.sourceApp_justeat || body.JustEat) || 0,
      sourceApp_onlineordering: parseFloat(body.sourceApp_onlineordering || body.OnlineOrdering) || 0,
      sourceApp_ordertable: parseFloat(body.sourceApp_ordertable || body.OrderTable) || 0,
      sourceApp_tabesto: parseFloat(body.sourceApp_tabesto || body.Tabesto) || 0,
      sourceApp_deliverect: parseFloat(body.sourceApp_deliverect || body.Deliverect) || 0,
      sourceApp_store: parseFloat(body.sourceApp_store || body.Store) || 0,
      sourceType_delivery: parseFloat(body.sourceType_delivery || body.Delivery) || 0,
      sourceType_takeaway: parseFloat(body.sourceType_takeaway || body.Takeaway) || 0,
      sourceType_takeawayOnSite: parseFloat(body.sourceType_takeawayOnSite || body.TakeawayOnSite) || 0,
      sourceType_store: parseFloat(body.sourceType_store || body.StoreType) || 0,
      moneyType_bancomat: parseFloat(body.moneyType_bancomat || body.Bancomat) || 0,
      moneyType_cash: parseFloat(body.moneyType_cash || body.Cash) || 0,
      moneyType_online: parseFloat(body.moneyType_online || body.Online) || 0,
      moneyType_satispay: parseFloat(body.moneyType_satispay || body.Satispay) || 0,
      moneyType_credit_card: parseFloat(body.moneyType_credit_card || body.CreditCard) || 0,
      moneyType_fidelity_card_points: parseFloat(body.moneyType_fidelity_card_points || body.FidelityCardPoints) || 0
    };
    
    console.log('Processed scontoData:', JSON.stringify(scontoData, null, 2));
    
    // Create the sconto record
    const sconto = await base44.asServiceRole.entities.Sconto.create(scontoData);
    
    return Response.json({ 
      success: true,
      sconto_id: sconto.id,
      message: 'Sconto importato con successo'
    });
    
  } catch (error) {
    console.error('Error importing sconto:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});