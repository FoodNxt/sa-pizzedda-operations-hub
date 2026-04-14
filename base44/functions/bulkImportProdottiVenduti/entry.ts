import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parseCSV(csvText) {
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);
  
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('CSV deve avere almeno intestazione + una riga dati');

  const parseLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;
    while (values.length < headers.length) values.push('');
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const withRetry = async (fn, maxRetries = 4) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.status === 500 && /rate limit/i.test(err.message));
      if (attempt === maxRetries || !isRateLimit) throw err;
      const delay = 3000 * Math.pow(2, attempt); // 3s, 6s, 12s, 24s
      console.log(`⏳ Rate limited, waiting ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { csv_content, store_name, store_id } = await req.json();
    if (!csv_content || !store_name || !store_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let rows;
    try { rows = parseCSV(csv_content); } catch (e) {
      return Response.json({ error: 'Invalid CSV', message: e.message }, { status: 400 });
    }
    if (rows.length === 0) return Response.json({ error: 'No data rows' }, { status: 400 });

    console.log(`📦 Bulk import: ${rows.length} rows for ${store_name}`);

    // Validate rows first (no API calls)
    const validRows = [];
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.date) { errors.push(`Riga ${i+1}: Manca date`); continue; }
      if (!row.category) { errors.push(`Riga ${i+1}: Manca category`); continue; }
      if (!row.flavor) { errors.push(`Riga ${i+1}: Manca flavor`); continue; }
      if (!row.total_pizzas_sold) { errors.push(`Riga ${i+1}: Manca total_pizzas_sold`); continue; }
      validRows.push({ index: i + 1, ...row });
    }

    console.log(`✅ ${validRows.length} valid rows, ${errors.length} validation errors`);

    // Strategy: use bulkCreate in small batches, skip duplicate checking
    // This is MUCH faster than individual create/update calls
    const BATCH_SIZE = 5;
    let created = 0;
    let batchErrors = 0;

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const records = batch.map(row => ({
        store_name,
        store_id,
        data_vendita: row.date,
        category: row.category,
        flavor: row.flavor,
        total_pizzas_sold: parseFloat(String(row.total_pizzas_sold).replace(',', '.')) || 0
      }));

      try {
        await withRetry(() => base44.asServiceRole.entities.ProdottiVenduti.bulkCreate(records));
        created += records.length;
      } catch (err) {
        // If bulkCreate fails, try one by one
        console.log(`⚠️ Batch ${Math.floor(i/BATCH_SIZE)+1} bulkCreate failed, trying individually...`);
        for (const record of records) {
          try {
            await withRetry(() => base44.asServiceRole.entities.ProdottiVenduti.create(record));
            created++;
          } catch (e2) {
            batchErrors++;
            errors.push(`${record.data_vendita} ${record.flavor}: ${e2.message}`);
          }
          await sleep(1000);
        }
      }

      if (i + BATCH_SIZE < validRows.length) {
        await sleep(1500); // 1.5s between batches
      }

      if ((i + BATCH_SIZE) % 20 === 0 || i + BATCH_SIZE >= validRows.length) {
        console.log(`✅ Progress: ${Math.min(i + BATCH_SIZE, validRows.length)}/${validRows.length}`);
      }
    }

    console.log(`🎉 Done: ${created} created, ${errors.length} errors`);

    return Response.json({
      success: true,
      total_rows: rows.length,
      processed: created,
      created,
      updated: 0,
      errors: errors.length,
      error_details: errors.slice(0, 50)
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});