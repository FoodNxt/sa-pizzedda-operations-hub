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
        
        // Validate webhook secret
        const providedSecret = body.secret;
        const expectedSecret = Deno.env.get('ZAPIER_INVENTORY_WEBHOOK_SECRET');
        
        if (!expectedSecret) {
            return Response.json({ 
                error: 'Server configuration error: ZAPIER_INVENTORY_WEBHOOK_SECRET not set',
                hint: 'Set ZAPIER_INVENTORY_WEBHOOK_SECRET in Dashboard → Code → Secrets'
            }, { status: 500 });
        }
        
        if (!providedSecret || providedSecret !== expectedSecret) {
            return Response.json({ 
                error: 'Unauthorized: Invalid or missing webhook secret',
                hint: 'Make sure the "secret" field matches your ZAPIER_INVENTORY_WEBHOOK_SECRET'
            }, { status: 401 });
        }
        
        // Validate required fields
        if (!body.store_name) {
            return Response.json({ 
                error: 'Campo obbligatorio mancante: store_name',
                received_fields: Object.keys(body)
            }, { status: 400 });
        }

        if (!body.data) {
            return Response.json({ 
                error: 'Campo obbligatorio mancante: data',
                received_fields: Object.keys(body)
            }, { status: 400 });
        }

        // Find store by name
        const stores = await base44.asServiceRole.entities.Store.filter({
            name: body.store_name
        });

        if (!stores || stores.length === 0) {
            const allStores = await base44.asServiceRole.entities.Store.list();
            return Response.json({ 
                error: `Locale non trovato: "${body.store_name}". Verifica che il nome sia esatto (maiuscole/minuscole).`,
                available_stores: allStores.map(s => s.name),
                received: body.store_name
            }, { status: 404 });
        }

        const store = stores[0];

        // Parse date (format: DD/MM/YYYY or YYYY-MM-DD)
        const parseDate = (dateStr) => {
            if (!dateStr) return new Date().toISOString().split('T')[0];
            
            // Try YYYY-MM-DD format first
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                return dateStr.split('T')[0];
            }
            
            // Try DD/MM/YYYY format
            const parts = dateStr.split(/[\/\-]/);
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
            
            return new Date().toISOString().split('T')[0];
        };

        // Parse number (handles empty, null, or string values)
        const parseNumber = (value) => {
            if (value === null || value === undefined || value === '') return null;
            const num = typeof value === 'number' ? value : parseFloat(value);
            return isNaN(num) ? null : num;
        };

        // Build inventory data object
        const inventoryData = {
            store_name: body.store_name,
            store_id: store.id,
            data: parseDate(body.data),
            farina_semola_sacchi: parseNumber(body.farina_semola_sacchi),
            farina_verde: parseNumber(body.farina_verde),
            lievito_pacchi: parseNumber(body.lievito_pacchi),
            sugo_latte: parseNumber(body.sugo_latte),
            mozzarella_confezioni: parseNumber(body.mozzarella_confezioni),
            origano_barattoli: parseNumber(body.origano_barattoli),
            capperi_barattoli: parseNumber(body.capperi_barattoli),
            alici_barattoli: parseNumber(body.alici_barattoli),
            olive_barattoli: parseNumber(body.olive_barattoli),
            stracciatella_250g: parseNumber(body.stracciatella_250g),
            nduja_barattoli: parseNumber(body.nduja_barattoli),
            pistacchio_barattoli: parseNumber(body.pistacchio_barattoli),
            nutella_barattoli: parseNumber(body.nutella_barattoli),
            sale_pacchi_1kg: parseNumber(body.sale_pacchi_1kg),
            patate_grammi: parseNumber(body.patate_grammi),
            crema_gorgonzola_grammi: parseNumber(body.crema_gorgonzola_grammi),
            salsiccia_grammi: parseNumber(body.salsiccia_grammi),
            crema_pecorino_grammi: parseNumber(body.crema_pecorino_grammi),
            friarielli_barattoli: parseNumber(body.friarielli_barattoli),
            cipolle_barattoli: parseNumber(body.cipolle_barattoli),
            radicchio_barattoli: parseNumber(body.radicchio_barattoli),
            pomodorini_barattoli: parseNumber(body.pomodorini_barattoli),
            mascarpone_500g: parseNumber(body.mascarpone_500g),
            besciamella_500g: parseNumber(body.besciamella_500g),
            sugo_linea_grammi: parseNumber(body.sugo_linea_grammi),
            mozzarella_linea_grammi: parseNumber(body.mozzarella_linea_grammi),
            pesca_gianduia: parseNumber(body.pesca_gianduia),
            pabassinos_anice: parseNumber(body.pabassinos_anice),
            pabassinos_noci: parseNumber(body.pabassinos_noci),
            detersivo_piatti: parseNumber(body.detersivo_piatti),
            buste_spazzatura_gialle: parseNumber(body.buste_spazzatura_gialle),
            buste_spazzatura_umido: parseNumber(body.buste_spazzatura_umido),
            rotoli_scottex: parseNumber(body.rotoli_scottex),
            coca_cola: parseNumber(body.coca_cola),
            coca_cola_zero: parseNumber(body.coca_cola_zero),
            acqua_naturale_50cl: parseNumber(body.acqua_naturale_50cl),
            acqua_frizzante_50cl: parseNumber(body.acqua_frizzante_50cl),
            fanta: parseNumber(body.fanta),
            the_limone: parseNumber(body.the_limone),
            ichnusa_classica: parseNumber(body.ichnusa_classica),
            ichnusa_non_filtrata: parseNumber(body.ichnusa_non_filtrata)
        };

        // Create inventory record
        const inventory = await base44.asServiceRole.entities.Inventory.create(inventoryData);

        return Response.json({
            success: true,
            message: 'Inventario importato con successo',
            inventory: {
                id: inventory.id,
                store_name: inventory.store_name,
                data: inventory.data,
                total_fields_with_data: Object.values(inventoryData).filter(v => v !== null && v !== undefined).length
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error importing inventory:', error);
        return Response.json({ 
            error: 'Errore durante l\'importazione dell\'inventario',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});