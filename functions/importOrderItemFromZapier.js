import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
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
        
        const providedSecret = body.secret;
        const expectedSecret = Deno.env.get('ZAPIER_ORDERS_WEBHOOK_SECRET');
        
        if (!expectedSecret) {
            return Response.json({ 
                error: 'ZAPIER_ORDERS_WEBHOOK_SECRET not set',
                hint: 'Set it in Dashboard → Code → Secrets'
            }, { status: 500 });
        }
        
        if (!providedSecret || providedSecret !== expectedSecret) {
            return Response.json({ 
                error: 'Invalid or missing secret'
            }, { status: 401 });
        }
        
        if (!body.itemId || !body.billNumber || !body.orderItemName) {
            return Response.json({ 
                error: 'Missing required fields: itemId, billNumber, orderItemName'
            }, { status: 400 });
        }

        let storeName = body.store_name;
        
        if (!storeName && body.printedOrderItemChannel) {
            const channelMap = {
                'lct_21684': 'Ticinese',
                'lct_21350': 'Lanino'
            };
            storeName = channelMap[body.printedOrderItemChannel];
        }

        if (!storeName) {
            return Response.json({ 
                error: 'Missing store_name or valid printedOrderItemChannel'
            }, { status: 400 });
        }

        const stores = await base44.asServiceRole.entities.Store.filter({
            name: storeName
        });

        if (!stores || stores.length === 0) {
            return Response.json({ 
                error: `Store not found: ${storeName}`
            }, { status: 404 });
        }

        const store = stores[0];

        const parseNumber = (value) => {
            if (value === null || value === undefined || value === '') return null;
            const num = typeof value === 'number' ? value : parseFloat(value);
            return isNaN(num) ? null : num;
        };

        const parseDateTime = (dateStr) => {
            if (!dateStr) return null;
            
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                const parts = dateStr.split(' ');
                if (parts.length === 2) {
                    return `${parts[0]}T${parts[1]}`;
                }
                return dateStr;
            }
            
            const parts = dateStr.split(/[\/\-\s]/);
            if (parts.length >= 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                
                if (parts.length > 3) {
                    const time = parts.slice(3).join(':');
                    return `${year}-${month}-${day}T${time}`;
                }
                
                return `${year}-${month}-${day}T00:00:00`;
            }
            
            return null;
        };

        const orderItemData = {
            store_name: storeName,
            store_id: store.id,
            itemId: body.itemId,
            billNumber: body.billNumber,
            orderItemName: body.orderItemName,
            finalPrice: parseNumber(body.finalPrice),
            finalPriceWithSessionDiscountsAndSurcharges: parseNumber(body.finalPriceWithSessionDiscountsAndSurcharges),
            modifiedBy: body.modifiedBy || null,
            modifiedDate: parseDateTime(body.modifiedDate),
            order: body.order || null,
            quantity: parseNumber(body.quantity),
            vatRate: parseNumber(body.vatRate),
            deviceCode: body.deviceCode || null,
            externalIntegrationDisplayId: body.externalIntegrationDisplayId || null,
            sourceApp: body.sourceApp || null,
            sourceType: body.sourceType || null,
            moneyTypeName: body.moneyTypeName || null,
            printedOrderItemChannel: body.printedOrderItemChannel || null,
            saleTypeName: body.saleTypeName || null,
            variation0_name: body.variation0_name || null,
            variation0_price: parseNumber(body.variation0_price),
            variation0_quantity: parseNumber(body.variation0_quantity),
            variation0_quantityVariation: parseNumber(body.variation0_quantityVariation),
            variation1_name: body.variation1_name || null,
            variation1_price: parseNumber(body.variation1_price),
            variation1_quantity: parseNumber(body.variation1_quantity),
            variation1_quantityVariation: parseNumber(body.variation1_quantityVariation),
            variation2_name: body.variation2_name || null,
            variation2_price: parseNumber(body.variation2_price),
            variation2_quantity: parseNumber(body.variation2_quantity),
            variation2_quantityVariation: parseNumber(body.variation2_quantityVariation),
            variation3_name: body.variation3_name || null,
            variation3_price: parseNumber(body.variation3_price),
            variation3_quantity: parseNumber(body.variation3_quantity),
            variation3_quantityVariation: parseNumber(body.variation3_quantityVariation),
            variation4_name: body.variation4_name || null,
            variation4_price: parseNumber(body.variation4_price),
            variation4_quantity: parseNumber(body.variation4_quantity),
            variation4_quantityVariation: parseNumber(body.variation4_quantityVariation),
            variation5_name: body.variation5_name || null,
            variation5_price: parseNumber(body.variation5_price),
            variation5_quantity: parseNumber(body.variation5_quantity),
            variation5_quantityVariation: parseNumber(body.variation5_quantityVariation),
            variation6_name: body.variation6_name || null,
            variation6_price: parseNumber(body.variation6_price),
            variation6_quantity: parseNumber(body.variation6_quantity),
            variation6_quantityVariation: parseNumber(body.variation6_quantityVariation),
            variation7_name: body.variation7_name || null,
            variation7_price: parseNumber(body.variation7_price),
            variation7_quantity: parseNumber(body.variation7_quantity),
            variation7_quantityVariation: parseNumber(body.variation7_quantityVariation),
            variation8_name: body.variation8_name || null,
            variation8_price: parseNumber(body.variation8_price),
            variation8_quantity: parseNumber(body.variation8_quantity),
            variation8_quantityVariation: parseNumber(body.variation8_quantityVariation)
        };

        const orderItem = await base44.asServiceRole.entities.OrderItem.create(orderItemData);

        return Response.json({
            success: true,
            message: 'OrderItem importato con successo',
            orderItem: {
                id: orderItem.id,
                itemId: orderItem.itemId,
                billNumber: orderItem.billNumber,
                orderItemName: orderItem.orderItemName,
                store_name: orderItem.store_name,
                finalPrice: orderItem.finalPrice,
                auto_detected_store: !body.store_name && body.printedOrderItemChannel ? true : false
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error importing order item:', error);
        return Response.json({ 
            error: 'Errore durante importazione',
            details: error.message
        }, { status: 500 });
    }
});