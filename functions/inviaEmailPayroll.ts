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
      htmlBody += '<br><br><hr><br><strong>📄 Contratti:</strong><br><ul>';
      for (const contrattoId of contratti_ids) {
        const contratto = await base44.asServiceRole.entities.Contratto.get(contrattoId);
        if (contratto) {
          // Call downloadContrattoPDF backend function to get PDF base64
          const pdfResponse = await base44.asServiceRole.functions.invoke('downloadContrattoPDF', {
            contrattoId: contrattoId
          });
          
          if (pdfResponse.data.success && pdfResponse.data.pdf) {
            // Upload PDF to get a permanent URL
            const pdfBlob = Uint8Array.from(atob(pdfResponse.data.pdf), c => c.charCodeAt(0));
            const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
              file: pdfBlob
            });
            
            htmlBody += `<li><a href="${uploadResponse.file_url}" style="color: #3b82f6; text-decoration: none;">${contratto.template_nome}</a> (Inizio: ${new Date(contratto.data_inizio_contratto).toLocaleDateString('it-IT')})</li>`;
          }
        }
      }
      htmlBody += '</ul>';
    }

    // Add document links with hyperlinks
    if (documenti && documenti.length > 0) {
      htmlBody += '<br><strong>📎 Documenti:</strong><br><ul>';
      for (const doc of documenti) {
        htmlBody += `<li><a href="${doc.url}" style="color: #3b82f6; text-decoration: none;">${doc.nome}</a></li>`;
      }
      htmlBody += '</ul>';
    }

    // Wrap in HTML structure
    const fullHtmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          ${htmlBody}
        </body>
      </html>
    `;

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