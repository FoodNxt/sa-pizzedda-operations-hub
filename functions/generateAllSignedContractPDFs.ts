import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

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
            nome: contratto.nome_cognome,
            status: 'skipped',
            reason: 'PDF already exists'
          });
          continue;
        }

        console.log(`Generating PDF for contract ${contratto.id}...`);

        // Generate PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - 2 * margin;
        let y = 20;

        // Title
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('CONTRATTO DI LAVORO', pageWidth / 2, y, { align: 'center' });
        y += 15;

        // Contract content
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(contratto.contenuto_contratto || '', maxWidth);
        
        for (const line of lines) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 7;
        }

        // Signature section
        if (contratto.firma_dipendente) {
          if (y > 240) {
            doc.addPage();
            y = 20;
          }
          
          y += 20;
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text('FIRMA DIGITALE', margin, y);
          y += 10;
          
          doc.setFont(undefined, 'normal');
          doc.text(`Firmato da: ${contratto.firma_dipendente}`, margin, y);
          y += 7;
          doc.text(`Data firma: ${new Date(contratto.data_firma).toLocaleDateString('it-IT')}`, margin, y);
        }

        // Get PDF as ArrayBuffer
        const pdfArrayBuffer = doc.output('arraybuffer');
        const bytes = new Uint8Array(pdfArrayBuffer);

        // Create File object
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const fileName = `contratto_${contratto.template_nome?.replace(/[^a-zA-Z0-9]/g, '_')}_${contratto.nome_cognome?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        const file = new File([blob], fileName, { type: 'application/pdf' });

        // Upload to Base44
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
          file: file
        });

        if (!uploadResult || !uploadResult.file_url) {
          results.errors++;
          results.details.push({
            id: contratto.id,
            nome: contratto.nome_cognome,
            status: 'error',
            error: 'Upload failed'
          });
          console.error(`Upload failed for contract ${contratto.id}`);
          continue;
        }

        // Update contract with PDF URL
        await base44.asServiceRole.entities.Contratto.update(contratto.id, {
          pdf_file_url: uploadResult.file_url
        });

        results.generated++;
        results.details.push({
          id: contratto.id,
          nome: contratto.nome_cognome,
          status: 'generated',
          pdf_url: uploadResult.file_url
        });
        console.log(`PDF generated successfully for contract ${contratto.id}`);

      } catch (err) {
        results.errors++;
        results.details.push({
          id: contratto.id,
          nome: contratto.nome_cognome,
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