import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { format, parseISO, startOfDay, addDays } from 'npm:date-fns@3.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        
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
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            targetDate = yesterday;
        }

        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const dayStart = startOfDay(targetDate);
        const nextDayStart = startOfDay(addDays(targetDate, 1));

        console.log(`=== AGGREGATION START ===`);
        console.log(`Aggregating data for date: ${dateStr}`);
        console.log(`Day range: ${dayStart.toISOString()} to ${nextDayStart.toISOString()}`);

        // Fetch stores
        let allStores = [];
        try {
            console.log('=== FETCHING STORES ===');
            allStores = await base44.asServiceRole.entities.Store.list();
            if (!Array.isArray(allStores)) {
                allStores = allStores?.data || [];
            }
            console.log(`Found ${allStores.length} stores`);
        } catch (e) {
            console.error('Error fetching stores:', e);
            return Response.json({ 
                error: 'Error fetching stores',
                details: e.message
            }, { status: 500 });
        }

        // ✅ FIXED: Use maximum allowed limit of 10000
        console.log('=== FETCHING ORDER ITEMS ===');
        console.log(`Using filter with date range and limit 10000`);
        
        let orderItems = [];
        try {
            const result = await base44.asServiceRole.entities.OrderItem.filter({
                modifiedDate: {
                    $gte: dayStart.toISOString(),
                    $lt: nextDayStart.toISOString()
                }
            }, '-modifiedDate', 10000); // ✅ FIXED: Changed from 50000 to 10000
            
            if (Array.isArray(result)) {
                orderItems = result;
            } else if (result?.data && Array.isArray(result.data)) {
                orderItems = result.data;
            } else {
                console.error('Unexpected result format:', typeof result);
                orderItems = [];
            }
            
            console.log(`Found ${orderItems.length} order items`);
            
            if (orderItems.length === 0) {
                console.warn(`⚠️ NO ORDER ITEMS FOUND FOR ${dateStr}`);
                console.warn('Possible reasons:');
                console.warn('1. No orders on this date');
                console.warn('2. Date filter format issue');
                console.warn('3. modifiedDate field format mismatch');
            } else if (orderItems.length === 10000) {
                console.warn(`⚠️ REACHED MAXIMUM LIMIT OF 10000 ITEMS!`);
                console.warn('There might be more items for this date that were not fetched');
                console.warn('Consider implementing pagination or splitting by time ranges');
            }
            
            // Log first few items
            if (orderItems.length > 0) {
                console.log('Sample items:');
                orderItems.slice(0, 3).forEach((item, i) => {
                    console.log(`  [${i+1}] ${item.orderItemName}`);
                    console.log(`      modifiedDate: ${item.modifiedDate}`);
                    console.log(`      store: ${item.store_name}`);
                    console.log(`      channel: ${item.printedOrderItemChannel}`);
                    console.log(`      price: €${item.finalPriceWithSessionDiscountsAndSurcharges}`);
                });
            }
        } catch (e) {
            console.error('Error fetching order items:', e);
            return Response.json({ 
                error: 'Error fetching order items',
                details: e.message
            }, { status: 500 });
        }

        // Log channel distribution
        const channelDist = {};
        orderItems.forEach(item => {
            const ch = item.printedOrderItemChannel || 'NO_CHANNEL';
            channelDist[ch] = (channelDist[ch] || 0) + 1;
        });
        console.log('Channel distribution:');
        Object.entries(channelDist).forEach(([ch, count]) => {
            console.log(`  - ${ch}: ${count} items`);
        });

        // Store mapping
        const storeById = {};
        const storeByName = {};
        const storeByChannelCode = {
            'lct_21684': null,
            'lct_21350': null
        };
        
        allStores.forEach(store => {
            storeById[store.id] = store;
            storeByName[store.name.toLowerCase().trim()] = store;
            
            if (store.name.toLowerCase() === 'ticinese') {
                storeByChannelCode['lct_21684'] = store;
            } else if (store.name.toLowerCase() === 'lanino') {
                storeByChannelCode['lct_21350'] = store;
            }
        });

        // Match items to stores
        const ordersByStore = {};
        const unmatchedItems = [];
        
        orderItems.forEach(item => {
            let matchedStore = null;
            
            if (item.printedOrderItemChannel && storeByChannelCode[item.printedOrderItemChannel]) {
                matchedStore = storeByChannelCode[item.printedOrderItemChannel];
            }
            
            if (!matchedStore && item.store_name) {
                matchedStore = storeByName[item.store_name.toLowerCase().trim()];
            }
            
            if (!matchedStore && item.store_id && storeById[item.store_id]) {
                matchedStore = storeById[item.store_id];
            }
            
            if (matchedStore) {
                if (!ordersByStore[matchedStore.id]) {
                    ordersByStore[matchedStore.id] = [];
                }
                ordersByStore[matchedStore.id].push(item);
            } else {
                unmatchedItems.push(item);
            }
        });

        console.log('=== MATCHING SUMMARY ===');
        Object.entries(ordersByStore).forEach(([storeId, items]) => {
            const store = allStores.find(s => s.id === storeId);
            const revenue = items.reduce((sum, item) => sum + (item.finalPriceWithSessionDiscountsAndSurcharges || 0), 0);
            console.log(`  - ${store?.name}: ${items.length} items, €${revenue.toFixed(2)}`);
        });
        if (unmatchedItems.length > 0) {
            console.warn(`⚠️ ${unmatchedItems.length} unmatched items`);
        }

        const results = [];

        // Process each store
        for (const store of allStores) {
            const storeId = store.id;
            const storeName = store.name;
            const items = ordersByStore[storeId] || [];

            console.log(`Processing ${storeName}: ${items.length} items`);
            
            let totalFinalPriceWithDiscounts = 0;
            let totalFinalPrice = 0;
            const uniqueOrders = new Set();
            
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
                
                const sourceApp = item.sourceApp || 'no_app';
                if (!breakdownBySourceApp[sourceApp]) {
                    breakdownBySourceApp[sourceApp] = {
                        finalPriceWithSessionDiscountsAndSurcharges: 0,
                        finalPrice: 0
                    };
                }
                breakdownBySourceApp[sourceApp].finalPriceWithSessionDiscountsAndSurcharges += finalPriceWithDiscounts;
                breakdownBySourceApp[sourceApp].finalPrice += finalPrice;
                
                const sourceType = item.sourceType || 'no_type';
                if (!breakdownBySourceType[sourceType]) {
                    breakdownBySourceType[sourceType] = {
                        finalPriceWithSessionDiscountsAndSurcharges: 0,
                        finalPrice: 0
                    };
                }
                breakdownBySourceType[sourceType].finalPriceWithSessionDiscountsAndSurcharges += finalPriceWithDiscounts;
                breakdownBySourceType[sourceType].finalPrice += finalPrice;
                
                const moneyType = item.moneyTypeName || 'no_payment_type';
                if (!breakdownByMoneyTypeName[moneyType]) {
                    breakdownByMoneyTypeName[moneyType] = {
                        finalPriceWithSessionDiscountsAndSurcharges: 0,
                        finalPrice: 0
                    };
                }
                breakdownByMoneyTypeName[moneyType].finalPriceWithSessionDiscountsAndSurcharges += finalPriceWithDiscounts;
                breakdownByMoneyTypeName[moneyType].finalPrice += finalPrice;
                
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
            
            console.log(`  → Revenue: €${totalFinalPriceWithDiscounts.toFixed(2)}, Orders: ${uniqueOrders.size}`);
            
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
            
            let existing = [];
            try {
                existing = await base44.asServiceRole.entities.DailyStoreRevenue.filter({
                    store_id: storeId,
                    date: dateStr
                });
                if (!Array.isArray(existing)) {
                    existing = existing?.data || [];
                }
            } catch (e) {
                console.error('Error checking existing:', e);
            }
            
            if (existing.length > 0) {
                try {
                    await base44.asServiceRole.entities.DailyStoreRevenue.update(
                        existing[0].id,
                        aggregatedData
                    );
                    console.log(`  ✓ Updated`);
                    results.push({ action: 'updated', ...aggregatedData });
                } catch (e) {
                    console.error(`Error updating:`, e);
                    results.push({ action: 'error', store_name: storeName, error: e.message });
                }
            } else {
                try {
                    await base44.asServiceRole.entities.DailyStoreRevenue.create(aggregatedData);
                    console.log(`  ✓ Created`);
                    results.push({ action: 'created', ...aggregatedData });
                } catch (e) {
                    console.error(`Error creating:`, e);
                    results.push({ action: 'error', store_name: storeName, error: e.message });
                }
            }
        }

        console.log('=== COMPLETE ===');
        
        return Response.json({
            success: true,
            message: `Aggregated data for ${dateStr}`,
            date: dateStr,
            stores_processed: allStores.length,
            total_items: orderItems.length,
            unmatched_items: unmatchedItems.length,
            reached_limit: orderItems.length === 10000,
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