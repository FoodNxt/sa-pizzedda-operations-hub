import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { format, parseISO, startOfDay, addDays } from 'npm:date-fns@3.0.0';

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
        const nextDayStart = startOfDay(addDays(targetDate, 1));

        console.log(`=== AGGREGATION START ===`);
        console.log(`Aggregating data for date: ${dateStr}`);
        console.log(`Range: ${dayStart.toISOString()} <= modifiedDate < ${nextDayStart.toISOString()}`);

        // ✅ Fetch ALL active stores first
        let allStores = [];
        try {
            console.log('=== FETCHING STORES ===');
            allStores = await base44.asServiceRole.entities.Store.list();
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

        // ✅ Use SERVER-SIDE FILTER with $lt for next day (more reliable than $lte)
        let orderItems = [];
        try {
            console.log('=== FETCHING ORDER ITEMS WITH SERVER-SIDE DATE FILTER ===');
            console.log(`Using $gte and $lt strategy`);
            console.log(`Filter: modifiedDate >= ${dayStart.toISOString()} AND < ${nextDayStart.toISOString()}`);
            
            const result = await base44.asServiceRole.entities.OrderItem.filter({
                modifiedDate: {
                    $gte: dayStart.toISOString(),
                    $lt: nextDayStart.toISOString()
                }
            }, '-modifiedDate', 10000);
            
            // ✅ SAFETY: Ensure result is an array
            if (Array.isArray(result)) {
                orderItems = result;
            } else if (result && typeof result === 'object' && Array.isArray(result.data)) {
                orderItems = result.data;
            } else {
                console.error('Unexpected result format:', typeof result);
                orderItems = [];
            }
            
            console.log(`Found ${orderItems.length} order items for ${dateStr}`);
            
            // ✅ Log distribution by printedOrderItemChannel for debugging
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
                console.log('Sample order items (first 5):');
                orderItems.slice(0, 5).forEach((item, i) => {
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
        } catch (e) {
            console.error('Error fetching order items:', e);
            return Response.json({ 
                error: 'Error fetching order items',
                details: e.message,
                stack: e.stack
            }, { status: 500 });
        }

        // ✅ Create store mapping with CHANNEL CODES (priority!)
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

        // ✅ Group order items by store - PRIORITY: CHANNEL CODE > NAME > ID
        const ordersByStore = {};
        const unmatchedItems = [];
        
        console.log('=== MATCHING ORDER ITEMS TO STORES ===');
        orderItems.forEach(item => {
            let matchedStore = null;
            
            // ✅ PRIORITY 1: Match by printedOrderItemChannel (MOST RELIABLE!)
            if (item.printedOrderItemChannel && storeByChannelCode[item.printedOrderItemChannel]) {
                matchedStore = storeByChannelCode[item.printedOrderItemChannel];
            }
            
            // ✅ PRIORITY 2: Match by store_name
            if (!matchedStore && item.store_name) {
                const normalizedName = item.store_name.toLowerCase().trim();
                matchedStore = storeByName[normalizedName];
            }
            
            // ✅ PRIORITY 3: Match by store_id (fallback)
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
        // ✅ Process EVERY store, even those without orders
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
        console.log(`Total items processed: ${orderItems.length}`);
        console.log(`Unmatched items: ${unmatchedItems.length}`);
        
        return Response.json({
            success: true,
            message: `Aggregated data for ${dateStr}`,
            date: dateStr,
            stores_processed: allStores.length,
            total_items_processed: orderItems.length,
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