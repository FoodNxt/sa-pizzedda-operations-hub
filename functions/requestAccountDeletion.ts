import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark account for deletion
    await base44.auth.updateMe({
      account_deletion_requested: true,
      account_deletion_date: new Date().toISOString()
    });

    // Get all admin users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin' || u.user_type === 'admin');

    // Send email to all admins
    const emailPromises = admins.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: '🚨 Richiesta Eliminazione Account',
        body: `
          <h2>Richiesta Eliminazione Account</h2>
          <p>Un dipendente ha richiesto l'eliminazione del proprio account:</p>
          <ul>
            <li><strong>Nome:</strong> ${user.nome_cognome || user.full_name || 'N/D'}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Ruoli:</strong> ${user.ruoli_dipendente?.join(', ') || 'N/D'}</li>
            <li><strong>Data Richiesta:</strong> ${new Date().toLocaleString('it-IT')}</li>
          </ul>
          <p><strong>Azione richiesta:</strong> Gestire l'eliminazione dell'account e dei dati personali secondo le normative GDPR.</p>
        `
      })
    );

    await Promise.all(emailPromises);

    return Response.json({ 
      success: true,
      message: 'Richiesta di eliminazione inviata con successo'
    });

  } catch (error) {
    console.error('Error requesting account deletion:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});