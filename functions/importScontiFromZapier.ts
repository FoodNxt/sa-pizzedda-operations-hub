import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Parse the request body
    const body = await req.json();
    
    // Log body for debugging FIRST (before any validation)
    console.log('Received body:', JSON.stringify(body, null, 2));
    console.log('Body keys:', Object.keys(body));
    
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
    
    // VALIDATE: channel must be a text store name, not a number
    if (!body.channel) {
      return Response.json({ 
        error: 'Campo channel mancante',
        received_body: body,
        help: 'Il campo channel deve contenere il nome dello store (es. "Ticinese")'
      }, { status: 400 });
    }
    
    const channelStr = String(body.channel).trim();
    
    if (channelStr === '') {
      return Response.json({ 
        error: 'Campo channel vuoto',
        received_body: body,
        help: 'Il campo channel deve contenere il nome dello store (es. "Ticinese")'
      }, { status: 400 });
    }
    
    // Check if channel is a number (common error)
    const channelAsNumber = parseFloat(channelStr);
    if (!isNaN(channelAsNumber) && channelStr.match(/^\d+\.?\d*$/)) {
      return Response.json({ 
        error: 'ERRORE MAPPATURA ZAPIER: Il campo channel contiene un numero invece del nome dello store',
        received_channel: channelStr,
        help: 'In Zapier, il campo "channel" deve essere mappato alla colonna che contiene il NOME dello store (es. "Ticinese", "Lanino"), non a una colonna numerica. Controlla che in Zapier il campo "channel" punti alla colonna corretta del tuo Google Sheet.',
        received_body: body
      }, { status: 400 });
    }
    
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
      } else {
        console.log('WARNING: Store not found for channel:', body.channel);
        console.log('Available stores:', stores.map(s => s.name));
      }
    }
    
    // Extract all discount values
    const sourceApp_glovo = parseFloat(body.sourceApp_glovo || body.Glovo) || 0;
    const sourceApp_deliveroo = parseFloat(body.sourceApp_deliveroo || body.Deliveroo) || 0;
    const sourceApp_justeat = parseFloat(body.sourceApp_justeat || body.JustEat) || 0;
    const sourceApp_onlineordering = parseFloat(body.sourceApp_onlineordering || body.OnlineOrdering) || 0;
    const sourceApp_ordertable = parseFloat(body.sourceApp_ordertable || body.OrderTable) || 0;
    const sourceApp_tabesto = parseFloat(body.sourceApp_tabesto || body.Tabesto) || 0;
    const sourceApp_deliverect = parseFloat(body.sourceApp_deliverect || body.Deliverect) || 0;
    const sourceApp_store = parseFloat(body.sourceApp_store || body.Store) || 0;
    const sourceType_delivery = parseFloat(body.sourceType_delivery || body.Delivery) || 0;
    const sourceType_takeaway = parseFloat(body.sourceType_takeaway || body.Takeaway) || 0;
    const sourceType_takeawayOnSite = parseFloat(body.sourceType_takeawayOnSite || body.TakeawayOnSite) || 0;
    const sourceType_store = parseFloat(body.sourceType_store || body.StoreType) || 0;
    const moneyType_bancomat = parseFloat(body.moneyType_bancomat || body.Bancomat) || 0;
    const moneyType_cash = parseFloat(body.moneyType_cash || body.Cash) || 0;
    const moneyType_online = parseFloat(body.moneyType_online || body.Online) || 0;
    const moneyType_satispay = parseFloat(body.moneyType_satispay || body.Satispay) || 0;
    const moneyType_credit_card = parseFloat(body.moneyType_credit_card || body.CreditCard) || 0;
    const moneyType_fidelity_card_points = parseFloat(body.moneyType_fidelity_card_points || body.FidelityCardPoints) || 0;
    
    // Calculate total_discount_price as sum of sourceApp only (sourceType and moneyType are alternative aggregations of the same total)
    const totalDiscount = sourceApp_glovo + sourceApp_deliveroo + sourceApp_justeat + 
                          sourceApp_onlineordering + sourceApp_ordertable + sourceApp_tabesto + 
                          sourceApp_deliverect + sourceApp_store;
    
    const scontoData = {
      order_date: body.order_date || body.orderDate,
      total_discount_price: totalDiscount,
      channel: body.channel || body.store_name || '',
      store_id: store_id,
      store_name: store_name || body.channel,
      sourceApp_glovo,
      sourceApp_deliveroo,
      sourceApp_justeat,
      sourceApp_onlineordering,
      sourceApp_ordertable,
      sourceApp_tabesto,
      sourceApp_deliverect,
      sourceApp_store,
      sourceType_delivery,
      sourceType_takeaway,
      sourceType_takeawayOnSite,
      sourceType_store,
      moneyType_bancomat,
      moneyType_cash,
      moneyType_online,
      moneyType_satispay,
      moneyType_credit_card,
      moneyType_fidelity_card_points
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