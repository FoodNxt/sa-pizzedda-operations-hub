import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch ALL rules (no is_active filter - get everything and filter manually)
    const allRules = await base44.asServiceRole.entities.BankTransactionRule.list('-priority', 500);
    
    // Filter: include rules where is_active is true OR is_active is not set (default true)
    const rules = allRules.filter(r => r.is_active !== false);
    rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    console.log(`Found ${rules.length} active rules`);

    // Fetch uncategorized transactions - paginate to get all
    let allTransactions = [];
    let offset = 0;
    const batchSize = 500;
    
    while (true) {
      const batch = await base44.asServiceRole.entities.BankTransaction.list('-madeOn', batchSize, offset);
      allTransactions = allTransactions.concat(batch);
      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    // Filter to uncategorized only
    const transactions = allTransactions.filter(tx => 
      !tx.category || tx.category === '' || tx.category === 'non_categorizzato' || tx.category === 'uncategorized'
    );

    console.log(`Found ${transactions.length} uncategorized transactions out of ${allTransactions.length} total`);

    let updated = 0;

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
        await base44.asServiceRole.entities.BankTransaction.update(tx.id, {
          category: matchedRule.category,
          subcategory: matchedRule.subcategory || ''
        });
        updated++;
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