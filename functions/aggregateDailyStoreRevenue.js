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
            targetDate = parseISO(body.date);
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

        // Fetch all OrderItems for the target date
        const orderItems = await base44.asServiceRole.entities.OrderItem.filter({
            modifiedDate: {
                $gte: dayStart.toISOString(),
                $lte: dayEnd.toISOString()
            }
        }, '-modifiedDate', 100000);

        console.log(`Found ${orderItems.length} order items for ${dateStr}`);

        // Group by store
        const storeGroups = {};
        
        orderItems.forEach(item => {
            const storeId = item.store_id || 'unknown';
            const storeName = item.store_name || 'Unknown';
            
            if (!storeGroups[storeId]) {
                storeGroups[storeId] = {
                    store_id: storeId,
                    store_name: storeName,
                    items: []
                };
            }
            
            storeGroups[storeId].items.push(item);
        });

        const results = [];

        // Process each store
        for (const [storeId, storeData] of Object.entries(storeGroups)) {
            const items = storeData.items;
            
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
                store_name: storeData.store_name,
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
            const existing = await base44.asServiceRole.entities.DailyStoreRevenue.filter({
                store_id: storeId,
                date: dateStr
            });
            
            if (existing && existing.length > 0) {
                // Update existing record
                await base44.asServiceRole.entities.DailyStoreRevenue.update(
                    existing[0].id,
                    aggregatedData
                );
                results.push({
                    action: 'updated',
                    store_name: storeData.store_name,
                    date: dateStr,
                    ...aggregatedData
                });
            } else {
                // Create new record
                await base44.asServiceRole.entities.DailyStoreRevenue.create(aggregatedData);
                results.push({
                    action: 'created',
                    store_name: storeData.store_name,
                    date: dateStr,
                    ...aggregatedData
                });
            }
        }

        return Response.json({
            success: true,
            message: `Aggregated data for ${dateStr}`,
            date: dateStr,
            stores_processed: Object.keys(storeGroups).length,
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