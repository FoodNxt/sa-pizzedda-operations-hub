import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Invoca la funzione di import
    const { data } = await base44.asServiceRole.functions.invoke('importScontiFromGoogleSheets', {});
    
    // Log dell'import
    await base44.asServiceRole.entities.ScontiImportLog.create({
      timestamp: new Date().toISOString(),
      imported_count: data.imported || 0,
      skipped_count: data.skipped || 0,
      status: data.success ? 'success' : 'error',
      error_message: data.error || null
    });
    
    return Response.json(data);
  } catch (error) {
    console.error('Error in auto import:', error);
    
    // Log dell'errore
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.ScontiImportLog.create({
        timestamp: new Date().toISOString(),
        imported_count: 0,
        skipped_count: 0,
        status: 'error',
        error_message: error.message
      });
    } catch (logError) {
      console.error('Error logging import error:', logError);
    }
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});