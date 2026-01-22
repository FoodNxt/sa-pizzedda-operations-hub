import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { contratto_id } = await req.json();

    if (!contratto_id) {
      return Response.json({ error: 'Missing contratto_id' }, { status: 400 });
    }

    console.log(`Generating and saving PDF for contract ${contratto_id}`);

    // Get contract
    const contratto = await base44.asServiceRole.entities.Contratto.get(contratto_id);
    
    if (!contratto) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Generate PDF using downloadContrattoPDF
    const pdfResponse = await base44.asServiceRole.functions.invoke('downloadContrattoPDF', {
      contratto_id: contratto_id
    });
    
    if (!pdfResponse.data || !pdfResponse.data.pdf_base64) {
      console.error('PDF generation failed', pdfResponse);
      return Response.json({ error: 'PDF generation failed' }, { status: 500 });
    }

    console.log('PDF generated, uploading to Base44...');

    // Decode base64 to binary
    const base64Data = pdfResponse.data.pdf_base64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create File object
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const fileName = `contratto_${contratto.template_nome}_${contratto.user_nome}.pdf`;
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