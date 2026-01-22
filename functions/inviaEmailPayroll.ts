import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated and is admin
    const user = await base44.auth.me();
    if (!user || (user.user_type !== 'admin' && user.user_type !== 'manager')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { to, subject, body, dipendente_id, contratti_ids, documenti } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert plain text body to HTML (preserve line breaks)
    let htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    
    // Add contract download links with hyperlinks
    if (contratti_ids && contratti_ids.length > 0) {
      htmlBody += '<br><br><hr style="border: 1px solid #e2e8f0; margin: 20px 0;"><br><strong>📄 Contratti:</strong><br><ul style="list-style-type: none; padding-left: 0;">';
      for (const contrattoId of contratti_ids) {
        const contratto = await base44.asServiceRole.entities.Contratto.get(contrattoId);
        if (contratto && contratto.contenuto_contratto) {
          // Generate PDF using generateContrattoPDF
          const pdfResponse = await base44.asServiceRole.functions.invoke('generateContrattoPDF', {
            contenuto: contratto.contenuto_contratto,
            nome_cognome: contratto.nome_cognome,
            status: contratto.status,
            firma_dipendente: contratto.firma_dipendente,
            data_firma: contratto.data_firma,
            contratto_id: contrattoId
          });
          
          if (pdfResponse.data && pdfResponse.data.pdf_base64) {
            // Convert base64 to binary buffer
            const pdfBinary = atob(pdfResponse.data.pdf_base64);
            const pdfBytes = new Uint8Array(pdfBinary.length);
            for (let i = 0; i < pdfBinary.length; i++) {
              pdfBytes[i] = pdfBinary.charCodeAt(i);
            }
            
            // Upload directly as binary data
            const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
              file: pdfBytes.buffer
            });
            
            htmlBody += `<li style="margin-bottom: 8px;">📄 <a href="${uploadResponse.file_url}" style="color: #3b82f6; text-decoration: underline;">${contratto.template_nome}</a> <span style="color: #64748b; font-size: 0.9em;">(Inizio: ${new Date(contratto.data_inizio_contratto).toLocaleDateString('it-IT')})</span></li>`;
          }
        }
      }
      htmlBody += '</ul>';
    }

    // Add document links with hyperlinks
    if (documenti && documenti.length > 0) {
      htmlBody += '<br><strong>📎 Documenti:</strong><br><ul style="list-style-type: none; padding-left: 0;">';
      for (const doc of documenti) {
        htmlBody += `<li style="margin-bottom: 8px;">📎 <a href="${doc.url}" style="color: #3b82f6; text-decoration: underline;">${doc.nome}</a></li>`;
      }
      htmlBody += '</ul>';
    }

    // Wrap in HTML structure
    const fullHtmlBody = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
  </head>
  <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; max-width: 600px;">
    ${htmlBody}
  </body>
</html>`;

    // Send HTML email via Core integration
    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body: fullHtmlBody
    });

    return Response.json({ 
      success: true,
      message: 'Email inviata con successo'
    });

  } catch (error) {
    console.error('Error sending payroll email:', error);
    return Response.json({ 
      error: error.message || 'Errore durante l\'invio dell\'email'
    }, { status: 500 });
  }
});