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
    
    // Extract sconto data
    const totalDiscount = parseFloat(body.total_discount_price) || parseFloat(body.totalDiscountPrice) || 0;
    
    const scontoData = {
      order_date: body.order_date,
      total_discount_price: totalDiscount,
      channel: body.channel || '',
      store_id: store_id,
      store_name: store_name,
      sourceApp_glovo: parseFloat(body.sourceApp_glovo) || 0,
      sourceApp_deliveroo: parseFloat(body.sourceApp_deliveroo) || 0,
      sourceApp_justeat: parseFloat(body.sourceApp_justeat) || 0,
      sourceApp_onlineordering: parseFloat(body.sourceApp_onlineordering) || 0,
      sourceApp_ordertable: parseFloat(body.sourceApp_ordertable) || 0,
      sourceApp_tabesto: parseFloat(body.sourceApp_tabesto) || 0,
      sourceApp_deliverect: parseFloat(body.sourceApp_deliverect) || 0,
      sourceApp_store: parseFloat(body.sourceApp_store) || 0,
      sourceType_delivery: parseFloat(body.sourceType_delivery) || 0,
      sourceType_takeaway: parseFloat(body.sourceType_takeaway) || 0,
      sourceType_takeawayOnSite: parseFloat(body.sourceType_takeawayOnSite) || 0,
      sourceType_store: parseFloat(body.sourceType_store) || 0,
      moneyType_bancomat: parseFloat(body.moneyType_bancomat) || 0,
      moneyType_cash: parseFloat(body.moneyType_cash) || 0,
      moneyType_online: parseFloat(body.moneyType_online) || 0,
      moneyType_satispay: parseFloat(body.moneyType_satispay) || 0,
      moneyType_credit_card: parseFloat(body.moneyType_credit_card) || 0,
      moneyType_fidelity_card_points: parseFloat(body.moneyType_fidelity_card_points) || 0
    };
    
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