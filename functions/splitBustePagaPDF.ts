import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.user_type !== 'admin' && user.user_type !== 'manager')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bustaId, pdfUrl } = await req.json();

    if (!bustaId || !pdfUrl) {
      return Response.json({ error: 'Missing bustaId or pdfUrl' }, { status: 400 });
    }

    // Fetch PDF
    const pdfResponse = await fetch(pdfUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Use LLM to extract codici fiscali from each page
    const { file_url: uploadedPdfUrl } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: new Blob([pdfBuffer], { type: 'application/pdf' })
    });

    const extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analizza questo PDF di buste paga. Per ogni pagina, estrai il CODICE FISCALE del dipendente.
      Restituisci un array di oggetti con: page_number (numero pagina, partendo da 1) e codice_fiscale (stringa).
      Se una pagina non contiene un codice fiscale valido, usa null.`,
      file_urls: [uploadedPdfUrl],
      response_json_schema: {
        type: "object",
        properties: {
          pages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                page_number: { type: "number" },
                codice_fiscale: { type: "string" }
              }
            }
          }
        }
      }
    });

    const pages = extractionResult.pages || [];

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Match each page to a user by codice_fiscale
    const splits = [];
    for (const page of pages) {
      if (!page.codice_fiscale) continue;

      const matchedUser = allUsers.find(u => 
        u.codice_fiscale && 
        u.codice_fiscale.toLowerCase().replace(/\s/g, '') === page.codice_fiscale.toLowerCase().replace(/\s/g, '')
      );

      if (matchedUser) {
        // In a real implementation, you'd split the PDF page here
        // For now, we'll just reference the full PDF with page number
        splits.push({
          codice_fiscale: page.codice_fiscale,
          user_id: matchedUser.id,
          user_name: matchedUser.nome_cognome || matchedUser.full_name || matchedUser.email,
          pdf_url: pdfUrl, // In production: split and upload individual page
          page_number: page.page_number
        });
      }
    }

    // Update BustaPaga record
    await base44.asServiceRole.entities.BustaPaga.update(bustaId, {
      pdf_splits: splits,
      status: splits.length > 0 ? 'completed' : 'failed',
      error_message: splits.length === 0 ? 'Nessun codice fiscale trovato' : null
    });

    return Response.json({
      success: true,
      splits_count: splits.length,
      total_pages: pages.length
    });

  } catch (error) {
    console.error('Error splitting PDF:', error);
    
    // Try to update busta status to failed
    try {
      const base44 = createClientFromRequest(req);
      const { bustaId } = await req.json();
      await base44.asServiceRole.entities.BustaPaga.update(bustaId, {
        status: 'failed',
        error_message: error.message
      });
    } catch (updateError) {
      console.error('Error updating busta status:', updateError);
    }

    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});