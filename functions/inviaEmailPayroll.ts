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
    
    // Add contract download links
    if (contratti_ids && contratti_ids.length > 0) {
      htmlBody += '<br><br><hr style="border: 1px solid #e2e8f0; margin: 20px 0;"><br><strong>📄 Contratti:</strong><br><ul style="list-style-type: none; padding-left: 0;">';
      for (const contrattoId of contratti_ids) {
        try {
          console.log(`Processing contract ${contrattoId}`);
          const contratto = await base44.asServiceRole.entities.Contratto.get(contrattoId);
          
          if (!contratto) {
            console.error(`Contract ${contrattoId} not found`);
            continue;
          }
          
          let contractUrl = contratto.pdf_file_url;
          
          // If no PDF exists, generate and save it now
          if (!contractUrl) {
            console.log(`No PDF for contract ${contrattoId}, generating and saving...`);
            const saveResponse = await base44.asServiceRole.functions.invoke('saveContractPDFToBase44', {
              contratto_id: contrattoId
            });
            
            if (saveResponse.data && saveResponse.data.pdf_url) {
              contractUrl = saveResponse.data.pdf_url;
              console.log(`Contract ${contrattoId} PDF saved: ${contractUrl}`);
            } else {
              console.error(`Failed to save contract ${contrattoId} PDF`);
              continue;
            }
          }
          
          htmlBody += `<li style="margin-bottom: 8px;">📄 <a href="${contractUrl}" style="color: #3b82f6; text-decoration: underline;" target="_blank">${contratto.template_nome}</a> <span style="color: #64748b; font-size: 0.9em;">(Inizio: ${new Date(contratto.data_inizio_contratto).toLocaleDateString('it-IT')})</span></li>`;
          
        } catch (err) {
          console.error(`Error processing contract ${contrattoId}:`, err.message, err.stack);
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