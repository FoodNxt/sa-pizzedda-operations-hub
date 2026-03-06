import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to list all users (bypasses per-user read restriction)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const filtered = allUsers.filter(
      (u) => u.user_type === 'admin' || u.user_type === 'manager'
    );

    return Response.json({ users: filtered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});