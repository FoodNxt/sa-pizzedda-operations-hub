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

    // Build email body with document links
    let emailBody = body;
    
    // Add contract download links
    if (contratti_ids && contratti_ids.length > 0) {
      emailBody += '\n\n---\n\n📄 Link per scaricare i contratti:\n\n';
      for (const contrattoId of contratti_ids) {
        const contratto = await base44.asServiceRole.entities.Contratto.get(contrattoId);
        if (contratto) {
          // Generate a temporary download link for the contract PDF
          const downloadUrl = `${Deno.env.get('BASE44_API_URL') || 'https://api.base44.com'}/apps/${Deno.env.get('BASE44_APP_ID')}/functions/downloadContrattoPDF?contratto_id=${contrattoId}`;
          emailBody += `- ${contratto.template_nome}: ${downloadUrl}\n`;
        }
      }
    }

    // Add document links
    if (documenti && documenti.length > 0) {
      emailBody += '\n\n📎 Link per scaricare i documenti:\n\n';
      for (const doc of documenti) {
        emailBody += `- ${doc.nome}: ${doc.url}\n`;
      }
    }

    // Send email via Core integration
    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body: emailBody
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