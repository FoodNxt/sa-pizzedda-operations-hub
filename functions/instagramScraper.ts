import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { usernames } = await req.json();
  if (!usernames || !Array.isArray(usernames)) {
    return Response.json({ error: 'usernames array required' }, { status: 400 });
  }

  const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
  const results = {};

  for (const username of usernames) {
    try {
      const body = new URLSearchParams({ username });
      const res = await fetch('https://instagram-scraper-stable-api.p.rapidapi.com/get_ig_user_followers_v2.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
        },
        body: body.toString()
      });
      const data = await res.json();
      console.log('API response for', username, JSON.stringify(data).slice(0, 500));
      const followers = data?.followers ?? data?.follower_count ?? data?.data?.followers;
      if (followers !== undefined) {
        results[username] = {
          followers_count: followers,
          full_name: data.full_name || data?.data?.full_name,
          biography: data.biography || data?.data?.biography,
          is_private: data.is_private,
          verified: data.is_verified,
          exists: true
        };
      } else {
        results[username] = { exists: false, raw: data };
      }
    } catch (e) {
      results[username] = { exists: false, error: e.message };
    }
  }

  return Response.json({ results });
});