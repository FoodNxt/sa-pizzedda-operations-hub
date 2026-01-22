import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const contratto_id = url.searchParams.get('contratto_id');

    if (!contratto_id) {
      return Response.json({ error: 'Missing contratto_id' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Get contract
    const contratto = await base44.asServiceRole.entities.Contratto.get(contratto_id);
    
    if (!contratto) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (!contratto.pdf_file_url) {
      return Response.json({ error: 'PDF not available for this contract' }, { status: 404 });
    }

    // Fetch the PDF file from the URL
    const pdfResponse = await fetch(contratto.pdf_file_url);
    
    if (!pdfResponse.ok) {
      return Response.json({ error: 'Failed to fetch PDF' }, { status: 500 });
    }

    const pdfBlob = await pdfResponse.blob();
    const fileName = `contratto_${contratto.template_nome?.replace(/[^a-zA-Z0-9]/g, '_')}_${contratto.nome_cognome?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // Return PDF with download headers
    return new Response(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error downloading contract PDF:', error);
    return Response.json({ 
      error: error.message || 'Error downloading contract PDF'
    }, { status: 500 });
  }
});