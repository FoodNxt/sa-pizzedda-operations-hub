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
    const body = await req.json().catch(() => ({}));
    const { data: filterData } = body;

    // Carica tutti gli Employee attivi usando service role
    const allEmployees = await base44.asServiceRole.entities.Employee.list();
    const activeEmployees = allEmployees.filter(e => e.status === 'active');

    // Carica tutti gli User dipendenti usando service role
    const allUsers = await base44.asServiceRole.entities.User.list();
    const dipendentiUsers = allUsers.filter(u => u.user_type === 'dipendente');

    // Combina Employee e User
    const userMap = new Map();
    
    // Prima passa: aggiungi tutti gli Employee
    activeEmployees.forEach(emp => {
      const key = emp.full_name.toLowerCase().trim();
      userMap.set(key, {
        id: emp.id,
        nome_cognome: emp.full_name,
        full_name: emp.full_name,
        email: emp.email,
        ruoli_dipendente: emp.function_name ? [emp.function_name] : [],
        assigned_stores: emp.assigned_stores || [],
        source: 'employee'
      });
    });
    
    // Seconda passa: aggiungi/unisci User
    dipendentiUsers.forEach(user => {
      const key = (user.nome_cognome || user.full_name || '').toLowerCase().trim();
      if (!key) return;
      
      const existing = userMap.get(key);
      if (existing) {
        // Se esiste già, unisci i ruoli
        const userRuoli = user.ruoli_dipendente || [];
        const combinedRuoli = [...new Set([...existing.ruoli_dipendente, ...userRuoli])];
        userMap.set(key, {
          ...existing,
          ruoli_dipendente: combinedRuoli,
          assigned_stores: user.assigned_stores || existing.assigned_stores
        });
      } else {
        // Se non esiste, aggiungilo
        userMap.set(key, {
          id: user.id,
          nome_cognome: user.nome_cognome || user.full_name,
          full_name: user.full_name || user.nome_cognome,
          email: user.email,
          ruoli_dipendente: user.ruoli_dipendente || [],
          assigned_stores: user.assigned_stores || [],
          source: 'user'
        });
      }
    });
    
    // Filtra solo chi ha almeno un ruolo
    const dipendenti = Array.from(userMap.values()).filter(u => u.ruoli_dipendente.length > 0);

    // Se è richiesta anche la lista turni per una data specifica
    let turni = [];
    if (filterData) {
      console.log('Filtering turni for data:', filterData);
      turni = await base44.asServiceRole.entities.TurnoPlanday.filter({
        data: filterData
      });
      console.log('Turni trovati:', turni.length);
    }

    return Response.json({ dipendenti, turni });
  } catch (error) {
    console.error('Error in getAllDipendentiForPlanday:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});