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
    
    // Extract sconto data
    const scontoData = {
      order_date: body.order_date,
      total_discount_price: parseFloat(body.total_discount_price) || 0,
      channel: body.channel || '',
      sourceApp_glovo: body.sourceApp_glovo === true || body.sourceApp_glovo === 'true',
      sourceApp_deliveroo: body.sourceApp_deliveroo === true || body.sourceApp_deliveroo === 'true',
      sourceApp_justeat: body.sourceApp_justeat === true || body.sourceApp_justeat === 'true',
      sourceApp_onlineordering: body.sourceApp_onlineordering === true || body.sourceApp_onlineordering === 'true',
      sourceApp_ordertable: body.sourceApp_ordertable === true || body.sourceApp_ordertable === 'true',
      sourceApp_tabesto: body.sourceApp_tabesto === true || body.sourceApp_tabesto === 'true',
      sourceApp_deliverect: body.sourceApp_deliverect === true || body.sourceApp_deliverect === 'true',
      sourceApp_store: body.sourceApp_store === true || body.sourceApp_store === 'true',
      sourceType_delivery: body.sourceType_delivery === true || body.sourceType_delivery === 'true',
      sourceType_takeaway: body.sourceType_takeaway === true || body.sourceType_takeaway === 'true',
      sourceType_takeawayOnSite: body.sourceType_takeawayOnSite === true || body.sourceType_takeawayOnSite === 'true',
      sourceType_store: body.sourceType_store === true || body.sourceType_store === 'true',
      moneyType_bancomat: body.moneyType_bancomat === true || body.moneyType_bancomat === 'true',
      moneyType_cash: body.moneyType_cash === true || body.moneyType_cash === 'true',
      moneyType_online: body.moneyType_online === true || body.moneyType_online === 'true',
      moneyType_satispay: body.moneyType_satispay === true || body.moneyType_satispay === 'true',
      moneyType_credit_card: body.moneyType_credit_card === true || body.moneyType_credit_card === 'true',
      moneyType_fidelity_card_points: body.moneyType_fidelity_card_points === true || body.moneyType_fidelity_card_points === 'true'
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