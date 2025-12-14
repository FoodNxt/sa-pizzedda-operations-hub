import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica autenticazione admin
    const currentUser = await base44.auth.me();
    if (!currentUser || (currentUser.user_type !== 'admin' && currentUser.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Prendi tutti gli utenti di tipo dipendente
    const allUsers = await base44.asServiceRole.entities.User.list();
    const dipendenti = allUsers.filter(u => u.user_type === 'dipendente');

    // Prendi tutti gli Employee esistenti
    const existingEmployees = await base44.asServiceRole.entities.Employee.list();
    const existingEmails = new Set(existingEmployees.map(e => e.email?.toLowerCase()).filter(Boolean));

    const created = [];
    const skipped = [];

    for (const user of dipendenti) {
      const userEmail = user.email?.toLowerCase();
      
      // Salta se non ha email o se esiste già
      if (!userEmail) {
        skipped.push({ email: 'N/A', reason: 'No email' });
        continue;
      }

      if (existingEmails.has(userEmail)) {
        skipped.push({ email: userEmail, reason: 'Already exists' });
        continue;
      }

      // Crea nuovo Employee
      const employeeData = {
        full_name: user.nome_cognome || user.full_name || user.email,
        email: user.email,
        phone: user.telefono || user.phone || '',
        employee_group: user.employee_group || 'PT',
        function_name: (user.ruoli_dipendente && user.ruoli_dipendente.length > 0) 
          ? user.ruoli_dipendente[0] 
          : 'N/A',
        status: 'active',
        employee_id_external: user.id
      };

      try {
        await base44.asServiceRole.entities.Employee.create(employeeData);
        created.push({ email: userEmail, name: employeeData.full_name });
      } catch (error) {
        skipped.push({ email: userEmail, reason: error.message });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total_users: dipendenti.length,
        created: created.length,
        skipped: skipped.length
      },
      created,
      skipped
    });

  } catch (error) {
    console.error('Error syncing employees:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});