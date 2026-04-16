import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const sheetId = '1OMP7ly-1GK6FYQSpMKLVcAGRSSh9gUzAGrhqTasKBrU';
    const sheetName = 'ACubeAPI Transactions';

    // Get access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Fetch sheet data
    const range = `${sheetName}!A:AB`;
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Sheet fetch error:', error);
      return Response.json({ error: 'Failed to fetch sheet data', details: error }, { status: 500 });
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length <= 1) {
      return Response.json({ message: 'No data in sheet', imported: 0 });
    }

    const dataRows = rows.slice(1);

    // Only process last 300 rows (new transactions are appended at bottom)
    const recentRows = dataRows.slice(-300);

    // Load recent DB transaction IDs for duplicate check
    // Use 2 paginated calls with delays (max 400 records) - enough for 5-min interval
    const existingIds = new Set();
    const pages = [
      { limit: 200, skip: 0 },
      { limit: 200, skip: 200 }
    ];
    for (const page of pages) {
      try {
        const batch = await base44.asServiceRole.entities.BankTransaction.list(
          '-created_date', page.limit, page.skip
        );
        if (!batch || batch.length === 0) break;
        for (const t of batch) {
          if (t.transactionId) existingIds.add(t.transactionId);
        }
        if (batch.length < page.limit) break;
        // Wait between pages to avoid rate limit
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error('Error fetching existing page:', page.skip, e.message);
        await new Promise(r => setTimeout(r, 3000));
        // Retry once
        try {
          const batch = await base44.asServiceRole.entities.BankTransaction.list(
            '-created_date', page.limit, page.skip
          );
          if (batch) {
            for (const t of batch) {
              if (t.transactionId) existingIds.add(t.transactionId);
            }
          }
        } catch (e2) {
          console.error('Retry failed for page:', page.skip, e2.message);
        }
      }
    }

    console.log(`Loaded ${existingIds.size} existing transaction IDs from DB`);

    let imported = 0;
    let skipped = 0;
    const errors = [];
    const toImport = [];

    for (const row of recentRows) {
      if (!row || row.length === 0) { skipped++; continue; }
      const transactionId = row[0] || '';
      if (!transactionId || existingIds.has(transactionId)) { skipped++; continue; }

      toImport.push({
        transactionId: row[0] || '',
        status: row[1] || '',
        madeOn: row[2] || '',
        amount: parseFloat(row[3]) || 0,
        currencyCode: row[4] || '',
        description: row[5] || '',
        additional: row[6] || '',
        category: row[7] || '',
        duplicated: row[8]?.toLowerCase() === 'true',
        account_name: row[11] || '',
        account_nature: row[12] || '',
        account_provider_name: row[13] || '',
        account_uuid: row[14] || '',
        account_balance_snapshot: parseFloat(row[15]) || 0,
        end_to_end_id: row[16] || '',
        exchange_rate: parseFloat(row[17]) || 0,
        information: row[19] || '',
        original_amount: parseFloat(row[20]) || 0,
        original_currency_code: row[21] || '',
        payee: row[22] || '',
        payee_information: row[23] || '',
        payer: row[24] || '',
        payer_information: row[25] || '',
        posting_date: row[26] || '',
        posting_time: row[27] || '',
        time: row[28] || '',
        type: row[29] || ''
      });
    }

    console.log(`Found ${toImport.length} new transactions to import`);

    if (toImport.length === 0) {
      return Response.json({ success: true, imported: 0, skipped, total_rows: recentRows.length });
    }

    // Bulk create in batches of 25 with delays
    const bulkBatchSize = 25;
    for (let i = 0; i < toImport.length; i += bulkBatchSize) {
      const batch = toImport.slice(i, i + bulkBatchSize);
      try {
        await base44.asServiceRole.entities.BankTransaction.bulkCreate(batch);
        imported += batch.length;
      } catch (error) {
        for (const item of batch) {
          try {
            await base44.asServiceRole.entities.BankTransaction.create(item);
            imported++;
          } catch (e) {
            errors.push({ transactionId: item.transactionId, error: e.message });
          }
        }
      }
      if (i + bulkBatchSize < toImport.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Log import
    try {
      await base44.asServiceRole.entities.BankImportLog.create({
        action_type: 'import',
        timestamp: new Date().toISOString(),
        imported_count: imported,
        skipped_count: skipped,
        status: 'success'
      });
    } catch (logErr) {
      console.error('Failed to create log:', logErr.message);
    }

    return Response.json({
      success: true,
      imported,
      skipped,
      total_rows: recentRows.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error importing bank transactions:', error);
    
    try {
      const errorBase44 = createClientFromRequest(req);
      await errorBase44.asServiceRole.entities.BankImportLog.create({
        action_type: 'import',
        timestamp: new Date().toISOString(),
        status: 'error',
        error_message: error.message
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});