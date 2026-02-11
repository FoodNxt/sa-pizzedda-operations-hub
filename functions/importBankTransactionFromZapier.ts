import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse incoming data
    const payload = await req.json();

    // Validate required fields
    if (!payload.transactionId) {
      return Response.json({ error: 'Missing transactionId' }, { status: 400 });
    }

    // Check if transaction already exists
    const existing = await base44.asServiceRole.entities.BankTransaction.filter({
      transactionId: payload.transactionId
    });

    if (existing.length > 0) {
      return Response.json({ 
        message: 'Transaction already exists',
        skipped: true 
      }, { status: 200 });
    }

    // Create transaction
    const transactionData = {
      transactionId: payload.transactionId || '',
      status: payload.status || '',
      madeOn: payload.madeOn || '',
      amount: parseFloat(payload.amount) || 0,
      currencyCode: payload.currencyCode || '',
      description: payload.description || '',
      additional: payload.additional || '',
      category: payload.category || '',
      duplicated: payload.duplicated === 'true' || payload.duplicated === true,
      account_name: payload.account_name || '',
      account_nature: payload.account_nature || '',
      account_provider_name: payload.account_provider_name || '',
      account_uuid: payload.account_uuid || '',
      account_balance_snapshot: parseFloat(payload.account_balance_snapshot) || 0,
      end_to_end_id: payload.end_to_end_id || '',
      exchange_rate: parseFloat(payload.exchange_rate) || 0,
      information: payload.information || '',
      original_amount: parseFloat(payload.original_amount) || 0,
      original_currency_code: payload.original_currency_code || '',
      payee: payload.payee || '',
      payee_information: payload.payee_information || '',
      payer: payload.payer || '',
      payer_information: payload.payer_information || '',
      posting_date: payload.posting_date || '',
      posting_time: payload.posting_time || '',
      time: payload.time || '',
      type: payload.type || ''
    };

    await base44.asServiceRole.entities.BankTransaction.create(transactionData);

    return Response.json({
      success: true,
      message: 'Transaction imported successfully'
    });

  } catch (error) {
    console.error('Error importing bank transaction:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});