import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Call the import function
    const result = await base44.asServiceRole.functions.invoke('importBankTransactionsFromGoogleSheets');

    return Response.json(result.data);

  } catch (error) {
    console.error('Error in auto import:', error);
    
    // Log error
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.BankImportLog.create({
        action_type: 'import',
        timestamp: new Date().toISOString(),
        status: 'error',
        error_message: error.message
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});