import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const configs = await base44.entities.MenuStructureConfig.list();
    const activeConfig = configs.find(c => c.is_active);

    if (!activeConfig) {
      return Response.json({ error: 'No active menu configuration found' }, { status: 404 });
    }

    const menuStructure = JSON.parse(JSON.stringify(activeConfig.menu_structure));
    const dashboardSection = menuStructure.find(s => s.title === 'Dashboard');

    if (!dashboardSection) {
      return Response.json({ error: 'Dashboard section not found' }, { status: 404 });
    }

    // Rimuovi Summary AI
    dashboardSection.items = dashboardSection.items.filter(item => item.page !== 'SummaryAI');

    // Aggiungi To-Do se non presente
    const todoExists = dashboardSection.items.some(item => item.page === 'ToDo');
    if (!todoExists) {
      const presenzeIndex = dashboardSection.items.findIndex(item => item.page === 'Presenze');
      if (presenzeIndex !== -1) {
        dashboardSection.items.splice(presenzeIndex + 1, 0, {
          title: 'To-Do',
          page: 'ToDo',
          icon: 'CheckSquare'
        });
      } else {
        dashboardSection.items.unshift({
          title: 'To-Do',
          page: 'ToDo',
          icon: 'CheckSquare'
        });
      }
    }

    // Disattiva config vecchia
    await base44.entities.MenuStructureConfig.update(activeConfig.id, { is_active: false });

    // Crea nuova config attiva
    await base44.entities.MenuStructureConfig.create({
      config_name: `menu_${Date.now()}`,
      menu_structure: menuStructure,
      is_active: true
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});