import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
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

    // Process each row
    const results = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Validate required fields
        if (!row.date) {
          errors.push(`Row ${i + 1}: Missing date`);
          continue;
        }

        if (!row.category) {
          errors.push(`Row ${i + 1}: Missing category`);
          continue;
        }

        if (!row.flavor) {
          errors.push(`Row ${i + 1}: Missing flavor`);
          continue;
        }

        if (!row.total_pizzas_sold) {
          errors.push(`Row ${i + 1}: Missing total_pizzas_sold`);
          continue;
        }

        // Prepare record data
        const recordData = {
          store_name: store_name,
          store_id: store_id,
          data_vendita: row.date,
          category: row.category,
          flavor: row.flavor,
          total_pizzas_sold: parseFloat(row.total_pizzas_sold) || 0
        };

        // Check if record exists (same store, date, and flavor)
        const existing = await base44.asServiceRole.entities.ProdottiVenduti.filter({
          store_id: store_id,
          data_vendita: row.date,
          flavor: row.flavor
        });

        if (existing.length > 0) {
          // Update
          await base44.asServiceRole.entities.ProdottiVenduti.update(existing[0].id, recordData);
          results.push({
            row: i + 1,
            action: 'updated',
            date: row.date,
            flavor: row.flavor
          });
        } else {
          // Create
          await base44.asServiceRole.entities.ProdottiVenduti.create(recordData);
          results.push({
            row: i + 1,
            action: 'created',
            date: row.date,
            flavor: row.flavor
          });
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

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