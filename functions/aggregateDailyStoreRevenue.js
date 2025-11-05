import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'npm:date-fns@3.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify authentication
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        
        // Get date from request or use yesterday as default
        let targetDate;
        if (body.date) {
            try {
                targetDate = parseISO(body.date);
            } catch (e) {
                return Response.json({ 
                    error: 'Invalid date format',
                    details: e.message 
                }, { status: 400 });
            }
        } else {
            // Default to yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            targetDate = yesterday;
        }

        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        console.log(`=== AGGREGATION START ===`);
        console.log(`Aggregating data for date: ${dateStr}`);
        console.log(`Day range: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);

        // ✅ Fetch ALL active stores first
        let allStores = [];
        try {
            console.log('=== FETCHING STORES ===');
            allStores = await base44.asServiceRole.entities.Store.list();
            console.log(`Found ${allStores.length} total stores:`);
            
            // Log store details for debugging
            allStores.forEach(store => {
                console.log(`  - ${store.name} (ID: ${store.id})`);
            });
        } catch (e) {
            console.error('Error fetching stores:', e);
            return Response.json({ 
                error: 'Error fetching stores',
                details: e.message,
                stack: e.stack
            }, { status: 500 });
        }

        // ✅ Fetch ALL OrderItems (no server-side filtering) and filter client-side
        let allOrderItems = [];
        try {
            console.log('=== FETCHING ALL ORDER ITEMS ===');
            console.log('Fetching all OrderItems (no server-side date filter)...');
            
            allOrderItems = await base44.asServiceRole.entities.OrderItem.list('-modifiedDate', 100000);
            
            console.log(`Fetched ${allOrderItems.length} total OrderItems from database`);
            
            // Log first few items to see date format
            if (allOrderItems.length > 0) {
                console.log('Sample of fetched items (first 5):');
                allOrderItems.slice(0, 5).forEach((item, i) => {
                    console.log(`  [${i+1}] ${item.orderItemName}`);
                    console.log(`      modifiedDate: ${item.modifiedDate} (type: ${typeof item.modifiedDate})`);
                    console.log(`      store_name: ${item.store_name}`);
                    console.log(`      finalPrice: €${item.finalPriceWithSessionDiscountsAndSurcharges}`);
                });
            }
        } catch (e) {
            console.error('Error fetching order items:', e);
            return Response.json({ 
                error: 'Error fetching order items',
                details: e.message,
                stack: e.stack
            }, { status: 500 });
        }

        // ✅ CLIENT-SIDE DATE FILTERING
        console.log('=== FILTERING BY DATE (CLIENT-SIDE) ===');
        const orderItems = allOrderItems.filter(item => {
            if (!item.modifiedDate) {
                console.warn(`Item ${item.orderItemName} has no modifiedDate, skipping`);
                return false;
            }
            
            try {
                const itemDate = parseISO(item.modifiedDate);
                const isInRange = isWithinInterval(itemDate, { start: dayStart, end: dayEnd });
                
                if (isInRange) {
                    console.log(`✓ Item in range: ${item.orderItemName} (${item.modifiedDate}) - ${item.store_name}`);
                }
                
                return isInRange;
            } catch (e) {
                console.warn(`Could not parse modifiedDate for item ${item.orderItemName}: ${item.modifiedDate}`, e);
                return false;
            }
        });
            
        console.log(`Found ${orderItems.length} order items for ${dateStr} after client-side filtering`);

        // ✅ Create maps for matching - PRIORITIZE NAME OVER ID
        const storeById = {};
        const storeByName = {};
        allStores.forEach(store => {
            storeById[store.id] = store;
            // Normalize name for matching (lowercase + trim)
            storeByName[store.name.toLowerCase().trim()] = store;
        });

        console.log('=== STORE MAPPING ===');
        console.log(`Created maps for ${allStores.length} stores`);
        console.log('Store names (normalized):', Object.keys(storeByName));

        // ✅ Group order items by store - PRIORITIZE MATCHING BY NAME
        const ordersByStore = {};
        const unmatchedItems = [];
        
        console.log('=== MATCHING ORDER ITEMS TO STORES ===');
        orderItems.forEach(item => {
            let matchedStore = null;
            
            // ✅ PRIORITY 1: Match by store_name (most reliable)
            if (item.store_name) {
                const normalizedName = item.store_name.toLowerCase().trim();
                matchedStore = storeByName[normalizedName];
                if (matchedStore) {
                    console.log(`✓ Matched by NAME: ${item.orderItemName} (store_name="${item.store_name}") -> ${matchedStore.name}`);
                }
            }
            
            // ✅ PRIORITY 2: Only if name matching failed, try by store_id
            if (!matchedStore && item.store_id && storeById[item.store_id]) {
                matchedStore = storeById[item.store_id];
                console.log(`✓ Matched by ID (fallback): ${item.orderItemName} (store_id="${item.store_id}") -> ${matchedStore.name}`);
            }
            
            if (matchedStore) {
                const storeId = matchedStore.id;
                if (!ordersByStore[storeId]) {
                    ordersByStore[storeId] = [];
                }
                ordersByStore[storeId].push(item);
            } else {
                // Log unmatched items for debugging
                console.warn(`✗ UNMATCHED: ${item.orderItemName} - store_id="${item.store_id}", store_name="${item.store_name}"`);
                unmatchedItems.push(item);
            }
        });

        console.log(`=== MATCHING SUMMARY ===`);
        console.log(`Matched items for ${Object.keys(ordersByStore).length} stores`);
        Object.entries(ordersByStore).forEach(([storeId, items]) => {
            const store = allStores.find(s => s.id === storeId);
            console.log(`  - ${store?.name || storeId}: ${items.length} items`);
        });
        if (unmatchedItems.length > 0) {
            console.warn(`⚠️ ${unmatchedItems.length} items could not be matched to any store`);
        }

        const results = [];

        console.log('=== PROCESSING STORES ===');
        // ✅ Process EVERY store, even those without orders
        for (const store of allStores) {
            try {
                const storeId = store.id;
                const storeName = store.name;
                const items = ordersByStore[storeId] || []; // Empty array if no orders

                console.log(`Processing ${storeName} (${storeId}): ${items.length} items`);
                
                // Calculate totals (will be 0 if no items)
                let totalFinalPriceWithDiscounts = 0;
                let totalFinalPrice = 0;
                const uniqueOrders = new Set();
                
                // Breakdowns
                const breakdownBySourceApp = {};
                const breakdownBySourceType = {};
                const breakdownByMoneyTypeName = {};
                const breakdownBySaleTypeName = {};
                
                items.forEach(item => {
                    const finalPriceWithDiscounts = item.finalPriceWithSessionDiscountsAndSurcharges || 0;
                    const finalPrice = item.finalPrice || 0;
                    
                    totalFinalPriceWithDiscounts += finalPriceWithDiscounts;
                    totalFinalPrice += finalPrice;
                    
                    if (item.order) {
                        uniqueOrders.add(item.order);
                    }
                    
                    // Breakdown by sourceApp
                    const sourceApp = item.sourceApp || 'no_app';
                    if (!breakdownBySourceApp[sourceApp]) {
                        breakdownBySourceApp[sourceApp] = {
                            finalPriceWithSessionDiscountsAndSurcharges: 0,
                            finalPrice: 0
                        };
                    }
                    breakdownBySourceApp[sourceApp].finalPriceWithSessionDiscountsAndSurcharges += finalPriceWithDiscounts;
                    breakdownBySourceApp[sourceApp].finalPrice += finalPrice;
                    
                    // Breakdown by sourceType
                    const sourceType = item.sourceType || 'no_type';
                    if (!breakdownBySourceType[sourceType]) {
                        breakdownBySourceType[sourceType] = {
                            finalPriceWithSessionDiscountsAndSurcharges: 0,
                            finalPrice: 0
                        };
                    }
                    breakdownBySourceType[sourceType].finalPriceWithSessionDiscountsAndSurcharges += finalPriceWithDiscounts;
                    breakdownBySourceType[sourceType].finalPrice += finalPrice;
                    
                    // Breakdown by moneyTypeName
                    const moneyType = item.moneyTypeName || 'no_payment_type';
                    if (!breakdownByMoneyTypeName[moneyType]) {
                        breakdownByMoneyTypeName[moneyType] = {
                            finalPriceWithSessionDiscountsAndSurcharges: 0,
                            finalPrice: 0
                        };
                    }
                    breakdownByMoneyTypeName[moneyType].finalPriceWithSessionDiscountsAndSurcharges += finalPriceWithDiscounts;
                    breakdownByMoneyTypeName[moneyType].finalPrice += finalPrice;
                    
                    // Breakdown by saleTypeName
                    const saleType = item.saleTypeName || 'no_sale_type';
                    if (!breakdownBySaleTypeName[saleType]) {
                        breakdownBySaleTypeName[saleType] = {
                            finalPriceWithSessionDiscountsAndSurcharges: 0,
                            finalPrice: 0
                        };
                    }
                    breakdownBySaleTypeName[saleType].finalPriceWithSessionDiscountsAndSurcharges += finalPriceWithDiscounts;
                    breakdownBySaleTypeName[saleType].finalPrice += finalPrice;
                });
                
                console.log(`  → Revenue: €${totalFinalPriceWithDiscounts.toFixed(2)}, Orders: ${uniqueOrders.size}, Items: ${items.length}`);
                
                // Round all numbers to 2 decimals
                const roundBreakdown = (breakdown) => {
                    const rounded = {};
                    for (const [key, value] of Object.entries(breakdown)) {
                        rounded[key] = {
                            finalPriceWithSessionDiscountsAndSurcharges: parseFloat(value.finalPriceWithSessionDiscountsAndSurcharges.toFixed(2)),
                            finalPrice: parseFloat(value.finalPrice.toFixed(2))
                        };
                    }
                    return rounded;
                };
                
                const aggregatedData = {
                    store_name: storeName,
                    store_id: storeId,
                    date: dateStr,
                    total_finalPriceWithSessionDiscountsAndSurcharges: parseFloat(totalFinalPriceWithDiscounts.toFixed(2)),
                    total_finalPrice: parseFloat(totalFinalPrice.toFixed(2)),
                    total_orders: uniqueOrders.size,
                    total_items: items.length,
                    breakdown_by_sourceApp: roundBreakdown(breakdownBySourceApp),
                    breakdown_by_sourceType: roundBreakdown(breakdownBySourceType),
                    breakdown_by_moneyTypeName: roundBreakdown(breakdownByMoneyTypeName),
                    breakdown_by_saleTypeName: roundBreakdown(breakdownBySaleTypeName)
                };
                
                // Check if record already exists for this store and date
                let existing = [];
                try {
                    existing = await base44.asServiceRole.entities.DailyStoreRevenue.filter({
                        store_id: storeId,
                        date: dateStr
                    });
                } catch (e) {
                    console.error('Error checking existing record:', e);
                }
                
                if (existing && existing.length > 0) {
                    // Update existing record
                    try {
                        await base44.asServiceRole.entities.DailyStoreRevenue.update(
                            existing[0].id,
                            aggregatedData
                        );
                        console.log(`  ✓ Updated DailyStoreRevenue record`);
                        results.push({
                            action: 'updated',
                            store_name: storeName,
                            date: dateStr,
                            ...aggregatedData
                        });
                    } catch (e) {
                        console.error(`Error updating record for ${storeName}:`, e);
                        results.push({
                            action: 'error',
                            store_name: storeName,
                            error: e.message,
                            stack: e.stack
                        });
                    }
                } else {
                    // Create new record
                    try {
                        await base44.asServiceRole.entities.DailyStoreRevenue.create(aggregatedData);
                        console.log(`  ✓ Created new DailyStoreRevenue record`);
                        results.push({
                            action: 'created',
                            store_name: storeName,
                            date: dateStr,
                            ...aggregatedData
                        });
                    } catch (e) {
                        console.error(`Error creating record for ${storeName}:`, e);
                        results.push({
                            action: 'error',
                            store_name: storeName,
                            error: e.message,
                            stack: e.stack
                        });
                    }
                }
            } catch (storeError) {
                console.error(`Error processing store ${store.id}:`, storeError);
                results.push({
                    action: 'error',
                    store_name: store.name,
                    error: storeError.message,
                    stack: storeError.stack
                });
            }
        }

        console.log(`=== AGGREGATION COMPLETE ===`);
        console.log(`Date: ${dateStr}`);
        console.log(`Stores processed: ${allStores.length}`);
        console.log(`Total items fetched: ${allOrderItems.length}`);
        console.log(`Items for target date: ${orderItems.length}`);
        console.log(`Unmatched items: ${unmatchedItems.length}`);
        
        return Response.json({
            success: true,
            message: `Aggregated data for ${dateStr}`,
            date: dateStr,
            stores_processed: allStores.length,
            total_items_fetched: allOrderItems.length,
            items_for_date: orderItems.length,
            unmatched_items_count: unmatchedItems.length,
            results
        }, { status: 200 });

    } catch (error) {
        console.error('Error aggregating daily store revenue:', error);
        return Response.json({ 
            error: 'Errore durante aggregazione',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});