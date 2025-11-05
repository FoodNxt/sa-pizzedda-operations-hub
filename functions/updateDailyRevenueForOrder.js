import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { format, parseISO, startOfDay, endOfDay } from 'npm:date-fns@3.0.0';

/**
 * Questa function aggiorna automaticamente DailyStoreRevenue quando viene inserito un nuovo OrderItem
 * Da chiamare da Zapier dopo l'import di ogni OrderItem
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json().catch(() => ({}));
        
        // Verify secret
        const providedSecret = body.secret;
        const expectedSecret = Deno.env.get('ZAPIER_ORDERS_WEBHOOK_SECRET');
        
        if (!expectedSecret) {
            return Response.json({ 
                error: 'ZAPIER_ORDERS_WEBHOOK_SECRET not set'
            }, { status: 500 });
        }
        
        if (!providedSecret || providedSecret !== expectedSecret) {
            return Response.json({ 
                error: 'Invalid or missing secret'
            }, { status: 401 });
        }

        // Get the order date and store from the body
        // These should be passed by Zapier after importing the OrderItem
        const { modifiedDate, store_id, store_name } = body;

        if (!modifiedDate || !store_id || !store_name) {
            return Response.json({ 
                error: 'Missing required fields: modifiedDate, store_id, store_name',
                hint: 'Pass these fields from the OrderItem that was just imported'
            }, { status: 400 });
        }

        // Parse the date to get the day
        const orderDate = parseISO(modifiedDate);
        const dateStr = format(orderDate, 'yyyy-MM-dd');
        const dayStart = startOfDay(orderDate);
        const dayEnd = endOfDay(orderDate);

        console.log(`Updating DailyStoreRevenue for ${store_name} on ${dateStr}`);

        // Fetch all OrderItems for this store on this date
        const orderItems = await base44.asServiceRole.entities.OrderItem.filter({
            store_id: store_id,
            modifiedDate: {
                $gte: dayStart.toISOString(),
                $lte: dayEnd.toISOString()
            }
        }, '-modifiedDate', 50000);

        console.log(`Found ${orderItems.length} order items for ${store_name} on ${dateStr}`);

        if (orderItems.length === 0) {
            // No data to aggregate - maybe the order was deleted?
            return Response.json({
                success: true,
                message: 'No order items found for this date/store',
                date: dateStr,
                store: store_name
            });
        }

        // Calculate aggregated data
        let totalFinalPriceWithDiscounts = 0;
        let totalFinalPrice = 0;
        const uniqueOrders = new Set();
        
        // Breakdowns
        const breakdownBySourceApp = {};
        const breakdownBySourceType = {};
        const breakdownByMoneyTypeName = {};
        const breakdownBySaleTypeName = {};
        
        orderItems.forEach(item => {
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
            store_name: store_name,
            store_id: store_id,
            date: dateStr,
            total_finalPriceWithSessionDiscountsAndSurcharges: parseFloat(totalFinalPriceWithDiscounts.toFixed(2)),
            total_finalPrice: parseFloat(totalFinalPrice.toFixed(2)),
            total_orders: uniqueOrders.size,
            total_items: orderItems.length,
            breakdown_by_sourceApp: roundBreakdown(breakdownBySourceApp),
            breakdown_by_sourceType: roundBreakdown(breakdownBySourceType),
            breakdown_by_moneyTypeName: roundBreakdown(breakdownByMoneyTypeName),
            breakdown_by_saleTypeName: roundBreakdown(breakdownBySaleTypeName)
        };
        
        // Check if record already exists for this store and date
        const existing = await base44.asServiceRole.entities.DailyStoreRevenue.filter({
            store_id: store_id,
            date: dateStr
        });
        
        let action;
        if (existing && existing.length > 0) {
            // Update existing record
            await base44.asServiceRole.entities.DailyStoreRevenue.update(
                existing[0].id,
                aggregatedData
            );
            action = 'updated';
        } else {
            // Create new record
            await base44.asServiceRole.entities.DailyStoreRevenue.create(aggregatedData);
            action = 'created';
        }

        return Response.json({
            success: true,
            message: `DailyStoreRevenue ${action} successfully`,
            action: action,
            date: dateStr,
            store: store_name,
            total_revenue: aggregatedData.total_finalPriceWithSessionDiscountsAndSurcharges,
            total_orders: aggregatedData.total_orders
        }, { status: 200 });

    } catch (error) {
        console.error('Error updating daily store revenue:', error);
        return Response.json({ 
            error: 'Errore durante aggiornamento',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});