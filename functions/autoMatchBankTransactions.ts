import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Call the matching function
    const result = await base44.asServiceRole.functions.invoke('applyBankTransactionRules');

    return Response.json(result.data);

  } catch (error) {
    console.error('Error in auto matching:', error);
    
    // Log error
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.BankImportLog.create({
        action_type: 'matching',
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