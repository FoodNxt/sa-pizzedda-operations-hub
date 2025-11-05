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
            const storesResult = await base44.asServiceRole.entities.Store.list();
            
            // ✅ ROBUST: Handle different response formats
            if (Array.isArray(storesResult)) {
                allStores = storesResult;
            } else if (storesResult && typeof storesResult === 'object' && Array.isArray(storesResult.data)) {
                allStores = storesResult.data;
            } else {
                console.error('Unexpected stores result format:', typeof storesResult);
                allStores = [];
            }
            
            console.log(`Found ${allStores.length} total stores:`);
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

        // ✅ Fetch order items with ROBUST error handling
        let allOrderItems = [];
        try {
            console.log('=== FETCHING RECENT ORDER ITEMS ===');
            console.log('Using list() with sorting, then client-side date filtering');
            
            const result = await base44.asServiceRole.entities.OrderItem.list('-modifiedDate', 10000);
            
            console.log(`Raw result type: ${typeof result}`);
            console.log(`Is result an array? ${Array.isArray(result)}`);
            
            // ✅ EXTREMELY ROBUST: Handle multiple possible response formats
            if (Array.isArray(result)) {
                allOrderItems = result;
                console.log(`✓ Got array directly with ${allOrderItems.length} items`);
            } else if (result && typeof result === 'object') {
                if (Array.isArray(result.data)) {
                    allOrderItems = result.data;
                    console.log(`✓ Got object with data array: ${allOrderItems.length} items`);
                } else if (Array.isArray(result.items)) {
                    allOrderItems = result.items;
                    console.log(`✓ Got object with items array: ${allOrderItems.length} items`);
                } else if (Array.isArray(result.results)) {
                    allOrderItems = result.results;
                    console.log(`✓ Got object with results array: ${allOrderItems.length} items`);
                } else {
                    console.error('Result is object but has no recognized array property');
                    console.error('Result keys:', Object.keys(result));
                    allOrderItems = [];
                }
            } else {
                console.error('Unexpected result format:', result);
                allOrderItems = [];
            }
            
            console.log(`Successfully fetched ${allOrderItems.length} order items from database`);
        } catch (e) {
            console.error('Error fetching order items:', e);
            return Response.json({ 
                error: 'Error fetching order items',
                details: e.message,
                stack: e.stack
            }, { status: 500 });
        }

        // ✅ Safety check before filtering
        if (!Array.isArray(allOrderItems)) {
            console.error('FATAL: allOrderItems is not an array after all checks!');
            return Response.json({
                error: 'Failed to get order items as array',
                details: `Got type: ${typeof allOrderItems}`
            }, { status: 500 });
        }

        // ✅ CLIENT-SIDE DATE FILTERING
        console.log('=== FILTERING BY DATE (CLIENT-SIDE) ===');
        let orderItems = [];
        try {
            orderItems = allOrderItems.filter(item => {
                if (!item || !item.modifiedDate) {
                    return false;
                }
                
                try {
                    const itemDate = parseISO(item.modifiedDate);
                    if (!itemDate || isNaN(itemDate.getTime())) {
                        return false;
                    }
                    const isInRange = isWithinInterval(itemDate, { start: dayStart, end: dayEnd });
                    return isInRange;
                } catch (e) {
                    return false;
                }
            });
        } catch (filterError) {
            console.error('Error during client-side filtering:', filterError);
            return Response.json({
                error: 'Error filtering order items',
                details: filterError.message,
                stack: filterError.stack
            }, { status: 500 });
        }
            
        console.log(`Found ${orderItems.length} order items for ${dateStr} after client-side filtering`);
        
        // ✅ Log distribution by printedOrderItemChannel
        const channelDistribution = {};
        orderItems.forEach(item => {
            const channel = item.printedOrderItemChannel || 'NO_CHANNEL';
            channelDistribution[channel] = (channelDistribution[channel] || 0) + 1;
        });
        console.log('Distribution by printedOrderItemChannel:');
        Object.entries(channelDistribution).forEach(([channel, count]) => {
            console.log(`  - ${channel}: ${count} items`);
        });
        
        // Log sample items
        if (orderItems.length > 0) {
            console.log('Sample order items (first 3):');
            orderItems.slice(0, 3).forEach((item, i) => {
                console.log(`  [${i+1}] ${item.orderItemName || 'N/A'}`);
                console.log(`      modifiedDate: ${item.modifiedDate}`);
                console.log(`      store_id: ${item.store_id}`);
                console.log(`      store_name: ${item.store_name}`);
                console.log(`      printedOrderItemChannel: ${item.printedOrderItemChannel}`);
                console.log(`      finalPrice: €${item.finalPriceWithSessionDiscountsAndSurcharges || 0}`);
            });
        } else {
            console.warn('⚠️ NO ORDER ITEMS FOUND FOR THIS DATE!');
        }

        // ✅ Create store mapping with CHANNEL CODES
        const storeById = {};
        const storeByName = {};
        const storeByChannelCode = {
            'lct_21684': null, // Ticinese
            'lct_21350': null  // Lanino
        };
        
        allStores.forEach(store => {
            storeById[store.id] = store;
            storeByName[store.name.toLowerCase().trim()] = store;
            
            // Map channel codes
            if (store.name.toLowerCase() === 'ticinese') {
                storeByChannelCode['lct_21684'] = store;
            } else if (store.name.toLowerCase() === 'lanino') {
                storeByChannelCode['lct_21350'] = store;
            }
        });

        console.log('=== STORE MAPPING ===');
        console.log(`Created maps for ${allStores.length} stores`);
        console.log('Channel code mapping:', {
            'lct_21684': storeByChannelCode['lct_21684']?.name,
            'lct_21350': storeByChannelCode['lct_21350']?.name
        });

        // ✅ Group order items by store
        const ordersByStore = {};
        const unmatchedItems = [];
        
        console.log('=== MATCHING ORDER ITEMS TO STORES ===');
        orderItems.forEach(item => {
            let matchedStore = null;
            
            // PRIORITY 1: Match by printedOrderItemChannel
            if (item.printedOrderItemChannel && storeByChannelCode[item.printedOrderItemChannel]) {
                matchedStore = storeByChannelCode[item.printedOrderItemChannel];
            }
            
            // PRIORITY 2: Match by store_name
            if (!matchedStore && item.store_name) {
                const normalizedName = item.store_name.toLowerCase().trim();
                matchedStore = storeByName[normalizedName];
            }
            
            // PRIORITY 3: Match by store_id
            if (!matchedStore && item.store_id && storeById[item.store_id]) {
                matchedStore = storeById[item.store_id];
            }
            
            if (matchedStore) {
                const storeId = matchedStore.id;
                if (!ordersByStore[storeId]) {
                    ordersByStore[storeId] = [];
                }
                ordersByStore[storeId].push(item);
            } else {
                console.warn(`✗ UNMATCHED: ${item.orderItemName} - store_id="${item.store_id}", store_name="${item.store_name}", channel="${item.printedOrderItemChannel}"`);
                unmatchedItems.push(item);
            }
        });

        console.log(`=== MATCHING SUMMARY ===`);
        console.log(`Matched items for ${Object.keys(ordersByStore).length} stores`);
        Object.entries(ordersByStore).forEach(([storeId, items]) => {
            const store = allStores.find(s => s.id === storeId);
            const revenue = items.reduce((sum, item) => sum + (item.finalPriceWithSessionDiscountsAndSurcharges || 0), 0);
            console.log(`  - ${store?.name || storeId}: ${items.length} items, €${revenue.toFixed(2)}`);
        });
        if (unmatchedItems.length > 0) {
            console.warn(`⚠️ ${unmatchedItems.length} items could not be matched to any store`);
        }

        const results = [];

        console.log('=== PROCESSING STORES ===');
        // Process EVERY store
        for (const store of allStores) {
            try {
                const storeId = store.id;
                const storeName = store.name;
                const items = ordersByStore[storeId] || [];

                console.log(`Processing ${storeName} (${storeId}): ${items.length} items`);
                
                // Calculate totals
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
                
                // Round all numbers
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
                
                // Check if record exists
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
                    // Update
                    try {
                        await base44.asServiceRole.entities.DailyStoreRevenue.update(
                            existing[0].id,
                            aggregatedData
                        );
                        console.log(`  ✓ Updated DailyStoreRevenue`);
                        results.push({
                            action: 'updated',
                            store_name: storeName,
                            date: dateStr,
                            ...aggregatedData
                        });
                    } catch (e) {
                        console.error(`Error updating: ${e.message}`);
                        results.push({
                            action: 'error',
                            store_name: storeName,
                            error: e.message
                        });
                    }
                } else {
                    // Create
                    try {
                        await base44.asServiceRole.entities.DailyStoreRevenue.create(aggregatedData);
                        console.log(`  ✓ Created DailyStoreRevenue`);
                        results.push({
                            action: 'created',
                            store_name: storeName,
                            date: dateStr,
                            ...aggregatedData
                        });
                    } catch (e) {
                        console.error(`Error creating: ${e.message}`);
                        results.push({
                            action: 'error',
                            store_name: storeName,
                            error: e.message
                        });
                    }
                }
            } catch (storeError) {
                console.error(`Error processing store ${store.id}:`, storeError);
                results.push({
                    action: 'error',
                    store_name: store.name,
                    error: storeError.message
                });
            }
        }

        console.log(`=== AGGREGATION COMPLETE ===`);
        
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
        console.error('FATAL ERROR:', error);
        return Response.json({ 
            error: 'Errore durante aggregazione',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});