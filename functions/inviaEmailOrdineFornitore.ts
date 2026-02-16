import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated and is admin or manager
    const user = await base44.auth.me();
    if (!user || (user.user_type !== 'admin' && user.user_type !== 'manager')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert plain text body to HTML (preserve line breaks)
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    
    // Add signature
    const fullHtmlBody = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
  </head>
  <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; max-width: 600px;">
    ${htmlBody}
    <br><br><hr style="border: 1px solid #e2e8f0; margin: 20px 0;"><br>
    <p style="color: #64748b; font-size: 0.9em;">
      Grazie,<br>
      <strong>${from_name || user.full_name || user.email}</strong><br>
      Sa Pizzedda
    </p>
  </body>
</html>`;

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");
    
    // Create RFC 2822 formatted email
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      fullHtmlBody
    ];
    const rawEmail = emailLines.join('\r\n');
    
    // Encode email in base64url format
    const base64Email = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email via Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: base64Email
      })
    });

    if (!gmailResponse.ok) {
      const error = await gmailResponse.text();
      throw new Error(`Gmail API error: ${error}`);
    }

    return Response.json({ 
      success: true,
      message: 'Email inviata con successo via Gmail'
    });

  } catch (error) {
    console.error('Error sending order email via Gmail:', error);
    return Response.json({ 
      error: error.message || 'Errore durante l\'invio dell\'email'
    }, { status: 500 });
  }
});