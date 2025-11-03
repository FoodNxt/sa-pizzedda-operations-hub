import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse request body
        const body = await req.json();
        
        // Validate required fields
        if (!body.nome_locale) {
            return Response.json({ 
                error: 'Campo obbligatorio mancante: nome_locale' 
            }, { status: 400 });
        }

        if (!body.voto) {
            return Response.json({ 
                error: 'Campo obbligatorio mancante: voto' 
            }, { status: 400 });
        }

        // Find store by name
        const stores = await base44.asServiceRole.entities.Store.filter({
            name: body.nome_locale
        });

        if (!stores || stores.length === 0) {
            return Response.json({ 
                error: `Locale non trovato: ${body.nome_locale}. Verifica che il nome sia esatto.`,
                available_stores: await base44.asServiceRole.entities.Store.list()
                    .then(s => s.map(store => store.name))
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

        // Create review
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
            details: error.message 
        }, { status: 500 });
    }
});