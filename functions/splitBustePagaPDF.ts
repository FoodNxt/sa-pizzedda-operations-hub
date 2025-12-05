import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();

    if (!user || (user.user_type !== 'admin' && user.user_type !== 'manager')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bustaId, pdfUrl } = body;

    if (!bustaId || !pdfUrl) {
      return Response.json({ error: 'Missing bustaId or pdfUrl' }, { status: 400 });
    }

    // Fetch PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch PDF from URL');
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();

    // Use LLM to extract codici fiscali from each page
    const extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analizza questo PDF di buste paga. Per ogni pagina, estrai il CODICE FISCALE del dipendente (formato italiano, es: RSSMRA85M01H501Z).
      Restituisci un array di oggetti con: page_number (numero pagina, partendo da 1) e codice_fiscale (stringa, in maiuscolo).
      Se una pagina non contiene un codice fiscale italiano valido, ometti quella pagina dall'array.`,
      file_urls: [pdfUrl],
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
              },
              required: ["page_number", "codice_fiscale"]
            }
          }
        },
        required: ["pages"]
      }
    });

    const pages = extractionResult.pages || [];

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Match each page to a user and split PDF
    const splits = [];
    const unmatched = [];
    
    for (const page of pages) {
      if (!page.codice_fiscale) continue;

      const normalizedCF = page.codice_fiscale.toUpperCase().replace(/\s/g, '');
      const matchedUser = allUsers.find(u => 
        u.codice_fiscale && 
        u.codice_fiscale.toUpperCase().replace(/\s/g, '') === normalizedCF
      );

      if (matchedUser) {
        // Create a new PDF with only this page
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [page.page_number - 1]);
        singlePagePdf.addPage(copiedPage);
        
        // Save as bytes
        const pdfBytes = await singlePagePdf.save();
        
        // Upload single page PDF to temp file and then upload
        const tempFilePath = `/tmp/busta_${matchedUser.id}_${page.page_number}.pdf`;
        await Deno.writeFile(tempFilePath, pdfBytes);
        
        // Read and upload
        const fileData = await Deno.readFile(tempFilePath);
        const base64Data = btoa(String.fromCharCode(...fileData));
        
        const { file_url: singlePageUrl } = await base44.asServiceRole.integrations.Core.UploadFile({
          file: base64Data
        });
        
        splits.push({
          codice_fiscale: page.codice_fiscale,
          user_id: matchedUser.id,
          user_name: matchedUser.nome_cognome || matchedUser.full_name || matchedUser.email,
          pdf_url: singlePageUrl,
          page_number: page.page_number
        });
      } else {
        unmatched.push(page.codice_fiscale);
      }
    }

    // Update BustaPaga record
    await base44.asServiceRole.entities.BustaPaga.update(bustaId, {
      pdf_splits: splits,
      status: splits.length > 0 ? 'completed' : 'failed',
      error_message: splits.length === 0 
        ? `Nessun codice fiscale trovato o nessun match con utenti. Totale pagine: ${totalPages}`
        : unmatched.length > 0 
          ? `${splits.length} buste assegnate. ${unmatched.length} codici fiscali non trovati: ${unmatched.join(', ')}`
          : null
    });

    return Response.json({
      success: true,
      splits_count: splits.length,
      total_pages: totalPages,
      unmatched_count: unmatched.length
    });

  } catch (error) {
    console.error('Error splitting PDF:', error);
    
    // Try to update busta status to failed
    try {
      const bodyText = await req.text();
      const body = JSON.parse(bodyText);
      const { bustaId } = body;
      
      if (bustaId) {
        await base44.asServiceRole.entities.BustaPaga.update(bustaId, {
          status: 'failed',
          error_message: error.message
        });
      }
    } catch (updateError) {
      console.error('Error updating busta status:', updateError);
    }

    return Response.json({ 
      error: error.message,
      stack: error.stack,
      success: false
    }, { status: 500 });
  }
});