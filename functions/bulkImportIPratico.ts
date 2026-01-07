import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse request body
        let body;
        try {
            const text = await req.text();
            body = JSON.parse(text);
        } catch (parseError) {
            return Response.json({ 
                error: 'Invalid JSON in request body',
                details: parseError.message 
            }, { status: 400 });
        }
        
        // Validate webhook secret
        const providedSecret = body.secret;
        const expectedSecret = Deno.env.get('ZAPIER_IPRATICO_WEBHOOK_SECRET');
        
        if (!expectedSecret) {
            return Response.json({ 
                error: 'Server configuration error: ZAPIER_IPRATICO_WEBHOOK_SECRET not set'
            }, { status: 500 });
        }
        
        if (!providedSecret || providedSecret !== expectedSecret) {
            return Response.json({ 
                error: 'Unauthorized: Invalid or missing webhook secret'
            }, { status: 401 });
        }
        
        // Validate records array
        if (!body.records || !Array.isArray(body.records)) {
            return Response.json({ 
                error: 'Campo obbligatorio mancante: records (deve essere un array)',
                example: {
                    secret: "your_secret",
                    records: [
                        { store_name: "Ticinese", order_date: "2024-01-01", total_orders: 120, total_revenue: 2450.50 }
                    ]
                }
            }, { status: 400 });
        }

        if (body.records.length === 0) {
            return Response.json({ 
                error: 'Array records è vuoto'
            }, { status: 400 });
        }

        console.log(`📦 Starting bulk import for ${body.records.length} records`);

        // STEP 1: Get all stores once
        const allStores = await base44.asServiceRole.entities.Store.list();
        const storeMap = new Map(allStores.map(s => [s.name.toLowerCase(), s]));
        console.log(`📍 Loaded ${allStores.length} stores`);

        // STEP 2: Extract unique store IDs from records for pre-loading existing data
        const uniqueStoreIds = new Set();
        body.records.forEach(record => {
            const store = storeMap.get(record.store_name?.toLowerCase());
            if (store) uniqueStoreIds.add(store.id);
        });

        // STEP 3: Pre-load ALL existing iPratico records for these stores
        console.log(`🔍 Pre-loading existing records for ${uniqueStoreIds.size} stores...`);
        const allExistingRecords = [];
        for (const storeId of uniqueStoreIds) {
            const records = await base44.asServiceRole.entities.iPratico.filter({ store_id: storeId });
            allExistingRecords.push(...records);
            // Small delay to avoid rate limiting even here
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Create lookup map: "store_id|order_date" -> record
        const existingRecordsMap = new Map();
        allExistingRecords.forEach(record => {
            const key = `${record.store_id}|${record.order_date}`;
            existingRecordsMap.set(key, record);
        });
        console.log(`✅ Pre-loaded ${allExistingRecords.length} existing records`);

        // Helper to parse number fields
        const parseNumber = (value) => {
            if (value === null || value === undefined || value === '') return 0;
            const num = typeof value === 'number' ? value : parseFloat(value);
            return isNaN(num) ? 0 : num;
        };

        // Helper to parse date
        const parseDate = (dateStr) => {
            if (!dateStr) return new Date().toISOString().split('T')[0];
            
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                return dateStr.split('T')[0];
            }
            
            const parts = dateStr.split(/[\/\-\s]/);
            if (parts.length >= 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
            
            return new Date().toISOString().split('T')[0];
        };

        const results = {
            success: [],
            errors: [],
            skipped: [],
            stats: {
                total: body.records.length,
                created: 0,
                updated: 0,
                skipped: 0,
                failed: 0
            }
        };

        // STEP 4: Group records by store_id + order_date for deduplication
        const dedupMap = new Map();
        
        for (let i = 0; i < body.records.length; i++) {
            const record = body.records[i];
            
            try {
                // Validate required fields
                if (!record.store_name) {
                    throw new Error('Campo obbligatorio mancante: store_name');
                }
                if (record.order_date === undefined || record.order_date === null) {
                    throw new Error('Campo obbligatorio mancante: order_date');
                }
                if (record.total_orders === undefined || record.total_orders === null) {
                    throw new Error('Campo obbligatorio mancante: total_orders');
                }
                if (record.total_revenue === undefined || record.total_revenue === null) {
                    throw new Error('Campo obbligatorio mancante: total_revenue');
                }

                // Find store
                const store = storeMap.get(record.store_name.toLowerCase());
                if (!store) {
                    throw new Error(`Locale non trovato: "${record.store_name}". Locali disponibili: ${allStores.map(s => s.name).join(', ')}`);
                }

                const orderDate = parseDate(record.order_date);
                const dedupKey = `${store.id}|${orderDate}`;

                // Check for duplicates in current batch
                if (dedupMap.has(dedupKey)) {
                    results.stats.skipped++;
                    results.skipped.push({
                        index: i,
                        store_name: record.store_name,
                        order_date: orderDate,
                        reason: 'Duplicato nello stesso batch - solo il primo verrà processato'
                    });
                    console.log(`⏭️ Skipped duplicate in batch: ${record.store_name} - ${orderDate}`);
                    continue;
                }

                // Add to dedup map
                dedupMap.set(dedupKey, {
                    index: i,
                    store,
                    orderDate,
                    record
                });

            } catch (error) {
                results.stats.failed++;
                results.errors.push({
                    index: i,
                    store_name: record.store_name || 'unknown',
                    order_date: record.order_date || 'unknown',
                    error: error.message
                });
            }
        }

        console.log(`🔄 Processing ${dedupMap.size} unique records (${results.stats.skipped} duplicates skipped in batch)`);

        // STEP 5: Process deduplicated records in batches
        const BATCH_SIZE = 20; // Process 20 records at a time
        const BATCH_DELAY = 500; // 500ms delay between batches
        
        const recordsToProcess = Array.from(dedupMap.values());
        let processedCount = 0;

        for (let batchStart = 0; batchStart < recordsToProcess.length; batchStart += BATCH_SIZE) {
            const batch = recordsToProcess.slice(batchStart, batchStart + BATCH_SIZE);
            
            console.log(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(recordsToProcess.length / BATCH_SIZE)} (${batch.length} records)`);

            // Process batch sequentially
            for (const { index, store, orderDate, record } of batch) {
                try {
                    // Build iPratico data
                    const iPraticoData = {
                        store_id: store.id,
                        store_name: record.store_name,
                        order_date: orderDate,
                        total_orders: parseNumber(record.total_orders),
                        total_revenue: parseNumber(record.total_revenue),
                        
                        // Source App - Revenue
                        sourceApp_glovo: parseNumber(record.sourceApp_glovo),
                        sourceApp_deliveroo: parseNumber(record.sourceApp_deliveroo),
                        sourceApp_justeat: parseNumber(record.sourceApp_justeat),
                        sourceApp_onlineordering: parseNumber(record.sourceApp_onlineordering),
                        sourceApp_ordertable: parseNumber(record.sourceApp_ordertable),
                        sourceApp_tabesto: parseNumber(record.sourceApp_tabesto),
                        sourceApp_store: parseNumber(record.sourceApp_store),
                        
                        // Source App - Orders
                        sourceApp_glovo_orders: parseNumber(record.sourceApp_glovo_orders),
                        sourceApp_deliveroo_orders: parseNumber(record.sourceApp_deliveroo_orders),
                        sourceApp_justeat_orders: parseNumber(record.sourceApp_justeat_orders),
                        sourceApp_onlineordering_orders: parseNumber(record.sourceApp_onlineordering_orders),
                        sourceApp_ordertable_orders: parseNumber(record.sourceApp_ordertable_orders),
                        sourceApp_tabesto_orders: parseNumber(record.sourceApp_tabesto_orders),
                        sourceApp_store_orders: parseNumber(record.sourceApp_store_orders),
                        
                        // Source Type - Revenue
                        sourceType_delivery: parseNumber(record.sourceType_delivery),
                        sourceType_takeaway: parseNumber(record.sourceType_takeaway),
                        sourceType_takeawayOnSite: parseNumber(record.sourceType_takeawayOnSite),
                        sourceType_store: parseNumber(record.sourceType_store),
                        
                        // Source Type - Orders
                        sourceType_delivery_orders: parseNumber(record.sourceType_delivery_orders),
                        sourceType_takeaway_orders: parseNumber(record.sourceType_takeaway_orders),
                        sourceType_takeawayOnSite_orders: parseNumber(record.sourceType_takeawayOnSite_orders),
                        sourceType_store_orders: parseNumber(record.sourceType_store_orders),
                        
                        // Money Type - Revenue
                        moneyType_bancomat: parseNumber(record.moneyType_bancomat),
                        moneyType_cash: parseNumber(record.moneyType_cash),
                        moneyType_online: parseNumber(record.moneyType_online),
                        moneyType_satispay: parseNumber(record.moneyType_satispay),
                        moneyType_credit_card: parseNumber(record.moneyType_credit_card),
                        moneyType_fidelity_card_points: parseNumber(record.moneyType_fidelity_card_points),
                        
                        // Money Type - Orders
                        moneyType_bancomat_orders: parseNumber(record.moneyType_bancomat_orders),
                        moneyType_cash_orders: parseNumber(record.moneyType_cash_orders),
                        moneyType_online_orders: parseNumber(record.moneyType_online_orders),
                        moneyType_satispay_orders: parseNumber(record.moneyType_satispay_orders),
                        moneyType_credit_card_orders: parseNumber(record.moneyType_credit_card_orders),
                        moneyType_fidelity_card_points_orders: parseNumber(record.moneyType_fidelity_card_points_orders)
                    };

                    // Check if exists in pre-loaded map
                    const lookupKey = `${store.id}|${orderDate}`;
                    const existingRecord = existingRecordsMap.get(lookupKey);

                    let resultRecord;
                    let action;

                    if (existingRecord) {
                        // Update existing
                        resultRecord = await base44.asServiceRole.entities.iPratico.update(
                            existingRecord.id,
                            iPraticoData
                        );
                        action = 'updated';
                        results.stats.updated++;
                        
                        // Update the map for future checks in same batch
                        existingRecordsMap.set(lookupKey, resultRecord);
                    } else {
                        // Create new
                        resultRecord = await base44.asServiceRole.entities.iPratico.create(iPraticoData);
                        action = 'created';
                        results.stats.created++;
                        
                        // Add to map for future checks in same batch
                        existingRecordsMap.set(lookupKey, resultRecord);
                    }

                    results.success.push({
                        index,
                        action,
                        store_name: record.store_name,
                        order_date: orderDate,
                        id: resultRecord.id
                    });

                    processedCount++;
                    if (processedCount % 10 === 0) {
                        console.log(`✅ Processed ${processedCount}/${recordsToProcess.length} records`);
                    }

                } catch (error) {
                    results.stats.failed++;
                    results.errors.push({
                        index,
                        store_name: record.store_name || 'unknown',
                        order_date: orderDate || 'unknown',
                        error: error.message
                    });
                    console.error(`❌ Error processing record ${index}:`, error.message);
                }
            }

            // Delay between batches to avoid rate limiting
            if (batchStart + BATCH_SIZE < recordsToProcess.length) {
                console.log(`⏸️ Pausing ${BATCH_DELAY}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }

        const statusCode = results.stats.failed === 0 ? 200 : 207; // 207 = Multi-Status

        return Response.json({
            success: results.stats.failed < results.stats.total,
            message: `Importazione completata: ${results.stats.created} creati, ${results.stats.updated} aggiornati, ${results.stats.skipped} duplicati saltati, ${results.stats.failed} falliti`,
            stats: results.stats,
            details: {
                success: results.success,
                skipped: results.skipped,
                errors: results.errors
            },
            performance: {
                total_records_in_request: body.records.length,
                unique_records_processed: recordsToProcess.length,
                duplicates_in_batch: results.stats.skipped,
                batch_size: BATCH_SIZE,
                batch_delay_ms: BATCH_DELAY
            }
        }, { status: statusCode });

    } catch (error) {
        console.error('Error in bulk import:', error);
        return Response.json({ 
            error: 'Errore durante l\'importazione bulk',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});