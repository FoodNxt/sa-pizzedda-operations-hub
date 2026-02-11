import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetcha tutte le configurazioni
    const configs = await base44.entities.MenuStructureConfig.list();
    const activeConfig = configs.find(c => c.is_active);

    if (!activeConfig) {
      return Response.json({ error: 'No active menu configuration found' }, { status: 404 });
    }

    const menuStructure = activeConfig.menu_structure;
    const dashboardSection = menuStructure.find(s => s.title === 'Dashboard');

    if (!dashboardSection) {
      return Response.json({ error: 'Dashboard section not found' }, { status: 404 });
    }

    // Controlla se To-Do è già presente
    const todoExists = dashboardSection.items.some(item => item.page === 'ToDo');
    if (todoExists) {
      return Response.json({ message: 'To-Do already exists in Dashboard' }, { status: 200 });
    }

    // Aggiungi To-Do dopo Presenze
    const presenzeIndex = dashboardSection.items.findIndex(item => item.page === 'Presenze');
    if (presenzeIndex !== -1) {
      dashboardSection.items.splice(presenzeIndex + 1, 0, {
        title: 'To-Do',
        page: 'ToDo',
        icon: 'CheckSquare'
      });
    } else {
      dashboardSection.items.push({
        title: 'To-Do',
        page: 'ToDo',
        icon: 'CheckSquare'
      });
    }

    // Disattiva tutte le configurazioni vecchie
    for (const config of configs) {
      if (config.is_active) {
        await base44.entities.MenuStructureConfig.update(config.id, { is_active: false });
      }
    }

    // Crea nuova configurazione attiva
    await base44.entities.MenuStructureConfig.create({
      config_name: `menu_${Date.now()}`,
      menu_structure: menuStructure,
      is_active: true
    });

    return Response.json({ success: true, message: 'To-Do added to Dashboard' }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});