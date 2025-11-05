import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { format, parseISO, startOfDay, endOfDay } from 'npm:date-fns@3.0.0';

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

        console.log(`Aggregating data for date: ${dateStr}`);
        console.log(`Day range: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);

        // ✅ Fetch ALL active stores first
        let allStores = [];
        try {
            console.log('Fetching all stores...');
            allStores = await base44.asServiceRole.entities.Store.list();
            console.log(`Found ${allStores.length} total stores`);
        } catch (e) {
            console.error('Error fetching stores:', e);
            return Response.json({ 
                error: 'Error fetching stores',
                details: e.message,
                stack: e.stack
            }, { status: 500 });
        }

        // Fetch order items for the specific day using server-side filter
        let orderItems = [];
        try {
            console.log('Fetching order items with server-side date filter...');
            orderItems = await base44.asServiceRole.entities.OrderItem.filter({
                modifiedDate: {
                    $gte: dayStart.toISOString(),
                    $lte: dayEnd.toISOString()
                }
            }, '-modifiedDate', 10000);
            console.log(`Found ${orderItems.length} order items for ${dateStr}`);
        } catch (e) {
            console.error('Error fetching order items:', e);
            return Response.json({ 
                error: 'Error fetching order items',
                details: e.message,
                stack: e.stack
            }, { status: 500 });
        }

        // Group order items by store
        const ordersByStore = {};
        orderItems.forEach(item => {
            const storeId = item.store_id || 'unknown';
            if (!ordersByStore[storeId]) {
                ordersByStore[storeId] = [];
            }
            ordersByStore[storeId].push(item);
        });

        console.log(`Grouped items into ${Object.keys(ordersByStore).length} stores with orders`);

        const results = [];

        // ✅ Process EVERY store, even those without orders
        for (const store of allStores) {
            try {
                const storeId = store.id;
                const storeName = store.name;
                const items = ordersByStore[storeId] || []; // Empty array if no orders

                console.log(`Processing store: ${storeName} (${storeId}) - ${items.length} items`);
                
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
                
                console.log(`Store ${storeName}: Revenue=${totalFinalPriceWithDiscounts}, Orders=${uniqueOrders.size}`);
                
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
                
                console.log(`Checking for existing record for store ${storeId} on ${dateStr}`);
                
                // Check if record already exists for this store and date
                let existing = [];
                try {
                    existing = await base44.asServiceRole.entities.DailyStoreRevenue.filter({
                        store_id: storeId,
                        date: dateStr
                    });
                    console.log(`Found ${existing.length} existing records`);
                } catch (e) {
                    console.error('Error checking existing record:', e);
                }
                
                if (existing && existing.length > 0) {
                    // Update existing record
                    try {
                        console.log(`Updating existing record ${existing[0].id}`);
                        await base44.asServiceRole.entities.DailyStoreRevenue.update(
                            existing[0].id,
                            aggregatedData
                        );
                        console.log(`Successfully updated record for ${storeName}`);
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
                        console.log(`Creating new record for ${storeName}`);
                        await base44.asServiceRole.entities.DailyStoreRevenue.create(aggregatedData);
                        console.log(`Successfully created record for ${storeName}`);
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

        console.log(`Aggregation complete for ${dateStr}`);
        
        return Response.json({
            success: true,
            message: `Aggregated data for ${dateStr}`,
            date: dateStr,
            stores_processed: allStores.length,
            total_items_processed: orderItems.length,
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