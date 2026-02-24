import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sheetId = Deno.env.get('GOOGLE_SHEET_SCONTI_ID');
    if (!sheetId) {
      return Response.json({ error: 'GOOGLE_SHEET_SCONTI_ID not configured' }, { status: 500 });
    }

    // Get access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch sheet data
    const range = 'Discount_calculation_daily!A:U'; // Covers all columns from order_date to moneyType_fidelity_card_points
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Failed to fetch sheet data', details: error }, { status: 500 });
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      return Response.json({ message: 'No data in sheet', imported: 0 });
    }

    // First row is header
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Get all existing sconti to avoid duplicates
    const existingSconti = await base44.asServiceRole.entities.Sconto.list();
    const existingKeys = new Set(
      existingSconti.map(s => `${s.order_date}|${s.channel}|${s.total_discount_price}`)
    );

    // Get stores for mapping
    const stores = await base44.asServiceRole.entities.Store.list();
    const storeMapping = {};
    stores.forEach(store => {
      storeMapping[store.name.toLowerCase()] = {
        id: store.id,
        name: store.name
      };
    });

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;

      try {
        // Map columns
        const order_date = row[0] || '';
        const channel = row[1] || '';
        const sourceApp_glovo = parseFloat(row[2]) || 0;
        const sourceApp_deliveroo = parseFloat(row[3]) || 0;
        const sourceApp_justeat = parseFloat(row[4]) || 0;
        const sourceApp_onlineordering = parseFloat(row[5]) || 0;
        const sourceApp_ordertable = parseFloat(row[6]) || 0;
        const sourceApp_tabesto = parseFloat(row[7]) || 0;
        const sourceApp_deliverect = parseFloat(row[8]) || 0;
        const sourceApp_store = parseFloat(row[9]) || 0;
        const sourceType_delivery = parseFloat(row[10]) || 0;
        const sourceType_takeaway = parseFloat(row[11]) || 0;
        const sourceType_takeawayOnSite = parseFloat(row[12]) || 0;
        const sourceType_store = parseFloat(row[13]) || 0;
        const moneyType_bancomat = parseFloat(row[14]) || 0;
        const moneyType_cash = parseFloat(row[15]) || 0;
        const moneyType_online = parseFloat(row[16]) || 0;
        const moneyType_satispay = parseFloat(row[17]) || 0;
        const moneyType_credit_card = parseFloat(row[18]) || 0;
        const moneyType_fidelity_card_points = parseFloat(row[19]) || 0;

        // Calculate total as sum of all sourceApp
        const total_discount_price = sourceApp_glovo + sourceApp_deliveroo + sourceApp_justeat + 
          sourceApp_onlineordering + sourceApp_ordertable + sourceApp_tabesto + 
          sourceApp_deliverect + sourceApp_store;

        // Skip if no discount
        if (total_discount_price === 0) {
          skipped++;
          continue;
        }

        // Skip if already imported
        const key = `${order_date}|${channel}|${total_discount_price}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        // Find store mapping
        const storeKey = channel.toLowerCase();
        const mappedStore = storeMapping[storeKey];

        // Create sconto record
        const scontoData = {
          order_date,
          channel,
          total_discount_price,
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

        if (mappedStore) {
          scontoData.store_id = mappedStore.id;
          scontoData.store_name = mappedStore.name;
        }

        await base44.asServiceRole.entities.Sconto.create(scontoData);
        imported++;

      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    return Response.json({
      success: true,
      imported,
      skipped,
      total_rows: dataRows.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error importing sconti:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});