import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        // Initialize Base44 client from request
        const base44 = createClientFromRequest(req);
        
        // Parse request body with error handling
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
        const expectedSecret = Deno.env.get('ZAPIER_WEBHOOK_SECRET');
        
        if (!expectedSecret) {
            return Response.json({ 
                error: 'Server configuration error: ZAPIER_WEBHOOK_SECRET not set',
                hint: 'Set ZAPIER_WEBHOOK_SECRET in Dashboard → Code → Secrets'
            }, { status: 500 });
        }
        
        if (!providedSecret || providedSecret !== expectedSecret) {
            return Response.json({ 
                error: 'Unauthorized: Invalid or missing webhook secret',
                hint: 'Make sure the "secret" field matches your ZAPIER_WEBHOOK_SECRET'
            }, { status: 401 });
        }
        
        // Validate required fields
        if (!body.nome_locale) {
            return Response.json({ 
                error: 'Campo obbligatorio mancante: nome_locale',
                received_fields: Object.keys(body)
            }, { status: 400 });
        }

        if (!body.voto) {
            return Response.json({ 
                error: 'Campo obbligatorio mancante: voto',
                received_fields: Object.keys(body)
            }, { status: 400 });
        }

        // Find store by name (using service role for admin access)
        const stores = await base44.asServiceRole.entities.Store.filter({
            name: body.nome_locale
        });

        if (!stores || stores.length === 0) {
            const allStores = await base44.asServiceRole.entities.Store.list();
            return Response.json({ 
                error: `Locale non trovato: "${body.nome_locale}". Verifica che il nome sia esatto (maiuscole/minuscole).`,
                available_stores: allStores.map(s => s.name),
                received: body.nome_locale
            }, { status: 404 });
        }

        const store = stores[0];

        // Parse datetime (format: YYYY-MM-DD HH:MM:SS or DD/MM/YYYY or DD-MM-YYYY)
        const parseDateTime = (dateStr) => {
            if (!dateStr) return new Date().toISOString();
            
            // Try ISO format first (YYYY-MM-DD HH:MM:SS)
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                // Format: 2025-08-13 13:28:50
                const parts = dateStr.split(' ');
                if (parts.length === 2) {
                    return `${parts[0]}T${parts[1]}`;
                }
                return dateStr;
            }
            
            // Try DD/MM/YYYY or DD-MM-YYYY format
            const parts = dateStr.split(/[\/\-\s]/);
            if (parts.length >= 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                
                // If there's time component
                if (parts.length > 3) {
                    const time = parts.slice(3).join(':');
                    return `${year}-${month}-${day}T${time}`;
                }
                
                return `${year}-${month}-${day}T00:00:00`;
            }
            
            return new Date().toISOString();
        };

        // Parse rating (1-5)
        const parseRating = (rating) => {
            const num = typeof rating === 'number' ? rating : parseFloat(rating);
            if (isNaN(num)) return 3;
            return Math.max(1, Math.min(5, Math.round(num)));
        };

        // Create review (using service role for admin access)
        const reviewData = {
            store_id: store.id,
            customer_name: body.nome || 'Anonimo',
            review_date: parseDateTime(body.data_recensione),
            rating: parseRating(body.voto),
            comment: body.commento || '',
            source: 'google'
        };

        const review = await base44.asServiceRole.entities.Review.create(reviewData);

        return Response.json({
            success: true,
            message: 'Recensione importata con successo',
            review: {
                id: review.id,
                store_name: store.name,
                customer_name: review.customer_name,
                rating: review.rating,
                review_date: review.review_date
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error importing review:', error);
        return Response.json({ 
            error: 'Errore durante l\'importazione della recensione',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});