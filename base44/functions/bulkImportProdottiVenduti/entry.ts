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

    // Pre-load ALL existing ProdottiVenduti for this store to avoid per-row queries
    const allExisting = await base44.asServiceRole.entities.ProdottiVenduti.filter({ store_id });
    const existingMap = new Map();
    allExisting.forEach(record => {
      const key = `${record.data_vendita}|${record.flavor}`;
      existingMap.set(key, record);
    });
    console.log(`✅ Pre-loaded ${allExisting.length} existing records`);

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
          await base44.asServiceRole.entities.ProdottiVenduti.update(existing.id, recordData);
          results.push({ row: i + 1, action: 'updated', date: row.date, flavor: row.flavor });
        } else {
          const created = await base44.asServiceRole.entities.ProdottiVenduti.create(recordData);
          existingMap.set(lookupKey, created); // Prevent duplicates within same batch
          results.push({ row: i + 1, action: 'created', date: row.date, flavor: row.flavor });
        }

        // Small delay every BATCH_SIZE records to avoid rate limiting
        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < rows.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
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