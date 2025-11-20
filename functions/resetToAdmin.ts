import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get current user
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset user to admin
    await base44.auth.updateMe({
      user_type: 'admin',
      ruoli_dipendente: [],
      data_inizio_contratto: null,
      assigned_stores: []
    });

    return Response.json({ 
      success: true, 
      message: 'User reset to admin successfully',
      user: {
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Error resetting to admin:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to reset user to admin'
    }, { status: 500 });
  }
});