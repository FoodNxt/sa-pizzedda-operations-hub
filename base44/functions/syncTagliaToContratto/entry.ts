import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id, taglia_maglietta } = await req.json();

    const targetUserId = user_id || user.id;

    if (!taglia_maglietta) {
      return Response.json({ skipped: true, reason: 'no taglia provided' });
    }

    console.log(`Syncing taglia "${taglia_maglietta}" for user ${targetUserId}`);

    const contratti = await base44.asServiceRole.entities.Contratto.filter({ user_id: targetUserId });

    if (contratti.length === 0) {
      console.log('No contracts found');
      return Response.json({ skipped: true, reason: 'no contracts' });
    }

    let updated = 0;
    for (const contratto of contratti) {
      if (contratto.taglia_maglietta !== taglia_maglietta) {
        await base44.asServiceRole.entities.Contratto.update(contratto.id, { taglia_maglietta });
        updated++;
      }
    }

    console.log(`Updated ${updated}/${contratti.length} contracts`);
    return Response.json({ success: true, updated });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});