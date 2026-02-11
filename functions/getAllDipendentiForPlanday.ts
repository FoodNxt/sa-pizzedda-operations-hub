import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica autenticazione
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body per parametri opzionali
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
    
    const filterData = body?.filter_data || body?.data || null;
    const excludeUserId = body?.exclude_user_id || null;
    const filterDataRange = body?.filter_data_range || null;

    // Carica tutti gli Employee attivi usando service role
    const allEmployees = await base44.asServiceRole.entities.Employee.list();
    const activeEmployees = allEmployees.filter(e => e.status === 'active');

    // Carica tutti gli User dipendenti usando service role
    const allUsers = await base44.asServiceRole.entities.User.list();
    const dipendentiUsers = allUsers.filter(u => u.user_type === 'dipendente');

    // Combina Employee e User usando User.id come source of truth
    const userMap = new Map();
    
    // Crea mappa Employee per riferimento (ma NON usiamo l'ID)
    const employeeMap = new Map();
    activeEmployees.forEach(emp => {
      const key = (emp.full_name || '').toLowerCase().trim();
      employeeMap.set(key, emp);
    });
    
    // Principale: aggiungi tutti gli User dipendenti con il LORO ID
    dipendentiUsers.forEach(user => {
      const key = (user.nome_cognome || user.full_name || '').toLowerCase().trim();
      if (!key) return;
      
      const matchingEmployee = employeeMap.get(key);
      const userRuoli = user.ruoli_dipendente || [];
      
      // Unisci i ruoli dell'Employee se esiste
      let combinedRuoli = [...userRuoli];
      if (matchingEmployee?.function_name && !userRuoli.includes(matchingEmployee.function_name)) {
        combinedRuoli.push(matchingEmployee.function_name);
      }
      
      userMap.set(key, {
        id: user.id, // SEMPRE User.id, mai Employee.id
        nome_cognome: user.nome_cognome || user.full_name || matchingEmployee?.full_name,
        full_name: user.full_name || user.nome_cognome || matchingEmployee?.full_name,
        email: user.email,
        ruoli_dipendente: combinedRuoli,
        assigned_stores: user.assigned_stores || matchingEmployee?.assigned_stores || [],
        source: 'user'
      });
    });
    
    // Se ci sono Employee senza User corrispondente, aggiungili (fallback)
    activeEmployees.forEach(emp => {
      const key = (emp.full_name || '').toLowerCase().trim();
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: emp.id,
          nome_cognome: emp.full_name,
          full_name: emp.full_name,
          email: emp.email,
          ruoli_dipendente: emp.function_name ? [emp.function_name] : [],
          assigned_stores: emp.assigned_stores || [],
          source: 'employee'
        });
      }
    });
    
    // Filtra solo chi ha almeno un ruolo
    let dipendenti = Array.from(userMap.values()).filter(u => u.ruoli_dipendente.length > 0);
    
    // Escludi l'utente corrente se richiesto
    if (excludeUserId) {
      dipendenti = dipendenti.filter(d => d.id !== excludeUserId);
    }

    // Se è richiesta anche la lista turni per una data specifica o range
    let turni = [];
    if (filterData) {
      turni = await base44.asServiceRole.entities.TurnoPlanday.filter({
        data: filterData
      });
    } else if (filterDataRange) {
      turni = await base44.asServiceRole.entities.TurnoPlanday.filter({
        data: { $gte: filterDataRange.start, $lte: filterDataRange.end }
      });
    }

    return Response.json({ dipendenti, turni });
  } catch (error) {
    console.error('Error in getAllDipendentiForPlanday:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});