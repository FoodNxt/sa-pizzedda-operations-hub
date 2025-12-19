import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  // Set CORS headers for all responses
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret'
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // Verify webhook secret
    const secret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET');
    
    if (!expectedSecret) {
      console.error('ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Webhook secret not configured',
          message: 'Please set ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET in environment variables'
        }), 
        { status: 500, headers }
      );
    }
    
    if (secret !== expectedSecret) {
      console.error('Invalid webhook secret provided');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }), 
        { status: 401, headers }
      );
    }

    const data = await req.json();

    // Validate required fields
    if (!data.store_name || !data.date || !data.category || !data.flavor || !data.total_pizzas_sold) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: 'store_name, date, category, flavor, and total_pizzas_sold are required'
        }), 
        { status: 400, headers }
      );
    }

    // Find store by name
    const stores = await base44.asServiceRole.entities.Store.filter({ name: data.store_name });
    if (stores.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Store not found',
          message: `No store found with name: ${data.store_name}`
        }), 
        { status: 400, headers }
      );
    }

    // Prepare data for insertion
    const recordData = {
      store_name: data.store_name,
      store_id: stores[0].id,
      data_vendita: data.date,
      category: data.category,
      flavor: data.flavor,
      total_pizzas_sold: parseFloat(data.total_pizzas_sold) || 0
    };

    // Check if record already exists for this store, date, and flavor
    const existing = await base44.asServiceRole.entities.ProdottiVenduti.filter({
      store_name: data.store_name,
      data_vendita: data.date,
      flavor: data.flavor
    });

    let result;
    if (existing.length > 0) {
      // Update existing record
      result = await base44.asServiceRole.entities.ProdottiVenduti.update(existing[0].id, recordData);
    } else {
      // Create new record
      result = await base44.asServiceRole.entities.ProdottiVenduti.create(recordData);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        action: existing.length > 0 ? 'updated' : 'created',
        data: result
      }), 
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Error importing prodotti venduti:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }), 
      { status: 500, headers }
    );
  }
});