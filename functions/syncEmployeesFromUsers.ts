import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get current user (no auth check needed - auto-called on User update)
    let currentUser;
    try {
      currentUser = await base44.auth.me();
    } catch {
      currentUser = null;
    }

    // Prendi tutti gli utenti di tipo dipendente
    const allUsers = await base44.asServiceRole.entities.User.list();
    const dipendenti = allUsers.filter(u => u.user_type === 'dipendente');

    // Prendi tutti gli Employee esistenti
    const existingEmployees = await base44.asServiceRole.entities.Employee.list();
    const existingEmails = new Set(existingEmployees.map(e => e.email?.toLowerCase()).filter(Boolean));

    const created = [];
    const updated = [];
    const skipped = [];

    for (const user of dipendenti) {
      const userEmail = user.email?.toLowerCase();
      
      // Salta se non ha email
      if (!userEmail) {
        skipped.push({ email: 'N/A', reason: 'No email' });
        continue;
      }

      if (existingEmails.has(userEmail)) {
        // Update existing employee with assigned_stores da User
        const existingEmployee = existingEmployees.find(e => e.email?.toLowerCase() === userEmail);
        if (existingEmployee) {
          await base44.asServiceRole.entities.Employee.update(existingEmployee.id, {
            full_name: user.nome_cognome || user.full_name || existingEmployee.full_name,
            phone: user.telefono || user.phone || existingEmployee.phone,
            function_name: (user.ruoli_dipendente && user.ruoli_dipendente.length > 0) 
              ? user.ruoli_dipendente[0] 
              : existingEmployee.function_name,
            assigned_stores: user.assigned_stores || []
          });
          updated.push({ email: userEmail, assigned_stores: user.assigned_stores || [] });
        }
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
        employee_id_external: user.id,
        assigned_stores: user.assigned_stores || []
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
        updated: updated.length,
        skipped: skipped.length
      },
      created,
      updated,
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