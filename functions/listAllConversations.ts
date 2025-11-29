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

        // Usa asServiceRole per ottenere TUTTE le conversazioni di tutti gli utenti
        const allConversations = await base44.asServiceRole.agents.listAllConversations({
            agent_name: 'assistente_dipendenti'
        });

        // Per ogni conversazione, carica i messaggi completi
        const convsWithMessages = await Promise.all(
            (allConversations || []).map(async (conv) => {
                try {
                    const fullConv = await base44.asServiceRole.agents.getConversation(conv.id);
                    return fullConv;
                } catch (e) {
                    return conv;
                }
            })
        );

        return Response.json({ conversations: convsWithMessages });
    } catch (error) {
        console.error('Error listing conversations:', error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});