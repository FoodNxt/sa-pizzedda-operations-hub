import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const contratto_id = body.contratto_id || body.event?.entity_id;

    if (!contratto_id) {
      return Response.json({ error: 'Missing contratto_id' }, { status: 400 });
    }

    console.log(`Generating and saving PDF for contract ${contratto_id}`);

    // Get contract
    const contratto = await base44.asServiceRole.entities.Contratto.get(contratto_id);
    
    if (!contratto) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check if PDF already exists
    if (contratto.pdf_file_url) {
      console.log(`PDF already exists for contract ${contratto_id}`);
      return Response.json({ 
        success: true,
        pdf_url: contratto.pdf_file_url,
        message: 'PDF already exists'
      });
    }

    console.log('Generating PDF...');

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
    if (contratto.status === 'firmato' && contratto.firma_dipendente) {
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

    console.log(`PDF generated, size: ${bytes.length} bytes, uploading...`);

    // Create File object
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const fileName = `contratto_${contratto.template_nome?.replace(/[^a-zA-Z0-9]/g, '_')}_${contratto.nome_cognome?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    // Upload to Base44
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
      file: file
    });

    if (!uploadResult || !uploadResult.file_url) {
      console.error('Upload failed', uploadResult);
      return Response.json({ error: 'Upload failed' }, { status: 500 });
    }

    console.log(`PDF uploaded successfully: ${uploadResult.file_url}`);

    // Update contract with PDF URL
    await base44.asServiceRole.entities.Contratto.update(contratto_id, {
      pdf_file_url: uploadResult.file_url
    });

    console.log(`Contract ${contratto_id} updated with PDF URL`);

    return Response.json({ 
      success: true,
      pdf_url: uploadResult.file_url
    });

  } catch (error) {
    console.error('Error saving contract PDF:', error);
    return Response.json({ 
      error: error.message || 'Error saving contract PDF'
    }, { status: 500 });
  }
});