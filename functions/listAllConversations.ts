import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verifica che l'utente sia admin o manager
        if (user.user_type !== 'admin' && user.user_type !== 'manager') {
            return Response.json({ error: 'Forbidden - Admin or Manager only' }, { status: 403 });
        }

        // Leggi gli ID delle conversazioni dal body
        let conversationIds = [];
        try {
            const body = await req.json();
            conversationIds = body.conversation_ids || [];
        } catch (e) {
            // nessun body, prova a listare tutto
        }

        // Per ogni conversazione, carica i messaggi completi usando asServiceRole
        const convsWithMessages = await Promise.all(
            conversationIds.map(async (convId) => {
                try {
                    const fullConv = await base44.asServiceRole.agents.getConversation(convId);
                    return fullConv;
                } catch (e) {
                    console.error('Error loading conv:', convId, e.message);
                    return { id: convId, messages: [] };
                }
            })
        );

        return Response.json({ conversations: convsWithMessages });
    } catch (error) {
        console.error('Error listing conversations:', error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});