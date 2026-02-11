import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all transactions
    const transactions = await base44.asServiceRole.entities.BankTransaction.list();

    // Delete all
    let deleted = 0;
    for (const tx of transactions) {
      await base44.asServiceRole.entities.BankTransaction.delete(tx.id);
      deleted++;
    }

    return Response.json({
      success: true,
      deleted
    });

  } catch (error) {
    console.error('Error deleting transactions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});