import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sheetId = '1OMP7ly-1GK6FYQSpMKLVcAGRSSh9gUzAGrhqTasKBrU';
    const sheetName = 'ACubeAPI Transactions';

    // Get access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch sheet data
    const range = `${sheetName}!A:AB`; // Covers all columns
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

    // Get existing transactions to avoid duplicates
    const existingTransactions = await base44.asServiceRole.entities.BankTransaction.list();
    const existingIds = new Set(existingTransactions.map(t => t.transactionId));

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;

      try {
        const transactionId = row[0] || '';
        
        // Skip if already imported or no ID
        if (!transactionId || existingIds.has(transactionId)) {
          skipped++;
          continue;
        }

        // Map all columns (0-indexed) - row[8] è Subcategory nel foglio, ma viene popolata dai matching rules
        const transactionData = {
          transactionId: row[0] || '',
          status: row[1] || '',
          madeOn: row[2] || '',
          amount: parseFloat(row[3]) || 0,
          currencyCode: row[4] || '',
          description: row[5] || '',
          additional: row[6] || '',
          category: row[7] || '',
          // row[8] = Subcategory (skip, calcolata dai matching)
          duplicated: row[9]?.toLowerCase() === 'true',
          account_name: row[10] || '',
          account_nature: row[11] || '',
          account_provider_name: row[12] || '',
          account_uuid: row[13] || '',
          account_balance_snapshot: parseFloat(row[14]) || 0,
          end_to_end_id: row[15] || '',
          exchange_rate: parseFloat(row[16]) || 0,
          information: row[17] || '',
          original_amount: parseFloat(row[18]) || 0,
          original_currency_code: row[19] || '',
          payee: row[20] || '',
          payee_information: row[21] || '',
          payer: row[22] || '',
          payer_information: row[23] || '',
          posting_date: row[24] || '',
          posting_time: row[25] || '',
          time: row[26] || '',
          type: row[27] || ''
        };

        await base44.asServiceRole.entities.BankTransaction.create(transactionData);
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
    console.error('Error importing bank transactions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});