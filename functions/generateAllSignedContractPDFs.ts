import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is admin
    const user = await base44.auth.me();
    if (!user || user.user_type !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('Fetching all signed contracts...');

    // Get all signed contracts
    const contratti = await base44.asServiceRole.entities.Contratto.filter({
      status: 'firmato'
    });

    console.log(`Found ${contratti.length} signed contracts`);

    const results = {
      total: contratti.length,
      generated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    for (const contratto of contratti) {
      try {
        // Skip if PDF already exists
        if (contratto.pdf_file_url) {
          console.log(`Contract ${contratto.id} already has PDF, skipping`);
          results.skipped++;
          results.details.push({
            id: contratto.id,
            nome: contratto.user_nome,
            status: 'skipped',
            reason: 'PDF already exists'
          });
          continue;
        }

        console.log(`Generating PDF for contract ${contratto.id}...`);

        // Generate and save PDF
        const saveResponse = await base44.asServiceRole.functions.invoke('saveContractPDFToBase44', {
          contratto_id: contratto.id
        });

        if (saveResponse.data && saveResponse.data.success) {
          results.generated++;
          results.details.push({
            id: contratto.id,
            nome: contratto.user_nome,
            status: 'generated',
            pdf_url: saveResponse.data.pdf_url
          });
          console.log(`PDF generated successfully for contract ${contratto.id}`);
        } else {
          results.errors++;
          results.details.push({
            id: contratto.id,
            nome: contratto.user_nome,
            status: 'error',
            error: 'Generation failed'
          });
          console.error(`Failed to generate PDF for contract ${contratto.id}`);
        }

      } catch (err) {
        results.errors++;
        results.details.push({
          id: contratto.id,
          nome: contratto.user_nome,
          status: 'error',
          error: err.message
        });
        console.error(`Error processing contract ${contratto.id}:`, err.message);
      }
    }

    console.log('PDF generation complete:', results);

    return Response.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('Error generating PDFs:', error);
    return Response.json({ 
      error: error.message || 'Error generating PDFs'
    }, { status: 500 });
  }
});