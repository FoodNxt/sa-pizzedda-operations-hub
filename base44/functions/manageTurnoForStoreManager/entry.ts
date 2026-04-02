import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow dipendenti with Store Manager role OR admins
    const isAdmin = user.role === 'admin' || user.user_type === 'admin';
    const isStoreManager = (user.ruoli_dipendente || []).includes('Store Manager');
    
    if (!isAdmin && !isStoreManager) {
      return Response.json({ error: 'Forbidden: Store Manager access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, turnoId, turnoData } = body;

    if (action === 'create') {
      const result = await base44.asServiceRole.entities.TurnoPlanday.create(turnoData);
      return Response.json({ success: true, turno: result });
    }
    
    if (action === 'update') {
      if (!turnoId) {
        return Response.json({ error: 'turnoId required for update' }, { status: 400 });
      }
      const result = await base44.asServiceRole.entities.TurnoPlanday.update(turnoId, turnoData);
      return Response.json({ success: true, turno: result });
    }
    
    if (action === 'delete') {
      if (!turnoId) {
        return Response.json({ error: 'turnoId required for delete' }, { status: 400 });
      }
      await base44.asServiceRole.entities.TurnoPlanday.delete(turnoId);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action. Use create, update, or delete.' }, { status: 400 });
  } catch (error) {
    console.error('Error in manageTurnoForStoreManager:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});