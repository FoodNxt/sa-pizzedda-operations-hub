import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify caller is admin (for manual calls) or allow scheduled automations
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (e) {
      // Scheduled automations don't have user context - that's OK
    }

    // Fetch active rules (single call)
    const allRules = await base44.asServiceRole.entities.BankTransactionRule.list('-priority', 500);
    const rules = allRules.filter(r => r.is_active !== false);
    rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    console.log(`Found ${rules.length} active rules`);

    // Fetch only recent transactions (last 500 by date) - 1 API call
    // The automation runs hourly, so it only needs to catch recent uncategorized ones
    const recentTransactions = await base44.asServiceRole.entities.BankTransaction.list('-created_date', 500);
    
    const transactions = recentTransactions.filter(tx => 
      !tx.category || tx.category === '' || tx.category === 'non_categorizzato' || tx.category === 'uncategorized'
    );

    console.log(`Found ${transactions.length} uncategorized out of ${recentTransactions.length} recent transactions`);

    // Match transactions against rules
    const updates = [];
    for (const tx of transactions) {
      const matchedRule = rules.find(rule => {
        const pattern = rule.pattern.toLowerCase();
        const searchIn = rule.search_in || 'description';

        const fieldsToCheck = [];
        if (searchIn === 'description' || searchIn === 'both') {
          if (tx.description) fieldsToCheck.push(tx.description.toLowerCase());
        }
        if (searchIn === 'additional' || searchIn === 'both') {
          if (tx.additional) fieldsToCheck.push(tx.additional.toLowerCase());
        }

        if (fieldsToCheck.length === 0) return false;

        return fieldsToCheck.some(text => {
          switch (rule.match_type) {
            case 'contains': return text.includes(pattern);
            case 'starts_with': return text.startsWith(pattern);
            case 'ends_with': return text.endsWith(pattern);
            case 'exact': return text === pattern;
            default: return false;
          }
        });
      });

      if (matchedRule) {
        updates.push({
          id: tx.id,
          category: matchedRule.category,
          subcategory: matchedRule.subcategory || ''
        });
      }
    }

    console.log(`Matched ${updates.length} transactions, updating...`);

    // Execute updates one by one with delay to respect rate limits
    let updated = 0;
    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];
      await base44.asServiceRole.entities.BankTransaction.update(u.id, {
        category: u.category,
        subcategory: u.subcategory
      });
      updated++;
      
      // Delay every 3 updates
      if (i > 0 && i % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Log matching action
    await base44.asServiceRole.entities.BankImportLog.create({
      action_type: 'matching',
      timestamp: new Date().toISOString(),
      matched_count: updated,
      status: 'success'
    });

    console.log(`Auto-matched ${updated} transactions`);
    return Response.json({ success: true, updated, uncategorized_checked: transactions.length });

  } catch (error) {
    console.error('Error in auto matching:', error);

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