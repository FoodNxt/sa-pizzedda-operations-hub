import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function parseCSV(csvText) {
  // Remove BOM if present
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.slice(1);
  }
  
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV deve avere almeno una riga di intestazione e una riga di dati');
  }

  // Parse a CSV line handling quoted values and both , and ; separators
  const parseLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
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
    
    // Pad missing columns with empty strings
    while (values.length < headers.length) values.push('');

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { csv_content, store_name, store_id } = await req.json();

    if (!csv_content || !store_name || !store_id) {
      return Response.json({ 
        error: 'Missing required fields',
        message: 'csv_content, store_name, and store_id are required'
      }, { status: 400 });
    }

    // Parse CSV
    let rows;
    try {
      rows = parseCSV(csv_content);
    } catch (e) {
      return Response.json({ 
        error: 'Invalid CSV format',
        message: e.message
      }, { status: 400 });
    }

    if (rows.length === 0) {
      return Response.json({ 
        error: 'No data rows found in CSV'
      }, { status: 400 });
    }

    console.log(`📦 Starting bulk import: ${rows.length} rows for store ${store_name}`);

    // Helper: retry with exponential backoff
    const withRetry = async (fn, maxRetries = 3) => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (err) {
          if (attempt === maxRetries || (err.status !== 429 && err.status !== 500)) throw err;
          const delay = 2000 * Math.pow(2, attempt);
          console.log(`⏳ Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    };

    // Pre-load existing ProdottiVenduti for this store
    // Collect unique dates from CSV to narrow the query
    const uniqueDates = [...new Set(rows.map(r => r.date).filter(Boolean))];
    const existingMap = new Map();

    // Load in date chunks to avoid fetching too many records at once
    const DATE_CHUNK = 10;
    for (let i = 0; i < uniqueDates.length; i += DATE_CHUNK) {
      const dateBatch = uniqueDates.slice(i, i + DATE_CHUNK);
      for (const d of dateBatch) {
        const records = await withRetry(() =>
          base44.asServiceRole.entities.ProdottiVenduti.filter({ store_id, data_vendita: d })
        );
        records.forEach(record => {
          existingMap.set(`${record.data_vendita}|${record.flavor}`, record);
        });
      }
      if (i + DATE_CHUNK < uniqueDates.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    console.log(`✅ Pre-loaded ${existingMap.size} existing records for ${uniqueDates.length} dates`);

    // Process rows
    const results = [];
    const errors = [];
    const BATCH_SIZE = 15;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        if (!row.date) { errors.push(`Riga ${i + 1}: Manca date`); continue; }
        if (!row.category) { errors.push(`Riga ${i + 1}: Manca category`); continue; }
        if (!row.flavor) { errors.push(`Riga ${i + 1}: Manca flavor`); continue; }
        if (!row.total_pizzas_sold) { errors.push(`Riga ${i + 1}: Manca total_pizzas_sold`); continue; }

        const recordData = {
          store_name,
          store_id,
          data_vendita: row.date,
          category: row.category,
          flavor: row.flavor,
          total_pizzas_sold: parseFloat(String(row.total_pizzas_sold).replace(',', '.')) || 0
        };

        const lookupKey = `${row.date}|${row.flavor}`;
        const existing = existingMap.get(lookupKey);

        if (existing) {
          await withRetry(() => base44.asServiceRole.entities.ProdottiVenduti.update(existing.id, recordData));
          results.push({ row: i + 1, action: 'updated', date: row.date, flavor: row.flavor });
        } else {
          const created = await withRetry(() => base44.asServiceRole.entities.ProdottiVenduti.create(recordData));
          existingMap.set(lookupKey, created);
          results.push({ row: i + 1, action: 'created', date: row.date, flavor: row.flavor });
        }

        // Delay every BATCH_SIZE records to avoid rate limiting
        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < rows.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if ((i + 1) % 20 === 0) {
          console.log(`✅ Processed ${i + 1}/${rows.length} rows`);
        }
      } catch (error) {
        errors.push(`Riga ${i + 1}: ${error.message}`);
      }
    }

    console.log(`🎉 Import complete: ${results.length} processed, ${errors.length} errors`);

    return Response.json({
      success: true,
      total_rows: rows.length,
      processed: results.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      errors: errors.length,
      error_details: errors,
      results: results
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});