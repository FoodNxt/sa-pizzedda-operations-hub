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

        // Parse date (format: DD/MM/YYYY or DD-MM-YYYY)
        const parseDate = (dateStr) => {
            if (!dateStr) return new Date().toISOString().split('T')[0];
            
            const parts = dateStr.split(/[\/\-]/);
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
            
            return new Date().toISOString().split('T')[0];
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
            review_date: parseDate(body.data_recensione),
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