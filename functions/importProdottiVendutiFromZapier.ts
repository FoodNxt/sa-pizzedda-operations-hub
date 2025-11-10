import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Mapping from display names to field names
const PRODUCT_NAME_MAPPING = {
  'Acqua Frizzante': 'acqua_frizzante',
  'Acqua Naturale': 'acqua_naturale',
  'Baione Cannonau': 'baione_cannonau',
  'Bottarga': 'bottarga',
  'Capperi, olive e acciughe': 'capperi_olive_acciughe',
  'Cipolle caramellate e Gorgonzola': 'cipolle_caramellate_gorgonzola',
  'Coca Cola 33cl': 'coca_cola_33cl',
  'Coca Cola Zero 33cl': 'coca_cola_zero_33cl',
  'Contissa Vermentino': 'contissa_vermentino',
  'Estathe 33cl': 'estathe_33cl',
  'Fanta 33cl': 'fanta_33cl',
  'Fregola': 'fregola',
  'Friarielli e Olive': 'friarielli_olive',
  'Gorgonzola e Radicchio': 'gorgonzola_radicchio',
  'Guttiau 70gr': 'guttiau_70gr',
  'Guttiau Snack': 'guttiau_snack',
  'Ichnusa Ambra Limpida': 'ichnusa_ambra_limpida',
  'Ichnusa Classica': 'ichnusa_classica',
  'Ichnusa Non Filtrata': 'ichnusa_non_filtrata',
  'Malloreddus': 'malloreddus',
  'Malloreddus 4 sapori': 'malloreddus_4_sapori',
  'Margherita': 'margherita',
  'Nduja e stracciatella': 'nduja_stracciatella',
  'Nutella': 'nutella',
  'Pabassinos Anice': 'pabassinos_anice',
  'Pabassinos Noci': 'pabassinos_noci',
  'Pane Carasau': 'pane_carasau',
  'Pesca Gianduia': 'pesca_gianduia',
  'Pistacchio': 'pistacchio',
  'Pomodori e stracciatella': 'pomodori_stracciatella',
  'Salsiccia e Patate': 'salsiccia_patate',
  'Salsiccia Sarda e Pecorino': 'salsiccia_sarda_pecorino'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify webhook secret
    const secret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET');
    
    if (!expectedSecret) {
      console.error('ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET not configured');
      return Response.json({ 
        error: 'Webhook secret not configured',
        message: 'Please set ZAPIER_PRODOTTI_VENDUTI_WEBHOOK_SECRET in environment variables'
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (secret !== expectedSecret) {
      console.error('Invalid webhook secret provided');
      return Response.json({ 
        error: 'Invalid webhook secret' 
      }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await req.json();

    // Validate required fields
    if (!data.store_name || !data.data_vendita) {
      return Response.json({ 
        error: 'Missing required fields', 
        message: 'store_name and data_vendita are required'
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find store by name
    const stores = await base44.asServiceRole.entities.Store.filter({ name: data.store_name });
    if (stores.length === 0) {
      return Response.json({ 
        error: 'Store not found',
        message: `No store found with name: ${data.store_name}`
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare data for insertion
    const recordData = {
      store_name: data.store_name,
      store_id: stores[0].id,
      data_vendita: data.data_vendita
    };

    // Add product quantities
    Object.keys(PRODUCT_NAME_MAPPING).forEach(displayName => {
      const fieldName = PRODUCT_NAME_MAPPING[displayName];
      if (data[displayName] !== undefined && data[displayName] !== null && data[displayName] !== '') {
        recordData[fieldName] = parseFloat(data[displayName]) || 0;
      }
    });

    // Check if record already exists for this store and date
    const existing = await base44.asServiceRole.entities.ProdottiVenduti.filter({
      store_name: data.store_name,
      data_vendita: data.data_vendita
    });

    let result;
    if (existing.length > 0) {
      // Update existing record
      result = await base44.asServiceRole.entities.ProdottiVenduti.update(existing[0].id, recordData);
    } else {
      // Create new record
      result = await base44.asServiceRole.entities.ProdottiVenduti.create(recordData);
    }

    return Response.json({ 
      success: true,
      action: existing.length > 0 ? 'updated' : 'created',
      data: result
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error importing prodotti venduti:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});