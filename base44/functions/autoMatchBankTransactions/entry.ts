import { createClientFromRequest } from 'npm:@base44/sdk@0.8.22';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active rules (sorted by priority)
    const rules = await base44.asServiceRole.entities.BankTransactionRule.filter({
      is_active: true
    });
    rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Fetch only uncategorized transactions
    const transactions = await base44.asServiceRole.entities.BankTransaction.filter({
      category: { $in: [null, '', 'non_categorizzato'] }
    });

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

      if (matchedRule && (tx.category !== matchedRule.category || tx.subcategory !== matchedRule.subcategory)) {
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

    return Response.json({ success: true, updated });

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