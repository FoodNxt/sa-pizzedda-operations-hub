import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all rules (sorted by priority)
    const rules = await base44.asServiceRole.entities.BankTransactionRule.filter({
      is_active: true
    });
    
    // Sort by priority (higher first)
    rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Fetch all transactions
    const transactions = await base44.asServiceRole.entities.BankTransaction.list();

    let updated = 0;

    for (const tx of transactions) {
      // Find first matching rule
      const matchedRule = rules.find(rule => {
        const pattern = rule.pattern.toLowerCase();
        const searchIn = rule.search_in || 'description';
        
        // Determine which fields to check
        const fieldsToCheck = [];
        if (searchIn === 'description' || searchIn === 'both') {
          if (tx.description) fieldsToCheck.push(tx.description.toLowerCase());
        }
        if (searchIn === 'additional' || searchIn === 'both') {
          if (tx.additional) fieldsToCheck.push(tx.additional.toLowerCase());
        }
        
        if (fieldsToCheck.length === 0) return false;
        
        // Check if any field matches
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

    return Response.json({
      success: true,
      updated
    });

  } catch (error) {
    console.error('Error applying rules:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});