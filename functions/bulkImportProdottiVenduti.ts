import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Mapping from CSV column names to field names
const COLUMN_MAPPING = {
  'data_vendita': 'data_vendita',
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

// Convert DD/MM/YYYY to YYYY-MM-DD
function convertDateFormat(dateString) {
  if (!dateString) return null;
  
  // Check if already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Convert from DD/MM/YYYY to YYYY-MM-DD
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  return null;
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
        // Validate and convert data_vendita
        if (!row.data_vendita) {
          errors.push(`Row ${i + 1}: Missing data_vendita`);
          continue;
        }

        const convertedDate = convertDateFormat(row.data_vendita);
        if (!convertedDate) {
          errors.push(`Row ${i + 1}: Invalid date format "${row.data_vendita}". Expected DD/MM/YYYY or YYYY-MM-DD`);
          continue;
        }

        // Prepare record data
        const recordData = {
          store_name: store_name,
          store_id: store_id,
          data_vendita: convertedDate
        };

        // Map product columns
        Object.keys(COLUMN_MAPPING).forEach(columnName => {
          if (columnName === 'data_vendita') return;
          
          const fieldName = COLUMN_MAPPING[columnName];
          if (row[columnName] !== undefined && row[columnName] !== null && row[columnName] !== '') {
            const value = parseFloat(row[columnName]);
            if (!isNaN(value)) {
              recordData[fieldName] = value;
            }
          }
        });

        // Check if record exists
        const existing = await base44.asServiceRole.entities.ProdottiVenduti.filter({
          store_id: store_id,
          data_vendita: convertedDate
        });

        if (existing.length > 0) {
          // Update
          await base44.asServiceRole.entities.ProdottiVenduti.update(existing[0].id, recordData);
          results.push({
            row: i + 1,
            action: 'updated',
            data_vendita: convertedDate,
            original_date: row.data_vendita
          });
        } else {
          // Create
          await base44.asServiceRole.entities.ProdottiVenduti.create(recordData);
          results.push({
            row: i + 1,
            action: 'created',
            data_vendita: convertedDate,
            original_date: row.data_vendita
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